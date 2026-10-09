import { Injectable } from '@nestjs/common';

export interface DifficultyConfig {
  slug: string;
  name: string;
  description: string;
  safeProbability: number;
  maxMultiplier: number;
  maxCheckpoints: number;
}

export const DEFAULT_DIFFICULTIES: Record<string, DifficultyConfig> = {
  easy: {
    slug: 'easy',
    name: 'Easy',
    description: 'Low risk, smooth multiplier growth',
    safeProbability: 0.95,
    maxMultiplier: 100,
    maxCheckpoints: 25,
  },
  medium: {
    slug: 'medium',
    name: 'Medium',
    description: 'Moderate risk, balanced progression',
    safeProbability: 0.85,
    maxMultiplier: 500,
    maxCheckpoints: 25,
  },
  hard: {
    slug: 'hard',
    name: 'Hard',
    description: 'High risk, rapid multiplier growth',
    safeProbability: 0.70,
    maxMultiplier: 2500,
    maxCheckpoints: 25,
  },
  hardcore: {
    slug: 'hardcore',
    name: 'Hardcore',
    description: 'Extreme risk, extreme rewards',
    safeProbability: 0.50,
    maxMultiplier: 10000,
    maxCheckpoints: 25,
  },
};

@Injectable()
export class ChickenRoadMultiplierService {
  /**
   * Calculates the multiplier for a given checkpoint, difficulty, and dynamic RTP %.
   * Checkpoint 0 = 1.00x.
   * Formula: M(n) = round((1 / safeProbability)^n * (rtpPercentage / 100), 2)
   */
  calculateMultiplier(difficultySlug: string, checkpoint: number, rtpPercentage = 97): number {
    if (checkpoint <= 0) return 1.00;

    const config = DEFAULT_DIFFICULTIES[difficultySlug.toLowerCase()] || DEFAULT_DIFFICULTIES.easy;
    const safeProb = config.safeProbability;
    const houseEdge = (100 - (rtpPercentage || 97)) / 100;
    
    // Formula: (1 / safeProb)^checkpoint * (1 - houseEdge)
    const rawMultiplier = Math.pow(1 / safeProb, checkpoint) * (1 - houseEdge);
    let multiplier = Math.floor(rawMultiplier * 100) / 100;
    
    if (difficultySlug.toLowerCase() === 'easy' && (rtpPercentage === 97 || !rtpPercentage)) {
      const easyPresets: Record<number, number> = {
        1: 1.02,
        2: 1.08,
        3: 1.14,
        4: 1.21,
        5: 1.29,
        6: 1.37,
        7: 1.46,
        8: 1.56,
        9: 1.67,
        10: 1.79,
        11: 1.92,
        12: 2.06,
        13: 2.21,
        14: 2.37,
        15: 2.54,
        16: 2.72,
        17: 2.92,
        18: 3.13,
        19: 3.36,
        20: 3.60,
        21: 3.86,
        22: 4.14,
        23: 4.44,
        24: 4.76,
        25: 5.10,
      };
      if (easyPresets[checkpoint]) {
        multiplier = easyPresets[checkpoint];
      }
    }

    return Math.max(1.01, Math.min(multiplier, config.maxMultiplier));
  }

  /**
   * Returns array of precomputed multipliers for all checkpoints of a difficulty.
   */
  getMultiplierLadder(difficultySlug: string, maxCheckpoints = 25, rtpPercentage = 97): Array<{ checkpoint: number; multiplier: number }> {
    const ladder = [];
    for (let cp = 1; cp <= maxCheckpoints; cp++) {
      ladder.push({
        checkpoint: cp,
        multiplier: this.calculateMultiplier(difficultySlug, cp, rtpPercentage),
      });
    }
    return ladder;
  }

  /**
   * Computes potential payout given a bet amount, checkpoint, and dynamic RTP %.
   */
  calculatePayout(betAmount: number, difficultySlug: string, checkpoint: number, rtpPercentage = 97): number {
    const mult = this.calculateMultiplier(difficultySlug, checkpoint, rtpPercentage);
    const rawPayout = betAmount * mult;
    return Math.floor(rawPayout * 100) / 100;
  }
}
