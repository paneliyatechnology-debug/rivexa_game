import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TenantService } from './tenant.service.js';

/**
 * Platform-owner level tenant management endpoints.
 * All routes prefixed with /api/v1/platform/tenants
 */
@Controller('platform/tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  async listTenants() {
    return this.tenantService.listTenants();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTenant(@Body() body: any) {
    return this.tenantService.createTenant(body);
  }

  @Get(':id/stats')
  async getTenantStats(@Param('id') id: string) {
    return this.tenantService.getTenantStats(id);
  }

  @Get(':id/audit-logs')
  async getAuditLogs(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantService.getAuditLogs(id, Number(page ?? 1), Number(limit ?? 50));
  }

  @Post(':id/credits')
  async allocateCredits(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Body('remarks') remarks?: string,
  ) {
    return this.tenantService.allocateCredit(id, Number(amount), remarks);
  }

  @Get(':id')
  async getTenant(@Param('id') id: string) {
    return this.tenantService.getTenant(id);
  }

  @Put(':id')
  async updateTenant(@Param('id') id: string, @Body() body: any) {
    return this.tenantService.updateTenant(id, body);
  }

  @Delete(':id')
  async deleteTenant(@Param('id') id: string) {
    return this.tenantService.deleteTenant(id);
  }
}
