import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { WalletModule } from './wallet/wallet.module.js';
import { ReferralModule } from './referral/referral.module.js';
import { MinesModule } from './games/mines/mines.module.js';
import { ParityModule } from './games/parity/parity.module.js';
import { SpinModule } from './games/spin/spin.module.js';
import { DiceModule } from './games/dice/dice.module.js';
import { CrashModule } from './games/crash/crash.module.js';
import { JetModule } from './games/jet/jet.module.js';
import { AndarBaharModule } from './games/andar-bahar/andar-bahar.module.js';
import { PushparaniModule } from './games/pushparani/pushparani.module.js';
import { CoinFlipModule } from './games/coin-flip/coin-flip.module.js';
import { HiloModule } from './games/hilo/hilo.module.js';
import { AdminModule } from './admin/admin.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { TasksModule } from './tasks/tasks.module.js';

import { GameEngineModule } from './games/game-engine/game-engine.module.js';
import { SportsModule } from './sports/sports.module.js';
import { CricketDataModule } from './modules/cricket-data/cricket-data.module.js';
import { CricketMarketsModule } from './modules/cricket-markets/cricket-markets.module.js';
import { TenantModule } from './tenant/tenant.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    WalletModule,
    ReferralModule,
    MinesModule,
    ParityModule,
    SpinModule,
    DiceModule,
    CrashModule,
    JetModule,
    AndarBaharModule,
    PushparaniModule,
    CoinFlipModule,
    HiloModule,
    AdminModule,
    NotificationsModule,
    TasksModule,
    GameEngineModule,
    SportsModule,
    CricketDataModule,
    CricketMarketsModule,
    TenantModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

