import { Injectable } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';

@Injectable()
export class FairOddsService {
  /**
   * Calculates fair odds: Fair Odds = 1 / Probability
   * Uses precise Decimal arithmetic.
   */
  calculateFairOdds(probability: number | Prisma.Decimal): Prisma.Decimal {
    const probNum = typeof probability === 'number' ? probability : probability.toNumber();
    const safeProb = Math.max(0.001, Math.min(0.999, probNum));
    const rawFairOdds = 1 / safeProb;
    
    // Format to 2 decimal precision
    const rounded = Math.round(rawFairOdds * 100) / 100;
    return new Prisma.Decimal(Math.max(1.01, rounded).toFixed(2));
  }
}
