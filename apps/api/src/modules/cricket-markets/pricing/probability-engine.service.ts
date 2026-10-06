import { Injectable, Logger } from '@nestjs/common';
import { NormalizedMatchState } from '../match-state.service.js';

export interface IMatchStateInput {
  matchId: string;
  teamAName?: string;
  teamBName?: string;
  innings: number;
  runs: number;
  wickets: number;
  overs: number;
  target?: number | null;
  matchType?: string; // T20, ODI, TEST
}

export interface IProbabilityResult {
  selectionId: string;
  selectionName: string;
  modelProbability: number;
  fairProbability: number;
  confidence: number;
  modelVersion: string;
  calculatedAt: Date;
}

@Injectable()
export class ProbabilityEngineService {
  private readonly logger = new Logger(ProbabilityEngineService.name);
  public readonly MODEL_VERSION = 'v1.1.0-market-predictions';

  /**
   * Main entry point to calculate prediction probabilities per market type
   */
  calculateMarketProbability(
    matchState: NormalizedMatchState | IMatchStateInput,
    market: { id?: string; marketType?: string; categorySlug?: string; name?: string; lineThreshold?: number | null },
    selections: Array<{ id: string; name: string }>
  ): IProbabilityResult[] {
    const marketType = (market.marketType || '').toUpperCase();
    const categorySlug = (market.categorySlug || '').toLowerCase();
    const marketName = (market.name || '').toLowerCase();

    if (marketType === 'TOSS_WINNER' || marketName.includes('toss winner')) {
      return this.calculateTossWinnerProbability(selections, market.id);
    }

    if (marketType === 'ODD_EVEN' || categorySlug === 'odd_even' || marketName.includes('odd/even')) {
      return this.calculateOddEvenProbability(selections, market.id);
    }

    if (marketType === 'DISMISSAL_METHOD' || marketName.includes('method of dismissal')) {
      return this.calculateDismissalMethodProbability(selections, market.id);
    }

    if (marketType === 'QUICK' || marketName.includes('first boundary')) {
      return this.calculateBoundaryMarketProbability(selections, market.id);
    }

    if (
      marketType === 'TOTAL_RUNS' ||
      marketType === 'OVER_RUNS' ||
      marketType === 'PLAYER_RUNS' ||
      marketType === 'SESSION_FANCY' ||
      categorySlug === 'overs' ||
      categorySlug === 'first_innings' ||
      categorySlug === 'players' ||
      categorySlug === 'session' ||
      marketName.includes('over ') ||
      marketName.includes('under ') ||
      marketName.includes('runs')
    ) {
      return this.calculateOverUnderProbability(matchState, market, selections);
    }

    // Default: Match Winner probability
    return this.calculateMatchWinnerProbability(matchState, selections, market.id);
  }

  /** Toss Winner: Fair 50/50 distribution */
  calculateTossWinnerProbability(
    selections: Array<{ id: string; name: string }>,
    marketId?: string
  ): IProbabilityResult[] {
    const count = Math.max(1, selections.length);
    const prob = 1 / count;

    return selections.map((sel) => {
      if (marketId) {
        console.log(`[PROBABILITY] marketId=${marketId} selectionId=${sel.id} probability=${prob}`);
      }
      return {
        selectionId: sel.id,
        selectionName: sel.name,
        modelProbability: prob,
        fairProbability: prob,
        confidence: 0.99,
        modelVersion: this.MODEL_VERSION,
        calculatedAt: new Date(),
      };
    });
  }

  /** Odd/Even Markets: 50/50 distribution */
  calculateOddEvenProbability(
    selections: Array<{ id: string; name: string }>,
    marketId?: string
  ): IProbabilityResult[] {
    const count = Math.max(1, selections.length);
    const prob = 1 / count;

    return selections.map((sel) => {
      if (marketId) {
        console.log(`[PROBABILITY] marketId=${marketId} selectionId=${sel.id} probability=${prob}`);
      }
      return {
        selectionId: sel.id,
        selectionName: sel.name,
        modelProbability: prob,
        fairProbability: prob,
        confidence: 0.99,
        modelVersion: this.MODEL_VERSION,
        calculatedAt: new Date(),
      };
    });
  }

