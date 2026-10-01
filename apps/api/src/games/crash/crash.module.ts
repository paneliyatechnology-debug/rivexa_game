import { Module, forwardRef } from '@nestjs/common';
import { CrashController } from './crash.controller.js';
import { CrashService } from './crash.service.js';
import { DatabaseModule } from '../../database/database.module.js';
import { ReferralModule } from '../../referral/referral.module.js';
import { GameEngineModule } from '../game-engine/game-engine.module.js';

@Module({
  imports: [DatabaseModule, ReferralModule, forwardRef(() => GameEngineModule)],
  controllers: [CrashController],
  providers: [CrashService],
  exports: [CrashService],
})
export class CrashModule {}
