import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { ReferralService } from '../../referral/referral.service.js';
import { GameOverrideService } from '../game-engine/game-override.service.js';

@Injectable()
export class ParityService {
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

  private hashString(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // ─── Period ID Generation (Exact Laravel Formula) ──────────────────────────
  public getCurrentPeriodId(interval: number = 30): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const periodIndex = Math.floor(timestamp / interval);
    const now = new Date(timestamp * 1000);
    const yyyy = now.getFullYear();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${String(periodIndex % 10000).padStart(4, '0')}`;
  }

  private async getGameConfig(gameType: string = 'FAST_PARITY') {
    try {
      const slug = gameType.toUpperCase() === 'PARITY' ? 'parity' : 'fast-parity';
      const dbGame = await this.db.game.findFirst({ where: { slug } });
      if (dbGame) {
        return {
          minBet: Number(dbGame.minBet || 10),
          maxBet: Number(dbGame.maxBet || 100000),
          rtpPercentage: Number(dbGame.rtpPercentage || 90),
        };
      }
    } catch (e) {}
    return { minBet: 10, maxBet: 100000, rtpPercentage: 90 };
  }

  // ─── Ensure period exists (or create result using RTP algorithm & Admin Overrides) ───
  private async ensurePeriodExists(periodId: string, gameType: string = 'FAST_PARITY') {
    let existing = await this.db.parityPeriod.findUnique({ where: { periodId } });

    // Check if admin has set a forced override for this game
    const overrideVal = this.overrideService.getOverride('fast-parity') || this.overrideService.getOverride('parity');

    if (overrideVal !== null && overrideVal !== undefined) {
      let forcedNum = parseInt(overrideVal, 10);
      if (isNaN(forcedNum)) {
        if (overrideVal.toLowerCase() === 'green') forcedNum = 7;
        else if (overrideVal.toLowerCase() === 'red') forcedNum = 2;
        else if (overrideVal.toLowerCase() === 'violet') forcedNum = 0;
        else forcedNum = 5;
      }
      forcedNum = Math.max(0, Math.min(9, forcedNum));

      let forcedColor = 'red';
      if (forcedNum === 0) forcedColor = 'red_violet';
      else if (forcedNum === 5) forcedColor = 'green_violet';
      else if (forcedNum % 2 !== 0) forcedColor = 'green';
      else forcedColor = 'red';

      if (existing) {
        if (existing.resultNumber !== forcedNum) {
          existing = await this.db.parityPeriod.update({
            where: { periodId },
            data: { resultNumber: forcedNum, resultColor: forcedColor },
          });
        }
        return existing;
      } else {
        try {
          return await this.db.parityPeriod.create({
            data: { periodId, gameType, resultNumber: forcedNum, resultColor: forcedColor },
          });
        } catch (e) {
          const fallback = await this.db.parityPeriod.findUnique({ where: { periodId } });
          if (fallback) return fallback;
        }
      }
    }

    if (existing) return existing;

    // Check all PENDING bets for this period to apply RTP calculation
    const pendingBets = await this.db.parityBet.findMany({
      where: { periodId, status: 'PENDING' },
    });

    let winningNumber = 0;
    if (pendingBets.length === 0) {
      winningNumber = Math.abs(this.hashString(periodId)) % 10;
    } else {
      // Calculate house payout for each candidate number 0-9
      const payouts = new Array(10).fill(0);
      const totalStakes = pendingBets.reduce((sum: number, b: any) => sum + Number(b.amount), 0);

      for (const bet of pendingBets) {
        const amt = Number(bet.amount);
        const opt = bet.selectOption.toLowerCase();
        for (let num = 0; num <= 9; num++) {
          payouts[num] += this.calculatePotentialPayout(opt, amt, num);
        }
      }

      // Dynamic RTP % from database game config
      const config = await this.getGameConfig(gameType);
      const maxAllowedPayout = totalStakes * (config.rtpPercentage / 100);
      const eligibleNumbers: number[] = [];
      for (let num = 0; num <= 9; num++) {
        if (payouts[num] <= maxAllowedPayout) {
          eligibleNumbers.push(num);
        }
      }

      if (eligibleNumbers.length > 0) {
        winningNumber = eligibleNumbers[Math.abs(this.hashString(periodId)) % eligibleNumbers.length];
      } else {
        // Pick number with minimum house payout
        let minPayout = Infinity;
        let minNum = 0;
        for (let num = 0; num <= 9; num++) {
          if (payouts[num] < minPayout) {
            minPayout = payouts[num];
            minNum = num;
          }
        }
        winningNumber = minNum;
      }
    }

    let resultColor = 'red';
    if (winningNumber === 0)       resultColor = 'red_violet';
    else if (winningNumber === 5)  resultColor = 'green_violet';
    else if (winningNumber % 2 !== 0) resultColor = 'green';
    else                          resultColor = 'red';

    try {
      return await this.db.parityPeriod.create({
        data: { periodId, gameType, resultNumber: winningNumber, resultColor },
      });
    } catch (e) {
      const fallback = await this.db.parityPeriod.findUnique({ where: { periodId } });
      if (fallback) return fallback;
      throw e;
    }
  }

  private calculatePotentialPayout(opt: string, amount: number, winningNumber: number): number {
    const isViolet = winningNumber === 0 || winningNumber === 5;
    const isGreen  = winningNumber % 2 !== 0;
    const isRed    = winningNumber % 2 === 0;

    if (!isNaN(Number(opt))) {
      return Number(opt) === winningNumber ? amount * 9.0 : 0;
    }
    if (opt === 'green') {
      if (winningNumber === 5) return amount * 1.5;
      if (isGreen) return amount * 2.0;
    }
    if (opt === 'red') {
      if (winningNumber === 0) return amount * 1.5;
      if (isRed) return amount * 2.0;
    }
    if (opt === 'violet') {
      if (isViolet) return amount * 4.5;
    }
    if (opt === 'big') {
      if (winningNumber >= 5 && winningNumber <= 9) return amount * 2.0;
    }
    if (opt === 'small') {
      if (winningNumber >= 0 && winningNumber <= 4) return amount * 2.0;
    }
    return 0;
  }

  // ─── GET /period ─────────────────────────────────────────────────────────────
  async getPeriodInfo(interval: number = 30) {
    const periodId = this.getCurrentPeriodId(interval);
    const timestamp = Math.floor(Date.now() / 1000);
    const secondsRemaining = interval - (timestamp % interval);
    return { periodId, secondsRemaining, totalDuration: interval };
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

  // ─── Synchronized Live Game State Endpoint (Laravel GameController @ getGameState) ───
  async getGameState(userId: string, interval: number = 30) {
    const timestamp = Math.floor(Date.now() / 1000);
    const secondsRemaining = interval - (timestamp % interval);
    const currentPeriodIndex = Math.floor(timestamp / interval);

    const now = new Date(timestamp * 1000);
    const yyyy = now.getFullYear();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    const currentPeriod = `${dateStr}${String(currentPeriodIndex % 10000).padStart(4, '0')}`;

    // 1. Auto-settle all past pending bets in database
    const pendingBets = await this.db.parityBet.findMany({
      where: { status: 'PENDING' },
      select: { periodId: true },
    });
    const pendingPeriodIds: string[] = Array.from(new Set(pendingBets.map((b: { periodId: string }) => b.periodId)));

    for (const pNum of pendingPeriodIds) {
      if (pNum !== currentPeriod) {
        await this.settlePeriod(pNum);
      }
    }

    // Auto-fix any historical BIG / SMALL bets that were incorrectly marked LOST
    await this.autoFixWronglyLostBigSmallBets();

    // 2. Ensure past continuous periods exist & are settled (NO GAPS, ALWAYS POPULATED HISTORY)
    const existingCount = await this.db.parityPeriod.count();
    const backfillNeeded = existingCount < 100 ? 100 : 10;
    for (let i = backfillNeeded; i >= 1; i--) {
      const pIdxToSettle = (currentPeriodIndex - i + 10000) % 10000;
      const pIdToSettle = `${dateStr}${String(pIdxToSettle).padStart(4, '0')}`;
      if (pIdToSettle !== currentPeriod) {
        await this.settlePeriod(pIdToSettle);
      }
    }

    // Wallet balance
    const { activeUserId, wallet } = await this.getOrCreateWallet(userId);
    const userBalance = wallet ? Number(wallet.mainBalance) : 0;

    // Last period result (MUST be currentPeriod - 1 or latest settled before currentPeriod)
    const lastResultRecord = await this.db.parityPeriod.findFirst({
      where: { periodId: { not: currentPeriod } },
      orderBy: { createdAt: 'desc' },
    });

    let lastResult = null;
    if (lastResultRecord) {
      let colors: string[] = [lastResultRecord.resultColor];
      if (lastResultRecord.resultColor === 'green_violet') colors = ['green', 'violet'];
      if (lastResultRecord.resultColor === 'red_violet') colors = ['red', 'violet'];
      lastResult = {
        period_number: lastResultRecord.periodId,
        number: lastResultRecord.resultNumber,
        colors,
      };
    }

    // Period History (last 20 settled — for live game state widget only)
    const historyRecords = await this.db.parityPeriod.findMany({
      where: { periodId: { not: currentPeriod } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const history = historyRecords.map((p: { periodId: string; resultNumber: number; resultColor: string; createdAt: Date }) => {
      let colors: string[] = [p.resultColor];
      if (p.resultColor === 'green_violet') colors = ['green', 'violet'];
      if (p.resultColor === 'red_violet') colors = ['red', 'violet'];
      return {
        period_number: p.periodId,
        number: p.resultNumber,
        colors,
        created_at: (p as any).createdAt ? (p as any).createdAt.toISOString() : null,
      };
    });

    // My Bets
    let myBets: Array<{
      period_number: string;
      bet_type: string;
      bet_amount: string;
      win_amount: string;
      status: string;
    }> = [];
    let userLatestSettledBet: any = null;

    if (activeUserId) {
      const betRecords = await this.db.parityBet.findMany({
        where: { userId: activeUserId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      myBets = betRecords.map((b: { periodId: string; selectOption: string; amount: unknown; payout: unknown; status: string }) => ({
        period_number: b.periodId,
        bet_type: b.selectOption.toUpperCase(),
        bet_amount: Number(b.amount).toFixed(2),
        win_amount: Number(b.payout).toFixed(2),
        status: b.status.toLowerCase(),
      }));

      // Find user's latest settled period number and consolidated popup details
      const latestSettledRecord = betRecords.find(
        (b: { status: string }) => b.status === 'WON' || b.status === 'LOST'
      );
      if (latestSettledRecord) {
        const userLatestPeriodId = latestSettledRecord.periodId;
        const periodBets = betRecords.filter(
          (b: { periodId: string; status: string }) =>
            b.periodId === userLatestPeriodId && (b.status === 'WON' || b.status === 'LOST')
        );

        if (periodBets.length > 0) {
          const winningBets = periodBets.filter((b: { status: string }) => b.status === 'WON');
          const hasWin = winningBets.length > 0;
          const primaryBet = hasWin ? winningBets[0] : periodBets[0];

          const totalBetAmount = periodBets.reduce((sum: number, b: { amount: unknown }) => sum + Number(b.amount), 0);
          const totalWinAmount = periodBets.reduce((sum: number, b: { payout: unknown }) => sum + Number(b.payout), 0);
          const betTypes = (hasWin ? winningBets : periodBets)
            .map((b: { selectOption: string }) => b.selectOption.toUpperCase())
            .join(', ');

          const periodRes = await this.db.parityPeriod.findUnique({
            where: { periodId: userLatestPeriodId },
          });

          let winColors: string[] = periodRes ? [periodRes.resultColor] : ['green'];
          if (periodRes && periodRes.resultColor === 'green_violet') winColors = ['green', 'violet'];
          if (periodRes && periodRes.resultColor === 'red_violet') winColors = ['red', 'violet'];

          userLatestSettledBet = {
            id: `PER_${userLatestPeriodId}`,
            period_number: userLatestPeriodId,
            bet_type: betTypes,
            bet_amount: totalBetAmount.toFixed(2),
            win_amount: totalWinAmount.toFixed(2),
            status: hasWin ? 'won' : 'lost',
            winning_number: periodRes ? periodRes.resultNumber : 0,
            winning_colors: winColors,
            settled_at_unix: primaryBet.createdAt ? Math.floor(new Date(primaryBet.createdAt).getTime() / 1000) : Math.floor(Date.now() / 1000),
          };
        }
      }
    }

    return {
      success: true,
      current_period: currentPeriod,
      seconds_remaining: secondsRemaining,
      user_balance: userBalance,
      last_result: lastResult,
      history,
      my_bets: myBets,
      user_latest_settled_bet: userLatestSettledBet,
    };
  }

  // ─── GET /history (paginated, infinite scroll ready) ────────────────────────
  async getHistoryPaginated(page: number = 1, limit: number = 10, interval: number = 30) {
    const currentPeriod = this.getCurrentPeriodId(interval);
    const skip = (page - 1) * limit;

    const [periods, total] = await Promise.all([
      this.db.parityPeriod.findMany({
        where: { periodId: { not: currentPeriod } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.parityPeriod.count({
        where: { periodId: { not: currentPeriod } },
      }),
    ]);

    const data = periods.map((p: {
      id: string; periodId: string; gameType: string;
      resultNumber: number; resultColor: string; createdAt: Date;
    }) => {
      let colors: string[] = [p.resultColor];
      if (p.resultColor === 'green_violet') colors = ['green', 'violet'];
      if (p.resultColor === 'red_violet')   colors = ['red',   'violet'];
      return {
        period_number: p.periodId,
        number: p.resultNumber,
        colors,
        created_at: p.createdAt ? p.createdAt.toISOString() : null,
      };
    });

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1,
      },
    };
  }

  // ─── GET /my-bets (paginated) ─────────────────────────────────────────────────
  async getMyBets(userId: string, page: number = 1, limit: number = 10) {
    const activeUserId = this.toValidUserId(userId);
    const skip = (page - 1) * limit;

    const [bets, total] = await Promise.all([
      this.db.parityBet.findMany({
        where: { userId: activeUserId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.parityBet.count({ where: { userId: activeUserId } }),
    ]);

    const data = bets.map((b: {
      id: string; periodId: string; selectOption: string;
      amount: unknown; payout: unknown; status: string; createdAt: Date;
    }) => ({
      id: b.id,
      period_number: b.periodId,
      bet_type: b.selectOption.toUpperCase(),
      bet_amount: Number(b.amount).toFixed(2),
      win_amount: Number(b.payout).toFixed(2),
      status: b.status.toLowerCase() as 'pending' | 'won' | 'lost',
      created_at: b.createdAt ? b.createdAt.toISOString() : null,
    }));

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1,
      },
    };
  }

  // ─── POST /bet ────────────────────────────────────────────────────────────────
  async placeBet(userId: string, selectOption: string, amount: number, interval: number = 30) {
    const gameType = interval === 30 ? 'FAST_PARITY' : 'PARITY';
    const config = await this.getGameConfig(gameType);
    if (!amount || amount < config.minBet || amount > config.maxBet) {
      throw new BadRequestException(`Bet amount must be between ₹${config.minBet} and ₹${config.maxBet.toLocaleString('en-IN')}.`);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const secondsRemaining = interval - (timestamp % interval);
    if (secondsRemaining <= 5) {
      throw new BadRequestException('Betting is locked for the current period. Please wait for the next period.');
    }

    const validOptions = [
      'green', 'red', 'violet',
      'big', 'small',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    ];
    if (!validOptions.includes(selectOption.toLowerCase())) {
      throw new BadRequestException('Invalid bet option selected.');
    }

    const periodId = this.getCurrentPeriodId(interval);
    const { activeUserId, wallet } = await this.getOrCreateWallet(userId);
    if (!wallet || Number(wallet.mainBalance) < amount) {
      throw new BadRequestException('Insufficient wallet balance.');
    }

    // Pre-generate / ensure period exists
    await this.ensurePeriodExists(periodId);

    // Deduct bet amount from wallet immediately
    const balanceBefore = Number(wallet.mainBalance);
    const balanceAfter  = balanceBefore - amount;

    await this.db.wallet.update({
      where: { id: wallet.id },
      data:  { mainBalance: balanceAfter },
    });

    await this.db.walletTransaction.create({
      data: {
        walletId:      wallet.id,
        type:          'bet',
        amount,
        balanceBefore,
        balanceAfter,
        referenceType: 'parity_bet',
        referenceId:   periodId,
      },
    });

    // Create bet as PENDING
    const opt = selectOption.toLowerCase();
    const bet = await this.db.parityBet.create({
      data: {
        userId: activeUserId,
        periodId,
        selectOption: opt,
        amount,
        payout: 0,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      betId:        bet.id,
      periodId,
      selectOption: opt,
      amount,
      new_balance:  balanceAfter,
      status:       'PENDING',
      message:      'Bet placed! Result will be revealed when period ends.',
    };
  }

  // ─── Auto-Fix Past BIG / SMALL Bets incorrectly marked as LOST ────────────────
  private async autoFixWronglyLostBigSmallBets() {
    try {
      const lostBets = await this.db.parityBet.findMany({
        where: {
          selectOption: { in: ['big', 'small'] },
          status: 'LOST',
        },
      });

      for (const bet of lostBets) {
        const period = await this.db.parityPeriod.findUnique({
          where: { periodId: bet.periodId },
        });

        if (!period) continue;

        const opt = bet.selectOption.toLowerCase();
        const num = period.resultNumber;
        let shouldWin = false;

        if (opt === 'big' && num >= 5 && num <= 9) {
          shouldWin = true;
        } else if (opt === 'small' && num >= 0 && num <= 4) {
          shouldWin = true;
        }

        if (shouldWin) {
          const payout = Number(bet.amount) * 2.0;
          await this.db.parityBet.update({
            where: { id: bet.id },
            data: { status: 'WON', payout },
          });

          const wallet = await this.db.wallet.findUnique({ where: { userId: bet.userId } });
          if (wallet) {
            const winBalanceBefore = Number(wallet.mainBalance);
            const winBalanceAfter  = winBalanceBefore + payout;

            await this.db.wallet.update({
              where: { id: wallet.id },
              data: { mainBalance: winBalanceAfter },
            });

            await this.db.walletTransaction.create({
              data: {
                walletId:      wallet.id,
                type:          'win',
                amount:        payout,
                balanceBefore: winBalanceBefore,
                balanceAfter:  winBalanceAfter,
                referenceType: 'parity_win_autofix',
                referenceId:   bet.id,
              },
            });
          }
        }
      }
    } catch (e) {}
  }

  // ─── POST /settle ─────────────────────────────────────────────────────────────
  async settlePeriod(periodId: string) {
    let period = await this.db.parityPeriod.findUnique({ where: { periodId } });
    if (!period) {
      period = await this.ensurePeriodExists(periodId);
    }

    const pendingBets = await this.db.parityBet.findMany({
      where: { periodId, status: 'PENDING' },
    });

    if (pendingBets.length === 0) {
      return { settled: 0, periodId, result: { resultNumber: period.resultNumber, resultColor: period.resultColor } };
    }

    let settled = 0;
    for (const bet of pendingBets) {
      const opt = bet.selectOption.toLowerCase();
      const num = period.resultNumber;
      let isWin = false;
      let multiplier = 0;

      if (opt === 'green') {
        if (num % 2 !== 0) { isWin = true; multiplier = num === 5 ? 1.5 : 2.0; }
      } else if (opt === 'red') {
        if (num % 2 === 0) { isWin = true; multiplier = num === 0 ? 1.5 : 2.0; }
      } else if (opt === 'violet') {
        if (num === 0 || num === 5) { isWin = true; multiplier = 4.5; }
      } else if (opt === 'big') {
        if (num >= 5 && num <= 9) { isWin = true; multiplier = 2.0; }
      } else if (opt === 'small') {
        if (num >= 0 && num <= 4) { isWin = true; multiplier = 2.0; }
      } else if (opt === String(num)) {
        isWin = true; multiplier = 9.0;
      }

      const payout = isWin ? Number(bet.amount) * multiplier : 0;
      const status = isWin ? 'WON' : 'LOST';

      await this.db.parityBet.update({
        where: { id: bet.id },
        data:  { payout, status },
      });

      if (isWin) {
        const wallet = await this.db.wallet.findUnique({ where: { userId: bet.userId } });
        if (wallet) {
          const winBalanceBefore = Number(wallet.mainBalance);
          const winBalanceAfter  = winBalanceBefore + payout;

          await this.db.wallet.update({
            where: { id: wallet.id },
            data:  { mainBalance: winBalanceAfter },
          });

          await this.db.walletTransaction.create({
            data: {
              walletId:      wallet.id,
              type:          'win',
              amount:        payout,
              balanceBefore: winBalanceBefore,
              balanceAfter:  winBalanceAfter,
              referenceType: 'parity_win',
              referenceId:   bet.id,
            },
          });
        }
      }

      // Trigger 3-tier referral commission for this bet
      await this.referralService.processBetCommission(bet.userId, Number(bet.amount));

      settled++;
    }

    return {
      settled,
      periodId,
      result: {
        resultNumber: period.resultNumber,
        resultColor:  period.resultColor,
      },
    };
  }
}
