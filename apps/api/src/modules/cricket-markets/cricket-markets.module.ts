import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { CricketMarketsController } from './cricket-markets.controller.js';
import { CricketMarketsService } from './cricket-markets.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [CricketMarketsController],
  providers: [CricketMarketsService],
  exports: [CricketMarketsService],
})
export class CricketMarketsModule {}
