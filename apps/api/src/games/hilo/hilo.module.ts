import { Module } from '@nestjs/common';
import { HiloController, GamesHiloController } from './hilo.controller.js';
import { HiloService } from './hilo.service.js';
import { DatabaseModule } from '../../database/database.module.js';
import { ReferralModule } from '../../referral/referral.module.js';
import { GameEngineModule } from '../game-engine/game-engine.module.js';

@Module({
  imports: [DatabaseModule, ReferralModule, GameEngineModule],
  controllers: [HiloController, GamesHiloController],
  providers: [HiloService],
  exports: [HiloService],
})
export class HiloModule {}
