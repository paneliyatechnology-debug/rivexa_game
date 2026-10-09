import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { ChickenRoadMultiplierService } from './multiplier.service.js';

@Controller('admin/chicken-road')
export class AdminChickenRoadController {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly multiplierService: ChickenRoadMultiplierService,
  ) {}

  @Get('dashboard')
  async getDashboardStats() {
    try {
      const [totalRounds, totalRoundBets, totalWinsResult, cashedOutRounds, totalLosses, activePlayers] = await Promise.all([
        this.prisma.chickenRoadRound.count(),
        this.prisma.chickenRoadRound.aggregate({
          _sum: { betAmount: true },
        }),
        this.prisma.chickenRoadResult.aggregate({
          _sum: { grossPayout: true },
          where: {
            OR: [
              { result: 'WIN' },
              { result: 'CASHOUT' },
              { result: 'CASHED_OUT' },
            ],
          },
        }),
        this.prisma.chickenRoadRound.findMany({
          where: {
            OR: [
              { status: 'CASHED_OUT' },
              { result: 'CASHOUT' },
              { result: 'WIN' },
            ],
          },
          select: { betAmount: true, currentMultiplier: true, potentialPayout: true },
        }),
        this.prisma.chickenRoadRound.count({
          where: {
            OR: [
              { result: 'LOSS' },
              { status: 'CRASHED' },
            ],
          },
        }),
        this.prisma.chickenRoadRound.count({
          where: {
            status: { in: ['IN_PROGRESS', 'ACTIVE'] },
          },
        }),
      ]);

      const totalWagered = Number(totalRoundBets?._sum?.betAmount || 0);

      let totalPayout = Number(totalWinsResult?._sum?.grossPayout || 0);
      if (totalPayout === 0 && cashedOutRounds && cashedOutRounds.length > 0) {
        totalPayout = cashedOutRounds.reduce((acc: number, r: any) => {
          const mult = Number(r.currentMultiplier || 1.0);
          const bet = Number(r.betAmount || 0);
          const p = Number(r.potentialPayout || (bet * mult));
          return acc + (p > 0 ? p : bet * mult);
        }, 0);
      }

      const grossProfit = totalWagered - totalPayout;

      return {
        success: true,
        data: {
          totalRounds,
          totalWagered,
          totalPayout,
          grossProfit,
          activePlayers,
          crashRate: totalRounds > 0 ? (totalLosses / totalRounds) * 100 : 0,
        },
      };
    } catch (e) {
      return {
        success: true,
        data: {
          totalRounds: 0,
          totalWagered: 0,
          totalPayout: 0,
          grossProfit: 0,
          activePlayers: 0,
          crashRate: 0,
        },
      };
    }
  }

  @Get('difficulties')
  async getDifficulties() {
    const difficulties = await this.prisma.chickenRoadDifficulty.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    if (difficulties && difficulties.length > 0) {
      return { success: true, data: difficulties };
    }
    return {
      success: true,
      data: [
        { slug: 'easy', name: 'Easy', safeProbability: 0.95, maxMultiplier: 100, version: 1 },
        { slug: 'medium', name: 'Medium', safeProbability: 0.85, maxMultiplier: 500, version: 1 },
        { slug: 'hard', name: 'Hard', safeProbability: 0.70, maxMultiplier: 2500, version: 1 },
        { slug: 'hardcore', name: 'Hardcore', safeProbability: 0.50, maxMultiplier: 10000, version: 1 },
      ],
    };
  }

  @Get('rounds')
  async getAdminRounds(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status && status !== 'ALL') {
      if (status === 'CASHED_OUT' || status === 'WON') {
        where.OR = [{ status: 'CASHED_OUT' }, { result: 'WIN' }];
      } else if (status === 'CRASHED' || status === 'LOSS') {
        where.OR = [{ status: 'CRASHED' }, { result: 'LOSS' }];
      } else if (status === 'IN_PLAY' || status === 'RUNNING') {
        where.status = 'RUNNING';
      }
    }

    if (difficulty && difficulty !== 'ALL') {
      where.difficultyId = difficulty.toLowerCase();
    }

    if (search && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { userId: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    try {
      const [items, total] = await Promise.all([
        this.prisma.chickenRoadRound.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
          include: {
            user: { select: { id: true, email: true, name: true } },
            gameResult: true,
          },
        }),
        this.prisma.chickenRoadRound.count({ where }),
      ]);

      return {
        success: true,
        data: { items, total, page: pageNum, totalPages: Math.ceil(total / limitNum) },
      };
    } catch (e) {
      return {
        success: true,
        data: { items: [], total: 0, page: pageNum, totalPages: 1 },
      };
    }
  }

  @Post('difficulties')
  async updateDifficulty(@Body() body: { slug: string; name: string; safeProbability: number; maxMultiplier: number }) {
    const existing = await this.prisma.chickenRoadDifficulty.findUnique({
      where: { slug: body.slug },
    });

    const newVersion = existing ? existing.version + 1 : 1;

    const updated = await this.prisma.chickenRoadDifficulty.upsert({
      where: { slug: body.slug },
      update: {
        name: body.name,
        safeProbability: body.safeProbability,
        maxMultiplier: body.maxMultiplier,
        version: newVersion,
      },
      create: {
        slug: body.slug,
        name: body.name,
        description: `${body.name} difficulty level`,
        safeProbability: body.safeProbability,
        maxMultiplier: body.maxMultiplier,
        multiplierConfig: { safeProbability: body.safeProbability },
        version: 1,
      },
    });

    // Create Audit Log
    await this.prisma.chickenRoadAuditLog.create({
      data: {
        action: 'UPDATE_DIFFICULTY',
        entityType: 'DIFFICULTY',
        entityId: updated.id,
        metadata: { slug: body.slug, version: newVersion, safeProbability: body.safeProbability },
      },
    });

    return {
      success: true,
      data: updated,
    };
  }
}
