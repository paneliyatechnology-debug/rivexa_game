import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { ReferralService } from '../../referral/referral.service.js';
import { GameOverrideService } from '../game-engine/game-override.service.js';
import * as crypto from 'crypto';

@Injectable()
export class SpinService {
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

  public getCurrentPeriodId(interval: number = 30): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const periodIndex = Math.floor(timestamp / interval);
    const now = new Date(timestamp * 1000);
    const yyyy = now.getFullYear();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${String(periodIndex % 10000).padStart(4, '0')}`;
  }

  private async getGameConfig() {
    try {
      const dbGame = await this.db.game.findFirst({ where: { slug: 'spin' } });
      if (dbGame) {
        return {
          minBet: Number(dbGame.minBet || 10),
          maxBet: Number(dbGame.maxBet || 50000),
          rtpPercentage: Number(dbGame.rtpPercentage || 95),
        };
      }
    } catch (e) {}
    return { minBet: 10, maxBet: 50000, rtpPercentage: 95 };
  }

  async getGameState(rawUserId?: string) {
    const userId = this.toValidUserId(rawUserId);
    const timestamp = Math.floor(Date.now() / 1000);
    const interval = 30;
    const periodIndex = Math.floor(timestamp / interval);
    const elapsed = timestamp % interval;
    const secondsRemaining = interval - elapsed;
    const currentPeriodId = this.getCurrentPeriodId(30);

    const config = await this.getGameConfig();

    let walletBalance = '0.00';
    if (userId !== this.DEMO_UUID) {
      const wallet = await this.db.wallet.findUnique({ where: { userId } });
      if (wallet) {
        walletBalance = Number(wallet.mainBalance).toFixed(2);
      }
    }

    const recentBets = await this.db.spinBet.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const history = recentBets.map((b: any) => ({
      periodNumber: `#${b.id.slice(0, 8).toUpperCase()}`,
      resultColor: b.resultColor,
      multiplier: Number(b.multiplier),
      timestamp: new Date(b.createdAt).getTime(),
    }));

    let myBets: any[] = [];
    if (userId !== this.DEMO_UUID) {
      const userBetRecords = await this.db.spinBet.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      myBets = userBetRecords.map((b: any) => ({
        id: b.id,
        option: b.selectedColor.toUpperCase(),
        amount: Number(b.betAmount).toFixed(2),
        winAmount: Number(b.payoutAmount).toFixed(2),
        status: b.status.toLowerCase(),
        createdAt: b.createdAt,
      }));
    }

    return {
      periodNumber: currentPeriodId,
      secondsRemaining,
      bettingOpen: elapsed < 20,
      walletBalance,
      minBet: config.minBet,
      maxBet: config.maxBet,
      rtpPercentage: config.rtpPercentage,
      history,
      myBets,
    };
  }

  async spin(rawUserId: string, selectedColor: string, betAmount: number, periodNumber?: string) {
    const userId = this.toValidUserId(rawUserId);
    const config = await this.getGameConfig();
    if (!betAmount || betAmount < config.minBet || betAmount > config.maxBet) {
      throw new BadRequestException(`Bet amount must be between ₹${config.minBet} and ₹${config.maxBet.toLocaleString('en-IN')}.`);
    }

    const colorMultipliers: Record<string, number> = {
      red: 2.0,
      blue: 3.0,
      green: 5.0,
      gold: 50.0,
      yellow: 2.0,
      elephant: 2.0,
      lion: 2.0,
      bull: 2.0,
      tiger: 18.0,
      crown: 50.0,
    };

    const color = (selectedColor || 'red').toLowerCase();
    const multiplierMultiplier = colorMultipliers[color] || 2.0;

    const wallet = await this.db.wallet.findUnique({ where: { userId } });
    if (!wallet || Number(wallet.mainBalance) < betAmount) {
      throw new BadRequestException('Insufficient wallet balance.');
    }

    // Deduct bet amount
    const balanceBefore = Number(wallet.mainBalance);
    const balanceAfter = balanceBefore - betAmount;

    await this.db.wallet.update({
      where: { id: wallet.id },
      data: { mainBalance: balanceAfter },
    });

    const activePeriodNumber = periodNumber || this.getCurrentPeriodId(30);

    await this.db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'bet',
        amount: betAmount,
        balanceBefore,
        balanceAfter,
        referenceType: 'spin_game',
        referenceId: activePeriodNumber,
      },
    });

    // Check if admin has set a forced override for Spin Wheel
    const activeOverride = this.overrideService.getOverride('spin');
    let resultColor = 'red';

    if (activeOverride !== null && activeOverride !== undefined && activeOverride !== '') {
      resultColor = activeOverride.toLowerCase();
    } else {
      // Server-side wheel outcome determination scaled by target RTP %
      const rtp = config.rtpPercentage / 100;
      const rand = Math.random();
      if (rand < 0.50 * rtp) resultColor = 'red';
      else if (rand < 0.80 * rtp) resultColor = 'blue';
      else if (rand < 0.96 * rtp) resultColor = 'green';
      else resultColor = 'gold';
    }

    const isWin = color === resultColor ||
      (color === 'elephant' && resultColor === 'green') ||
      (color === 'lion' && resultColor === 'yellow') ||
      (color === 'bull' && resultColor === 'red') ||
      (color === 'crown' && resultColor === 'gold');

    const multiplier = isWin ? multiplierMultiplier : 0;
    const payoutAmount = isWin ? Number((betAmount * multiplier).toFixed(2)) : 0;
    const status = isWin ? 'WON' : 'LOST';

    const bet = await this.db.spinBet.create({
      data: {
        userId,
        selectedColor: color,
        resultColor,
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
          referenceType: 'spin_game',
          referenceId: bet.id,
        },
      });
    }

    // Process referral commission on settled spin bet
    if (userId !== this.DEMO_UUID) {
      try {
        await this.referralService.processBetCommission(userId, betAmount, bet.id);
      } catch (e) {}
    }

    return {
      betId: bet.id,
      periodNumber: activePeriodNumber,
      selectedColor: color,
      resultColor,
      isWin,
      multiplier,
      payoutAmount,
      status,
      newBalance: isWin ? (balanceAfter + payoutAmount).toFixed(2) : balanceAfter.toFixed(2),
    };
  }

  async getHistory() {
    const bets = await this.db.spinBet.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      history: bets.map((b: any) => ({
        periodNumber: `#${b.id.slice(0, 8).toUpperCase()}`,
        number: b.resultColor === 'gold' ? 4 : b.resultColor === 'red' ? 0 : 32,
        label: b.resultColor.toUpperCase(),
        color: b.resultColor,
        animal: b.resultColor === 'gold' ? 'crown' : b.resultColor === 'green' ? 'elephant' : b.resultColor === 'red' ? 'bull' : 'lion',
        multiplier: Number(b.multiplier || 2.0),
        timestamp: new Date(b.createdAt).getTime(),
      })),
    };
  }
}
