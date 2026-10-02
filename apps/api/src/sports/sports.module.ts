import { Module, forwardRef } from '@nestjs/common';
import { SportsService } from './sports.service.js';
import { SportsProviderService } from './sports-provider.service.js';
import { SportsGateway } from './sports.gateway.js';
import { SportsController, MatchDetailController } from './sports.controller.js';
import { AdminSportsController } from './admin-sports.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { CricketMarketsModule } from '../modules/cricket-markets/cricket-markets.module.js';
import { CricketDataModule } from '../modules/cricket-data/cricket-data.module.js';

@Module({
  imports: [DatabaseModule, CricketMarketsModule, forwardRef(() => CricketDataModule)],
  controllers: [SportsController, MatchDetailController, AdminSportsController],
  providers: [SportsService, SportsProviderService, SportsGateway],
  exports: [SportsService, SportsGateway, SportsProviderService],
})
export class SportsModule {}

