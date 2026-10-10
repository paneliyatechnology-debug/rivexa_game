import { useState, useCallback, useEffect, useRef } from 'react';
import { getApiBaseUrl } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';

export interface ShotResult {
  shotNumber: number;
  targetSpot: number;
  keeperSpot: number;
  isGoal: boolean;
  result: 'GOAL' | 'SAVED';
  multiplier: number;
  potentialPayout: number;
}

export interface PenaltyRoundState {
  roundId: string | null;
  publicId?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'HARDCORE';
  betAmount: number;
  currentStep: number; // 0 to 5
  currentMultiplier: number;
  potentialPayout: number;
  status: 'IDLE' | 'ACTIVE' | 'CASHED_OUT' | 'SAVED' | 'COMPLETED';
  result: 'PENDING' | 'WIN' | 'LOSS' | 'CASHOUT';
  homeTeam: string;
  awayTeam: string;
  shots: ShotResult[];
  serverSeedHash?: string;
  serverSeed?: string;
  clientSeed?: string;
}

export const DIFFICULTY_MULTIPLIERS: Record<string, number[]> = {
  EASY: [1.20, 1.44, 1.73, 2.07, 2.49],
  MEDIUM: [1.80, 3.38, 6.33, 11.87, 22.25],
  HARD: [2.88, 8.64, 25.92, 77.76, 233.28],
  HARDCORE: [3.60, 12.96, 46.66, 167.96, 604.66],
};

