import { Injectable, Logger } from '@nestjs/common';
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
} from '../cricket-data-provider.interface.js';

@Injectable()
export class CricApiProvider implements ICricketDataProvider {
  readonly providerName = 'cricapi';
  private readonly logger = new Logger(CricApiProvider.name);

  private customApiKey?: string;
  private customBaseUrl?: string;

  public setApiKey(key: string) {
    if (key) this.customApiKey = key;
  }

  public setBaseUrl(url: string) {
    if (url) this.customBaseUrl = url;
  }

  public getApiKey(): string {
    return this.customApiKey || process.env.CRICAPI_API_KEY || '';
  }

  public getBaseUrl(): string {
    return (this.customBaseUrl || process.env.CRICAPI_BASE_URL || 'https://api.cricapi.com/v1').replace(/\/$/, '');
  }

  private get baseUrl(): string {
    return this.getBaseUrl();
  }

  private get apiKey(): string {
    return this.getApiKey();
  }

  private get timeoutMs(): number {
    return parseInt(process.env.CRICAPI_TIMEOUT_MS || '10000', 10);
  }

  async getProviderAccountInfo(): Promise<{ connected: boolean; hitsUsed?: number; hitsLimit?: number }> {
    try {
      const matches = await this.getCurrentMatches();
      return { connected: true };
    } catch (e) {
      return { connected: false };
    }
  }

  getCapabilities(): ProviderCapabilityRegistry {

    return {
      liveScore: {
        supported: true,
        verified: true,
        notes: 'Supported via cricScore and currentMatches endpoints.',
      },
      matchSquad: {
        supported: true,
        verified: true,
        notes: 'Supported via match_squad endpoint with player roles.',
      },
      matchesList: {
        supported: true,
        verified: true,
        notes: 'Supported via matches and currentMatches endpoints.',
      },
      seriesList: {
        supported: true,
        verified: true,
        notes: 'Supported via series and series_info endpoints.',
      },
      playersList: {
        supported: true,
        verified: true,
        notes: 'Supported via players and players_info endpoints.',
      },
      fantasyApis: {
        supported: true,
        verified: true,
        notes: 'Supported via CricAPI fantasy endpoints.',
      },
      exchangeBackLayOdds: {
        supported: false,
        verified: true,
        notes: 'Not available from current provider. CricAPI does not provide exchange Back/Lay market data.',
      },
      sessionFancyMarkets: {
        supported: false,
        verified: true,
        notes: 'Not available from current provider. CricAPI does not provide session/fancy markets.',
      },
      bookmakerOdds: {
        supported: false,
        verified: true,
        notes: 'Not available from current provider. CricAPI does not provide bookmaker odds.',
      },
      matchOdds: {
        supported: false,
        verified: true,
        notes: 'Not available from current provider. CricAPI does not provide betting odds.',
      },
      streamingWebsocket: {
        supported: false,
        verified: true,
        notes: 'CricAPI uses REST API polling. WebSockets are handled internally by backend server.',
      },
    };
  }

  private async fetchFromApi<T>(endpointPath: string, params: Record<string, string> = {}): Promise<T | null> {
    if (!this.apiKey) {
      // Never fall back to a credential embedded in source code.
      this.logger.error('CricAPI request skipped: CRICAPI_API_KEY is not configured');
      return null;
    }
    const url = new URL(`${this.baseUrl}/${endpointPath}`);
    if (this.apiKey) {
      url.searchParams.append('apikey', this.apiKey);
    }
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }

