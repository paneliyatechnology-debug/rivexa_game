import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GameSessionsService } from './game-sessions.service.js';
import { GameSessionQueryDto } from './dto/game-session-query.dto.js';

@Controller('admin/game-sessions')
export class AdminGameSessionsController {
  constructor(private readonly gameSessionsService: GameSessionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getSessions(@Query() query: GameSessionQueryDto) {
    return this.gameSessionsService.getAdminSessions(query);
  }

  @Post(':id/revoke')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    const adminId = req.user?.id || 'admin';
    return this.gameSessionsService.revokeSession(id, adminId, reason);
  }
}
