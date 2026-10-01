import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ParityService } from './parity.service.js';

@Controller('games/parity')
export class ParityController {
  constructor(private readonly parityService: ParityService) {}

  /** GET /api/v1/games/parity/period — current period info */
  @Get('period')
  async getPeriod(@Query('interval') interval?: string) {
    const sec = parseInt(interval || '30', 10) || 30;
    return this.parityService.getPeriodInfo(sec);
  }

  /** GET /api/v1/games/parity/state — synchronized game state polling */
  @Get('state')
  async getGameState(
    @Query('userId') userId?: string,
    @Query('interval') interval?: string,
  ) {
    const sec = parseInt(interval || '30', 10) || 30;
    return this.parityService.getGameState(userId || '', sec);
  }

  /**
   * GET /api/v1/games/parity/history?page=1&limit=10&interval=30
   * Paginated history — returns records + total for infinite scroll / lazy loading
   */
  @Get('history')
  async getHistory(
    @Query('page')     page?:     string,
    @Query('limit')    limit?:    string,
    @Query('interval') interval?: string,
  ) {
    const p   = Math.max(1, parseInt(page  || '1',  10) || 1);
    const lim = Math.min(50, Math.max(5, parseInt(limit || '10', 10) || 10));
    const sec = parseInt(interval || '30', 10) || 30;
    return this.parityService.getHistoryPaginated(p, lim, sec);
  }

  /** GET /api/v1/games/parity/my-bets?userId=xxx&page=1&limit=10 — user's bet history */
  @Get('my-bets')
  async getMyBets(
    @Query('userId') userId?: string,
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
  ) {
    const p   = Math.max(1, parseInt(page  || '1',  10) || 1);
    const lim = Math.min(50, Math.max(5, parseInt(limit || '10', 10) || 10));
    return this.parityService.getMyBets(userId || '', p, lim);
  }

  /** POST /api/v1/games/parity/bet — place a bet (saves as PENDING) */
  @Post('bet')
  async placeBet(
    @Body('userId') userId: string,
    @Body('selectOption') selectOption: string,
    @Body('amount') amount: number,
    @Body('interval') interval?: number,
  ) {
    const sec = Number(interval) === 60 ? 60 : 30;
    return this.parityService.placeBet(userId, selectOption, amount, sec);
  }

  /**
   * POST /api/v1/games/parity/settle
   * Settles all PENDING bets for a given periodId.
   */
  @Post('settle')
  async settlePeriod(@Body('periodId') periodId: string) {
    return this.parityService.settlePeriod(periodId);
  }
}
