import { Controller, Get, Post, Patch, Body, Query, Param, NotFoundException } from '@nestjs/common';
import { CricketDataService } from './cricket-data.service.js';

@Controller('cricket')
export class CricketDataController {
  constructor(private readonly cricketDataService: CricketDataService) {}

  @Get('status')
  async getStatus() {
    const capabilities = this.cricketDataService.getCapabilities();
    return {
      success: true,
      provider: this.cricketDataService.activeProviderName,
      capabilities,
      isTestMode: true,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('matches/current')
  async getCurrentMatches() {
    const matches = await this.cricketDataService.getCurrentMatches();
    return {
      success: true,
      count: matches.length,
      data: matches,
    };
  }

  @Get('matches')
  async getMatches(
    @Query('status') status?: string,
    @Query('offset') offset?: string
  ) {
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const matches = await this.cricketDataService.getMatches(status, offsetNum);
    return {
      success: true,
      count: matches.length,
      data: matches,
    };
  }

  @Get('matches/:matchId')
  async getMatchDetail(@Param('matchId') matchId: string) {
    const result = await this.cricketDataService.getMatchDetail(matchId);
    if (!result || !result.match) {
      throw new NotFoundException(`Cricket match with ID "${matchId}" not found`);
    }
    return {
      success: true,
      data: result.match,
      capabilities: result.capabilities,
      providerName: result.providerName,
      lastUpdated: result.lastUpdated,
      isStale: result.isStale,
    };
  }

  @Get('matches/:matchId/squad')
  async getMatchSquad(@Param('matchId') matchId: string) {
    const squad = await this.cricketDataService.getMatchSquad(matchId);
    if (!squad) {
      throw new NotFoundException(`Squad details for match "${matchId}" not found`);
    }
    return {
      success: true,
      data: squad,
    };
  }

  @Get('series')
  async getSeriesList(@Query('offset') offset?: string) {
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const series = await this.cricketDataService.getSeriesList(offsetNum);
    return {
      success: true,
      count: series.length,
      data: series,
    };
  }

  @Get('series/:seriesId')
  async getSeriesInfo(@Param('seriesId') seriesId: string) {
    const seriesInfo = await this.cricketDataService.getSeriesInfo(seriesId);
    if (!seriesInfo) {
      throw new NotFoundException(`Series with ID "${seriesId}" not found`);
    }
    return {
      success: true,
      data: seriesInfo,
    };
  }

  @Get('players')
  async getPlayers(@Query('offset') offset?: string) {
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const players = await this.cricketDataService.getPlayers(offsetNum);
    return {
      success: true,
      count: players.length,
      data: players,
    };
  }

  @Get('players/:playerId')
  async getPlayerInfo(@Param('playerId') playerId: string) {
    const playerInfo = await this.cricketDataService.getPlayerInfo(playerId);
    if (!playerInfo) {
      throw new NotFoundException(`Player with ID "${playerId}" not found`);
    }
    return {
      success: true,
      data: playerInfo,
    };
  }

  // ─────────────────────────────────────────────
  // ADMIN ENDPOINTS FOR CRICKET DATA MANAGEMENT
  // ─────────────────────────────────────────────

  @Get('admin/status')
  async getAdminStatus() {
    const status = await this.cricketDataService.getAdminStatus();
    return {
      success: true,
      data: status,
    };
  }

  @Post('admin/sync')
  async triggerAdminSync() {
    const result = await this.cricketDataService.triggerAdminSync();
    return {
      success: result.success,
      message: result.message,
      count: result.count,
    };
  }

  @Post('admin/test-connection')
  async testConnection() {
    const result = await this.cricketDataService.testConnection();
    return {
      success: result.success,
      data: result,
    };
  }

  @Post('admin/detect-capabilities')
  async detectCapabilities() {
    const capabilities = await this.cricketDataService.detectCapabilities();
    return {
      success: true,
      data: capabilities,
    };
  }

  @Patch('admin/provider/config')
  async updateProviderConfig(
    @Body() body: { baseUrl?: string; isActive?: boolean; isTestMode?: boolean }
  ) {
    const updated = await this.cricketDataService.updateProviderConfig(body);
    return {
      success: true,
      message: 'Provider configuration updated successfully',
      data: updated,
    };
  }
}


