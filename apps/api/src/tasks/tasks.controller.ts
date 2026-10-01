import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async getTasks(@Req() req: any) {
    return this.tasksService.getTasks(req.user.id);
  }

  @Post('claim')
  async claimTask(@Req() req: any, @Body('taskId') taskId: string) {
    return this.tasksService.claimTask(req.user.id, taskId);
  }

  @Post('redeem-coupon')
  async redeemCoupon(@Req() req: any, @Body('code') code: string) {
    return this.tasksService.redeemCoupon(req.user.id, code);
  }
}
