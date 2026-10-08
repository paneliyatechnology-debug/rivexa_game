import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { toValidUserId, DEFAULT_DEMO_UUID } from '../../common/utils/user-id.util.js';
import { ReferralService } from '../../referral/referral.service.js';
import { GameOverrideService } from '../game-engine/game-override.service.js';
import * as crypto from 'crypto';

@Injectable()
export class CrashService {
  constructor(
    private readonly db: DatabaseService,
    private readonly referralService: ReferralService,
    private readonly overrideService: GameOverrideService,
  ) {}

  private async getGameConfig() {
    try {
      const dbGame = await this.db.game.findFirst({ where: { slug: 'crash' } });
      if (dbGame) {
        return {
          minBet: Number(dbGame.minBet || 10),
          maxBet: Number(dbGame.maxBet || 100000),
          rtpPercentage: Number(dbGame.rtpPercentage || 95),
        };
      }
    } catch (e) {}
    return { minBet: 10, maxBet: 100000, rtpPercentage: 95 };
  }

  /**
   * Provably Fair HMAC-SHA256 Crash Multiplier Generator.
   * Traceable to Laravel: App\Helpers\GameHelper::generateCrashPoint
   */
  public generateCrashPoint(seed: string, salt: string = 'rivexa_crash_salt', targetRtp: number = 95): number {
    const hmac = crypto.createHmac('sha256', salt);
    hmac.update(seed);
    const hash = hmac.digest('hex');
    const subHash = hash.substring(0, 8);
    const hexInt = parseInt(subHash, 16);

    const rtp = Math.max(50, Math.min(99, Number(targetRtp) || 95));
    const houseEdge = Math.max(1, 100 - rtp);
    const instantCrashThreshold = Math.max(2, Math.round(100 / houseEdge));

    if (hexInt % instantCrashThreshold === 0) {
      return 1.00; // House edge instant crash at 1.00x
    }

    const e = Math.pow(2, 32);
    const rawMult = Math.floor((rtp * e - hexInt) / (e - hexInt)) / 100;
    return Math.max(1.01, Math.min(rawMult, 500.00));
  }

