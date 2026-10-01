import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { ReferralService } from '../../referral/referral.service.js';
import { GameOverrideService } from '../game-engine/game-override.service.js';

export interface DealStep {
  card: string;
  side: 'andar' | 'bahar';
}

export interface RoundInfo {
  periodId: string;
  openCard: string;
  winningSide: 'andar' | 'bahar' | 'tie';
  winningCard: string;
  dealSequence: DealStep[];
  dealCount: number;
  settled: boolean;
  isOverride?: boolean;
  createdAt: Date;
}

@Injectable()
export class AndarBaharService {
  constructor(
    private readonly db: DatabaseService,
    private readonly referralService: ReferralService,
    private readonly overrideService: GameOverrideService,
  ) {}

  private readonly DEMO_UUID = '00000000-0000-0000-0000-000000000000';
  private readonly SUITS = ['♠', '♥', '♦', '♣'];
  private readonly RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  public getOdds(side: 'andar' | 'bahar' | 'tie'): number {
    if (side === 'andar') return 1.90;
    if (side === 'bahar') return 2.00;
    if (side === 'tie') return 8.00;
    return 1.90;
  }

  // In-memory cache for fast period round generation & lookup
  private roundCache = new Map<string, RoundInfo>();
  private settledPeriods = new Set<string>();

