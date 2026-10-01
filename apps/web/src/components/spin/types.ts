export type AnimalType = 'lion' | 'elephant' | 'bull' | 'crown';
export type SectorColor = 'yellow' | 'green' | 'red' | 'gold';

export interface SpinGameProps {
  user?: { id: string; email: string } | null;
  balance?: number;
  onBalanceUpdate?: () => void;
}

export interface WheelSector {
  number: number;
  color: SectorColor;
  animal: AnimalType;
  label: string;
  multiplier: number;
}

export interface SpinResult {
  periodNumber: string;
  number: number;
  label?: string;
  color: SectorColor;
  animal: AnimalType;
  multiplier: number;
  timestamp?: number;
}

export interface UserBet {
  id: string;
  periodNumber: string;
  betType: 'color' | 'number';
  option: string; // 'yellow', 'green', 'red', 'gold', or number label ('0'-'36', '00')
  amount: number;
  payout: number;
  status: 'pending' | 'won' | 'lost';
  landedSector?: string;
  createdAt: number;
}

export interface LivePlayerBet {
  username: string;
  option: string;
  amount: number;
  status: 'pending' | 'won' | 'lost';
  payout: number;
}

export interface ResultModalData {
  isOpen: boolean;
  isWin: boolean;
  sector: WheelSector;
  betAmount: number;
  payout: number;
  betOption: string;
  periodNumber: string;
}
