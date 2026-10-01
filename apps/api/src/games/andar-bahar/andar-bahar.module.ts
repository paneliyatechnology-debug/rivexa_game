import { Module } from '@nestjs/common';
import { AndarBaharController } from './andar-bahar.controller.js';
import { AndarBaharService } from './andar-bahar.service.js';
import { DatabaseModule } from '../../database/database.module.js';
import { ReferralModule } from '../../referral/referral.module.js';
import { GameEngineModule } from '../game-engine/game-engine.module.js';

@Module({
  imports: [DatabaseModule, ReferralModule, GameEngineModule],
  controllers: [AndarBaharController],
  providers: [AndarBaharService],
  exports: [AndarBaharService],
})
export class AndarBaharModule {}
