export interface ProviderCapability {
  supported: boolean;
  verified: boolean;
  notes: string;
}

export interface ProviderCapabilityRegistry {
  liveScore: ProviderCapability;
  matchSquad: ProviderCapability;
  matchesList: ProviderCapability;
  seriesList: ProviderCapability;
  playersList: ProviderCapability;
  fantasyApis: ProviderCapability;
  exchangeBackLayOdds: ProviderCapability;
  sessionFancyMarkets: ProviderCapability;
  bookmakerOdds: ProviderCapability;
  matchOdds: ProviderCapability;
  streamingWebsocket: ProviderCapability;
}

export interface ProviderTeam {
  name: string;
  shortName?: string;
  logoUrl?: string;
}

export interface ProviderScore {
  r: number;
  w: number;
  o: number;
  inning: string;
}

export interface ProviderMatch {
  id: string;
  name: string;
  matchType?: string;
  status?: string;
  venue?: string;
  date?: string;
  dateTimeGMT?: string;
  teams: string[];
  teamInfo?: ProviderTeam[];
  score?: ProviderScore[];
  series_id?: string;
  fantasyEnabled?: boolean;
  hasSquad?: boolean;
  matchStarted?: boolean;
  matchEnded?: boolean;
}

export interface ProviderMatchDetail extends ProviderMatch {
  matchStarted?: boolean;
  matchEnded?: boolean;
}

export interface ProviderSquadPlayer {
  id: string;
  name: string;
  role?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  country?: string;
  playerImg?: string;
}

export interface ProviderSquadTeam {
  teamName: string;
  players: ProviderSquadPlayer[];
}

export interface ProviderSquad {
  matchId: string;
  teams: ProviderSquadTeam[];
}

export interface ProviderSeries {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  matches?: number;
  t20?: number;
  odi?: number;
  test?: number;
  squads?: number;
}

export interface ProviderSeriesDetail extends ProviderSeries {
  matchList?: ProviderMatch[];
}

export interface ProviderPlayer {
  id: string;
  name: string;
  country?: string;
}

export interface ProviderPlayerDetail extends ProviderPlayer {
  dateOfBirth?: string;
  role?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  placeOfBirth?: string;
  playerImg?: string;
}

export interface ICricketDataProvider {
  readonly providerName: string;
  getCapabilities(): ProviderCapabilityRegistry;
  getProviderAccountInfo(): Promise<{ connected: boolean; hitsUsed?: number; hitsLimit?: number }>;
  getCurrentMatches(): Promise<ProviderMatch[]>;
  getMatches(offset?: number): Promise<ProviderMatch[]>;
  getMatchInfo(providerMatchId: string): Promise<ProviderMatchDetail | null>;
  getMatchSquad(providerMatchId: string): Promise<ProviderSquad | null>;
  getSeriesList(offset?: number): Promise<ProviderSeries[]>;
  getSeriesInfo(providerSeriesId: string): Promise<ProviderSeriesDetail | null>;
  getPlayers(offset?: number): Promise<ProviderPlayer[]>;
  getPlayerInfo(providerPlayerId: string): Promise<ProviderPlayerDetail | null>;
}

