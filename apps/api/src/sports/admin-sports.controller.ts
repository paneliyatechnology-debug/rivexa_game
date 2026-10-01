import { Controller, Get, Post, Patch, Body, Param, NotFoundException } from '@nestjs/common';
import { SportsService } from './sports.service.js';
import { DatabaseService } from '../database/database.service.js';

@Controller('admin/sports')
export class AdminSportsController {
  constructor(
    private readonly sportsService: SportsService,
    private readonly db: DatabaseService
  ) {}

  @Get('categories')
  async getCategories() {
    const sports = await this.db.sport.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { competitions: true, matches: true },
        },
      },
    });
    return { success: true, statusCode: 200, data: sports };
  }

  @Patch('categories/:id')
  async toggleCategory(
    @Param('id') id: string,
    @Body() body: { isActive?: boolean; sortOrder?: number }
  ) {
    const updated = await this.db.sport.update({
      where: { id },
      data: {
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
    });
    return { success: true, statusCode: 200, data: updated };
  }

  @Get('competitions')
  async getCompetitions() {
    const competitions = await this.db.competition.findMany({
      include: {
        sport: true,
        _count: { select: { matches: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return { success: true, statusCode: 200, data: competitions };
  }

  @Patch('competitions/:id')
  async toggleCompetition(
    @Param('id') id: string,
    @Body() body: { isActive?: boolean; sortOrder?: number }
  ) {
    const updated = await this.db.competition.update({
      where: { id },
      data: {
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
    });
    return { success: true, statusCode: 200, data: updated };
  }

  @Get('matches')
  async getMatches() {
    const matches = await this.db.match.findMany({
      include: {
        sport: true,
        competition: true,
        teamA: true,
        teamB: true,
        score: true,
      },
      orderBy: { startTime: 'desc' },
      take: 100,
    });
    return { success: true, statusCode: 200, data: matches };
  }

  @Patch('matches/:id/status')
  async updateMatchStatus(
    @Param('id') id: string,
    @Body() body: { status: string; resultSummary?: string }
  ) {
    const match = await this.db.match.update({
      where: { id },
      data: {
        status: body.status.toUpperCase(),
        ...(body.resultSummary ? { resultSummary: body.resultSummary } : {}),
      },
    });
    return { success: true, statusCode: 200, data: match };
  }

  @Post('seed')
  async seedData() {
    await this.sportsService.seedInitialSportsData();
    return { success: true, statusCode: 200, message: 'Sports seed generated successfully' };
  }
}
