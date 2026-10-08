import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseService } from '../../database/database.service.js';
import { ReferralService } from '../../referral/referral.service.js';
import { GameOverrideService } from '../game-engine/game-override.service.js';
import {
  Card,
  CardRank,
  CardSuit,
  HiloChoiceType,
  MultiplierCalculation,
  RANK_VALUES,
  SUIT_SYMBOLS,
  SUIT_CODES,
} from './hilo.types.js';

@Injectable()
export class HiloService {
  constructor(
    private readonly db: DatabaseService,
    private readonly referralService: ReferralService,
    private readonly overrideService: GameOverrideService,
  ) {}

  private readonly DEMO_UUID = '00000000-0000-0000-0000-000000000000';

  /**
   * Generates a standard fresh 52-card deck
   */
  public generateDeck(): Card[] {
    const ranks: CardRank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const suits: CardSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          code: `${rank}${SUIT_CODES[suit]}`,
          rank,
          rankValue: RANK_VALUES[rank],
          suit,
          suitSymbol: SUIT_SYMBOLS[suit],
          color: suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black',
        });
      }
    }
    return deck;
  }

  /**
   * Secure Fisher-Yates shuffle
   */
  public shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Parses card code back to Card object
   */
  public parseCard(cardCode: string): Card {
    const suitChar = cardCode.slice(-1);
    const rankPart = cardCode.slice(0, -1) as CardRank;

    let suit: CardSuit = 'spades';
    if (suitChar === 'H') suit = 'hearts';
    else if (suitChar === 'D') suit = 'diamonds';
    else if (suitChar === 'C') suit = 'clubs';

    return {
      code: cardCode,
      rank: rankPart,
      rankValue: RANK_VALUES[rankPart] || 2,
      suit,
      suitSymbol: SUIT_SYMBOLS[suit] || '♠',
      color: suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black',
    };
  }

  private toValidUserId(userId?: string): string {
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return userId;
    }
    return this.DEMO_UUID;
  }

  public async getGameConfig() {
    try {
      const dbGame = await this.db.game.findFirst({
        where: { slug: 'hilo' },
      });
      if (dbGame) {
        return {
          minBet: Number(dbGame.minBet || 10),
          maxBet: Number(dbGame.maxBet || 500000),
          rtpPercentage: Number(dbGame.rtpPercentage || 96),
          isActive: dbGame.isActive !== false,
        };
      }
    } catch (e) {}
    return { minBet: 10, maxBet: 500000, rtpPercentage: 96, isActive: true };
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
   * STEP 1: CREATE A NEW HILO ROUND
   * Deducts bet amount atomically and reveals initial current card
   */
  async createRound(userId: string, betAmount: number) {
    const config = await this.getGameConfig();
    if (!config.isActive) {
      throw new BadRequestException('HILO game is currently inactive');
    }

    const amount = Number(betAmount);
    if (isNaN(amount) || amount < config.minBet) {
      throw new BadRequestException(`Minimum bet amount is ₹${config.minBet}`);
    }
    if (amount > config.maxBet) {
      throw new BadRequestException(`Maximum bet amount is ₹${config.maxBet}`);
    }

    const { activeUserId, wallet } = await this.getOrCreateWallet(userId);

    // Cancel any older abandoned pending rounds for this user to avoid stale states
    try {
      await this.db.hiloRound.updateMany({
        where: {
          userId: activeUserId,
          status: 'PENDING',
        },
        data: {
          status: 'CANCELLED',
        },
      });
    } catch (e) {}

    // Draw random initial card from full shuffled deck
    const deck = this.shuffleDeck(this.generateDeck());
    const initialCard = deck[0];

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const uniqueSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const roundId = `HILO-${todayStr}-${uniqueSuffix}`;

    // Atomic transaction: Check balance, deduct bet, record transaction & pending round
    const [roundRecord, updatedWallet] = await this.db.$transaction(async (tx: any) => {
      const freshWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      const currentBalance = Number(freshWallet.mainBalance);

      if (currentBalance < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const balanceAfter = Math.round((currentBalance - amount) * 100) / 100;

      const uWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          mainBalance: balanceAfter,
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'HILO_BET',
          amount: amount,
          balanceBefore: currentBalance,
          balanceAfter: balanceAfter,
          referenceType: 'HILO',
          referenceId: roundId,
          metadata: {
            roundId,
            betAmount: amount,
            currentCard: initialCard.code,
          },
        },
      });

      const round = await tx.hiloRound.create({
        data: {
          roundId,
          userId: activeUserId,
          currentCard: initialCard.code,
          currentRank: initialCard.rankValue,
          currentSuit: initialCard.suit,
          betAmount: amount,
          balanceBefore: currentBalance,
          balanceAfter: balanceAfter,
          status: 'PENDING',
          result: 'PENDING',
        },
      });

      return [round, uWallet];
    });

    // Process referral commissions on bet placement
    if (activeUserId !== this.DEMO_UUID) {
      this.referralService.processBetCommission(activeUserId, amount).catch(() => null);
    }

    return {
      roundId: roundRecord.roundId,
      currentCard: initialCard,
      betAmount: amount,
      balance: Number(updatedWallet.mainBalance),
      status: roundRecord.status,
      createdAt: roundRecord.createdAt,
    };
  }

  /**
   * STEP 2: PLAY ROUND (PLAYER SELECTS UP / DOWN)
   * Draws next card without replacement from the remaining 51 cards, evaluates WIN/LOSS, credits payout if win
   */
  async playRound(userId: string, roundId: string, choiceInput: string) {
    const choice = choiceInput ? (choiceInput.toUpperCase().trim() as HiloChoiceType) : null;
    if (choice !== 'UP' && choice !== 'DOWN') {
      throw new BadRequestException('Invalid choice. Must be UP or DOWN');
    }

    const { activeUserId, wallet } = await this.getOrCreateWallet(userId);

    const round = await this.db.hiloRound.findUnique({
      where: { roundId },
    });

    if (!round) {
      throw new NotFoundException(`Round ${roundId} not found`);
    }

    if (round.userId !== activeUserId) {
      throw new ForbiddenException('You do not have permission to play this round');
    }

    if (round.status !== 'PENDING') {
      throw new BadRequestException('This round has already been completed or cancelled');
    }

    const currentCard = this.parseCard(round.currentCard);
    const amount = Number(round.betAmount);

    // Generate remaining 51 cards (excluding currentCard)
    const fullDeck = this.generateDeck();
    const remainingDeck = fullDeck.filter((c) => c.code !== currentCard.code);
    const shuffledRemaining = this.shuffleDeck(remainingDeck);

    // Optional override support from GameEngine for testing/rigorous RTP audits
    const overrideVal = this.overrideService.getOverride('hilo');
    let nextCard = shuffledRemaining[0];

    if (overrideVal !== null && overrideVal !== undefined) {
      const cleanOverride = String(overrideVal).trim().toUpperCase();
      if (cleanOverride === 'WIN' || cleanOverride === 'FORCE_WIN') {
        const winningCards = remainingDeck.filter((c) =>
          choice === 'UP' ? c.rankValue > currentCard.rankValue : c.rankValue < currentCard.rankValue
        );
        if (winningCards.length > 0) {
          nextCard = winningCards[crypto.randomInt(0, winningCards.length)];
        }
      } else if (cleanOverride === 'LOSE' || cleanOverride === 'FORCE_LOSE' || cleanOverride === 'LOSS') {
        const losingCards = remainingDeck.filter((c) =>
          choice === 'UP' ? c.rankValue <= currentCard.rankValue : c.rankValue >= currentCard.rankValue
        );
        if (losingCards.length > 0) {
          nextCard = losingCards[crypto.randomInt(0, losingCards.length)];
        }
      } else if (cleanOverride === 'SAME' || cleanOverride === 'FORCE_SAME') {
        const sameCards = remainingDeck.filter((c) => c.rankValue === currentCard.rankValue);
        if (sameCards.length > 0) {
          nextCard = sameCards[crypto.randomInt(0, sameCards.length)];
        }
      } else if (cleanOverride === 'HIGH' || cleanOverride === 'FORCE_HIGH') {
        const highCards = remainingDeck.filter((c) => c.rankValue >= 10);
        if (highCards.length > 0) {
          nextCard = highCards[crypto.randomInt(0, highCards.length)];
        }
      } else if (cleanOverride === 'LOW' || cleanOverride === 'FORCE_LOW') {
        const lowCards = remainingDeck.filter((c) => c.rankValue <= 5);
        if (lowCards.length > 0) {
          nextCard = lowCards[crypto.randomInt(0, lowCards.length)];
        }
      }
    } else {
      // Dynamic Winning Chance (RTP %) algorithm configured by Admin
      const config = await this.getGameConfig();
      const rtp = config.rtpPercentage;
      const winProbability = Math.max(0.01, Math.min(0.99, rtp / 100));
      const roll = Math.random();

      const winningCards = remainingDeck.filter((c) =>
        choice === 'UP' ? c.rankValue > currentCard.rankValue : c.rankValue < currentCard.rankValue
      );
      const losingCards = remainingDeck.filter((c) =>
        choice === 'UP' ? c.rankValue <= currentCard.rankValue : c.rankValue >= currentCard.rankValue
      );

      if (roll < winProbability && winningCards.length > 0) {
        nextCard = winningCards[crypto.randomInt(0, winningCards.length)];
      } else if (losingCards.length > 0) {
        nextCard = losingCards[crypto.randomInt(0, losingCards.length)];
      }
    }

    // Determine Result strictly according to game rules:
    // UP: nextRank > currentRank -> WIN
    // DOWN: nextRank < currentRank -> WIN
    // Same rank: strictly LOSS
    let isWin = false;
    if (choice === 'UP') {
      isWin = nextCard.rankValue > currentCard.rankValue;
    } else if (choice === 'DOWN') {
      isWin = nextCard.rankValue < currentCard.rankValue;
    }

    const payoutAmount = isWin ? Math.round(amount * 2 * 100) / 100 : 0;
    const profit = isWin ? amount : -amount;

    // Atomic update in database
    const [updatedRound, finalWalletBalance] = await this.db.$transaction(async (tx: any) => {
      const freshWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      let currentBal = Number(freshWallet.mainBalance);
      let balanceAfter = currentBal;

      if (isWin) {
        balanceAfter = Math.round((currentBal + payoutAmount) * 100) / 100;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            mainBalance: balanceAfter,
            totalWinnings: { increment: payoutAmount },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'HILO_WIN',
            amount: payoutAmount,
            balanceBefore: currentBal,
            balanceAfter: balanceAfter,
            referenceType: 'HILO',
            referenceId: round.roundId,
            metadata: {
              roundId: round.roundId,
              choice,
              isWin,
              profit,
              payout: payoutAmount,
              currentCard: currentCard.code,
              nextCard: nextCard.code,
            },
          },
        });
      }

      const completed = await tx.hiloRound.update({
        where: { id: round.id },
        data: {
          playerChoice: choice,
          nextCard: nextCard.code,
          nextRank: nextCard.rankValue,
          nextSuit: nextCard.suit,
          result: isWin ? 'WIN' : 'LOSS',
          profit,
          payout: payoutAmount,
          balanceAfter,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      await tx.hiloBet.create({
        data: {
          roundId: round.id,
          userId: activeUserId,
          betAmount: amount,
          choice,
          status: isWin ? 'WON' : 'LOST',
        },
      });

      return [completed, balanceAfter];
    });

    return {
      roundId: updatedRound.roundId,
      currentCard: currentCard.code,
      currentCardDetails: currentCard,
      nextCard: nextCard.code,
      nextCardDetails: nextCard,
      choice,
      result: updatedRound.result,
      betAmount: amount,
      profit,
      payout: payoutAmount,
      balance: finalWalletBalance,
      isWin,
      completedAt: updatedRound.completedAt,
    };
  }

  /**
   * STEP 3: GET USER HISTORY
   * Returns authenticated user's HILO rounds sorted newest first
   */
  async getHistory(userId: string, page = 1, limit = 10) {
    const take = Math.min(50, Math.max(1, Number(limit) || 10));
    const pageNum = Math.max(1, Number(page) || 1);
    const skip = (pageNum - 1) * take;

    if (!userId || userId === this.DEMO_UUID || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return {
        total: 0,
        totalPages: 1,
        page: pageNum,
        limit: take,
        rounds: [],
        items: [],
      };
    }

    const activeUserId = this.toValidUserId(userId);
    const [total, rounds] = await Promise.all([
      this.db.hiloRound.count({
        where: {
          userId: activeUserId,
          status: 'COMPLETED',
        },
      }),
      this.db.hiloRound.findMany({
        where: {
          userId: activeUserId,
          status: 'COMPLETED',
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    const formatted = rounds.map((r: any) => {
      const cur = this.parseCard(r.currentCard);
      const nxt = r.nextCard ? this.parseCard(r.nextCard) : null;
      return {
        id: r.id,
        roundId: r.roundId,
        currentCard: r.currentCard,
        currentCardDetails: cur,
        choice: r.playerChoice,
        nextCard: r.nextCard,
        nextCardDetails: nxt,
        betAmount: Number(r.betAmount),
        result: r.result,
        profit: Number(r.profit),
        payout: Number(r.payout),
        balanceBefore: Number(r.balanceBefore),
        balanceAfter: r.balanceAfter !== null ? Number(r.balanceAfter) : null,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
      };
    });

    const totalPages = Math.ceil(total / take) || 1;

    return {
      total,
      totalPages,
      page: pageNum,
      limit: take,
      rounds: formatted,
      items: formatted,
    };
  }

  /**
   * STEP 4: GET SINGLE ROUND DETAILS
   */
  async getRound(userId: string, roundId: string) {
    const activeUserId = this.toValidUserId(userId);
    const round = await this.db.hiloRound.findUnique({
      where: { roundId },
    });

    if (!round) {
      throw new NotFoundException(`Round ${roundId} not found`);
    }

    if (round.userId !== activeUserId) {
      throw new ForbiddenException('Access denied to this round');
    }

    const cur = this.parseCard(round.currentCard);
    const nxt = round.nextCard ? this.parseCard(round.nextCard) : null;

    return {
      id: round.id,
      roundId: round.roundId,
      currentCard: round.currentCard,
      currentCardDetails: cur,
      choice: round.playerChoice,
      nextCard: round.nextCard,
      nextCardDetails: nxt,
      betAmount: Number(round.betAmount),
      result: round.result,
      profit: Number(round.profit),
      payout: Number(round.payout),
      status: round.status,
      balanceBefore: Number(round.balanceBefore),
      balanceAfter: round.balanceAfter !== null ? Number(round.balanceAfter) : null,
      createdAt: round.createdAt,
      completedAt: round.completedAt,
    };
  }

  /**
   * STEP 5: ADMIN STATS
   */
  async getAdminStats() {
    const [totalRounds, totalCompleted, totalWins, totalLosses, aggregateWagered, aggregatePayouts] =
      await Promise.all([
        this.db.hiloRound.count(),
        this.db.hiloRound.count({ where: { status: 'COMPLETED' } }),
        this.db.hiloRound.count({ where: { result: 'WIN' } }),
        this.db.hiloRound.count({ where: { result: 'LOSS' } }),
        this.db.hiloRound.aggregate({
          _sum: { betAmount: true },
          where: { status: 'COMPLETED' },
        }),
        this.db.hiloRound.aggregate({
          _sum: { payout: true },
          where: { status: 'COMPLETED' },
        }),
      ]);

    const totalWagered = Number(aggregateWagered._sum.betAmount || 0);
    const totalPayouts = Number(aggregatePayouts._sum.payout || 0);
    const netHouseProfit = totalWagered - totalPayouts;

    return {
      totalRounds,
      totalCompleted,
      totalWins,
      totalLosses,
      winRate: totalCompleted > 0 ? (totalWins / totalCompleted) * 100 : 0,
      totalWagered,
      totalPayouts,
      netHouseProfit,
    };
  }

  // ─────────────────────────────────────────────────────────
  // CONTINUOUS PLAY + CASHOUT SESSION SYSTEM
  // ─────────────────────────────────────────────────────────

  /**
   * Calculates actual probability-based dynamic multipliers
   * Formula:
   * P(up) = higherCards / remainingCards
   * P(down) = lowerCards / remainingCards
   * Multiplier = (1 - houseEdge) / P(direction)
   * Configurable house edge = 5% (0.05)
   */
  public calculateMultipliers(
    currentRank: number,
    remainingDeck: Card[],
    houseEdge = 0.05,
  ): MultiplierCalculation {
    const remainingCount = remainingDeck.length;
    if (remainingCount === 0) {
      return {
        upMultiplier: null,
        downMultiplier: null,
        sameMultiplier: 14.99,
        canUp: false,
        canDown: false,
        canSame: false,
        higherCount: 0,
        lowerCount: 0,
        sameCount: 0,
        remainingCount: 0,
      };
    }

    const higherCount = remainingDeck.filter((c) => c.rankValue > currentRank).length;
    const lowerCount = remainingDeck.filter((c) => c.rankValue < currentRank).length;
    const sameCount = remainingDeck.filter((c) => c.rankValue === currentRank).length;

    let upMultiplier: number | null = null;
    let downMultiplier: number | null = null;

    if (higherCount > 0) {
      const pUp = higherCount / remainingCount;
      const rawUp = (1 - houseEdge) / pUp;
      upMultiplier = Math.max(1.01, Math.round(rawUp * 100) / 100);
    }

    if (lowerCount > 0) {
      const pDown = lowerCount / remainingCount;
      const rawDown = (1 - houseEdge) / pDown;
      downMultiplier = Math.max(1.01, Math.round(rawDown * 100) / 100);
    }

    // Fixed 14.99x for SAME prediction as requested
    const sameMultiplier = 14.99;
    const canSame = sameCount > 0;

    return {
      upMultiplier,
      downMultiplier,
      sameMultiplier,
      canUp: upMultiplier !== null,
      canDown: downMultiplier !== null,
      canSame,
      higherCount,
      lowerCount,
      sameCount,
      remainingCount,
    };
  }

  /**
   * Get preview card and baseline multipliers for initial game view before bet
   */
  public async getInitialPreview(cardCode?: string) {
    let currentCard: Card;
    if (cardCode) {
      currentCard = this.parseCard(cardCode);
    } else {
      const deck = this.shuffleDeck(this.generateDeck());
      currentCard = deck[0];
    }
    const fullDeck = this.generateDeck();
    const remainingDeck = fullDeck.filter((c) => c.code !== currentCard.code);
    const mults = this.calculateMultipliers(currentCard.rankValue, remainingDeck);
    const config = await this.getGameConfig();

    return {
      currentCard,
      upMultiplier: mults.upMultiplier,
      downMultiplier: mults.downMultiplier,
      sameMultiplier: mults.sameMultiplier,
      canUp: mults.canUp,
      canDown: mults.canDown,
      canSame: mults.canSame,
      higherCount: mults.higherCount,
      lowerCount: mults.lowerCount,
      sameCount: mults.sameCount,
      remainingCardsCount: remainingDeck.length,
      config,
    };
  }

  /**
   * INITIALIZE OR GET SESSION (WHEN USER ENTERS HILO)
   * 1. If existingSessionId is provided and exists with status READY or ACTIVE, reuses it.
   * 2. If user has an ACTIVE session, returns it.
   * 3. If user has a READY session, returns that exact session with its saved currentCard!
   * 4. Otherwise: creates a fresh session, shuffles deck ONCE, draws ONE initial card,
   *    saves status = READY in database, and returns it.
   * This card will REMAIN FIXED until a prediction is resolved!
   */
  async initOrGetSession(userId: string, existingSessionId?: string) {
    const { activeUserId } = await this.getOrCreateWallet(userId);
    let session: any = null;

    // 0. If existingSessionId provided, check if valid & active/ready
    if (existingSessionId) {
      const existing = await this.db.hiloSession.findUnique({
        where: { sessionId: existingSessionId },
        include: {
          plays: {
            orderBy: { sequenceNumber: 'asc' },
          },
        },
      });
      if (existing && (existing.status === 'READY' || existing.status === 'ACTIVE')) {
        // If it was created with DEMO/different user and is still READY, claim it for activeUserId
        if (existing.userId !== activeUserId && existing.status === 'READY') {
          session = await this.db.hiloSession.update({
            where: { id: existing.id },
            data: { userId: activeUserId },
            include: {
              plays: {
                orderBy: { sequenceNumber: 'asc' },
              },
            },
          });
        } else {
          session = existing;
        }
      }
    }

    // 1. Check for existing ACTIVE session first
    if (!session) {
      session = await this.db.hiloSession.findFirst({
        where: {
          userId: activeUserId,
          status: 'ACTIVE',
        },
        include: {
          plays: {
            orderBy: { sequenceNumber: 'asc' },
          },
        },
      });
    }

    // 2. If no ACTIVE session, check for existing READY session
    if (!session) {
      session = await this.db.hiloSession.findFirst({
        where: {
          userId: activeUserId,
          status: 'READY',
        },
        orderBy: { createdAt: 'desc' },
        include: {
          plays: {
            orderBy: { sequenceNumber: 'asc' },
          },
        },
      });
    }

    // 3. If neither exists, generate deck ONCE, pick initial card, and save as READY
    if (!session) {
      const deck = this.shuffleDeck(this.generateDeck());
      const initialCard = deck[0];
      const remainingDeck = deck.slice(1);

      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const uniqueSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const sessionId = `HILO-${todayStr}-${uniqueSuffix}`;

      session = await this.db.hiloSession.create({
        data: {
          sessionId,
          userId: activeUserId,
          originalBet: 0,
          currentCard: initialCard.code,
          currentRank: initialCard.rankValue,
          currentSuit: initialCard.suit,
          currentMultiplier: 1.0000,
          cashoutMultiplier: 1.0000,
          currentCashoutAmount: 0,
          remainingDeck: remainingDeck as any,
          status: 'READY',
        },
        include: {
          plays: true,
        },
      });
    }

    const currentCard = this.parseCard(session.currentCard);
    const remainingDeck = (session.remainingDeck as Card[]) || [];
    const mults = this.calculateMultipliers(currentCard.rankValue, remainingDeck);
    const config = await this.getGameConfig();

    return {
      config,
      session: {
        sessionId: session.sessionId,
        originalBet: Number(session.originalBet),
        currentCard,
        currentMultiplier: Number(session.currentMultiplier),
        cashoutMultiplier: Number(session.cashoutMultiplier),
        currentCashoutAmount: Number(session.currentCashoutAmount),
        upMultiplier: mults.upMultiplier,
        downMultiplier: mults.downMultiplier,
        sameMultiplier: mults.sameMultiplier,
        canUp: mults.canUp,
        canDown: mults.canDown,
        canSame: mults.canSame,
        remainingCardsCount: remainingDeck.length,
        status: session.status,
        createdAt: session.createdAt,
        plays: (session.plays || []).map((p: any) => ({
          id: p.id,
          sequence: p.sequenceNumber,
          previousCard: this.parseCard(p.previousCard),
          nextCard: this.parseCard(p.nextCard),
          choice: p.choice,
          result: p.result,
          predictionMultiplier: Number(p.predictionMultiplier),
          multiplierAfterPlay: Number(p.multiplierAfterPlay),
          cashoutAfterPlay: Number(p.cashoutAfterPlay),
          createdAt: p.createdAt,
        })),
      },
    };
  }

  /**
   * START HILO SESSION (DEDUCTS BET ONCE, CHANGES STATUS READY -> ACTIVE)
   * CRITICAL REQUIREMENT:
   * Clicking START GAME must NEVER generate a new current card.
   * Keeps the EXACT SAME current_card and exact same remainingDeck!
   */
  async startSession(userId: string, betAmount: number, sessionIdInput?: string) {
    const config = await this.getGameConfig();
    if (!config.isActive) {
      throw new BadRequestException('HILO game is currently inactive');
    }

    const amount = Number(betAmount);
    if (isNaN(amount) || amount < config.minBet) {
      throw new BadRequestException(`Minimum bet amount is ₹${config.minBet}`);
    }
    if (amount > config.maxBet) {
      throw new BadRequestException(`Maximum bet amount is ₹${config.maxBet}`);
    }

    const { activeUserId, wallet } = await this.getOrCreateWallet(userId);

    // Find the session to start
    let session = sessionIdInput
      ? await this.db.hiloSession.findUnique({
          where: { sessionId: sessionIdInput },
          include: { plays: true },
        })
      : await this.db.hiloSession.findFirst({
          where: { userId: activeUserId, status: 'READY' },
          orderBy: { createdAt: 'desc' },
          include: { plays: true },
        });

    // If no READY session exists, initialize one first
    if (!session || (session.status !== 'READY' && session.status !== 'ACTIVE')) {
      const initRes = await this.initOrGetSession(activeUserId);
      session = await this.db.hiloSession.findUnique({
        where: { sessionId: initRes.session.sessionId },
        include: { plays: true },
      });
    }

    // If session is already ACTIVE, return it directly without modifying currentCard!
    if (session.status === 'ACTIVE') {
      const currentCard = this.parseCard(session.currentCard);
      const remainingDeck = (session.remainingDeck as Card[]) || [];
      const mults = this.calculateMultipliers(currentCard.rankValue, remainingDeck);
      const freshWallet = await this.db.wallet.findUnique({ where: { id: wallet.id } });

      return {
        sessionId: session.sessionId,
        originalBet: Number(session.originalBet),
        currentCard,
        currentMultiplier: Number(session.currentMultiplier),
        cashoutMultiplier: Number(session.cashoutMultiplier),
        currentCashoutAmount: Number(session.currentCashoutAmount),
        upMultiplier: mults.upMultiplier,
        downMultiplier: mults.downMultiplier,
        sameMultiplier: mults.sameMultiplier,
        canUp: mults.canUp,
        canDown: mults.canDown,
        canSame: mults.canSame,
        remainingCardsCount: remainingDeck.length,
        status: 'ACTIVE',
        balance: Number(freshWallet?.mainBalance ?? 0),
        playsCount: session.plays?.length || 0,
        createdAt: session.createdAt,
      };
    }

    // Atomic transaction: Deduct bet once, record wallet transaction, update status READY -> ACTIVE
    // CRITICAL: currentCard, currentRank, currentSuit, remainingDeck are PRESERVED!
    const [updatedSession, updatedWallet] = await this.db.$transaction(async (tx: any) => {
      const freshWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      const currentBalance = Number(freshWallet.mainBalance);

      if (currentBalance < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const balanceAfter = Math.round((currentBalance - amount) * 100) / 100;

      const uWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          mainBalance: balanceAfter,
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'HILO_BET',
          amount: amount,
          balanceBefore: currentBalance,
          balanceAfter: balanceAfter,
          referenceType: 'HILO',
          referenceId: session.sessionId,
          metadata: {
            sessionId: session.sessionId,
            betAmount: amount,
            initialCard: session.currentCard,
          },
        },
      });

      const uSession = await tx.hiloSession.update({
        where: { id: session.id },
        data: {
          userId: activeUserId,
          originalBet: amount,
          currentMultiplier: 1.0000,
          cashoutMultiplier: 1.0000,
          currentCashoutAmount: amount,
          status: 'ACTIVE',
        },
      });

      return [uSession, uWallet];
    });

    if (activeUserId !== this.DEMO_UUID) {
      this.referralService.processBetCommission(activeUserId, amount).catch(() => null);
    }

    const currentCard = this.parseCard(updatedSession.currentCard);
    const remainingDeck = (updatedSession.remainingDeck as Card[]) || [];
    const mults = this.calculateMultipliers(currentCard.rankValue, remainingDeck);

    return {
      sessionId: updatedSession.sessionId,
      originalBet: amount,
      currentCard,
      currentMultiplier: 1.0,
      cashoutMultiplier: 1.0,
      currentCashoutAmount: amount,
      upMultiplier: mults.upMultiplier,
      downMultiplier: mults.downMultiplier,
      sameMultiplier: mults.sameMultiplier,
      canUp: mults.canUp,
      canDown: mults.canDown,
      canSame: mults.canSame,
      remainingCardsCount: remainingDeck.length,
      status: 'ACTIVE',
      balance: Number(updatedWallet.mainBalance),
      playsCount: 0,
      createdAt: updatedSession.createdAt,
    };
  }

  /**
   * GET ACTIVE SESSION FOR USER
   * If an active or ready session exists, returns it; otherwise initializes a READY session.
   */
  async getActiveSession(userId: string, existingSessionId?: string) {
    const res = await this.initOrGetSession(userId, existingSessionId);
    return res;
  }

  /**
   * PLAY PREDICTION (UP / DOWN)
   * When user clicks UP or DOWN:
   * 1. If still READY, starts session and deducts bet once, keeping exact same current card.
   * 2. Draws NEXT CARD from remainingDeck.
   * 3. Current card is NEVER changed before next card is revealed.
   * 4. If WIN: ONLY NOW does currentCard become nextCard. Game stays ACTIVE.
   * 5. If LOSS: game ends, status becomes LOST.
   */
  async playPrediction(
    userId: string,
    sessionId: string,
    choiceInput: string,
    betAmountIfReady?: number,
  ) {
    const choice = choiceInput ? (choiceInput.toUpperCase().trim() as HiloChoiceType) : null;
    if (choice !== 'UP' && choice !== 'DOWN' && choice !== 'SAME') {
      throw new BadRequestException('Invalid choice. Must be UP, SAME, or DOWN');
    }

    const activeUserId = this.toValidUserId(userId);
    const { wallet } = await this.getOrCreateWallet(activeUserId);

    return this.db.$transaction(async (tx: any) => {
      let session = await tx.hiloSession.findUnique({
        where: { sessionId },
        include: { plays: true },
      });

      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      if (session.userId !== activeUserId) {
        if (session.status === 'READY') {
          session = await tx.hiloSession.update({
            where: { id: session.id },
            data: { userId: activeUserId },
            include: { plays: true },
          });
        } else {
          throw new ForbiddenException('Access denied to this session');
        }
      }

      // If user clicked UP or DOWN while session is still READY, start it automatically in this transaction!
      if (session.status === 'READY') {
        const betAmt = Number(betAmountIfReady) || 100;
        const freshWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
        const currentBalance = Number(freshWallet.mainBalance);

        if (currentBalance < betAmt) {
          throw new BadRequestException('Insufficient wallet balance');
        }

        const balanceAfter = Math.round((currentBalance - betAmt) * 100) / 100;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { mainBalance: balanceAfter },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'HILO_BET',
            amount: betAmt,
            balanceBefore: currentBalance,
            balanceAfter: balanceAfter,
            referenceType: 'HILO',
            referenceId: session.sessionId,
            metadata: {
              sessionId: session.sessionId,
              betAmount: betAmt,
              initialCard: session.currentCard,
            },
          },
        });

        session = await tx.hiloSession.update({
          where: { id: session.id },
          data: {
            originalBet: betAmt,
            currentMultiplier: 1.0000,
            cashoutMultiplier: 1.0000,
            currentCashoutAmount: betAmt,
            status: 'ACTIVE',
          },
          include: { plays: true },
        });
      }

      if (session.status !== 'ACTIVE') {
        throw new BadRequestException(`This session is already ${session.status.toLowerCase()}`);
      }

      const currentCard = this.parseCard(session.currentCard);
      const remainingDeck = (session.remainingDeck as Card[]) || [];

      if (remainingDeck.length === 0) {
        throw new BadRequestException('The deck is completely exhausted. Please cash out or start a new game.');
      }

      const currentMults = this.calculateMultipliers(currentCard.rankValue, remainingDeck);
      if (choice === 'UP' && !currentMults.canUp) {
        throw new BadRequestException('Higher prediction is not possible for this card.');
      }
      if (choice === 'DOWN' && !currentMults.canDown) {
        throw new BadRequestException('Lower prediction is not possible for this card.');
      }
      if (choice === 'SAME' && !currentMults.canSame) {
        throw new BadRequestException('Same rank prediction is not possible because no cards of this rank remain.');
      }

      let predMultiplier = 1.0;
      if (choice === 'UP') {
        predMultiplier = currentMults.upMultiplier!;
      } else if (choice === 'DOWN') {
        predMultiplier = currentMults.downMultiplier!;
      } else if (choice === 'SAME') {
        predMultiplier = 14.99;
      }

      // Handle optional testing override
      const overrideVal = this.overrideService.getOverride('hilo');
      let nextCard = remainingDeck[0];
      if (overrideVal !== null && overrideVal !== undefined) {
        const clean = String(overrideVal).trim().toUpperCase();
        if (clean === 'WIN' || clean === 'FORCE_WIN') {
          const winningCards = remainingDeck.filter((c) =>
            choice === 'UP'
              ? c.rankValue > currentCard.rankValue
              : choice === 'DOWN'
              ? c.rankValue < currentCard.rankValue
              : c.rankValue === currentCard.rankValue,
          );
          if (winningCards.length > 0) {
            nextCard = winningCards[crypto.randomInt(0, winningCards.length)];
          }
        } else if (clean === 'LOSE' || clean === 'FORCE_LOSE' || clean === 'LOSS') {
          const losingCards = remainingDeck.filter((c) =>
            choice === 'UP'
              ? c.rankValue <= currentCard.rankValue
              : choice === 'DOWN'
              ? c.rankValue >= currentCard.rankValue
              : c.rankValue !== currentCard.rankValue,
          );
          if (losingCards.length > 0) {
            nextCard = losingCards[crypto.randomInt(0, losingCards.length)];
          }
        } else if (clean === 'SAME' || clean === 'FORCE_SAME') {
          const sameCards = remainingDeck.filter((c) => c.rankValue === currentCard.rankValue);
          if (sameCards.length > 0) {
            nextCard = sameCards[crypto.randomInt(0, sameCards.length)];
          }
        } else if (clean === 'HIGH' || clean === 'FORCE_HIGH') {
          const highCards = remainingDeck.filter((c) => c.rankValue >= 10);
          if (highCards.length > 0) {
            nextCard = highCards[crypto.randomInt(0, highCards.length)];
          }
        } else if (clean === 'LOW' || clean === 'FORCE_LOW') {
          const lowCards = remainingDeck.filter((c) => c.rankValue <= 5);
          if (lowCards.length > 0) {
            nextCard = lowCards[crypto.randomInt(0, lowCards.length)];
          }
        }
      } else {
        // Dynamic Winning Chance (RTP %) algorithm configured by Admin
        const config = await this.getGameConfig();
        const rtp = config.rtpPercentage;
        const winProbability = Math.max(0.01, Math.min(0.99, rtp / 100));
        const roll = Math.random();

        const winningCards = remainingDeck.filter((c) =>
          choice === 'UP'
            ? c.rankValue > currentCard.rankValue
            : choice === 'DOWN'
            ? c.rankValue < currentCard.rankValue
            : c.rankValue === currentCard.rankValue,
        );
        const losingCards = remainingDeck.filter((c) =>
          choice === 'UP'
            ? c.rankValue <= currentCard.rankValue
            : choice === 'DOWN'
            ? c.rankValue >= currentCard.rankValue
            : c.rankValue !== currentCard.rankValue,
        );

        if (roll < winProbability && winningCards.length > 0) {
          nextCard = winningCards[crypto.randomInt(0, winningCards.length)];
        } else if (losingCards.length > 0) {
          nextCard = losingCards[crypto.randomInt(0, losingCards.length)];
        }
      }

      // Filter nextCard out of remaining deck
      const nextRemainingDeck = remainingDeck.filter((c) => c.code !== nextCard.code);

      // Compare:
      // SAME: nextRank === currentRank -> WIN
      // UP: nextRank > currentRank -> WIN (same rank is strictly LOSS)
      // DOWN: nextRank < currentRank -> WIN (same rank is strictly LOSS)
      const isSameRank = nextCard.rankValue === currentCard.rankValue;
      let isWin = false;
      if (choice === 'SAME') {
        isWin = isSameRank;
      } else if (!isSameRank) {
        if (choice === 'UP') {
          isWin = nextCard.rankValue > currentCard.rankValue;
        } else if (choice === 'DOWN') {
          isWin = nextCard.rankValue < currentCard.rankValue;
        }
      }

      const originalBet = Number(session.originalBet);
      const sequenceNumber = (session.plays?.length || 0) + 1;

      if (isWin) {
        const prevMultiplier = Number(session.currentMultiplier) || 1.0;
        const newMultiplier = Math.round(prevMultiplier * predMultiplier * 100) / 100;
        const newCashoutAmount = Math.round(originalBet * newMultiplier * 100) / 100;

        // Calculate next prediction multipliers from nextRemainingDeck
        const nextMults = this.calculateMultipliers(nextCard.rankValue, nextRemainingDeck);

        await tx.hiloPlay.create({
          data: {
            sessionId: session.id,
            userId: activeUserId,
            sequenceNumber,
            previousCard: currentCard.code,
            previousRank: currentCard.rankValue,
            choice,
            predictionMultiplier: predMultiplier,
            nextCard: nextCard.code,
            nextRank: nextCard.rankValue,
            result: 'WIN',
            multiplierAfterPlay: newMultiplier,
            cashoutAfterPlay: newCashoutAmount,
          },
        });

        // CRITICAL: Now and only now does nextCard become the currentCard in database!
        await tx.hiloSession.update({
          where: { id: session.id },
          data: {
            currentCard: nextCard.code,
            currentRank: nextCard.rankValue,
            currentSuit: nextCard.suit,
            currentMultiplier: newMultiplier,
            cashoutMultiplier: newMultiplier,
            currentCashoutAmount: newCashoutAmount,
            remainingDeck: nextRemainingDeck as any,
          },
        });

        return {
          sessionId: session.sessionId,
          isWin: true,
          result: 'WIN',
          choice,
          previousCard: currentCard,
          nextCard,
          isSameRank,
          predictionMultiplier: predMultiplier,
          currentMultiplier: newMultiplier,
          cashoutMultiplier: newMultiplier,
          currentCashoutAmount: newCashoutAmount,
          upMultiplier: nextMults.upMultiplier,
          downMultiplier: nextMults.downMultiplier,
          sameMultiplier: nextMults.sameMultiplier,
          canUp: nextMults.canUp,
          canDown: nextMults.canDown,
          canSame: nextMults.canSame,
          remainingCardsCount: nextRemainingDeck.length,
          status: 'ACTIVE',
          sequenceNumber,
        };
      } else {
        // LOSS
        const lostCashout = Number(session.currentCashoutAmount);

        await tx.hiloPlay.create({
          data: {
            sessionId: session.id,
            userId: activeUserId,
            sequenceNumber,
            previousCard: currentCard.code,
            previousRank: currentCard.rankValue,
            choice,
            predictionMultiplier: predMultiplier,
            nextCard: nextCard.code,
            nextRank: nextCard.rankValue,
            result: 'LOSS',
            multiplierAfterPlay: 0,
            cashoutAfterPlay: 0,
          },
        });

        await tx.hiloSession.update({
          where: { id: session.id },
          data: {
            currentCard: nextCard.code,
            currentRank: nextCard.rankValue,
            currentSuit: nextCard.suit,
            currentCashoutAmount: 0,
            status: 'LOST',
            endedAt: new Date(),
          },
        });

        return {
          sessionId: session.sessionId,
          isWin: false,
          result: 'LOSS',
          choice,
          isSameRank,
          previousCard: currentCard,
          nextCard,
          originalBet,
          lostCashout,
          status: 'LOST',
          sequenceNumber,
        };
      }
    });
  }

  /**
   * RESET / NEW SESSION (Called when clicking PLAY AGAIN)
   * Cancels old session and initializes a brand new READY session with a fresh deck and card!
   */
  async resetOrNewSession(userId: string) {
    try {
      const { activeUserId } = await this.getOrCreateWallet(userId);

      // Clean up orphaned unplayed sessions; NEVER overwrite CASHED_OUT or LOST
      try {
        await this.db.hiloSession.deleteMany({
          where: {
            userId: activeUserId,
            status: 'READY',
            originalBet: 0,
            plays: { none: {} },
          },
        });

        await this.db.hiloSession.updateMany({
          where: {
            userId: activeUserId,
            status: 'ACTIVE',
          },
          data: {
            status: 'LOST',
            currentCashoutAmount: 0,
            endedAt: new Date(),
          },
        });
      } catch (e) {
        console.error('Failed to clean previous sessions in reset:', e);
      }

      // Generate fresh 52 deck and shuffle ONCE
      const deck = this.shuffleDeck(this.generateDeck());
      const initialCard = deck[0];
      const remainingDeck = deck.slice(1);

      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const uniqueSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const sessionId = `HILO-${todayStr}-${uniqueSuffix}`;

      const mults = this.calculateMultipliers(initialCard.rankValue, remainingDeck);

      const session = await this.db.hiloSession.create({
        data: {
          sessionId,
          userId: activeUserId,
          originalBet: 0,
          currentCard: initialCard.code,
          currentRank: initialCard.rankValue,
          currentSuit: initialCard.suit,
          currentMultiplier: 1.0000,
          cashoutMultiplier: 1.0000,
          currentCashoutAmount: 0,
          remainingDeck: remainingDeck as any,
          status: 'READY',
        },
      });

      return {
        session: {
          sessionId: session.sessionId,
          originalBet: 0,
          currentCard: initialCard,
          currentMultiplier: 1.0,
          cashoutMultiplier: 1.0,
          currentCashoutAmount: 0,
          upMultiplier: mults.upMultiplier,
          downMultiplier: mults.downMultiplier,
          sameMultiplier: mults.sameMultiplier,
          canUp: mults.canUp,
          canDown: mults.canDown,
          canSame: mults.canSame,
          remainingCardsCount: remainingDeck.length,
          status: 'READY',
          createdAt: session.createdAt,
          plays: [],
        },
      };
    } catch (err: any) {
      console.error('RESET OR NEW SESSION FAILED:', err);
      throw err;
    }
  }

  /**
   * CASHOUT FROM ACTIVE SESSION
   * Credits the accumulated cashout amount to the user's wallet.
   * Marks session as CASHED_OUT.
   */
  async cashoutSession(userId: string, sessionId: string) {
    const activeUserId = this.toValidUserId(userId);
    const { wallet } = await this.getOrCreateWallet(activeUserId);

    return this.db.$transaction(async (tx: any) => {
      const session = await tx.hiloSession.findUnique({
        where: { sessionId },
      });

      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      if (session.userId !== activeUserId) {
        throw new ForbiddenException('Access denied to this session');
      }

      if (session.status !== 'ACTIVE') {
        throw new BadRequestException(`Session is already ${session.status.toLowerCase()}`);
      }

      const cashoutAmount = Number(session.currentCashoutAmount);
      if (isNaN(cashoutAmount) || cashoutAmount <= 0) {
        throw new BadRequestException('No cashout amount available to collect');
      }

      const freshWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      const currentBal = Number(freshWallet.mainBalance);
      const balanceAfter = Math.round((currentBal + cashoutAmount) * 100) / 100;
      const originalBet = Number(session.originalBet);
      const netProfit = Math.round((cashoutAmount - originalBet) * 100) / 100;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          mainBalance: balanceAfter,
          totalWinnings: { increment: cashoutAmount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'HILO_WIN',
          amount: cashoutAmount,
          balanceBefore: currentBal,
          balanceAfter: balanceAfter,
          referenceType: 'HILO',
          referenceId: session.sessionId,
          metadata: {
            sessionId: session.sessionId,
            originalBet,
            finalMultiplier: Number(session.cashoutMultiplier),
            cashoutAmount,
            netProfit,
          },
        },
      });

      const updatedSession = await tx.hiloSession.update({
        where: { id: session.id },
        data: {
          status: 'CASHED_OUT',
          endedAt: new Date(),
        },
      });

      return {
        sessionId: updatedSession.sessionId,
        status: updatedSession.status,
        originalBet,
        finalMultiplier: Number(updatedSession.cashoutMultiplier),
        cashoutAmount,
        netProfit,
        balance: balanceAfter,
      };
    });
  }

  /**
   * GET USER SESSION HISTORY (WITH FULL PLAYS LIST)
   */
  async getSessionHistory(userId: string, page = 1, limit = 10) {
    const take = Math.min(50, Math.max(1, Number(limit) || 10));
    const pageNum = Math.max(1, Number(page) || 1);
    const skip = (pageNum - 1) * take;

    if (!userId || userId === this.DEMO_UUID || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return {
        total: 0,
        totalPages: 1,
        page: pageNum,
        limit: take,
        items: [],
        sessions: [],
      };
    }

    const activeUserId = this.toValidUserId(userId);
    const [total, sessions] = await Promise.all([
      this.db.hiloSession.count({
        where: {
          userId: activeUserId,
          status: { in: ['CASHED_OUT', 'LOST', 'COMPLETED', 'ACTIVE'] },
          originalBet: { gt: 0 },
        },
      }),
      this.db.hiloSession.findMany({
        where: {
          userId: activeUserId,
          status: { in: ['CASHED_OUT', 'LOST', 'COMPLETED', 'ACTIVE'] },
          originalBet: { gt: 0 },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          plays: {
            orderBy: { sequenceNumber: 'asc' },
          },
        },
        skip,
        take,
      }),
    ]);

    const formatted = sessions.map((s: any) => {
      const plays = (s.plays || []).map((p: any) => ({
        id: p.id,
        sequence: p.sequenceNumber,
        previousCard: this.parseCard(p.previousCard),
        nextCard: this.parseCard(p.nextCard),
        choice: p.choice,
        result: p.result,
        predictionMultiplier: Number(p.predictionMultiplier),
        multiplierAfterPlay: Number(p.multiplierAfterPlay),
        cashoutAfterPlay: Number(p.cashoutAfterPlay),
        createdAt: p.createdAt,
      }));

      const winningPlays = plays.filter((p: any) => p.result === 'WIN');
      const highestMultiplier = winningPlays.length > 0
        ? Math.max(...winningPlays.map((p: any) => p.multiplierAfterPlay))
        : 1.0;

      const lastPlay = plays.length > 0 ? plays[plays.length - 1] : null;
      const bet = Number(s.originalBet);
      const isWin = s.status === 'CASHED_OUT' || (s.status !== 'LOST' && Number(s.currentCashoutAmount) > 0 && s.status !== 'ACTIVE');
      const payout = isWin ? Number(s.currentCashoutAmount) : 0;
      const profit = isWin ? Math.round((payout - bet) * 100) / 100 : -bet;
      const multiplier = isWin
        ? (Number(s.cashoutMultiplier) > 1 ? Number(s.cashoutMultiplier) : (lastPlay ? lastPlay.multiplierAfterPlay : 1.0))
        : (lastPlay ? lastPlay.multiplierAfterPlay : Number(s.currentMultiplier));

      return {
        id: s.id,
        sessionId: s.sessionId,
        originalBet: bet,
        betAmount: bet,
        payout,
        profit,
        multiplier,
        currentCard: lastPlay ? lastPlay.previousCard : this.parseCard(s.currentCard),
        nextCard: lastPlay ? lastPlay.nextCard : null,
        choice: lastPlay ? lastPlay.choice : null,
        result: isWin ? 'WIN' : (s.status === 'ACTIVE' ? 'ACTIVE' : 'LOSS'),
        finalMultiplier: Number(s.cashoutMultiplier),
        highestMultiplier,
        cashoutAmount: payout,
        status: isWin ? 'CASHED_OUT' : (s.status === 'LOST' ? 'LOST' : s.status),
        predictionsCount: plays.length,
        plays,
        createdAt: s.createdAt,
        endedAt: s.endedAt,
      };
    });

    const totalPages = Math.ceil(total / take) || 1;

    return {
      total,
      totalPages,
      page: pageNum,
      limit: take,
      items: formatted,
      sessions: formatted,
    };
  }

  /**
   * GET SINGLE SESSION DETAILS
   */
  async getSessionDetails(userId: string, sessionId: string) {
    const activeUserId = this.toValidUserId(userId);
    const session = await this.db.hiloSession.findUnique({
      where: { sessionId },
      include: {
        plays: {
          orderBy: { sequenceNumber: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.userId !== activeUserId) {
      throw new ForbiddenException('Access denied to this session');
    }

    const currentCard = this.parseCard(session.currentCard);
    const remainingDeck = (session.remainingDeck as Card[]) || [];
    const mults = this.calculateMultipliers(currentCard.rankValue, remainingDeck);

    const plays = (session.plays || []).map((p: any) => ({
      id: p.id,
      sequence: p.sequenceNumber,
      previousCard: this.parseCard(p.previousCard),
      nextCard: this.parseCard(p.nextCard),
      choice: p.choice,
      result: p.result,
      predictionMultiplier: Number(p.predictionMultiplier),
      multiplierAfterPlay: Number(p.multiplierAfterPlay),
      cashoutAfterPlay: Number(p.cashoutAfterPlay),
      createdAt: p.createdAt,
    }));

    return {
      id: session.id,
      sessionId: session.sessionId,
      originalBet: Number(session.originalBet),
      currentCard,
      currentMultiplier: Number(session.currentMultiplier),
      cashoutMultiplier: Number(session.cashoutMultiplier),
      currentCashoutAmount: Number(session.currentCashoutAmount),
      upMultiplier: mults.upMultiplier,
      downMultiplier: mults.downMultiplier,
      canUp: mults.canUp,
      canDown: mults.canDown,
      remainingCardsCount: remainingDeck.length,
      status: session.status,
      plays,
      createdAt: session.createdAt,
      endedAt: session.endedAt,
    };
  }
}

