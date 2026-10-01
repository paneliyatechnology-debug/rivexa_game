'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { TopHeader } from '@/components/Navigation';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { getApiBaseUrl } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';
import ValidationErrorModal, { ValidationErrorType } from './ValidationErrorModal';

// ─── Web Audio Sound Engine for Mines ─────────────────────────────────────────
class MinesSoundEngine {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private isMuted(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const savedGlobal =
        localStorage.getItem('rivexa_sound_enabled') ??
        localStorage.getItem('game_sound_enabled');
      if (savedGlobal === 'false') return true;
      const savedMines = localStorage.getItem('mines_sound_enabled');
      if (savedMines === 'false') return true;
    } catch {}
    return false;
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.18) {
    if (this.isMuted()) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  // 💎 Gem revealed sound: crystal ascending bell
  playGemSound() {
    this.tone(880, 0.1, 'sine', 0.2);
    setTimeout(() => this.tone(1320, 0.18, 'sine', 0.15), 60);
  }

  // 💥 Mine boom sound: explosive low frequency buzz
  playBoomSound() {
    this.tone(180, 0.4, 'sawtooth', 0.3);
    setTimeout(() => this.tone(120, 0.5, 'square', 0.25), 100);
  }

  // ▶ Game start sound
  playStartSound() {
    this.tone(523, 0.12, 'sine', 0.18);
    setTimeout(() => this.tone(659, 0.15, 'sine', 0.18), 80);
  }

  // 💰 Cashout fanfare sound
  playCashoutSound() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'sine', 0.22), i * 80));
  }
}

const minesSound = typeof window !== 'undefined' ? new MinesSoundEngine() : null;

