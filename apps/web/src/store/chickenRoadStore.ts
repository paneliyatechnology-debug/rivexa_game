import { create } from 'zustand';
import { GameStatus, ResultState, DifficultySlug, CheckpointData, GameHistoryItem } from '../types/chicken-road';
import { audioManager } from '../lib/chicken-road-audio';

interface ChickenRoadStore {
  // Active Round State
  roundId: string | null;
  publicId: string | null;
  status: GameStatus;
  difficulty: DifficultySlug;
  betAmount: number;
  minBet: number;
  maxBet: number;
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
  
  // Wallet
  walletBalance: number;
  
  // History & UI
  history: GameHistoryItem[];
  activeModal: 'none' | 'history' | 'fairness' | 'help' | 'settings' | 'menu';
  selectedFairnessRoundId: string | null;
  soundEnabled: boolean;
  playCooldown: number;

  // Actions
  setBetAmount: (amount: number) => void;
  setDifficulty: (diff: DifficultySlug) => void;
  setWalletBalance: (balance: number) => void;
  toggleSound: () => void;
  openModal: (modal: 'history' | 'fairness' | 'help' | 'settings' | 'menu', roundId?: string) => void;
  closeModal: () => void;
  startCooldown: (seconds?: number) => void;

  // Game Lifecycle actions
  initRound: (data: {
    roundId: string;
    publicId?: string;
    status: GameStatus;
    betAmount: number;
    difficulty: DifficultySlug;
    serverSeedHash: string;
    clientSeed: string;
    checkpoint?: number;
    multiplier?: number;
    potentialPayout?: number;
    canMove?: boolean;
  }) => void;
  
  onCheckpointSafe: (data: {
    checkpoint: number;
    multiplier: number;
    potentialPayout: number;
  }) => void;
  
  onRoundCrashed: (data: {
    checkpoint: number;
    multiplier: number;
    serverSeed?: string;
  }) => void;
  
  onRoundCashedOut: (data: {
    checkpoint: number;
    multiplier: number;
    payout: number;
    serverSeed?: string;
  }) => void;

  resetGame: () => void;
}

let cooldownTimerId: any = null;

export const useChickenRoadStore = create<ChickenRoadStore>((set, get) => ({
  roundId: null,
  publicId: null,
  status: 'IDLE',
  difficulty: 'easy',
  betAmount: 10,
  minBet: 10,
  maxBet: 100000,
  currency: 'INR',
  checkpoint: 0,
  multiplier: 1.00,
  potentialPayout: 10,
  result: null,
  canMove: false,
  canCashout: false,
  serverSeedHash: null,
  serverSeed: null,
  clientSeed: null,
  nonce: 1,
  checkpoints: [],

  walletBalance: 0,
  history: [],
  activeModal: 'none',
  selectedFairnessRoundId: null,
  soundEnabled: true,
  playCooldown: 0,

  startCooldown: (seconds = 5) => {
    if (cooldownTimerId) clearInterval(cooldownTimerId);
    set({ playCooldown: seconds });
    cooldownTimerId = setInterval(() => {
      const cur = get().playCooldown;
      if (cur <= 1) {
        clearInterval(cooldownTimerId);
        cooldownTimerId = null;
        set({ playCooldown: 0 });
      } else {
        set({ playCooldown: cur - 1 });
      }
    }, 1000);
  },

  setBetAmount: (amount: number) => {
    const min = get().minBet || 10;
    const max = get().maxBet || 100000;
    const valid = Math.max(min, Math.min(max, amount));
    set({ betAmount: valid, potentialPayout: valid * get().multiplier });
  },

  setDifficulty: (diff: DifficultySlug) => {
    if (get().status === 'IDLE' || get().status === 'READY') {
      set({ difficulty: diff });
    }
  },

  setWalletBalance: (balance: number) => set({ walletBalance: balance }),

  toggleSound: () => {
    const next = !get().soundEnabled;
    audioManager.enabled = next;
    set({ soundEnabled: next });
  },

  openModal: (modal, roundId) => set({ activeModal: modal, selectedFairnessRoundId: roundId || null }),
  closeModal: () => set({ activeModal: 'none', selectedFairnessRoundId: null }),

  initRound: (data) => {
    set({
      roundId: data.roundId,
      publicId: data.publicId || data.roundId.substring(0, 8),
      status: data.status,
      betAmount: data.betAmount,
      difficulty: data.difficulty,
      serverSeedHash: data.serverSeedHash,
      clientSeed: data.clientSeed,
      checkpoint: data.checkpoint || 0,
      multiplier: data.multiplier || 1.00,
      potentialPayout: data.potentialPayout || data.betAmount,
      canMove: true,
      canCashout: (data.checkpoint || 0) > 0,
      result: null,
    });
  },

  onCheckpointSafe: (data) => {
    const currentStatus = get().status;
    if (currentStatus === 'CRASHED' || currentStatus === 'CASHED_OUT') return;

    audioManager.playCheckpointSafe(data.checkpoint);
    set((state) => ({
      status: 'RUNNING',
      canMove: true,
      canCashout: true,
      checkpoint: data.checkpoint,
      multiplier: data.multiplier,
      potentialPayout: data.potentialPayout,
      checkpoints: [
        ...state.checkpoints,
        { checkpointNumber: data.checkpoint, multiplier: data.multiplier, result: 'SAFE' },
      ],
    }));
  },

  onRoundCrashed: (data) => {
    audioManager.playCrash();
    get().startCooldown(5);
    set((state) => ({
      status: 'CRASHED',
      result: 'LOSS',
      canMove: false,
      canCashout: false,
      serverSeed: data.serverSeed || state.serverSeed,
      checkpoints: [
        ...state.checkpoints,
        { checkpointNumber: data.checkpoint, multiplier: data.multiplier, result: 'CRASH' },
      ],
    }));

    setTimeout(() => {
      get().resetGame();
    }, 2500);
  },

  onRoundCashedOut: (data) => {
    audioManager.playCashout();
    get().startCooldown(5);
    set((state) => {
      const payout = Number(data.payout || 0);
      const newBal = Number((state.walletBalance + payout).toFixed(2));
      return {
        status: 'CASHED_OUT',
        result: 'CASHOUT',
        canMove: false,
        canCashout: false,
        serverSeed: data.serverSeed || state.serverSeed,
        walletBalance: newBal,
      };
    });

    setTimeout(() => {
      get().resetGame();
    }, 2500);
  },

  resetGame: () => {
    set((state) => ({
      roundId: null,
      publicId: null,
      status: 'IDLE',
      checkpoint: 0,
      multiplier: 1.00,
      potentialPayout: state.betAmount,
      result: null,
      canMove: false,
      canCashout: false,
      checkpoints: [],
      serverSeed: null,
      serverSeedHash: null,
    }));
  },
}));