  private toValidUserId(userId?: string): string {
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return userId;
    }
    return this.DEMO_UUID;
  }

  public getFullDeck(): string[] {
    const deck: string[] = [];
    for (const suit of this.SUITS) {
      for (const rank of this.RANKS) {
        deck.push(`${rank}${suit}`);
      }
    }
    return deck;
  }

  public static getCardRank(card: string): string {
    return card.slice(0, -1);
  }

  /**
   * 60-Second Synchronized Period ID & Phase Timing Generator
   * 45s Betting Window + 15s Card Dealing & Settlement Window
   */
  public getPeriodInfo(interval = 60) {
    const timestamp = Math.floor(Date.now() / 1000);
    const periodIndex = Math.floor(timestamp / interval);
    const elapsed = timestamp % interval; // 0 to 59 seconds
    const bettingSeconds = 45;

    const bettingOpen = elapsed < bettingSeconds;
    const countdown = bettingOpen ? (bettingSeconds - elapsed) : 0;
    const isDealingPhase = elapsed >= bettingSeconds; // seconds 45..59

    const now = new Date(timestamp * 1000);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const periodId = `${yyyy}${mm}${dd}${String(periodIndex % 10000).padStart(4, '0')}`;

    return {
      periodId,
      periodIndex,
      elapsed,
      countdown,
      bettingOpen,
      isDealingPhase,
    };
  }

  /**
   * High-entropy 32-bit hash avalanche function (FNV-1a + Murmur3 finalizer)
   * Ensures uniform distribution and prevents repetitive winner patterns
   */
  private hashString(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }

  /**
   * Generate or retrieve round data for a given periodId
   */
  public getOrCreateRound(periodId: string): RoundInfo {
    if (this.roundCache.has(periodId)) {
      const cached = this.roundCache.get(periodId)!;
      if (!cached.settled) {
        const activeOverride = this.overrideService ? this.overrideService.getOverride('andar-bahar') : null;
        let expectedWinner: 'andar' | 'bahar' | 'tie' | null = null;
        if (activeOverride !== null && activeOverride !== undefined && activeOverride !== '') {
          const forced = activeOverride.toLowerCase();
          if (forced === 'bahar') expectedWinner = 'bahar';
          else if (forced === 'tie') expectedWinner = 'tie';
          else expectedWinner = 'andar';
        }
        if (expectedWinner !== null) {
          if (cached.winningSide !== expectedWinner) {
            this.roundCache.delete(periodId);
          } else {
            return cached;
          }
        } else if (cached.isOverride) {
          this.roundCache.delete(periodId);
        } else {
          return cached;
        }
      } else {
        return cached;
      }
    }

    const deck = this.getFullDeck();

    // High entropy seeds for open card, winner, and sequence derivation
    const openSeed = this.hashString(`${periodId}_open`);
    const winnerSeed = this.hashString(`${periodId}_winner`);

    const openCard = deck[openSeed % deck.length];
    const openRank = AndarBaharService.getCardRank(openCard);

    // Admin Forced Override check vs Natural Winner distribution
    const activeOverride = this.overrideService ? this.overrideService.getOverride('andar-bahar') : null;
    let winningSide: 'andar' | 'bahar' | 'tie' = 'andar';

    if (activeOverride !== null && activeOverride !== undefined && activeOverride !== '') {
      const forced = activeOverride.toLowerCase();
      if (forced === 'bahar') winningSide = 'bahar';
      else if (forced === 'tie') winningSide = 'tie';
      else winningSide = 'andar';
    } else {
      const winnerRand = (winnerSeed % 1000) + 1;
      if (winnerRand <= 485) winningSide = 'andar';
      else if (winnerRand <= 970) winningSide = 'bahar';
      else winningSide = 'tie';
    }

    // Generate deal sequence
    const remainingDeck = deck.filter((c) => c !== openCard);
    const matchingCards = remainingDeck.filter((c) => AndarBaharService.getCardRank(c) === openRank);
    const nonMatchingCards = remainingDeck.filter((c) => AndarBaharService.getCardRank(c) !== openRank);

    // Pseudo shuffle using period salt
    const pseudoShuffle = (arr: string[], salt: string) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const itemSeed = this.hashString(`${periodId}_${salt}_${i}`);
        const j = itemSeed % (i + 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const shuffledNonMatching = pseudoShuffle(nonMatchingCards, 'nonmatch');
    const shuffledMatching = pseudoShuffle(matchingCards, 'match');

    const matchingCard = shuffledMatching[0] || `${openRank}♠`;
    const sequence: DealStep[] = [];

    if (winningSide === 'tie') {
      sequence.push({ card: shuffledNonMatching[0] || '2♠', side: 'andar' });
      sequence.push({ card: matchingCard, side: 'bahar' });
    } else {
      const countSeed = this.hashString(`${periodId}_count`);
      let numNonMatching = (countSeed % 7) + 2; // 2 to 8 non-matching cards
      if (winningSide === 'andar' && numNonMatching % 2 === 1) {
        numNonMatching += 1;
      } else if (winningSide === 'bahar' && numNonMatching % 2 === 0) {
        numNonMatching += 1;
      }

      let sideToggle: 'andar' | 'bahar' = 'andar';
      for (let i = 0; i < numNonMatching; i++) {
        if (shuffledNonMatching[i]) {
          sequence.push({ card: shuffledNonMatching[i], side: sideToggle });
          sideToggle = sideToggle === 'andar' ? 'bahar' : 'andar';
        }
      }
      sequence.push({ card: matchingCard, side: sideToggle });
    }

    const info: RoundInfo = {
      periodId,
      openCard,
      winningSide,
      winningCard: matchingCard,
      dealSequence: sequence,
      dealCount: sequence.length,
      settled: false,
      isOverride: activeOverride !== null && activeOverride !== undefined && activeOverride !== '',
      createdAt: new Date(),
    };

    this.roundCache.set(periodId, info);

    // Clean old cache entries if map grows too large (> 100 entries)
    if (this.roundCache.size > 100) {
      const keys = Array.from(this.roundCache.keys());
      for (let i = 0; i < keys.length - 50; i++) {
        this.roundCache.delete(keys[i]);
      }
    }

    return info;
  }

  /**
   * Settle pending bets for a specific periodId atomically
   */
  public async settlePeriod(periodId: string) {
    if (this.settledPeriods.has(periodId)) return;
    this.settledPeriods.add(periodId);

    const round = this.getOrCreateRound(periodId);
    round.settled = true;

    // Find pending bets in DB for this period
    try {
      const pendingBets = await this.db.gameBet.findMany({
        where: {
          periodNumber: periodId,
          status: 'PENDING',
          game: { slug: 'andar-bahar' },
        },
      });

      for (const bet of pendingBets) {
        const betDetails = (bet.betDetails as any) || {};
        const betOption = (betDetails.bet_option || bet.betType || 'andar').toLowerCase();
        const betAmount = Number(bet.betAmount);

        const isWin = betOption === round.winningSide;
        const odds = betOption === 'tie' ? 9.0 : 2.0;
        const winAmount = isWin ? Number((betAmount * odds).toFixed(2)) : 0;

        if (isWin) {
          // Credit wallet
          const wallet = await this.db.wallet.findUnique({ where: { userId: bet.userId } });
          if (wallet) {
            const balBefore = Number(wallet.mainBalance);
            const balAfter = balBefore + winAmount;

            await this.db.wallet.update({
              where: { id: wallet.id },
              data: { mainBalance: balAfter },
            });

            await this.db.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: 'win',
                amount: winAmount,
                balanceBefore: balBefore,
                balanceAfter: balAfter,
                referenceType: 'andar_bahar_win',
                referenceId: bet.id,
              },
            });
          }
        }

        await this.db.gameBet.update({
          where: { id: bet.id },
          data: {
            status: isWin ? 'WON' : 'LOST',
            multiplier: isWin ? odds : 0,
            winAmount,
          },
        });
      }
    } catch (err) {
      // Log silently
    }
  }

  private async getGameConfig() {
    try {
      const dbGame = await this.db.game.findFirst({
        where: { slug: 'andar-bahar' },
      });
      if (dbGame) {
        return {
          minBet: dbGame.minBet !== undefined && dbGame.minBet !== null ? Number(dbGame.minBet) : 10,
          maxBet: dbGame.maxBet !== undefined && dbGame.maxBet !== null ? Number(dbGame.maxBet) : 50000,
          rtpPercentage: dbGame.rtpPercentage !== undefined && dbGame.rtpPercentage !== null ? Number(dbGame.rtpPercentage) : 95,
        };
      }
    } catch (e) {}
    return { minBet: 10, maxBet: 50000, rtpPercentage: 95 };
  }

  /**
   * GET /api/v1/games/andar-bahar/state
   */
  async getGameState(rawUserId?: string) {
    const config = await this.getGameConfig();
    const userId = this.toValidUserId(rawUserId);
    const periodInfo = this.getPeriodInfo(60);
    const currentRound = this.getOrCreateRound(periodInfo.periodId);

    // Compute previous period
    const prevTimestamp = Math.floor(Date.now() / 1000) - 60;
    const prevPeriodIndex = Math.floor(prevTimestamp / 60);
    const now = new Date(prevTimestamp * 1000);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const prevPeriodId = `${yyyy}${mm}${dd}${String(prevPeriodIndex % 10000).padStart(4, '0')}`;

    const prevRound = this.getOrCreateRound(prevPeriodId);

    // ALWAYS settle previous completed period if not settled
    await this.settlePeriod(prevPeriodId);

    // Settle current period during dealing phase (elapsed >= 52s)
    if (periodInfo.elapsed >= 52) {
      await this.settlePeriod(periodInfo.periodId);
    }

    // Fetch user wallet balance
    let walletBalance = '0.00';
    if (userId !== this.DEMO_UUID) {
      const wallet = await this.db.wallet.findUnique({ where: { userId } });
      if (wallet) {
        walletBalance = Number(wallet.mainBalance).toFixed(2);
      }
    }

    // Fetch user's recent orders
    let myOrders: any[] = [];
    if (userId !== this.DEMO_UUID) {
      try {
        const bets = await this.db.gameBet.findMany({
          where: {
            userId,
            game: { slug: 'andar-bahar' },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        myOrders = bets.map((b: any) => {
          const details = (b.betDetails as any) || {};
          const isCurrentActivePeriod = b.periodNumber === periodInfo.periodId;
          
          // While current active period is in betting or dealing phase, return status as PENDING!
          const displayStatus = isCurrentActivePeriod && periodInfo.elapsed < 54 ? 'pending' : b.status.toLowerCase();
          const displayWinAmt = isCurrentActivePeriod && periodInfo.elapsed < 54 ? '0.00' : Number(b.winAmount).toFixed(2);

          return {
            id: b.id,
            period_number: b.periodNumber || periodInfo.periodId,
            bet_option: details.bet_option || b.betType || 'andar',
            bet_amount: Number(b.betAmount).toFixed(2),
            win_amount: displayWinAmt,
            status: displayStatus,
            created_at: b.createdAt,
          };
        });
      } catch (e) {
        myOrders = [];
      }
    }

    // Generate recent 30 history records (excluding current period while active)
    const history: any[] = [];
    for (let i = 1; i <= 30; i++) {
      const targetTime = Math.floor(Date.now() / 1000) - i * 60;
      const targetIdx = Math.floor(targetTime / 60);
      const tDate = new Date(targetTime * 1000);
      const tY = tDate.getFullYear();
      const tM = String(tDate.getMonth() + 1).padStart(2, '0');
      const tD = String(tDate.getDate()).padStart(2, '0');
      const pId = `${tY}${tM}${tD}${String(targetIdx % 10000).padStart(4, '0')}`;
      const r = this.getOrCreateRound(pId);
      history.push({
        period_number: r.periodId,
        open_card: r.openCard,
        winner: r.winningSide,
        winning_card: r.winningCard,
        deal_count: r.dealCount,
      });
    }

    // Everyone's orders in current period
    let everyoneOrders: any[] = [];
    try {
      const liveBets = await this.db.gameBet.findMany({
        where: {
          periodNumber: periodInfo.periodId,
          game: { slug: 'andar-bahar' },
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      everyoneOrders = liveBets.map((lb: any) => {
        const details = (lb.betDetails as any) || {};
        const maskedName = lb.user?.name ? `${lb.user.name.slice(0, 3)}***` : 'User***';
        return {
          id: lb.id,
          user: maskedName,
          selection: (details.bet_option || lb.betType || 'andar').toUpperCase(),
          amount: Number(lb.betAmount).toFixed(2),
          status: lb.status,
        };
      });
    } catch (e) {
      everyoneOrders = [];
    }

    // Expose last_result WITH deal_sequence DURING dealing phase (elapsed >= 45s)!
    let lastResult = null;
    if (periodInfo.isDealingPhase || periodInfo.elapsed >= 45) {
      lastResult = {
        period_number: currentRound.periodId,
        winner: currentRound.winningSide.toUpperCase(),
        open_card: currentRound.openCard,
        winning_card: currentRound.winningCard,
        deal_count: currentRound.dealCount,
        deal_sequence: currentRound.dealSequence,
      };
    } else {
      // During betting phase (0..44s), expose previous period result
      lastResult = {
        period_number: prevRound.periodId,
        winner: prevRound.winningSide.toUpperCase(),
        open_card: prevRound.openCard,
        winning_card: prevRound.winningCard,
        deal_count: prevRound.dealCount,
        deal_sequence: prevRound.dealSequence,
      };
    }

    return {
      status: true,
      period: periodInfo.periodId,
      open_card: currentRound.openCard,
      countdown: periodInfo.countdown,
      betting_open: periodInfo.bettingOpen,
      is_dealing_phase: periodInfo.isDealingPhase,
      wallet: walletBalance,
      settings: {
        andar_odds: 2.0,
        bahar_odds: 2.0,
        tie_odds: 9.0,
        min_bet: config.minBet,
        max_bet: config.maxBet,
      },
      history,
      my_orders: myOrders,
      everyone_orders: everyoneOrders,
      last_result: lastResult,
    };
  }

  /**
   * POST /api/v1/games/andar-bahar/bet
   */
  async placeBet(rawUserId: string, option: string, amount: number) {
    const userId = this.toValidUserId(rawUserId);
    const config = await this.getGameConfig();

    if (!amount || amount < config.minBet || amount > config.maxBet) {
      throw new BadRequestException(`Bet amount must be between ₹${config.minBet} and ₹${config.maxBet.toLocaleString('en-IN')}.`);
    }

    const betOption = (option || '').toLowerCase();
    if (!['andar', 'bahar', 'tie'].includes(betOption)) {
      throw new BadRequestException('Invalid bet option. Must be andar, bahar, or tie.');
    }

    const periodInfo = this.getPeriodInfo(60);
    if (!periodInfo.bettingOpen) {
      throw new BadRequestException('Betting is closed for the current period. Please wait for next round.');
    }

    // Check user balance
    let balanceAfter = 0;
    if (userId !== this.DEMO_UUID) {
      const wallet = await this.db.wallet.findUnique({ where: { userId } });
      if (!wallet || Number(wallet.mainBalance) < amount) {
        throw new BadRequestException('Insufficient wallet balance.');
      }

      const balBefore = Number(wallet.mainBalance);
      balanceAfter = balBefore - amount;

      await this.db.wallet.update({
        where: { id: wallet.id },
        data: { mainBalance: balanceAfter },
      });

      await this.db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'bet',
          amount,
          balanceBefore: balBefore,
          balanceAfter,
          referenceType: 'andar_bahar_bet',
        },
      });

      // Ensure Andar Bahar game model exists in DB
      let game = await this.db.game.findUnique({ where: { slug: 'andar-bahar' } });
      if (!game) {
        game = await this.db.game.create({
          data: {
            slug: 'andar-bahar',
            name: 'Andar Bahar',
            category: 'cards',
            minBet: 10,
            maxBet: 50000,
            isActive: true,
          },
        });
      }

      const betRecord = await this.db.gameBet.create({
        data: {
          userId,
          gameId: game.id,
          periodNumber: periodInfo.periodId,
          betAmount: amount,
          betType: betOption,
          status: 'PENDING',
          betDetails: {
            bet_option: betOption,
            period_number: periodInfo.periodId,
          },
        },
      });

      // Process 3-tier referral commission
      await this.referralService.processBetCommission(userId, amount);

      return {
        status: true,
        message: 'Bet placed successfully!',
        bet: {
          id: betRecord.id,
          period: periodInfo.periodId,
          bet_option: betOption.toUpperCase(),
          amount: amount.toFixed(2),
        },
        new_balance: balanceAfter.toFixed(2),
      };
    }

    return {
      status: true,
      message: 'Bet placed successfully! (Demo Mode)',
      bet: {
        id: 'demo_' + Date.now(),
        period: periodInfo.periodId,
        bet_option: betOption.toUpperCase(),
        amount: amount.toFixed(2),
      },
      new_balance: '1000.00',
    };
  }

  /**
   * GET /api/v1/games/andar-bahar/history
   */
  async getHistory() {
    const periodInfo = this.getPeriodInfo(60);
    const data: any[] = [];

    for (let i = 1; i <= 50; i++) {
      const targetTime = Math.floor(Date.now() / 1000) - i * 60;
      const targetIdx = Math.floor(targetTime / 60);
      const tDate = new Date(targetTime * 1000);
      const tY = tDate.getFullYear();
      const tM = String(tDate.getMonth() + 1).padStart(2, '0');
      const tD = String(tDate.getDate()).padStart(2, '0');
      const pId = `${tY}${tM}${tD}${String(targetIdx % 10000).padStart(4, '0')}`;
      const r = this.getOrCreateRound(pId);
      data.push({
        period_number: r.periodId,
        open_card: r.openCard,
        winner: r.winningSide.toUpperCase(),
        winning_card: r.winningCard,
        deal_count: r.dealCount,
      });
    }

    return {
      status: true,
      data: {
        data,
      },
    };
  }

  /**
   * Play endpoint (legacy one-shot round)
   */
  async play(userId: string, side: 'andar' | 'bahar' | 'tie', betAmount: number) {
    return this.placeBet(userId, side, betAmount);
  }
}
