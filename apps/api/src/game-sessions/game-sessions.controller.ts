import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GameSessionsService } from './game-sessions.service.js';
import { LaunchGameDto } from './dto/launch-game.dto.js';

@Controller()
export class GameSessionsController {
  constructor(private readonly gameSessionsService: GameSessionsService) {}

  @Post('games/:gameId/launch')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async launchGame(
    @Param('gameId') gameId: string,
    @Body() body: Partial<LaunchGameDto>,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    const dto: LaunchGameDto = {
      gameId,
      mode: body.mode || 'REAL',
      currency: body.currency || 'INR',
      providerId: body.providerId,
      idempotencyKey: body.idempotencyKey,
      metadata: body.metadata,
    };
    return this.gameSessionsService.launchGame(userId, dto);
  }

  @Get('game-sessions/me')
  @UseGuards(JwtAuthGuard)
  async getUserSessions(@Req() req: any) {
    return this.gameSessionsService.getUserSessions(req.user.id);
  }

  @Get('game-sessions/validate')
  async validateToken(
    @Query('st') st?: string,
    @Query('gt') gt?: string,
    @Query('ticket') ticket?: string,
    @Query('t') t?: string,
    @Query('token') token?: string,
    @Query('authToken') authToken?: string,
    @Query('sessionToken') sessionToken?: string,
  ) {
    const rawToken = st || gt || ticket || t || token || authToken || sessionToken || '';
    return this.gameSessionsService.validateToken(rawToken);
  }

  @Get('game-sessions/verify')
  async verifyToken(
    @Query('st') st?: string,
    @Query('gt') gt?: string,
    @Query('ticket') ticket?: string,
    @Query('t') t?: string,
    @Query('token') token?: string,
    @Query('authToken') authToken?: string,
    @Query('sessionToken') sessionToken?: string,
  ) {
    const rawToken = st || gt || ticket || t || token || authToken || sessionToken || '';
    return this.gameSessionsService.validateToken(rawToken);
  }

  @Get('game-sessions/:id/status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Param('id') id: string, @Req() req: any) {
    return this.gameSessionsService.getSessionStatus(id, req.user.id);
  }

  @Post('game-sessions/:id/heartbeat')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Param('id') id: string, @Req() req: any) {
    return this.gameSessionsService.heartbeat(id, req.user.id);
  }

  @Post('game-sessions/:id/close')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async closeSession(@Param('id') id: string, @Req() req: any) {
    return this.gameSessionsService.closeSession(id, req.user.id);
  }
}
