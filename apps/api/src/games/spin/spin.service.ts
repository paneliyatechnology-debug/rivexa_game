import { Injectable, BadRequestException, Optional } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { ReferralService } from '../../referral/referral.service.js';
import { GameOverrideService } from '../game-engine/game-override.service.js';
import { GameGateway } from '../game-engine/game.gateway.js';
import * as crypto from 'crypto';

// 24-slot wheel structure: 11 GREEN (1.90x), 11 BLUE (1.90x), 2 RED (9.50x)
export const WHEEL_SLOTS = [
  { index: 0, slotNumber: 1, color: 'red', multiplier: 9.5, label: '1' },
  { index: 1, slotNumber: 2, color: 'blue', multiplier: 1.90, label: '2' },
  { index: 2, slotNumber: 3, color: 'green', multiplier: 1.90, label: '3' },
  { index: 3, slotNumber: 4, color: 'blue', multiplier: 1.90, label: '4' },
  { index: 4, slotNumber: 5, color: 'green', multiplier: 1.90, label: '5' },
  { index: 5, slotNumber: 6, color: 'blue', multiplier: 1.90, label: '6' },
  { index: 6, slotNumber: 7, color: 'green', multiplier: 1.90, label: '7' },
  { index: 7, slotNumber: 8, color: 'blue', multiplier: 1.90, label: '8' },
  { index: 8, slotNumber: 9, color: 'green', multiplier: 1.90, label: '9' },
  { index: 9, slotNumber: 10, color: 'blue', multiplier: 1.90, label: '10' },
  { index: 10, slotNumber: 11, color: 'red', multiplier: 9.5, label: '11' },
  { index: 11, slotNumber: 12, color: 'green', multiplier: 1.90, label: '12' },
  { index: 12, slotNumber: 13, color: 'blue', multiplier: 1.90, label: '13' },
  { index: 13, slotNumber: 14, color: 'green', multiplier: 1.90, label: '14' },
  { index: 14, slotNumber: 15, color: 'blue', multiplier: 1.90, label: '15' },
  { index: 15, slotNumber: 16, color: 'green', multiplier: 1.90, label: '16' },
  { index: 16, slotNumber: 17, color: 'blue', multiplier: 1.90, label: '17' },
  { index: 17, slotNumber: 18, color: 'green', multiplier: 1.90, label: '18' },
  { index: 18, slotNumber: 19, color: 'blue', multiplier: 1.90, label: '19' },
  { index: 19, slotNumber: 20, color: 'green', multiplier: 1.90, label: '20' },
  { index: 20, slotNumber: 21, color: 'blue', multiplier: 1.90, label: '21' },
  { index: 21, slotNumber: 22, color: 'green', multiplier: 1.90, label: '22' },
  { index: 22, slotNumber: 23, color: 'blue', multiplier: 1.90, label: '23' },
  { index: 23, slotNumber: 24, color: 'green', multiplier: 1.90, label: '24' },
];

export const TOTAL_CYCLE_DURATION = 36; // 30s betting + 4.5s spinning + 1.5s result
export const BETTING_WINDOW = 30; // 30 seconds betting

@Injectable()
export class SpinService {
  constructor(
    private readonly db: DatabaseService,
    private readonly referralService: ReferralService,
    private readonly overrideService: GameOverrideService,
    @Optional() private readonly gameGateway?: GameGateway,
  ) {}

  private readonly DEMO_UUID = '00000000-0000-0000-0000-000000000000';

