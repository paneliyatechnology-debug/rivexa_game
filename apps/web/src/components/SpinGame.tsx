'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SpinGameProps,
  SpinResult,
  UserBet,
  ResultModalData,
  SectorColor,
  WheelSector,
} from './spin/types';
import { SECTORS, UNIQUE_WHEEL_NUMBERS } from './spin/sectors';
import { createAudioEngine } from './spin/spinUtils';
import { SpinHeader } from './spin/SpinHeader';
import { RoundStatus } from './spin/RoundStatus';
import { RecentSpins } from './spin/RecentSpins';
import { AnimalSelector } from './spin/AnimalSelector';
import { SpinWheel } from './spin/SpinWheel';
import { BetPanel } from './spin/BetPanel';
import { SpinButton } from './spin/SpinButton';
import { ResultModal } from './spin/ResultModal';
import { RulesModal } from './spin/RulesModal';
import { GameHistoryModal } from './spin/GameHistoryModal';
import { MyBetsSection } from './spin/MyBetsSection';
import { getApiBaseUrl } from '@/lib/config';
import ValidationErrorModal, { ValidationErrorType } from './ValidationErrorModal';
import { useAuth } from '@/context/AuthContext';

export function SpinGame({ user: propUser, balance: initialBalance = 1000, onBalanceUpdate }: SpinGameProps) {
  const { user: authUser, balance: authBalance, refreshBalance } = useAuth();
  const user = authUser || propUser;
  const balance = authBalance ?? initialBalance;
  const [status, setStatus] = useState<'BETTING_OPEN' | 'SPINNING' | 'RESULT'>('BETTING_OPEN');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15);
  const [roundId, setRoundId] = useState<string>('');

  // Selected bet category & options
  const [betCategory, setBetCategory] = useState<'color' | 'number'>('color');
  const [selectedColor, setSelectedColor] = useState<SectorColor>('yellow');
  const [selectedNumObj, setSelectedNumObj] = useState<WheelSector | null>(UNIQUE_WHEEL_NUMBERS[0] || null);
  const [betAmount, setBetAmount] = useState<number>(50);
  const [autoSpin, setAutoSpin] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved =
        localStorage.getItem('rivexa_sound_enabled') ??
        localStorage.getItem('spin_sound_enabled') ??
        localStorage.getItem('game_sound_enabled');
      if (saved !== null) {
        setSoundEnabled(saved === 'true');
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem('rivexa_sound_enabled', String(soundEnabled));
      localStorage.setItem('spin_sound_enabled', String(soundEnabled));
      localStorage.setItem('game_sound_enabled', String(soundEnabled));
    } catch (e) {}
  }, [soundEnabled, mounted]);

  // Active round state tracking
  const [hasUserPlacedBetThisRound, setHasUserPlacedBetThisRound] = useState<boolean>(false);
  const [pendingApiPromiseResult, setPendingApiPromiseResult] = useState<any | null>(null);

  // Dynamic History & User Bets
  const [history, setHistory] = useState<SpinResult[]>([]);
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [winningResult, setWinningResult] = useState<SpinResult | null>(null);

  // Modals & Popups State
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showMyBetsModal, setShowMyBetsModal] = useState<boolean>(false);
  const [resultModalData, setResultModalData] = useState<ResultModalData | null>(null);
  const [message, setMessage] = useState<string>('');

  // Validation Error Popup Modal State
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    type: ValidationErrorType;
    message: string;
    requiredAmount?: number;
    minBet?: number;
    maxBet?: number;
    currentBalance?: number;
  } | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Animation & Rotation Physics Refs
  const currentAngleRef = useRef<number>(0);
  const [targetAngle, setTargetAngle] = useState<number>(0);
  const spinStartTimeRef = useRef<number>(0);

  // Audio Engine Instance
  const { playSound } = createAudioEngine(soundEnabled);

  // Toast notification helper
  const showToast = (msg: string) => {
    setMessage(msg);
  };

  // Fetch Live User Profile & Balance from backend API
  const fetchUserBalance = useCallback(async () => {
    refreshBalance();
  }, [refreshBalance]);

  // Fetch Game History & My Bets from API & LocalStorage
  const fetchGameHistory = useCallback(async () => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('rivexa_token') || localStorage.getItem('token')
          : null;
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/spin/history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.history) && data.history.length > 0) {
          setHistory(data.history);
          return;
        }
      }
    } catch (err) {}

    if (typeof window !== 'undefined') {
      try {
        const savedHistory = localStorage.getItem('rivexa_spin_history');
        if (savedHistory) {
          const parsed = JSON.parse(savedHistory);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHistory(parsed);
          }
        }
      } catch (e) {}
    }
  }, []);

  // Server-synchronized period ID calculation
  const getCurrentPeriodId = useCallback((interval: number = 30): string => {
    const timestamp = Math.floor(Date.now() / 1000);
    const periodIndex = Math.floor(timestamp / interval);
    const now = new Date(timestamp * 1000);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${String(periodIndex % 10000).padStart(4, '0')}`;
  }, []);

  // Sync user balance & history on mount
  useEffect(() => {
    fetchUserBalance();
    fetchGameHistory();

    if (typeof window !== 'undefined') {
      try {
        const savedBets = localStorage.getItem('rivexa_spin_my_bets');
        if (savedBets) {
          const parsed = JSON.parse(savedBets);
          if (Array.isArray(parsed)) {
            setUserBets(parsed);
          }
        }
      } catch (e) {}
    }
  }, [fetchUserBalance, fetchGameHistory]);

  // Synchronized Round ID & 30-Second Game Cycle Engine
  useEffect(() => {
    const updateGameCycle = () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const interval = 30;
      const elapsed = timestamp % interval;
      const secondsRem = interval - elapsed;
      const currentPeriod = getCurrentPeriodId(30);

      setRoundId(currentPeriod);

      if (status === 'BETTING_OPEN') {
        setSecondsRemaining(secondsRem);
        if (secondsRem <= 4 && secondsRem > 1) {
          playSound('countdown');
        }
        if (secondsRem <= 1) {
          startSpinRound();
        }
      }
    };

    updateGameCycle();
    const timer = setInterval(updateGameCycle, 1000);
    return () => clearInterval(timer);
  }, [status, getCurrentPeriodId]);

  // Initiate Wheel Spin with Exact Arrow Alignment Calculation
  const startSpinRound = (forcedResultSector?: WheelSector) => {
    setStatus('SPINNING');
    playSound('spin');

    let targetSector = forcedResultSector;
    if (!targetSector) {
      if (pendingApiPromiseResult?.resultColor) {
        const matchingSectors = SECTORS.filter(
          (s) => s.color === pendingApiPromiseResult.resultColor
        );
        targetSector =
          matchingSectors[Math.floor(Math.random() * matchingSectors.length)] ||
          SECTORS[0];
      } else {
        const winningIdx = Math.floor(Math.random() * SECTORS.length);
        targetSector = SECTORS[winningIdx];
      }
    }

    const winningIdx = SECTORS.findIndex(
      (s) => s.number === targetSector?.number && s.color === targetSector?.color
    );
    const validIdx = winningIdx >= 0 ? winningIdx : 0;
    const finalSector = SECTORS[validIdx];

    const sliceAngle = (Math.PI * 2) / SECTORS.length;

    // Mathematical formula for aligning sector winningIdx EXACTLY under top pointer (-Math.PI / 2)
    const baseTargetAngle = -Math.PI / 2 - validIdx * sliceAngle;
    const fullSpins = (6 + Math.floor(Math.random() * 3)) * Math.PI * 2;

    const computedTarget = fullSpins + baseTargetAngle;
    setTargetAngle(computedTarget);
    spinStartTimeRef.current = Date.now();

    // Settle Spin after 4.5 seconds
    setTimeout(() => {
      settleRound(finalSector);
    }, 4500);
  };

  // Settle Round & Calculate Payouts
  const settleRound = (resSector: WheelSector) => {
    const res: SpinResult = {
      periodNumber: roundId,
      number: resSector.number,
      label: resSector.label,
      color: resSector.color,
      animal: resSector.animal,
      multiplier: resSector.multiplier,
      timestamp: Date.now(),
    };

    setWinningResult(res);
    setHistory((prev) => {
      const updated = [res, ...prev.slice(0, 19)];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('rivexa_spin_history', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });
    setStatus('RESULT');

    // Check if user placed a bet in this active round
    let totalWon = 0;
    let totalBetForRound = 0;
    let placedOptionLabel = '';

    const updatedBets = userBets.map((b) => {
      if (b.status === 'pending' && b.periodNumber === roundId) {
        totalBetForRound += b.amount;
        placedOptionLabel =
          b.betType === 'number' ? `NUMBER ${b.option}` : b.option.toUpperCase();

        let isWin = false;
        let payoutMult = 0;

        if (b.betType === 'color') {
          isWin = b.option === resSector.color;
          payoutMult = resSector.multiplier;
        } else if (b.betType === 'number') {
          isWin = b.option === resSector.label || String(resSector.number) === b.option;
          payoutMult =
            resSector.color === 'red' ? 18.0 : resSector.color === 'gold' ? 50.0 : 36.0;
        }

        const payout = isWin ? b.amount * payoutMult : 0;
        if (isWin) totalWon += payout;

        return {
          ...b,
          payout,
          landedSector: `${resSector.label} (${resSector.animal.toUpperCase()})`,
          status: isWin ? ('won' as const) : ('lost' as const),
        };
      }
      return b;
    });

    setUserBets(updatedBets);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('rivexa_spin_my_bets', JSON.stringify(updatedBets.slice(0, 100)));
      } catch (e) {}
    }

    // CONDITIONAL POPUP RULE:
    // IF USER PLACED A BET THIS ROUND, OPEN THE POPUP RESULT MODAL!
    if (hasUserPlacedBetThisRound || totalBetForRound > 0) {
      const isUserWin = totalWon > 0;
      setResultModalData({
        isOpen: true,
        isWin: isUserWin,
        sector: resSector,
        betAmount: totalBetForRound || betAmount,
        payout: totalWon,
        betOption: placedOptionLabel || selectedColor.toUpperCase(),
        periodNumber: roundId,
      });
    }

    if (totalWon > 0) {
      refreshBalance();
      if (onBalanceUpdate) onBalanceUpdate();
      playSound('win');
    } else if (totalBetForRound > 0) {
      refreshBalance();
      playSound('loss');
    }

    // Reset round flags after 4.5s
    setTimeout(() => {
      setStatus('BETTING_OPEN');
      setSecondsRemaining(15);
      setWinningResult(null);
      setHasUserPlacedBetThisRound(false);
      setPendingApiPromiseResult(null);

      // Handle Auto Spin
      if (autoSpin) {
        setTimeout(() => {
          handlePlaceBet();
        }, 1000);
      }
    }, 4500);
  };

  // Place Bet Action (Supports Color/Animal and Number 0-36 bets)
  const handlePlaceBet = async () => {
    playSound('chip');
    if (status !== 'BETTING_OPEN') {
      showToast('Betting is closed for current spin round!');
      return;
    }

    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('rivexa_token') || localStorage.getItem('token')
        : null;

    let targetUserId = user?.id;
    if (!targetUserId && typeof window !== 'undefined') {
      const saved = localStorage.getItem('rivexa_user');
      if (saved) {
        try {
          targetUserId = JSON.parse(saved).id;
        } catch (e) {}
      }
    }

    if (!token || !targetUserId) {
      setValidationModal({
        isOpen: true,
        type: 'AUTH_REQUIRED',
        message: 'Please log in to place bets on Spin Wheel.',
      });
      return;
    }

    if (betAmount <= 0 || betAmount < 10) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Minimum bet amount for Spin Wheel is ₹10.',
        minBet: 10,
        maxBet: 10000,
        requiredAmount: betAmount || 0,
      });
      return;
    }

    if (betAmount > 10000) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Bet amount must be between ₹10 and ₹10,000.',
        minBet: 10,
        maxBet: 10000,
        requiredAmount: betAmount,
      });
      return;
    }

    if (balance <= 0 || balance < betAmount) {
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: `Your current balance (₹${balance.toFixed(2)}) is insufficient for a ₹${betAmount.toFixed(2)} bet. Please recharge your wallet.`,
        requiredAmount: betAmount,
        currentBalance: balance,
      });
      return;
    }

    const betChoice =
      betCategory === 'color' ? selectedColor : selectedNumObj ? selectedNumObj.label : '0';

    const newBet: UserBet = {
      id: Math.random().toString(36).substring(2, 9),
      periodNumber: roundId,
      betType: betCategory,
      option: betChoice,
      amount: betAmount,
      payout: 0,
      status: 'pending',
      createdAt: Date.now(),
    };

    const updatedUserBets = [newBet, ...userBets];
    setUserBets(updatedUserBets);
    setHasUserPlacedBetThisRound(true);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('rivexa_spin_my_bets', JSON.stringify(updatedUserBets.slice(0, 100)));
      } catch (e) {}
    }

    // Submit bet to backend API endpoint
    try {
      const apiBase = getApiBaseUrl();
      const spinRes = await fetch(`${apiBase}/games/spin/spin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: targetUserId,
          selectedColor: betChoice,
          betAmount,
          periodNumber: roundId,
        }),
      });

      const apiData = await spinRes.json();
      if (spinRes.ok) {
        setPendingApiPromiseResult(apiData);
        refreshBalance();
      } else {
        const errMsg = apiData.message || 'Bet failed.';
        if (errMsg.toLowerCase().includes('balance') || spinRes.status === 400) {
          setValidationModal({
            isOpen: true,
            type: 'INSUFFICIENT_BALANCE',
            message: errMsg,
            requiredAmount: betAmount,
            currentBalance: balance,
          });
        } else {
          setValidationModal({
            isOpen: true,
            type: 'GAME_ERROR',
            message: errMsg,
          });
        }
        refreshBalance();
      }
    } catch (e: any) {
      setValidationModal({
        isOpen: true,
        type: 'GAME_ERROR',
        message: e.message || 'Error connecting to game server.',
      });
      refreshBalance();
    }

    showToast(`Bet placed: ₹${betAmount} on ${betChoice.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050a14] via-[#08101d] to-[#040810] text-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* 1. TOP HEADER BAR */}
      <SpinHeader
        balance={balance}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenRules={() => setShowRulesModal(true)}
      />

      {/* Toast Alert Notice */}
      {message && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs px-4 py-2 rounded-full shadow-2xl animate-in fade-in flex items-center gap-2 border border-yellow-200 font-mono">
          <span>🔔 {message}</span>
        </div>
      )}

      {/* MAIN CONTENT ARENA: Clean mobile-first app card layout (max-w-[520px] centered) */}
      <main className="flex-1 max-w-[520px] w-full mx-auto p-2.5 sm:p-4 space-y-3 sm:space-y-4 flex flex-col justify-between">
        {/* 2. ROUND STATUS & PERIOD HEADER BANNER */}
        <RoundStatus
          roundId={roundId}
          status={status}
          secondsRemaining={secondsRemaining}
        />

        {/* 3. RECENT SPINS HORIZONTAL STRIP */}
        <RecentSpins
          history={history}
          onOpenHistoryModal={() => setShowHistoryModal(true)}
        />

        {/* 4. MAIN HERO WHEEL */}
        <SpinWheel
          status={status}
          secondsRemaining={secondsRemaining}
          winningResult={winningResult}
          targetAngle={targetAngle}
          currentAngleRef={currentAngleRef}
          spinStartTimeRef={spinStartTimeRef}
          onTickSound={() => playSound('tick')}
        />

        {/* 5. ANIMAL CARDS SELECTOR */}
        <AnimalSelector
          betCategory={betCategory}
          selectedColor={selectedColor}
          selectedNumObj={selectedNumObj}
          onSelectCategory={setBetCategory}
          onSelectColor={setSelectedColor}
          onSelectNumber={setSelectedNumObj}
          onPlaySound={() => playSound('chip')}
        />

        {/* 6. BET PANEL CONTROLS */}
        <BetPanel
          betAmount={betAmount}
          balance={balance}
          onChangeBetAmount={setBetAmount}
          onPlaySound={() => playSound('chip')}
        />

        {/* 7. MAIN SPIN ACTION BUTTON & AUTO SPIN */}
        <SpinButton
          status={status}
          betAmount={betAmount}
          autoSpin={autoSpin}
          onPlaceBet={handlePlaceBet}
          onToggleAutoSpin={() => setAutoSpin(!autoSpin)}
        />

        {/* 8. MY BET HISTORY SECTION (LIVE PLAYERS LIST REMOVED) */}
        <MyBetsSection
          userBets={userBets}
          onOpenMyPastRecord={() => setShowMyBetsModal(true)}
        />
      </main>

      {/* MODALS */}
      {/* 1. WIN / LOSS RESULT CELEBRATION POPUP MODAL */}
      <ResultModal
        data={resultModalData}
        onClose={() => setResultModalData(null)}
      />

      {/* 2. GAME RULES MODAL */}
      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      {/* 3. PERIOD HISTORY & PAST RECORDS MODAL */}
      <GameHistoryModal
        showMyBetsModal={showMyBetsModal}
        showHistoryModal={showHistoryModal}
        userBets={userBets}
        history={history}
        onCloseMyBets={() => setShowMyBetsModal(false)}
        onCloseHistory={() => setShowHistoryModal(false)}
      />
      {/* 4. VALIDATION ERROR POPUP MODAL */}
      {validationModal && (
        <ValidationErrorModal
          isOpen={validationModal.isOpen}
          onClose={() => setValidationModal(null)}
          type={validationModal.type}
          message={validationModal.message}
          currentBalance={validationModal.currentBalance ?? balance}
          requiredAmount={validationModal.requiredAmount}
          minBet={validationModal.minBet}
          maxBet={validationModal.maxBet}
        />
      )}
    </div>
  );
}
