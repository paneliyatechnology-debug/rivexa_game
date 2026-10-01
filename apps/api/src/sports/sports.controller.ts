import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { SportsService } from './sports.service.js';

@Controller('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Get()
  async getAllSports() {
    const sports = await this.sportsService.getAllSports();
    return { success: true, statusCode: 200, data: sports };
  }

  @Get(':sportId')
  async getSport(@Param('sportId') sportId: string) {
    const sport = await this.sportsService.getSportBySlug(sportId);
    if (!sport) throw new NotFoundException('Sport category not found');
    return { success: true, statusCode: 200, data: sport };
  }

  @Get(':sportId/competitions')
  async getCompetitions(@Param('sportId') sportId: string) {
    const competitions = await this.sportsService.getCompetitions(sportId);
    return { success: true, statusCode: 200, data: competitions };
  }

  @Get(':sportId/matches')
  async getMatches(
    @Param('sportId') sportId: string,
    @Query('status') status?: string,
    @Query('competitionId') competitionId?: string,
    @Query('limit') limit?: string
  ) {
    const matches = await this.sportsService.getMatches({
      sportSlugOrId: sportId,
      status,
      competitionId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { success: true, statusCode: 200, data: matches };
  }

  @Get(':sportId/matches/live')
  async getLiveMatches(@Param('sportId') sportId: string) {
    const grouped = await this.sportsService.getLiveMatchesGroupedByCompetition(sportId);
    return { success: true, statusCode: 200, data: grouped };
  }

  @Get(':sportId/matches/upcoming')
  async getUpcomingMatches(@Param('sportId') sportId: string) {
    const grouped = await this.sportsService.getUpcomingMatchesGroupedByCompetition(sportId);
    return { success: true, statusCode: 200, data: grouped };
  }
}

@Controller('matches')
export class MatchDetailController {
  constructor(private readonly sportsService: SportsService) {}

  @Get(':matchId')
  async getMatch(@Param('matchId') matchId: string) {
    const match = await this.sportsService.getMatchById(matchId);
    if (!match) throw new NotFoundException('Match not found');
    return { success: true, statusCode: 200, data: match };
  }

  @Get(':matchId/score')
  async getMatchScore(@Param('matchId') matchId: string) {
    const score = await this.sportsService.getMatchScore(matchId);
    return { success: true, statusCode: 200, data: score };
  }

  @Get(':matchId/scorecard')
  async getMatchScorecard(@Param('matchId') matchId: string) {
    const scorecard = await this.sportsService.getMatchScorecard(matchId);
    return { success: true, statusCode: 200, data: scorecard };
  }

  @Get(':matchId/commentary')
  async getMatchCommentary(
    @Param('matchId') matchId: string,
    @Query('limit') limit?: string
  ) {
    const commentaries = await this.sportsService.getMatchCommentary(
      matchId,
      limit ? parseInt(limit, 10) : undefined
    );
    return { success: true, statusCode: 200, data: commentaries };
  }

  @Get(':matchId/statistics')
  async getMatchStatistics(@Param('matchId') matchId: string) {
    const statistics = await this.sportsService.getMatchStatistics(matchId);
    return { success: true, statusCode: 200, data: statistics };
  }
}
