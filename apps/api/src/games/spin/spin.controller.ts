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
  async getHistory() {
    return this.spinService.getHistory();
  }

  @Post('spin')
  async spin(
    @Body('userId') userId: string,
    @Body('selectedColor') selectedColor: string,
    @Body('betAmount') betAmount: number,
    @Body('periodNumber') periodNumber?: string,
  ) {
    return this.spinService.spin(userId, selectedColor, betAmount, periodNumber);
  }
}
