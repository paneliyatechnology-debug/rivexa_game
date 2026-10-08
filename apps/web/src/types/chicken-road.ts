export type GameStatus =
  | 'IDLE'
  | 'BET_PENDING'
  | 'READY'
  | 'RUNNING'
  | 'MOVING'
  | 'CASHED_OUT'
  | 'CRASHED'
  | 'ERROR';

export type ResultState = 'PENDING' | 'WIN' | 'LOSS' | 'CASHOUT';

export type DifficultySlug = 'easy' | 'medium' | 'hard' | 'hardcore';

export interface CheckpointData {
  checkpointNumber: number;
  multiplier: number;
  result: 'SAFE' | 'CRASH';
}

export interface DifficultyLevel {
  slug: DifficultySlug;
  name: string;
  description: string;
  safeProbability: number;
  maxMultiplier: number;
  maxCheckpoints: number;
  multiplierLadder: Array<{ checkpoint: number; multiplier: number }>;
}

export interface ChickenRoadRoundState {
  roundId: string | null;
  publicId: string | null;
  status: GameStatus;
  difficulty: DifficultySlug;
  betAmount: number;
  currency: string;
  checkpoint: number;
  multiplier: number;
  potentialPayout: number;
  result: ResultState | null;
  canMove: boolean;
  canCashout: boolean;
  serverSeedHash: string | null;
  serverSeed: string | null;
  clientSeed: string | null;
  nonce: number;
  checkpoints: CheckpointData[];
  startedAt: string | null;
}

export interface GameHistoryItem {
  id: string;
  publicId: string;
  date: string;
  betAmount: number;
  currency: string;
  difficulty: string;
  checkpoint: number;
  multiplier: number;
  status: string;
  result: string;
  payout: number;
  profit: number;
  serverSeedHash: string;
  serverSeed?: string;
  clientSeed: string;
  nonce: number;
}

export interface FairnessData {
  roundId: string;
  serverSeedHash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  difficulty: string;
  safeProbability: number;
  isRevealed: boolean;
  verifiedHashMatch: boolean | null;
  checkpoints: Array<{
    checkpoint: number;
    multiplier: number;
    result: string;
    randomValue: number;
  }>;
}
