import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';
import { DatabaseService } from '../../../database/database.service.js';
import { SportsGateway } from '../../../sports/sports.gateway.js';
import { ProbabilityEngineService } from './probability-engine.service.js';
import { FairOddsService } from './fair-odds.service.js';
import { MarginService } from './margin.service.js';
import { ExposureEngineService, IMarketExposureSummary } from './exposure-engine.service.js';
import { RiskEngineService } from './risk-engine.service.js';
import { NormalizedMatchState } from '../match-state.service.js';

export interface IPricingCalculationOutput {
  marketId: string;
  selectionId: string;
  selectionName: string;
  modelProbability: number;
  fairProbability: number;
  marketImpliedProbability: number;
  overroundPercent: number;
  fairOdds: Prisma.Decimal;
  margin: number;
  riskAdjustedOdds: Prisma.Decimal;
  displayedOdds: Prisma.Decimal;
  exposure: Prisma.Decimal;
  liability: Prisma.Decimal;
  pricingVersion: string;
  calculatedAt: Date;
}

export interface IMarketPricingResult {
  marketId: string;
  pricingVersion: string;
  calculatedAt: Date;
  selections: IPricingCalculationOutput[];
}

@Injectable()
export class PricingEngineService {
  private readonly logger = new Logger(PricingEngineService.name);
  public readonly PRICING_VERSION = 'v1.0.0';

  constructor(
    private readonly db: DatabaseService,
    private readonly probabilityEngine: ProbabilityEngineService,
    private readonly fairOddsService: FairOddsService,
    private readonly marginService: MarginService,
    private readonly exposureEngine: ExposureEngineService,
    private readonly riskEngine: RiskEngineService,
    @Optional() @Inject(forwardRef(() => SportsGateway))
    private readonly sportsGateway?: SportsGateway
  ) {}

