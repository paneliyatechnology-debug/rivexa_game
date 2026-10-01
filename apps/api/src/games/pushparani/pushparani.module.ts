import { Module, forwardRef } from '@nestjs/common';
import { PushparaniController } from './pushparani.controller.js';
import { PushparaniService } from './pushparani.service.js';
import { DatabaseModule } from '../../database/database.module.js';
import { ReferralModule } from '../../referral/referral.module.js';
import { GameEngineModule } from '../game-engine/game-engine.module.js';

@Module({
  imports: [DatabaseModule, ReferralModule, forwardRef(() => GameEngineModule)],
  controllers: [PushparaniController],
  providers: [PushparaniService],
  exports: [PushparaniService],
})
export class PushparaniModule {}