export const TEAM_LIST = [
  { name: 'Brazil', flag: '🇧🇷', code: 'BR' },
  { name: 'Curaçao', flag: '🇨🇼', code: 'CW' },
  { name: 'South Africa', flag: '🇿🇦', code: 'ZA' },
  { name: 'Japan', flag: '🇯🇵', code: 'JP' },
  { name: 'Argentina', flag: '🇦🇷', code: 'AR' },
  { name: 'France', flag: '🇫🇷', code: 'FR' },
  { name: 'Germany', flag: '🇩🇪', code: 'DE' },
  { name: 'Spain', flag: '🇪🇸', code: 'ES' },
  { name: 'Italy', flag: '🇮🇹', code: 'IT' },
  { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', code: 'GB' },
  { name: 'Portugal', flag: '🇵🇹', code: 'PT' },
  { name: 'Netherlands', flag: '🇳🇱', code: 'NL' },
  { name: 'Croatia', flag: '🇭🇷', code: 'HR' },
  { name: 'Morocco', flag: '🇲🇦', code: 'MA' },
  { name: 'USA', flag: '🇺🇸', code: 'US' },
];

export function usePenaltyShootout() {
  const { user, refreshBalance } = useAuth();
  const [roundState, setRoundState] = useState<PenaltyRoundState>({
    roundId: null,
    difficulty: 'MEDIUM',
    betAmount: 100,
    currentStep: 0,
    currentMultiplier: 1.0,
    potentialPayout: 0,
    status: 'IDLE',
    result: 'PENDING',
    homeTeam: 'South Africa',
    awayTeam: 'Japan',
    shots: [],
  });

  const roundStateRef = useRef<PenaltyRoundState>(roundState);
  roundStateRef.current = roundState;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isKicking, setIsKicking] = useState<boolean>(false);
  const [lastShot, setLastShot] = useState<ShotResult | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiUrl = getApiBaseUrl();

  const fetchActiveRound = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${apiUrl}/games/penalty-shootout/active?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 'ACTIVE') {
          setRoundState({
            roundId: data.id,
            publicId: data.publicId,
            difficulty: data.difficulty,
            betAmount: Number(data.betAmount),
            currentStep: data.currentStep,
            currentMultiplier: Number(data.currentMultiplier),
            potentialPayout: Number(data.potentialPayout),
            status: 'ACTIVE',
            result: 'PENDING',
            homeTeam: data.homeTeam || 'South Africa',
            awayTeam: data.awayTeam || 'Japan',
            shots: (data.shots || []).map((s: any) => ({
              shotNumber: s.shotNumber,
              targetSpot: s.targetSpot,
              keeperSpot: s.keeperSpot,
              isGoal: s.result === 'GOAL',
              result: s.result,
              multiplier: Number(s.multiplier),
              potentialPayout: Number(s.multiplier) * Number(data.betAmount),
            })),
            serverSeedHash: data.serverSeedHash,
            clientSeed: data.clientSeed,
          });
        }
      }
    } catch (e) {
      // Ignore network errors
    }
  }, [user?.id, apiUrl]);

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${apiUrl}/games/penalty-shootout/history?userId=${user.id}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setHistory(data);
        }
      }
    } catch (e) {
      // Ignore
    }
  }, [user?.id, apiUrl]);

  useEffect(() => {
    fetchActiveRound();
    fetchHistory();
  }, [fetchActiveRound, fetchHistory]);

  const startRound = async (
    betAmount: number,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'HARDCORE',
    homeTeam: string,
    awayTeam: string
  ) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLastShot(null);

    const userId = user?.id || 'demo_user';

    try {
      const res = await fetch(`${apiUrl}/games/penalty-shootout/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, betAmount, difficulty, homeTeam, awayTeam }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to start Penalty Shootout round');
      }

      const newRound: PenaltyRoundState = {
        roundId: data.roundId,
        publicId: data.publicId,
        difficulty: data.difficulty,
        betAmount: data.betAmount,
        currentStep: 0,
        currentMultiplier: 1.0,
        potentialPayout: 0,
        status: 'ACTIVE',
        result: 'PENDING',
        homeTeam: data.homeTeam,
        awayTeam: data.awayTeam,
        shots: [],
        serverSeedHash: data.serverSeedHash,
        clientSeed: data.clientSeed,
      };

      setRoundState(newRound);
      roundStateRef.current = newRound;

      refreshBalance();
      return data;
    } catch (err: any) {
      if (user?.id) {
        setErrorMessage(err.message || 'Failed to start round');
        throw err;
      }
      // Demo fallback if backend API offline for guest
      const mockRoundId = `demo_${Date.now()}`;
      const mockRound: PenaltyRoundState = {
        roundId: mockRoundId,
        difficulty,
        betAmount,
        currentStep: 0,
        currentMultiplier: 1.0,
        potentialPayout: 0,
        status: 'ACTIVE',
        result: 'PENDING',
        homeTeam,
        awayTeam,
        shots: [],
      };
      setRoundState(mockRound);
      roundStateRef.current = mockRound;
      refreshBalance();
      return { roundId: mockRoundId };
    } finally {
      setIsLoading(false);
    }
  };

  const shoot = async (targetSpot: number, specificRoundId?: string): Promise<ShotResult> => {
    const activeRoundId = specificRoundId || roundStateRef.current.roundId || roundState.roundId;
    if (!activeRoundId || isKicking) {
      throw new Error('No active penalty shootout round');
    }

    setIsKicking(true);
    setErrorMessage(null);

    const userId = user?.id || 'demo_user';

    try {
      const res = await fetch(`${apiUrl}/games/penalty-shootout/shoot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, gameRoundId: activeRoundId, targetSpot }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Shot execution failed');
      }

      const shotRes: ShotResult = {
        shotNumber: data.shotNumber,
        targetSpot: data.targetSpot,
        keeperSpot: data.keeperSpot,
        isGoal: data.isGoal,
        result: data.result,
        multiplier: data.multiplier,
        potentialPayout: data.potentialPayout,
      };

      setLastShot(shotRes);

      setRoundState((prev) => {
        const nextShots = [...prev.shots, shotRes];
        const nextStatus = data.status === 'SAVED' ? 'SAVED' : data.autoWin ? 'COMPLETED' : 'ACTIVE';
        const nextResult = data.isGoal ? (data.autoWin ? 'WIN' : 'PENDING') : 'LOSS';

        if (data.autoWin && data.potentialPayout > 0) {
          setLastWinAmount(data.potentialPayout);
        }

        return {
          ...prev,
          currentStep: data.currentStep,
          currentMultiplier: data.multiplier > 0 ? data.multiplier : prev.currentMultiplier,
          potentialPayout: data.potentialPayout,
          status: nextStatus,
          result: nextResult,
          shots: nextShots,
          serverSeed: data.serverSeed || prev.serverSeed,
        };
      });

      if (data.autoWin || (data.newBalance !== null && data.newBalance !== undefined)) {
        refreshBalance();
      }

      fetchHistory();
      return shotRes;
    } catch (err: any) {
      if (user?.id) {
        setErrorMessage(err.message || 'Shot execution failed');
        throw err;
      }

      // Fallback local simulation if backend API error for guest/demo
      const shotNum = roundState.currentStep + 1;
      const multipliers = DIFFICULTY_MULTIPLIERS[roundState.difficulty] || DIFFICULTY_MULTIPLIERS.MEDIUM;
      const isGoal = Math.random() < 0.66;
      let keeperSpot = targetSpot;
      if (isGoal) {
        const other = [1, 2, 3, 4, 5].filter((s) => s !== targetSpot);
        keeperSpot = other[Math.floor(Math.random() * other.length)];
      }

      const mult = isGoal ? multipliers[shotNum - 1] : 0;
      const payout = isGoal ? roundState.betAmount * mult : 0;
      const autoWin = isGoal && shotNum === 5;

      const shotRes: ShotResult = {
        shotNumber: shotNum,
        targetSpot,
        keeperSpot,
        isGoal,
        result: isGoal ? 'GOAL' : 'SAVED',
        multiplier: mult,
        potentialPayout: payout,
      };

      setLastShot(shotRes);

      setRoundState((prev) => {
        const nextStatus = !isGoal ? 'SAVED' : autoWin ? 'COMPLETED' : 'ACTIVE';
        const nextResult = isGoal ? (autoWin ? 'WIN' : 'PENDING') : 'LOSS';

        if (autoWin) setLastWinAmount(payout);

        return {
          ...prev,
          currentStep: isGoal ? shotNum : prev.currentStep,
          currentMultiplier: isGoal ? mult : prev.currentMultiplier,
          potentialPayout: payout,
          status: nextStatus,
          result: nextResult,
          shots: [...prev.shots, shotRes],
        };
      });

      refreshBalance();
      return shotRes;
    } finally {
      setIsKicking(false);
    }
  };

  const cashout = async () => {
    const activeRoundId = roundStateRef.current.roundId || roundState.roundId;
    if (!activeRoundId || roundStateRef.current.status !== 'ACTIVE') {
      throw new Error('No active penalty shootout round to cash out');
    }

    setIsLoading(true);
    setErrorMessage(null);

    const userId = user?.id || 'demo_user';

    try {
      const res = await fetch(`${apiUrl}/games/penalty-shootout/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, gameRoundId: activeRoundId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Cashout failed');
      }

      setLastWinAmount(data.payout);

      setRoundState((prev) => ({
        ...prev,
        status: 'CASHED_OUT',
        result: 'CASHOUT',
        potentialPayout: data.payout,
        serverSeed: data.serverSeed,
      }));

      refreshBalance();
      fetchHistory();
      return data;
    } catch (err: any) {
      if (user?.id) {
        setErrorMessage(err.message || 'Cashout failed');
        throw err;
      }

      // Fallback local cashout for demo
      const payout = roundState.betAmount * roundState.currentMultiplier;
      setLastWinAmount(payout);

      setRoundState((prev) => ({
        ...prev,
        status: 'CASHED_OUT',
        result: 'CASHOUT',
        potentialPayout: payout,
      }));

      refreshBalance();
      return { payout };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    roundState,
    isLoading,
    isKicking,
    lastShot,
    lastWinAmount,
    history,
    errorMessage,
    startRound,
    shoot,
    cashout,
    fetchActiveRound,
    fetchHistory,
  };
}
