import { Injectable } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';

@Injectable()
export class MarginService {
  /**
   * Applies configurable margin to model probabilities.
   * Fair Probabilities sum to 1.0 (100%).
   * Displayed Probabilities with Margin sum to (1.0 + margin) (e.g. 1.04 for 4% margin).
   * Displayed Odds = 1 / (ModelProb * (1 + margin))
   */
  applyMarginToOdds(
    modelProbability: number,
    marginRate: number | Prisma.Decimal = 0.04
  ): Prisma.Decimal {
    const marginNum = typeof marginRate === 'number' ? marginRate : marginRate.toNumber();
    const safeProb = Math.max(0.001, Math.min(0.999, modelProbability));

    // Overround probability
    const marginAdjustedProb = safeProb * (1 + marginNum);
    const rawOdds = 1 / marginAdjustedProb;

    const rounded = Math.round(rawOdds * 100) / 100;
    return new Prisma.Decimal(Math.max(1.01, rounded).toFixed(2));
  }
}