    const sanitizedUrlForLog = `${this.baseUrl}/${endpointPath}?${new URLSearchParams(
      Object.entries(params)
    ).toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      this.logger.log(`Requesting CricAPI endpoint: ${sanitizedUrlForLog}`);
      const response = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.error(
          `CricAPI HTTP error ${response.status} ${response.statusText} for endpoint ${endpointPath}`
        );
        return null;
      }

      const json = await response.json();
      if (json.status === 'failure') {
        this.logger.warn(`CricAPI returned status=failure for ${endpointPath}: ${json.reason || json.message || 'Unknown reason'}`);
        return null;
      }

      return json as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        this.logger.error(`CricAPI request timeout after ${this.timeoutMs}ms for ${endpointPath}`);
      } else {
        this.logger.error(`CricAPI request error for ${endpointPath}: ${error.message || error}`);
      }
      return null;
    }
  }

  async getCurrentMatches(): Promise<ProviderMatch[]> {
    const res = await this.fetchFromApi<{ data?: any[] }>('currentMatches');
    if (!res || !Array.isArray(res.data)) return [];
    return res.data.map((item) => this.mapMatch(item));
  }

  async getMatches(offset: number = 0): Promise<ProviderMatch[]> {
    const res = await this.fetchFromApi<{ data?: any[] }>('matches', { offset: String(offset) });
    if (!res || !Array.isArray(res.data)) return [];
    return res.data.map((item) => this.mapMatch(item));
  }

  async getMatchInfo(providerMatchId: string): Promise<ProviderMatchDetail | null> {
    const res = await this.fetchFromApi<{ data?: any }>('match_info', { id: providerMatchId });
    if (!res || !res.data) return null;
    return {
      ...this.mapMatch(res.data),
      matchStarted: Boolean(res.data.matchStarted),
      matchEnded: Boolean(res.data.matchEnded),
    };
  }

  async getMatchSquad(providerMatchId: string): Promise<ProviderSquad | null> {
    const res = await this.fetchFromApi<{ data?: any[] }>('match_squad', { id: providerMatchId });
    if (!res || !Array.isArray(res.data)) return null;

    const teams = res.data.map((teamData: any) => ({
      teamName: teamData.teamName || teamData.name || 'Team',
      players: Array.isArray(teamData.players)
        ? teamData.players.map((p: any) => ({
            id: String(p.id),
            name: p.name || 'Player',
            role: p.role || 'Player',
            battingStyle: p.battingStyle,
            bowlingStyle: p.bowlingStyle,
            country: p.country,
            playerImg: p.playerImg,
          }))
        : [],
    }));

    return {
      matchId: providerMatchId,
      teams,
    };
  }

  async getSeriesList(offset: number = 0): Promise<ProviderSeries[]> {
    const res = await this.fetchFromApi<{ data?: any[] }>('series', { offset: String(offset) });
    if (!res || !Array.isArray(res.data)) return [];
    return res.data.map((s: any) => ({
      id: String(s.id),
      name: s.name || 'Unknown Series',
      startDate: s.startDate,
      endDate: s.endDate,
      matches: s.matches,
      t20: s.t20,
      odi: s.odi,
      test: s.test,
      squads: s.squads,
    }));
  }

  async getSeriesInfo(providerSeriesId: string): Promise<ProviderSeriesDetail | null> {
    const res = await this.fetchFromApi<{ data?: any }>('series_info', { id: providerSeriesId });
    if (!res || !res.data) return null;
    const seriesData = res.data.info || res.data;
    const matchList = Array.isArray(res.data.matchList)
      ? res.data.matchList.map((m: any) => this.mapMatch(m))
      : [];

    return {
      id: String(seriesData.id || providerSeriesId),
      name: seriesData.name || 'Series Info',
      startDate: seriesData.startDate,
      endDate: seriesData.endDate,
      matches: seriesData.matches,
      t20: seriesData.t20,
      odi: seriesData.odi,
      test: seriesData.test,
      squads: seriesData.squads,
      matchList,
    };
  }

  async getPlayers(offset: number = 0): Promise<ProviderPlayer[]> {
    const res = await this.fetchFromApi<{ data?: any[] }>('players', { offset: String(offset) });
    if (!res || !Array.isArray(res.data)) return [];
    return res.data.map((p: any) => ({
      id: String(p.id),
      name: p.name || 'Unknown Player',
      country: p.country,
    }));
  }

  async getPlayerInfo(providerPlayerId: string): Promise<ProviderPlayerDetail | null> {
    const res = await this.fetchFromApi<{ data?: any }>('players_info', { id: providerPlayerId });
    if (!res || !res.data) return null;
    const p = res.data;
    return {
      id: String(p.id || providerPlayerId),
      name: p.name || 'Player',
      country: p.country,
      dateOfBirth: p.dateOfBirth,
      role: p.role,
      battingStyle: p.battingStyle,
      bowlingStyle: p.bowlingStyle,
      placeOfBirth: p.placeOfBirth,
      playerImg: p.playerImg,
    };
  }

  private mapMatch(item: any): ProviderMatch {
    const scoreList = Array.isArray(item.score)
      ? item.score.map((s: any) => ({
          r: Number(s.r || 0),
          w: Number(s.w || 0),
          o: Number(s.o || 0),
          inning: String(s.inning || ''),
        }))
      : [];

    return {
      id: String(item.id),
      name: item.name || 'Cricket Match',
      matchType: item.matchType?.toUpperCase() || 'T20',
      status: item.status || 'UPCOMING',
      venue: item.venue || 'TBA',
      date: item.date,
      dateTimeGMT: item.dateTimeGMT,
      teams: Array.isArray(item.teams) ? item.teams : [],
      teamInfo: Array.isArray(item.teamInfo)
        ? item.teamInfo.map((t: any) => ({
            name: t.name || t.shortname || '',
            shortName: t.shortname || t.name?.substring(0, 3)?.toUpperCase() || '',
            logoUrl: t.img,
          }))
        : [],
      score: scoreList,
      series_id: item.series_id,
      fantasyEnabled: Boolean(item.fantasyEnabled),
      hasSquad: Boolean(item.hasSquad),
      matchStarted: Boolean(item.matchStarted),
      matchEnded: Boolean(item.matchEnded),
    };
  }
}
