import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { ReferralService } from '../../referral/referral.service.js';
import { GameOverrideService } from '../game-engine/game-override.service.js';
import * as crypto from 'crypto';

@Injectable()
export class MinesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly referralService: ReferralService,
    private readonly overrideService: GameOverrideService,
  ) {}

  private readonly ALLOWED_MINES = [1, 3, 5, 10, 15, 20];

  /**
   * Secure server-side random mine generator (0-24 grid).
   * Traceable to Laravel: App\Services\MineGeneratorService::generateMinePositions
   */
  private generateMinePositions(mineCount: number, gridSize: number = 25): number[] {
    if (mineCount <= 0 || mineCount >= gridSize) {
      throw new BadRequestException(`Invalid mine count (${mineCount}) for grid size ${gridSize}.`);
    }

    const minePositions: number[] = [];
    while (minePositions.length < mineCount) {
      const pos = crypto.randomInt(0, gridSize);
      if (!minePositions.includes(pos)) {
        minePositions.push(pos);
      }
    }

    minePositions.sort((a, b) => a - b);
    return minePositions;
  }

  /**
   * Calculate dynamic multiplier for Mines game.
   * Traceable to Laravel: App\Services\MineGeneratorService::calculateMultiplier
   * Formula: Product of probability inverse for each safe pick, adjusted for house edge (96% RTP)
   */
  private calculateMultiplier(mineCount: number, safePicks: number, gridSize: number = 25, rtp: number = 0.96): number {
    if (safePicks <= 0) {
      return 1.00;
    }

    let multiplier = 1.00;
    for (let i = 0; i < safePicks; i++) {
      const remainingTotal = gridSize - i;
      const remainingSafe = gridSize - mineCount - i;

      if (remainingSafe <= 0) {
        break;
      }

      multiplier *= remainingTotal / remainingSafe;
    }

    const finalMultiplier = multiplier * rtp;
    return Math.max(1.01, Number(finalMultiplier.toFixed(2)));
  }

  private readonly DEMO_UUID = '00000000-0000-0000-0000-000000000000';

  private toValidUserId(userId?: string): string {
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return userId;
    }
    return this.DEMO_UUID;
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
          create: { userId: activeUserId, mainBalance: activeUserId === this.DEMO_UUID ? 5000.0 : 0.0, bonusBalance: 0.0 },
        });
      } catch (e) {
        // ignore fallback
      }
    }
    return { activeUserId, wallet };
  }

  private async getGameConfig() {
    try {
      const dbGame = await this.db.game.findFirst({ where: { slug: 'mines' } });
      if (dbGame) {
        return {
          minBet: Number(dbGame.minBet || 10),
          maxBet: Number(dbGame.maxBet || 50000),
          rtpPercentage: Number(dbGame.rtpPercentage || 96),
        };
      }
    } catch (e) {}
    return { minBet: 10, maxBet: 50000, rtpPercentage: 96 };
  }

  /**
   * Start a new Mines Game round.
   * Traceable to Laravel: App\Services\MineGameService::startGame
   */
  async startGame(userId: string, betAmount: number, mineCount: number) {
    const parsedMineCount = Math.floor(Number(mineCount)) || 3;
    if (parsedMineCount < 1 || parsedMineCount > 24) {
      throw new BadRequestException(`Invalid mine count specified (${mineCount}). Must be between 1 and 24.`);
    }

    const config = await this.getGameConfig();
    if (!betAmount || betAmount < config.minBet || betAmount > config.maxBet) {
      throw new BadRequestException(`Bet amount must be between ₹${config.minBet} and ₹${config.maxBet.toLocaleString('en-IN')}.`);
    }

    const { activeUserId, wallet } = await this.getOrCreateWallet(userId);
    if (!wallet || Number(wallet.mainBalance) < betAmount) {
      throw new BadRequestException('Insufficient wallet balance. Please deposit to continue.');
    }

    // Check active pending game
    const activeGame = await this.db.minesGame.findFirst({
      where: { userId: activeUserId, status: 'PENDING' },
    });

    if (activeGame) {
      return {
        gameId: activeGame.id,
        betAmount: Number(activeGame.betAmount),
        mineCount: activeGame.mineCount,
        revealedTiles: activeGame.revealedTiles as number[],
        multiplier: Number(activeGame.multiplier),
        status: activeGame.status,
      };
    }

    // Deduct user wallet main balance
    const balanceBefore = Number(wallet.mainBalance);
    const balanceAfter = balanceBefore - betAmount;

    await this.db.wallet.update({
      where: { id: wallet.id },
      data: { mainBalance: balanceAfter },
    });

    const periodNumber = `MINES_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    await this.db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'bet',
        amount: betAmount,
        balanceBefore,
        balanceAfter,
        referenceType: 'mines_game',
        referenceId: periodNumber,
        metadata: { description: `Bet on Mines (${mineCount} Mines)` },
      },
    });

    // Generate secret mine locations securely on server
    const minePositions = this.generateMinePositions(mineCount, 25);

    const newGame = await this.db.minesGame.create({
      data: {
        userId: activeUserId,
        betAmount,
        mineCount,
        minePositions,
        revealedTiles: [],
        multiplier: 1.00,
        status: 'PENDING',
      },
    });

    return {
      gameId: newGame.id,
      betAmount,
      mineCount,
      revealedTiles: [],
      multiplier: 1.00,
      newBalance: balanceAfter.toFixed(2),
      status: 'PENDING',
    };
  }

  /**
   * Process a tile click in Mines Game.
   * Traceable to Laravel: App\Services\MineGameService::revealTile
   */
  async revealTile(userId: string, gameId: string, tileIndex: number) {
    if (tileIndex < 0 || tileIndex > 24) {
      throw new BadRequestException(`Invalid tile index (${tileIndex}). Must be 0-24.`);
    }

    const activeUserId = this.toValidUserId(userId);
    const game = await this.db.minesGame.findUnique({ where: { id: gameId } });
    if (!game || (game.userId !== activeUserId && game.userId !== userId)) {
      throw new NotFoundException('Game not found.');
    }

    if (game.status !== 'PENDING') {
      throw new BadRequestException('Game is already completed.');
    }

    const revealedTiles = (game.revealedTiles as number[]) || [];
    if (revealedTiles.includes(tileIndex)) {
      throw new BadRequestException(`Tile index ${tileIndex} has already been revealed.`);
    }

    let minePositions = (game.minePositions as number[]) || [];
    let isMine = minePositions.includes(tileIndex);

    const activeOverride = this.overrideService.getOverride('mines') || this.overrideService.getOverride('mine');
    if (activeOverride === 'BOOM' || activeOverride === 'BOOM_FIRST' || activeOverride === 'FORCE_MINE' || activeOverride === 'MINE') {
      isMine = true;
      if (!minePositions.includes(tileIndex)) {
        minePositions = [...minePositions, tileIndex];
      }
    } else if (activeOverride === 'FORCE_WIN' || activeOverride === 'SAFE' || activeOverride === 'GEM') {
      isMine = false;
      if (minePositions.includes(tileIndex)) {
        minePositions = minePositions.filter((t) => t !== tileIndex);
      }
    }

    if (isMine) {
      // Game Over - Lost
      const updatedRevealed = [...revealedTiles, tileIndex];
      await this.db.minesGame.update({
        where: { id: gameId },
        data: {
          revealedTiles: updatedRevealed,
          status: 'LOST',
          payout: 0.00,
          multiplier: 0.00,
        },
      });

      // Process 3-tier referral commissions for losing bet
      await this.referralService.processBetCommission(activeUserId, Number(game.betAmount));

      return {
        success: true,
        status: 'LOST',
        isMine: true,
        hitMine: true,
        isGem: false,
        tileIndex,
        multiplier: 0.00,
        payout: 0.00,
        minePositions,
        revealedTiles: updatedRevealed,
        message: 'BOOM! You hit a mine.',
      };
    }

    // Safe Gem Picked
    const updatedRevealed = [...revealedTiles, tileIndex];
    const safePicks = updatedRevealed.length;
    const totalSafeTiles = 25 - game.mineCount;

    const config = await this.getGameConfig();
    const multiplier = this.calculateMultiplier(game.mineCount, safePicks, 25, config.rtpPercentage / 100);
    const profit = Number((Number(game.betAmount) * multiplier).toFixed(2));

    const isAutoWon = safePicks >= totalSafeTiles;

    if (isAutoWon) {
      // Auto cashout on clearing all safe tiles
      const { wallet } = await this.getOrCreateWallet(activeUserId);
      let balanceAfter = 0;

      if (wallet) {
        const balanceBefore = Number(wallet.mainBalance);
        balanceAfter = balanceBefore + profit;

        await this.db.wallet.update({
          where: { id: wallet.id },
          data: { mainBalance: balanceAfter },
        });

        await this.db.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'win',
            amount: profit,
            balanceBefore,
            balanceAfter,
            referenceType: 'mines_game',
            referenceId: gameId,
          },
        });
      }

      await this.db.minesGame.update({
        where: { id: gameId },
        data: {
          revealedTiles: updatedRevealed,
          multiplier,
          payout: profit,
          status: 'WON',
        },
      });

      await this.referralService.processBetCommission(activeUserId, Number(game.betAmount));

      return {
        success: true,
        status: 'WON',
        isMine: false,
        hitMine: false,
        isGem: true,
        tileIndex,
        multiplier: Number(multiplier.toFixed(2)),
        payout: profit,
        currentProfit: profit.toFixed(2),
        winAmount: profit.toFixed(2),
        newBalance: balanceAfter.toFixed(2),
        minePositions,
        revealedTiles: updatedRevealed,
        message: 'CONGRATULATIONS! You cleared all safe tiles!',
      };
    }

    await this.db.minesGame.update({
      where: { id: gameId },
      data: {
        revealedTiles: updatedRevealed,
        multiplier,
        payout: profit,
      },
    });

    return {
      success: true,
      status: 'active',
      isMine: false,
      hitMine: false,
      isGem: true,
      tileIndex,
      multiplier: Number(multiplier.toFixed(2)),
      payout: profit,
      currentProfit: profit.toFixed(2),
      safePicks,
      revealedTiles: updatedRevealed,
    };
  }

  /**
   * Cash out active Mines game.
   * Traceable to Laravel: App\Services\MineGameService::cashoutGame
   */
  async cashout(userId: string, gameId: string) {
    const activeUserId = this.toValidUserId(userId);
    const game = await this.db.minesGame.findUnique({ where: { id: gameId } });
    if (!game || (game.userId !== activeUserId && game.userId !== userId)) {
      throw new NotFoundException('Game not found.');
    }

    if (game.status !== 'PENDING') {
      throw new BadRequestException('Game is already completed.');
    }

    const revealedTiles = (game.revealedTiles as number[]) || [];
    if (revealedTiles.length === 0) {
      throw new BadRequestException('Must open at least one safe tile before cashing out.');
    }

    const currentMultiplier = Number(game.multiplier) || 1.00;
    const winAmount = Number((Number(game.betAmount) * currentMultiplier).toFixed(2));

    const { wallet } = await this.getOrCreateWallet(activeUserId);
    if (!wallet) throw new NotFoundException('Wallet not found');

    const balanceBefore = Number(wallet.mainBalance);
    const balanceAfter = balanceBefore + winAmount;

    await this.db.wallet.update({
      where: { id: wallet.id },
      data: { mainBalance: balanceAfter },
    });

    await this.db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'win',
        amount: winAmount,
        balanceBefore,
        balanceAfter,
        referenceType: 'mines_game',
        referenceId: gameId,
      },
    });

    await this.db.minesGame.update({
      where: { id: gameId },
      data: {
        multiplier: currentMultiplier,
        payout: winAmount,
        status: 'CASHED_OUT',
      },
    });

    await this.referralService.processBetCommission(activeUserId, Number(game.betAmount));

    return {
      success: true,
      status: 'CASHED_OUT',
      winAmount: winAmount.toFixed(2),
      payout: winAmount,
      multiplier: Number(currentMultiplier.toFixed(2)),
      newBalance: balanceAfter.toFixed(2),
      minePositions: game.minePositions,
      message: `Successfully cashed out ₹${winAmount.toFixed(2)}!`,
    };
  }

  /**
   * Get user Mines game history.
   */
  async getHistory(userId: string) {
    const activeUserId = this.toValidUserId(userId);
    const games = await this.db.minesGame.findMany({
      where: { userId: activeUserId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return games.map((g: any) => ({
      id: g.id,
      roundId: g.id.slice(-8).toUpperCase(),
      stake: Number(g.betAmount),
      multiplier: Number(g.multiplier) || 1.0,
      payout: Number(g.payout) || 0,
      status: g.status,
      mineCount: g.mineCount,
      createdAt: g.createdAt,
    }));
  }
}
