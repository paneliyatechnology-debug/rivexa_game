import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { SpinService } from './spin.service.js';

@Controller('games/spin')
export class SpinController {
  constructor(private readonly spinService: SpinService) {}

  @Get('state')
  async getGameState(@Query('userId') userId?: string) {
    return this.spinService.getGameState(userId);
  }

  @Get('history')
  async getHistory(
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.spinService.getHistory(userId, Number(page) || 1, Number(limit) || 10);
  }

  @Post('spin')
  async spin(
    @Body('userId') userId: string,
    @Body('selectedColor') selectedColor: string,
    @Body('betAmount') betAmount: number,
    @Body('periodNumber') periodNumber?: string,
  ) {
    return this.spinService.placeBet(userId, selectedColor, betAmount, periodNumber);
  }

  @Post('bet')
  async placeBet(
    @Body('userId') userId: string,
    @Body('selectedColor') selectedColor: string,
    @Body('betAmount') betAmount: number,
    @Body('periodNumber') periodNumber?: string,
  ) {
    return this.spinService.placeBet(userId, selectedColor, betAmount, periodNumber);
  }
}
