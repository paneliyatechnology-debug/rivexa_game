import { Module } from '@nestjs/common';
import { DiceController } from './dice.controller.js';
import { DiceService } from './dice.service.js';
import { DatabaseModule } from '../../database/database.module.js';
import { ReferralModule } from '../../referral/referral.module.js';
import { GameEngineModule } from '../game-engine/game-engine.module.js';

@Module({
  imports: [DatabaseModule, ReferralModule, GameEngineModule],
  controllers: [DiceController],
  providers: [DiceService],
  exports: [DiceService],
})
export class DiceModule {}
