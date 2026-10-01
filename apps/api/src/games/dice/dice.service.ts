import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { ReferralService } from '../../referral/referral.service.js';
import { GameOverrideService } from '../game-engine/game-override.service.js';

@Injectable()
export class DiceService {
  constructor(
    private readonly db: DatabaseService,
    private readonly referralService: ReferralService,
    private readonly overrideService: GameOverrideService,
  ) {}

  private readonly DEMO_UUID = '00000000-0000-0000-0000-000000000000';

  private toValidUserId(userId?: string): string {
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return userId;
    }
    return this.DEMO_UUID;
  }

  private async getGameConfig() {
    try {
      const dbGame = await this.db.game.findFirst({ where: { slug: 'dice' } });
      if (dbGame) {
        return {
          minBet: Number(dbGame.minBet || 10),
          maxBet: Number(dbGame.maxBet || 50000),
          rtpPercentage: Number(dbGame.rtpPercentage || 98),
          isActive: dbGame.isActive !== false,
        };
      }
    } catch (e) {}
    return { minBet: 10, maxBet: 50000, rtpPercentage: 98, isActive: true };
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

  /**
   * Determine the dice roll result using RTP algorithm + admin override
   * This mirrors how parity determines outcomes for house profitability
   */
  private determineRolledNumber(
    targetNumber: number,
    rollType: 'over' | 'under',
    betAmount: number,
    rtpPercentage: number,
  ): number {
    // Check for admin override first
    const overrideVal = this.overrideService.getOverride('dice');

    if (overrideVal !== null && overrideVal !== undefined) {
      // Parse override: could be a number (exact roll), "WIN", "LOSE", "OVER XX", "UNDER XX"
      const cleanOverride = overrideVal.trim().toUpperCase();

      if (cleanOverride === 'WIN' || cleanOverride === 'FORCE_WIN') {
        // Force a winning roll
        if (rollType === 'over') {
          return Math.min(99, targetNumber + 1 + Math.floor(Math.random() * (99 - targetNumber)));
        } else {
          return Math.max(0, Math.floor(Math.random() * targetNumber));
        }
      }

      if (cleanOverride === 'LOSE' || cleanOverride === 'FORCE_LOSE' || cleanOverride === 'BOOM') {
        // Force a losing roll
        if (rollType === 'over') {
          return Math.floor(Math.random() * (targetNumber + 1));
        } else {
          return targetNumber + Math.floor(Math.random() * (100 - targetNumber));
        }
      }

      // Try parsing as a number (exact roll result)
      const numOverride = parseInt(cleanOverride, 10);
      if (!isNaN(numOverride) && numOverride >= 0 && numOverride <= 99) {
        return numOverride;
      }
    }

    // RTP-based algorithm: house should win (100 - rtpPercentage)% of the time
    // House edge means the player should lose more often than pure randomness
    const houseEdge = (100 - rtpPercentage) / 100;
    const randomValue = Math.random();

    // Calculate true win probability for the player's bet
    const trueWinProbability = rollType === 'over'
      ? (99 - targetNumber) / 100   // e.g., target 50, over: 49/100 = 49%
      : targetNumber / 100;          // e.g., target 50, under: 50/100 = 50%

    // Apply house edge: reduce win probability
    const adjustedWinProbability = trueWinProbability * (1 - houseEdge);

    // Determine if player should win based on adjusted probability
    const playerShouldWin = randomValue < adjustedWinProbability;

    if (playerShouldWin) {
      // Generate a winning number
      if (rollType === 'over') {
        // Roll must be > targetNumber (targetNumber+1 to 99)
        const range = 99 - targetNumber;
        return targetNumber + 1 + Math.floor(Math.random() * range);
      } else {
        // Roll must be < targetNumber (0 to targetNumber-1)
        return Math.floor(Math.random() * targetNumber);
      }
    } else {
      // Generate a losing number
      if (rollType === 'over') {
        // Roll must be <= targetNumber (0 to targetNumber)
        return Math.floor(Math.random() * (targetNumber + 1));
      } else {
        // Roll must be >= targetNumber (targetNumber to 99)
        return targetNumber + Math.floor(Math.random() * (100 - targetNumber));
      }
    }
  }

  async roll(userId: string, targetNumber: number, rollType: 'over' | 'under', betAmount: number) {
    const config = await this.getGameConfig();

    if (!config.isActive) {
      throw new BadRequestException('Dice game is currently disabled by admin.');
    }

    if (!betAmount || betAmount < config.minBet || betAmount > config.maxBet) {
      throw new BadRequestException(`Bet amount must be between ₹${config.minBet} and ₹${config.maxBet.toLocaleString('en-IN')}.`);
    }
    if (targetNumber < 2 || targetNumber > 98) {
      throw new BadRequestException('Target number must be between 2 and 98.');
    }

    const { activeUserId, wallet } = await this.getOrCreateWallet(userId);
    if (!wallet || Number(wallet.mainBalance) < betAmount) {
      throw new BadRequestException('Insufficient wallet balance.');
    }

    // Deduct balance
    const balanceBefore = Number(wallet.mainBalance);
    const balanceAfter = balanceBefore - betAmount;

    await this.db.wallet.update({
      where: { id: wallet.id },
      data: { mainBalance: balanceAfter },
    });

    await this.db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'bet',
        amount: betAmount,
        balanceBefore,
        balanceAfter,
        referenceType: 'dice_game',
      },
    });

    // Determine rolled number using RTP algorithm
    const rolledNumber = this.determineRolledNumber(targetNumber, rollType, betAmount, config.rtpPercentage);

    const winProbability = rollType === 'over' ? 100 - targetNumber : targetNumber;
    const multiplier = Number((98 / winProbability).toFixed(2));

    const isWin = rollType === 'over' ? rolledNumber > targetNumber : rolledNumber < targetNumber;
    const payoutAmount = isWin ? Number((betAmount * multiplier).toFixed(2)) : 0;
    const status = isWin ? 'WON' : 'LOST';

    const bet = await this.db.diceBet.create({
      data: {
        userId: activeUserId,
        targetNumber,
        rollType,
        rolledNumber,
        betAmount,
        multiplier,
        payoutAmount,
        status,
      },
    });

    if (isWin) {
      const winBalanceBefore = balanceAfter;
      const winBalanceAfter = winBalanceBefore + payoutAmount;

      await this.db.wallet.update({
        where: { id: wallet.id },
        data: { mainBalance: winBalanceAfter },
      });

      await this.db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'win',
          amount: payoutAmount,
          balanceBefore: winBalanceBefore,
          balanceAfter: winBalanceAfter,
          referenceType: 'dice_game',
          referenceId: bet.id,
        },
      });
    }

    // Process referral commission for this bet
    try {
      await this.referralService.processBetCommission(activeUserId, betAmount);
    } catch (e) {
      // Don't block game for referral failures
    }

    // Fetch updated wallet balance
    const updatedWallet = await this.db.wallet.findUnique({ where: { userId: activeUserId } });
    const newBalance = updatedWallet ? Number(updatedWallet.mainBalance) : (isWin ? balanceAfter + payoutAmount : balanceAfter);

    return {
      betId: bet.id,
      targetNumber,
      rollType,
      rolledNumber,
      isWin,
      multiplier,
      payoutAmount,
      status,
      newBalance,
    };
  }

  /** GET /games/dice/history — user's bet history */
  async getMyBets(userId: string) {
    const activeUserId = this.toValidUserId(userId);

    const bets = await this.db.diceBet.findMany({
      where: { userId: activeUserId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return bets.map((b: any) => ({
      id: b.id,
      targetNumber: b.targetNumber,
      rollType: b.rollType,
      rolledNumber: b.rolledNumber,
      betAmount: Number(b.betAmount),
      multiplier: Number(b.multiplier),
      payoutAmount: Number(b.payoutAmount),
      status: b.status,
      createdAt: b.createdAt,
    }));
  }

  /** GET /games/dice/state — get current game state with balance + history */
  async getGameState(userId: string) {
    const { activeUserId, wallet } = await this.getOrCreateWallet(userId);
    const config = await this.getGameConfig();

    const recentBets = await this.db.diceBet.findMany({
      where: { userId: activeUserId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const myBets = recentBets.map((b: any) => ({
      id: b.id,
      targetNumber: b.targetNumber,
      rollType: b.rollType,
      rolledNumber: b.rolledNumber,
      betAmount: Number(b.betAmount),
      multiplier: Number(b.multiplier),
      payoutAmount: Number(b.payoutAmount),
      status: b.status,
      createdAt: b.createdAt,
    }));

    // Global recent rolls (all users) for showing history
    const globalRecentBets = await this.db.diceBet.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const recentRolls = globalRecentBets.map((b: any) => ({
      rolledNumber: b.rolledNumber,
      rollType: b.rollType,
      targetNumber: b.targetNumber,
      status: b.status,
      createdAt: b.createdAt,
    }));

    return {
      success: true,
      user_balance: Number(wallet.mainBalance),
      minBet: config.minBet,
      maxBet: config.maxBet,
      isActive: config.isActive,
      my_bets: myBets,
      recent_rolls: recentRolls,
      total_bets: myBets.length,
    };
  }
}
