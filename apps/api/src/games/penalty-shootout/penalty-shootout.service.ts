import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { StartPenaltyRoundDto } from './dto/start-round.dto.js';
import { PenaltyShootDto } from './dto/shoot.dto.js';
import { PenaltyCashoutDto } from './dto/cashout.dto.js';
import * as crypto from 'crypto';
import { Prisma } from '@gaming-platform/database';

export interface PenaltyDifficultyConfig {
  slug: string;
  name: string;
  goalProbability: number;
  multipliers: number[];
  maxSpots: number;
  description: string;
}

export const PENALTY_DIFFICULTIES: Record<string, PenaltyDifficultyConfig> = {
  EASY: {
    slug: 'EASY',
    name: 'Easy',
    goalProbability: 0.80,
    multipliers: [1.20, 1.44, 1.73, 2.07, 2.49],
    maxSpots: 4,
    description: '4 target zones. High save probability. Great for beginners.',
  },
  MEDIUM: {
    slug: 'MEDIUM',
    name: 'Medium',
    goalProbability: 0.66,
    multipliers: [1.80, 3.38, 6.33, 11.87, 22.25],
    maxSpots: 5,
    description: '5 target zones. Balanced risk vs reward.',
  },
  HARD: {
    slug: 'HARD',
    name: 'Hard',
    goalProbability: 0.50,
    multipliers: [2.88, 8.64, 25.92, 77.76, 233.28],
    maxSpots: 8,
    description: '8 target zones. 50% goal probability. High multipliers.',
  },
  HARDCORE: {
    slug: 'HARDCORE',
    name: 'Hardcore',
    goalProbability: 0.33,
    multipliers: [3.60, 12.96, 46.66, 167.96, 604.66],
    maxSpots: 8,
    description: '8 target zones. 33% goal probability. Legendary multipliers up to 604x.',
  },
};

