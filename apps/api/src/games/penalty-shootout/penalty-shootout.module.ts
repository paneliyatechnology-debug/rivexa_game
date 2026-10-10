import { Module } from '@nestjs/common';
import { PenaltyShootoutController } from './penalty-shootout.controller.js';
import { AdminPenaltyShootoutController } from './admin-penalty-shootout.controller.js';
import { PenaltyShootoutService } from './penalty-shootout.service.js';
import { DatabaseModule } from '../../database/database.module.js';
import { GameEngineModule } from '../game-engine/game-engine.module.js';

@Module({
  imports: [DatabaseModule, GameEngineModule],
  controllers: [PenaltyShootoutController, AdminPenaltyShootoutController],
  providers: [PenaltyShootoutService],
  exports: [PenaltyShootoutService],
})
export class PenaltyShootoutModule {}
