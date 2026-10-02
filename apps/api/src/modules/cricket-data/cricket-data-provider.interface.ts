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

// ─────────────────────────────────────────────
// NORMALIZED INTERNAL DATA MODEL INTERFACES
// ─────────────────────────────────────────────

export interface NormalizedPlayer {
  providerPlayerId: string;
  name: string;
  shortName?: string;
  role?: string;
  image?: string;
  teamId?: string;
  country?: string;
}

export interface NormalizedTeam {
  providerTeamId: string;
  name: string;
  shortName?: string;
  flagCode?: string;
  logoUrl?: string;
  country?: string;
}

export interface NormalizedScore {
  teamAScore?: string;
  teamBScore?: string;
  teamAOvers?: string;
  teamBOvers?: string;
  currentInnings?: number;
  currentRunRate?: number;
  requiredRunRate?: number;
  targetRuns?: number;
  statusText?: string;
  activeBatsman?: string;
  activeBowler?: string;
  recentOvers?: string;
}

export interface NormalizedBatsman {
  batsmanId?: string;
  batsmanName: string;
  dismissal?: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isCaptain?: boolean;
  isWicketKeeper?: boolean;
}

export interface NormalizedBowler {
  bowlerId?: string;
  bowlerName: string;
  overs: string;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
}

export interface NormalizedInnings {
  inningsName: string;
  teamName: string;
  totalRuns: number;
  wickets: number;
  overs: string;
  batting: NormalizedBatsman[];
  bowling: NormalizedBowler[];
  extras?: {
    wides?: number;
    noBalls?: number;
    byes?: number;
    legByes?: number;
    total?: number;
  };
  fallOfWickets?: Array<{
    wicketNumber: number;
    score: number;
    overs: string;
    batsmanName: string;
  }>;
}

export interface NormalizedBall {
  matchId: string;
  overNumber: number;
  ballNumber: number;
  runs: number;
  event: string;
  batsman?: string;
  bowler?: string;
  wicketInfo?: string;
}

export interface NormalizedCommentary {
  matchId: string;
  overNumber: number;
  ballNumber: number;
  runs: number;
  event: string;
  bowler?: string;
  batsman?: string;
  description: string;
}

export interface NormalizedMatchResult {
  winnerProviderTeamId?: string;
  winnerName?: string;
  resultSummary: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'CANCELLED';
}

export interface NormalizedMatch {
  providerMatchId: string;
  competitionName?: string;
  competitionSlug?: string;
  teamA: NormalizedTeam;
  teamB: NormalizedTeam;
  venue?: string;
  matchType?: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'CANCELLED';
  startTime?: Date;
  score?: NormalizedScore;
  resultSummary?: string;
  scorecard?: {
    firstInnings?: NormalizedInnings;
    secondInnings?: NormalizedInnings;
  };
  commentaries?: NormalizedCommentary[];
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

