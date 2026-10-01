import { Controller, Post, Get, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { TenantAuthService } from './tenant-auth.service.js';

/**
 * Tenant member auth endpoints — /api/v1/tenant/auth/*
 */
@Controller('tenant/auth')
export class TenantAuthController {
  constructor(private readonly tenantAuthService: TenantAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { tenantSlug: string; email: string; password: string }) {
    return this.tenantAuthService.login(body);
  }

  @Get('me')
  async getMe(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '').trim();
    const payload = await this.tenantAuthService.validateToken(token);
    return this.tenantAuthService.getMe(payload.id, payload.tenantId);
  }
}
