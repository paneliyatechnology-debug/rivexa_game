import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef, NotFoundException, Optional } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service.js';
import { CricApiProvider } from './providers/cricapi.provider.js';
import { GenericRestProvider } from './providers/generic-rest.provider.js';
import {
  ICricketDataProvider,
  ProviderCapabilityRegistry,
  ProviderMatch,
  ProviderMatchDetail,
  ProviderSquad,
  ProviderSeries,
  ProviderSeriesDetail,
  ProviderPlayer,
  ProviderPlayerDetail,
} from './cricket-data-provider.interface.js';
import { SportsGateway } from '../../sports/sports.gateway.js';

import { SportsService } from '../../sports/sports.service.js';
import { CricketMarketsService } from '../cricket-markets/cricket-markets.service.js';

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

// ─── Rate-limit guardian ───────────────────────────────────────────────────────
// CricAPI free plan = 100 hits / day (resets midnight UTC)
// We leave 10% buffer → usable: 90 hits/day
// Budget split: 60 for live-match polling, 30 for upcoming refresh
const MAX_DAILY_HITS = parseInt(process.env.CRICAPI_MAX_DAILY_HITS || '90', 10);
const HITS_RESET_MS   = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class CricketDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CricketDataService.name);
  private _activeProviderName = process.env.CRICAPI_PROVIDER || 'cricapi';
  private readonly providers = new Map<string, ICricketDataProvider>();
  private readonly cache = new Map<string, CacheItem<any>>();

  // ── Background poller state ────────────────────────────────────────────────
  private pollerTimer: NodeJS.Timeout | null = null;
  private upcomingPollerTimer: NodeJS.Timeout | null = null;
  private isPolling = false;

  // ── Daily hit-budget tracker ───────────────────────────────────────────────
  private hitsToday = 0;
  private hitsResetAt = Date.now() + HITS_RESET_MS;

  // ── Score fingerprint to detect real changes ───────────────────────────────
  private lastScoreFingerprint = new Map<string, string>();

  constructor(
    private readonly db: DatabaseService,
    private readonly cricApiProvider: CricApiProvider,
    private readonly genericRestProvider: GenericRestProvider,
    @Inject(forwardRef(() => SportsGateway))
    private readonly sportsGateway: SportsGateway,
    @Inject(forwardRef(() => SportsService))
    private readonly sportsService: SportsService,
    @Optional() @Inject(forwardRef(() => CricketMarketsService))
    private readonly cricketMarketsService?: CricketMarketsService
  ) {
    this.providers.set(cricApiProvider.providerName, cricApiProvider);
    this.providers.set(genericRestProvider.providerName, genericRestProvider);
    this.providers.set('entitysport', genericRestProvider);
    this.providers.set('sportmonks', genericRestProvider);
    this.providers.set('custom_rest', genericRestProvider);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async onModuleInit() {
    try {
      await this.ensureProviderRegistered(this.activeProviderName);
      await this.cleanCorruptedMatchData();
    } catch (err: any) {
      this.logger.warn(`Failed ensuring cricket provider: ${err.message}`);
    }

    // Start background real-time poller
    this.startBackgroundPoller();
  }

  public async cleanCorruptedMatchData() {
    try {
      const matches = await this.db.match.findMany({
        include: { teamA: true, teamB: true, scores: true },
      });

      for (const m of matches) {
        if (!m.resultSummary) continue;
        const resLower = m.resultSummary.toLowerCase();
        const teamAName = (m.teamA?.name || '').toLowerCase();
        const teamBName = (m.teamB?.name || '').toLowerCase();

        // Check if resultSummary refers to an unrelated team like Portugal on India U19 match
        if (
          resLower.includes('portugal') &&
          !teamAName.includes('portugal') &&
          !teamBName.includes('portugal')
        ) {
          this.logger.log(`Cleaning mismatched resultSummary '${m.resultSummary}' on match ${m.id}`);
          await this.db.match.update({
            where: { id: m.id },
            data: { resultSummary: 'Live Match' },
          });

          if (m.scores) {
            await this.db.matchScore.update({
              where: { matchId: m.id },
              data: { statusText: 'Live Match' },
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Error cleaning corrupted match data: ${err.message}`);
    }
  }

  onModuleDestroy() {
    this.stopBackgroundPoller();
  }

  // ── Budget helper ──────────────────────────────────────────────────────────

  private resetBudgetIfNeeded() {
    if (Date.now() >= this.hitsResetAt) {
      this.hitsToday = 0;
      this.hitsResetAt = Date.now() + HITS_RESET_MS;
      this.logger.log('[Budget] Daily hit-count reset');
    }
  }

  private get budgetRemaining(): number {
    this.resetBudgetIfNeeded();
    return Math.max(0, MAX_DAILY_HITS - this.hitsToday);
  }

  private consumeHit(n = 1) {
    this.resetBudgetIfNeeded();
    this.hitsToday += n;
  }

  // ── Background Poller ─────────────────────────────────────────────────────
  //
  // Strategy (like Cricbuzz):
  //   • Every LIVE_POLL_MS  → fetch currentMatches (live)     [1 API hit]
  //   • Every UPCM_POLL_MS  → fetch matches?status=upcoming   [1 API hit]
  //
  // Default intervals ensure ≤ 50 live hits + ≤ 24 upcoming hits / day:
  //   LIVE:  60 000 ms  → 1440 hits/day IF 24h — we cap at budget
  //   We dynamically skip polling if budget is < 2
  // ──────────────────────────────────────────────────────────────────────────

  private getLivePollInterval(): number {
    // env CRICKET_API_SYNC_INTERVAL (ms) or default 60 000 (60 s)
    const v = parseInt(process.env.CRICKET_API_SYNC_INTERVAL || '', 10);
    return isNaN(v) || v < 10000 ? 60_000 : v;
  }

  private getUpcomingPollInterval(): number {
    // Upcoming changes much slower — 5 min default
    const v = parseInt(process.env.CRICKET_API_UPCOMING_INTERVAL || '', 10);
    return isNaN(v) || v < 60000 ? 5 * 60_000 : v;
  }

  private startBackgroundPoller() {
    const liveMs     = this.getLivePollInterval();
    const upcomingMs = this.getUpcomingPollInterval();

    this.logger.log(
      `[CricketPoller] Starting — live every ${liveMs / 1000}s | upcoming every ${upcomingMs / 1000}s | budget=${MAX_DAILY_HITS} hits/day`
    );

    // Run immediately on startup, then repeat
    this.runLivePoll();

    this.pollerTimer = setInterval(() => this.runLivePoll(), liveMs);
    this.upcomingPollerTimer = setInterval(() => this.runUpcomingPoll(), upcomingMs);
  }

  private stopBackgroundPoller() {
    if (this.pollerTimer) { clearInterval(this.pollerTimer); this.pollerTimer = null; }
    if (this.upcomingPollerTimer) { clearInterval(this.upcomingPollerTimer); this.upcomingPollerTimer = null; }
    this.logger.log('[CricketPoller] Stopped');
  }

  /** Poll live matches — detects score changes and broadcasts via WebSocket */
  private async runLivePoll() {
    if (this.isPolling) return; // prevent overlap
    if (this.budgetRemaining < 1) {
      this.logger.warn(`[CricketPoller] Budget exhausted (${this.hitsToday}/${MAX_DAILY_HITS}). Skipping live poll.`);
      return;
    }

    this.isPolling = true;
    const start = Date.now();

    try {
      this.logger.debug(`[CricketPoller] Fetching live matches... (budget left: ${this.budgetRemaining})`);
      const matches = await this.activeProvider.getCurrentMatches();
      this.consumeHit(1);

      const duration = Date.now() - start;
      await this.logSyncEvent('bg:currentMatches', matches.length > 0 ? 'SUCCESS' : 'FAILED', duration, matches.length, null);

      if (matches.length > 0) {
        const changed = await this.persistMatchesWithChangeDetection(matches);
        if (changed > 0) {
          this.logger.log(`[CricketPoller] ${changed} match score(s) changed — WebSocket broadcasts sent.`);
          // Clear in-memory cache so next API request returns fresh data
          this.invalidateCachePattern('cricket:matches');
          if (this.sportsService) this.sportsService.clearCache('matches');
        }
      }

      this.logger.debug(`[CricketPoller] Live poll done in ${Date.now() - start}ms. Hits today: ${this.hitsToday}/${MAX_DAILY_HITS}`);
    } catch (err: any) {
      this.logger.error(`[CricketPoller] Live poll error: ${err.message}`);
    } finally {
      this.isPolling = false;
    }
  }

  /** Poll upcoming matches — refreshes upcoming match list */
  private async runUpcomingPoll() {
    if (this.budgetRemaining < 1) {
      this.logger.warn('[CricketPoller] Budget exhausted. Skipping upcoming poll.');
      return;
    }

    const start = Date.now();
    try {
      this.logger.debug('[CricketPoller] Fetching upcoming matches...');
      const matches = await this.activeProvider.getMatches(0);
      this.consumeHit(1);

      const duration = Date.now() - start;
      await this.logSyncEvent('bg:upcomingMatches', matches.length > 0 ? 'SUCCESS' : 'FAILED', duration, matches.length, null);

      if (matches.length > 0) {
        await this.persistMatches(matches);
        this.invalidateCachePattern('cricket:matches');
        if (this.sportsService) this.sportsService.clearCache('matches');
      }
      this.logger.debug(`[CricketPoller] Upcoming poll done in ${Date.now() - start}ms`);
    } catch (err: any) {
      this.logger.error(`[CricketPoller] Upcoming poll error: ${err.message}`);
    }
  }

  /** Manual sync trigger (admin) */
  async triggerManualSync(): Promise<{ success: boolean; message: string; count: number; hitsToday: number; budgetRemaining: number }> {
    const start = Date.now();
    try {
      if (this.budgetRemaining < 1) {
        return { success: false, message: `API budget exhausted (${this.hitsToday}/${MAX_DAILY_HITS} hits used today).`, count: 0, hitsToday: this.hitsToday, budgetRemaining: 0 };
      }
      const matches = await this.getCurrentMatches(true);
      const duration = Date.now() - start;
      await this.logSyncEvent('manualSync', 'SUCCESS', duration, matches.length);
      return { success: true, message: `Synced ${matches.length} live matches from CricAPI.`, count: matches.length, hitsToday: this.hitsToday, budgetRemaining: this.budgetRemaining };
    } catch (err: any) {
      const duration = Date.now() - start;
      await this.logSyncEvent('manualSync', 'FAILED', duration, 0, err.message);
      return { success: false, message: err.message, count: 0, hitsToday: this.hitsToday, budgetRemaining: this.budgetRemaining };
    }
  }

  /** Invalidate all cache keys matching prefix */
  private invalidateCachePattern(prefix: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }

  /** Budget / poller status for admin panels */
  getBudgetStatus() {
    return {
      hitsToday: this.hitsToday,
      hitsLimit: MAX_DAILY_HITS,
      budgetRemaining: this.budgetRemaining,
      hitsResetAt: new Date(this.hitsResetAt).toISOString(),
      livePollIntervalMs: this.getLivePollInterval(),
      upcomingPollIntervalMs: this.getUpcomingPollInterval(),
      pollerRunning: this.pollerTimer !== null,
    };
  }

  get activeProviderName(): string {
    return this._activeProviderName || process.env.CRICAPI_PROVIDER || process.env.CRICKET_DATA_PROVIDER || 'cricapi';
  }

  get activeProvider(): ICricketDataProvider {
    const provider = this.providers.get(this.activeProviderName);
    if (!provider) {
      this.logger.warn(`Configured provider "${this.activeProviderName}" not found. Falling back to cricapi.`);
      return this.cricApiProvider;
    }
    return provider;
  }

  getCapabilities(): ProviderCapabilityRegistry {
    return this.activeProvider.getCapabilities();
  }

  private getCacheTTL(isLive: boolean = false): number {
    const defaultTTL = isLive ? 10 : 60;
    const configured = parseInt(process.env.CRICAPI_CACHE_TTL_SECONDS || '', 10);
    return (isNaN(configured) ? defaultTTL : configured) * 1000;
  }

  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  private setInCache<T>(key: string, data: T, isLive: boolean = false): void {
    const ttl = this.getCacheTTL(isLive);
    this.cache.set(key, { data, expiresAt: Date.now() + ttl });
  }

  private async ensureProviderRegistered(providerName: string): Promise<any> {
    try {
      const existing = await this.db.cricketProvider.findUnique({
        where: { name: providerName },
      });

      const providerObj = this.providers.get(providerName) || this.cricApiProvider;
      const capabilities = providerObj.getCapabilities();

      if (!existing) {
        return await this.db.cricketProvider.create({
          data: {
            name: providerName,
            displayName: providerName === 'cricapi' ? 'CricAPI Test Provider' : providerName,
            baseUrl: process.env.CRICAPI_BASE_URL || 'https://api.cricapi.com/v1',
            isActive: true,
            isTestMode: true,
            capabilities: capabilities as any,
          },
        });
      }
      return existing;
    } catch (err) {
      this.logger.error(`Error ensuring provider registered for ${providerName}`, err);
      return null;
    }
  }

  // ─────────────────────────────────────────────
  // PUBLIC / FRONTEND MATCH & SERIES METHODS
  // ─────────────────────────────────────────────

  async getCurrentMatches(forceFresh = false): Promise<any[]> {
    const cacheKey = `cricket:matches:current:${this.activeProviderName}`;
    if (!forceFresh) {
      const cached = this.getFromCache<any[]>(cacheKey);
      if (cached) return cached;
    }

    if (forceFresh && this.budgetRemaining > 0) {
      try {
        const providerMatches = await this.activeProvider.getCurrentMatches();
        this.consumeHit(1);
        if (providerMatches.length > 0) {
          await this.persistMatches(providerMatches);
          this.invalidateCachePattern('cricket:matches');
          if (this.sportsService) this.sportsService.clearCache('matches');
        }
      } catch (err: any) {
        this.logger.error(`Error force fetching current matches: ${err.message}`);
      }
    }

    const dbMatches = await this.getEnrichedMatchesFromDb('LIVE');
    this.setInCache(cacheKey, dbMatches, true);
    return dbMatches;
  }

  async getMatches(status?: string, offset: number = 0): Promise<any[]> {
    const cacheKey = `cricket:matches:${status || 'all'}:${offset}:${this.activeProviderName}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    const dbMatches = await this.getEnrichedMatchesFromDb(status);
    this.setInCache(cacheKey, dbMatches, false);
    return dbMatches;
  }

  async getMatchDetail(matchIdOrProviderId: string): Promise<any | null> {
    const cacheKey = `cricket:match:${matchIdOrProviderId}:${this.activeProviderName}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    // Try finding in DB first
    let match = await this.db.match.findFirst({
      where: {
        OR: [{ id: matchIdOrProviderId }],
      },
      include: {
        teamA: true,
        teamB: true,
        competition: true,
        score: true,
        squadPlayers: {
          include: {
            player: true,
            team: true,
          },
        },
      },
    });

    if (!match) {
      // Lookup by provider mapping
      const mapping = await this.db.providerEntityMapping.findFirst({
        where: {
          entityType: 'MATCH',
          providerEntityId: matchIdOrProviderId,
        },
      });

      if (mapping) {
        match = await this.db.match.findUnique({
          where: { id: mapping.internalEntityId },
          include: {
            teamA: true,
            teamB: true,
            competition: true,
            score: true,
            squadPlayers: {
              include: {
                player: true,
                team: true,
              },
            },
          },
        });
      }
    }

    const capabilities = this.getCapabilities();
    const provider = await this.db.cricketProvider.findUnique({ where: { name: this.activeProviderName } });
    const result = {
      match,
      capabilities,
      providerName: this.activeProviderName,
      lastUpdated: match?.updatedAt?.toISOString() || null,
      lastSyncedAt: provider?.lastSyncAt?.toISOString() || null,
      isStale: !provider?.lastSyncAt,
    };

    if (match) {
      this.setInCache(cacheKey, result, match.status === 'LIVE');
    }
    return result;
  }

  async getMatchSquad(matchIdOrProviderId: string): Promise<any | null> {
    const cacheKey = `cricket:squad:${matchIdOrProviderId}:${this.activeProviderName}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    let matchId = matchIdOrProviderId;

    const mapping = await this.db.providerEntityMapping.findFirst({
      where: {
        entityType: 'MATCH',
        OR: [{ providerEntityId: matchIdOrProviderId }, { internalEntityId: matchIdOrProviderId }],
      },
    });

    if (mapping) {
      matchId = mapping.internalEntityId;
    }

    const squads = await this.db.cricketSquadPlayer.findMany({
      where: { matchId },
      include: {
        player: true,
        team: true,
      },
    });

    const result = {
      matchId,
      squads,
      providerName: this.activeProviderName,
      lastUpdated: squads.reduce((latest: Date | null, squad: any) => !latest || squad.createdAt > latest ? squad.createdAt : latest, null),
    };

    this.setInCache(cacheKey, result, false);
    return result;
  }

  async getSeriesList(offset: number = 0): Promise<any[]> {
    const cacheKey = `cricket:series:list:${offset}:${this.activeProviderName}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    const seriesList = await this.db.competition.findMany({ where: { sport: { slug: 'cricket' } }, orderBy: { updatedAt: 'desc' }, skip: offset, take: 50 });
    this.setInCache(cacheKey, seriesList, false);
    return seriesList;
  }

  async getSeriesInfo(seriesId: string): Promise<any | null> {
    const cacheKey = `cricket:series:info:${seriesId}:${this.activeProviderName}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const seriesInfo = await this.db.competition.findFirst({ where: { OR: [{ id: seriesId }, { slug: seriesId }] }, include: { matches: { include: { teamA: true, teamB: true, score: true } } } });
    if (seriesInfo) {
      this.setInCache(cacheKey, seriesInfo, false);
    }
    return seriesInfo;
  }

  async getPlayers(offset: number = 0): Promise<any[]> {
    const cacheKey = `cricket:players:${offset}:${this.activeProviderName}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    const players = await this.db.player.findMany({ orderBy: { updatedAt: 'desc' }, skip: offset, take: 50, include: { team: true } });
    this.setInCache(cacheKey, players, false);
    return players;
  }

  async getPlayerInfo(playerId: string): Promise<any | null> {
    const cacheKey = `cricket:player:info:${playerId}:${this.activeProviderName}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const playerInfo = await this.db.player.findFirst({ where: { id: playerId }, include: { team: true, squadPlayers: { include: { match: true } } } });
    if (playerInfo) {
      this.setInCache(cacheKey, playerInfo, false);
    }
    return playerInfo;
  }

  private async getCompetitionForMatch(sportId: string, pMatch: ProviderMatch, teamAName: string, teamBName: string) {
    let compName: string | null = null;

    // 1. Try to resolve series name dynamically from API provider if series_id is available
    if (pMatch.series_id) {
      try {
        const seriesInfo = await this.activeProvider.getSeriesInfo(pMatch.series_id);
        if (seriesInfo && seriesInfo.name) {
          compName = seriesInfo.name.trim();
        }
      } catch {
        // Ignore series lookup error gracefully
      }
    }

    // 2. Dynamically extract competition/series name from pMatch.name if not found yet
    if (!compName && pMatch.name) {
      const separators = [',', ' - ', ' | '];
      for (const sep of separators) {
        if (pMatch.name.includes(sep)) {
          const parts = pMatch.name.split(sep).map((p) => p.trim());
          const seriesPart = parts.find((part) => {
            const lower = part.toLowerCase();
            const lowerA = teamAName.toLowerCase();
            const lowerB = teamBName.toLowerCase();
            return (
              part.length > 3 &&
              !lower.includes('vs') &&
              !lower.includes('v ') &&
              (!lowerA || !lower.includes(lowerA)) &&
              (!lowerB || !lower.includes(lowerB))
            );
          });

          if (seriesPart) {
            compName = seriesPart;
            break;
          }
        }
      }
    }

    // 3. Generic dynamic fallback if no series name exists in provider response
    if (!compName) {
      const matchType = pMatch.matchType?.toUpperCase() || 'CRICKET';
      compName = `${matchType} International Matches`;
    }

    // Generate slug dynamically from derived compName
    const slug = compName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'cricket-competition';

    let competition = await this.db.competition.findFirst({
      where: { sportId, OR: [{ name: compName }, { slug }] },
    });

    if (!competition) {
      competition = await this.db.competition.create({
        data: {
          sportId,
          name: compName,
          slug,
          country: 'Global',
          sortOrder: 1,
          isActive: true,
        },
      });
    }

    return competition;
  }

  private async persistMatches(providerMatches: ProviderMatch[]): Promise<void> {
    const provider = await this.ensureProviderRegistered(this.activeProviderName);
    if (!provider) return;

    let cricketSport = await this.db.sport.findFirst({
      where: { OR: [{ slug: 'cricket' }, { name: 'Cricket' }] },
    });

    if (!cricketSport) {
      cricketSport = await this.db.sport.create({
        data: {
          name: 'Cricket',
          slug: 'cricket',
          icon: 'cricket-ball',
          sortOrder: 1,
          isActive: true,
        },
      });
    }

    for (const pMatch of providerMatches) {
      try {
        // Map or create Teams
        const teamAName = pMatch.teams[0] || pMatch.teamInfo?.[0]?.name || 'Team A';
        const teamBName = pMatch.teams[1] || pMatch.teamInfo?.[1]?.name || 'Team B';

        const teamA = await this.findOrCreateTeam(cricketSport.id, teamAName, pMatch.teamInfo?.[0]?.logoUrl);
        const teamB = await this.findOrCreateTeam(cricketSport.id, teamBName, pMatch.teamInfo?.[1]?.logoUrl);

        // Dynamically resolve real competition
        const competition = await this.getCompetitionForMatch(cricketSport.id, pMatch, teamAName, teamBName);

        // Map status accurately for CricAPI responses
        let status = 'UPCOMING';
        const rawStatus = (pMatch.status || '').toUpperCase();
        if (
          (pMatch.matchStarted && !pMatch.matchEnded) ||
          rawStatus.includes('LIVE') ||
          rawStatus.includes('IN PROGRESS') ||
          rawStatus.includes('INNING') ||
          rawStatus.includes('OPT TO') ||
          rawStatus.includes('ELECTED TO') ||
          rawStatus.includes('NEED') ||
          rawStatus.includes('TRAILS') ||
          rawStatus.includes('LEADS')
        ) {
          status = 'LIVE';
        } else if (pMatch.matchEnded || rawStatus.includes('COMPLETED') || rawStatus.includes('WON BY') || rawStatus.includes('MATCH DRAWN')) {
          status = 'COMPLETED';
        } else if (rawStatus.includes('CANCELLED') || rawStatus.includes('ABANDONED')) {
          status = 'CANCELLED';
        }

        // Check if an existing match exists for these exact teams
        const existingMatch = await this.db.match.findFirst({
          where: {
            sportId: cricketSport.id,
            OR: [
              { teamAId: teamA.id, teamBId: teamB.id },
              { teamAId: teamB.id, teamBId: teamA.id },
            ],
          },
          orderBy: { createdAt: 'asc' },
        });

        let internalMatchId: string | null = existingMatch ? existingMatch.id : null;

        if (!internalMatchId) {
          const mapping = await this.db.providerEntityMapping.findUnique({
            where: {
              providerId_entityType_providerEntityId: {
                providerId: provider.id,
                entityType: 'MATCH',
                providerEntityId: pMatch.id,
              },
            },
          });
          if (mapping) internalMatchId = mapping.internalEntityId;
        }

        if (internalMatchId) {
          await this.db.match.update({
            where: { id: internalMatchId },
            data: {
              status,
              resultSummary: pMatch.status,
              venue: pMatch.venue || undefined,
              competitionId: competition.id,
            },
          });

          await this.db.providerEntityMapping.upsert({
            where: {
              providerId_entityType_providerEntityId: {
                providerId: provider.id,
                entityType: 'MATCH',
                providerEntityId: pMatch.id,
              },
            },
            create: {
              providerId: provider.id,
              entityType: 'MATCH',
              providerEntityId: pMatch.id,
              internalEntityId: internalMatchId,
              rawMetadata: { name: pMatch.name, date: pMatch.date },
            },
            update: {
              internalEntityId: internalMatchId,
            },
          });
        } else {
          const newMatch = await this.db.match.create({
            data: {
              sportId: cricketSport.id,
              competitionId: competition.id,
              teamAId: teamA.id,
              teamBId: teamB.id,
              matchType: pMatch.matchType || 'T20',
              status,
              startTime: pMatch.dateTimeGMT ? new Date(pMatch.dateTimeGMT) : new Date(),
              resultSummary: pMatch.status,
              venue: pMatch.venue || 'TBA',
            },
          });

          internalMatchId = newMatch.id;

          await this.db.providerEntityMapping.create({
            data: {
              providerId: provider.id,
              entityType: 'MATCH',
              providerEntityId: pMatch.id,
              internalEntityId: internalMatchId,
              rawMetadata: { name: pMatch.name, date: pMatch.date },
            },
          });
        }

        // Extract team scores matching team names dynamically
        const { scoreA, oversA, scoreB, oversB } = this.extractTeamScores(pMatch, teamAName, teamBName);

        // Compare canonical stored state before writing or notifying clients.
        const existingScore = await this.db.matchScore.findUnique({ where: { matchId: internalMatchId } });
        const scoreChanged = !existingScore ||
          existingScore.teamAScore !== scoreA || existingScore.teamAOvers !== oversA ||
          existingScore.teamBScore !== scoreB || existingScore.teamBOvers !== oversB ||
          existingScore.statusText !== pMatch.status;

        // Preserve partial innings data, and do not write/broadcast identical state.
        if ((scoreA !== null || scoreB !== null) && scoreChanged) {
          const updateData: any = { statusText: pMatch.status };
          if (scoreA !== null) {
            updateData.teamAScore = scoreA;
            updateData.teamAOvers = oversA;
          }
          if (scoreB !== null) {
            updateData.teamBScore = scoreB;
            updateData.teamBOvers = oversB;
          }

          await this.db.$transaction(async (tx: any) => {
          await tx.matchScore.upsert({
            where: { matchId: internalMatchId },
            create: {
              matchId: internalMatchId,
              teamAScore: scoreA,
              teamBScore: scoreB,
              teamAOvers: oversA,
              teamBOvers: oversB,
              statusText: pMatch.status,
            },
            update: updateData,
          });

          // Save score snapshot in the same transaction.
          await tx.cricketScoreSnapshot.create({
            data: {
              matchId: internalMatchId,
              providerMatchId: pMatch.id,
              scoreData: pMatch.score as any,
            },
          });

          });
          // This executes only after the score/snapshot transaction commits.
          // Broadcast real-time update via WebSocket gateway
          if (internalMatchId) {
            this.sportsGateway.broadcastScoreUpdate(internalMatchId, {
              matchId: internalMatchId,
              providerMatchId: pMatch.id,
              teamAScore: scoreA,
              teamBScore: scoreB,
              teamAOvers: oversA,
              teamBOvers: oversB,
              status: pMatch.status,
              receivedAt: new Date().toISOString(),
            });

            // Auto-settle & auto-lock session markets for live match score updates
            if (this.cricketMarketsService) {
              try {
                await this.cricketMarketsService.autoSettleMatchMarkets(internalMatchId);
              } catch (settleErr: any) {
                this.logger.error(`Auto settle failed for match ${internalMatchId}: ${settleErr.message}`);
              }
            }
          }
        }
      } catch (matchErr) {
        this.logger.error(`Error persisting match ${pMatch.id}`, matchErr);
      }
    }
    if (this.sportsService) {
      this.sportsService.clearCache();
    }
    this.cache.clear();
  }

  /** Extract scoreA, oversA, scoreB, oversB by matching inning string against team names */
  private extractTeamScores(pMatch: ProviderMatch, teamAName: string, teamBName: string) {
    let scoreA: string | null = null;
    let oversA: string | null = null;
    let scoreB: string | null = null;
    let oversB: string | null = null;

    if (pMatch.score && Array.isArray(pMatch.score) && pMatch.score.length > 0) {
      const normA = (teamAName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const normB = (teamBName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      let matchedA = false;
      let matchedB = false;

      for (const sc of pMatch.score) {
        const inningStr = (sc.inning || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const formattedScore = `${sc.r}/${sc.w}`;
        const formattedOvers = `${sc.o}`;

        if (normA && inningStr.includes(normA)) {
          scoreA = formattedScore;
          oversA = formattedOvers;
          matchedA = true;
        } else if (normB && inningStr.includes(normB)) {
          scoreB = formattedScore;
          oversB = formattedOvers;
          matchedB = true;
        }
      }

      if (!matchedA && !matchedB) {
        if (pMatch.score[0]) {
          scoreA = `${pMatch.score[0].r}/${pMatch.score[0].w}`;
          oversA = `${pMatch.score[0].o}`;
        }
        if (pMatch.score[1]) {
          scoreB = `${pMatch.score[1].r}/${pMatch.score[1].w}`;
          oversB = `${pMatch.score[1].o}`;
        }
      }
    }

    return { scoreA, oversA, scoreB, oversB };
  }

  /**
   * Like persistMatches but returns the count of matches whose scores actually
   * changed so the caller can decide whether to broadcast / invalidate caches.
   */
  private async persistMatchesWithChangeDetection(providerMatches: ProviderMatch[]): Promise<number> {
    let changedCount = 0;

    for (const pMatch of providerMatches) {
      try {
        const teamAName = pMatch.teams[0] || pMatch.teamInfo?.[0]?.name || 'Team A';
        const teamBName = pMatch.teams[1] || pMatch.teamInfo?.[1]?.name || 'Team B';
        const { scoreA, oversA, scoreB, oversB } = this.extractTeamScores(pMatch, teamAName, teamBName);

        const fingerprint = `${scoreA || ''}|${oversA || ''}|${scoreB || ''}|${oversB || ''}|${pMatch.status || ''}`;

        const prev = this.lastScoreFingerprint.get(pMatch.id);

        if (prev !== fingerprint) {
          changedCount++;
          this.lastScoreFingerprint.set(pMatch.id, fingerprint);

          // Persist this single match
          await this.persistMatches([pMatch]);
        }
      } catch (err: any) {
        this.logger.error(`[ChangeDetect] Error processing match ${pMatch.id}: ${err.message}`);
      }
    }

    return changedCount;
  }

  private async findOrCreateTeam(sportId: string, name: string, logoUrl?: string): Promise<any> {
    const existing = await this.db.team.findFirst({
      where: { sportId, name: { equals: name, mode: 'insensitive' } },
    });

    if (existing) return existing;

    const shortName = name.substring(0, 3).toUpperCase();
    return await this.db.team.create({
      data: {
        sportId,
        name,
        shortName,
        logoUrl,
      },
    });
  }

  private async persistSquad(matchId: string, squad: ProviderSquad): Promise<void> {
    for (const teamData of squad.teams) {
      const team = await this.findOrCreateTeam('', teamData.teamName);
      for (const p of teamData.players) {
        let player = await this.db.player.findFirst({
          where: { name: { equals: p.name, mode: 'insensitive' } },
        });

        if (!player) {
          player = await this.db.player.create({
            data: {
              teamId: team.id,
              name: p.name,
              role: p.role || 'Player',
              avatarUrl: p.playerImg,
            },
          });
        }

        await this.db.cricketSquadPlayer.upsert({
          where: {
            matchId_teamId_playerId: {
              matchId,
              teamId: team.id,
              playerId: player.id,
            },
          },
          create: {
            matchId,
            teamId: team.id,
            playerId: player.id,
            playerRole: p.role,
          },
          update: {
            playerRole: p.role,
          },
        });
      }
    }
  }

  private async getEnrichedMatchesFromDb(statusFilter?: string): Promise<any[]> {
    const whereClause: any = {};
    if (statusFilter) {
      whereClause.status = statusFilter;
    }

    const matches = await this.db.match.findMany({
      where: whereClause,
      include: {
        teamA: true,
        teamB: true,
        competition: true,
        score: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const capabilities = this.getCapabilities();
    return matches.map((m: any) => ({
      ...m,
      capabilities,
      providerName: this.activeProviderName,
      isStale: false,
    }));
  }

  // ─────────────────────────────────────────────
  // ADMIN & LOGGING METHODS
  // ─────────────────────────────────────────────

  private async logSyncEvent(
    endpoint: string,
    status: 'SUCCESS' | 'FAILED',
    durationMs: number,
    recordCount: number,
    errorMessage: string | null = null
  ) {
    try {
      const provider = await this.ensureProviderRegistered(this.activeProviderName);
      if (!provider) return;

      await this.db.cricketDataSyncLog.create({
        data: {
          providerId: provider.id,
          endpoint,
          status,
          durationMs,
          recordCount,
          errorMessage,
        },
      });

      await this.db.cricketProvider.update({
        where: { id: provider.id },
        data: {
          lastSyncAt: new Date(),
          syncStatus: status === 'SUCCESS' ? 'SUCCESS' : 'ERROR',
          lastError: errorMessage,
          requestCount: { increment: 1 },
          ...(status === 'FAILED' ? { failedCount: { increment: 1 } } : {}),
        },
      });
    } catch (err) {
      this.logger.error('Error logging sync event', err);
    }
  }

  async getAdminStatus(): Promise<any> {
    const provider = await this.ensureProviderRegistered(this.activeProviderName);
    const logs = provider
      ? await this.db.cricketDataSyncLog.findMany({
          where: { providerId: provider.id },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : [];

    const matchesSynced = provider
      ? await this.db.providerEntityMapping.count({
          where: { providerId: provider.id, entityType: 'MATCH' },
        })
      : 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayCalls = provider
      ? await this.db.cricketDataSyncLog.count({
          where: {
            providerId: provider.id,
            createdAt: { gte: startOfToday },
          },
        })
      : 0;

    const overallTotalCalls = provider
      ? await this.db.cricketDataSyncLog.count({
          where: { providerId: provider.id },
        })
      : 0;

    let monthlyBreakdown: Array<{ month: string; count: number; success: number; failed: number }> = [];
    if (provider) {
      try {
        const rawMonthly = await this.db.$queryRaw<any[]>`
          SELECT 
            TO_CHAR("created_at", 'YYYY-MM') as month,
            COUNT(*)::int as count,
            COUNT(CASE WHEN "status" = 'SUCCESS' THEN 1 END)::int as success,
            COUNT(CASE WHEN "status" = 'FAILED' THEN 1 END)::int as failed
          FROM "cricket_data_sync_logs"
          WHERE "provider_id" = ${provider.id}::uuid
          GROUP BY TO_CHAR("created_at", 'YYYY-MM')
          ORDER BY month DESC
          LIMIT 12;
        `;
        monthlyBreakdown = rawMonthly.map((m: any) => ({
          month: String(m.month),
          count: Number(m.count || 0),
          success: Number(m.success || 0),
          failed: Number(m.failed || 0),
        }));
      } catch (e) {
        const map = new Map<string, { month: string; count: number; success: number; failed: number }>();
        for (const log of logs) {
          const month = new Date(log.createdAt).toISOString().substring(0, 7);
          const entry = map.get(month) || { month, count: 0, success: 0, failed: 0 };
          entry.count += 1;
          if (log.status === 'SUCCESS') entry.success += 1;
          else entry.failed += 1;
          map.set(month, entry);
        }
        monthlyBreakdown = Array.from(map.values());
      }
    }

    const capabilities = this.getCapabilities();
    const budget = this.getBudgetStatus();

    const currentApiKey = (provider?.capabilities as any)?.apiKey || this.cricApiProvider.getApiKey();
    const authParamName = (provider?.capabilities as any)?.authParamName || 'apikey';

    return {
      activeProvider: this.activeProviderName,
      availableProviders: [
        { id: 'cricapi', name: 'CricAPI (Rest)' },
        { id: 'entitysport', name: 'EntitySport API' },
        { id: 'sportmonks', name: 'Sportmonks API' },
        { id: 'generic_rest', name: 'Generic REST Provider' },
        { id: 'custom_rest', name: 'Custom REST Proxy' },
      ],
      providerDetails: provider
        ? {
            id: provider.id,
            name: provider.name,
            displayName: provider.displayName,
            baseUrl: provider.baseUrl,
            apiKey: currentApiKey,
            authParamName,
            isActive: provider.isActive,
            isTestMode: provider.isTestMode,
            syncStatus: provider.syncStatus,
            lastSyncAt: provider.lastSyncAt,
            lastError: provider.lastError,
            requestCount: provider.requestCount,
            failedCount: provider.failedCount,
          }
        : null,
      capabilities,
      matchesSynced,
      todayCalls,
      overallTotalCalls,
      monthlyBreakdown,
      budget,
      recentSyncLogs: logs,
    };
  }




  async testConnection(): Promise<{ success: boolean; latencyMs: number; statusText: string; provider: string }> {
    const start = Date.now();
    try {
      const accountInfo = await this.activeProvider.getProviderAccountInfo();
      const latencyMs = Date.now() - start;
      await this.logSyncEvent('testConnection', 'SUCCESS', latencyMs, 1);
      return {
        success: accountInfo.connected,
        latencyMs,
        statusText: accountInfo.connected ? '200 OK — Connected & Verified' : 'Connection Failed',
        provider: this.activeProviderName,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      await this.logSyncEvent('testConnection', 'FAILED', latencyMs, 0, err.message);
      return {
        success: false,
        latencyMs,
        statusText: `HTTP Error: ${err.message || String(err)}`,
        provider: this.activeProviderName,
      };
    }
  }

  async detectCapabilities(): Promise<Record<string, any>> {
    const provider = await this.ensureProviderRegistered(this.activeProviderName);
    const capabilities = this.getCapabilities();

    if (provider) {
      await this.db.cricketProvider.update({
        where: { id: provider.id },
        data: {
          capabilities: capabilities as any,
          lastSyncAt: new Date(),
        },
      });
    }

    return capabilities;
  }

  async updateProviderConfig(dto: {
    providerName?: string;
    baseUrl?: string;
    isActive?: boolean;
    isTestMode?: boolean;
    apiKey?: string;
    authParamName?: string;
  }): Promise<any> {
    if (dto.providerName && dto.providerName !== this.activeProviderName) {
      this._activeProviderName = dto.providerName;
      process.env.CRICAPI_PROVIDER = dto.providerName;
      this.logger.log(`Switched active provider to ${dto.providerName}`);
    }

    const provider = await this.ensureProviderRegistered(this.activeProviderName);
    if (!provider) throw new NotFoundException('Provider not found');

    const existingCaps = (provider.capabilities as any) || {};
    const updatedCaps = {
      ...existingCaps,
      ...(dto.apiKey !== undefined ? { apiKey: dto.apiKey } : {}),
      ...(dto.authParamName !== undefined ? { authParamName: dto.authParamName } : {}),
    };

    if (dto.apiKey !== undefined) {
      process.env.CRICAPI_API_KEY = dto.apiKey;
      this.cricApiProvider.setApiKey(dto.apiKey);
      this.genericRestProvider.setApiKey(dto.apiKey);
    }

    if (dto.baseUrl !== undefined) {
      process.env.CRICAPI_BASE_URL = dto.baseUrl;
      this.cricApiProvider.setBaseUrl(dto.baseUrl);
      this.genericRestProvider.setBaseUrl(dto.baseUrl);
    }

    if (dto.authParamName !== undefined) {
      this.genericRestProvider.setAuthParamName(dto.authParamName);
    }

    const updated = await this.db.cricketProvider.update({
      where: { id: provider.id },
      data: {
        name: this.activeProviderName,
        baseUrl: dto.baseUrl !== undefined ? dto.baseUrl : provider.baseUrl,
        isActive: dto.isActive !== undefined ? dto.isActive : provider.isActive,
        isTestMode: dto.isTestMode !== undefined ? dto.isTestMode : provider.isTestMode,
        capabilities: updatedCaps as any,
      },
    });

    return updated;
  }

  async purgeStaleMatches(): Promise<{ success: boolean; message: string; deletedCount: number; syncedCount: number }> {
    try {
      this.logger.log('Purging all stale / dummy matches from database...');
      const matchScoreDel = await this.db.matchScore.deleteMany({});
      const mappingDel = await this.db.providerEntityMapping.deleteMany({
        where: { entityType: 'MATCH' },
      });
      const matchDel = await this.db.match.deleteMany({});

      // Clear in-memory caches
      this.cache.clear();
      this.lastScoreFingerprint.clear();
      this.sportsService.clearCache();

      // Trigger fresh sync from active API provider
      let syncedCount = 0;
      try {
        const freshMatches = await this.activeProvider.getCurrentMatches();
        if (freshMatches && freshMatches.length > 0) {
          await this.persistMatches(freshMatches);
          syncedCount = freshMatches.length;
        }
      } catch (err: any) {
        this.logger.warn(`Fresh sync after purge returned error: ${err.message}`);
      }

      return {
        success: true,
        message: `Purged ${matchDel.count} stale matches & ${matchScoreDel.count} score records. Synced ${syncedCount} real matches from active provider.`,
        deletedCount: matchDel.count,
        syncedCount,
      };
    } catch (err: any) {
      this.logger.error(`Error purging stale matches: ${err.message}`);
      return {
        success: false,
        message: `Error purging matches: ${err.message}`,
        deletedCount: 0,
        syncedCount: 0,
      };
    }
  }
}


