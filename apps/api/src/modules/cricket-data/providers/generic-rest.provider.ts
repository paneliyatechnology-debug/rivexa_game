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
export class GenericRestProvider implements ICricketDataProvider {
  readonly providerName = 'generic_rest';
  private readonly logger = new Logger(GenericRestProvider.name);

  private customApiKey?: string;
  private customBaseUrl?: string;
  private authParamName = 'apikey';

  public setApiKey(key: string) {
    if (key) this.customApiKey = key;
  }

  public setBaseUrl(url: string) {
    if (url) this.customBaseUrl = url;
  }

  public setAuthParamName(name: string) {
    if (name) this.authParamName = name;
  }

  public getApiKey(): string {
    return this.customApiKey || process.env.CRICKET_API_KEY || process.env.CRICAPI_API_KEY || '';
  }

  public getBaseUrl(): string {
    return (this.customBaseUrl || process.env.CRICKET_BASE_URL || process.env.CRICAPI_BASE_URL || 'https://api.cricapi.com/v1').replace(/\/$/, '');
  }

  private get timeoutMs(): number {
    return parseInt(process.env.CRICKET_TIMEOUT_MS || '10000', 10);
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
      liveScore: { supported: true, verified: true, notes: 'Generic REST API endpoint support.' },
      matchSquad: { supported: true, verified: true, notes: 'Generic squad parser.' },
      matchesList: { supported: true, verified: true, notes: 'Generic match list parser.' },
      seriesList: { supported: true, verified: true, notes: 'Generic series parser.' },
      playersList: { supported: true, verified: true, notes: 'Generic player list parser.' },
      fantasyApis: { supported: false, verified: false, notes: 'Not applicable for generic provider.' },
      exchangeBackLayOdds: { supported: false, verified: false, notes: 'Not provided.' },
      sessionFancyMarkets: { supported: false, verified: false, notes: 'Not provided.' },
      bookmakerOdds: { supported: false, verified: false, notes: 'Not provided.' },
      matchOdds: { supported: false, verified: false, notes: 'Not provided.' },
      streamingWebsocket: { supported: false, verified: false, notes: 'REST Polling.' },
    };
  }

  private async fetchFromApi<T>(endpointPath: string, params: Record<string, string> = {}): Promise<T | null> {
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    if (!apiKey && !baseUrl) {
      this.logger.error('GenericRestProvider skipped: API key or Base URL not set');
      return null;
    }

    try {
      const url = new URL(`${baseUrl}/${endpointPath}`);
      if (apiKey) {
        url.searchParams.append(this.authParamName, apiKey);
      }
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) return null;
      const json = await response.json();
      return json as T;
    } catch (err: any) {
      return null;
    }
  }

  async getCurrentMatches(): Promise<ProviderMatch[]> {
    const res = await this.fetchFromApi<{ data?: any[] }>('currentMatches') || await this.fetchFromApi<{ data?: any[] }>('matches');
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
    return {
      matchId: providerMatchId,
      teams: res.data.map((t: any) => ({
        teamName: t.teamName || t.name || 'Team',
        players: Array.isArray(t.players)
          ? t.players.map((p: any) => ({
              id: String(p.id),
              name: p.name || 'Player',
              role: p.role || 'Player',
            }))
          : [],
      })),
    };
  }

  async getSeriesList(offset: number = 0): Promise<ProviderSeries[]> {
    const res = await this.fetchFromApi<{ data?: any[] }>('series', { offset: String(offset) });
    if (!res || !Array.isArray(res.data)) return [];
    return res.data.map((s: any) => ({
      id: String(s.id),
      name: s.name || 'Series',
      startDate: s.startDate,
      endDate: s.endDate,
    }));
  }

  async getSeriesInfo(providerSeriesId: string): Promise<ProviderSeriesDetail | null> {
    const res = await this.fetchFromApi<{ data?: any }>('series_info', { id: providerSeriesId });
    if (!res || !res.data) return null;
    return {
      id: String(res.data.id || providerSeriesId),
      name: res.data.name || 'Series',
      matchList: Array.isArray(res.data.matchList) ? res.data.matchList.map((m: any) => this.mapMatch(m)) : [],
    };
  }

  async getPlayers(offset: number = 0): Promise<ProviderPlayer[]> {
    const res = await this.fetchFromApi<{ data?: any[] }>('players', { offset: String(offset) });
    if (!res || !Array.isArray(res.data)) return [];
    return res.data.map((p: any) => ({
      id: String(p.id),
      name: p.name || 'Player',
      country: p.country,
    }));
  }

  async getPlayerInfo(providerPlayerId: string): Promise<ProviderPlayerDetail | null> {
    const res = await this.fetchFromApi<{ data?: any }>('players_info', { id: providerPlayerId });
    if (!res || !res.data) return null;
    return {
      id: String(res.data.id || providerPlayerId),
      name: res.data.name || 'Player',
      country: res.data.country,
      role: res.data.role,
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
