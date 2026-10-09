export type SpinColor = 'green' | 'blue' | 'red';
export type WheelSlotColor = 'green' | 'blue' | 'red';

export interface SpinGameProps {
  user?: { id: string; email: string } | null;
  balance?: number;
  onBalanceUpdate?: () => void;
}

export interface WheelSlot {
  index: number;
  slotNumber: number;
  color: SpinColor;
  multiplier: number;
  label: string;
}

export interface SpinHistoryItem {
  id: string;
  index?: number;
  roundId: string;
  time: string;
  choice: string;
  result: string;
  multiplier: number;
  betAmount: number;
  payoutAmount: number;
  profitLoss: number;
  status: 'WON' | 'LOST' | 'PENDING';
}

export interface RecentSpin {
  periodNumber: string;
  resultColor: string;
  multiplier: number;
  timestamp?: number;
}

export interface ResultModalData {
  isOpen: boolean;
  isWin: boolean;
  choice: string;
  result: string;
  multiplier: number;
  betAmount: number;
  payoutAmount: number;
  profitLoss: number;
  roundId: string;
}
