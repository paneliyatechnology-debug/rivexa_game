import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';
import { ISelectionExposure } from './exposure-engine.service.js';

export interface IRiskAdjustmentInput {
  selectionId: string;
  baseOdds: Prisma.Decimal;
  modelProbability: number;
  exposure?: ISelectionExposure;
  maxLiabilityLimit?: number;
}

@Injectable()
export class RiskEngineService {
  private readonly logger = new Logger(RiskEngineService.name);

  /**
   * Calculates risk-adjusted odds using multi-factor risk signals:
   * - Model probability
   * - Stake/Liability skew
   * - Liability threshold limit enforcement
   */
  calculateRiskAdjustedOdds(input: IRiskAdjustmentInput): Prisma.Decimal {
    const baseOddsNum = input.baseOdds.toNumber();
    if (!input.exposure || input.exposure.totalStake.toNumber() === 0) {
      return input.baseOdds;
    }

    const netLiabilityNum = input.exposure.netExposure.toNumber();
    const limit = input.maxLiabilityLimit || 500000;

    // Calculate risk adjustment factor (max 5% odds reduction on high liability)
    let riskFactor = 0;
    if (netLiabilityNum > 0 && limit > 0) {
      const liabilityRatio = Math.min(1.0, netLiabilityNum / limit);
      riskFactor = liabilityRatio * 0.05; // Shorten odds by up to 5% to deter excessive liability
    }

    const adjustedOdds = baseOddsNum * (1 - riskFactor);
    const rounded = Math.round(adjustedOdds * 100) / 100;
    return new Prisma.Decimal(Math.max(1.01, rounded).toFixed(2));
  }
}
