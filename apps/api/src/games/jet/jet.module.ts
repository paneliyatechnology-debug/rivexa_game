import { Module, forwardRef } from '@nestjs/common';
import { JetService } from './jet.service.js';
import { JetController } from './jet.controller.js';
import { ReferralModule } from '../../referral/referral.module.js';
import { GameEngineModule } from '../game-engine/game-engine.module.js';

@Module({
  imports: [ReferralModule, forwardRef(() => GameEngineModule)],
  controllers: [JetController],
  providers: [JetService],
  exports: [JetService],
})
export class JetModule {}
