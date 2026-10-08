import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { ChickenRoadService } from './chicken-road.service.js';
import { ChickenRoadFairnessService } from './fairness.service.js';
import { ChickenRoadMultiplierService } from './multiplier.service.js';
import { ChickenRoadGateway } from './chicken-road.gateway.js';
import { ChickenRoadController } from './chicken-road.controller.js';
import { AdminChickenRoadController } from './admin-chicken-road.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ChickenRoadController, AdminChickenRoadController],
  providers: [
    ChickenRoadService,
    ChickenRoadFairnessService,
    ChickenRoadMultiplierService,
    ChickenRoadGateway,
  ],
  exports: [
    ChickenRoadService,
    ChickenRoadFairnessService,
    ChickenRoadMultiplierService,
    ChickenRoadGateway,
  ],
})
export class ChickenRoadModule {}
