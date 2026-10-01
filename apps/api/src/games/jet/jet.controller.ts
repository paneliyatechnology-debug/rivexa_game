import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JetService } from './jet.service.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';

@Controller('games/jet')
export class JetController {
  constructor(private readonly jetService: JetService) {}

  @Get('state')
  async getState(@Query('userId') userId?: string) {
    return this.jetService.getSynchronizedState(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bet')
  async placeBet(@Req() req: any, @Body('amount') amount: number) {
    const userId = req.user.id;
    return this.jetService.placeBet(userId, Number(amount));
  }

  @UseGuards(JwtAuthGuard)
  @Post('cashout')
  async cashout(@Req() req: any, @Body('betId') betId: string) {
    const userId = req.user.id;
    return this.jetService.cashout(userId, betId);
  }

  @Get('history')
  async getUserHistory(@Query('userId') userId: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.jetService.getUserBetHistory(userId, parsedLimit);
  }

  @Get('period-history')
  async getPeriodHistory() {
    return this.jetService.getPeriodHistory();
  }
}
