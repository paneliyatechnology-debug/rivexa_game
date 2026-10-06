import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { CricketResultResolver } from './cricket-result-resolver.service.js';

export interface ISettlementDebugItem {
  betId: string;
  betReference: string;
  matchId: string;
  matchName: string;
  marketId: string;
  marketName: string;
  marketType: string;
  providerMarketId: string | null;
  selectedName: string;
  providerSelectionId: string | null;
  officialWinnerName: string | null;
  resolvedWinnerParticipantId: string | null;
  currentBetStatus: string;
  expectedBetStatus: string;
  diagnosis: 'SUCCESS' | 'SETTLEMENT_MAPPING_ERROR' | 'PENDING_MATCH_COMPLETION' | 'VOID_MATCH';
  settlementReason: string;
  placedAt: Date;
  updatedAt: Date;
}

export interface ISettlementDebugReport {
  matchId: string;
  matchName: string;
  matchStatus: string;
  totalBets: number;
  mappingErrorCount: number;
  items: ISettlementDebugItem[];
  generatedAt: Date;
}

@Injectable()
export class CricketSettlementDebugService {
  private readonly logger = new Logger(CricketSettlementDebugService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly resultResolver: CricketResultResolver
  ) {}

  /**
   * Generates a comprehensive settlement debug diagnostic report for a match.
   */
  async getSettlementDebugReport(matchId: string): Promise<ISettlementDebugReport> {
    let match = await this.db.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true, score: true },
    });

    if (!match) {
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: { entityType: 'MATCH', providerEntityId: matchId },
      });
      if (mapping) {
        match = await this.db.match.findUnique({
          where: { id: mapping.internalEntityId },
          include: { teamA: true, teamB: true, score: true },
        });
      }
    }

    if (!match) {
      return {
        matchId,
        matchName: 'Unknown Match',
        matchStatus: 'NOT_FOUND',
        totalBets: 0,
        mappingErrorCount: 0,
        items: [],
        generatedAt: new Date(),
      };
    }

    const markets = await this.db.cricketMarket.findMany({
      where: { matchId: match.id },
      include: { selections: true },
    });

    const bets = await this.db.testBet.findMany({
      where: { matchId: match.id },
      include: { selections: true },
    });

    const items: ISettlementDebugItem[] = [];
    let mappingErrorCount = 0;

    for (const b of bets) {
      for (const sel of b.selections) {
        const m = markets.find((mkt: any) => mkt.id === sel.marketId || mkt.name === sel.marketName) || markets[0];
        if (!m) continue;

        const outcome = await this.resultResolver.resolveMarketOutcome(match, m);
        const selectedName = sel.selectionName || '';
        const winnerName = outcome.winnerSelectionName || '';

        let expectedStatus = 'OPEN';
        if (outcome.settlementStatus === 'SETTLED' && winnerName) {
          const isWin = selectedName.toLowerCase().includes(winnerName.toLowerCase()) || winnerName.toLowerCase().includes(selectedName.toLowerCase());
          expectedStatus = isWin ? 'WON' : 'LOST';
        } else if (outcome.settlementStatus === 'VOID') {
          expectedStatus = 'VOID';
        }

        let diagnosis: ISettlementDebugItem['diagnosis'] = 'SUCCESS';
        if (expectedStatus !== 'OPEN' && b.status !== expectedStatus) {
          diagnosis = 'SETTLEMENT_MAPPING_ERROR';
          mappingErrorCount++;
        } else if (expectedStatus === 'OPEN') {
          diagnosis = 'PENDING_MATCH_COMPLETION';
        }

        items.push({
          betId: b.id,
          betReference: b.betReference,
          matchId: match.id,
          matchName: `${match.teamA?.name} vs ${match.teamB?.name}`,
          marketId: m.id,
          marketName: m.name,
          marketType: m.marketType,
          providerMarketId: m.providerMarketId || null,
          selectedName: sel.selectionName,
          providerSelectionId: sel.providerSelectionId || null,
          officialWinnerName: outcome.winnerSelectionName,
          resolvedWinnerParticipantId: outcome.winnerParticipantId,
          currentBetStatus: b.status,
          expectedBetStatus: expectedStatus,
          diagnosis,
          settlementReason: outcome.resolutionReason,
          placedAt: b.createdAt,
          updatedAt: b.updatedAt,
        });
      }
    }

    return {
      matchId: match.id,
      matchName: `${match.teamA?.name} vs ${match.teamB?.name}`,
      matchStatus: match.status,
      totalBets: items.length,
      mappingErrorCount,
      items,
      generatedAt: new Date(),
    };
  }
}
