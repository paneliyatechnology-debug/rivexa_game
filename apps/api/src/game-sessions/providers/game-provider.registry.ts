import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GameProviderAdapter } from '../interfaces/game-provider-adapter.interface.js';

@Injectable()
export class GameProviderRegistry {
  private readonly logger = new Logger(GameProviderRegistry.name);
  private readonly providers = new Map<string, GameProviderAdapter>();

  registerProvider(adapter: GameProviderAdapter): void {
    this.providers.set(adapter.providerId.toLowerCase(), adapter);
    this.logger.log(`Registered game provider adapter: ${adapter.providerName} (${adapter.providerId})`);
  }

  getProvider(providerId: string): GameProviderAdapter {
    const key = providerId.toLowerCase();
    const adapter = this.providers.get(key);
    if (!adapter) {
      throw new NotFoundException(`Game provider adapter '${providerId}' is not registered.`);
    }
    return adapter;
  }

  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId.toLowerCase());
  }

  getAllProviders(): GameProviderAdapter[] {
    return Array.from(this.providers.values());
  }
}
