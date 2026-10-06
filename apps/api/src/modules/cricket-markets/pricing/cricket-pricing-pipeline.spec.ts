import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchStateService, NormalizedMatchState } from '../match-state.service.js';
import { ProbabilityEngineService } from './probability-engine.service.js';
import { FairOddsService } from './fair-odds.service.js';
import { MarginService } from './margin.service.js';
import { ExposureEngineService } from './exposure-engine.service.js';
import { RiskEngineService } from './risk-engine.service.js';
import { PricingEngineService } from './pricing-engine.service.js';

describe('Cricket Live Odds & Match State Audit Pipeline', () => {
  let matchStateService: MatchStateService;
  let probabilityEngine: ProbabilityEngineService;
  let fairOddsService: FairOddsService;
  let marginService: MarginService;
  let exposureEngine: ExposureEngineService;
  let riskEngine: RiskEngineService;
  let pricingEngine: PricingEngineService;
  let mockDb: any;
  let mockGateway: any;

  const matchId = 'match_aus_ind_u19';
  const marketId = 'mkt_match_winner';
  const selAId = 'sel_ind';
  const selBId = 'sel_aus';

  const selections = [
    { id: selAId, name: 'India U19', backPrice: 1.85 },
    { id: selBId, name: 'Australia U19', backPrice: 1.95 },
  ];

  beforeEach(() => {
    mockDb = {
      match: {
        findUnique: vi.fn().mockResolvedValue({
          id: matchId,
          teamAId: 'team_aus',
          teamBId: 'team_ind',
          teamA: { name: 'Australia U19' },
          teamB: { name: 'India U19' },
          matchType: 'ODI',
          status: 'LIVE',
          score: {
            currentInnings: 2,
            teamAScore: '174/10',
            teamBOvers: '24.5',
            teamBScore: '74/2',
          },
        }),
      },
      matchScore: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      cricketMatchStateSnapshot: {
        create: vi.fn().mockResolvedValue({}),
      },
      marketPriceSnapshot: {
        create: vi.fn().mockResolvedValue({}),
      },
      cricketMarketSelection: {
        update: vi.fn().mockResolvedValue({}),
      },
      cricketMarket: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    mockGateway = {
      broadcastOddsUpdate: vi.fn(),
    };

    matchStateService = new MatchStateService(mockDb);
    probabilityEngine = new ProbabilityEngineService();
    fairOddsService = new FairOddsService();
    marginService = new MarginService();
    exposureEngine = new ExposureEngineService(mockDb);
    riskEngine = new RiskEngineService();

    pricingEngine = new PricingEngineService(
      mockDb,
      probabilityEngine,
      fairOddsService,
      marginService,
      exposureEngine,
      riskEngine,
      mockGateway
    );
  });

  it('1. Target Calculation: Australia 174/10 1st Innings total MUST yield Target = 175 for India 74/2 at 24.5 overs', async () => {
    const { state, isDuplicate } = await matchStateService.processAndNormalizeMatchState({
      matchId,
      teamAScore: '174/10',
      teamAOvers: '50.0',
      teamBScore: '74/2',
      teamBOvers: '24.5',
      currentInnings: 2,
      matchType: 'ODI',
      providerEventId: 'evt_1',
      providerSequence: 1,
    });

    expect(isDuplicate).toBe(false);
    expect(state).not.toBeNull();
    expect(state?.target).toBe(175); // Target MUST be 1st innings runs (174) + 1 = 175
    expect(state?.runsRequired).toBe(101); // 175 - 74 = 101
    expect(state?.stateVersion).toBe(1);

    // Initial Pricing Calculation
    const result = await pricingEngine.calculateMarketPricing(state!, { id: marketId, marketType: 'MATCH_WINNER' }, selections);

    expect(result.selections.length).toBe(2);
    expect(mockDb.marketPriceSnapshot.create).toHaveBeenCalled();
    expect(mockGateway.broadcastOddsUpdate).toHaveBeenCalled();

    const indResult = result.selections.find((s) => s.selectionId === selAId);
    expect(indResult?.modelProbability).toBeGreaterThan(0);
    expect(indResult?.displayedOdds.toNumber()).toBeGreaterThan(1.0);
  });

  it('2. State Update: India 80/2 at 25.3 overs increments stateVersion, maintains target 175, recalculates probability and pricing', async () => {
    // Process Initial State
    await matchStateService.processAndNormalizeMatchState({
      matchId,
      teamAScore: '174/10',
      teamAOvers: '50.0',
      teamBScore: '74/2',
      teamBOvers: '24.5',
      currentInnings: 2,
      matchType: 'ODI',
      providerEventId: 'evt_1',
      providerSequence: 1,
    });

    // Update State: India 80/2 at 25.3 overs
    const { state: updatedState } = await matchStateService.processAndNormalizeMatchState({
      matchId,
      teamAScore: '174/10',
      teamAOvers: '50.0',
      teamBScore: '80/2',
      teamBOvers: '25.3',
      currentInnings: 2,
      matchType: 'ODI',
      providerEventId: 'evt_2',
      providerSequence: 2,
    });

    expect(updatedState?.stateVersion).toBe(2);
    expect(updatedState?.target).toBe(175); // Target remains strictly 175
    expect(updatedState?.runsRequired).toBe(95); // 175 - 80 = 95

    const pricing = await pricingEngine.calculateMarketPricing(updatedState!, { id: marketId, marketType: 'MATCH_WINNER' }, selections);

    // Verify snapshot saved to DB
    expect(mockDb.marketPriceSnapshot.create).toHaveBeenCalled();

    // Verify cricket.odds.updated socket broadcast emitted
    expect(mockGateway.broadcastOddsUpdate).toHaveBeenCalledWith(
      matchId,
      expect.objectContaining({
        matchId,
        marketId,
        selectionId: expect.any(String),
        modelProbability: expect.any(Number),
        finalOdds: expect.any(Number),
        matchStateVersion: 2,
        priceVersion: 'v1.0.0',
      })
    );
  });

  it('3. Wicket Fall: India 80/3 triggers further probability & price recalculation with wicket penalty', async () => {
    // Process State 2: India 80/2
    const { state: stateBeforeWicket } = await matchStateService.processAndNormalizeMatchState({
      matchId,
      teamAScore: '174/10',
      teamAOvers: '50.0',
      teamBScore: '80/2',
      teamBOvers: '25.3',
      currentInnings: 2,
      matchType: 'ODI',
      providerSequence: 2,
    });

    const pricingBefore = await pricingEngine.calculateMarketPricing(stateBeforeWicket!, { id: marketId, marketType: 'MATCH_WINNER' }, selections);
    const probBefore = pricingBefore.selections.find((s) => s.selectionId === selAId)?.modelProbability || 0;

    // Process State 3: Wicket fallen! India 80/3
    const { state: stateAfterWicket } = await matchStateService.processAndNormalizeMatchState({
      matchId,
      teamAScore: '174/10',
      teamAOvers: '50.0',
      teamBScore: '80/3',
      teamBOvers: '25.4',
      currentInnings: 2,
      matchType: 'ODI',
      providerSequence: 3,
    });

    expect(stateAfterWicket?.wickets).toBe(3);
    expect(stateAfterWicket?.stateVersion).toBe(2); // Since stateBeforeWicket had version 1

    const pricingAfter = await pricingEngine.calculateMarketPricing(stateAfterWicket!, { id: marketId, marketType: 'MATCH_WINNER' }, selections);
    const probAfter = pricingAfter.selections.find((s) => s.selectionId === selAId)?.modelProbability || 0;

    // Chasing team probability must drop after losing a wicket
    expect(probAfter).toBeLessThan(probBefore);
  });

  it('4. Event Idempotency: Duplicate or older provider sequence is ignored', async () => {
    await matchStateService.processAndNormalizeMatchState({
      matchId,
      providerSequence: 10,
      teamAScore: '174/10',
      teamBScore: '80/2',
    });

    // Send duplicate sequence 10
    const { isDuplicate } = await matchStateService.processAndNormalizeMatchState({
      matchId,
      providerSequence: 10,
      teamAScore: '174/10',
      teamBScore: '82/2',
    });

    expect(isDuplicate).toBe(true);
  });

  it('5. Market Prediction Differentiation: Each market type calculates distinct, bet-wise prediction odds', async () => {
    const state = { matchId, innings: 1, runs: 42, wickets: 10, overs: 14.5 };

    const matchWinnerResult = await pricingEngine.calculateMarketPricing(
      state,
      { id: 'mkt_1', marketType: 'MATCH_WINNER' },
      [{ id: 's1', name: 'Kuwait' }, { id: 's2', name: 'Mongolia' }]
    );

    const tossWinnerResult = await pricingEngine.calculateMarketPricing(
      state,
      { id: 'mkt_2', marketType: 'TOSS_WINNER' },
      [{ id: 's3', name: 'Kuwait' }, { id: 's4', name: 'Mongolia' }]
    );

    const overUnderResult = await pricingEngine.calculateMarketPricing(
      state,
      { id: 'mkt_3', marketType: 'OVER_RUNS', name: '6 Overs Powerplay Runs', lineThreshold: 48.5 },
      [{ id: 's5', name: 'Over 48.5 Runs' }, { id: 's6', name: 'Under 48.5 Runs' }]
    );

    const tossOdds = tossWinnerResult.selections[0].displayedOdds.toNumber();
    const winnerOdds = matchWinnerResult.selections[0].displayedOdds.toNumber();
    const overOdds = overUnderResult.selections[0].displayedOdds.toNumber();

    // Toss winner odds must be ~1.92 (50/50 fair odds with margin), NOT matching Match Winner odds (e.g. 12.67)
    expect(tossOdds).not.toBe(winnerOdds);
    expect(tossOdds).toBeGreaterThan(1.85);
    expect(tossOdds).toBeLessThan(2.00);

    // Over/Under odds must be calculated from 48.5 line threshold prediction
    expect(overOdds).not.toBe(winnerOdds);
  });
});
