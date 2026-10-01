import { Module } from '@nestjs/common';
import { MinesController } from './mines.controller.js';
import { MinesService } from './mines.service.js';
import { DatabaseModule } from '../../database/database.module.js';
import { ReferralModule } from '../../referral/referral.module.js';
import { GameEngineModule } from '../game-engine/game-engine.module.js';

@Module({
  imports: [DatabaseModule, ReferralModule, GameEngineModule],
  controllers: [MinesController],
  providers: [MinesService],
  exports: [MinesService],
})
export class MinesModule {}