  /** Dismissal Method: Statistical cricket distribution (Caught ~58%, Bowled ~22%, LBW ~14%, Run Out ~6%) */
  calculateDismissalMethodProbability(
    selections: Array<{ id: string; name: string }>,
    marketId?: string
  ): IProbabilityResult[] {
    const baseMap: Record<string, number> = {
      caught: 0.58,
      bowled: 0.22,
      lbw: 0.14,
      'run out': 0.06,
      stumped: 0.04,
    };

    let totalAssigned = 0;
    const rawProbs = selections.map((sel) => {
      const nameLower = sel.name.toLowerCase();
      let p = 0.25;
      for (const [key, val] of Object.entries(baseMap)) {
        if (nameLower.includes(key)) {
          p = val;
          break;
        }
      }
      totalAssigned += p;
      return p;
    });

    return selections.map((sel, idx) => {
      const prob = Math.round((rawProbs[idx] / totalAssigned) * 10000) / 10000;
      if (marketId) {
        console.log(`[PROBABILITY] marketId=${marketId} selectionId=${sel.id} probability=${prob}`);
      }
      return {
        selectionId: sel.id,
        selectionName: sel.name,
        modelProbability: prob,
        fairProbability: prob,
        confidence: 0.95,
        modelVersion: this.MODEL_VERSION,
        calculatedAt: new Date(),
      };
    });
  }

  /** First Boundary Market: Four vs Six statistical probabilities */
  calculateBoundaryMarketProbability(
    selections: Array<{ id: string; name: string }>,
    marketId?: string
  ): IProbabilityResult[] {
    let totalAssigned = 0;
    const rawProbs = selections.map((sel) => {
      const nameLower = sel.name.toLowerCase();
      let p = 0.25;
      if (nameLower.includes('six')) p = 0.12;
      else if (nameLower.includes('four')) p = 0.38;
      totalAssigned += p;
      return p;
    });

    return selections.map((sel, idx) => {
      const prob = Math.round((rawProbs[idx] / totalAssigned) * 10000) / 10000;
      if (marketId) {
        console.log(`[PROBABILITY] marketId=${marketId} selectionId=${sel.id} probability=${prob}`);
      }
      return {
        selectionId: sel.id,
        selectionName: sel.name,
        modelProbability: prob,
        fairProbability: prob,
        confidence: 0.95,
        modelVersion: this.MODEL_VERSION,
        calculatedAt: new Date(),
      };
    });
  }

  /** Over/Under Prediction Model: Dynamic logistic Z-score based on line threshold and match state */
  calculateOverUnderProbability(
    matchState: NormalizedMatchState | IMatchStateInput,
    market: { id?: string; marketType?: string; name?: string; lineThreshold?: number | null },
    selections: Array<{ id: string; name: string }>
  ): IProbabilityResult[] {
    const { runs, wickets, overs } = matchState;
    const currentRunRate = overs > 0 ? runs / overs : 6.0;

    // Determine threshold line L
    let line = market.lineThreshold;
    if (!line) {
      // Parse from selection or market name (e.g., "Over 48.5 Runs")
      const text = `${market.name || ''} ${selections.map((s) => s.name).join(' ')}`;
      const matchNum = text.match(/(\d+(?:\.\d+)?)/);
      line = matchNum ? parseFloat(matchNum[1]) : 48.5;
    }

    // Determine target projected score R_proj and standard deviation sigma
    let projectedRuns = runs + currentRunRate * Math.max(0.5, 20 - overs);
    let sigma = 10.0;

    const marketName = (market.name || '').toLowerCase();
    if (marketName.includes('powerplay') || (line > 35 && line < 60)) {
      // Powerplay 6 overs line
      const oversLeftInPp = Math.max(0, 6 - overs);
      projectedRuns = runs + currentRunRate * oversLeftInPp;
      sigma = 4.5;
    } else if (marketName.includes('1st over') || line < 15) {
      // 1st Over line (e.g. 6.5)
      projectedRuns = overs >= 1 ? runs : 6.5;
      sigma = 2.5;
    } else if (marketName.includes('batter') || (line > 15 && line <= 35)) {
      // Top batter line
      projectedRuns = 31.5;
      sigma = 7.0;
    }

    // Compute Z-score and logistic Over probability
    const zScore = (projectedRuns - line) / Math.max(1.0, sigma);
    let overProb = 1 / (1 + Math.exp(-zScore));
    overProb = Math.max(0.05, Math.min(0.95, overProb));
    const underProb = 1 - overProb;

    return selections.map((sel) => {
      const isOver = sel.name.toLowerCase().includes('over');
      const prob = isOver ? overProb : underProb;
      const rounded = Math.round(prob * 10000) / 10000;

      if (market.id) {
        console.log(`[PROBABILITY] marketId=${market.id} selectionId=${sel.id} probability=${rounded}`);
      }

      return {
        selectionId: sel.id,
        selectionName: sel.name,
        modelProbability: rounded,
        fairProbability: rounded,
        confidence: 0.92,
        modelVersion: this.MODEL_VERSION,
        calculatedAt: new Date(),
      };
    });
  }

