import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { CrashService } from './crash.service.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';

@Controller('games/crash')
export class CrashController {
  constructor(private readonly crashService: CrashService) { }

  @Get('state')
  async getState(@Query('userId') userId?: string) {
    return this.crashService.getSynchronizedState(userId);
  }

  @Post('bet')
  async placeBet(
    @Request() req: any,
    @Body('userId') bodyUserId: string,
    @Body('amount') amount: number,
  ) {
    const userId = req.user?.id || bodyUserId || '00000000-0000-0000-0000-000000000000';
    return this.crashService.placeBet(userId, amount);
  }

  @Post('cashout')
  async cashout(
    @Request() req: any,
    @Body('userId') bodyUserId: string,
    @Body('betId') betId: string,
  ) {
    const userId = req.user?.id || bodyUserId || '00000000-0000-0000-0000-000000000000';
    return this.crashService.cashout(userId, betId);
  }

  @Get('history')
  async getHistory(@Query('userId') userId: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.crashService.getUserBetHistory(userId, parsedLimit);
  }

  @Get('period-history')
  async getPeriodHistory() {
    return this.crashService.getPeriodHistory();
  }
}
