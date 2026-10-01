import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { PushparaniService } from './pushparani.service.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';

@Controller('games/pushparani')
export class PushparaniController {
  constructor(private readonly pushparaniService: PushparaniService) {}

  @Get('state')
  async getState(@Query('userId') userId?: string) {
    return this.pushparaniService.getSynchronizedState(userId);
  }

  @Post('bet')
  @UseGuards(JwtAuthGuard)
  async placeBet(
    @Request() req: any,
    @Body('amount') amount: number,
  ) {
    return this.pushparaniService.placeBet(req.user.id, amount);
  }

  @Post('cashout')
  @UseGuards(JwtAuthGuard)
  async cashout(
    @Request() req: any,
    @Body('betId') betId: string,
  ) {
    return this.pushparaniService.cashout(req.user.id, betId);
  }

  @Get('history')
  async getHistory(@Query('userId') userId: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.pushparaniService.getUserBetHistory(userId, parsedLimit);
  }

  @Get('period-history')
  async getPeriodHistory() {
    return this.pushparaniService.getPeriodHistory();
  }
}
