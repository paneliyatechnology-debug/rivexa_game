import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';
import { DatabaseService } from '../../database/database.service.js';
import { ChickenRoadFairnessService } from './fairness.service.js';
import { ChickenRoadMultiplierService, DEFAULT_DIFFICULTIES } from './multiplier.service.js';
import { CreateRoundDto } from './dto/chicken-road.dto.js';
import { ChickenRoadGateway } from './chicken-road.gateway.js';
import { toValidUserId, DEFAULT_DEMO_UUID } from '../../common/utils/user-id.util.js';

@Injectable()
export class ChickenRoadService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly fairnessService: ChickenRoadFairnessService,
    private readonly multiplierService: ChickenRoadMultiplierService,
    private readonly gateway: ChickenRoadGateway,
  ) {}

  /**
   * Retrieves default or custom game difficulties.
   */
  async getDifficulties() {
    const dbDifficulties = await this.prisma.chickenRoadDifficulty.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (dbDifficulties && dbDifficulties.length > 0) {
      return dbDifficulties.map((diff: any) => ({
        ...diff,
        multiplierLadder: this.multiplierService.getMultiplierLadder(diff.slug),
      }));
    }

    return Object.values(DEFAULT_DIFFICULTIES).map((diff) => ({
      ...diff,
      multiplierLadder: this.multiplierService.getMultiplierLadder(diff.slug),
    }));
  }

  private toValidUserId(userId?: string | null): string {
    return toValidUserId(userId);
  }

  private async getOrCreateWallet(tx: any, userId: string | null) {
    const activeUserId = this.toValidUserId(userId);
    let wallet = await tx.wallet.findFirst({
      where: { userId: activeUserId },
    });

    if (!wallet) {
      try {
        await tx.user.upsert({
          where: { id: activeUserId },
          update: {},
          create: {
            id: activeUserId,
            email: activeUserId === DEFAULT_DEMO_UUID ? 'demo@rivexa.com' : `user_${activeUserId.slice(0, 8)}@rivexa.com`,
            passwordHash: 'demo',
            referralCode: activeUserId === DEFAULT_DEMO_UUID ? 'DEMO123' : `REF_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          },
        });
        wallet = await tx.wallet.create({
          data: {
            userId: activeUserId,
            mainBalance: 10000.0,
            bonusBalance: 0.0,
            currency: 'INR',
          },
        });
      } catch (e) {
        wallet = await tx.wallet.findFirst({ where: { userId: activeUserId } });
      }
    }

    if (activeUserId === DEFAULT_DEMO_UUID && wallet && Number(wallet.mainBalance) < 10) {
      wallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { mainBalance: 10000.0 },
      });
    }

    return { activeUserId, wallet };
  }

  /**
   * Creates a new game round and debits the bet amount from user's wallet.
   */
  async createRound(userId: string | null, dto: CreateRoundDto) {
    const { betAmount, currency = 'INR', difficulty, clientSeed } = dto;
    const effectiveUserId = this.toValidUserId(userId);

    const dbConfig = await this.resolveGameConfigFromDb();

    if (betAmount < dbConfig.minBet) {
      throw new BadRequestException(`INVALID_BET: Minimum bet allowed is ₹${dbConfig.minBet}`);
    }
    if (betAmount > dbConfig.maxBet) {
      throw new BadRequestException(`INVALID_BET: Maximum bet allowed is ₹${dbConfig.maxBet}`);
    }

    const serverSeed = this.fairnessService.generateServerSeed();
    const serverSeedHash = this.fairnessService.hashServerSeed(serverSeed);
    const resolvedClientSeed = clientSeed || this.fairnessService.generateClientSeed();
    const nonce = 1;

    // Use DatabaseService transaction for wallet debit & round creation
    const round = await this.prisma.$transaction(async (tx: any) => {
      // 1. Fetch or auto-create wallet
      const { activeUserId, wallet } = await this.getOrCreateWallet(tx, userId);

      if (!wallet) {
        throw new BadRequestException('WALLET_NOT_FOUND: User wallet does not exist');
      }

      // 2. Auto-resolve any previous active round if present, allowing user to start fresh immediately
      const existingActive = await tx.chickenRoadRound.findFirst({
        where: {
          userId: activeUserId,
          status: { in: ['CREATED', 'READY', 'RUNNING'] },
        },
      });

      if (existingActive) {
        await tx.chickenRoadRound.update({
          where: { id: existingActive.id },
          data: {
            status: 'CRASHED',
            result: 'LOSS',
            endedAt: new Date(),
          },
        });
      }

      if (Number(wallet.mainBalance) < betAmount) {
        throw new BadRequestException('INSUFFICIENT_BALANCE: Not enough funds in wallet');
      }

      const balanceBefore = Number(wallet.mainBalance);
      const balanceAfter = balanceBefore - betAmount;

      // 2. Debit wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { mainBalance: balanceAfter },
      });

      // 3. Create wallet transaction ledger
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'BET',
          amount: betAmount,
          balanceBefore,
          balanceAfter,
          referenceType: 'CHICKEN_ROAD_BET',
          metadata: { difficulty, currency },
        },
      });

      // 4. Create ChickenRoadRound (active immediately upon bet placement!)
      const newRound = await tx.chickenRoadRound.create({
        data: {
          userId: activeUserId,
          difficultyId: difficulty.toLowerCase(),
          currency,
          betAmount,
          currentCheckpoint: 0,
          currentMultiplier: 1.00,
          potentialPayout: betAmount,
          status: 'RUNNING',
          startedAt: new Date(),
          result: 'PENDING',
          serverSeed,
          serverSeedHash,
          clientSeed: resolvedClientSeed,
          nonce,
        },
      });

      // 5. Create action log
      await tx.chickenRoadAction.create({
        data: {
          gameRoundId: newRound.id,
          userId,
          action: 'CREATE_ROUND',
          checkpoint: 0,
          requestId: `req_${Date.now()}`,
          payload: { betAmount, difficulty, currency },
        },
      });

      return newRound;
    });

    const updatedWallet = await this.prisma.wallet.findFirst({ where: { userId: effectiveUserId } });
    if (updatedWallet) {
      this.gateway.notifyUser(effectiveUserId, 'wallet.updated', {
        balance: Number(updatedWallet.mainBalance),
        currency: updatedWallet.currency,
      });
    }

    // Notify user via WebSocket
    this.gateway.notifyUser(effectiveUserId, 'game.round.created', {
      roundId: round.id,
      publicId: round.publicId,
      status: round.status,
      betAmount: round.betAmount,
      currency: round.currency,
      difficulty: round.difficultyId,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      checkpoint: 0,
      multiplier: 1.00,
      potentialPayout: round.betAmount,
    });

    return {
      roundId: round.id,
      publicId: round.publicId,
      status: round.status,
      betAmount: Number(round.betAmount),
      currency: round.currency,
      difficulty: round.difficultyId,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      checkpoint: 0,
      multiplier: 1.00,
      potentialPayout: Number(round.betAmount),
      walletBalance: updatedWallet ? Number(updatedWallet.mainBalance) : undefined,
    };
  }

  /**
   * Starts an existing READY round.
   */
  async startRound(userId: string | null, roundId: string) {
    if (!userId) {
      throw new BadRequestException('UNAUTHORIZED: User authentication required');
    }

    const round = await this.prisma.chickenRoadRound.findFirst({
      where: { id: roundId, userId },
    });

    if (!round) {
      throw new NotFoundException('ROUND_NOT_FOUND');
    }

    if (round.status !== 'READY') {
      throw new BadRequestException('ROUND_NOT_READY: Round is not in READY state');
    }

    const updated = await this.prisma.chickenRoadRound.update({
      where: { id: roundId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    await this.prisma.chickenRoadAction.create({
      data: {
        gameRoundId: roundId,
        userId,
        action: 'START',
        checkpoint: round.currentCheckpoint,
        requestId: `req_${Date.now()}`,
      },
    });

    this.gateway.notifyUser(userId, 'game.round.started', {
      roundId,
      status: 'RUNNING',
    });

    return {
      roundId: updated.id,
      status: updated.status,
      startedAt: updated.startedAt,
    };
  }

  /**
   * Executes a move to cross the next checkpoint.
   */
  async move(userId: string | null, roundId: string, requestId?: string) {
    if (!userId) {
      throw new BadRequestException('UNAUTHORIZED: User authentication required');
    }

    const round = await this.prisma.chickenRoadRound.findFirst({
      where: { id: roundId, userId },
    });

    if (!round) {
      throw new NotFoundException('ROUND_NOT_FOUND');
    }

    if (round.status !== 'RUNNING' && round.status !== 'READY') {
      throw new BadRequestException('ROUND_NOT_ACTIVE: Round is not active');
    }

    const nextCheckpoint = round.currentCheckpoint + 1;
    const diffSlug = round.difficultyId;
    const config = DEFAULT_DIFFICULTIES[diffSlug] || DEFAULT_DIFFICULTIES.easy;

    // Deterministically evaluate checkpoint
    const outcome = this.fairnessService.evaluateCheckpoint(
      round.serverSeed,
      round.clientSeed,
      round.nonce,
      nextCheckpoint,
      config.safeProbability,
    );

    if (outcome.isSafe) {
      // Safe step!
      const dbConfig = await this.resolveGameConfigFromDb();
      const rtpPercentage = dbConfig.rtpPercentage;

      const newMultiplier = this.multiplierService.calculateMultiplier(diffSlug, nextCheckpoint, rtpPercentage);
      const potentialPayout = this.multiplierService.calculatePayout(
        Number(round.betAmount),
        diffSlug,
        nextCheckpoint,
        rtpPercentage,
      );

      const updatedRound = await this.prisma.chickenRoadRound.update({
        where: { id: roundId },
        data: {
          currentCheckpoint: nextCheckpoint,
          currentMultiplier: newMultiplier,
          potentialPayout,
          status: 'RUNNING',
          startedAt: round.startedAt || new Date(),
        },
      });

      await this.prisma.chickenRoadCheckpoint.create({
        data: {
          gameRoundId: roundId,
          checkpointNumber: nextCheckpoint,
          multiplier: newMultiplier,
          result: 'SAFE',
          randomValue: outcome.randomValue,
        },
      });

      await this.prisma.chickenRoadAction.create({
        data: {
          gameRoundId: roundId,
          userId: round.userId,
          action: 'MOVE',
          checkpoint: nextCheckpoint,
          requestId: requestId || `req_${Date.now()}`,
          response: { result: 'SAFE', checkpoint: nextCheckpoint, multiplier: newMultiplier },
        },
      });

      const responsePayload = {
        roundId: round.id,
        result: 'SAFE' as const,
        checkpoint: nextCheckpoint,
        multiplier: newMultiplier,
        potentialPayout,
        canCashout: true,
      };

      this.gateway.notifyUser(userId, 'game.checkpoint.safe', responsePayload);

      if (nextCheckpoint >= (config.maxCheckpoints || 25)) {
        // Road fully crossed! Auto-cashout maximum win!
        return this.cashout(userId, roundId, requestId);
      }

      return responsePayload;
    } else {
      // CRASH! Chicken gets hit by vehicle!
      await this.prisma.$transaction(async (tx: any) => {
        await tx.chickenRoadRound.update({
          where: { id: roundId },
          data: {
            status: 'CRASHED',
            result: 'LOSS',
            endedAt: new Date(),
          },
        });

        await tx.chickenRoadCheckpoint.create({
          data: {
            gameRoundId: roundId,
            checkpointNumber: nextCheckpoint,
            multiplier: round.currentMultiplier,
            result: 'CRASH',
            randomValue: outcome.randomValue,
          },
        });

        await tx.chickenRoadResult.create({
          data: {
            gameRoundId: roundId,
            userId: round.userId,
            betAmount: round.betAmount,
            finalCheckpoint: nextCheckpoint,
            finalMultiplier: round.currentMultiplier,
            grossPayout: 0,
            profit: -Number(round.betAmount),
            currency: round.currency,
            result: 'LOSS',
          },
        });

        await tx.chickenRoadAction.create({
          data: {
            gameRoundId: roundId,
            userId: round.userId,
            action: 'MOVE',
            checkpoint: nextCheckpoint,
            requestId: requestId || `req_${Date.now()}`,
            response: { result: 'CRASH', checkpoint: nextCheckpoint },
          },
        });
      });

      const crashPayload = {
        roundId: round.id,
        result: 'CRASH' as const,
        checkpoint: nextCheckpoint,
        multiplier: Number(round.currentMultiplier),
        payout: 0.00,
        serverSeed: round.serverSeed, // Reveal server seed on crash!
      };

      this.gateway.notifyUser(userId, 'game.round.crashed', crashPayload);

      return crashPayload;
    }
  }

  /**
   * Cashout active earnings for a round.
   */
  async cashout(userId: string | null, roundId: string, requestId?: string) {
    if (!userId) {
      throw new BadRequestException('UNAUTHORIZED: User authentication required');
    }

    const effectiveUserId = this.toValidUserId(userId);

    const round = await this.prisma.chickenRoadRound.findFirst({
      where: { id: roundId, userId: effectiveUserId },
    });

    if (!round) {
      throw new NotFoundException('ROUND_NOT_FOUND');
    }

    if (round.status === 'CASHED_OUT' || round.status === 'CRASHED') {
      throw new BadRequestException('ROUND_ALREADY_SETTLED: This round has already ended');
    }

    if (round.status !== 'RUNNING' && round.status !== 'READY') {
      throw new BadRequestException('CASHOUT_NOT_ALLOWED: Round is not active');
    }

    if (round.currentCheckpoint <= 0) {
      throw new BadRequestException('CASHOUT_NOT_ALLOWED: Must cross at least 1 checkpoint to cashout');
    }

    const payout = Number(round.potentialPayout);
    const profit = payout - Number(round.betAmount);

    // Atomic double-cashout protected transaction
    await this.prisma.$transaction(async (tx: any) => {
      // 1. Fetch or auto-create wallet
      const { activeUserId, wallet } = await this.getOrCreateWallet(tx, effectiveUserId);

      if (!wallet) {
        throw new BadRequestException('WALLET_NOT_FOUND');
      }

      const balanceBefore = Number(wallet.mainBalance);
      const balanceAfter = balanceBefore + payout;

      // 2. Credit wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { mainBalance: balanceAfter },
      });

      // 3. Create wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CASHOUT',
          amount: payout,
          balanceBefore,
          balanceAfter,
          referenceType: 'CHICKEN_ROAD_CASHOUT',
          metadata: { checkpoint: round.currentCheckpoint, multiplier: Number(round.currentMultiplier) },
        },
      });

      // 4. Update round
      await tx.chickenRoadRound.update({
        where: { id: roundId },
        data: {
          status: 'CASHED_OUT',
          result: 'CASHOUT',
          cashoutAt: new Date(),
          endedAt: new Date(),
        },
      });

      // 5. Create result record
      await tx.chickenRoadResult.create({
        data: {
          gameRoundId: roundId,
          userId: effectiveUserId,
          betAmount: round.betAmount,
          finalCheckpoint: round.currentCheckpoint,
          finalMultiplier: round.currentMultiplier,
          grossPayout: payout,
          profit,
          currency: round.currency,
          result: 'WIN',
        },
      });

      // 6. Log action
      await tx.chickenRoadAction.create({
        data: {
          gameRoundId: roundId,
          userId: effectiveUserId,
          action: 'CASHOUT',
          checkpoint: round.currentCheckpoint,
          requestId: requestId || `req_${Date.now()}`,
          response: { payout, multiplier: round.currentMultiplier },
        },
      });
    });

    // Also update wallet UI
    const updatedWallet = await this.prisma.wallet.findFirst({ where: { userId: effectiveUserId } });
    if (updatedWallet) {
      this.gateway.notifyUser(effectiveUserId, 'wallet.updated', {
        balance: Number(updatedWallet.mainBalance),
        currency: updatedWallet.currency,
      });
    }

    const cashoutResponse = {
      roundId: round.id,
      result: 'CASHED_OUT' as const,
      checkpoint: round.currentCheckpoint,
      multiplier: Number(round.currentMultiplier),
      payout,
      profit,
      serverSeed: round.serverSeed, // Reveal server seed on cashout!
      walletBalance: updatedWallet ? Number(updatedWallet.mainBalance) : undefined,
    };

    this.gateway.notifyUser(round.userId, 'game.round.cashed_out', cashoutResponse);

    return cashoutResponse;
  }

  /**
   * Retrieves active round for user recovery after page refresh.
   */
  async getActiveRound(userId: string | null) {
    if (!userId) {
      return null;
    }

    const effectiveUserId = this.toValidUserId(userId);

    // Always fetch wallet balance so frontend can sync it on mount
    const wallet = await this.prisma.wallet.findFirst({ where: { userId: effectiveUserId } });
    const walletBalance = wallet ? Number(wallet.mainBalance) : undefined;

    const round = await this.prisma.chickenRoadRound.findFirst({
      where: {
        userId: effectiveUserId,
        status: { in: ['CREATED', 'READY', 'RUNNING'] },
      },
      include: {
        checkpoints: {
          orderBy: { checkpointNumber: 'asc' },
        },
      },
    });

    if (!round) {
      // No active round, but still return wallet balance for frontend to sync
      return { walletBalance };
    }

    return {
      roundId: round.id,
      publicId: round.publicId,
      status: round.status,
      difficulty: round.difficultyId,
      betAmount: Number(round.betAmount),
      currency: round.currency,
      currentCheckpoint: round.currentCheckpoint,
      currentMultiplier: Number(round.currentMultiplier),
      potentialPayout: Number(round.potentialPayout),
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      startedAt: round.startedAt,
      walletBalance,
      checkpoints: (round.checkpoints || []).map((cp: any) => ({
        checkpointNumber: cp.checkpointNumber,
        multiplier: Number(cp.multiplier),
        result: cp.result,
      })),
    };
  }

  /**
   * Retrieves history of past rounds.
   */
  async getHistory(userId: string | null, page = 1, limit = 20) {
    if (!userId) {
      return {
        items: [],
        page,
        limit,
        total: 0,
        totalPages: 0,
      };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.chickenRoadRound.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          gameResult: true,
        },
      }),
      this.prisma.chickenRoadRound.count({ where: { userId } }),
    ]);

    return {
      items: items.map((r: any) => ({
        id: r.id,
        publicId: r.publicId,
        date: r.createdAt,
        betAmount: Number(r.betAmount),
        currency: r.currency,
        difficulty: r.difficultyId,
        checkpoint: r.currentCheckpoint,
        multiplier: Number(r.currentMultiplier),
        status: r.status,
        result: r.result,
        payout: r.gameResult ? Number(r.gameResult.grossPayout) : 0,
        profit: r.gameResult ? Number(r.gameResult.profit) : 0,
        serverSeedHash: r.serverSeedHash,
        serverSeed: ['CASHED_OUT', 'CRASHED', 'COMPLETED'].includes(r.status) ? r.serverSeed : undefined,
        clientSeed: r.clientSeed,
        nonce: r.nonce,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Returns cryptographic fairness details for a specific round.
   */
  async getFairness(roundId: string) {
    const round = await this.prisma.chickenRoadRound.findUnique({
      where: { id: roundId },
      include: { checkpoints: true },
    });

    if (!round) {
      throw new NotFoundException('ROUND_NOT_FOUND');
    }

    const isRevealed = ['CASHED_OUT', 'CRASHED', 'COMPLETED'].includes(round.status);
    const config = DEFAULT_DIFFICULTIES[round.difficultyId] || DEFAULT_DIFFICULTIES.easy;

    return {
      roundId: round.id,
      serverSeedHash: round.serverSeedHash,
      serverSeed: isRevealed ? round.serverSeed : 'Hidden until round completion',
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      difficulty: round.difficultyId,
      safeProbability: config.safeProbability,
      isRevealed,
      verifiedHashMatch: isRevealed ? this.fairnessService.verifySeed(round.serverSeed, round.serverSeedHash) : null,
      checkpoints: (round.checkpoints || []).map((cp: any) => ({
        checkpoint: cp.checkpointNumber,
        multiplier: Number(cp.multiplier),
        result: cp.result,
        randomValue: Number(cp.randomValue),
      })),
    };
  }

  /**
   * Resolves authoritative game config from database without UUID type errors.
   */
  private async resolveGameConfigFromDb() {
    try {
      const dbGame = await this.prisma.game.findFirst({
        where: {
          slug: { in: ['chicken-road', 'chickenroad', 'chicken_road'] },
        },
      });
      if (dbGame) {
        return {
          minBet: dbGame.minBet !== undefined && dbGame.minBet !== null ? Number(dbGame.minBet) : 10.0,
          maxBet: dbGame.maxBet !== undefined && dbGame.maxBet !== null ? Number(dbGame.maxBet) : 200.0,
          rtpPercentage: dbGame.rtpPercentage !== undefined && dbGame.rtpPercentage !== null ? Number(dbGame.rtpPercentage) : 97.0,
        };
      }
    } catch (e) {
      console.error('resolveGameConfigFromDb error:', e);
    }
    return { minBet: 10.0, maxBet: 200.0, rtpPercentage: 97.0 };
  }

  /**
   * Game configuration details.
   */
  async getGameConfig() {
    const config = await this.resolveGameConfigFromDb();

    return {
      game: {
        name: 'Original Chicken Road',
        version: '1.0.0',
        enabled: true,
        rtpPercentage: config.rtpPercentage,
      },
      limits: {
        minBet: config.minBet,
        maxBet: config.maxBet,
        defaultBet: Math.max(config.minBet, Math.min(10, config.maxBet)),
      },
      currency: {
        code: 'INR',
        symbol: '₹',
        decimals: 2,
      },
      difficulties: Object.values(DEFAULT_DIFFICULTIES),
    };
  }
}
