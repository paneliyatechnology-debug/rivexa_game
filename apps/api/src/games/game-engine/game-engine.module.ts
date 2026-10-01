import { Module, Global, forwardRef } from '@nestjs/common';
import { GameGateway } from './game.gateway.js';
import { GameOverrideService } from './game-override.service.js';
import { CrashModule } from '../crash/crash.module.js';
import { JetModule } from '../jet/jet.module.js';
import { PushparaniModule } from '../pushparani/pushparani.module.js';

@Global()
@Module({
  imports: [
    forwardRef(() => CrashModule),
    forwardRef(() => JetModule),
    forwardRef(() => PushparaniModule),
  ],
  providers: [GameGateway, GameOverrideService],
  exports: [GameGateway, GameOverrideService],
})
export class GameEngineModule {}