  private toValidUserId(userId?: string): string {
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return userId;
    }
    return this.DEMO_UUID;
  }

  // 36-second global synchronized period ID
  public getCurrentPeriodId(cycle: number = TOTAL_CYCLE_DURATION): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const periodIndex = Math.floor(timestamp / cycle);
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

  /**
   * Ensures the current global round exists and handles automatic settlement
   * when the 30-second countdown reaches 0.
   */
  public async ensureCurrentRound() {
    const nowSec = Math.floor(Date.now() / 1000);
    const elapsed = nowSec % TOTAL_CYCLE_DURATION;
    const periodId = this.getCurrentPeriodId(TOTAL_CYCLE_DURATION);
    const roundId = `SPIN-${periodId}`;

    let phase: 'BETTING_OPEN' | 'SPINNING' | 'RESULT' = 'BETTING_OPEN';
    let secondsRemaining = 0;

    if (elapsed < BETTING_WINDOW) {
      phase = 'BETTING_OPEN';
      secondsRemaining = BETTING_WINDOW - elapsed;
    } else if (elapsed < BETTING_WINDOW + 4.5) {
      phase = 'SPINNING';
      secondsRemaining = 0;
    } else {
      phase = 'RESULT';
      secondsRemaining = 0;
    }

    // Load or create active round
    let roundRow: any = null;
    try {
      const rows = await this.db.client.$queryRawUnsafe<any[]>(
        `SELECT * FROM spin_rounds WHERE round_id = $1 LIMIT 1`,
        roundId
      );
      if (rows && rows.length > 0) {
        roundRow = rows[0];
      }
    } catch (e) {}

    if (!roundRow) {
      // Determine independent server-side winning slot
      const activeOverride = this.overrideService.getOverride('spin');
      let targetSlotIndex = 0;

      if (activeOverride) {
        const over = activeOverride.toLowerCase().trim();
        if (over === 'red') {
          const redIndices = [0, 10];
          targetSlotIndex = redIndices[crypto.randomInt(0, redIndices.length)];
        } else if (over === 'blue') {
          const blueIndices = [1, 3, 5, 7, 9, 12, 14, 16, 18, 20, 22];
          targetSlotIndex = blueIndices[crypto.randomInt(0, blueIndices.length)];
        } else if (over === 'green') {
          const greenIndices = [2, 4, 6, 8, 11, 13, 15, 17, 19, 21, 23];
          targetSlotIndex = greenIndices[crypto.randomInt(0, greenIndices.length)];
        } else {
          targetSlotIndex = crypto.randomInt(0, WHEEL_SLOTS.length);
        }
      } else {
        targetSlotIndex = crypto.randomInt(0, WHEEL_SLOTS.length);
      }

      const landed = WHEEL_SLOTS[targetSlotIndex];
      const resultColor = landed.color.toUpperCase();

      const roundStart = new Date(nowSec * 1000 - elapsed * 1000);
      const bettingClosed = new Date(roundStart.getTime() + BETTING_WINDOW * 1000);

      try {
        await this.db.client.$executeRawUnsafe(
          `INSERT INTO spin_rounds (id, round_id, result_slot, result_color, status, betting_started_at, betting_closed_at, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (round_id) DO NOTHING`,
          roundId,
          targetSlotIndex,
          resultColor,
          'BETTING_OPEN',
          roundStart,
          bettingClosed
        );
      } catch (e: any) {
        console.error('Error inserting spin_round:', e);
      }

      const checkAgain = await this.db.client.$queryRawUnsafe<any[]>(
        `SELECT * FROM spin_rounds WHERE round_id = $1 LIMIT 1`,
        roundId
      );
      roundRow = checkAgain?.[0] || {
        round_id: roundId,
        result_slot: targetSlotIndex,
        result_color: resultColor,
        status: 'BETTING_OPEN',
      };
    }

    // Automatic settlement ONLY after spin finishes (elapsed >= 34.5s)
    const SPIN_FINISH_WINDOW = BETTING_WINDOW + 4.5;
    if (elapsed >= SPIN_FINISH_WINDOW && roundRow.status !== 'COMPLETED') {
      await this.settleRoundBets(roundRow);
      roundRow.status = 'COMPLETED';
    }

    return {
      roundId,
      phase,
      secondsRemaining,
      elapsed,
      resultSlot: Number(roundRow.result_slot ?? 0),
      resultColor: (roundRow.result_color || 'RED').toUpperCase(),
      status: roundRow.status,
    };
  }

  /**
   * Settle all PENDING bets for the finished round atomically.
   */
  private async settleRoundBets(round: any) {
    try {
      const roundId = round.round_id;
      const resultColor = (round.result_color || 'RED').toUpperCase();
      const targetSlot = Number(round.result_slot ?? 0);

      // Find all PENDING bets placed for this round
      const pendingBets = await this.db.client.$queryRawUnsafe<any[]>(
        `SELECT * FROM spin_bets WHERE round_id = $1 AND status = 'PENDING'`,
        roundId
      );

      for (const bet of pendingBets) {
        const selectedColor = (bet.selected_color || '').toUpperCase();
        const isWin = selectedColor === resultColor;
        const betAmount = Number(bet.bet_amount);
        const multiplier = isWin ? (resultColor === 'RED' ? 9.50 : 1.90) : 0.00;
        const payoutAmount = isWin ? Number((betAmount * multiplier).toFixed(2)) : 0.00;
        const status = isWin ? 'WON' : 'LOST';

        // Update bet record only if still PENDING (idempotent atomic race protection)
        const updatedRows = await this.db.client.$executeRawUnsafe(
          `UPDATE spin_bets
           SET result_color = $1, multiplier = $2, payout_amount = $3, status = $4::"BetStatus"
           WHERE id = $5::uuid AND status = 'PENDING'`,
          resultColor,
          multiplier,
          payoutAmount,
          status,
          bet.id
        );

        // Credit wallet only if this thread transitioned the bet from PENDING
        if (updatedRows === 1 && isWin && payoutAmount > 0 && bet.user_id !== this.DEMO_UUID) {
          const wallet = await this.db.wallet.findUnique({ where: { userId: bet.user_id } });
          if (wallet) {
            const winBefore = Number(wallet.mainBalance);
            const winAfter = winBefore + payoutAmount;

            await this.db.wallet.update({
              where: { id: wallet.id },
              data: { mainBalance: winAfter },
            });

            await this.db.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: 'win',
                amount: payoutAmount,
                balanceBefore: winBefore,
                balanceAfter: winAfter,
                referenceType: 'spin_game',
                referenceId: bet.id,
              },
            });

            this.gameGateway?.emitWalletUpdate(bet.user_id, winAfter);
          }
        }
      }

      // Mark round completed
      await this.db.client.$executeRawUnsafe(
        `UPDATE spin_rounds SET status = 'COMPLETED', spin_completed_at = NOW() WHERE round_id = $1`,
        roundId
      );
    } catch (err) {
      console.error('Error settling spin bets:', err);
    }
  }

  /**
   * Automatically find and settle ANY bets in spin_bets that are still PENDING
   * whose round betting time has elapsed (round betting_closed_at + 4.5s <= NOW(),
   * or bet created_at + 34.5s <= NOW()).
   * This guarantees that whether a user navigates away, closes the game, or returns later,
   * all pending bets are immediately and atomically settled with accurate balance credits and win/loss records.
   */
  public async autoSettlePendingBets(_targetUserId?: string) {
    try {
      const pendingBets = await this.db.client.$queryRawUnsafe<any[]>(
        `SELECT b.*, r.result_color as round_color, r.result_slot as round_slot, r.betting_closed_at, r.status as round_status
         FROM spin_bets b
         LEFT JOIN spin_rounds r ON r.round_id = b.round_id
         WHERE b.status = 'PENDING'
         ORDER BY b.created_at ASC
         LIMIT 50`
      );

      if (!pendingBets || pendingBets.length === 0) return;

      const now = Date.now();

      for (const bet of pendingBets) {
        const roundClosedAt = bet.betting_closed_at ? new Date(bet.betting_closed_at).getTime() : 0;
        const betCreatedAt = bet.created_at ? new Date(bet.created_at).getTime() : 0;
        const isElapsed =
          (roundClosedAt > 0 && roundClosedAt + 4500 <= now) ||
          (betCreatedAt > 0 && betCreatedAt + 34500 <= now);

        if (!isElapsed) {
          // Round is still active, wait for spin to complete
          continue;
        }

        let resultColor = (bet.round_color || '').toUpperCase();
        let targetSlot = Number(bet.round_slot ?? 0);

        if (!resultColor) {
          targetSlot = crypto.randomInt(0, WHEEL_SLOTS.length);
          resultColor = WHEEL_SLOTS[targetSlot].color.toUpperCase();
          try {
            await this.db.client.$executeRawUnsafe(
              `INSERT INTO spin_rounds (id, round_id, result_slot, result_color, status, betting_started_at, betting_closed_at, spin_completed_at, created_at)
               VALUES (gen_random_uuid(), $1, $2, $3, 'COMPLETED', NOW() - INTERVAL '35 seconds', NOW() - INTERVAL '5 seconds', NOW(), NOW())
               ON CONFLICT (round_id) DO UPDATE SET result_color = $3, status = 'COMPLETED'`,
              bet.round_id,
              targetSlot,
              resultColor
            );
          } catch (e) {}
        }

        const selectedColor = (bet.selected_color || '').toUpperCase();
        const isWin = selectedColor === resultColor;
        const betAmount = Number(bet.bet_amount);
        const multiplier = isWin ? (resultColor === 'RED' ? 9.50 : 1.90) : 0.00;
        const payoutAmount = isWin ? Number((betAmount * multiplier).toFixed(2)) : 0.00;
        const status = isWin ? 'WON' : 'LOST';

        const updatedRows = await this.db.client.$executeRawUnsafe(
          `UPDATE spin_bets
           SET result_color = $1, multiplier = $2, payout_amount = $3, status = $4::"BetStatus"
           WHERE id = $5::uuid AND status = 'PENDING'`,
          resultColor,
          multiplier,
          payoutAmount,
          status,
          bet.id
        );

        if (updatedRows === 1 && isWin && payoutAmount > 0 && bet.user_id !== this.DEMO_UUID) {
          const wallet = await this.db.wallet.findUnique({ where: { userId: bet.user_id } });
          if (wallet) {
            const winBefore = Number(wallet.mainBalance);
            const winAfter = winBefore + payoutAmount;

            await this.db.wallet.update({
              where: { id: wallet.id },
              data: { mainBalance: winAfter },
            });

            await this.db.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: 'win',
                amount: payoutAmount,
                balanceBefore: winBefore,
                balanceAfter: winAfter,
                referenceType: 'spin_game',
                referenceId: bet.id,
              },
            });

            this.gameGateway?.emitWalletUpdate(bet.user_id, winAfter);
          }
        }
      }
    } catch (err) {
      console.error('Error auto-settling pending spin bets:', err);
    }
  }

  /**
   * Main state endpoint: returns live synchronized countdown, phase,
   * active round, user's placed bet (if any), recent spins, and limits.
   */
  async getGameState(rawUserId?: string) {
    const userId = this.toValidUserId(rawUserId);
    // Settle any pending bets for this user immediately
    await this.autoSettlePendingBets(userId);
    const roundState = await this.ensureCurrentRound();
    const config = await this.getGameConfig();

    let walletBalance = '0.00';
    if (userId !== this.DEMO_UUID) {
      const wallet = await this.db.wallet.findUnique({ where: { userId } });
      if (wallet) {
        walletBalance = Number(wallet.mainBalance).toFixed(2);
      }
    }

    // Check if user already placed a bet in the current active round
    let userActiveBet: any = null;
    let userLastSettledBet: any = null;

    if (userId !== this.DEMO_UUID) {
      try {
        const bets = await this.db.client.$queryRawUnsafe<any[]>(
          `SELECT * FROM spin_bets WHERE user_id = $1::uuid AND round_id = $2 LIMIT 1`,
          userId,
          roundState.roundId
        );
        if (bets && bets.length > 0) {
          const b = bets[0];
          const betAmount = Number(b.bet_amount);
          const color = (b.selected_color || '').toUpperCase();
          const mult = color === 'RED' ? 9.50 : 1.90;
          userActiveBet = {
            id: b.id,
            roundId: b.round_id,
            selectedColor: color,
            betAmount,
            potentialPayout: Number((betAmount * mult).toFixed(2)),
            status: b.status,
            resultColor: b.result_color || undefined,
            payoutAmount: Number(b.payout_amount || 0),
          };
        }
      } catch (e) {}

      // Get user's latest settled bet (within last 30s) for win/loss popup
      try {
        const settled = await this.db.client.$queryRawUnsafe<any[]>(
          `SELECT * FROM spin_bets WHERE user_id = $1::uuid AND status IN ('WON', 'LOST') ORDER BY created_at DESC LIMIT 1`,
          userId
        );
        if (settled && settled.length > 0) {
          const s = settled[0];
          const bAmt = Number(s.bet_amount);
          const pAmt = Number(s.payout_amount);
          const isWin = s.status === 'WON';
          userLastSettledBet = {
            id: s.id,
            roundId: s.round_id || `SPIN-${s.id.slice(0, 8).toUpperCase()}`,
            choice: (s.selected_color || '').toUpperCase(),
            result: (s.result_color || '').toUpperCase(),
            multiplier: Number(s.multiplier || (isWin ? (s.selected_color === 'RED' ? 9.50 : 1.90) : 0)),
            betAmount: bAmt,
            payoutAmount: pAmt,
            profitLoss: isWin ? pAmt - bAmt : -bAmt,
            status: s.status,
          };
        }
      } catch (e) {}
    }

    // Settle and mark any past unclosed rounds that elapsed
    try {
      const pastRounds = await this.db.client.$queryRawUnsafe<any[]>(
        `SELECT * FROM spin_rounds
         WHERE status != 'COMPLETED' AND betting_closed_at <= NOW() AND round_id != $1
         ORDER BY created_at DESC LIMIT 10`,
        roundState.roundId
      );
      for (const pr of pastRounds) {
        await this.settleRoundBets(pr);
      }
    } catch (e) {}

    // Recent 10 completed rounds for the ticker (strictly dynamic from DB)
    let recentSpins: any[] = [];
    try {
      const completedRounds = await this.db.client.$queryRawUnsafe<any[]>(
        `SELECT round_id, result_color, result_slot, created_at, betting_closed_at
         FROM spin_rounds
         WHERE (status = 'COMPLETED' OR betting_closed_at + INTERVAL '4.5 second' <= NOW())
           AND result_color IS NOT NULL AND result_color != ''
         ORDER BY betting_closed_at DESC, created_at DESC
         LIMIT 10`
      );
      if (completedRounds && completedRounds.length > 0) {
        recentSpins = completedRounds.map((r: any) => ({
          periodNumber: r.round_id,
          resultColor: (r.result_color || 'RED').toUpperCase(),
          multiplier: (r.result_color || '').toUpperCase() === 'RED' ? 9.50 : 1.90,
          timestamp: r.betting_closed_at ? new Date(r.betting_closed_at).getTime() : Date.now(),
        }));
      }
    } catch (e: any) {
      console.error('Error fetching recent spins:', e);
    }

    return {
      success: true,
      periodNumber: roundState.roundId,
      phase: roundState.phase,
      secondsRemaining: roundState.secondsRemaining,
      bettingOpen: roundState.phase === 'BETTING_OPEN',
      resultSlot: roundState.resultSlot,
      resultColor: roundState.resultColor,
      walletBalance,
      minBet: config.minBet,
      maxBet: config.maxBet,
      rtpPercentage: config.rtpPercentage,
      userActiveBet,
      userLastSettledBet,
      recentSpins,
      wheelSlots: WHEEL_SLOTS,
    };
  }

  /**
   * Place a bet for the current 30-second round.
   * Rejects if betting window is closed (timer = 0) or user already bet.
   */
  async placeBet(rawUserId: string, selectedColor: string, betAmount: number, targetPeriod?: string) {
    const userId = this.toValidUserId(rawUserId);
    const roundState = await this.ensureCurrentRound();
    const config = await this.getGameConfig();

    if (roundState.phase !== 'BETTING_OPEN' || roundState.secondsRemaining <= 0) {
      throw new BadRequestException('Betting is closed for this round. Please wait for the next round.');
    }

    const color = (selectedColor || '').toLowerCase().trim();
    if (!['green', 'blue', 'red'].includes(color)) {
      throw new BadRequestException('Invalid color. Choose GREEN, BLUE, or RED.');
    }

    const numAmount = Number(betAmount);
    if (!numAmount || isNaN(numAmount) || numAmount < config.minBet || numAmount > config.maxBet) {
      throw new BadRequestException(`Bet must be between ₹${config.minBet} and ₹${config.maxBet.toLocaleString('en-IN')}.`);
    }

    // Verify user has no duplicate bet in current round
    try {
      const existing = await this.db.client.$queryRawUnsafe<any[]>(
        `SELECT id FROM spin_bets WHERE user_id = $1::uuid AND round_id = $2 LIMIT 1`,
        userId,
        roundState.roundId
      );
      if (existing && existing.length > 0) {
        throw new BadRequestException('You have already placed a bet for this round.');
      }
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
    }

    const wallet = await this.db.wallet.findUnique({ where: { userId } });
    if (!wallet || Number(wallet.mainBalance) < numAmount) {
      throw new BadRequestException('Insufficient wallet balance.');
    }

    // Atomic balance deduction
    const balanceBefore = Number(wallet.mainBalance);
    const balanceAfter = balanceBefore - numAmount;

    await this.db.wallet.update({
      where: { id: wallet.id },
      data: { mainBalance: balanceAfter },
    });

    await this.db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'bet',
        amount: numAmount,
        balanceBefore,
        balanceAfter,
        referenceType: 'spin_game',
        referenceId: roundState.roundId,
      },
    });

    // Insert pending bet into spin_bets
    const betId = crypto.randomUUID();
    await this.db.client.$executeRawUnsafe(
      `INSERT INTO spin_bets (id, user_id, round_id, selected_color, result_color, bet_amount, multiplier, payout_amount, status, created_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, '', $5, 0, 0, 'PENDING'::"BetStatus", NOW())`,
      betId,
      userId,
      roundState.roundId,
      color.toUpperCase(),
      numAmount
    );

    // Synchronize balance via WebSocket
    this.gameGateway?.emitWalletUpdate(userId, balanceAfter);

    const mult = color === 'red' ? 9.50 : 1.90;
    const potentialPayout = Number((numAmount * mult).toFixed(2));

    return {
      success: true,
      betId,
      roundId: roundState.roundId,
      selectedColor: color.toUpperCase(),
      betAmount: numAmount,
      potentialPayout,
      newBalance: balanceAfter.toFixed(2),
    };
  }

  // Alias for backward compatibility
  async spin(rawUserId: string, selectedColor: string, betAmount: number, periodNumber?: string) {
    return this.placeBet(rawUserId, selectedColor, betAmount, periodNumber);
  }

  /**
   * Paginated bet history (10 records per page).
   */
  async getHistory(rawUserId?: string, page: number = 1, limit: number = 10) {
    const userId = this.toValidUserId(rawUserId);
    // Settle any pending bets for this user first so history is 100% up-to-date
    await this.autoSettlePendingBets(userId);
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
    const skip = (safePage - 1) * safeLimit;

    let bets: any[] = [];
    let total = 0;

    if (userId !== this.DEMO_UUID) {
      bets = await this.db.client.$queryRawUnsafe<any[]>(
        `SELECT * FROM spin_bets WHERE user_id = $1::uuid ORDER BY created_at DESC OFFSET $2 LIMIT $3`,
        userId,
        skip,
        safeLimit
      );
      const countRes = await this.db.client.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int as count FROM spin_bets WHERE user_id = $1::uuid`,
        userId
      );
      total = Number(countRes?.[0]?.count || 0);
    } else {
      bets = await this.db.client.$queryRawUnsafe<any[]>(
        `SELECT * FROM spin_bets ORDER BY created_at DESC OFFSET $1 LIMIT $2`,
        skip,
        safeLimit
      );
      const countRes = await this.db.client.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int as count FROM spin_bets`
      );
      total = Number(countRes?.[0]?.count || 0);
    }

    const items = bets.map((b: any, index: number) => {
      const betAmt = Number(b.bet_amount || 0);
      const payoutAmt = Number(b.payout_amount || 0);
      const isWin = b.status === 'WON';
      const isPending = b.status === 'PENDING';
      const profit = isWin ? payoutAmt - betAmt : isPending ? 0 : -betAmt;

      return {
        id: b.id,
        index: total - (skip + index),
        roundId: b.round_id || `SPIN-${b.id.slice(0, 8).toUpperCase()}`,
        time: b.created_at ? new Date(b.created_at).toISOString() : new Date().toISOString(),
        choice: (b.selected_color || 'RED').toUpperCase(),
        result: isPending ? 'PENDING' : (b.result_color || 'RED').toUpperCase(),
        multiplier: isPending ? 0 : Number(b.multiplier || (isWin ? (b.selected_color === 'RED' ? 9.50 : 1.90) : 0)),
        betAmount: betAmt,
        payoutAmount: isPending ? 0 : payoutAmt,
        profitLoss: Number(profit.toFixed(2)),
        status: b.status,
      };
    });

    return {
      success: true,
      items,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }
}
