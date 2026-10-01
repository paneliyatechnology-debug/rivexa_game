import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { TenantController } from './tenant.controller.js';
import { TenantService } from './tenant.service.js';
import { TenantAuthController } from './tenant-auth.controller.js';
import { TenantAuthService } from './tenant-auth.service.js';
import { TenantMemberController } from './tenant-member.controller.js';
import { TenantMemberService } from './tenant-member.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [TenantController, TenantAuthController, TenantMemberController],
  providers: [TenantService, TenantAuthService, TenantMemberService],
  exports: [TenantService, TenantAuthService, TenantMemberService],
})
export class TenantModule {}