/** Full country catalogue — cosmetic only, does not affect RNG or outcomes */
export const COUNTRIES_CATALOGUE = [
  { name: 'Argentina', code: 'AR', flag: '🇦🇷', continent: 'South America' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', continent: 'Oceania' },
  { name: 'Belgium', code: 'BE', flag: '🇧🇪', continent: 'Europe' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷', continent: 'South America' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦', continent: 'North America' },
  { name: 'Chile', code: 'CL', flag: '🇨🇱', continent: 'South America' },
  { name: 'Colombia', code: 'CO', flag: '🇨🇴', continent: 'South America' },
  { name: 'Croatia', code: 'HR', flag: '🇭🇷', continent: 'Europe' },
  { name: 'Curaçao', code: 'CW', flag: '🇨🇼', continent: 'Caribbean' },
  { name: 'Czech Republic', code: 'CZ', flag: '🇨🇿', continent: 'Europe' },
  { name: 'Denmark', code: 'DK', flag: '🇩🇰', continent: 'Europe' },
  { name: 'Ecuador', code: 'EC', flag: '🇪🇨', continent: 'South America' },
  { name: 'England', code: 'GB-ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', continent: 'Europe' },
  { name: 'France', code: 'FR', flag: '🇫🇷', continent: 'Europe' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪', continent: 'Europe' },
  { name: 'Ghana', code: 'GH', flag: '🇬🇭', continent: 'Africa' },
  { name: 'India', code: 'IN', flag: '🇮🇳', continent: 'Asia' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹', continent: 'Europe' },
  { name: 'Ivory Coast', code: 'CI', flag: '🇨🇮', continent: 'Africa' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵', continent: 'Asia' },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽', continent: 'North America' },
  { name: 'Morocco', code: 'MA', flag: '🇲🇦', continent: 'Africa' },
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱', continent: 'Europe' },
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬', continent: 'Africa' },
  { name: 'Norway', code: 'NO', flag: '🇳🇴', continent: 'Europe' },
  { name: 'Poland', code: 'PL', flag: '🇵🇱', continent: 'Europe' },
  { name: 'Portugal', code: 'PT', flag: '🇵🇹', continent: 'Europe' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', continent: 'Asia' },
  { name: 'Senegal', code: 'SN', flag: '🇸🇳', continent: 'Africa' },
  { name: 'Serbia', code: 'RS', flag: '🇷🇸', continent: 'Europe' },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦', continent: 'Africa' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷', continent: 'Asia' },
  { name: 'Spain', code: 'ES', flag: '🇪🇸', continent: 'Europe' },
  { name: 'Switzerland', code: 'CH', flag: '🇨🇭', continent: 'Europe' },
  { name: 'Tunisia', code: 'TN', flag: '🇹🇳', continent: 'Africa' },
  { name: 'Turkey', code: 'TR', flag: '🇹🇷', continent: 'Europe' },
  { name: 'Ukraine', code: 'UA', flag: '🇺🇦', continent: 'Europe' },
  { name: 'Uruguay', code: 'UY', flag: '🇺🇾', continent: 'South America' },
  { name: 'USA', code: 'US', flag: '🇺🇸', continent: 'North America' },
  { name: 'Wales', code: 'GB-WLS', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', continent: 'Europe' },
];

import { GameOverrideService } from '../game-engine/game-override.service.js';

@Injectable()
export class PenaltyShootoutService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly overrideService?: GameOverrideService,
  ) {}

  private dynamicDifficulties: Record<string, PenaltyDifficultyConfig> = { ...PENALTY_DIFFICULTIES };

  getDifficultyConfigs(): Record<string, PenaltyDifficultyConfig> {
    return this.dynamicDifficulties;
  }

  updateDifficultyConfig(
    slug: string,
    updates: Partial<PenaltyDifficultyConfig>,
  ): PenaltyDifficultyConfig | null {
    const key = (slug || '').toUpperCase();
    if (!this.dynamicDifficulties[key]) {
      return null;
    }
    this.dynamicDifficulties[key] = {
      ...this.dynamicDifficulties[key],
      ...updates,
    };
    return this.dynamicDifficulties[key];
  }

  // ── Cryptographic Helpers ──────────────────────────────────────────────────

  private generateSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashSeed(seed: string): string {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  private calculateFloatFromSeed(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    shotNumber: number,
  ): number {
    const combined = `${serverSeed}:${clientSeed}:${nonce}:${shotNumber}`;
    const hash = crypto.createHmac('sha256', serverSeed).update(combined).digest('hex');
    const subHash = hash.substring(0, 8);
    const intVal = parseInt(subHash, 16);
    return intVal / 0xffffffff;
  }

  // ── Config & Countries ────────────────────────────────────────────────────

  getConfig() {
    return {
      gameCode: 'penalty-shootout',
      gameName: 'Rivexa Penalty Cup',
      version: '2.0.0',
      maxRounds: 5,
      minBet: 10,
      maxBet: 100000,
      currency: 'INR',
      difficulties: PENALTY_DIFFICULTIES,
      configHash: crypto
        .createHash('sha256')
        .update(JSON.stringify(PENALTY_DIFFICULTIES))
        .digest('hex')
        .substring(0, 16),
      status: 'ACTIVE',
      disclaimer:
        'Country selection is cosmetic only and does not affect RNG outcomes or payout probabilities.',
    };
  }

  getCountries() {
    return {
      total: COUNTRIES_CATALOGUE.length,
      disclaimer:
        'Country selection is purely cosmetic. It does not influence the random outcome generator.',
      countries: COUNTRIES_CATALOGUE,
    };
  }

  // ── Round Management ──────────────────────────────────────────────────────

  async getActiveRound(userId: string) {
    const activeRound = await this.prisma.penaltyShootoutRound.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        shots: {
          orderBy: { shotNumber: 'asc' },
        },
      },
    });

    if (!activeRound) return null;

    const diffConfig =
      this.dynamicDifficulties[activeRound.difficulty] ||
      PENALTY_DIFFICULTIES[activeRound.difficulty] ||
      PENALTY_DIFFICULTIES.MEDIUM;

    return {
      ...activeRound,
      difficultyConfig: diffConfig,
    };
  }

  async startRound(dto: StartPenaltyRoundDto) {
    const {
      userId,
      betAmount,
      difficulty = 'MEDIUM',
      homeTeam = 'South Africa',
      awayTeam = 'Japan',
      clientSeed: customClientSeed,
    } = dto;

    const diffConfig =
      this.dynamicDifficulties[difficulty.toUpperCase()] ||
      PENALTY_DIFFICULTIES[difficulty.toUpperCase()] ||
      PENALTY_DIFFICULTIES.MEDIUM;

    // 1. Check existing active round
    const existingActive = await this.prisma.penaltyShootoutRound.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (existingActive) {
      throw new BadRequestException(
        'You already have an active Penalty Shootout round in progress.',
      );
    }

    // 2. Fetch user wallet & verify balance
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

    if (!wallet) {
      throw new BadRequestException('User wallet not found');
    }

    const currentBalance = Number(wallet.mainBalance);
    if (currentBalance < betAmount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ₹${currentBalance.toFixed(2)}, Required: ₹${betAmount.toFixed(2)}`,
      );
    }

    // 3. Generate Provably Fair seeds
    const serverSeed = this.generateSeed();
    const serverSeedHash = this.hashSeed(serverSeed);
    const clientSeed = customClientSeed || crypto.randomBytes(12).toString('hex');

    // 4. Create round and deduct wallet balance atomically
    const newBalance = currentBalance - betAmount;

    const [round] = await this.prisma.$transaction([
      this.prisma.penaltyShootoutRound.create({
        data: {
          userId,
          difficulty: diffConfig.slug,
          betAmount: new Prisma.Decimal(betAmount),
          currentStep: 0,
          currentMultiplier: new Prisma.Decimal(1.0),
          potentialPayout: new Prisma.Decimal(0.0),
          status: 'ACTIVE',
          result: 'PENDING',
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce: 1,
          homeTeam,
          awayTeam,
          startedAt: new Date(),
        },
        include: { shots: true },
      }),
      this.prisma.wallet.update({
        where: { userId },
        data: { mainBalance: new Prisma.Decimal(newBalance) },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PENALTY_SHOOTOUT_BET',
          amount: new Prisma.Decimal(-betAmount),
          balanceBefore: new Prisma.Decimal(currentBalance),
          balanceAfter: new Prisma.Decimal(newBalance),
          referenceType: 'PENALTY_ROUND',
          metadata: { difficulty: diffConfig.slug, homeTeam, awayTeam },
        },
      }),
    ]);

    return {
      roundId: round.id,
      publicId: round.publicId,
      userId: round.userId,
      difficulty: round.difficulty,
      betAmount: Number(round.betAmount),
      currentStep: round.currentStep,
      currentMultiplier: Number(round.currentMultiplier),
      potentialPayout: Number(round.potentialPayout),
      status: round.status,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      homeTeam: round.homeTeam,
      awayTeam: round.awayTeam,
      difficultyConfig: diffConfig,
      newBalance,
    };
  }

  async shoot(dto: PenaltyShootDto) {
    const { userId, gameRoundId, targetSpot } = dto;

    // 1. Fetch round
    const round = await this.prisma.penaltyShootoutRound.findUnique({
      where: { id: gameRoundId },
      include: { shots: true },
    });

    if (!round) {
      throw new NotFoundException('Penalty Shootout round not found');
    }

    if (round.userId !== userId) {
      throw new BadRequestException('Unauthorized access to this game round');
    }

    if (round.status !== 'ACTIVE') {
      throw new BadRequestException(`Game round is already ${round.status}`);
    }

    const diffConfig =
      this.dynamicDifficulties[round.difficulty] ||
      PENALTY_DIFFICULTIES[round.difficulty] ||
      PENALTY_DIFFICULTIES.MEDIUM;

    // 2. Validate targetSpot against difficulty's maxSpots
    if (targetSpot < 1 || targetSpot > diffConfig.maxSpots) {
      throw new BadRequestException(
        `Target spot must be between 1 and ${diffConfig.maxSpots} for ${diffConfig.name} difficulty`,
      );
    }

    const shotNumber = round.currentStep + 1;

    if (shotNumber > 5) {
      throw new BadRequestException('Maximum 5 penalty kicks allowed per round');
    }

    // 3. Idempotency check: make sure this shot number hasn't been processed
    const existingShot = round.shots.find((s: any) => s.shotNumber === shotNumber);
    if (existingShot) {
      throw new BadRequestException(
        `Shot #${shotNumber} has already been processed for this round`,
      );
    }

    // 4. Calculate Provably Fair randomness
    const randomFloat = this.calculateFloatFromSeed(
      round.serverSeed,
      round.clientSeed,
      round.nonce,
      shotNumber,
    );

    const override = this.overrideService?.getOverride('penalty-shootout') || this.overrideService?.getOverride('penalty');
    let isGoal: boolean;
    if (override === 'FORCE_GOAL' || override === 'WIN' || override === 'GOAL') {
      isGoal = true;
    } else if (override === 'FORCE_SAVE' || override === 'LOSS' || override === 'SAVE') {
      isGoal = false;
    } else {
      isGoal = randomFloat < diffConfig.goalProbability;
    }

    // 5. Determine keeper spot (independent of target for fairness — keeper goes to a random spot)
    const allSpots = Array.from({ length: diffConfig.maxSpots }, (_, i) => i + 1);
    let keeperSpot: number;
    if (isGoal) {
      // Keeper goes somewhere OTHER than the scoring corner (ball goes past keeper)
      const otherSpots = allSpots.filter((s) => s !== targetSpot);
      const spotIndex = Math.floor(randomFloat * otherSpots.length);
      keeperSpot = otherSpots[spotIndex];
    } else {
      // Keeper blocks — they go toward the target
      keeperSpot = targetSpot;
    }

    const shotMultiplier = isGoal ? diffConfig.multipliers[shotNumber - 1] : 0;
    const betAmt = Number(round.betAmount);
    const potentialPayout = isGoal ? betAmt * shotMultiplier : 0;

    let updatedStatus = 'ACTIVE';
    let updatedResultState = 'PENDING';
    let autoWin = false;

    if (!isGoal) {
      updatedStatus = 'SAVED';
      updatedResultState = 'LOSS';
    } else if (shotNumber === 5) {
      updatedStatus = 'COMPLETED';
      updatedResultState = 'WIN';
      autoWin = true;
    }

    let finalNewBalance: number | null = null;

    const shotRecord = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const shot = await tx.penaltyShot.create({
        data: {
          gameRoundId: round.id,
          shotNumber,
          targetSpot,
          keeperSpot,
          result: isGoal ? 'GOAL' : 'SAVED',
          multiplier: new Prisma.Decimal(shotMultiplier),
          randomValue: new Prisma.Decimal(randomFloat),
        },
      });

      const updatedRound = await tx.penaltyShootoutRound.update({
        where: { id: round.id },
        data: {
          currentStep: isGoal ? shotNumber : round.currentStep,
          currentMultiplier: new Prisma.Decimal(shotMultiplier),
          potentialPayout: new Prisma.Decimal(potentialPayout),
          status: updatedStatus as any,
          result: updatedResultState as any,
          endedAt: !isGoal || autoWin ? new Date() : undefined,
        },
      });

      if (!isGoal || autoWin) {
        await tx.penaltyResult.create({
          data: {
            gameRoundId: round.id,
            userId,
            betAmount: round.betAmount,
            finalStep: isGoal ? shotNumber : round.currentStep,
            finalMultiplier: new Prisma.Decimal(shotMultiplier),
            grossPayout: new Prisma.Decimal(potentialPayout),
            profit: new Prisma.Decimal(potentialPayout - betAmt),
            result: isGoal ? 'WIN' : 'LOSS',
          },
        });
      }

      if (autoWin && potentialPayout > 0) {
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (wallet) {
          const oldBal = Number(wallet.mainBalance);
          const newBal = oldBal + potentialPayout;
          finalNewBalance = newBal;

          await tx.wallet.update({
            where: { userId },
            data: {
              mainBalance: new Prisma.Decimal(newBal),
              totalWinnings: { increment: new Prisma.Decimal(potentialPayout) },
            },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'PENALTY_SHOOTOUT_WIN',
              amount: new Prisma.Decimal(potentialPayout),
              balanceBefore: new Prisma.Decimal(oldBal),
              balanceAfter: new Prisma.Decimal(newBal),
              referenceType: 'PENALTY_ROUND',
              referenceId: round.id,
              metadata: { multiplier: shotMultiplier, step: shotNumber },
            },
          });
        }
      }

      return { shot, updatedRound };
    });

    return {
      gameRoundId: round.id,
      shotNumber,
      targetSpot,
      keeperSpot,
      isGoal,
      result: isGoal ? 'GOAL' : 'SAVED',
      multiplier: shotMultiplier,
      potentialPayout,
      currentStep: shotRecord.updatedRound.currentStep,
      status: shotRecord.updatedRound.status,
      nextMultiplier:
        isGoal && shotNumber < 5 ? diffConfig.multipliers[shotNumber] : null,
      // Server seed only revealed after round ends (provably fair)
      serverSeed: !isGoal || autoWin ? round.serverSeed : undefined,
      autoWin,
      newBalance: finalNewBalance,
    };
  }

  async cashout(dto: PenaltyCashoutDto) {
    const { userId, gameRoundId } = dto;

    const round = await this.prisma.penaltyShootoutRound.findUnique({
      where: { id: gameRoundId },
    });

    if (!round) {
      throw new NotFoundException('Penalty Shootout round not found');
    }

    if (round.userId !== userId) {
      throw new BadRequestException('Unauthorized access to this game round');
    }

    if (round.status !== 'ACTIVE') {
      throw new BadRequestException(`Game round is already ${round.status}`);
    }

    if (round.currentStep < 1) {
      throw new BadRequestException(
        'You must make at least one successful penalty kick before cashout',
      );
    }

    const betAmt = Number(round.betAmount);
    const multiplier = Number(round.currentMultiplier);
    const payout = betAmt * multiplier;
    const profit = payout - betAmt;

    let newBalance = 0;

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Double-check status to prevent race conditions
      const freshRound = await tx.penaltyShootoutRound.findUnique({
        where: { id: round.id },
      });
      if (!freshRound || freshRound.status !== 'ACTIVE') {
        throw new BadRequestException('Round is no longer active or already settled');
      }

      await tx.penaltyShootoutRound.update({
        where: { id: round.id },
        data: {
          status: 'CASHED_OUT',
          result: 'CASHOUT',
          cashoutAt: new Date(),
          endedAt: new Date(),
        },
      });

      await tx.penaltyResult.create({
        data: {
          gameRoundId: round.id,
          userId,
          betAmount: round.betAmount,
          finalStep: round.currentStep,
          finalMultiplier: round.currentMultiplier,
          grossPayout: new Prisma.Decimal(payout),
          profit: new Prisma.Decimal(profit),
          result: 'WIN',
        },
      });

      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (wallet) {
        const oldBal = Number(wallet.mainBalance);
        newBalance = oldBal + payout;

        await tx.wallet.update({
          where: { userId },
          data: {
            mainBalance: new Prisma.Decimal(newBalance),
            totalWinnings: { increment: new Prisma.Decimal(payout) },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'PENALTY_SHOOTOUT_CASHOUT',
            amount: new Prisma.Decimal(payout),
            balanceBefore: new Prisma.Decimal(oldBal),
            balanceAfter: new Prisma.Decimal(newBalance),
            referenceType: 'PENALTY_ROUND',
            referenceId: round.id,
            metadata: { multiplier, step: round.currentStep },
          },
        });
      }
    });

    return {
      gameRoundId: round.id,
      status: 'CASHED_OUT',
      multiplier,
      payout,
      profit,
      serverSeed: round.serverSeed, // revealed on cashout
      newBalance,
    };
  }

  // ── Provably Fair Verification ─────────────────────────────────────────────

  async verifyFairness(roundId: string, userId: string) {
    const round = await this.prisma.penaltyShootoutRound.findUnique({
      where: { id: roundId },
      include: { shots: { orderBy: { shotNumber: 'asc' } } },
    });

    if (!round) throw new NotFoundException('Round not found');
    if (round.userId !== userId)
      throw new BadRequestException('Unauthorized access to round');

    // Server seed only verifiable after round ends
    const isSettled = ['SAVED', 'COMPLETED', 'CASHED_OUT'].includes(round.status);
    if (!isSettled) {
      return {
        roundId: round.id,
        publicId: round.publicId,
        status: 'ACTIVE',
        verifiable: false,
        serverSeedHash: round.serverSeedHash,
        clientSeed: round.clientSeed,
        nonce: round.nonce,
        message:
          'Server seed will be revealed when the round ends to allow verification.',
        algorithm: 'HMAC-SHA256',
      };
    }

    const diffConfig =
      PENALTY_DIFFICULTIES[round.difficulty] || PENALTY_DIFFICULTIES.MEDIUM;

    // Re-compute outcomes from seed to verify integrity
    const verifiedShots = round.shots.map((shot: any) => {
      const recomputedFloat = this.calculateFloatFromSeed(
        round.serverSeed,
        round.clientSeed,
        round.nonce,
        shot.shotNumber,
      );
      const recomputedGoal = recomputedFloat < diffConfig.goalProbability;
      const storedGoal = shot.result === 'GOAL';
      const matches = recomputedGoal === storedGoal;

      return {
        shotNumber: shot.shotNumber,
        targetSpot: shot.targetSpot,
        keeperSpot: shot.keeperSpot,
        result: shot.result,
        recomputedFloat: recomputedFloat.toFixed(8),
        recomputedGoal,
        storedGoal,
        integrityOk: matches,
      };
    });

    const allMatch = verifiedShots.every((s: any) => s.integrityOk);

    // Verify server seed hash
    const computedHash = this.hashSeed(round.serverSeed);
    const hashMatches = computedHash === round.serverSeedHash;

    return {
      roundId: round.id,
      publicId: round.publicId,
      difficulty: round.difficulty,
      status: round.status,
      verifiable: true,
      integrityOk: allMatch && hashMatches,
      algorithm: 'HMAC-SHA256',
      algorithmDescription:
        'HMAC-SHA256(serverSeed, concat(serverSeed, clientSeed, nonce, shotNumber)) → hex → first 8 chars → uint32 / 0xFFFFFFFF',
      serverSeed: round.serverSeed,
      serverSeedHash: round.serverSeedHash,
      computedServerSeedHash: computedHash,
      hashMatches,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      goalProbability: diffConfig.goalProbability,
      shots: verifiedShots,
      summary: allMatch && hashMatches
        ? 'All shot outcomes verified successfully. This round is provably fair.'
        : 'One or more outcomes did not match. Please contact support.',
    };
  }

  // ── History & Statistics ───────────────────────────────────────────────────

  async getHistory(userId: string, limit = 20) {
    const rounds = await this.prisma.penaltyShootoutRound.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        shots: { orderBy: { shotNumber: 'asc' } },
        gameResult: true,
      },
    });

    return rounds.map((r: any) => ({
      id: r.id,
      publicId: r.publicId,
      difficulty: r.difficulty,
      betAmount: Number(r.betAmount),
      currentStep: r.currentStep,
      currentMultiplier: Number(r.currentMultiplier),
      payout: r.gameResult
        ? Number(r.gameResult.grossPayout)
        : Number(r.potentialPayout),
      status: r.status,
      result: r.result,
      homeTeam: r.homeTeam,
      awayTeam: r.awayTeam,
      shotsCount: r.shots.length,
      createdAt: r.createdAt,
    }));
  }

  async getStatistics() {
    const [totalRounds, wins, losses, cashouts] = await Promise.all([
      this.prisma.penaltyShootoutRound.count(),
      this.prisma.penaltyShootoutRound.count({ where: { result: 'WIN' } }),
      this.prisma.penaltyShootoutRound.count({ where: { result: 'LOSS' } }),
      this.prisma.penaltyShootoutRound.count({ where: { result: 'CASHOUT' } }),
    ]);

    const aggregates = await this.prisma.penaltyResult.aggregate({
      _sum: { betAmount: true, grossPayout: true, profit: true },
      _avg: { finalMultiplier: true },
    });

    const byDifficulty = await this.prisma.penaltyShootoutRound.groupBy({
      by: ['difficulty'],
      _count: { id: true },
      where: { status: { in: ['SAVED', 'COMPLETED', 'CASHED_OUT'] } },
    });

    return {
      totalRounds,
      settledRounds: wins + losses + cashouts,
      wins,
      losses,
      cashouts,
      winRate: totalRounds > 0 ? ((wins + cashouts) / totalRounds).toFixed(4) : '0',
      totalStaked: Number(aggregates._sum.betAmount || 0).toFixed(2),
      totalPaidOut: Number(aggregates._sum.grossPayout || 0).toFixed(2),
      houseEdge: Number(
        (Number(aggregates._sum.betAmount || 0) - Number(aggregates._sum.grossPayout || 0)),
      ).toFixed(2),
      averageFinalMultiplier: Number(aggregates._avg.finalMultiplier || 0).toFixed(4),
      byDifficulty: byDifficulty.map((d: any) => ({
        difficulty: d.difficulty,
        count: d._count.id,
      })),
    };
  }
}