export function MinesGame() {
  const { user: authUser, balance: authBalance, refreshBalance } = useAuth();
  const [balanceState, setBalanceState] = useState<number>(0);
  const balance = authBalance ?? balanceState;

  const [betAmount, setBetAmount] = useState<string>('100');
  const [mineCount, setMineCount] = useState<number>(3);
  const [gameId, setGameId] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'PLAYING' | 'WON' | 'LOST'>('IDLE');
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [currentWin, setCurrentWin] = useState<number>(100);

  // Tiles state: array of 25 indexes (0 to 24)
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [lastHitMineIndex, setLastHitMineIndex] = useState<number | null>(null);

  // History and pagination state
  const [history, setHistory] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const historyPerPage = 10;

  // ─── Autobet State ────────────────────────────────────────────────────────
  const [betMode, setBetMode] = useState<'manual' | 'auto'>('manual');
  const [autoSelectedTiles, setAutoSelectedTiles] = useState<number[]>([]);
  const [autoBetsCount, setAutoBetsCount] = useState<number | '∞'>(10);
  const [autoBetsRemaining, setAutoBetsRemaining] = useState<number>(10);
  const [isAutoBetting, setIsAutoBetting] = useState<boolean>(false);
  const [autoSessionProfit, setAutoSessionProfit] = useState<number>(0);
  const [autoRoundsCompleted, setAutoRoundsCompleted] = useState<number>(0);
  const autoBetStopRef = useRef<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Validation Error Modal State
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    type: ValidationErrorType;
    message: string;
    requiredAmount?: number;
    minBet?: number;
    maxBet?: number;
    currentBalance?: number;
  } | null>(null);

  // Auto hide toast message
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg: string) => setToastMessage(msg);

  // Load history on mount
  const fetchHistory = useCallback(async () => {
    const userId = authUser?.id || 'demo_user';
    try {
      const res = await fetch(`${getApiBaseUrl()}/games/mines/history?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setHistory(data);
        }
      }
    } catch {}
  }, [authUser]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle Bet Halve / Double / Max
  const handleHalfBet = () => {
    const val = Math.max(10, Math.floor(parseFloat(betAmount || '0') / 2));
    setBetAmount(String(val));
  };

  const handleDoubleBet = () => {
    const val = Math.floor(parseFloat(betAmount || '0') * 2);
    setBetAmount(String(val));
  };

  const handleMaxBet = () => {
    setBetAmount(String(Math.floor(balance)));
  };

  // Toggle tile selection in Auto Mode
  const handleToggleAutoTile = (tileIndex: number) => {
    if (isAutoBetting || status === 'PLAYING') return;
    setAutoSelectedTiles((prev) =>
      prev.includes(tileIndex) ? prev.filter((t) => t !== tileIndex) : [...prev, tileIndex]
    );
  };

  // Random tile generator for Auto Mode
  const handleSelectRandomTiles = (count: number = 4) => {
    if (isAutoBetting || status === 'PLAYING') return;
    const indices = Array.from({ length: 25 }, (_, i) => i);
    const shuffled = [...indices].sort(() => 0.5 - Math.random());
    setAutoSelectedTiles(shuffled.slice(0, Math.min(count, 25)));
  };

  // Clear auto tile selection
  const handleClearAutoTiles = () => {
    if (isAutoBetting || status === 'PLAYING') return;
    setAutoSelectedTiles([]);
  };

  // Start new Manual Mines game session
  const handleStartGame = async () => {
    const amt = parseFloat(betAmount);
    if (isNaN(amt) || amt < 10) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Minimum bet amount for Mines is ₹10.',
        minBet: 10,
        currentBalance: balance,
      });
      return;
    }

    if (amt > balance) {
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: `Insufficient balance! You need ₹${amt.toFixed(2)} but only have ₹${balance.toFixed(2)}.`,
        requiredAmount: amt,
        currentBalance: balance,
      });
      return;
    }

    setIsLoading(true);
    const userId = authUser?.id || 'demo_user';

    try {
      const res = await fetch(`${getApiBaseUrl()}/games/mines/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, betAmount: amt, mineCount }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to start Mines game');
      }

      const targetId = data.gameId || data.id || data.game?.id;
      setGameId(targetId);
      setStatus('PLAYING');
      setRevealedTiles([]);
      setMinePositions([]);
      setLastHitMineIndex(null);
      setMultiplier(1.0);
      setCurrentWin(amt);
      minesSound?.playStartSound();
      refreshBalance();
    } catch (err: any) {
      setValidationModal({
        isOpen: true,
        type: err.message?.toLowerCase().includes('balance') ? 'INSUFFICIENT_BALANCE' : 'GAME_ERROR',
        message: err.message || 'Error starting Mines game',
        currentBalance: balance,
        requiredAmount: amt,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reveal a tile on the 5x5 grid (Manual Mode)
  const handleRevealTile = async (tileIndex: number) => {
    if (betMode === 'auto') {
      handleToggleAutoTile(tileIndex);
      return;
    }

    if (!gameId || status !== 'PLAYING' || revealedTiles.includes(tileIndex)) {
      if (!gameId) {
        showToast('⚠️ Please click START MINES GAME first!');
      }
      return;
    }

    const userId = authUser?.id || 'demo_user';
    try {
      const res = await fetch(`${getApiBaseUrl()}/games/mines/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, gameId, tileIndex }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reveal tile');
      }

      if (data.isMine || data.hitMine || data.status === 'LOST') {
        // Hit a bomb!
        setStatus('LOST');
        setLastHitMineIndex(tileIndex);
        setMinePositions(data.minePositions || [tileIndex]);
        setRevealedTiles((prev) => Array.from(new Set([...prev, tileIndex, ...(data.revealedTiles || [])])));
        setMultiplier(0);
        setCurrentWin(0);
        minesSound?.playBoomSound();
        showToast('💥 BOOM! You hit a mine!');
        refreshBalance();
        fetchHistory();
      } else {
        // Uncovered a safe gem!
        minesSound?.playGemSound();
        const serverRevealed = data.revealedTiles || [];
        const newRevealed = Array.from(new Set([...revealedTiles, tileIndex, ...serverRevealed]));
        setRevealedTiles(newRevealed);

        const mult = Number(data.multiplier || 1.0);
        setMultiplier(mult);
        const winAmt = Number(data.payout || data.currentProfit || parseFloat(betAmount) * mult);
        setCurrentWin(winAmt);

        if (data.status === 'WON') {
          // Uncovered all safe tiles! Auto win
          setStatus('WON');
          setMinePositions(data.minePositions || []);
          minesSound?.playCashoutSound();
          showToast(`🏆 ALL GEMS UNCOVERED! Won ₹${winAmt.toFixed(2)}!`);
          refreshBalance();
          fetchHistory();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error revealing tile');
    }
  };

  // Cashout current winnings (Manual Mode)
  const handleCashout = async () => {
    if (!gameId || status !== 'PLAYING') return;

    setIsLoading(true);
    const userId = authUser?.id || 'demo_user';

    try {
      const res = await fetch(`${getApiBaseUrl()}/games/mines/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, gameId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to cashout');
      }

      setStatus('WON');
      const finalMult = Number(data.multiplier || multiplier);
      const finalPayout = Number(data.payout || currentWin);
      setMultiplier(finalMult);
      setCurrentWin(finalPayout);
      setMinePositions(data.minePositions || []);
      minesSound?.playCashoutSound();
      showToast(`🎉 CASHOUT SUCCESSFUL! Won ₹${finalPayout.toFixed(2)} (${finalMult.toFixed(2)}x)!`);
      refreshBalance();
      fetchHistory();
    } catch (err: any) {
      showToast(err.message || 'Failed to cashout');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── AUTOBET LOOP (PROPER COUNT TERMINATION & AUTO CLOSE) ────────────────
  const handleStopAutobet = () => {
    autoBetStopRef.current = true;
    setIsAutoBetting(false);
    const resetCount = autoBetsCount === '∞' ? 10 : Number(autoBetsCount || 10);
    setAutoBetsRemaining(resetCount);
    showToast('⏹ Autobet stopped');
  };

  const handleStartAutobet = async () => {
    if (autoSelectedTiles.length === 0) {
      showToast('⚠️ Select at least 1 tile box pattern on the grid for Autobet!');
      return;
    }

    const amt = parseFloat(betAmount);
    if (isNaN(amt) || amt < 10) {
      showToast('⚠️ Minimum bet amount is ₹10');
      return;
    }

    if (amt > balance) {
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: `Insufficient balance for Autobet! Need ₹${amt.toFixed(2)}.`,
        requiredAmount: amt,
        currentBalance: balance,
      });
      return;
    }

    autoBetStopRef.current = false;
    setIsAutoBetting(true);
    setAutoSessionProfit(0);
    setAutoRoundsCompleted(0);

    const totalRoundsToRun = autoBetsCount === '∞' ? 999999 : Number(autoBetsCount || 10);
    let remainingRounds = totalRoundsToRun;
    setAutoBetsRemaining(autoBetsCount === '∞' ? 999 : remainingRounds);

    const userId = authUser?.id || 'demo_user';

    while (remainingRounds > 0 && !autoBetStopRef.current) {
      // Live balance check before starting each autobet round
      if (amt > balance) {
        showToast('⚠️ Autobet stopped: Insufficient balance for next round!');
        break;
      }

      if (autoBetsCount !== '∞') {
        setAutoBetsRemaining(remainingRounds);
      }

      // 1. Start new session
      let currentGId: string | null = null;
      try {
        const startRes = await fetch(`${getApiBaseUrl()}/games/mines/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, betAmount: amt, mineCount }),
        });
        const startData = await startRes.json();
        if (!startRes.ok) {
          showToast(startData.message || 'Autobet round start failed');
          break;
        }
        currentGId = startData.gameId || startData.id || startData.game?.id;
        setGameId(currentGId);
        setStatus('PLAYING');
        setRevealedTiles([]);
        setMinePositions([]);
        setLastHitMineIndex(null);
        setMultiplier(1.0);
        setCurrentWin(amt);
        minesSound?.playStartSound();
        refreshBalance();
      } catch (e) {
        break;
      }

      await new Promise((r) => setTimeout(r, 180));
      if (autoBetStopRef.current || !currentGId) break;

      // 2. Reveal pre-selected target tiles sequentially
      let hitMineInRound = false;
      let roundPayout = 0;
      const roundRevealed: number[] = [];

      for (const tileIdx of autoSelectedTiles) {
        if (autoBetStopRef.current || hitMineInRound) break;

        try {
          const revRes = await fetch(`${getApiBaseUrl()}/games/mines/reveal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, gameId: currentGId, tileIndex: tileIdx }),
          });

          const revData = await revRes.json();
          if (!revRes.ok) break;

          if (revData.isMine || revData.hitMine || revData.status === 'LOST') {
            hitMineInRound = true;
            setStatus('LOST');
            setLastHitMineIndex(tileIdx);
            setMinePositions(revData.minePositions || [tileIdx]);
            setRevealedTiles(Array.from(new Set([...roundRevealed, tileIdx])));
            setMultiplier(0);
            setCurrentWin(0);
            minesSound?.playBoomSound();
            setAutoSessionProfit((prev) => prev - amt);
            refreshBalance();
            fetchHistory();
            break;
          } else {
            minesSound?.playGemSound();
            roundRevealed.push(tileIdx);
            setRevealedTiles([...roundRevealed]);
            const mult = Number(revData.multiplier || 1.0);
            setMultiplier(mult);
            const winAmt = Number(revData.payout || revData.currentProfit || amt * mult);
            setCurrentWin(winAmt);

            if (revData.status === 'WON') {
              setStatus('WON');
              setMinePositions(revData.minePositions || []);
              minesSound?.playCashoutSound();
              roundPayout = winAmt;
              setAutoSessionProfit((prev) => prev + (winAmt - amt));
              refreshBalance();
              fetchHistory();
              break;
            }
          }
        } catch (err) {
          break;
        }

        await new Promise((r) => setTimeout(r, 200));
      }

      // 3. Cashout if round completed safely without hitting mine
      if (!hitMineInRound && !autoBetStopRef.current && currentGId) {
        try {
          const cashRes = await fetch(`${getApiBaseUrl()}/games/mines/cashout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, gameId: currentGId }),
          });
          const cashData = await cashRes.json();
          if (cashRes.ok) {
            setStatus('WON');
            const finalMult = Number(cashData.multiplier || multiplier);
            const finalPayout = Number(cashData.payout || currentWin);
            setMultiplier(finalMult);
            setCurrentWin(finalPayout);
            setMinePositions(cashData.minePositions || []);
            minesSound?.playCashoutSound();
            setAutoSessionProfit((prev) => prev + (finalPayout - amt));
            refreshBalance();
            fetchHistory();
          }
        } catch (e) {}
      }

      remainingRounds--;
      setAutoRoundsCompleted((r) => r + 1);
      if (autoBetsCount !== '∞') {
        setAutoBetsRemaining(remainingRounds);
      }

      if (remainingRounds > 0 && !autoBetStopRef.current) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Always clean up state when Autobet finishes all counts!
    setIsAutoBetting(false);
    const resetVal = autoBetsCount === '∞' ? 10 : Number(autoBetsCount || 10);
    setAutoBetsRemaining(resetVal);

    if (!autoBetStopRef.current && remainingRounds === 0) {
      showToast('🎉 Autobet completed all rounds successfully!');
    }
  };

  // Format timestamp helper
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Just now';
    }
  };

  // Dynamic color helper for multiplier badge
  const getMultiplierColor = (mult: number) => {
    if (status === 'LOST') return 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]';
    if (mult >= 10) return 'text-[#FF00E5] drop-shadow-[0_0_16px_rgba(255,0,229,0.9)]';
    if (mult >= 5) return 'text-[#00E5A0] drop-shadow-[0_0_14px_rgba(0,229,160,0.8)]';
    if (mult >= 2) return 'text-[#00D9FF] drop-shadow-[0_0_12px_rgba(0,217,255,0.8)]';
    return 'text-[#FFC928] drop-shadow-[0_0_10px_rgba(255,201,40,0.6)]';
  };

  // Pagination Math for History Table
  const totalRounds = history.length;
  const totalPages = Math.max(1, Math.ceil(totalRounds / historyPerPage));
  const currentPageRows = history.slice(
    (historyPage - 1) * historyPerPage,
    historyPage * historyPerPage
  );

  return (
    <div className="min-h-screen bg-[#03081B] text-gray-100 flex flex-col font-sans selection:bg-[#00D9FF]/30 selection:text-[#00D9FF] relative overflow-x-hidden">
      {/* 🌌 High-Quality Ambient Background Neon Glow Spheres */}
      <div className="fixed top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,rgba(0,217,255,0.15)_0%,rgba(3,8,27,0)_70%)] pointer-events-none blur-3xl z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,rgba(40,123,255,0.15)_0%,rgba(3,8,27,0)_70%)] pointer-events-none blur-3xl z-0" />

      {/* Dynamic Keyframe Animations & High-Quality Glow Rules */}
      <style jsx global>{`
        @keyframes gemPop {
          0% {
            transform: scale(0.2) rotateY(90deg);
            opacity: 0;
          }
          65% {
            transform: scale(1.18) rotateY(0deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotateY(0deg);
            opacity: 1;
          }
        }
        @keyframes bombShake {
          0% {
            transform: scale(1) rotate(0deg);
          }
          20% {
            transform: scale(1.18) rotate(-10deg);
          }
          40% {
            transform: scale(1.18) rotate(10deg);
          }
          60% {
            transform: scale(1.08) rotate(-5deg);
          }
          80% {
            transform: scale(1.05) rotate(5deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }
        @keyframes winBannerSlide {
          0% {
            transform: translateY(-16px) scale(0.92);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes cyanGlowPulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0, 217, 255, 0.5), inset 0 0 12px rgba(0, 217, 255, 0.3);
            border-color: rgba(0, 217, 255, 0.9);
          }
          50% {
            box-shadow: 0 0 35px rgba(0, 217, 255, 0.85), inset 0 0 22px rgba(0, 217, 255, 0.5);
            border-color: #00D9FF;
          }
        }
        @keyframes buttonShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-gem-pop {
          animation: gemPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-bomb-shake {
          animation: bombShake 0.5s ease-in-out forwards;
        }
        .animate-win-banner {
          animation: winBannerSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-cyan-pulse {
          animation: cyanGlowPulse 1.8s infinite ease-in-out;
        }
        .glow-card-neon {
          box-shadow: 0 0 25px rgba(0, 217, 255, 0.25), inset 0 0 15px rgba(0, 217, 255, 0.1);
          border: 1.5px solid rgba(0, 217, 255, 0.5);
        }
        .glow-[#00D9FF] {
          box-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
        }
      `}</style>

      {/* Top Header */}
      <TopHeader balance={balance} onSearch={() => {}} />

      <div className="flex-1 flex w-full mx-auto max-w-[1700px] relative z-10 pt-[84px] lg:pl-[220px] xl:pl-60">
        {/* Sidebar */}
        <DesktopSidebar />

        {/* Main Content Arena */}
        <main className="flex-1 min-w-0 pb-16 lg:pb-6 px-2.5 sm:px-4 lg:px-5 py-3 space-y-3">
          {/* Toast notification */}
          {toastMessage && (
            <div className="fixed top-20 right-4 z-50 bg-gradient-to-r from-[#00D9FF] via-[#00E5A0] to-[#00D9FF] text-[#03081B] font-black text-xs sm:text-sm py-2.5 px-5 rounded-full shadow-[0_0_30px_rgba(0,217,255,0.8)] animate-bounce flex items-center gap-2 border border-white/60">
              <span>{toastMessage}</span>
            </div>
          )}

          {/* ─── RESPONSIVE GRID: LEFT = GAME (COMPACT NO SCROLL), RIGHT = HISTORY ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
            {/* LEFT COLUMN: GAME ARENA */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-3">
              {/* ─── 1. COMPACT TOP HEADER CARD ─────────────────────────────────────────── */}
              <div className="bg-[#071536]/95 border-2 border-[#00D9FF]/60 rounded-[22px] p-3 sm:p-4 shadow-[0_0_30px_rgba(0,217,255,0.25)] text-white relative overflow-hidden backdrop-blur-2xl">
                {/* Neon Top Accent Ambient Stripe */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#00D9FF] to-transparent shadow-[0_0_15px_#00D9FF]" />

                {/* Header Title Row */}
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <Link
                      href="/"
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0E2254] border border-[#00D9FF]/50 flex items-center justify-center text-[#00D9FF] hover:border-[#00D9FF] hover:bg-[#15347A] hover:shadow-[0_0_15px_rgba(0,217,255,0.6)] transition-all shadow-md shrink-0 cursor-pointer"
                    >
                      <i className="bi bi-arrow-left text-base stroke-[3]" />
                    </Link>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg sm:text-xl drop-shadow-[0_0_10px_rgba(255,201,40,0.6)]">💣</span>
                        <h1 className="text-base sm:text-xl font-black tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                          Mines
                        </h1>
                        {isAutoBetting && (
                          <span className="ml-2 bg-[#00D9FF]/20 border border-[#00D9FF] text-[#00D9FF] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_12px_rgba(0,217,255,0.5)]">
                            AUTOBET ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-[#7285AE] font-medium hidden xs:block">
                        Find gems. Avoid bombs. Win massive cashouts!
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowRulesModal(true)}
                    className="border border-[#00D9FF]/60 text-[#00D9FF] bg-[#0A1C46] hover:bg-[#122E70] px-3.5 py-1.5 rounded-full font-extrabold text-[11px] sm:text-xs shadow-[0_0_15px_rgba(0,217,255,0.35)] flex items-center gap-1 transition-all cursor-pointer shrink-0 hover:scale-105"
                  >
                    <i className="bi bi-book-fill text-[10px]" /> Rules
                  </button>
                </div>

                {/* Compact Stats Row: Multiplier, Status Indicator, Current Win */}
                <div className="bg-[#0A1C46]/95 border border-[#00D9FF]/40 rounded-xl p-2.5 grid grid-cols-3 gap-1.5 text-center shadow-[inset_0_0_15px_rgba(0,217,255,0.15)]">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-[#7285AE] block uppercase tracking-wider">
                      MULTIPLIER
                    </span>
                    <span className={`text-base sm:text-xl font-black font-mono transition-all duration-300 ${getMultiplierColor(multiplier)}`}>
                      {multiplier.toFixed(2)}X
                    </span>
                  </div>

                  <div className="border-x border-[#00D9FF]/20 px-1 flex flex-col justify-center items-center">
                    <span className="text-[9px] sm:text-[10px] font-bold text-[#7285AE] block uppercase tracking-wider">
                      STATUS
                    </span>
                    <div className="inline-flex items-center gap-1 bg-[#051336] border border-[#00D9FF]/40 rounded-full px-2.5 py-0.5 mt-0.5 shadow-[0_0_10px_rgba(0,217,255,0.2)]">
                      {status === 'PLAYING' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] animate-ping" />
                          <span className="text-[10px] sm:text-xs font-black font-mono text-[#00E5A0]">IN PLAY</span>
                        </>
                      ) : status === 'WON' ? (
                        <>
                          <span className="text-[10px]">🏆</span>
                          <span className="text-[10px] sm:text-xs font-black font-mono text-[#FFC928]">WINNER</span>
                        </>
                      ) : status === 'LOST' ? (
                        <>
                          <span className="text-[10px]">💥</span>
                          <span className="text-[10px] sm:text-xs font-black font-mono text-rose-400">BOOM</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-clock text-[10px] text-[#00D9FF]" />
                          <span className="text-[10px] sm:text-xs font-black font-mono text-[#00D9FF]">READY</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-[#7285AE] block uppercase tracking-wider">
                      {status === 'WON' ? 'PAYOUT' : 'CURRENT WIN'}
                    </span>
                    <span className="text-base sm:text-xl font-black font-mono text-[#00E5A0] drop-shadow-[0_0_12px_rgba(0,229,160,0.6)]">
                      ₹{(status === 'PLAYING' ? currentWin : status === 'WON' ? currentWin : 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── 2. COMPACT ANIMATED 5x5 MINES GRID ARENA ───────────────────────── */}
              <div className="bg-[#071536]/95 border-2 border-[#00D9FF]/60 rounded-[22px] p-2.5 sm:p-4 shadow-[0_0_30px_rgba(0,217,255,0.25)] text-center backdrop-blur-2xl relative overflow-hidden">
                {/* Autobet Progress Live Banner */}
                {isAutoBetting && (
                  <div className="mb-2.5 bg-[#05163D] border border-[#00D9FF]/50 rounded-xl p-2 flex items-center justify-between gap-2 text-xs font-mono shadow-[inset_0_0_15px_rgba(0,217,255,0.2)]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00D9FF] animate-ping" />
                      <span className="font-bold text-white text-[11px]">
                        Autobet: Round {autoRoundsCompleted + 1}{' '}
                        {autoBetsCount !== '∞' && `/ ${Number(autoBetsCount)}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`font-black text-[11px] ${
                          autoSessionProfit >= 0 ? 'text-[#00E5A0] drop-shadow-[0_0_6px_rgba(0,229,160,0.5)]' : 'text-rose-400'
                        }`}
                      >
                        Profit: {autoSessionProfit >= 0 ? `+₹${autoSessionProfit.toFixed(2)}` : `-₹${Math.abs(autoSessionProfit).toFixed(2)}`}
                      </span>
                      <span className="bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 px-2 py-0.5 rounded-full font-bold text-[10px]">
                        {autoBetsCount === '∞' ? '∞' : `${autoBetsRemaining} Left`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Win / Game Over Overlay Announcement Banner */}
                {status === 'WON' && !isAutoBetting && (
                  <div className="mb-2.5 bg-gradient-to-r from-[#043A30] via-[#0A5C4C] to-[#043A30] border-2 border-[#00E5A0] rounded-xl p-2.5 flex items-center justify-center gap-2 text-xs font-black text-[#00E5A0] shadow-[0_0_25px_rgba(0,229,160,0.5)] animate-win-banner">
                    <span>🎉 CASHOUT SUCCESSFUL!</span>
                    <span className="text-white font-mono bg-black/40 px-2.5 py-0.5 rounded-md border border-[#00E5A0]/60">
                      +₹{currentWin.toFixed(2)} ({multiplier.toFixed(2)}x)
                    </span>
                  </div>
                )}

                {status === 'LOST' && !isAutoBetting && (
                  <div className="mb-2.5 bg-gradient-to-r from-[#4D0819] via-[#6B0C24] to-[#4D0819] border-2 border-rose-500 rounded-xl p-2.5 flex items-center justify-center gap-2 text-xs font-black text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.5)] animate-win-banner">
                    <span>💥 BOMB EXPLODED!</span>
                    <span className="text-rose-100 font-mono bg-black/40 px-2.5 py-0.5 rounded-md border border-rose-500/60">
                      Round Forfeited
                    </span>
                  </div>
                )}

                {/* 5x5 Tiles Grid */}
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 max-w-lg mx-auto">
                  {Array.from({ length: 25 }, (_, i) => {
                    const isHitMine = i === lastHitMineIndex;
                    const isMine = minePositions.includes(i);
                    const isRevealed = revealedTiles.includes(i);
                    const isAutoSelected = autoSelectedTiles.includes(i);

                    let tileStyle = '';
                    if (isHitMine) {
                      tileStyle =
                        'bg-gradient-to-br from-[#881337] via-[#9F1239] to-[#4C0519] border-2 border-rose-500 text-rose-300 shadow-[0_0_30px_rgba(255,0,85,1)] animate-bomb-shake z-10';
                    } else if (isMine && (status === 'LOST' || status === 'WON')) {
                      tileStyle =
                        'bg-gradient-to-br from-[#380A18] to-[#1F040C] border border-rose-500/50 text-rose-400/80 opacity-90 scale-95';
                    } else if (isRevealed) {
                      tileStyle =
                        'bg-gradient-to-br from-[#043A30] via-[#0A5C4C] to-[#022C22] border-2 border-[#00E5A0] text-[#00E5A0] shadow-[0_0_30px_rgba(0,229,160,0.85)] animate-gem-pop z-10';
                    } else if (betMode === 'auto' && isAutoSelected) {
                      tileStyle =
                        'bg-[#082C4E] border-2 border-[#00D9FF] text-[#00D9FF] shadow-[0_0_22px_rgba(0,217,255,0.7)] ring-2 ring-[#00D9FF]/40 animate-cyan-pulse';
                    } else if (status === 'PLAYING' || betMode === 'auto') {
                      tileStyle =
                        'bg-gradient-to-b from-[#0E2452] to-[#0A1838] border border-[#1E438A] text-[#00D9FF] hover:border-[#00D9FF] hover:shadow-[0_0_20px_rgba(0,217,255,0.6)] active:scale-95 hover:scale-105';
                    } else {
                      tileStyle =
                        'bg-[#0A1736] border border-white/10 text-slate-600 cursor-not-allowed opacity-90';
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => (betMode === 'auto' ? handleToggleAutoTile(i) : handleRevealTile(i))}
                        disabled={betMode === 'manual' ? status !== 'PLAYING' || isRevealed : isAutoBetting}
                        className={`h-11 sm:h-13 lg:h-14 aspect-square rounded-xl sm:rounded-2xl text-xl sm:text-3xl font-black transition-all duration-200 flex items-center justify-center border shadow-md relative overflow-hidden group cursor-pointer ${tileStyle}`}
                      >
                        {isHitMine ? (
                          <span className="drop-shadow-[0_0_16px_rgba(255,0,85,1)] animate-pulse">💣</span>
                        ) : isMine && (status === 'LOST' || status === 'WON') ? (
                          <span className="drop-shadow-[0_0_10px_rgba(255,0,85,0.7)] opacity-75">💣</span>
                        ) : isRevealed ? (
                          <span className="drop-shadow-[0_0_16px_rgba(0,229,160,1)] animate-bounce duration-500">
                            💎
                          </span>
                        ) : betMode === 'auto' && isAutoSelected ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-[#00D9FF] text-base sm:text-xl font-black drop-shadow-[0_0_8px_#00D9FF]">✓</span>
                          </div>
                        ) : (
                          <span className="text-[#00D9FF] opacity-90 group-hover:opacity-100 font-mono text-base sm:text-xl font-bold drop-shadow-[0_0_8px_rgba(0,217,255,0.6)]">
                            ?
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── 3. CONTROL PANEL: SEGMENTED MODE (MANUAL / AUTO), BET AMOUNT, BOMBS ─── */}
              <div className="bg-[#071536]/95 border-2 border-[#00D9FF]/60 rounded-[22px] p-3 sm:p-4 shadow-[0_0_30px_rgba(0,217,255,0.25)] space-y-3 backdrop-blur-2xl">
                {/* Mode Selector Segmented Tab */}
                <div className="flex bg-[#0A1C46] p-1 rounded-xl border border-[#00D9FF]/30 shadow-[inset_0_0_12px_rgba(0,217,255,0.15)]">
                  <button
                    onClick={() => {
                      if (!isAutoBetting && status !== 'PLAYING') setBetMode('manual');
                    }}
                    disabled={isAutoBetting || status === 'PLAYING'}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      betMode === 'manual'
                        ? 'bg-gradient-to-r from-[#00D9FF] to-[#0099FF] text-[#03081B] shadow-[0_0_18px_rgba(0,217,255,0.6)]'
                        : 'text-[#7285AE] hover:text-white'
                    }`}
                  >
                    Manual mode
                  </button>
                  <button
                    onClick={() => {
                      if (!isAutoBetting && status !== 'PLAYING') setBetMode('auto');
                    }}
                    disabled={isAutoBetting || status === 'PLAYING'}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      betMode === 'auto'
                        ? 'bg-gradient-to-r from-[#00D9FF] to-[#0099FF] text-[#03081B] shadow-[0_0_18px_rgba(0,217,255,0.6)]'
                        : 'text-[#7285AE] hover:text-white'
                    }`}
                  >
                    Auto mode {autoSelectedTiles.length > 0 && `(${autoSelectedTiles.length} Cells)`}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Bet Amount Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#7285AE] uppercase tracking-wider block">
                      BET AMOUNT (₹)
                    </label>
                    <div className="flex items-center bg-[#0A1C46] border border-[#00D9FF]/40 rounded-xl px-2.5 py-1 focus-within:border-[#00D9FF] focus-within:ring-2 focus-within:ring-[#00D9FF]/50 transition-all shadow-[inset_0_0_10px_rgba(0,217,255,0.1)]">
                      <span className="text-xs font-mono text-[#00D9FF] mr-1.5">₹</span>
                      <input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        disabled={status === 'PLAYING' || isAutoBetting}
                        className="w-full bg-transparent text-white font-mono font-bold text-xs sm:text-sm focus:outline-none"
                      />
                      <div className="flex items-center gap-1 ml-1 shrink-0">
                        <button
                          type="button"
                          onClick={handleHalfBet}
                          disabled={status === 'PLAYING' || isAutoBetting}
                          className="px-1.5 py-0.5 rounded-lg bg-[#0E2866] text-[10px] font-bold text-[#00D9FF] border border-[#00D9FF]/30 hover:bg-[#15398C] disabled:opacity-50 cursor-pointer transition-all"
                        >
                          1/2
                        </button>
                        <button
                          type="button"
                          onClick={handleDoubleBet}
                          disabled={status === 'PLAYING' || isAutoBetting}
                          className="px-1.5 py-0.5 rounded-lg bg-[#0E2866] text-[10px] font-bold text-[#00D9FF] border border-[#00D9FF]/30 hover:bg-[#15398C] disabled:opacity-50 cursor-pointer transition-all"
                        >
                          2X
                        </button>
                        <button
                          type="button"
                          onClick={handleMaxBet}
                          disabled={status === 'PLAYING' || isAutoBetting}
                          className="px-1.5 py-0.5 rounded-lg bg-[#0E2866] text-[10px] font-bold text-[#FFC928] border border-[#FFC928]/30 hover:bg-[#15398C] disabled:opacity-50 cursor-pointer transition-all"
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bombs Count Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#7285AE] uppercase tracking-wider block">
                      BOMBS
                    </label>
                    <div className="relative">
                      <select
                        value={mineCount}
                        onChange={(e) => setMineCount(Number(e.target.value))}
                        disabled={status === 'PLAYING' || isAutoBetting}
                        className="w-full bg-[#0A1C46] border border-[#00D9FF]/40 text-white font-bold text-xs sm:text-sm rounded-xl px-3 py-2 appearance-none focus:outline-none focus:border-[#00D9FF] disabled:opacity-60 transition-all cursor-pointer shadow-[inset_0_0_10px_rgba(0,217,255,0.1)]"
                      >
                        {[1, 2, 3, 5, 10, 15, 20, 24].map((c) => (
                          <option key={c} value={c} className="bg-[#0A1C46] text-white">
                            💣 {c} Bomb{c > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#00D9FF]">
                        <i className="bi bi-chevron-down text-[10px]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Auto Mode Controls: Pattern & Bets Count */}
                {betMode === 'auto' && (
                  <div className="space-y-2 pt-1 border-t border-[#00D9FF]/20">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#7285AE]">
                      <span>GRID PATTERN SELECTION</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectRandomTiles(4)}
                          disabled={isAutoBetting}
                          className="text-[#00D9FF] hover:underline cursor-pointer disabled:opacity-40"
                        >
                          ⚡ Random 4
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={handleClearAutoTiles}
                          disabled={isAutoBetting || autoSelectedTiles.length === 0}
                          className="text-rose-400 hover:underline cursor-pointer disabled:opacity-40"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-[#7285AE] pt-1">
                      <span>NUMBER OF BETS</span>
                      <span className="text-[#00D9FF] font-mono">
                        {autoSelectedTiles.length} / 25 Cells Selected
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[10, 25, 50, 100, '∞'].map((num) => (
                        <button
                          key={String(num)}
                          type="button"
                          onClick={() => {
                            setAutoBetsCount(num as any);
                            if (typeof num === 'number') setAutoBetsRemaining(num);
                          }}
                          disabled={isAutoBetting}
                          className={`py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                            autoBetsCount === num
                              ? 'bg-[#00D9FF]/20 border-[#00D9FF] text-[#00D9FF] shadow-[0_0_15px_rgba(0,217,255,0.4)]'
                              : 'bg-[#0A1C46] border-[#00D9FF]/30 text-[#7285AE] hover:text-white'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA Action Button */}
                {betMode === 'manual' ? (
                  status === 'PLAYING' ? (
                    <button
                      onClick={handleCashout}
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FFC928] via-[#FFD700] to-[#FFA800] text-[#03081B] font-black text-sm sm:text-base tracking-wide uppercase shadow-[0_0_30px_rgba(255,201,40,0.6)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 border border-amber-300/40"
                    >
                      <span>💰 CASHOUT (₹{currentWin.toFixed(2)})</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStartGame}
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E5A0] via-[#00D9FF] to-[#00E5A0] text-[#03081B] font-black text-sm sm:text-base tracking-wide uppercase shadow-[0_0_30px_rgba(0,217,255,0.6)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#00D9FF]/50"
                    >
                      <span>▶ START MINES GAME (₹{parseFloat(betAmount || '0').toFixed(0)})</span>
                    </button>
                  )
                ) : isAutoBetting ? (
                  <button
                    onClick={handleStopAutobet}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700 text-white font-black text-sm sm:text-base tracking-wide uppercase shadow-[0_0_30px_rgba(244,63,94,0.7)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 animate-pulse border border-rose-400/50"
                  >
                    <span>
                      ⏹ STOP AUTOBET ({autoBetsCount === '∞' ? '∞' : autoBetsRemaining} Bets Left)
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartAutobet}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00D9FF] via-[#00E5A0] to-[#00D9FF] text-[#03081B] font-black text-sm sm:text-base tracking-wide uppercase shadow-[0_0_30px_rgba(0,217,255,0.6)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#00D9FF]/50"
                  >
                    <span>▶ START AUTOBET (₹{parseFloat(betAmount || '0').toFixed(0)})</span>
                  </button>
                )}
              </div>
            </div>

            {/* ─── RIGHT COLUMN: HISTORY PANEL WITH PAGINATION ───────────────────── */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="bg-[#071536]/95 border-2 border-[#00D9FF]/60 rounded-[22px] p-3.5 sm:p-4 shadow-[0_0_30px_rgba(0,217,255,0.25)] space-y-3 backdrop-blur-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-[#00D9FF]/20">
                  <div className="flex items-center gap-2">
                    <i className="bi bi-journal-text text-[#00D9FF] text-sm drop-shadow-[0_0_8px_#00D9FF]" />
                    <h3 className="text-xs sm:text-sm font-black text-white">My Playing History</h3>
                  </div>
                  <span className="bg-[#0A1C46] border border-[#00D9FF]/40 text-[#00D9FF] text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(0,217,255,0.2)]">
                    {totalRounds} Rounds
                  </span>
                </div>

                <div className="overflow-x-auto min-h-[380px] flex flex-col justify-between">
                  {totalRounds === 0 ? (
                    <p className="text-center text-xs text-[#7285AE] py-8 font-medium">No played rounds yet.</p>
                  ) : (
                    <>
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead className="text-[10px] text-[#7285AE] uppercase tracking-wider border-b border-[#00D9FF]/20">
                          <tr>
                            <th className="py-2 px-1.5">PERIOD</th>
                            <th className="py-2 px-1.5">BOMBS</th>
                            <th className="py-2 px-1.5">RESULT</th>
                            <th className="py-2 px-1.5 text-right">TIME</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[#D1DCF0]">
                          {currentPageRows.map((row, idx) => {
                            const isWon = row.status === 'WON' || (row.payout && Number(row.payout) > 0);
                            return (
                              <tr key={row.id || idx} className="hover:bg-[#0E2454]/70 transition-all">
                                <td className="py-2.5 px-1.5 font-bold text-white text-[11px]">
                                  #{row.id ? row.id.slice(0, 9).toUpperCase() : `MINES${idx}`}
                                </td>
                                <td className="py-2.5 px-1.5 text-[#7285AE] text-[11px]">
                                  💣 {row.mineCount || 3}
                                </td>
                                <td className="py-2.5 px-1.5">
                                  {isWon ? (
                                    <span className="bg-[#00E5A0]/20 text-[#00E5A0] border border-[#00E5A0]/50 px-2 py-0.5 rounded-full font-bold text-[9px] sm:text-[10px] shadow-[0_0_10px_rgba(0,229,160,0.3)]">
                                      WON ₹{Number(row.payout || 0).toFixed(2)} ({Number(row.multiplier || 1.0).toFixed(2)}x)
                                    </span>
                                  ) : (
                                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/50 px-2 py-0.5 rounded-full font-bold text-[9px] sm:text-[10px] shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                                      LOST
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-1.5 text-right text-[#7285AE] text-[10px]">
                                  {formatTime(row.createdAt || row.created_at)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Pagination Controls */}
                      <div className="mt-3 pt-2 border-t border-[#00D9FF]/20 flex items-center justify-between text-xs font-mono">
                        <span className="text-[10px] text-[#7285AE]">
                          Showing {Math.min((historyPage - 1) * historyPerPage + 1, totalRounds)}-
                          {Math.min(historyPage * historyPerPage, totalRounds)} of {totalRounds}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                            disabled={historyPage === 1}
                            className="px-2.5 py-1 rounded-lg bg-[#0A1C46] border border-[#00D9FF]/40 text-[#00D9FF] text-[11px] font-bold hover:bg-[#122E70] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                          >
                            ‹ Prev
                          </button>
                          <span className="text-[11px] font-bold text-white px-1">
                            {historyPage} / {totalPages}
                          </span>
                          <button
                            onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                            disabled={historyPage === totalPages}
                            className="px-2.5 py-1 rounded-lg bg-[#0A1C46] border border-[#00D9FF]/40 text-[#00D9FF] text-[11px] font-bold hover:bg-[#122E70] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                          >
                            Next ›
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ─── RULES MODAL ─────────────────────────────────────────────────── */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#071536] border-2 border-[#00D9FF]/60 rounded-[28px] max-w-md w-full p-5 sm:p-6 text-white space-y-4 shadow-[0_0_50px_rgba(0,217,255,0.4)] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#00D9FF]/30 pb-3">
              <h3 className="text-lg font-black text-[#00D9FF] flex items-center gap-2 drop-shadow-[0_0_10px_#00D9FF]">
                <span>📖</span> Mines Rules & How to Play
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-8 h-8 rounded-full bg-[#0A1C46] border border-[#00D9FF]/30 text-[#7285AE] hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <ul className="text-xs sm:text-sm text-[#D1DCF0] space-y-2.5 leading-relaxed list-disc pl-4">
              <li>
                <strong>Manual Mode:</strong> Select bet amount, number of bombs, start game and click grid tiles manually.
              </li>
              <li>
                <strong>Auto Mode:</strong> Pre-select your custom tile pattern on the 5x5 grid, select number of bets (10, 25, 50, 100, ∞), and click <strong>START AUTOBET</strong> to play automatically!
              </li>
              <li>
                <strong>Avoid Mines:</strong> Hitting a hidden bomb forfeits the round stake and moves to the next automatic round.
              </li>
              <li>
                <strong>Stop Anytime:</strong> Click <strong>STOP AUTOBET</strong> at any time to pause or cancel the automated betting sequence.
              </li>
            </ul>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00E5A0] to-[#00D9FF] text-[#03081B] font-black text-sm tracking-wide shadow-[0_0_20px_rgba(0,217,255,0.5)] hover:brightness-110 cursor-pointer"
            >
              GOT IT! PLAY MINES
            </button>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {validationModal?.isOpen && (
        <ValidationErrorModal
          isOpen={validationModal.isOpen}
          type={validationModal.type}
          message={validationModal.message}
          minBet={validationModal.minBet}
          maxBet={validationModal.maxBet}
          requiredAmount={validationModal.requiredAmount}
          currentBalance={validationModal.currentBalance}
          onClose={() => setValidationModal(null)}
        />
      )}
    </div>
  );
}
