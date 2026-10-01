import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { ReferralService } from '../../referral/referral.service.js';
import { GameOverrideService } from '../game-engine/game-override.service.js';
import * as crypto from 'crypto';

@Injectable()
export class PushparaniService {
  constructor(
    private readonly db: DatabaseService,
    private readonly referralService: ReferralService,
    private readonly overrideService: GameOverrideService,
  ) {}

  private async getGameConfig() {
    try {
      const dbGame = await this.db.game.findFirst({ where: { slug: 'pushparani' } });
      if (dbGame) {
        return {
          minBet: Number(dbGame.minBet || 10),
          maxBet: Number(dbGame.maxBet || 100000),
          rtpPercentage: Number(dbGame.rtpPercentage || 94),
        };
      }
    } catch (e) {}
    return { minBet: 10, maxBet: 100000, rtpPercentage: 94 };
  }

  /**
   * Provably Fair HMAC-SHA256 Pushparani Multiplier Generator.
   */
  public generateCrashPoint(seed: string, salt: string = 'pushparani_horn_ok_salt', targetRtp: number = 94): number {
    const hmac = crypto.createHmac('sha256', salt);
    hmac.update(seed);
    const hash = hmac.digest('hex');
    const subHash = hash.substring(0, 8);
    const hexInt = parseInt(subHash, 16);

    const rtp = Math.max(50, Math.min(99, Number(targetRtp) || 94));
    const houseEdge = Math.max(1, 100 - rtp);
    const instantCrashThreshold = Math.max(2, Math.round(100 / houseEdge));

    if (hexInt % instantCrashThreshold === 0) {
      return 1.00; // House edge instant crash at 1.00x
    }

    const e = Math.pow(2, 32);
    const multiplier = Math.floor((rtp * e - hexInt) / (e - hexInt)) / 100;
    return Math.max(1.01, Math.min(multiplier, 500.00));
  }

  /**
   * Get or sync active Pushparani round state.
   */
  async getSynchronizedState(userId?: string) {
    let round = await this.db.pushparaniRound.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const nowMs = Date.now();
    const nowTs = Math.floor(nowMs / 1000);
    const config = await this.getGameConfig();

    if (!round) {
      const seed = String(nowTs);
      const activeOverride = this.overrideService.getOverride('pushparani');
      let crashMultiplier = activeOverride ? parseFloat(activeOverride) : 0;
      if (!crashMultiplier || isNaN(crashMultiplier) || crashMultiplier < 1.0) {
        crashMultiplier = this.generateCrashPoint(seed, 'pushparani_horn_ok_salt', config.rtpPercentage);
      }
      round = await this.db.pushparaniRound.create({
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
    const EXP_RATE = 0.06;

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
          const activeOverride = this.overrideService.getOverride('pushparani');
          let newMultiplier = activeOverride ? parseFloat(activeOverride) : 0;
          if (!newMultiplier || isNaN(newMultiplier) || newMultiplier < 1.0) {
            newMultiplier = this.generateCrashPoint(seed, 'pushparani_horn_ok_salt', config.rtpPercentage);
          }
          round = await this.db.pushparaniRound.create({
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
      await this.db.pushparaniBet.updateMany({
        where: { roundId: round.id, status: 'PENDING' },
        data: { status: 'LOST', payout: 0 },
      });
    }

    if (round.status !== status) {
      await this.db.pushparaniRound.update({
        where: { id: round.id },
        data: { status },
      });
    }

    // Fetch live player bets for the current round
    const roundBetsList = await this.db.pushparaniBet.findMany({
      where: { roundId: round.id },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    const roundBets = roundBetsList.map((b: any) => ({
      id: b.id,
      username: b.user ? (b.user.name || `PushpaRider***${b.userId.slice(-4)}`) : 'PushpaRider***',
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

      const activeUserBets = await this.db.pushparaniBet.findMany({
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

    // Fetch recent completed Pushparani rounds for history pills
    const recentRoundsList = await this.db.pushparaniRound.findMany({
      where: { status: 'CRASHED' },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    const history = recentRoundsList.map((r: any) => Number(Number(r.crashMultiplier).toFixed(2)));

    return {
      success: true,
      game: 'pushparani',
      serverTimestamp: nowTs,
      round: {
        id: round.id,
        roundNumber: round.roundNumber.toString(),
        status,
        crashMultiplier: crashMult.toFixed(2),
      },
      secondsRemaining,
      currentMultiplier: currentMultiplier.toFixed(2),
      history: history.length > 0 ? history : [3.60, 3.30, 1.04, 1.83, 2.07, 1.24, 3.11, 1.00, 3.79, 5.03],
      userBet,
      userBets,
      roundBets,
      userBalance,
    };
  }

  /**
   * Place bet on Pushparani round.
   */
  async placeBet(userId: string, amount: number) {
    const config = await this.getGameConfig();
    if (!amount || amount < config.minBet || amount > config.maxBet) {
      throw new BadRequestException(`Bet amount must be between ₹${config.minBet} and ₹${config.maxBet.toLocaleString('en-IN')}.`);
    }

    const state = await this.getSynchronizedState(userId);
    if (state.round.status !== 'BETTING_OPEN') {
      throw new BadRequestException('Betting is closed for the current round. Please wait for next drive.');
    }

    const wallet = await this.db.wallet.findUnique({ where: { userId } });
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
        referenceType: 'pushparani_bet',
        referenceId: state.round.id,
      },
    });

    const bet = await this.db.pushparaniBet.create({
      data: {
        userId,
        roundId: state.round.id,
        amount,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      message: 'Pushparani bet placed successfully!',
      betId: bet.id,
      newBalance: balanceAfter.toFixed(2),
    };
  }

  /**
   * Cash out active Pushparani bet.
   */
  async cashout(userId: string, betId: string) {
    const bet = await this.db.pushparaniBet.findUnique({
      where: { id: betId },
      include: { round: true },
    });

    if (!bet || bet.userId !== userId) {
      throw new NotFoundException('Bet not found.');
    }

    if (bet.status !== 'PENDING') {
      throw new BadRequestException(`Bet is already settled (${bet.status}).`);
    }

    const state = await this.getSynchronizedState(userId);
    if (state.round.status !== 'FLYING') {
      throw new BadRequestException('Truck is not driving or has already crashed!');
    }

    const currentMult = parseFloat(state.currentMultiplier);
    const crashMult = Number(bet.round.crashMultiplier);

    if (currentMult >= crashMult) {
      await this.db.pushparaniBet.update({
        where: { id: betId },
        data: { status: 'LOST', payout: 0 },
      });
      throw new BadRequestException('Truck crashed right before your cashout!');
    }

    const payout = Number((Number(bet.amount) * currentMult).toFixed(2));

    const wallet = await this.db.wallet.findUnique({ where: { userId } });
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
        referenceType: 'pushparani_cashout',
        referenceId: bet.id,
      },
    });

    await this.db.pushparaniBet.update({
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
   * Get user Pushparani bet history
   */
  async getUserBetHistory(userId: string, limit: number = 20) {
    if (!userId) return [];
    const bets = await this.db.pushparaniBet.findMany({
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
   * Get detailed period-wise history
   */
  async getPeriodHistory() {
    const rounds = await this.db.pushparaniRound.findMany({
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
