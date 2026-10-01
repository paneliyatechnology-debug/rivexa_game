import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { CricketDataController } from './cricket-data.controller.js';
import { CricketDataService } from './cricket-data.service.js';
import { CricApiProvider } from './providers/cricapi.provider.js';
import { SportsModule } from '../../sports/sports.module.js';

@Module({
  imports: [DatabaseModule, forwardRef(() => SportsModule)],
  controllers: [CricketDataController],
  providers: [CricketDataService, CricApiProvider],
  exports: [CricketDataService, CricApiProvider],
})
export class CricketDataModule {}
