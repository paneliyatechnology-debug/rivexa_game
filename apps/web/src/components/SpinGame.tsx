'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  SpinGameProps,
  SpinColor,
  WheelSlot,
  SpinHistoryItem,
  RecentSpin,
} from './spin/types';
import { WHEEL_SLOTS } from './spin/sectors';
import { createAudioEngine } from './spin/spinUtils';
import { SpinSidebar } from './spin/SpinSidebar';
import { SpinHeader } from './spin/SpinHeader';
import { RecentSpins } from './spin/RecentSpins';
import { ColorSelector } from './spin/ColorSelector';
import { BetControls } from './spin/BetControls';
import { SpinButton } from './spin/SpinButton';
import { SpinWheel } from './spin/SpinWheel';
import { SpinHistoryPanel } from './spin/SpinHistoryPanel';
import { RulesModal } from './spin/RulesModal';
import { getApiBaseUrl } from '@/lib/config';
import ValidationErrorModal, { ValidationErrorType } from './ValidationErrorModal';
import { useAuth } from '@/context/AuthContext';

interface ActiveRoundResult {
  roundId: string;
  isWin: boolean;
  selectedColor: SpinColor;
  resultColor: string;
  multiplier: number;
  betAmount: number;
  payoutAmount: number;
  profitLoss: number;
}