  /** Match Winner DLS & score state decay curve */
  calculateMatchWinnerProbability(
    matchState: NormalizedMatchState | IMatchStateInput,
    selections: Array<{ id: string; name: string }>,
    marketId?: string
  ): IProbabilityResult[] {
    const innings = 'inningsNumber' in matchState ? matchState.inningsNumber : matchState.innings;
    const { runs, wickets, overs, target } = matchState;
    let resolvedMatchType = ('matchType' in matchState ? matchState.matchType : 'T20') || 'T20';
    if (overs > 50 || resolvedMatchType === 'TEST') {
      resolvedMatchType = 'TEST';
    } else if (overs > 20 || resolvedMatchType === 'ODI') {
      resolvedMatchType = 'ODI';
    }
    const maxOvers = resolvedMatchType === 'TEST' ? 90 : resolvedMatchType === 'ODI' ? 50 : 20;

    const isChase = innings === 2 || (target !== null && target !== undefined && target > 0);

    let probTeamA = 0.5;
    let probTeamB = 0.5;

    if (!isChase) {
      const benchmark = maxOvers === 50 ? 280 : 175;
      const oversRemaining = Math.max(0.1, maxOvers - overs);
      const currentRunRate = overs > 0 ? runs / overs : 6.0;

      // If team is ALL OUT (wickets >= 10), projectedScore is final runs scored
      const projectedScore = wickets >= 10
        ? runs
        : runs + currentRunRate * oversRemaining * Math.max(0.1, 1 - wickets * 0.08);

      const scoreDiff = projectedScore - benchmark;
      probTeamA = 1 / (1 + Math.exp(-scoreDiff / 22));
      probTeamB = 1 - probTeamA;
    } else {
      const targetRuns = target || 175;
      const runsNeeded = Math.max(0, targetRuns - runs);
      const oversRemaining = Math.max(0.1, maxOvers - overs);
      const wicketsRemaining = Math.max(0, 10 - wickets);

      if (runsNeeded === 0) {
        probTeamA = 0.01;
        probTeamB = 0.99;
      } else if (wicketsRemaining === 0 || oversRemaining <= 0) {
        probTeamA = 0.99;
        probTeamB = 0.01;
      } else {
        const requiredRunRate = runsNeeded / oversRemaining;
        const currentRunRate = overs > 0 ? runs / overs : 6.0;

        const pressure = requiredRunRate / Math.max(1.0, currentRunRate);
        const resourceFactor = (wicketsRemaining / 10.0) * (oversRemaining / maxOvers);

        let chaseProb = 0.5 + 0.45 * resourceFactor - pressure * 0.15;
        chaseProb = Math.max(0.02, Math.min(0.98, chaseProb));

        probTeamB = chaseProb;
        probTeamA = 1 - probTeamB;
      }
    }

    const totalRaw = probTeamA + probTeamB;
    const fairProbA = probTeamA / totalRaw;
    const fairProbB = probTeamB / totalRaw;

    const teamAName = ('teamAName' in matchState ? matchState.teamAName : undefined) || '';
    const teamBName = ('teamBName' in matchState ? matchState.teamBName : undefined) || '';

    return selections.map((sel, idx) => {
      const nameLower = sel.name.toLowerCase();
      let rawProb = idx === 0 ? probTeamA : probTeamB;
      let fairProb = idx === 0 ? fairProbA : fairProbB;

      if (teamAName && teamBName) {
        if (nameLower.includes(teamAName.toLowerCase())) {
          rawProb = probTeamA;
          fairProb = fairProbA;
        } else if (nameLower.includes(teamBName.toLowerCase())) {
          rawProb = probTeamB;
          fairProb = fairProbB;
        }
      }

      const roundedModelProb = Math.round(rawProb * 10000) / 10000;
      const roundedFairProb = Math.round(fairProb * 10000) / 10000;

      const modelProb = Math.max(0.01, Math.min(0.99, roundedModelProb));

      if (marketId) {
        console.log(`[PROBABILITY] marketId=${marketId} selectionId=${sel.id} probability=${modelProb}`);
      }

      return {
        selectionId: sel.id,
        selectionName: sel.name,
        modelProbability: modelProb,
        fairProbability: Math.max(0.01, Math.min(0.99, roundedFairProb)),
        confidence: 0.95,
        modelVersion: this.MODEL_VERSION,
        calculatedAt: new Date(),
      };
    });
  }
}
