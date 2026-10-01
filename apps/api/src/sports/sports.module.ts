import { Module } from '@nestjs/common';
import { SportsService } from './sports.service.js';
import { SportsProviderService } from './sports-provider.service.js';
import { SportsGateway } from './sports.gateway.js';
import { SportsController, MatchDetailController } from './sports.controller.js';
import { AdminSportsController } from './admin-sports.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SportsController, MatchDetailController, AdminSportsController],
  providers: [SportsService, SportsProviderService, SportsGateway],
  exports: [SportsService, SportsGateway],
})
export class SportsModule {}
