import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { GameOverrideService } from '../game-engine/game-override.service.js';
import { PenaltyShootoutService } from './penalty-shootout.service.js';

@Controller('admin/penalty-shootout')
export class AdminPenaltyShootoutController {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly overrideService: GameOverrideService,
    private readonly penaltyService: PenaltyShootoutService,
  ) {}

  @Get('dashboard')
  async getDashboardStats() {
    try {
      const [totalRounds, totalRoundBets, cashedOutRounds, totalSaves, activePlayers] = await Promise.all([
        this.prisma.penaltyShootoutRound.count(),
        this.prisma.penaltyShootoutRound.aggregate({ _sum: { betAmount: true } }),
        this.prisma.penaltyShootoutRound.findMany({
          where: { OR: [{ status: 'CASHED_OUT' }, { status: 'COMPLETED' }, { result: 'CASHOUT' }, { result: 'WIN' }] },
          select: { betAmount: true, currentMultiplier: true, potentialPayout: true },
        }),
        this.prisma.penaltyShootoutRound.count({
          where: { OR: [{ status: 'SAVED' }, { result: 'LOSS' }] },
        }),
        this.prisma.penaltyShootoutRound.count({
          where: { status: 'ACTIVE' },
        }),
      ]);

      const totalWagered = Number(totalRoundBets?._sum?.betAmount || 0);

      const totalPayout = (cashedOutRounds || []).reduce((acc: number, r: any) => {
        const mult = Number(r.currentMultiplier || 1.0);
        const bet = Number(r.betAmount || 0);
        const p = Number(r.potentialPayout || (bet * mult));
        return acc + (p > 0 ? p : bet * mult);
      }, 0);

      const grossProfit = totalWagered - totalPayout;
      const saveRate = totalRounds > 0 ? (totalSaves / totalRounds) * 100 : 0;
      const currentOverride = this.overrideService.getOverride('penalty-shootout') || 'AUTO_RTP';

      return {
        success: true,
        data: {
          totalRounds,
          totalWagered,
          totalPayout,
          grossProfit,
          activePlayers,
          saveRate,
          activeOverride: currentOverride,
        },
      };
    } catch {
      return {
        success: true,
        data: {
          totalRounds: 0,
          totalWagered: 0,
          totalPayout: 0,
          grossProfit: 0,
          activePlayers: 0,
          saveRate: 0,
          activeOverride: 'AUTO_RTP',
        },
      };
    }
  }

  @Get('difficulties')
  async getDifficulties() {
    const diffs = this.penaltyService.getDifficultyConfigs();
    return {
      success: true,
      data: Object.values(diffs),
    };
  }

  @Post('difficulties')
  async updateDifficulty(
    @Body()
    body: {
      slug: string;
      name?: string;
      goalProbability: number;
      multipliers?: number[];
      maxSpots?: number;
    },
  ) {
    const updated = this.penaltyService.updateDifficultyConfig(body.slug, {
      goalProbability: Number(body.goalProbability),
      multipliers: Array.isArray(body.multipliers) ? body.multipliers.map(Number) : undefined,
      maxSpots: body.maxSpots ? Number(body.maxSpots) : undefined,
    });
    return {
      success: true,
      data: updated,
    };
  }

  @Post('override')
  async setOverride(@Body('target') target: string) {
    const result = this.overrideService.setOverride('penalty-shootout', target);
    return {
      success: true,
      message: result
        ? `Penalty Nations Cup outcome override set to: ${result}`
        : 'Penalty Nations Cup reset to Automatic Provably Fair RTP engine',
      override: result || 'AUTO_RTP',
    };
  }

  @Get('rounds')
  async getAdminRounds(
    @Query('page') page = '1',
    @Query('limit') limit = '15',
    @Query('status') status?: string,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 15);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status && status !== 'ALL') {
      if (status === 'CASHED_OUT' || status === 'WON') {
        where.OR = [{ status: 'CASHED_OUT' }, { status: 'COMPLETED' }, { result: 'WIN' }, { result: 'CASHOUT' }];
      } else if (status === 'SAVED' || status === 'LOSS') {
        where.OR = [{ status: 'SAVED' }, { result: 'LOSS' }];
      } else if (status === 'ACTIVE' || status === 'IN_PLAY') {
        where.status = 'ACTIVE';
      }
    }

    if (difficulty && difficulty !== 'ALL') {
      where.difficulty = difficulty.toUpperCase();
    }

    if (search && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { publicId: { contains: q, mode: 'insensitive' } },
        { userId: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    try {
      const [items, total] = await Promise.all([
        this.prisma.penaltyShootoutRound.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
          include: {
            user: { select: { id: true, email: true, name: true, phone: true } },
            shots: { orderBy: { shotNumber: 'asc' } },
            gameResult: true,
          },
        }),
        this.prisma.penaltyShootoutRound.count({ where }),
      ]);

      return {
        success: true,
        data: {
          items,
          total,
          page: pageNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      };
    } catch {
      return {
        success: true,
        data: {
          items: [],
          total: 0,
          page: pageNum,
          totalPages: 1,
        },
      };
    }
  }
}
