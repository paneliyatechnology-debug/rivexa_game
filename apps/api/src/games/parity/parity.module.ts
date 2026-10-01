import { Module } from '@nestjs/common';
import { ParityController } from './parity.controller.js';
import { ParityService } from './parity.service.js';
import { DatabaseModule } from '../../database/database.module.js';
import { ReferralModule } from '../../referral/referral.module.js';
import { GameEngineModule } from '../game-engine/game-engine.module.js';

@Module({
  imports: [DatabaseModule, ReferralModule, GameEngineModule],
  controllers: [ParityController],
  providers: [ParityService],
  exports: [ParityService],
})
export class ParityModule {}
