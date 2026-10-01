import { Module } from '@nestjs/common';
import { ReferralService } from './referral.service.js';
import { ReferralController } from './referral.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
