import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { CricketMarketAdminService } from './cricket-market-admin.service.js';
import { OddsHistoryService } from '../history/odds-history.service.js';
import { MarketHistoryService } from '../history/market-history.service.js';
import { CricketSettlementDebugService } from '../settlement/cricket-settlement-debug.service.js';
import { CricketBetReconciliationService } from '../settlement/cricket-bet-reconciliation.service.js';

@Controller('cricket/admin')
export class CricketMarketAdminController {
  constructor(
    private readonly adminService: CricketMarketAdminService,
    private readonly oddsHistory: OddsHistoryService,
    private readonly marketHistory: MarketHistoryService,
    private readonly settlementDebugService: CricketSettlementDebugService,
    private readonly reconciliationService: CricketBetReconciliationService
  ) {}

  @Post('markets/:marketId/override')
  async overrideSelectionPrice(
    @Param('marketId') marketId: string,
    @Body() body: { selectionId: string; newOdds: number; reason: string; adminUserId?: string; tenantId?: string; expiryMinutes?: number }
  ) {
    return await this.adminService.overrideSelectionPrice(marketId, body);
  }

  @Post('markets/:marketId/suspend')
  async suspendMarket(
    @Param('marketId') marketId: string,
    @Body() body: { reason: string; adminUserId?: string; tenantId?: string }
  ) {
    return await this.adminService.suspendMarket(marketId, body);
  }

  @Post('markets/:marketId/resume')
  async resumeMarket(
    @Param('marketId') marketId: string,
    @Body() body: { adminUserId?: string; tenantId?: string }
  ) {
    return await this.adminService.resumeMarket(marketId, body?.adminUserId, body?.tenantId);
  }

  @Get('pricing/config')
  async getMarketConfiguration(@Query('tenantId') tenantId?: string) {
    const data = await this.adminService.getMarketConfiguration(tenantId);
    return { success: true, data };
  }

  @Patch('pricing/config')
  async updateMarketConfiguration(
    @Body() body: any,
    @Query('adminUserId') adminUserId?: string,
    @Query('tenantId') tenantId?: string
  ) {
    const data = await this.adminService.updateMarketConfiguration(body, adminUserId, tenantId);
    return { success: true, message: 'Pricing configuration updated successfully', data };
  }

  @Get('markets/:marketId/debug')
  async getMarketCalculationDebug(@Param('marketId') marketId: string) {
    const data = await this.adminService.getMarketCalculationDebug(marketId);
    return { success: true, data };
  }

  /**
   * Requirement 16: Admin Settlement Debug Screen & Diagnostic Report
   */
  @Get('matches/:matchId/settlement-debug')
  async getSettlementDebugReport(@Param('matchId') matchId: string) {
    const data = await this.settlementDebugService.getSettlementDebugReport(matchId);
    return { success: true, data };
  }

  /**
   * Requirement 13 & 15: Controlled Bet Reconciliation API
   */
  @Post('matches/:matchId/reconcile')
  async reconcileMatchBets(@Param('matchId') matchId: string) {
    const data = await this.reconciliationService.reconcileMatchBets(matchId);
    return { success: true, message: `Reconciliation completed for match ${matchId}`, data };
  }

  @Get('history/odds')
  async getOddsHistory(
    @Query('marketId') marketId?: string,
    @Query('matchId') matchId?: string,
    @Query('selectionId') selectionId?: string,
    @Query('reason') reason?: string,
    @Query('source') source?: string,
    @Query('tenantId') tenantId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const result = await this.oddsHistory.getOddsHistory({
      marketId,
      matchId,
      selectionId,
      reason,
      source,
      tenantId,
      search,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return { success: true, ...result };
  }

  @Get('markets/:matchId/events')
  async getMarketEvents(
    @Param('matchId') matchId: string,
    @Query('marketId') marketId?: string,
    @Query('limit') limit?: string
  ) {
    const events = await this.marketHistory.getMarketEvents(
      matchId,
      marketId,
      limit ? parseInt(limit, 10) : 50
    );
    return { success: true, count: events.length, data: events };
  }
}
