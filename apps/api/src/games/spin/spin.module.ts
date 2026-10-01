import { Module } from '@nestjs/common';
import { SpinController } from './spin.controller.js';
import { SpinService } from './spin.service.js';
import { GameEngineModule } from '../game-engine/game-engine.module.js';
import { ReferralModule } from '../../referral/referral.module.js';

@Module({
  imports: [GameEngineModule, ReferralModule],
  controllers: [SpinController],
  providers: [SpinService],
  exports: [SpinService],
})
export class SpinModule {}
