import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { HiloService } from './hilo.service.js';

@Controller('hilo')
export class HiloController {
  constructor(private readonly hiloService: HiloService) {}

  private extractUserId(req: any, bodyUserId?: string, queryUserId?: string): string {
    return (
      req.user?.id ||
      bodyUserId ||
      queryUserId ||
      (req.headers['x-user-id'] as string) ||
      ''
    );
  }

  // ─── CONTINUOUS PLAY SESSION ENDPOINTS ───

  @Get('preview')
  async getPreview(@Query('card') cardCode?: string) {
    return this.hiloService.getInitialPreview(cardCode);
  }

  @Get('session/active')
  async getActiveSession(
    @Req() req: any,
    @Query('userId') queryUserId?: string,
    @Query('sessionId') querySessionId?: string,
  ) {
    const userId = this.extractUserId(req, undefined, queryUserId);
    return this.hiloService.getActiveSession(userId, querySessionId);
  }

  @Post('session/init')
  async initSession(
    @Req() req: any,
    @Body('userId') bodyUserId?: string,
    @Body('sessionId') bodySessionId?: string,
  ) {
    const userId = this.extractUserId(req, bodyUserId);
    return this.hiloService.initOrGetSession(userId, bodySessionId);
  }

  @Post('session/start')
  async startSession(
    @Req() req: any,
    @Body('betAmount') betAmount: number,
    @Body('sessionId') sessionId?: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = this.extractUserId(req, bodyUserId);
    return this.hiloService.startSession(userId, betAmount, sessionId);
  }

  @Post('session/reset')
  async resetSession(@Req() req: any, @Body('userId') bodyUserId?: string) {
    const userId = this.extractUserId(req, bodyUserId);
    return this.hiloService.resetOrNewSession(userId);
  }

  @Post('session/:sessionId/play')
  async playPrediction(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @Body('choice') choice: string,
    @Body('betAmount') betAmount?: number,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = this.extractUserId(req, bodyUserId);
    return this.hiloService.playPrediction(userId, sessionId, choice, betAmount);
  }

  @Post('session/:sessionId/cashout')
  async cashoutSession(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = this.extractUserId(req, bodyUserId);
    return this.hiloService.cashoutSession(userId, sessionId);
  }

  @Get('session/history')
  async getSessionHistory(
    @Req() req: any,
    @Query('userId') queryUserId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = this.extractUserId(req, undefined, queryUserId);
    return this.hiloService.getSessionHistory(userId, page ? Number(page) : 1, limit ? Number(limit) : 10);
  }

  @Get('session/:sessionId')
  async getSessionDetails(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @Query('userId') queryUserId?: string,
  ) {
    const userId = this.extractUserId(req, undefined, queryUserId);
    return this.hiloService.getSessionDetails(userId, sessionId);
  }

  // ─── LEGACY ROUND ENDPOINTS (Backwards Compatibility) ───

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
    return this.hiloService.getHistory(userId, page ? Number(page) : 1, limit ? Number(limit) : 10);
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

  @Get('preview')
  async getPreview(@Query('card') cardCode?: string) {
    return this.hiloService.getInitialPreview(cardCode);
  }

  @Get('session/active')
  async getActiveSession(
    @Req() req: any,
    @Query('userId') queryUserId?: string,
    @Query('sessionId') querySessionId?: string,
  ) {
    const userId = this.extractUserId(req, undefined, queryUserId);
    return this.hiloService.getActiveSession(userId, querySessionId);
  }

  @Post('session/init')
  async initSession(
    @Req() req: any,
    @Body('userId') bodyUserId?: string,
    @Body('sessionId') bodySessionId?: string,
  ) {
    const userId = this.extractUserId(req, bodyUserId);
    return this.hiloService.initOrGetSession(userId, bodySessionId);
  }

  @Post('session/start')
  async startSession(
    @Req() req: any,
    @Body('betAmount') betAmount: number,
    @Body('sessionId') sessionId?: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = this.extractUserId(req, bodyUserId);
    return this.hiloService.startSession(userId, betAmount, sessionId);
  }

  @Post('session/reset')
  async resetSession(@Req() req: any, @Body('userId') bodyUserId?: string) {
    const userId = this.extractUserId(req, bodyUserId);
    return this.hiloService.resetOrNewSession(userId);
  }

  @Post('session/:sessionId/play')
  async playPrediction(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @Body('choice') choice: string,
    @Body('betAmount') betAmount?: number,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = this.extractUserId(req, bodyUserId);
    return this.hiloService.playPrediction(userId, sessionId, choice, betAmount);
  }

  @Post('session/:sessionId/cashout')
  async cashoutSession(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = this.extractUserId(req, bodyUserId);
    return this.hiloService.cashoutSession(userId, sessionId);
  }

  @Get('session/history')
  async getSessionHistory(
    @Req() req: any,
    @Query('userId') queryUserId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = this.extractUserId(req, undefined, queryUserId);
    return this.hiloService.getSessionHistory(userId, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Get('session/:sessionId')
  async getSessionDetails(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @Query('userId') queryUserId?: string,
  ) {
    const userId = this.extractUserId(req, undefined, queryUserId);
    return this.hiloService.getSessionDetails(userId, sessionId);
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

