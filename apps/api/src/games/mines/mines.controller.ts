import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { MinesService } from './mines.service.js';

@Controller('games/mines')
export class MinesController {
  constructor(private readonly minesService: MinesService) {}

  @Post('start')
  async startGame(
    @Body('userId') userId: string,
    @Body('betAmount') betAmount: number,
    @Body('mineCount') mineCount: number,
  ) {
    return this.minesService.startGame(userId, betAmount, mineCount);
  }

  @Post('reveal')
  async revealTile(
    @Body('userId') userId: string,
    @Body('gameId') gameId: string,
    @Body('tileIndex') tileIndex: number,
  ) {
    return this.minesService.revealTile(userId, gameId, tileIndex);
  }

  @Post('cashout')
  async cashout(
    @Body('userId') userId: string,
    @Body('gameId') gameId: string,
  ) {
    return this.minesService.cashout(userId, gameId);
  }

  @Get('history')
  async getHistoryGet(@Query('userId') userId: string) {
    return this.minesService.getHistory(userId);
  }

  @Post('history')
  async getHistoryPost(@Body('userId') userId: string) {
    return this.minesService.getHistory(userId);
  }
}