export function SpinGame({
  user: propUser,
  balance: initialBalance = 1000,
  onBalanceUpdate,
}: SpinGameProps) {
  const { user: authUser, balance: authBalance, refreshBalance } = useAuth();
  const user = authUser || propUser;
  const balance = authBalance ?? initialBalance;

  // Round-based phase & timer state
  const [phase, setPhase] = useState<'BETTING_OPEN' | 'SPINNING' | 'RESULT'>('BETTING_OPEN');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [periodNumber, setPeriodNumber] = useState<string>('SPIN-LIVE');
  const [recentSpins, setRecentSpins] = useState<RecentSpin[]>([]);

  // Bet selection & lock state
  const [selectedColor, setSelectedColor] = useState<SpinColor>('green');
  const [betAmount, setBetAmount] = useState<number>(100);
  const [minBet, setMinBet] = useState<number>(10);
  const [maxBet, setMaxBet] = useState<number>(50000);
  const [isBetPlaced, setIsBetPlaced] = useState<boolean>(false);
  const [placedBetInfo, setPlacedBetInfo] = useState<{
    selectedColor: SpinColor;
    betAmount: number;
    potentialPayout: number;
  } | null>(null);

  // Wheel animation state
  const [rotation, setRotation] = useState<number>(0);
  const [winningSlot, setWinningSlot] = useState<WheelSlot | null>(null);
  const isSpinningRef = useRef<boolean>(false);
  const currentPeriodRef = useRef<string>('');
  const lastHandledRoundRef = useRef<string>('');

  // Canonical Result & UI controls
  const [activeResult, setActiveResult] = useState<ActiveRoundResult | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  // Right-side history state (10 records per page server pagination)
  const [historyItems, setHistoryItems] = useState<SpinHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);

  // Validation modal state
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    type: ValidationErrorType;
    message: string;
  }>({
    isOpen: false,
    type: 'INSUFFICIENT_BALANCE',
    message: '',
  });

  // Audio synthesizer instance
  const audioRef = useRef(createAudioEngine(soundEnabled));
  useEffect(() => {
    audioRef.current = createAudioEngine(soundEnabled);
  }, [soundEnabled]);

  // Persisted sound preferences
  useEffect(() => {
    setMounted(true);
    try {
      const saved =
        localStorage.getItem('rivexa_sound_enabled') ??
        localStorage.getItem('spin_sound_enabled');
      if (saved !== null) {
        setSoundEnabled(saved === 'true');
      }
    } catch {}
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('rivexa_sound_enabled', String(next));
      localStorage.setItem('spin_sound_enabled', String(next));
    } catch {}
  };

  // Fetch paginated history from database
  const fetchHistory = useCallback(
    async (pageToLoad: number = 1) => {
      if (!user?.id) return;
      setIsHistoryLoading(true);
      try {
        const apiBase = getApiBaseUrl();
        const path = `/games/spin/history?userId=${encodeURIComponent(user.id)}&page=${pageToLoad}&limit=10`;
        let res = await fetch(`${apiBase}${path}`).catch(() => null);
        if (!res || !res.ok) {
          res = await fetch(`/api${path}`).catch(() => null);
        }
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.success) {
            const mappedItems = (data.items || []).map((it: any) => {
              // If the server has already settled the bet as WON or LOST, always use the real settled result
              if (it.status === 'WON' || it.status === 'LOST') {
                return it;
              }
              // If the bet in DB is still PENDING, display as PENDING until settled
              return {
                ...it,
                status: 'PENDING',
                result: 'PENDING',
                multiplier: 0,
                payoutAmount: 0,
                profitLoss: 0,
              };
            });
            setHistoryItems(mappedItems);
            setHistoryPage(data.page || pageToLoad);
            setHistoryTotalPages(data.totalPages || 1);
            setHistoryTotal(data.total || 0);
          }
        }
      } catch {
        // Silent catch for background polling
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [user?.id]
  );

  /**
   * Trigger automatic wheel spin animation to the server-determined slot
   * Strictly idempotently guarded by lastHandledRoundRef so it NEVER fires twice.
   */
  const triggerWheelSpin = useCallback(
    (targetSlotIndex: number, resultColor: string, roundId?: string) => {
      const activeRoundId = roundId || currentPeriodRef.current;
      if (isSpinningRef.current || (activeRoundId && lastHandledRoundRef.current === activeRoundId)) {
        return;
      }
      lastHandledRoundRef.current = activeRoundId;
      isSpinningRef.current = true;
      setPhase('SPINNING');
      audioRef.current.playSound('spin');

      // 24 slots, 15 deg per slot. Slot k lands directly under the top pointer.
      const slotOffset = (360 - (targetSlotIndex * 15)) % 360;
      setRotation((prev) => {
        const currentMod = prev % 360;
        let delta = slotOffset - currentMod;
        if (delta <= 0) delta += 360;
        return prev + 360 * 5 + delta; // 5 full spins + delta
      });

      // 4500ms spin animation duration
      setTimeout(() => {
        isSpinningRef.current = false;
        setPhase('RESULT');
        const landedSlot = WHEEL_SLOTS[targetSlotIndex] || WHEEL_SLOTS[0];
        setWinningSlot(landedSlot);

        // Check user bet result if user placed a bet in this round
        if (placedBetInfo) {
          const isWin = placedBetInfo.selectedColor.toUpperCase() === resultColor.toUpperCase();
          if (isWin) {
            audioRef.current.playSound('win');
          } else {
            audioRef.current.playSound('loss');
          }

          const multiplier = resultColor.toUpperCase() === 'RED' ? 9.50 : 1.90;
          const payoutAmount = isWin ? placedBetInfo.betAmount * multiplier : 0;
          const profitLoss = isWin ? payoutAmount - placedBetInfo.betAmount : -placedBetInfo.betAmount;

          // Single canonical active result state for the in-panel banner
          setActiveResult({
            roundId: activeRoundId,
            isWin,
            selectedColor: placedBetInfo.selectedColor,
            resultColor,
            multiplier: isWin ? multiplier : 0,
            betAmount: placedBetInfo.betAmount,
            payoutAmount,
            profitLoss,
          });
        }

        // Add to recent spins strip dynamically (no duplicates)
        setRecentSpins((prev) => [
          {
            periodNumber: activeRoundId,
            resultColor: resultColor.toUpperCase(),
            multiplier: resultColor.toUpperCase() === 'RED' ? 9.50 : 1.90,
            timestamp: Date.now(),
          },
          ...prev.filter((p) => p.periodNumber !== activeRoundId).slice(0, 9),
        ]);

        // Refresh balance and history from database
        refreshBalance?.();
        onBalanceUpdate?.();
        fetchHistory(1);

        // Reset to next round after 2.5s result display
        setTimeout(() => {
          setPhase('BETTING_OPEN');
          setIsBetPlaced(false);
          setPlacedBetInfo(null);
          setWinningSlot(null);
          setActiveResult(null);
          setSecondsRemaining(30);
        }, 2500);
      }, 4500);
    },
    [placedBetInfo, refreshBalance, onBalanceUpdate, fetchHistory]
  );

  /**
   * Fetch live synchronized round state from backend
   */
  const fetchGameState = useCallback(async () => {
    try {
      const apiBase = getApiBaseUrl();
      const queryParam = user?.id ? `?userId=${encodeURIComponent(user.id)}` : '';
      const statePath = `/games/spin/state${queryParam}`;

      let res = await fetch(`${apiBase}${statePath}`).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`/api${statePath}`).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.success) {
          if (data.periodNumber) {
            if (data.periodNumber !== currentPeriodRef.current) {
              setPeriodNumber(data.periodNumber);
              currentPeriodRef.current = data.periodNumber;
              // If new round begins, clear prior result notification
              if (data.phase === 'BETTING_OPEN') {
                setActiveResult(null);
              }
            }
          }
          if (data.minBet) setMinBet(data.minBet);
          if (data.maxBet) setMaxBet(data.maxBet);
          if (Array.isArray(data.recentSpins)) {
            setRecentSpins((prev) => {
              const clientHead = prev[0];
              if (
                clientHead &&
                clientHead.periodNumber &&
                !data.recentSpins.some((s: RecentSpin) => s.periodNumber === clientHead.periodNumber) &&
                Date.now() - (clientHead.timestamp || 0) < 10000
              ) {
                return [clientHead, ...data.recentSpins.filter((s: RecentSpin) => s.periodNumber !== clientHead.periodNumber)].slice(0, 10);
              }
              return data.recentSpins;
            });
          }

          // Restore user's existing bet in this round if already placed and still PENDING
          if (data.userActiveBet && data.userActiveBet.status === 'PENDING') {
            setIsBetPlaced(true);
            setPlacedBetInfo({
              selectedColor: data.userActiveBet.selectedColor.toLowerCase() as SpinColor,
              betAmount: data.userActiveBet.betAmount,
              potentialPayout: data.userActiveBet.potentialPayout,
            });
            setSelectedColor(data.userActiveBet.selectedColor.toLowerCase() as SpinColor);
            setBetAmount(data.userActiveBet.betAmount);
          } else if (!data.userActiveBet) {
            setIsBetPlaced(false);
            setPlacedBetInfo(null);
          }

          // Auto-refresh history and balance in real-time whenever a pending bet exists
          if (user?.id) {
            setHistoryItems((prevItems) => {
              if (prevItems.some((it) => it.status === 'PENDING')) {
                fetchHistory(historyPage);
                refreshBalance?.();
                onBalanceUpdate?.();
              }
              return prevItems;
            });
          }

          // Synchronize phase and countdown
          if (data.phase === 'SPINNING') {
            if (!isSpinningRef.current && typeof data.resultSlot === 'number') {
              triggerWheelSpin(data.resultSlot, data.resultColor || 'RED', data.periodNumber);
            }
          } else if (data.phase === 'RESULT') {
            setPhase('RESULT');
          } else {
            setPhase('BETTING_OPEN');
            if (typeof data.secondsRemaining === 'number') {
              setSecondsRemaining(data.secondsRemaining);
            }
          }
        }
      }
    } catch {
      // Graceful silence on background polling to prevent Next.js dev overlay popups
    }
  }, [user?.id, triggerWheelSpin]);

  // Initial load
  useEffect(() => {
    fetchGameState();
    if (user?.id) {
      fetchHistory(1);
    }
  }, [fetchGameState, fetchHistory, user?.id]);

  // Periodic polling every 3 seconds to keep client clock aligned with server
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchGameState();
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [fetchGameState]);

  // Local 1-second countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (phase !== 'BETTING_OPEN') return prev;
        if (prev <= 1) {
          // Timer reached 0! Trigger round spin
          fetchGameState();
          return 0;
        }
        if (prev <= 4) {
          audioRef.current.playSound('countdown');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, fetchGameState]);

  /**
   * Place Bet action: locks user's bet for the current 30-second round.
   */
  const handlePlaceBet = async () => {
    if (isBetPlaced || phase !== 'BETTING_OPEN' || secondsRemaining <= 0) return;

    if (!user) {
      setValidationModal({
        isOpen: true,
        type: 'AUTH_REQUIRED',
        message: 'Please log in to place a bet on Spin & Win.',
      });
      return;
    }

    if (!selectedColor) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Please select a valid color and bet amount.',
      });
      return;
    }

    if (betAmount <= 0 || isNaN(betAmount)) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Please select a valid color and bet amount.',
      });
      return;
    }

    if (betAmount <= 0 || isNaN(betAmount)) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Please select a valid color and bet amount.',
      });
      return;
    }

    if (betAmount < minBet) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: `Minimum allowed bet is ₹${minBet.toLocaleString('en-IN')}.`,
      });
      return;
    }

    if (betAmount > maxBet) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: `Maximum allowed bet is ₹${maxBet.toLocaleString('en-IN')}.`,
      });
      return;
    }

    if (betAmount > balance) {
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: `Your balance (₹${balance.toFixed(2)}) is insufficient for a bet of ₹${betAmount.toLocaleString('en-IN')}.`,
      });
      return;
    }

    try {
      const apiBase = getApiBaseUrl();
      let res = await fetch(`${apiBase}/games/spin/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          selectedColor,
          betAmount,
          periodNumber,
        }),
      }).catch(() => null);

      if (!res) {
        res = await fetch(`/api/games/spin/bet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            selectedColor,
            betAmount,
            periodNumber,
          }),
        }).catch(() => null);
      }

      if (!res || !res.ok) {
        const err = res ? await res.json().catch(() => ({})) : {};
        throw new Error(err.message || 'Unable to place bet. Please verify connection and retry.');
      }

      const data = await res.json();
      audioRef.current.playSound('chip');

      // Lock user's bet for this round
      setIsBetPlaced(true);
      setPlacedBetInfo({
        selectedColor,
        betAmount,
        potentialPayout: data.potentialPayout,
      });

      refreshBalance?.();
      onBalanceUpdate?.();
      fetchHistory(1);
    } catch (err: any) {
      setValidationModal({
        isOpen: true,
        type: 'GAME_ERROR',
        message: err.message || 'Unable to place bet. Please retry.',
      });
    }
  };

  if (!mounted) return null;

  const mult = selectedColor === 'red' ? 9.5 : 1.90;
  const currentPotentialPayout = Number((betAmount * mult).toFixed(2));

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto bg-[#050D1D] text-white flex flex-col font-sans selection:bg-[#00D9FF] selection:text-[#06122E] pb-6 lg:pb-3">
      {/* Background ambient neon lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/4 w-[520px] h-[520px] bg-[#287BFF]/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-20 w-[450px] h-[450px] bg-[#00D9FF]/8 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-[#873BFF]/8 rounded-full blur-[140px]" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 max-w-[1560px] w-full mx-auto px-2 sm:px-4 pt-2 sm:pt-3 shrink-0">
        <SpinHeader
          balance={balance}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />
      </div>

      {/* Main Grid: Desktop 3-column [210px_minmax(0,1fr)_320px], Mobile single-column */}
      <div className="relative z-10 max-w-[1560px] w-full mx-auto px-2 sm:px-4 grid grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)_320px] xl:grid-cols-[230px_minmax(0,1fr)_340px] gap-2.5 sm:gap-3.5 items-start mt-2 sm:mt-3 pb-4">
        {/* Left Sidebar (Desktop Only) */}
        <div className="hidden lg:block sticky top-3">
          <SpinSidebar
            roundId={periodNumber}
            onOpenRules={() => setIsRulesOpen(true)}
          />
        </div>

        {/* Center Main Game Panel */}
        <main className="w-full min-w-0 rounded-2xl bg-[#091735]/90 border border-[#287BFF]/30 backdrop-blur-xl shadow-2xl p-2.5 sm:p-3.5 md:p-4 flex flex-col gap-2 sm:gap-2.5 select-none">
          {/* 1. RECENT SPINS STRIP (with round ID badge) */}
          <RecentSpins spins={recentSpins} roundId={periodNumber} />

          {/* 2. CENTERED 24-SLOT WHEEL WITH COUNTDOWN INSIDE */}
          <div className="flex items-center justify-center shrink-0">
            <SpinWheel
              rotation={rotation}
              isSpinning={phase === 'SPINNING'}
              secondsRemaining={secondsRemaining}
              status={phase}
              winningSlot={winningSlot}
            />
          </div>

          {/* SINGLE CANONICAL RESULT BANNER (Displayed ONLY once when round settles) */}
          {activeResult && phase === 'RESULT' && (
            <div
              className={`w-full py-1.5 px-3 rounded-xl border flex items-center justify-between font-mono animate-in fade-in zoom-in-95 duration-200 shrink-0 ${
                activeResult.isWin
                  ? 'bg-gradient-to-r from-[#00E5A0]/25 via-[#06291C] to-[#00E5A0]/25 border-2 border-[#00E5A0] shadow-[0_0_25px_rgba(0,229,160,0.5)] text-white'
                  : 'bg-gradient-to-r from-[#FF2468]/20 via-[#260B14] to-[#FF2468]/20 border border-[#FF2468]/60 shadow-[0_0_18px_rgba(255,36,104,0.35)] text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl">{activeResult.isWin ? '🎉' : '💔'}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs sm:text-sm font-black tracking-wider ${
                        activeResult.isWin ? 'text-[#00E5A0]' : 'text-[#FF2468]'
                      }`}
                    >
                      {activeResult.isWin ? 'YOU WON!' : 'YOU LOST'}
                    </span>
                    <span className="text-[9px] text-[#7285AE]">
                      ({activeResult.resultColor} • {activeResult.multiplier > 0 ? `${activeResult.multiplier}x` : '0x'})
                    </span>
                  </div>
                  <div className="text-[10px] text-[#9DB5D8]">
                    Bet: ₹{activeResult.betAmount.toFixed(2)} • {activeResult.isWin ? `Payout: ₹${activeResult.payoutAmount.toFixed(2)}` : 'Stake Lost'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`text-xs sm:text-sm font-black ${
                    activeResult.isWin ? 'text-[#00E5A0]' : 'text-[#FF2468]'
                  }`}
                >
                  {activeResult.isWin
                    ? `+₹${activeResult.profitLoss.toFixed(2)}`
                    : `-₹${Math.abs(activeResult.profitLoss).toFixed(2)}`}
                </span>
                <span className="text-[8px] text-[#7285AE] block uppercase">Profit / Loss</span>
              </div>
            </div>
          )}

          {/* 4. THREE COLOR SELECTION BUTTONS */}
          <div className="shrink-0">
            <ColorSelector
              selectedColor={selectedColor}
              onSelectColor={(color) => {
                if (isBetPlaced || phase !== 'BETTING_OPEN') return;
                setSelectedColor(color);
                audioRef.current.playSound('chip');
              }}
              disabled={isBetPlaced || phase !== 'BETTING_OPEN' || secondsRemaining <= 0}
            />
          </div>

          {/* 5. BET AMOUNT & QUICK BETS */}
          <div className="shrink-0">
            <BetControls
              betAmount={betAmount}
              onBetAmountChange={(amt) => {
                if (isBetPlaced || phase !== 'BETTING_OPEN') return;
                setBetAmount(amt);
                audioRef.current.playSound('chip');
              }}
              minBet={minBet}
              maxBet={maxBet}
              balance={balance}
              disabled={isBetPlaced || phase !== 'BETTING_OPEN' || secondsRemaining <= 0}
            />
          </div>

          {/* 6. PLACE BET BUTTON */}
          <div className="shrink-0 mt-0.5">
            <SpinButton
              betAmount={betAmount}
              selectedColor={selectedColor}
              potentialPayout={currentPotentialPayout}
              phase={phase}
              secondsRemaining={secondsRemaining}
              isBetPlaced={isBetPlaced}
              disabled={
                isBetPlaced ||
                phase !== 'BETTING_OPEN' ||
                betAmount > balance ||
                betAmount < minBet ||
                secondsRemaining <= 0
              }
              onPlaceBet={handlePlaceBet}
              statusText={
                betAmount > balance ? 'INSUFFICIENT BALANCE' : undefined
              }
            />
          </div>
        </main>

        {/* Right History Panel (Beside on desktop, stacked below main game on mobile) */}
        <div className="w-full min-w-0 lg:sticky lg:top-3">
          <SpinHistoryPanel
            items={historyItems}
            page={historyPage}
            totalPages={historyTotalPages}
            totalRecords={historyTotal}
            isLoading={isHistoryLoading}
            onPageChange={(newPage) => {
              fetchHistory(newPage);
            }}
            onRefresh={() => fetchHistory(historyPage)}
          />
        </div>
      </div>

      {/* Mobile Slide-out Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-[260px] max-w-[80vw] bg-[#091735] border-r border-[#287BFF]/30 p-4 flex flex-col gap-3 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎡</span>
                <span className="font-mono font-black text-sm text-white">SPIN & WIN</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 py-2 px-3 rounded-xl bg-[#06122E] border border-white/10 text-xs font-bold text-[#9DB5D8] hover:text-[#00D9FF]"
            >
              <span>←</span>
              <span>Back to Games</span>
            </Link>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsRulesOpen(true);
              }}
              className="flex items-center gap-2 py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white text-left"
            >
              <span>❓</span>
              <span>How to Play</span>
            </button>

            <div className="mt-auto pt-3 border-t border-white/10 flex flex-col gap-2">
              <div className="bg-[#06122E]/80 border border-emerald-500/30 rounded-xl p-2.5 flex items-center gap-2">
                <span className="text-base">🛡️</span>
                <div>
                  <span className="block text-[10px] font-black text-emerald-400 uppercase">
                    Provably Fair
                  </span>
                  <span className="text-[8.5px] text-[#7285AE] block">
                    Cryptographically Verified
                  </span>
                </div>
              </div>

              <div className="bg-[#06122E]/80 border border-[#287BFF]/30 rounded-xl p-2 text-center">
                <span className="text-[8.5px] font-bold text-[#7285AE] uppercase block">
                  ROUND ID
                </span>
                <span className="text-[10.5px] font-mono font-black text-[#00D9FF] truncate block">
                  {periodNumber}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Rules Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* Low Balance / Validation Error Modal */}
      <ValidationErrorModal
        isOpen={validationModal.isOpen}
        type={validationModal.type}
        message={validationModal.message || ''}
        onClose={() => setValidationModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
