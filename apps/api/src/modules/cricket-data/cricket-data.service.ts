import { Injectable, Logger, OnModuleInit, Inject, forwardRef, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service.js';
import { CricApiProvider } from './providers/cricapi.provider.js';
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

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class CricketDataService implements OnModuleInit {
  private readonly logger = new Logger(CricketDataService.name);
  private readonly providers = new Map<string, ICricketDataProvider>();
  private readonly cache = new Map<string, CacheItem<any>>();

  constructor(
    private readonly db: DatabaseService,
    private readonly cricApiProvider: CricApiProvider,
    @Inject(forwardRef(() => SportsGateway))
    private readonly sportsGateway: SportsGateway
  ) {
    this.providers.set(cricApiProvider.providerName, cricApiProvider);
  }

  async onModuleInit() {
    try {
      await this.ensureProviderRegistered(this.activeProviderName);
    } catch (err: any) {
      this.logger.warn(`Failed ensuring cricket provider: ${err.message}`);
    }
  }

  get activeProviderName(): string {
    return process.env.CRICKET_DATA_PROVIDER || 'cricapi';
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

  async getCurrentMatches(): Promise<any[]> {
    const cacheKey = `cricket:matches:current:${this.activeProviderName}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    const start = Date.now();
    let providerMatches: ProviderMatch[] = [];
    let errorMsg: string | null = null;

    try {
      providerMatches = await this.activeProvider.getCurrentMatches();
    } catch (err: any) {
      errorMsg = err.message || String(err);
      this.logger.error('Error fetching current matches from provider', err);
    }

    const duration = Date.now() - start;
    await this.logSyncEvent('currentMatches', providerMatches.length > 0 ? 'SUCCESS' : 'FAILED', duration, providerMatches.length, errorMsg);

    if (providerMatches.length > 0) {
      await this.persistMatches(providerMatches);
    }

    const dbMatches = await this.getEnrichedMatchesFromDb('LIVE');
    this.setInCache(cacheKey, dbMatches, true);
    return dbMatches;
  }

  async getMatches(status?: string, offset: number = 0): Promise<any[]> {
    const cacheKey = `cricket:matches:${status || 'all'}:${offset}:${this.activeProviderName}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    const start = Date.now();
    let providerMatches: ProviderMatch[] = [];
    let errorMsg: string | null = null;

    try {
      providerMatches = await this.activeProvider.getMatches(offset);
    } catch (err: any) {
      errorMsg = err.message || String(err);
      this.logger.error('Error fetching matches from provider', err);
    }

    const duration = Date.now() - start;
    await this.logSyncEvent('matches', providerMatches.length > 0 ? 'SUCCESS' : 'FAILED', duration, providerMatches.length, errorMsg);

    if (providerMatches.length > 0) {
      await this.persistMatches(providerMatches);
    }

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

    // Fetch fresh info from provider if match is live or not found
    let providerMatchId = matchIdOrProviderId;
    if (match) {
      const providerRec = await this.db.cricketProvider.findUnique({ where: { name: this.activeProviderName } });
      if (providerRec) {
        const mapping = await this.db.providerEntityMapping.findFirst({
          where: { providerId: providerRec.id, entityType: 'MATCH', internalEntityId: match.id },
        });
        if (mapping) providerMatchId = mapping.providerEntityId;
      }
    }

    const providerMatch = await this.activeProvider.getMatchInfo(providerMatchId);
    if (providerMatch) {
      await this.persistMatches([providerMatch]);
      // Refetch match
      match = await this.db.match.findFirst({
        where: { id: match?.id || matchIdOrProviderId },
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

    const capabilities = this.getCapabilities();
    const result = {
      match,
      capabilities,
      providerName: this.activeProviderName,
      lastUpdated: new Date().toISOString(),
      isStale: false,
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

    let providerMatchId = matchIdOrProviderId;
    let matchId = matchIdOrProviderId;

    const mapping = await this.db.providerEntityMapping.findFirst({
      where: {
        entityType: 'MATCH',
        OR: [{ providerEntityId: matchIdOrProviderId }, { internalEntityId: matchIdOrProviderId }],
      },
    });

    if (mapping) {
      providerMatchId = mapping.providerEntityId;
      matchId = mapping.internalEntityId;
    }

    const providerSquad = await this.activeProvider.getMatchSquad(providerMatchId);
    if (providerSquad) {
      await this.persistSquad(matchId, providerSquad);
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
      providerMatchId,
      squads,
      providerName: this.activeProviderName,
      lastUpdated: new Date().toISOString(),
    };

    this.setInCache(cacheKey, result, false);
    return result;
  }

  async getSeriesList(offset: number = 0): Promise<any[]> {
    const cacheKey = `cricket:series:list:${offset}:${this.activeProviderName}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    const seriesList = await this.activeProvider.getSeriesList(offset);
    this.setInCache(cacheKey, seriesList, false);
    return seriesList;
  }

  async getSeriesInfo(seriesId: string): Promise<any | null> {
    const cacheKey = `cricket:series:info:${seriesId}:${this.activeProviderName}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const seriesInfo = await this.activeProvider.getSeriesInfo(seriesId);
    if (seriesInfo) {
      this.setInCache(cacheKey, seriesInfo, false);
    }
    return seriesInfo;
  }

  async getPlayers(offset: number = 0): Promise<any[]> {
    const cacheKey = `cricket:players:${offset}:${this.activeProviderName}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    const players = await this.activeProvider.getPlayers(offset);
    this.setInCache(cacheKey, players, false);
    return players;
  }

  async getPlayerInfo(playerId: string): Promise<any | null> {
    const cacheKey = `cricket:player:info:${playerId}:${this.activeProviderName}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const playerInfo = await this.activeProvider.getPlayerInfo(playerId);
    if (playerInfo) {
      this.setInCache(cacheKey, playerInfo, false);
    }
    return playerInfo;
  }

  // ─────────────────────────────────────────────
  // PERSISTENCE & MAPPING HELPERS
  // ─────────────────────────────────────────────

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

    let defaultCompetition = await this.db.competition.findFirst({
      where: { sportId: cricketSport.id },
    });

    if (!defaultCompetition) {
      defaultCompetition = await this.db.competition.create({
        data: {
          sportId: cricketSport.id,
          name: 'International Cricket Series',
          country: 'Global',
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

        // Check if mapping exists
        let mapping = await this.db.providerEntityMapping.findUnique({
          where: {
            providerId_entityType_providerEntityId: {
              providerId: provider.id,
              entityType: 'MATCH',
              providerEntityId: pMatch.id,
            },
          },
        });

        let internalMatchId: string;

        if (mapping) {
          internalMatchId = mapping.internalEntityId;
          await this.db.match.update({
            where: { id: internalMatchId },
            data: {
              status,
              resultSummary: pMatch.status,
              venue: pMatch.venue || undefined,
            },
          });
        } else {
          const newMatch = await this.db.match.create({
            data: {
              sportId: cricketSport.id,
              competitionId: defaultCompetition.id,
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

        // Update score summary
        if (pMatch.score && pMatch.score.length > 0) {
          const scoreA = pMatch.score[0] ? `${pMatch.score[0].r}/${pMatch.score[0].w}` : null;
          const scoreB = pMatch.score[1] ? `${pMatch.score[1].r}/${pMatch.score[1].w}` : null;
          const oversA = pMatch.score[0] ? `${pMatch.score[0].o}` : null;
          const oversB = pMatch.score[1] ? `${pMatch.score[1].o}` : null;

          await this.db.matchScore.upsert({
            where: { matchId: internalMatchId },
            create: {
              matchId: internalMatchId,
              teamAScore: scoreA,
              teamBScore: scoreB,
              teamAOvers: oversA,
              teamBOvers: oversB,
              statusText: pMatch.status,
            },
            update: {
              teamAScore: scoreA,
              teamBScore: scoreB,
              teamAOvers: oversA,
              teamBOvers: oversB,
              statusText: pMatch.status,
            },
          });

          // Save score snapshot
          await this.db.cricketScoreSnapshot.create({
            data: {
              matchId: internalMatchId,
              providerMatchId: pMatch.id,
              scoreData: pMatch.score as any,
            },
          });

          // Broadcast real-time update via WebSocket gateway
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
        }
      } catch (matchErr) {
        this.logger.error(`Error persisting match ${pMatch.id}`, matchErr);
      }
    }
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
          take: 20,
        })
      : [];

    const matchesSynced = provider
      ? await this.db.providerEntityMapping.count({
          where: { providerId: provider.id, entityType: 'MATCH' },
        })
      : 0;

    const capabilities = this.getCapabilities();

    return {
      activeProvider: this.activeProviderName,
      providerDetails: provider
        ? {
            id: provider.id,
            name: provider.name,
            displayName: provider.displayName,
            baseUrl: provider.baseUrl,
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
      recentSyncLogs: logs,
    };
  }

  async triggerAdminSync(): Promise<{ success: boolean; message: string; count: number }> {
    const start = Date.now();
    try {
      const matches = await this.activeProvider.getCurrentMatches();
      if (matches.length > 0) {
        await this.persistMatches(matches);
      }

      const duration = Date.now() - start;
      await this.logSyncEvent('adminSync:currentMatches', 'SUCCESS', duration, matches.length);
      return {
        success: true,
        message: `Successfully synced ${matches.length} matches from ${this.activeProviderName}.`,
        count: matches.length,
      };
    } catch (err: any) {
      const duration = Date.now() - start;
      await this.logSyncEvent('adminSync:currentMatches', 'FAILED', duration, 0, err.message || String(err));
      return {
        success: false,
        message: `Sync failed: ${err.message || String(err)}`,
        count: 0,
      };
    }
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

  async updateProviderConfig(dto: { baseUrl?: string; isActive?: boolean; isTestMode?: boolean }): Promise<any> {
    const provider = await this.ensureProviderRegistered(this.activeProviderName);
    if (!provider) throw new NotFoundException('Provider not found');

    const updated = await this.db.cricketProvider.update({
      where: { id: provider.id },
      data: {
        baseUrl: dto.baseUrl !== undefined ? dto.baseUrl : provider.baseUrl,
        isActive: dto.isActive !== undefined ? dto.isActive : provider.isActive,
        isTestMode: dto.isTestMode !== undefined ? dto.isTestMode : provider.isTestMode,
      },
    });

    return updated;
  }
}


