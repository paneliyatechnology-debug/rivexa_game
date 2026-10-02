import { Controller, Get, Post, Put, Patch, Delete, Body, Param, NotFoundException } from '@nestjs/common';
import { SportsService } from './sports.service.js';
import { SportsProviderService } from './sports-provider.service.js';
import { DatabaseService } from '../database/database.service.js';
import { SportsGateway } from './sports.gateway.js';
import { CricketMarketsService } from '../modules/cricket-markets/cricket-markets.service.js';

@Controller('admin/sports')
export class AdminSportsController {
  constructor(
    private readonly sportsService: SportsService,
    private readonly sportsProviderService: SportsProviderService,
    private readonly db: DatabaseService,
    private readonly sportsGateway: SportsGateway,
    private readonly cricketMarketsService: CricketMarketsService
  ) {}

  @Get('provider/auto-sync')
  async getAutoSyncStatus() {
    return {
      success: true,
      statusCode: 200,
      data: this.sportsProviderService.getAutoSyncStatus(),
    };
  }

  @Post('provider/auto-sync')
  async toggleAutoSync(@Body() body: { enabled: boolean; intervalMs?: number }) {
    this.sportsProviderService.setAutoSync(body.enabled, body.intervalMs || 4000);
    return {
      success: true,
      statusCode: 200,
      message: `Live 3rd-Party WebSocket stream ${body.enabled ? 'ENABLED' : 'DISABLED'}`,
      data: this.sportsProviderService.getAutoSyncStatus(),
    };
  }

  @Post('provider/trigger-ball')
  async triggerInstantBall() {
    const events = await this.sportsProviderService.triggerInstantLiveBall();
    return {
      success: true,
      statusCode: 200,
      message: 'Instant live ball event triggered & broadcasted via WebSockets',
      data: events,
    };
  }

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

