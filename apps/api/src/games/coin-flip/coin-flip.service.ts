import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { ReferralService } from '../../referral/referral.service.js';
import { GameOverrideService } from '../game-engine/game-override.service.js';

@Injectable()
export class CoinFlipService {
  constructor(
    private readonly db: DatabaseService,
    private readonly referralService: ReferralService,
    private readonly overrideService: GameOverrideService,
  ) {}

  private readonly DEMO_UUID = '00000000-0000-0000-0000-000000000000';
  private readonly MULTIPLIER = 1.96; // 1.96x payout (2.00x with 2% house edge)

  private toValidUserId(userId?: string): string {
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return userId;
    }
    return this.DEMO_UUID;
  }

  private async getGameConfig() {
    try {
      const dbGame = await this.db.game.findFirst({ where: { slug: 'coin-flip' } });
      if (dbGame) {
        return {
          minBet: Number(dbGame.minBet || 10),
          maxBet: Number(dbGame.maxBet || 50000),
          rtpPercentage: Number(dbGame.rtpPercentage || 96),
          isActive: dbGame.isActive !== false,
        };
      }
    } catch (e) {}
    return { minBet: 10, maxBet: 50000, rtpPercentage: 96, isActive: true };
  }

  private async getOrCreateWallet(userId: string) {
    const activeUserId = this.toValidUserId(userId);
    let user = await this.db.user.findUnique({ where: { id: activeUserId } });
    if (!user) {
      try {
        user = await this.db.user.create({
          data: {
            id: activeUserId,
            email: `demo-${activeUserId}@rivexa.com`,
            passwordHash: 'demo',
            referralCode: `REF-${activeUserId.slice(0, 8)}`,
          },
        });
      } catch (e) {
        user = (await this.db.user.findUnique({ where: { id: activeUserId } }))!;
      }
    }

    let wallet = await this.db.wallet.findUnique({ where: { userId: activeUserId } });
    if (!wallet) {
      wallet = await this.db.wallet.create({
        data: { userId: activeUserId, mainBalance: activeUserId === this.DEMO_UUID ? 5000.0 : 0.0, bonusBalance: 0.0 },
      });
    }
    return { activeUserId, wallet };
  }

  private determineOutcome(
    chosenSide: 'HEADS' | 'TAILS',
    rtpPercentage: number,
  ): 'HEADS' | 'TAILS' {
    const overrideVal = this.overrideService.getOverride('coin-flip');

    if (overrideVal !== null && overrideVal !== undefined) {
      const cleanOverride = String(overrideVal).trim().toUpperCase();
      if (cleanOverride === 'HEADS' || cleanOverride === 'H') return 'HEADS';
      if (cleanOverride === 'TAILS' || cleanOverride === 'T') return 'TAILS';
      if (cleanOverride === 'WIN' || cleanOverride === 'FORCE_WIN') return chosenSide;
      if (cleanOverride === 'LOSE' || cleanOverride === 'FORCE_LOSE') {
        return chosenSide === 'HEADS' ? 'TAILS' : 'HEADS';
      }
    }

    // Standard house RTP calculation
    const winProbability = (rtpPercentage / 100) * 0.5; // ~48% win rate for 96% RTP
    const isWin = Math.random() < winProbability;

    if (isWin) {
      return chosenSide;
    } else {
      return chosenSide === 'HEADS' ? 'TAILS' : 'HEADS';
    }
  }

  async play(userId: string, chosenSide: 'HEADS' | 'TAILS', betAmount: number) {
    const config = await this.getGameConfig();
    if (!config.isActive) {
      throw new BadRequestException('Coin Flip game is currently inactive');
    }

    const cleanSide = chosenSide.toUpperCase() as 'HEADS' | 'TAILS';
    if (cleanSide !== 'HEADS' && cleanSide !== 'TAILS') {
      throw new BadRequestException('Invalid choice. Must be HEADS or TAILS');
    }

    const amount = Number(betAmount);
    if (isNaN(amount) || amount < config.minBet) {
      throw new BadRequestException(`Minimum bet amount is ₹${config.minBet}`);
    }
    if (amount > config.maxBet) {
      throw new BadRequestException(`Maximum bet amount is ₹${config.maxBet}`);
    }

    const { activeUserId, wallet } = await this.getOrCreateWallet(userId);
    const balanceBefore = Number(wallet.mainBalance);

    if (balanceBefore < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Determine result
    const resultSide = this.determineOutcome(cleanSide, config.rtpPercentage);
    const isWin = cleanSide === resultSide;
    const payoutAmount = isWin ? Math.floor(amount * this.MULTIPLIER * 100) / 100 : 0;
    const netProfit = payoutAmount - amount;
    const balanceAfter = Math.floor((balanceBefore + netProfit) * 100) / 100;

    // Save transaction and bet in a Prisma transaction
    const [betRecord, updatedWallet] = await this.db.$transaction(async (tx: any) => {
      const uWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          mainBalance: balanceAfter,
          totalWinnings: isWin
            ? { increment: payoutAmount }
            : undefined,
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: isWin ? 'COIN_FLIP_WIN' : 'COIN_FLIP_BET',
          amount: amount,
          balanceBefore: balanceBefore,
          balanceAfter: balanceAfter,
          referenceType: 'COIN_FLIP',
          metadata: { chosenSide: cleanSide, resultSide, isWin, payoutAmount },
        },
      });

      const bet = await tx.coinFlipBet.create({
        data: {
          userId: activeUserId,
          chosenSide: cleanSide,
          resultSide,
          betAmount: amount,
          multiplier: this.MULTIPLIER,
          payoutAmount,
          status: isWin ? 'WON' : 'LOST',
        },
      });

      return [bet, uWallet];
    });

    // Process referral commissions in background if win/bet placed
    if (activeUserId !== this.DEMO_UUID) {
      this.referralService.processBetCommission(activeUserId, amount).catch(() => null);
    }

    return {
      betId: betRecord.id,
      chosenSide: cleanSide,
      resultSide,
      isWin,
      betAmount: amount,
      multiplier: this.MULTIPLIER,
      payoutAmount,
      balanceBefore,
      balanceAfter: Number(updatedWallet.mainBalance),
      createdAt: betRecord.createdAt,
    };
  }

  async getHistory(userId: string, limit = 20) {
    const activeUserId = this.toValidUserId(userId);
    const bets = await this.db.coinFlipBet.findMany({
      where: { userId: activeUserId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, limit),
    });

    return bets.map((b: any) => ({
      id: b.id,
      chosenSide: b.chosenSide,
      resultSide: b.resultSide,
      betAmount: Number(b.betAmount),
      multiplier: Number(b.multiplier),
      payoutAmount: Number(b.payoutAmount),
      status: b.status,
      createdAt: b.createdAt,
    }));
  }
}
