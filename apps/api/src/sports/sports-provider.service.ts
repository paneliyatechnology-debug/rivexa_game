import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { SportsGateway } from './sports.gateway.js';
import { CricketDataService } from '../modules/cricket-data/cricket-data.service.js';

@Injectable()
export class SportsProviderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SportsProviderService.name);
  private syncIntervalHandle: NodeJS.Timeout | null = null;
  private isAutoSyncActive = true;
  private syncIntervalMs = parseInt(process.env.CRICKET_API_SYNC_INTERVAL || '5000', 10);

  constructor(
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => SportsGateway))
    private readonly gateway: SportsGateway,
    @Inject(forwardRef(() => CricketDataService))
    private readonly cricketDataService: CricketDataService
  ) {}

  onModuleInit() {
    this.startProviderSync();
  }

  onModuleDestroy() {
    this.stopProviderSync();
  }

  public setAutoSync(enabled: boolean, intervalMs?: number) {
    this.isAutoSyncActive = enabled;
    if (intervalMs && intervalMs > 0) {
      this.syncIntervalMs = intervalMs;
    }
    this.stopProviderSync();
    if (enabled) {
      this.startProviderSync();
    }
    this.logger.log(`Third-Party Live Cricket Sync ${enabled ? 'ENABLED' : 'DISABLED'} (${this.syncIntervalMs}ms interval)`);
  }

  public getAutoSyncStatus() {
    return {
      autoSync: this.isAutoSyncActive,
      intervalMs: this.syncIntervalMs,
      providerName: this.cricketDataService?.activeProviderName || 'Third-Party Cricket API',
      status: this.isAutoSyncActive ? 'ACTIVE_SYNC' : 'PAUSED',
    };
  }

  public async triggerInstantLiveBall(): Promise<any> {
    return await this.syncLiveProviderData();
  }

  private stopProviderSync() {
    if (this.syncIntervalHandle) {
      clearInterval(this.syncIntervalHandle);
      this.syncIntervalHandle = null;
    }
  }

  private startProviderSync() {
    this.stopProviderSync();
    this.logger.log(`Starting Third-Party Live Cricket API Sync (${this.syncIntervalMs}ms interval)...`);
    this.syncIntervalHandle = setInterval(async () => {
      if (!this.isAutoSyncActive) return;
      try {
        await this.syncLiveProviderData();
      } catch (err) {
        this.logger.error('Error in Third-Party Live Cricket API sync loop', err);
      }
    }, this.syncIntervalMs);
  }

  public async syncLiveProviderData(): Promise<any> {
    try {
      if (!this.cricketDataService) {
        return { success: false, message: 'CricketDataService not injected yet' };
      }
      const matches = await this.cricketDataService.getCurrentMatches();
      return { success: true, count: matches?.length || 0, matches };
    } catch (err: any) {
      this.logger.error('Failed syncing live provider data', err);
      return { success: false, error: err.message || String(err) };
    }
  }
}
