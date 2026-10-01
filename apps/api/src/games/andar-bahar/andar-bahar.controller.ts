import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AndarBaharService } from './andar-bahar.service.js';

@Controller('games/andar-bahar')
export class AndarBaharController {
  constructor(private readonly andarBaharService: AndarBaharService) {}

  /**
   * GET /api/v1/games/andar-bahar/state?userId=xxx
   * Returns current round info, state machine, open card, countdown, wallet, history, bets, and deal sequence.
   */
  @Get('state')
  async getGameState(@Query('userId') userId?: string) {
    return this.andarBaharService.getGameState(userId);
  }

  /**
   * GET /api/v1/games/andar-bahar/current-round?userId=xxx
   * Authoritative current round endpoint alias as required by game specification.
   */
  @Get('current-round')
  async getCurrentRound(@Query('userId') userId?: string) {
    return this.andarBaharService.getGameState(userId);
  }

  /**
   * GET /api/v1/games/andar-bahar/orders?userId=xxx
   * User orders endpoint.
   */
  @Get('orders')
  async getUserOrders(@Query('userId') userId?: string) {
    const state = await this.andarBaharService.getGameState(userId);
    return { status: true, orders: state.my_orders };
  }

  /**
   * POST /api/v1/games/andar-bahar/bet
   * Body: { userId, bet_option, amount }
   */
  @Post('bet')
  async placeBet(
    @Body('userId') userId: string,
    @Body('bet_option') betOption: string,
    @Body('amount') amount: number,
    @Body('side') side?: string,
    @Body('betAmount') betAmount?: number,
  ) {
    const selectedOption = betOption || side || 'andar';
    const selectedAmount = Number(amount || betAmount || 10);
    return this.andarBaharService.placeBet(userId, selectedOption, selectedAmount);
  }

  /**
   * GET /api/v1/games/andar-bahar/history
   */
  @Get('history')
  async getHistory() {
    return this.andarBaharService.getHistory();
  }

  /**
   * POST /api/v1/games/andar-bahar/play (legacy)
   */
  @Post('play')
  async play(
    @Body('userId') userId: string,
    @Body('side') side: 'andar' | 'bahar' | 'tie',
    @Body('betAmount') betAmount: number,
  ) {
    return this.andarBaharService.placeBet(userId, side, betAmount);
  }
}