  /**
   * Single Authoritative Pricing Pipeline:
   * Match State -> Probability -> Fair Odds -> Margin -> Exposure -> Risk Adjustment -> Displayed Odds
   */
  async calculateMarketPricing(
    matchState: NormalizedMatchState | { matchId: string; innings: number; runs: number; wickets: number; overs: number; target?: number | null },
    market: { id: string; marketType: string; name?: string; categorySlug?: string; lineThreshold?: number | Prisma.Decimal | null; margin?: number | Prisma.Decimal | null },
    selections: Array<{ id: string; name: string; backPrice?: number | Prisma.Decimal }>,
    tenantId?: string
  ): Promise<IMarketPricingResult> {
    const marginRate = market.margin
      ? typeof market.margin === 'number'
        ? market.margin
        : market.margin.toNumber()
      : 0.04;

    // 1. Model Probabilities (Market-type aware predictions)
    const probResults = this.probabilityEngine.calculateMarketProbability(
      matchState as any,
      market as any,
      selections
    );
    const probMap = new Map(probResults.map((p) => [p.selectionId, p]));

    // 2. Exposure & Liability calculations
    let exposureSummary: IMarketExposureSummary | null = null;
    try {
      exposureSummary = await this.exposureEngine.calculateMarketExposure(market.id, tenantId);
    } catch {
      // Fallback if exposure lookup encounters issues
    }

    const exposureMap = new Map(
      (exposureSummary?.selectionsExposure || []).map((e) => [e.selectionId, e])
    );

    const calculatedSelections: IPricingCalculationOutput[] = [];

    for (const sel of selections) {
      const probRes = probMap.get(sel.id) || { modelProbability: 0.5, fairProbability: 0.5 };
      const modelProb = probRes.modelProbability;
      const fairProb = probRes.fairProbability;

      // 3. Fair Odds (1 / Probability)
      const fairOdds = this.fairOddsService.calculateFairOdds(modelProb);

      // 4. Apply Margin
      const oddsWithMargin = this.marginService.applyMarginToOdds(modelProb, marginRate);

      // 5. Exposure & Risk Adjustment
      const selExposure = exposureMap.get(sel.id);
      const riskAdjustedOdds = this.riskEngine.calculateRiskAdjustedOdds({
        selectionId: sel.id,
        baseOdds: oddsWithMargin,
        modelProbability: modelProb,
        exposure: selExposure,
      });

      const finalDisplayedOdds = riskAdjustedOdds;
      const finalOddsNum = finalDisplayedOdds.toNumber();
      const marketImpliedProb = parseFloat((1 / Math.max(1.01, finalOddsNum)).toFixed(4));
      const oldOddsNum = sel.backPrice ? (typeof sel.backPrice === 'number' ? sel.backPrice : sel.backPrice.toNumber()) : finalOddsNum;

      // 6. Log Structured PRICING Console Log (Requirement #14)
      if (oldOddsNum !== finalOddsNum) {
        console.log(`[PRICING] oldOdds=${oldOddsNum} newOdds=${finalOddsNum} reason=SCORE_STATE_RECALCULATION`);
      }

      calculatedSelections.push({
        marketId: market.id,
        selectionId: sel.id,
        selectionName: sel.name,
        modelProbability: modelProb,
        fairProbability: fairProb,
        marketImpliedProbability: marketImpliedProb,
        overroundPercent: marginRate,
        fairOdds,
        margin: marginRate,
        riskAdjustedOdds,
        displayedOdds: finalDisplayedOdds,
        exposure: selExposure ? selExposure.totalStake : new Prisma.Decimal(0),
        liability: selExposure ? selExposure.netExposure : new Prisma.Decimal(0),
        pricingVersion: this.PRICING_VERSION,
        calculatedAt: new Date(),
      });

      // 7. Persist Immutable MarketPriceSnapshot row to PostgreSQL (Requirement #15 & #16)
      try {
        await this.db.marketPriceSnapshot.create({
          data: {
            marketId: market.id,
            selectionId: sel.id,
            oldOdds: new Prisma.Decimal(oldOddsNum),
            newOdds: finalDisplayedOdds,
            fairOdds,
            probability: new Prisma.Decimal(modelProb),
            margin: new Prisma.Decimal(marginRate),
            exposure: selExposure ? selExposure.totalStake : new Prisma.Decimal(0),
            liability: selExposure ? selExposure.netExposure : new Prisma.Decimal(0),
            changeReason: 'MATCH_STATE_MODEL_PRICING',
            sourceProvider: 'AUTHORITATIVE_PRICING_ENGINE',
            pricingVersion: this.PRICING_VERSION,
          },
        });
      } catch (dbErr: any) {
        this.logger.error(`Error logging MarketPriceSnapshot for market ${market.id}: ${dbErr.message}`);
      }

      // Update Selection backPrice in Database
      await this.db.cricketMarketSelection.update({
        where: { id: sel.id },
        data: {
          backPrice: finalDisplayedOdds,
          layPrice: new Prisma.Decimal(parseFloat((finalOddsNum + 0.05).toFixed(2))),
        },
      });

      // 8. Broadcast Socket.IO Event (Requirement #12)
      if (this.sportsGateway) {
        const stateVersion = 'stateVersion' in matchState ? matchState.stateVersion : 1;
        this.sportsGateway.broadcastOddsUpdate(matchState.matchId, {
          matchId: matchState.matchId,
          marketId: market.id,
          selectionId: sel.id,
          oldOdds: oldOddsNum,
          newOdds: finalOddsNum,
          modelProbability: modelProb,
          finalOdds: finalOddsNum,
          matchStateVersion: stateVersion,
          priceVersion: this.PRICING_VERSION,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return {
      marketId: market.id,
      pricingVersion: this.PRICING_VERSION,
      calculatedAt: new Date(),
      selections: calculatedSelections,
    };
  }

  /**
   * Recalculates all active markets for a match given a new NormalizedMatchState
   */
  async recalculateMatchMarkets(matchId: string, matchState?: NormalizedMatchState) {
    const activeMarkets = await this.db.cricketMarket.findMany({
      where: { matchId, status: { in: ['OPEN', 'SUSPENDED'] } },
      include: { selections: { orderBy: { sortOrder: 'asc' } } },
    });

    if (activeMarkets.length === 0) return;

    let targetState = matchState;
    if (!targetState) {
      const match = await this.db.match.findUnique({
        where: { id: matchId },
        include: { score: true },
      });
      if (!match) return;

      const teamAScore = match.score?.teamAScore || '0/0';
      const teamBScore = match.score?.teamBScore || '0/0';
      const partsA = teamAScore.split('/');
      const partsB = teamBScore.split('/');

      const currentInnings = match.score?.currentInnings || 1;
      const isSecond = currentInnings === 2;

      targetState = {
        matchId,
        inningsNumber: currentInnings,
        runs: isSecond ? parseInt(partsB[0] || '0', 10) : parseInt(partsA[0] || '0', 10),
        wickets: isSecond ? parseInt(partsB[1] || '0', 10) : parseInt(partsA[1] || '0', 10),
        overs: isSecond ? parseFloat(match.score?.teamBOvers || '0') : parseFloat(match.score?.teamAOvers || '0'),
        target: match.score?.targetRuns || (isSecond ? parseInt(partsA[0] || '0', 10) + 1 : null),
        runsRequired: null,
        ballsRemaining: null,
        currentRunRate: match.score?.currentRunRate || 6.0,
        requiredRunRate: match.score?.requiredRunRate || null,
        matchStatus: match.status,
        stateVersion: 1,
        processedAt: new Date().toISOString(),
      };
    }

    for (const mkt of activeMarkets) {
      if (mkt.sourceType === 'ADMIN_OVERRIDE') {
        // Skip automated recalculation if manual override is active
        continue;
      }
      try {
        await this.calculateMarketPricing(targetState, mkt, mkt.selections);
      } catch (err: any) {
        this.logger.error(`Error recalculating market ${mkt.id}: ${err.message}`);
      }
    }
  }
}
