export type CardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type HiloChoiceType = 'UP' | 'SAME' | 'DOWN';
export type HiloResultType = 'WIN' | 'LOSS' | 'PENDING';

export const HILO_SAME_MULTIPLIER = 14.99;

export interface Card {
  code: string;       // e.g. "JC", "10H", "AS"
  rank: CardRank;     // "J"
  rankValue: number;  // 11 (2 to 14)
  suit: CardSuit;     // "clubs"
  suitSymbol: string; // "♣"
  color: 'red' | 'black';
}

export const RANK_VALUES: Record<CardRank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

export const SUIT_SYMBOLS: Record<CardSuit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const SUIT_CODES: Record<CardSuit, string> = {
  spades: 'S',
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
};

export type HiloSessionStatusType = 'READY' | 'ACTIVE' | 'CASHED_OUT' | 'LOST' | 'COMPLETED';

export interface MultiplierCalculation {
  upMultiplier: number | null;
  downMultiplier: number | null;
  sameMultiplier: number;
  canUp: boolean;
  canDown: boolean;
  canSame: boolean;
  higherCount: number;
  lowerCount: number;
  sameCount: number;
  remainingCount: number;
}

