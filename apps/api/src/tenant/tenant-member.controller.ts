import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { TenantMemberService } from './tenant-member.service.js';
import { TenantAuthService } from './tenant-auth.service.js';

async function resolveActor(auth: string, tenantAuthService: TenantAuthService) {
  const token = auth?.replace('Bearer ', '').trim();
  return tenantAuthService.validateToken(token);
}

/**
 * All tenant member management routes — /api/v1/tenant/members/*
 * Actor identity is resolved from the Authorization header (tenant JWT)
 */
@Controller('tenant/members')
export class TenantMemberController {
  constructor(
    private readonly memberService: TenantMemberService,
    private readonly authService: TenantAuthService,
  ) {}

  // ─── List members visible to the authenticated actor ─────────────────────
  @Get()
  async listMembers(
    @Headers('authorization') auth: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    const actor = await resolveActor(auth, this.authService);
    return this.memberService.listMembers(actor.tenantId, actor.id, actor.role as any, { role, status });
  }

  // ─── Create a child member ────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMember(@Headers('authorization') auth: string, @Body() body: any) {
    const actor = await resolveActor(auth, this.authService);
    return this.memberService.createMember(actor.tenantId, actor.id, actor.role as any, body);
  }

  // ─── Get credit log for the authenticated member ───────────────────────────
  @Get('credit-logs')
  async getMyCreditLogs(
    @Headers('authorization') auth: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const actor = await resolveActor(auth, this.authService);
    return this.memberService.getMemberCreditLogs(actor.tenantId, actor.id, Number(page ?? 1), Number(limit ?? 30));
  }

  // ─── Players management ───────────────────────────────────────────────────
  @Get('players')
  async listPlayers(
    @Headers('authorization') auth: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const actor = await resolveActor(auth, this.authService);
    return this.memberService.listPlayers(actor.tenantId, actor.id, actor.role as any, Number(page ?? 1), Number(limit ?? 50));
  }

  @Post('players')
  async addPlayer(@Headers('authorization') auth: string, @Body('userId') userId: string) {
    const actor = await resolveActor(auth, this.authService);
    return this.memberService.addPlayer(actor.tenantId, actor.id, userId);
  }

  // ─── Transfer credits (body format) ──────────────────────────────────────────
  @Post('transfer-credits')
  async transferCreditBody(
    @Headers('authorization') auth: string,
    @Body('receiverId') receiverId: string,
    @Body('amount') amount: number,
    @Body('description') description?: string,
    @Body('remarks') remarks?: string,
    @Body('action') action?: 'ADD' | 'DEDUCT',
  ) {
    const actor = await resolveActor(auth, this.authService);
    return this.memberService.transferCredit(
      actor.tenantId,
      actor.id,
      actor.role as any,
      receiverId,
      Number(amount),
      description || remarks,
      action || 'ADD',
    );
  }

  // ─── Toggle active/suspended status ──────────────────────────────────────
  @Post(':id/toggle-status')
  async toggleStatus(@Headers('authorization') auth: string, @Param('id') targetId: string) {
    const actor = await resolveActor(auth, this.authService);
    return this.memberService.toggleStatus(actor.tenantId, actor.id, actor.role as any, targetId);
  }

  // ─── Transfer credits to a child member or player (param format) ───────────
  @Post(':id/credit')
  async transferCredit(
    @Headers('authorization') auth: string,
    @Param('id') receiverId: string,
    @Body('amount') amount: number,
    @Body('description') description?: string,
    @Body('remarks') remarks?: string,
    @Body('action') action?: 'ADD' | 'DEDUCT',
  ) {
    const actor = await resolveActor(auth, this.authService);
    return this.memberService.transferCredit(
      actor.tenantId,
      actor.id,
      actor.role as any,
      receiverId,
      Number(amount),
      description || remarks,
      action || 'ADD',
    );
  }

  // ─── Update a member ─────────────────────────────────────────────────────
  @Put(':id')
  async updateMember(
    @Headers('authorization') auth: string,
    @Param('id') targetId: string,
    @Body() body: any,
  ) {
    const actor = await resolveActor(auth, this.authService);
    return this.memberService.updateMember(actor.tenantId, actor.id, actor.role as any, targetId, body);
  }

  // ─── Delete a member ──────────────────────────────────────────────────────
  @Delete(':id')
  async deleteMember(@Headers('authorization') auth: string, @Param('id') targetId: string) {
    const actor = await resolveActor(auth, this.authService);
    return this.memberService.deleteMember(actor.tenantId, actor.id, actor.role as any, targetId);
  }

  // ─── Reset Member or Player password ──────────────────────────────────────
  @Post(':id/reset-password')
  async resetPassword(
    @Headers('authorization') auth: string,
    @Param('id') targetId: string,
    @Body('password') password: string,
  ) {
    const actor = await resolveActor(auth, this.authService);
    return this.memberService.resetPassword(actor.tenantId, actor.id, actor.role as any, targetId, password);
  }
}
