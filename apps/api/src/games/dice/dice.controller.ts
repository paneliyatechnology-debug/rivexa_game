import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { DiceService } from './dice.service.js';

@Controller('games/dice')
export class DiceController {
  constructor(private readonly diceService: DiceService) {}

  /** POST /api/v1/games/dice/roll — roll the dice */
  @Post('roll')
  async roll(
    @Body('userId') userId: string,
    @Body('targetNumber') targetNumber: number,
    @Body('rollType') rollType: 'over' | 'under',
    @Body('betAmount') betAmount: number,
  ) {
    return this.diceService.roll(userId, targetNumber, rollType, betAmount);
  }

  /** GET /api/v1/games/dice/state — get game state with balance & history */
  @Get('state')
  async getState(@Query('userId') userId?: string) {
    return this.diceService.getGameState(userId || '');
  }

  /** GET /api/v1/games/dice/my-bets — user's bet history */
  @Get('my-bets')
  async getMyBets(@Query('userId') userId?: string) {
    return this.diceService.getMyBets(userId || '');
  }
}
