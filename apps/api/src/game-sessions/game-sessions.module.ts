import { Module, OnModuleInit } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { GameSessionsService } from './game-sessions.service.js';
import { GameSessionTokenService } from './game-session-token.service.js';
import { GameSessionAuditService } from './game-session-audit.service.js';
import { GameSessionCleanupService } from './game-session-cleanup.service.js';
import { GameSessionValidationGuard } from './game-session-validation.guard.js';
import { GameProviderRegistry } from './providers/game-provider.registry.js';
import { InternalGameProviderAdapter } from './providers/internal-game-provider.adapter.js';
import { MockGameProviderAdapter } from './providers/mock-game-provider.adapter.js';
import { GameSessionsController } from './game-sessions.controller.js';
import { AdminGameSessionsController } from './admin-game-sessions.controller.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [GameSessionsController, AdminGameSessionsController],
  providers: [
    GameSessionsService,
    GameSessionTokenService,
    GameSessionAuditService,
    GameSessionCleanupService,
    GameSessionValidationGuard,
    GameProviderRegistry,
    InternalGameProviderAdapter,
    MockGameProviderAdapter,
  ],
  exports: [
    GameSessionsService,
    GameSessionTokenService,
    GameSessionValidationGuard,
    GameProviderRegistry,
    GameSessionAuditService,
  ],
})
export class GameSessionsModule implements OnModuleInit {
  constructor(
    private readonly providerRegistry: GameProviderRegistry,
    private readonly internalAdapter: InternalGameProviderAdapter,
    private readonly mockAdapter: MockGameProviderAdapter,
  ) {}

  onModuleInit() {
    this.providerRegistry.registerProvider(this.internalAdapter);
    this.providerRegistry.registerProvider(this.mockAdapter);
  }
}
