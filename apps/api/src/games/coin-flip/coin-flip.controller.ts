import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { CoinFlipService } from './coin-flip.service.js';

@Controller('games/coin-flip')
export class CoinFlipController {
  constructor(private readonly coinFlipService: CoinFlipService) {}

  @Post('play')
  async play(
    @Body('userId') userId: string,
    @Body('chosenSide') chosenSide: 'HEADS' | 'TAILS',
    @Body('betAmount') betAmount: number,
  ) {
    return this.coinFlipService.play(userId, chosenSide, betAmount);
  }

  @Get('history')
  async getHistory(
    @Query('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.coinFlipService.getHistory(userId, limit ? Number(limit) : 20);
  }
}
