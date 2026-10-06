import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';
import { DatabaseService } from '../../../database/database.service.js';
import { SportsGateway } from '../../../sports/sports.gateway.js';
import { CricketResultResolver } from './cricket-result-resolver.service.js';

export interface IBetReconciliationResult {
  matchId: string;
  totalBetsEvaluated: number;
  reconciledCount: number;
  totalPayoutCredited: number;
  reconciledBets: Array<{
    betId: string;
    betReference: string;
    previousStatus: string;
    newStatus: string;
    payout: number;
    reason: string;
  }>;
}

@Injectable()
export class CricketBetReconciliationService {
  private readonly logger = new Logger(CricketBetReconciliationService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly resultResolver: CricketResultResolver,
    @Optional() @Inject(forwardRef(() => SportsGateway))
    private readonly sportsGateway?: SportsGateway
  ) {}

  /**
   * Controlled reconciliation process for mis-settled bets on a completed match.
   * Finds bets marked LOST where selected participant matches official resolved winner,
   * safely updates status to WON, and issues compensating wallet transaction.
   */
  async reconcileMatchBets(matchId: string): Promise<IBetReconciliationResult> {
    const match = await this.db.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true, score: true },
    });

    if (!match) {
      return {
        matchId,
        totalBetsEvaluated: 0,
        reconciledCount: 0,
        totalPayoutCredited: 0,
        reconciledBets: [],
      };
    }

    const markets = await this.db.cricketMarket.findMany({
      where: { matchId: match.id },
      include: { selections: true },
    });

    const bets = await this.db.testBet.findMany({
      where: { matchId: match.id },
      include: { selections: true, user: true },
    });

    let reconciledCount = 0;
    let totalPayoutCredited = 0;
    const reconciledBets: IBetReconciliationResult['reconciledBets'] = [];

    for (const m of markets) {
      const outcome = await this.resultResolver.resolveMarketOutcome(match, m);
      if (outcome.settlementStatus === 'PENDING') {
        continue;
      }

      for (const bet of bets) {
        // Find selection matching this market
        const betSel = bet.selections.find((s: any) => s.marketId === m.id || s.marketName === m.name) || bet.selections[0];
        if (!betSel) continue;

        let expectedStatus: 'WON' | 'LOST' | 'VOID' = 'LOST';
        if (outcome.settlementStatus === 'VOID') {
          expectedStatus = 'VOID';
        } else if (outcome.settlementStatus === 'SETTLED' && outcome.winnerParticipantId) {
          const selectedName = (betSel.selectionName || '').toLowerCase();
          const winnerName = (outcome.winnerSelectionName || '').toLowerCase();
          const isWinner =
            (betSel.participantId && betSel.participantId === outcome.winnerParticipantId) ||
            selectedName.includes(winnerName) ||
            winnerName.includes(selectedName);

          expectedStatus = isWinner ? 'WON' : 'LOST';
        }

        const previousStatus = bet.status;

        // Controlled Correction & Automatic Status Reversal: previousStatus !== expectedStatus
        if (previousStatus !== expectedStatus) {
          const getPayout = (st: string) => {
            if (st === 'WON') return Number(bet.potentialReturn);
            if (st === 'VOID' || st === 'CANCELLED') return Number(bet.totalStake);
            return 0;
          };

          const pPrev = getPayout(previousStatus);
          const pNew = getPayout(expectedStatus);
          const netDelta = pNew - pPrev;
          const betId = bet.id;
          const userId = bet.userId;

          // Transactional DB update for Bet & Wallet
          await this.db.$transaction(async (tx: any) => {
            // Update bet status
            await tx.testBet.update({
              where: { id: betId },
              data: { status: expectedStatus },
            });

            // Adjust wallet using compensating ledger entry
            if (userId && netDelta !== 0) {
              const wallet = await tx.wallet.findUnique({ where: { userId } });
              if (wallet) {
                const balanceBefore = Number(wallet.mainBalance);
                const updatedWallet = await tx.wallet.update({
                  where: { id: wallet.id },
                  data: {
                    mainBalance: netDelta > 0
                      ? { increment: netDelta }
                      : { decrement: Math.abs(netDelta) },
                  },
                });

                // Compensating wallet transaction ledger entry
                await tx.walletTransaction.create({
                  data: {
                    walletId: wallet.id,
                    type: netDelta > 0 ? 'GAME_CREDIT' : 'GAME_DEBIT',
                    amount: Math.abs(netDelta),
                    balanceBefore,
                    balanceAfter: Number(updatedWallet.mainBalance),
                    referenceType: previousStatus === 'OPEN' ? 'BET_SETTLEMENT' : 'BET_SETTLEMENT_REVERSAL',
                    referenceId: betId,
                    metadata: {
                      betReference: bet.betReference,
                      previousStatus,
                      newStatus: expectedStatus,
                      netDelta,
                      reason: outcome.resolutionReason,
                    },
                  },
                });
              }
            }

            // Create settlement audit record
            await tx.testBetSettlement.create({
              data: {
                testBetId: betId,
                resultSource: 'RECONCILIATION_CORRECTION',
                settledBy: 'ADMIN_RECONCILIATION_ENGINE',
                settlementSummary: `Reconciled/Reversed: Changed status from ${previousStatus} to ${expectedStatus} (Net delta: \$${netDelta}) (Reason: ${outcome.resolutionReason})`,
                payoutAmount: new Prisma.Decimal(pNew),
              },
            });
          });

          reconciledCount++;
          if (netDelta > 0) totalPayoutCredited += netDelta;

          reconciledBets.push({
            betId: bet.id,
            betReference: bet.betReference,
            previousStatus,
            newStatus: expectedStatus,
            payout: pNew,
            reason: outcome.resolutionReason,
          });

          // WebSocket broadcast updates
          if (this.sportsGateway?.server && userId) {
            try {
              const wallet = await this.db.wallet.findUnique({ where: { userId } });
              this.sportsGateway.server.to(`user:${userId}`).emit('wallet:update', {
                mainBalance: wallet ? Number(wallet.mainBalance) : undefined,
                userId,
              });
              this.sportsGateway.server.to(`user:${userId}`).emit('sports:bet_settled', {
                betId: bet.id,
                betReference: bet.betReference,
                status: expectedStatus,
                payoutAmount: pNew,
                isReconciled: true,
                previousStatus,
              });
            } catch (wsErr) {}
          }
        }
      }
    }

    this.logger.log(`[RECONCILIATION] Completed for match ${matchId}: ${reconciledCount} bets reconciled, total payout: \$${totalPayoutCredited}`);
    return {
      matchId,
      totalBetsEvaluated: bets.length,
      reconciledCount,
      totalPayoutCredited,
      reconciledBets,
    };
  }
}
