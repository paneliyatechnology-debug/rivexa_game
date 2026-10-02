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

  private async getGameConfig() {
    try {
      const dbGame = await this.db.game.findFirst({ where: { slug: 'hilo' } });
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
      } else if (cleanOverride === 'LOSE' || cleanOverride === 'FORCE_LOSE') {
        const losingCards = remainingDeck.filter((c) =>
          choice === 'UP' ? c.rankValue <= currentCard.rankValue : c.rankValue >= currentCard.rankValue
        );
        if (losingCards.length > 0) {
          nextCard = losingCards[crypto.randomInt(0, losingCards.length)];
        }
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
  async getHistory(userId: string, page = 1, limit = 20) {
    const activeUserId = this.toValidUserId(userId);
    const take = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;

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

    return {
      total,
      page: Number(page) || 1,
      limit: take,
      rounds: formatted,
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
}
