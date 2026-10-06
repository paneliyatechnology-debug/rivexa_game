import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { CricketDataController } from './cricket-data.controller.js';
import { CricketDataService } from './cricket-data.service.js';
import { CricApiProvider } from './providers/cricapi.provider.js';
import { GenericRestProvider } from './providers/generic-rest.provider.js';
import { SportsModule } from '../../sports/sports.module.js';
import { CricketMarketsModule } from '../cricket-markets/cricket-markets.module.js';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => SportsModule),
    forwardRef(() => CricketMarketsModule),
  ],
  controllers: [CricketDataController],
  providers: [CricketDataService, CricApiProvider, GenericRestProvider],
  exports: [CricketDataService, CricApiProvider, GenericRestProvider],
})
export class CricketDataModule {}
