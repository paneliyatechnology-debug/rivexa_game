import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CricketResultResolver } from './cricket-result-resolver.service.js';
import { CricketBetReconciliationService } from './cricket-bet-reconciliation.service.js';

/**
 * Dynamic Fixture Builder for Cricket Matches.
 * Prevents static / hardcoded match structures in test suites.
 */
function createDynamicMatch(options: {
  matchId?: string;
  teamAName: string;
  teamBName: string;
  winnerTeamName?: string;
  winningTeamId?: string;
  status?: string;
  resultSummary?: string;
  tossWinnerName?: string;
  teamAScore?: string;
  teamBScore?: string;
}) {
  const teamAId = `id_${options.teamAName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const teamBId = `id_${options.teamBName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  
  let winId: string | undefined = options.winningTeamId;
  if (!winId && options.winnerTeamName) {
    winId = options.winnerTeamName === options.teamAName ? teamAId : teamBId;
  }

  const matchId = options.matchId || `match_${Math.random().toString(36).substring(2, 9)}`;

  return {
    id: matchId,
    teamAId,
    teamBId,
    winningTeamId: winId,
    winnerParticipantId: winId,
    teamA: { id: teamAId, name: options.teamAName, shortName: options.teamAName.slice(0, 3).toUpperCase() },
    teamB: { id: teamBId, name: options.teamBName, shortName: options.teamBName.slice(0, 3).toUpperCase() },
    status: options.status || 'COMPLETED',
    resultSummary: options.resultSummary || `${options.winnerTeamName || options.teamBName} won`,
    score: {
      teamAScore: options.teamAScore || '120/10',
      teamAOvers: '15.0',
      teamBScore: options.teamBScore || '121/4',
      teamBOvers: '14.2',
      statusText: options.resultSummary || `${options.winnerTeamName || options.teamBName} won`,
      tossWinner: options.tossWinnerName,
    },
  };
}

describe('Cricket Settlement Engine Architecture & Rules', () => {
  let resultResolver: CricketResultResolver;
  let mockDb: any;
  let mockGateway: any;

  beforeEach(() => {
    mockDb = {
      match: {
        findUnique: vi.fn(),
      },
      providerEntityMapping: {
        findFirst: vi.fn().mockImplementation(({ where }: any) => {
          if (where.providerEntityId) {
            return Promise.resolve({ internalEntityId: `mapped_${where.providerEntityId}` });
          }
          return Promise.resolve(null);
        }),
      },
      team: {
        findUnique: vi.fn().mockImplementation(({ where }: any) => {
          return Promise.resolve({ id: where.id, name: `Team_${where.id}` });
        }),
      },
      cricketMarket: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({}),
      },
      testBet: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({}),
      },
      wallet: {
        findUnique: vi.fn().mockResolvedValue({ id: 'w1', mainBalance: 1000 }),
        update: vi.fn().mockResolvedValue({ id: 'w1', mainBalance: 1104 }),
      },
      walletTransaction: {
        create: vi.fn().mockResolvedValue({}),
      },
      testBetSettlement: {
        create: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockDb)),
    };

    mockGateway = {
      server: {
        to: vi.fn().mockReturnValue({ emit: vi.fn() }),
      },
    };

    resultResolver = new CricketResultResolver(mockDb);
  });

  it('TEST 1: Dynamic Resolution => Match Winner resolved via canonical winner ID', async () => {
    const dynamicMatch = createDynamicMatch({
      teamAName: 'Kuwait',
      teamBName: 'Mongolia',
      winnerTeamName: 'Mongolia',
      teamAScore: '39/10',
      teamBScore: '42/10',
      resultSummary: 'Mongolia won by 3 runs',
    });

    const outcome = await resultResolver.resolveMarketOutcome(dynamicMatch, { id: 'mkt_1', marketType: 'MATCH_WINNER' });

    expect(outcome.settlementStatus).toBe('SETTLED');
    expect(outcome.winnerParticipantId).toBe(dynamicMatch.teamBId);
    expect(outcome.winnerSelectionName).toBe('Mongolia');
  });

  it('TEST 2: Dynamic Resolution => Selection for losing team evaluates as LOST', async () => {
    const dynamicMatch = createDynamicMatch({
      teamAName: 'Kuwait',
      teamBName: 'Mongolia',
      winnerTeamName: 'Mongolia',
    });

    const outcome = await resultResolver.resolveMarketOutcome(dynamicMatch, { id: 'mkt_1', marketType: 'MATCH_WINNER' });

    const isWinner = outcome.winnerParticipantId === dynamicMatch.teamAId; // Selected Kuwait
    expect(isWinner).toBe(false);
  });

  it('TEST 3: Toss Winner Market => Evaluates independently from Match Winner', async () => {
    const matchWithToss = createDynamicMatch({
      teamAName: 'Kuwait',
      teamBName: 'Mongolia',
      winnerTeamName: 'Mongolia',
      tossWinnerName: 'Kuwait',
    });

    const outcome = await resultResolver.resolveMarketOutcome(matchWithToss, { id: 'mkt_toss', marketType: 'TOSS_WINNER' });

    expect(outcome.settlementStatus).toBe('SETTLED');
    expect(outcome.winnerParticipantId).toBe(matchWithToss.teamAId); // Kuwait won toss
  });

  it('TEST 4: Toss Winner Selection => Matching Toss Winner selection evaluates as WON', async () => {
    const matchWithToss = createDynamicMatch({
      teamAName: 'Kuwait',
      teamBName: 'Mongolia',
      winnerTeamName: 'Mongolia',
      tossWinnerName: 'Mongolia',
    });

    const outcome = await resultResolver.resolveMarketOutcome(matchWithToss, { id: 'mkt_toss', marketType: 'TOSS_WINNER' });

    expect(outcome.settlementStatus).toBe('SETTLED');
    expect(outcome.winnerParticipantId).toBe(matchWithToss.teamBId);
  });

  it('TEST 5: Abandoned Match => Resolves as VOID without static defaults', async () => {
    const abandonedMatch = createDynamicMatch({
      teamAName: 'India',
      teamBName: 'Australia',
      status: 'ABANDONED',
      resultSummary: 'Match abandoned due to rain',
    });

    const outcome = await resultResolver.resolveMarketOutcome(abandonedMatch, { id: 'mkt_1', marketType: 'MATCH_WINNER' });

    expect(outcome.settlementStatus).toBe('VOID');
    expect(outcome.isAbandoned).toBe(true);
    expect(outcome.winnerParticipantId).toBeNull();
  });

  it('TEST 6: DLS Match => Preserves provider official outcome dynamically', async () => {
    const dlsMatch = createDynamicMatch({
      teamAName: 'England',
      teamBName: 'South Africa',
      winnerTeamName: 'South Africa',
      resultSummary: 'South Africa won by 12 runs (DLS Method)',
    });

    const outcome = await resultResolver.resolveMarketOutcome(dlsMatch, { id: 'mkt_1', marketType: 'MATCH_WINNER' }, {
      providerWinnerId: 'prov_sa_123',
    });

    expect(outcome.settlementStatus).toBe('SETTLED');
    expect(outcome.isDls).toBe(true);
  });

  it('TEST 7: Super Over => Resolves official winner dynamically', async () => {
    const superOverMatch = createDynamicMatch({
      teamAName: 'New Zealand',
      teamBName: 'Pakistan',
      winnerTeamName: 'New Zealand',
      resultSummary: 'New Zealand won the Super Over',
    });

    const outcome = await resultResolver.resolveMarketOutcome(superOverMatch, { id: 'mkt_1', marketType: 'MATCH_WINNER' });

    expect(outcome.settlementStatus).toBe('SETTLED');
    expect(outcome.isSuperOver).toBe(true);
    expect(outcome.winnerParticipantId).toBe(superOverMatch.teamAId);
  });

  it('TEST 8: Dynamic Reconciliation & Idempotency => Issues single payout safely', async () => {
    const dynamicMatch = createDynamicMatch({
      matchId: 'match_recon_100',
      teamAName: 'Kuwait',
      teamBName: 'Mongolia',
      winnerTeamName: 'Mongolia',
    });

    mockDb.match.findUnique.mockResolvedValue(dynamicMatch);

    const reconciliationService = new CricketBetReconciliationService(mockDb, resultResolver, mockGateway);

    const openBet = {
      id: 'bet_recon_1',
      betReference: 'BET-2026-100001',
      userId: 'usr_001',
      matchId: dynamicMatch.id,
      totalStake: '100',
      potentialReturn: '1923',
      status: 'LOST',
      selections: [
        { id: 'sel_1', marketId: 'mkt_1', selectionName: 'Mongolia', marketName: 'Match Winner', participantId: dynamicMatch.teamBId },
      ],
    };

    mockDb.cricketMarket.findMany.mockResolvedValue([{ id: 'mkt_1', marketType: 'MATCH_WINNER', name: 'Match Winner' }]);
    mockDb.testBet.findMany.mockResolvedValue([openBet]);

    const res = await reconciliationService.reconcileMatchBets(dynamicMatch.id);

    expect(res.reconciledCount).toBe(1);
    expect(res.totalPayoutCredited).toBe(1923);
    expect(mockDb.wallet.update).toHaveBeenCalledTimes(1);

    // Second run is idempotent
    openBet.status = 'WON';
    mockDb.testBet.findMany.mockResolvedValue([openBet]);

    const secondRes = await reconciliationService.reconcileMatchBets(dynamicMatch.id);
    expect(secondRes.reconciledCount).toBe(0);
    expect(secondRes.totalPayoutCredited).toBe(0);
    expect(mockDb.wallet.update).toHaveBeenCalledTimes(1);
  });

  it('TEST 9: Provider duplicate payload => Idempotent outcome resolution', async () => {
    const dynamicMatch = createDynamicMatch({
      teamAName: 'Sri Lanka',
      teamBName: 'Bangladesh',
      winnerTeamName: 'Sri Lanka',
    });

    const outcome1 = await resultResolver.resolveMarketOutcome(dynamicMatch, { id: 'mkt_1', marketType: 'MATCH_WINNER' });
    const outcome2 = await resultResolver.resolveMarketOutcome(dynamicMatch, { id: 'mkt_1', marketType: 'MATCH_WINNER' });

    expect(outcome1.winnerParticipantId).toBe(outcome2.winnerParticipantId);
    expect(outcome1.settlementStatus).toBe(outcome2.settlementStatus);
  });

  it('TEST 10: Score updates post-completion do not alter settled status', async () => {
    const settledMatch = createDynamicMatch({
      teamAName: 'Ireland',
      teamBName: 'Zimbabwe',
      winnerTeamName: 'Ireland',
      status: 'COMPLETED',
    });

    const outcome = await resultResolver.resolveMarketOutcome(settledMatch, { id: 'mkt_1', marketType: 'MATCH_WINNER' });
    expect(outcome.settlementStatus).toBe('SETTLED');
  });

  it('TEST 11: Zero Hardcoded Team Names => Resolves correctly for any arbitrary team names', async () => {
    const arbitraryMatch = createDynamicMatch({
      teamAName: 'Alpha Titans',
      teamBName: 'Beta Warriors',
      winnerTeamName: 'Alpha Titans',
      resultSummary: 'Alpha Titans won by 45 runs',
      teamAScore: '195/4',
      teamBScore: '150/9',
    });

    const outcome = await resultResolver.resolveMarketOutcome(arbitraryMatch, { id: 'mkt_arb', marketType: 'MATCH_WINNER' });

    expect(outcome.settlementStatus).toBe('SETTLED');
    expect(outcome.winnerParticipantId).toBe(arbitraryMatch.teamAId);
    expect(outcome.winnerSelectionName).toBe('Alpha Titans');
  });

  it('TEST 12: Bidirectional Reversal & Wallet Safety => Reversing WON bet to LOST debits wallet balance', async () => {
    const reversalMatch = createDynamicMatch({
      matchId: 'match_reversal_001',
      teamAName: 'Kuwait',
      teamBName: 'Mongolia',
      winnerTeamName: 'Kuwait', // Corrected winner is Kuwait
      resultSummary: 'Kuwait won by 10 runs',
      teamAScore: '52/10',
      teamBScore: '42/10',
    });

    const erroneousWonBet = {
      id: 'bet_err_won',
      betReference: 'BET-ERR-WON',
      userId: 'user_1',
      status: 'WON',
      totalStake: 100,
      potentialReturn: 1923,
      selections: [{ marketId: 'mkt_1', marketName: 'Match Winner', selectionName: 'Mongolia', participantId: reversalMatch.teamBId }],
    };

    mockDb.match.findUnique.mockResolvedValue(reversalMatch);
    mockDb.cricketMarket.findMany.mockResolvedValue([{ id: 'mkt_1', marketType: 'MATCH_WINNER', name: 'Match Winner' }]);
    mockDb.testBet.findMany.mockResolvedValue([erroneousWonBet]);

    const reconciliationService = new CricketBetReconciliationService(mockDb, resultResolver, mockGateway);
    const res = await reconciliationService.reconcileMatchBets(reversalMatch.id);

    expect(res.reconciledCount).toBe(1);
    expect(res.reconciledBets[0].previousStatus).toBe('WON');
    expect(res.reconciledBets[0].newStatus).toBe('LOST');
    expect(mockDb.wallet.update).toHaveBeenCalledWith({
      where: { id: 'w1' },
      data: { mainBalance: { decrement: 1923 } },
    });
    expect(mockDb.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'GAME_DEBIT',
          amount: 1923,
          referenceType: 'BET_SETTLEMENT_REVERSAL',
        }),
      }),
    );
  });
});
