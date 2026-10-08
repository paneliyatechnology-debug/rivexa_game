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
    const [totalRounds, totalBets, totalWins, totalLosses] = await Promise.all([
      this.prisma.chickenRoadRound.count(),
      this.prisma.chickenRoadResult.aggregate({
        _sum: { betAmount: true },
      }),
      this.prisma.chickenRoadResult.aggregate({
        _sum: { grossPayout: true },
        where: { result: 'WIN' },
      }),
      this.prisma.chickenRoadRound.count({ where: { result: 'LOSS' } }),
    ]);

    const totalWagered = Number(totalBets?._sum?.betAmount || 0);
    const totalPayout = Number(totalWins?._sum?.grossPayout || 0);
    const grossProfit = totalWagered - totalPayout;

    return {
      success: true,
      data: {
        totalRounds,
        totalWagered,
        totalPayout,
        grossProfit,
        crashRate: totalRounds > 0 ? (totalLosses / totalRounds) * 100 : 0,
      },
    };
  }

  @Get('rounds')
  async getAdminRounds(@Query('page') page = '1', @Query('limit') limit = '20') {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      this.prisma.chickenRoadRound.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          user: { select: { id: true, email: true, name: true } },
          gameResult: true,
        },
      }),
      this.prisma.chickenRoadRound.count(),
    ]);

    return {
      success: true,
      data: { items, total, page: pageNum, totalPages: Math.ceil(total / limitNum) },
    };
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
