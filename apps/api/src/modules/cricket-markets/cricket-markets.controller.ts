import { Controller, Get, Post, Patch, Delete, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { CricketMarketsService } from './cricket-markets.service.js';

@Controller('cricket')
export class CricketMarketsController {
  constructor(private readonly marketsService: CricketMarketsService) {}

  @Get('markets/categories')
  async getCategories() {
    const categories = await this.marketsService.getMarketCategories();
    return {
      success: true,
      count: categories.length,
      data: categories,
    };
  }

  @Get('matches/:matchId/markets')
  async getMatchMarkets(
    @Param('matchId') matchId: string,
    @Query('category') category?: string
  ) {
    const result = await this.marketsService.getMatchMarkets(matchId, category || 'all');
    return {
      success: true,
      data: result,
    };
  }

  @Post('test-bets')
  async placeTestBet(@Body() body: any) {
    const result = await this.marketsService.placeTestBet(body);
    return {
      success: result.success,
      message: result.message,
      betReference: result.betReference,
      data: result.testBet,
    };
  }

  @Get('test-bets/history')
  async getTestBetHistory(@Query('userId') userId?: string) {
    const history = await this.marketsService.getTestBetHistory(userId);
    return {
      success: true,
      count: history.length,
      data: history,
    };
  }

  // ─────────────────────────────────────────────
  // ADMIN CONTROL ENDPOINTS
  // ─────────────────────────────────────────────

  @Get('admin/test-bets')
  async getAdminTestBets(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string
  ) {
    const bets = await this.marketsService.getAdminTestBets({ search, status, userId });
    return {
      success: true,
      count: bets.length,
      data: bets,
    };
  }

  @Patch('admin/test-bets/:betId/settle')
  async settleTestBet(
    @Param('betId') betId: string,
    @Body() body: { status: string; summary?: string }
  ) {
    const result = await this.marketsService.settleTestBet(betId, body.status, body.summary);
    return {
      success: true,
      message: `Test bet settled as ${body.status}`,
      data: result,
    };
  }

  @Patch('admin/categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: { isActive?: boolean; sortOrder?: number; name?: string }
  ) {
    const updated = await this.marketsService.updateMarketCategory(id, body);
    return {
      success: true,
      message: 'Category updated successfully',
      data: updated,
    };
  }

  @Get('bet-settings')
  async getPublicBetSettings() {
    const settings = this.marketsService.getBetSettings();
    return {
      success: true,
      data: settings,
    };
  }

  @Get('admin/bet-settings')
  async getAdminBetSettings() {
    const settings = this.marketsService.getBetSettings();
    return {
      success: true,
      data: settings,
    };
  }

  @Patch('admin/bet-settings')
  async updateAdminBetSettings(@Body() body: any) {
    const settings = await this.marketsService.updateBetSettings(body);
    return {
      success: true,
      message: 'Sports & Bet settings updated successfully',
      data: settings,
    };
  }

  @Get('admin/odd-even/settings')
  async getOddEvenSettings() {
    const settings = await this.marketsService.getOddEvenSettings();
    return {
      success: true,
      data: settings,
    };
  }

  @Patch('admin/odd-even/settings')
  async updateOddEvenSettings(@Body() body: { enabled?: boolean; defaultOdds?: number }) {
    const settings = await this.marketsService.updateOddEvenSettings(body);
    return {
      success: true,
      message: 'Odd/Even settings updated successfully',
      data: settings,
    };
  }

  @Post('admin/markets/custom')
  async createCustomMarket(@Body() body: any) {
    const market = await this.marketsService.createCustomMarket(body);
    return {
      success: true,
      message: 'Custom market / question bet created successfully',
      data: market,
    };
  }

  @Delete('admin/markets/:marketId')
  async deleteMarket(@Param('marketId') marketId: string) {
    await this.marketsService.deleteMarket(marketId);
    return {
      success: true,
      message: 'Market deleted successfully',
    };
  }

  @Post('admin/markets/seed/:matchId')
  async seedMatchMarkets(@Param('matchId') matchId: string) {
    const result = await this.marketsService.getMatchMarkets(matchId, 'all');
    return {
      success: true,
      message: 'Markets generated/reset successfully',
      data: result,
    };
  }

  @Get('admin/matches/:matchId/odds')
  async getMatchOddsConfig(@Param('matchId') matchId: string) {
    const data = await this.marketsService.getMatchOddsConfig(matchId);
    return {
      success: true,
      data,
    };
  }

  @Patch('admin/matches/:matchId/odds')
  async updateMatchOddsConfig(
    @Param('matchId') matchId: string,
    @Body() body: { mode?: 'AUTO' | 'MANUAL'; winProbA?: number; winProbB?: number; oddsA?: number; oddsB?: number }
  ) {
    const data = await this.marketsService.updateMatchOddsConfig(matchId, body);
    return {
      success: true,
      message: 'Match odds & win percentage configured successfully',
      data,
    };
  }

  @Get('admin/matches/:matchId/analytics')
  async getMatchAnalytics(@Param('matchId') matchId: string) {
    const data = await this.marketsService.getMatchAnalytics(matchId);
    return {
      success: true,
      data,
    };
  }

  @Patch('admin/matches/:matchId/odd-even')
  async updateMatchOddEven(
    @Param('matchId') matchId: string,
    @Body() body: { enabled?: boolean; rate?: number }
  ) {
    const data = await this.marketsService.updateMatchOddEven(matchId, body);
    return {
      success: true,
      message: 'Match-wise Odd/Even settings updated successfully',
      data,
    };
  }

  @Post('admin/matches/:matchId/auto-generate-questions')
  async autoGenerateMatchQuestions(@Param('matchId') matchId: string) {
    const data = await this.marketsService.autoGenerateMatchQuestions(matchId);
    return {
      success: true,
      message: 'AI dynamically generated team-wise questions for match successfully!',
      data,
    };
  }

  @Post('admin/matches/:matchId/auto-settle')
  async autoSettleMatchMarkets(@Param('matchId') matchId: string) {
    const result = await this.marketsService.autoSettleMatchMarkets(matchId);
    return {
      success: true,
      message: `Auto-settlement completed: ${result.settledCount} bets settled, ${result.lockedCount} markets locked`,
      data: result,
    };
  }
}


