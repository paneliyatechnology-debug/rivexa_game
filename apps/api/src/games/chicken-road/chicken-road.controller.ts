import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChickenRoadService } from './chicken-road.service.js';
import { CreateRoundDto, MoveDto, CashoutDto } from './dto/chicken-road.dto.js';

import { toValidUserId } from '../../common/utils/user-id.util.js';

function extractUserId(req: any): string {
  const rawId =
    req.user?.id ||
    req.user?.userId ||
    req.headers['authorization'] ||
    req.headers['x-user-id'] ||
    req.headers['user-id'] ||
    req.query?.userId ||
    req.body?.userId;
  return toValidUserId(rawId);
}

@Controller('game/chicken-road')
export class ChickenRoadController {
  constructor(private readonly chickenRoadService: ChickenRoadService) {}

  @Get('config')
  getConfig() {
    return {
      success: true,
      data: this.chickenRoadService.getGameConfig(),
    };
  }

  @Get('difficulties')
  async getDifficulties() {
    const difficulties = await this.chickenRoadService.getDifficulties();
    return {
      success: true,
      data: difficulties,
    };
  }

  @Post('rounds')
  @HttpCode(HttpStatus.CREATED)
  async createRound(@Req() req: any, @Body() dto: CreateRoundDto) {
    const userId = extractUserId(req);
    const data = await this.chickenRoadService.createRound(userId, dto);
    return {
      success: true,
      message: 'Round created successfully',
      data,
    };
  }

  @Get('rounds/active')
  async getActiveRound(@Req() req: any) {
    const userId = extractUserId(req);
    const data = await this.chickenRoadService.getActiveRound(userId);
    return {
      success: true,
      data,
    };
  }

  @Post('rounds/:id/start')
  @HttpCode(HttpStatus.OK)
  async startRound(@Req() req: any, @Param('id') id: string) {
    const userId = extractUserId(req);
    const data = await this.chickenRoadService.startRound(userId, id);
    return {
      success: true,
      message: 'Round started',
      data,
    };
  }

  @Post('rounds/:id/move')
  @HttpCode(HttpStatus.OK)
  async move(@Req() req: any, @Param('id') id: string, @Body() dto: MoveDto) {
    const userId = extractUserId(req);
    const data = await this.chickenRoadService.move(userId, id, dto?.requestId);
    return {
      success: true,
      data,
    };
  }

  @Post('rounds/:id/cashout')
  @HttpCode(HttpStatus.OK)
  async cashout(@Req() req: any, @Param('id') id: string, @Body() dto: CashoutDto) {
    const userId = extractUserId(req);
    const data = await this.chickenRoadService.cashout(userId, id, dto?.requestId);
    return {
      success: true,
      message: 'Cashed out successfully',
      data,
    };
  }

  @Get('history')
  async getHistory(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = extractUserId(req);
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    const data = await this.chickenRoadService.getHistory(userId, pageNum, limitNum);
    return {
      success: true,
      data,
    };
  }

  @Get('fairness/:id')
  async getFairness(@Param('id') id: string) {
    const data = await this.chickenRoadService.getFairness(id);
    return {
      success: true,
      data,
    };
  }
}
