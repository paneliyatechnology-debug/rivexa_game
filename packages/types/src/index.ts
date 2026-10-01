// User & Auth Interfaces
export enum UserRole {
  PLAYER = 'player',
  DEVELOPER = 'developer',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export interface IUser {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  referralCode: string;
  referredById?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Wallet & Ledger Interfaces
export interface IWallet {
  id: string;
  userId: string;
  mainBalance: number;
  bonusBalance: number;
  commissionBalance: number;
  currency: string;
  version: number;
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  BET = 'bet',
  WIN = 'win',
  CASHOUT = 'cashout',
  COMMISSION = 'commission',
  REFUND = 'refund',
}

export interface IWalletTransaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Game Engine Interfaces
export enum GameEngine {
  PHASER = 'phaser3',
  CANVAS = 'canvas',
  UNITY = 'unity',
}

export interface IGameManifest {
  id: string;
  name: string;
  slug: string;
  version: string;
  engine: GameEngine;
  orientation: 'landscape' | 'portrait' | 'responsive';
  minBet: number;
  maxBet: number;
  rtpPercentage: number;
  features: string[];
}

export enum BetStatus {
  PENDING = 'pending',
  WON = 'won',
  LOST = 'lost',
  CASHED_OUT = 'cashed_out',
  REFUNDED = 'refunded',
}

export interface IGameBet {
  id: string;
  userId: string;
  gameId: string;
  roundId?: string;
  betAmount: number;
  multiplier: number;
  payoutAmount: number;
  status: BetStatus;
  betDetails?: Record<string, any>;
  createdAt: string;
}

export interface ICrashRound {
  id: string;
  gameSlug: string;
  roundNumber: string;
  status: 'preparing' | 'flight' | 'crashed' | 'cancelled';
  crashPoint?: number;
  currentMultiplier: number;
  seedHash: string;
  startedAt?: string;
  endedAt?: string;
}

// Standard API Payload Wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

// ─────────────────────────────────────────────
// SPORTS PLATFORM INTERFACES
// ─────────────────────────────────────────────

export interface ISport {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  matchCount?: {
    live: number;
    upcoming: number;
    total: number;
  };
}

export interface ICompetition {
  id: string;
  sportId: string;
  slug: string;
  name: string;
  country?: string | null;
  logoUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  matchCount?: number;
  matches?: IMatch[];
}

export interface ITeam {
  id: string;
  sportId: string;
  name: string;
  shortName: string;
  flagCode?: string | null;
  logoUrl?: string | null;
  country?: string | null;
  players?: IPlayer[];
}

export interface IPlayer {
  id: string;
  teamId: string;
  name: string;
  role: string;
  jerseyNumber?: number | null;
  avatarUrl?: string | null;
}

export interface IMatchScore {
  id: string;
  matchId: string;
  teamAScore?: string | null;
  teamBScore?: string | null;
  teamAOvers?: string | null;
  teamBOvers?: string | null;
  currentInnings: number;
  currentRunRate?: number | null;
  requiredRunRate?: number | null;
  targetRuns?: number | null;
  statusText?: string | null;
  activeBatsman?: string | null;
  activeBowler?: string | null;
  recentOvers?: string | null;
  updatedAt: string;
}

export interface ICommentaryEvent {
  id: string;
  matchId: string;
  overNumber: number;
  ballNumber: number;
  runs: number;
  event: string;
  bowler: string;
  batsman: string;
  description: string;
  timestamp: string;
}

export interface IScorecardInnings {
  inningsName: string;
  teamName: string;
  totalRuns: number;
  wickets: number;
  overs: string;
  batting: Array<{
    batsmanName: string;
    dismissal: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    isCaptain?: boolean;
    isWicketKeeper?: boolean;
  }>;
  bowling: Array<{
    bowlerName: string;
    overs: string;
    maidens: number;
    runsConceded: number;
    wickets: number;
    economy: number;
  }>;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    total: number;
  };
  fallOfWickets: Array<{
    wicketNumber: number;
    score: number;
    overs: string;
    batsmanName: string;
  }>;
}

export interface IScorecard {
  id: string;
  matchId: string;
  data: {
    firstInnings?: IScorecardInnings;
    secondInnings?: IScorecardInnings;
  };
  updatedAt: string;
}

export interface IMatch {
  id: string;
  sportId: string;
  competitionId: string;
  seasonId?: string | null;
  sport?: ISport;
  competition?: ICompetition;
  teamA: ITeam;
  teamB: ITeam;
  venue?: string | null;
  matchType: string;
  status: 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  startTime: string;
  endTime?: string | null;
  resultSummary?: string | null;
  winningTeamId?: string | null;
  score?: IMatchScore | null;
  scorecard?: IScorecard | null;
  commentaries?: ICommentaryEvent[];
  statsSummary?: {
    winProbabilityTeamA: number;
    winProbabilityTeamB: number;
    pitchReport?: string;
    weatherReport?: string;
    tossWinner?: string;
    tossDecision?: string;
  };
}

