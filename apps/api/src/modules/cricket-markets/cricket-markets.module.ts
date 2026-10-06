import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { SportsModule } from '../../sports/sports.module.js';
import { CricketMarketsController } from './cricket-markets.controller.js';
import { CricketMarketsService } from './cricket-markets.service.js';
import { MatchStateService } from './match-state.service.js';

// Pricing Engine & History Subservices
import { ProbabilityEngineService } from './pricing/probability-engine.service.js';
import { FairOddsService } from './pricing/fair-odds.service.js';
import { MarginService } from './pricing/margin.service.js';
import { ExposureEngineService } from './pricing/exposure-engine.service.js';
import { RiskEngineService } from './pricing/risk-engine.service.js';
import { PricingEngineService } from './pricing/pricing-engine.service.js';
import { OddsHistoryService } from './history/odds-history.service.js';
import { MarketHistoryService } from './history/market-history.service.js';
import { MarketSnapshotService } from './snapshots/market-snapshot.service.js';
import { CricketMarketAdminService } from './admin/cricket-market-admin.service.js';
import { CricketMarketAdminController } from './admin/cricket-market-admin.controller.js';

// Settlement Subservices
import { CricketResultResolver } from './settlement/cricket-result-resolver.service.js';
import { CricketBetReconciliationService } from './settlement/cricket-bet-reconciliation.service.js';
import { CricketSettlementDebugService } from './settlement/cricket-settlement-debug.service.js';

@Module({
  imports: [DatabaseModule, forwardRef(() => SportsModule)],
  controllers: [CricketMarketsController, CricketMarketAdminController],
  providers: [
    CricketMarketsService,
    MatchStateService,
    ProbabilityEngineService,
    FairOddsService,
    MarginService,
    ExposureEngineService,
    RiskEngineService,
    PricingEngineService,
    OddsHistoryService,
    MarketHistoryService,
    MarketSnapshotService,
    CricketMarketAdminService,
    CricketResultResolver,
    CricketBetReconciliationService,
    CricketSettlementDebugService,
  ],
  exports: [
    CricketMarketsService,
    MatchStateService,
    PricingEngineService,
    OddsHistoryService,
    MarketHistoryService,
    CricketMarketAdminService,
    CricketResultResolver,
    CricketBetReconciliationService,
    CricketSettlementDebugService,
  ],
})
export class CricketMarketsModule {}
