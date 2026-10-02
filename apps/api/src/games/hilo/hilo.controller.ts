import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HiloService } from './hilo.service.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';

@Controller('hilo')
export class HiloController {
  constructor(private readonly hiloService: HiloService) {}

  private extractUserId(req: any, bodyUserId?: string, queryUserId?: string): string {
    return (
      req.user?.id ||
      bodyUserId ||
      queryUserId ||
      (req.headers['x-user-id'] as string) ||
      '00000000-0000-0000-0000-000000000000'
    );
  }

  @Post('round')
  async createRound(
    @Req() req: any,
    @Body('betAmount') betAmount: number,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = this.extractUserId(req, bodyUserId);
    return this.hiloService.createRound(userId, betAmount);
  }

  @Post('round/:roundId/play')
  async playRound(
    @Req() req: any,
    @Param('roundId') roundId: string,
    @Body('choice') choice: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = this.extractUserId(req, bodyUserId);
    return this.hiloService.playRound(userId, roundId, choice);
  }

  @Get('history')
  async getHistory(
    @Req() req: any,
    @Query('userId') queryUserId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = this.extractUserId(req, undefined, queryUserId);
    return this.hiloService.getHistory(userId, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Get('round/:roundId')
  async getRound(
    @Req() req: any,
    @Param('roundId') roundId: string,
    @Query('userId') queryUserId?: string,
  ) {
    const userId = this.extractUserId(req, undefined, queryUserId);
    return this.hiloService.getRound(userId, roundId);
  }

  @Get('admin/stats')
  async getAdminStats() {
    return this.hiloService.getAdminStats();
  }
}

/**
 * Secondary Controller route for `/games/hilo` alias to ensure both URLs work smoothly
 */
@Controller('games/hilo')
export class GamesHiloController {
  constructor(private readonly hiloService: HiloService) {}

  private extractUserId(req: any, bodyUserId?: string, queryUserId?: string): string {
    return (
      req.user?.id ||
      bodyUserId ||
      queryUserId ||
      (req.headers['x-user-id'] as string) ||
      '00000000-0000-0000-0000-000000000000'
    );
  }

  @Post('round')
  async createRound(
    @Req() req: any,
    @Body('betAmount') betAmount: number,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = this.extractUserId(req, bodyUserId);
    return this.hiloService.createRound(userId, betAmount);
  }

  @Post('round/:roundId/play')
  async playRound(
    @Req() req: any,
    @Param('roundId') roundId: string,
    @Body('choice') choice: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = this.extractUserId(req, bodyUserId);
    return this.hiloService.playRound(userId, roundId, choice);
  }

  @Get('history')
  async getHistory(
    @Req() req: any,
    @Query('userId') queryUserId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = this.extractUserId(req, undefined, queryUserId);
    return this.hiloService.getHistory(userId, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Get('round/:roundId')
  async getRound(
    @Req() req: any,
    @Param('roundId') roundId: string,
    @Query('userId') queryUserId?: string,
  ) {
    const userId = this.extractUserId(req, undefined, queryUserId);
    return this.hiloService.getRound(userId, roundId);
  }

  @Get('admin/stats')
  async getAdminStats() {
    return this.hiloService.getAdminStats();
  }
}