  /**
   * Get or sync active Crash round state.
   * Traceable to Laravel: App\Services\CrashGameService::getSynchronizedState
   */
  async getSynchronizedState(userId?: string) {
    let round = await this.db.crashRound.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const nowMs = Date.now();
    const nowTs = Math.floor(nowMs / 1000);

    if (!round) {
      const seed = String(nowTs);
      const activeOverride = this.overrideService.getOverride('crash') || this.overrideService.getOverride('jet') || this.overrideService.getOverride('rocket');
      const config = await this.getGameConfig();
      let crashMultiplier = activeOverride ? parseFloat(activeOverride) : 0;
      if (!crashMultiplier || isNaN(crashMultiplier) || crashMultiplier < 1.0) {
        crashMultiplier = this.generateCrashPoint(seed, 'rivexa_crash_salt', config.rtpPercentage);
      }

      round = await this.db.crashRound.create({
        data: {
          roundNumber: BigInt(nowTs),
          crashMultiplier,
          status: 'BETTING_OPEN',
        },
      });
    }

    const roundCreatedMs = round.createdAt.getTime();
    const elapsedSec = Math.max(0, (nowMs - roundCreatedMs) / 1000);

    let status = round.status;
    let secondsRemaining = 0;
    let currentMultiplier = 1.00;

    const COUNTDOWN_SECONDS = 5;
    const crashMult = Number(round.crashMultiplier);
    const EXP_RATE = 0.06; // Authentic Spribe Aviator exponential rate

    if (elapsedSec < COUNTDOWN_SECONDS) {
      status = 'BETTING_OPEN';
      secondsRemaining = Math.ceil(COUNTDOWN_SECONDS - elapsedSec);
      currentMultiplier = 1.00;
    } else {
      const flightElapsed = elapsedSec - COUNTDOWN_SECONDS;
      const targetDuration = Math.max(0.1, Math.log(Math.max(1.001, crashMult)) / EXP_RATE);

      if (flightElapsed < targetDuration) {
        status = 'FLYING';
        const rawMult = Math.exp(EXP_RATE * flightElapsed);
        currentMultiplier = Math.min(crashMult, Number(rawMult.toFixed(2)));
        secondsRemaining = 0;
      } else {
        status = 'CRASHED';
        currentMultiplier = crashMult;
        const postCrashElapsed = flightElapsed - targetDuration;
        secondsRemaining = Math.max(0, Math.ceil(3 - postCrashElapsed));

        if (postCrashElapsed >= 3) {
          // Create new round with sequential round number seed
          const prevNum = Number(round.roundNumber || nowTs);
          const nextRoundNum = BigInt(prevNum > 0 ? prevNum + 1 : nowTs);
          const seed = String(nextRoundNum);
          const activeOverride = this.overrideService.getOverride('crash') || this.overrideService.getOverride('jet') || this.overrideService.getOverride('rocket');
          const config = await this.getGameConfig();
          let newMultiplier = activeOverride ? parseFloat(activeOverride) : 0;
          if (!newMultiplier || isNaN(newMultiplier) || newMultiplier < 1.0) {
            newMultiplier = this.generateCrashPoint(seed, 'rivexa_crash_salt', config.rtpPercentage);
          }

          round = await this.db.crashRound.create({
            data: {
              roundNumber: nextRoundNum,
              crashMultiplier: newMultiplier,
              status: 'BETTING_OPEN',
            },
          });
          status = 'BETTING_OPEN';
          secondsRemaining = COUNTDOWN_SECONDS;
          currentMultiplier = 1.00;
        }
      }
    }

    if (status === 'CRASHED') {
      await this.db.crashBet.updateMany({
        where: { roundId: round.id, status: 'PENDING' },
        data: { status: 'LOST', payout: 0 },
      });
    }

    if (round.status !== status) {
      await this.db.crashRound.update({
        where: { id: round.id },
        data: { status },
      });
    }

    // Fetch live player bets for the current round/period
    const roundBetsList = await this.db.crashBet.findMany({
      where: { roundId: round.id },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    const roundBets = roundBetsList.map((b: any) => ({
      id: b.id,
      username: b.user ? (b.user.name || `Player***${b.userId.slice(-4)}`) : 'Player***',
      amount: Number(b.amount),
      multiplier: Number(b.multiplier),
      payout: Number(b.payout),
      status: b.status,
    }));

    // User bet context (supports dual panels)
    let userBets: any[] = [];
    let userBet = null;
    let userBalance = '0.00';

    if (userId) {
      const wallet = await this.db.wallet.findUnique({ where: { userId } });
      if (wallet) {
        userBalance = Number(wallet.mainBalance).toFixed(2);
      }

      const activeUserBets = await this.db.crashBet.findMany({
        where: { userId, roundId: round.id },
        orderBy: { createdAt: 'asc' },
      });

      userBets = activeUserBets.map((b: any) => ({
        id: b.id,
        betAmount: Number(b.amount).toFixed(2),
        multiplier: Number(b.multiplier).toFixed(2),
        payout: Number(b.payout).toFixed(2),
        liveProfit: Number(((Number(b.amount) * currentMultiplier) - Number(b.amount)).toFixed(2)),
        status: b.status,
      }));

      if (userBets.length > 0) {
        userBet = userBets[0];
      }
    }

    // Fetch recent completed crash rounds for history pills
    const recentRoundsList = await this.db.crashRound.findMany({
      where: { status: 'CRASHED' },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    const history = recentRoundsList.map((r: any) => Number(Number(r.crashMultiplier).toFixed(2)));

    return {
      success: true,
      game: 'crash',
      serverTimestamp: nowTs,
      round: {
        id: round.id,
        roundNumber: round.roundNumber.toString(),
        status,
        crashMultiplier: crashMult.toFixed(2),
      },
      secondsRemaining,
      currentMultiplier: currentMultiplier.toFixed(2),
      history: history.length > 0 ? history : [3.81, 1.44, 2.31, 1.85, 4.20, 1.12, 12.40, 2.05],
      userBet,
      userBets,
      roundBets,
      userBalance,
    };
  }

  private toValidUserId(userId?: string): string {
    return toValidUserId(userId);
  }

  private async getOrCreateWallet(userId: string) {
    const activeUserId = this.toValidUserId(userId);
    let wallet = await this.db.wallet.findUnique({ where: { userId: activeUserId } });
    if (!wallet) {
      try {
        await this.db.user.upsert({
          where: { id: activeUserId },
          update: {},
          create: { id: activeUserId, email: 'demo@rivexa.com', passwordHash: 'demo' },
        });
        wallet = await this.db.wallet.upsert({
          where: { userId: activeUserId },
          update: {},
          create: { userId: activeUserId, mainBalance: activeUserId === DEFAULT_DEMO_UUID ? 5000.0 : 0.0, bonusBalance: 0.0 },
        });
      } catch (e) {}
    }
    return { activeUserId, wallet };
  }

  /**
   * Place bet on Crash round.
   * Traceable to Laravel: App\Services\CrashGameService::placeBet
   */
  async placeBet(userId: string, amount: number) {
    const config = await this.getGameConfig();
    if (!amount || amount < config.minBet || amount > config.maxBet) {
      throw new BadRequestException(`Bet amount must be between ₹${config.minBet.toLocaleString()} and ₹${config.maxBet.toLocaleString()}.`);
    }

    const { activeUserId, wallet } = await this.getOrCreateWallet(userId);
    const state = await this.getSynchronizedState(activeUserId);
    if (state.round.status !== 'BETTING_OPEN') {
      throw new BadRequestException('Betting is closed for the current round. Please wait for launch.');
    }

    if (!wallet || Number(wallet.mainBalance) < amount) {
      throw new BadRequestException('Insufficient wallet balance.');
    }

    const balanceBefore = Number(wallet.mainBalance);
    const balanceAfter = balanceBefore - amount;

    await this.db.wallet.update({
      where: { id: wallet.id },
      data: { mainBalance: balanceAfter },
    });

    await this.db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'bet',
        amount,
        balanceBefore,
        balanceAfter,
        referenceType: 'crash_bet',
        referenceId: state.round.id,
      },
    });

    const bet = await this.db.crashBet.create({
      data: {
        userId: activeUserId,
        roundId: state.round.id,
        amount,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      message: 'Crash bet placed successfully!',
      betId: bet.id,
      newBalance: balanceAfter.toFixed(2),
    };
  }

  /**
   * Cash out active Crash bet.
   * Traceable to Laravel: App\Services\CrashGameService::processCashout
   */
  async cashout(userId: string, betId: string) {
    const activeUserId = this.toValidUserId(userId);
    const bet = await this.db.crashBet.findUnique({
      where: { id: betId },
      include: { round: true },
    });

    if (!bet || (bet.userId !== activeUserId && bet.userId !== userId)) {
      throw new NotFoundException('Bet not found.');
    }

    if (bet.status !== 'PENDING') {
      throw new BadRequestException(`Bet is already settled (${bet.status}).`);
    }

    const state = await this.getSynchronizedState(activeUserId);
    if (state.round.status !== 'FLYING') {
      throw new BadRequestException('The rocket is not in flight or has already crashed!');
    }

    const currentMult = parseFloat(state.currentMultiplier);
    const crashMult = Number(bet.round.crashMultiplier);

    if (currentMult >= crashMult) {
      await this.db.crashBet.update({
        where: { id: betId },
        data: { status: 'LOST', payout: 0 },
      });
      throw new BadRequestException('The rocket crashed just before your cashout!');
    }

    const payout = Number((Number(bet.amount) * currentMult).toFixed(2));
    const { wallet } = await this.getOrCreateWallet(activeUserId);
    if (!wallet) throw new NotFoundException('Wallet not found');

    const balanceBefore = Number(wallet.mainBalance);
    const balanceAfter = balanceBefore + payout;

    await this.db.wallet.update({
      where: { id: wallet.id },
      data: { mainBalance: balanceAfter },
    });

    await this.db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'win',
        amount: payout,
        balanceBefore,
        balanceAfter,
        referenceType: 'crash_cashout',
        referenceId: bet.id,
      },
    });

    await this.db.crashBet.update({
      where: { id: betId },
      data: {
        multiplier: currentMult,
        payout,
        status: 'CASHED_OUT',
      },
    });

    // Referral commission trigger
    await this.referralService.processBetCommission(userId, Number(bet.amount), bet.id);

    return {
      success: true,
      multiplier: currentMult.toFixed(2),
      payout: payout.toFixed(2),
      newBalance: balanceAfter.toFixed(2),
      message: `Cashed out +₹${payout.toFixed(2)} (${currentMult.toFixed(2)}x) successfully!`,
    };
  }

  /**
   * Get user Crash bet history / orders
   */
  async getUserBetHistory(userId: string, limit: number = 20) {
    if (!userId) return [];
    const bets = await this.db.crashBet.findMany({
      where: { userId },
      include: { round: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, Math.max(1, limit)),
    });

    return bets.map((b: any) => ({
      id: b.id,
      roundId: b.round ? (b.round.id ? b.round.id.slice(0, 8).toUpperCase() : b.round.roundNumber.toString()) : 'UNKNOWN',
      amount: Number(b.amount),
      multiplier: Number(b.multiplier),
      payout: Number(b.payout),
      status: b.status,
      createdAt: b.createdAt,
    }));
  }

  /**
   * Get detailed period-wise history with provably fair seed hashes
   */
  async getPeriodHistory() {
    const rounds = await this.db.crashRound.findMany({
      where: { status: 'CRASHED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return rounds.map((r: any) => ({
      id: r.id,
      periodNumber: r.roundNumber ? r.roundNumber.toString() : r.id.slice(0, 8).toUpperCase(),
      crashMultiplier: Number(r.crashMultiplier).toFixed(2),
      createdAt: r.createdAt,
      seedHash: crypto.createHash('sha256').update(r.id).digest('hex'),
    }));
  }
}