  @Get('teams')
  async getTeams() {
    const teams = await this.db.team.findMany({
      orderBy: { name: 'asc' },
    });
    return { success: true, statusCode: 200, data: teams };
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

  @Post('matches')
  async createMatch(
    @Body() body: {
      sportSlug?: string;
      competitionId?: string;
      competitionName?: string;
      teamAName: string;
      teamAShort?: string;
      teamBName: string;
      teamBShort?: string;
      matchType?: string;
      venue?: string;
      startTime?: string;
      status?: string;
      teamAScore?: string;
      teamBScore?: string;
      teamAOvers?: string;
      teamBOvers?: string;
      statusText?: string;
    }
  ) {
    // 1. Get or create Sport
    let sport = await this.db.sport.findFirst({
      where: { slug: body.sportSlug || 'cricket' },
    });

    if (!sport) {
      sport = await this.db.sport.create({
        data: {
          slug: body.sportSlug || 'cricket',
          name: body.sportSlug === 'football' ? 'Football' : 'Cricket',
          icon: body.sportSlug === 'football' ? '⚽' : '🏏',
          sortOrder: 1,
          isActive: true,
        },
      });
    }

    // 2. Get or create Competition
    let competition;
    if (body.competitionId) {
      competition = await this.db.competition.findUnique({
        where: { id: body.competitionId },
      });
    }

    if (!competition) {
      const compName = body.competitionName || 'International T20 Trophy';
      const compSlug = compName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      competition = await this.db.competition.findFirst({
        where: { slug: compSlug, sportId: sport.id },
      });

      if (!competition) {
        competition = await this.db.competition.create({
          data: {
            sportId: sport.id,
            name: compName,
            slug: compSlug,
            sortOrder: 1,
            isActive: true,
          },
        });
      }
    }

    // 3. Get or create Teams
    let teamA = await this.db.team.findFirst({
      where: { name: body.teamAName, sportId: sport.id },
    });
    if (!teamA) {
      teamA = await this.db.team.create({
        data: {
          sportId: sport.id,
          name: body.teamAName,
          shortName: body.teamAShort || body.teamAName.substring(0, 3).toUpperCase(),
        },
      });
    }

    let teamB = await this.db.team.findFirst({
      where: { name: body.teamBName, sportId: sport.id },
    });
    if (!teamB) {
      teamB = await this.db.team.create({
        data: {
          sportId: sport.id,
          name: body.teamBName,
          shortName: body.teamBShort || body.teamBName.substring(0, 3).toUpperCase(),
        },
      });
    }

    // 4. Create Match
    const matchStatus = (body.status || 'UPCOMING').toUpperCase();
    const match = await this.db.match.create({
      data: {
        sportId: sport.id,
        competitionId: competition.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        matchType: body.matchType || 'T20',
        venue: body.venue || 'International Cricket Stadium',
        status: matchStatus,
        startTime: body.startTime ? new Date(body.startTime) : new Date(),
        resultSummary: body.statusText || (matchStatus === 'LIVE' ? 'Live Match in Progress' : 'Scheduled'),
      },
      include: {
        sport: true,
        competition: true,
        teamA: true,
        teamB: true,
      },
    });

    // 5. Create initial MatchScore
    const score = await this.db.matchScore.create({
      data: {
        matchId: match.id,
        teamAScore: body.teamAScore || (matchStatus === 'LIVE' ? '0/0' : '0/0'),
        teamBScore: body.teamBScore || (matchStatus === 'LIVE' ? '0/0' : 'N/A'),
        teamAOvers: body.teamAOvers || '0.0',
        teamBOvers: body.teamBOvers || '0.0',
        currentInnings: 1,
        statusText: body.statusText || (matchStatus === 'LIVE' ? 'Match started' : 'Match starting soon'),
        recentOvers: '',
      },
    });

    // 6. Generate Odds / Markets for Match
    try {
      await this.cricketMarketsService.generateMarketsForMatch(match);
    } catch (e) {
      // ignore market generation errors if non-critical
    }

    // 7. If LIVE, emit websocket event
    if (matchStatus === 'LIVE') {
      this.sportsGateway.broadcastScoreUpdate(match.id, score);
    }

    return {
      success: true,
      statusCode: 201,
      message: 'Match created successfully',
      data: { ...match, score },
    };
  }

  @Put('matches/:id')
  async updateMatch(
    @Param('id') id: string,
    @Body() body: {
      teamAName?: string;
      teamAShort?: string;
      teamBName?: string;
      teamBShort?: string;
      matchType?: string;
      venue?: string;
      startTime?: string;
      status?: string;
      resultSummary?: string;
    }
  ) {
    const existing = await this.db.match.findUnique({
      where: { id },
      include: { teamA: true, teamB: true },
    });
    if (!existing) throw new NotFoundException('Match not found');

    if (body.teamAName && existing.teamA) {
      await this.db.team.update({
        where: { id: existing.teamA.id },
        data: {
          name: body.teamAName,
          ...(body.teamAShort ? { shortName: body.teamAShort } : {}),
        },
      });
    }

    if (body.teamBName && existing.teamB) {
      await this.db.team.update({
        where: { id: existing.teamB.id },
        data: {
          name: body.teamBName,
          ...(body.teamBShort ? { shortName: body.teamBShort } : {}),
        },
      });
    }

    const updated = await this.db.match.update({
      where: { id },
      data: {
        ...(body.matchType ? { matchType: body.matchType } : {}),
        ...(body.venue ? { venue: body.venue } : {}),
        ...(body.startTime ? { startTime: new Date(body.startTime) } : {}),
        ...(body.status ? { status: body.status.toUpperCase() } : {}),
        ...(body.resultSummary !== undefined ? { resultSummary: body.resultSummary } : {}),
      },
      include: {
        sport: true,
        competition: true,
        teamA: true,
        teamB: true,
        score: true,
      },
    });

    return { success: true, statusCode: 200, data: updated };
  }

  @Patch('matches/:id/status')
  async updateMatchStatus(
    @Param('id') id: string,
    @Body() body: { status: string; resultSummary?: string }
  ) {
    const statusUpper = body.status.toUpperCase();
    const match = await this.db.match.update({
      where: { id },
      data: {
        status: statusUpper,
        ...(body.resultSummary ? { resultSummary: body.resultSummary } : {}),
      },
      include: { score: true, teamA: true, teamB: true },
    });

    if (statusUpper === 'LIVE' && match.score) {
      this.sportsGateway.broadcastScoreUpdate(id, match.score);
    } else if (statusUpper === 'COMPLETED') {
      this.sportsGateway.broadcastMatchCompleted(id, match);
    }

    return { success: true, statusCode: 200, data: match };
  }

  @Patch('matches/:id/score')
  async updateMatchScore(
    @Param('id') id: string,
    @Body() body: {
      teamAScore?: string;
      teamBScore?: string;
      teamAOvers?: string;
      teamBOvers?: string;
      currentInnings?: number;
      currentRunRate?: number;
      requiredRunRate?: number;
      targetRuns?: number;
      statusText?: string;
      activeBatsman?: string;
      activeBowler?: string;
      recentOvers?: string;
      resultSummary?: string;
      status?: string;
    }
  ) {
    const existing = await this.db.match.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Match not found');

    if (body.status || body.resultSummary !== undefined) {
      await this.db.match.update({
        where: { id },
        data: {
          ...(body.status ? { status: body.status.toUpperCase() } : {}),
          ...(body.resultSummary !== undefined ? { resultSummary: body.resultSummary } : {}),
        },
      });
    }

    const updatedScore = await this.db.matchScore.upsert({
      where: { matchId: id },
      create: {
        matchId: id,
        teamAScore: body.teamAScore || '0/0',
        teamBScore: body.teamBScore || 'N/A',
        teamAOvers: body.teamAOvers || '0.0',
        teamBOvers: body.teamBOvers || '0.0',
        currentInnings: body.currentInnings || 1,
        currentRunRate: body.currentRunRate || undefined,
        requiredRunRate: body.requiredRunRate || undefined,
        targetRuns: body.targetRuns || undefined,
        statusText: body.statusText || '',
        activeBatsman: body.activeBatsman || '',
        activeBowler: body.activeBowler || '',
        recentOvers: body.recentOvers || '',
      },
      update: {
        ...(body.teamAScore !== undefined ? { teamAScore: body.teamAScore } : {}),
        ...(body.teamBScore !== undefined ? { teamBScore: body.teamBScore } : {}),
        ...(body.teamAOvers !== undefined ? { teamAOvers: body.teamAOvers } : {}),
        ...(body.teamBOvers !== undefined ? { teamBOvers: body.teamBOvers } : {}),
        ...(body.currentInnings !== undefined ? { currentInnings: body.currentInnings } : {}),
        ...(body.currentRunRate !== undefined ? { currentRunRate: body.currentRunRate } : {}),
        ...(body.targetRuns !== undefined ? { targetRuns: body.targetRuns } : {}),
        ...(body.statusText !== undefined ? { statusText: body.statusText } : {}),
        ...(body.activeBatsman !== undefined ? { activeBatsman: body.activeBatsman } : {}),
        ...(body.activeBowler !== undefined ? { activeBowler: body.activeBowler } : {}),
        ...(body.recentOvers !== undefined ? { recentOvers: body.recentOvers } : {}),
      },
    });

    // Broadcast live score updates to all clients connected via Socket.IO
    this.sportsGateway.broadcastScoreUpdate(id, updatedScore);

    return {
      success: true,
      statusCode: 200,
      message: 'Match score updated live & broadcasted to clients',
      data: updatedScore,
    };
  }

  @Post('matches/:id/declare-result')
  async declareMatchResult(
    @Param('id') id: string,
    @Body() body: { winningTeamId?: string; winner?: string; resultSummary: string }
  ) {
    const match = await this.db.match.findUnique({
      where: { id },
      include: { teamA: true, teamB: true },
    });
    if (!match) throw new NotFoundException('Match not found');

    let winningTeamId = body.winningTeamId;
    if (!winningTeamId && body.winner) {
      if (body.winner === 'teamA') winningTeamId = match.teamAId;
      else if (body.winner === 'teamB') winningTeamId = match.teamBId;
    }

    const updated = await this.db.match.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        winningTeamId: winningTeamId || null,
        resultSummary: body.resultSummary || 'Match Completed',
        endTime: new Date(),
      },
      include: { teamA: true, teamB: true, score: true },
    });

    if (match.score) {
      await this.db.matchScore.update({
        where: { matchId: id },
        data: {
          statusText: body.resultSummary || 'Match Completed',
        },
      });
    }

    this.sportsGateway.broadcastMatchCompleted(id, updated);

    return {
      success: true,
      statusCode: 200,
      message: 'Match result declared and set to COMPLETED',
      data: updated,
    };
  }

  @Delete('matches/:id')
  async deleteMatch(@Param('id') id: string) {
    await this.db.match.delete({ where: { id } });
    return { success: true, statusCode: 200, message: 'Match deleted successfully' };
  }

  @Post('seed')
  async seedData() {
    await this.sportsService.seedInitialSportsData();
    return { success: true, statusCode: 200, message: 'Sports seed generated successfully' };
  }
}

