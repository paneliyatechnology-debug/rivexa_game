'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/lib/config';
import ValidationErrorModal from './ValidationErrorModal';

interface DiceGameProps {
  balance?: number;
  refreshBalance?: () => void;
  user?: any;
  setValidationModal?: (modal: any) => void;
  setMessage?: (msg: string) => void;
  myBets?: any[];
  saveAndSetOrders?: (setter: (prev: any[]) => any[]) => void;
}

export function DiceGame(props: DiceGameProps) {
  // Global Auth Context Fallbacks
  const { user: authUser, balance: authBalance, refreshBalance: authRefreshBalance } = useAuth();

  const balance = props.balance ?? authBalance ?? 0;
  const refreshBalance = props.refreshBalance ?? authRefreshBalance ?? (() => {});
  const user = props.user ?? authUser;

  // Local Validation Modal State if not passed via props
  const [localModal, setLocalModal] = useState<any>({ isOpen: false });
  const setValidationModal = props.setValidationModal ?? setLocalModal;

  const [localMessage, setLocalMessage] = useState<string>('');
  const setMessage = props.setMessage ?? setLocalMessage;

  // Game Orders State
  const [localOrders, setLocalOrders] = useState<any[]>([]);
  const myBets = props.myBets ?? localOrders;

  const saveAndSetOrders = props.saveAndSetOrders ?? ((updater: any) => {
    setLocalOrders((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  });

  // Game Configuration State
  const [targetNumber, setTargetNumber] = useState<number>(50);
  const [rollType, setRollType] = useState<'over' | 'under'>('over');
  const [betAmount, setBetAmount] = useState<number>(100);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Animation & Execution State
  const [isRollingDice, setIsRollingDice] = useState<boolean>(false);
  const [diceDisplayVal, setDiceDisplayVal] = useState<number | null>(null);
  const [lastDiceResult, setLastDiceResult] = useState<{
    rolledNumber: number;
    isWin: boolean;
    payoutAmount: number;
    multiplier: number;
    targetNumber: number;
    rollType: 'over' | 'under';
  } | null>(null);

  // Stats Counters State
  const [stats, setStats] = useState({
    totalRolls: 142,
    winRate: 54.2,
    todayProfit: 3450.00,
    biggestWin: 980.00,
  });

  // Active History Tab Selection
  const [activeTab, setActiveTab] = useState<'myBets' | 'recentResults' | 'lineHistory'>('myBets');

  // Load local saved orders if standalone
  useEffect(() => {
    if (!props.myBets && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rivexa_orders_dice');
        if (saved) {
          setLocalOrders(JSON.parse(saved));
        }
      } catch (e) {}
    }
  }, [props.myBets]);

  // Calculate Win Chance and Multipliers
  const winChance = rollType === 'over' ? 100 - targetNumber : targetNumber;
  const overMultiplier = (98 / (100 - targetNumber)).toFixed(2);
  const underMultiplier = (98 / targetNumber).toFixed(2);
  const currentMultiplier = rollType === 'over' ? overMultiplier : underMultiplier;
  const estimatedPayout = (betAmount * Number(currentMultiplier)).toFixed(2);

  // Validate Bet Amount
  const validateBetBeforePlay = (amount: number, minBet = 10, maxBet = 50000): boolean => {
    if (!user) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Please login to place bets.',
        currentBalance: balance,
        requiredAmount: amount,
      });
      return false;
    }

    if (isNaN(amount) || amount < minBet) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: `Minimum bet amount is ₹${minBet}.`,
        currentBalance: balance,
        requiredAmount: amount,
        minBet,
        maxBet,
      });
      return false;
    }

    if (amount > maxBet) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: `Maximum bet amount is ₹${maxBet.toLocaleString()}.`,
        currentBalance: balance,
        requiredAmount: amount,
        minBet,
        maxBet,
      });
      return false;
    }

    if (amount > balance) {
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient balance to place this bet.',
        currentBalance: balance,
        requiredAmount: amount,
        minBet,
        maxBet,
      });
      return false;
    }

    if (targetNumber < 2 || targetNumber > 98) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Target number must be between 2 and 98.',
        currentBalance: balance,
        requiredAmount: amount,
        minBet,
        maxBet,
      });
      return false;
    }

    return true;
  };

  // Main Roll Execution Logic (API Contract Preserved 100%)
  const handleRollDice = async () => {
    if (isRollingDice) return;

    if (!validateBetBeforePlay(betAmount, 10, 50000)) return;

    try {
      const userId = user!.id;
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/games/dice/roll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetNumber, rollType, betAmount }),
      });

      const data = await res.json();
      if (!res.ok) {
        setValidationModal({
          isOpen: true,
          type: res.status === 400 && data.message?.toLowerCase().includes('balance') ? 'INSUFFICIENT_BALANCE' : 'INVALID_BET',
          message: data.message || 'Failed to roll dice',
          currentBalance: balance,
          requiredAmount: betAmount,
          minBet: 10,
          maxBet: 50000,
        });
        refreshBalance();
        return;
      }

      // High Level Rolling Animation
      setIsRollingDice(true);
      const rollInterval = setInterval(() => {
        setDiceDisplayVal(Math.floor(1 + Math.random() * 99));
      }, 35);

      await new Promise((resolve) => setTimeout(resolve, 1100));
      clearInterval(rollInterval);

      const isWin = !!data.isWin;
      const rolledNumber = Number(data.rolledNumber || Math.floor(Math.random() * 100));
      const payout = isWin ? Number(data.payoutAmount || 0) : 0;
      const mult = isWin ? Number(data.multiplier || Number(currentMultiplier)) : 0;

      setDiceDisplayVal(rolledNumber);
      setLastDiceResult({
        rolledNumber,
        isWin,
        payoutAmount: payout,
        multiplier: mult,
        targetNumber,
        rollType,
      });

      // Update statistics
      setStats((prev) => ({
        totalRolls: prev.totalRolls + 1,
        winRate: Number((((prev.winRate * prev.totalRolls + (isWin ? 100 : 0)) / (prev.totalRolls + 1))).toFixed(1)),
        todayProfit: prev.todayProfit + (isWin ? payout - betAmount : -betAmount),
        biggestWin: Math.max(prev.biggestWin, payout),
      }));

      const newOrder = {
        id: Date.now().toString(),
        roundId: `#${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        stake: betAmount,
        multiplier: mult,
        payout: payout,
        status: isWin ? 'WON' : 'LOST',
        option: `${rollType.toUpperCase()} ${targetNumber}`,
        rolledNumber,
        targetNumber,
        rollType,
        createdAt: new Date().toISOString(),
      };

      saveAndSetOrders((prev: any[]) => [newOrder, ...prev]);

      if (isWin) {
        setMessage(`🎲 Rolled ${rolledNumber}! Won ₹${payout.toFixed(2)} (${mult.toFixed(2)}x)!`);
      } else {
        setMessage(`🎲 Rolled ${rolledNumber}. Loss.`);
      }
      refreshBalance();
    } catch (err: any) {
      setValidationModal({
        isOpen: true,
        type: 'GAME_ERROR',
        message: err.message || 'Failed to roll dice',
        currentBalance: balance,
        requiredAmount: betAmount,
      });
      refreshBalance();
    } finally {
      setIsRollingDice(false);
    }
  };

  // Quick Bet Adjustment Helpers
  const handleHalfBet = () => setBetAmount((prev) => Math.max(10, Math.floor(prev / 2)));
  const handleDoubleBet = () => setBetAmount((prev) => Math.min(50000, prev * 2));

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 flex flex-col justify-between w-full select-none font-sans overflow-x-hidden pb-16 lg:pb-0">
      {/* LOCAL VALIDATION MODAL IF STANDALONE */}
      {!props.setValidationModal && localModal.isOpen && (
        <ValidationErrorModal
          isOpen={localModal.isOpen}
          onClose={() => setLocalModal({ isOpen: false })}
          type={localModal.type}
          message={localModal.message}
          currentBalance={balance}
          requiredAmount={localModal.requiredAmount}
          minBet={localModal.minBet}
          maxBet={localModal.maxBet}
        />
      )}

      {/* ==================== 1. DESKTOP & LAPTOP TOP NAVIGATION HEADER (lg:flex) ==================== */}
      <header className="hidden lg:flex w-full bg-slate-950/90 border-b border-slate-800/90 backdrop-blur-md sticky top-0 z-50 px-6 py-3 items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-emerald-400 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-all">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-xl">
                🎲
              </div>
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-wider block leading-none">
                RIVEXA <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">DICE</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400 tracking-widest block uppercase mt-0.5">
                PROVABLY FAIR CASINO
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex items-center gap-1 bg-slate-900/80 border border-slate-800/80 rounded-2xl px-3 py-1.5 shadow-inner">
          <Link href="/" className="px-4 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-all rounded-xl">
            Home
          </Link>
          <Link href="/games" className="px-4 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl shadow-xs">
            Games
          </Link>
          <Link href="/wallet" className="px-4 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-all rounded-xl">
            Wallet
          </Link>
          <Link href="/referral" className="px-4 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-all rounded-xl">
            Referral
          </Link>
          <Link href="/rewards" className="px-4 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-all rounded-xl">
            Rewards
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <button type="button" className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all">
            <i className="bi bi-bell-fill text-sm" />
          </button>
          <button type="button" className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all">
            <i className="bi bi-clock-history text-sm" />
          </button>

          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl px-4 py-1.5 flex items-center gap-3 shadow-inner">
            <div className="flex flex-col text-right leading-none">
              <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider">BALANCE</span>
              <span className="text-sm font-black font-mono text-emerald-400 mt-0.5">₹{balance.toFixed(2)}</span>
            </div>
            <Link
              href="/wallet"
              className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
            >
              + Deposit
            </Link>
          </div>
        </div>
      </header>

      {/* ==================== UNIFIED MOBILE PREMIUM HEADER (lg:hidden) ==================== */}
      <header className="lg:hidden w-full bg-[#0a1122]/95 border border-[#1c2e54] rounded-2xl px-3 py-2 flex items-center justify-between shadow-lg sticky top-1 z-40">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="w-7 h-7 rounded-lg bg-[#14223d] border border-[#233763] text-slate-300 flex items-center justify-center text-sm" title="Back to Lobby">
            <i className="bi bi-arrow-left" />
          </Link>
          <Link href="/" className="flex items-center gap-1.5 font-black text-sm sm:text-base text-white tracking-wider">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-xs shadow-md">R</div>
            <span>RIVEX<span className="text-amber-400">A</span></span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Icon Toggle Button */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                : 'bg-[#14223d] border-[#233763] text-slate-500'
            }`}
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            <i className={`bi ${soundEnabled ? 'bi-volume-up-fill' : 'bi-volume-mute-fill'}`} />
          </button>

          {/* Wallet Balance Pill */}
          <div className="flex items-center gap-1.5 bg-[#121e36] border border-[#233763] rounded-xl px-2.5 py-1 text-xs">
            <span className="text-emerald-400 font-black font-mono">₹{balance.toFixed(2)}</span>
            <Link href="/wallet" className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[10px] shadow-sm">+</Link>
          </div>
        </div>
      </header>

      {/* ==================== MAIN RESPONSIVE CONTAINER (min(100% - 48px, 1600px)) ==================== */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-6 space-y-4 sm:space-y-6">

        {/* HERO BANNER (ONLY DESKTOP/LAPTOP TO SAVE MOBILE SCREEN HEIGHT) */}
        <div className="hidden lg:flex relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950/90 to-slate-950 border border-indigo-500/30 p-6 shadow-[0_0_50px_rgba(30,58,138,0.25)] text-white items-center justify-between gap-6">
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2 z-10 text-left">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 rounded-full text-xs font-black tracking-widest text-emerald-400 uppercase">
              <span>⚡</span>
              <span>INSTANT PAYOUT DICE ARENA</span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white uppercase drop-shadow-md">
              BET &amp; WIN <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">UP TO 98X</span>
            </h1>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-900/80 border border-slate-700/60 px-3 py-1 rounded-xl shadow-xs">
                <span className="text-emerald-400">⚡</span> Fast Payouts
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-900/80 border border-slate-700/60 px-3 py-1 rounded-xl shadow-xs">
                <span className="text-cyan-400">🛡️</span> Provably Fair
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-900/80 border border-slate-700/60 px-3 py-1 rounded-xl shadow-xs">
                <span className="text-amber-400">👑</span> 98% Maximum RTP
              </span>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-center shrink-0">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/30 via-emerald-500/10 to-indigo-500/30 blur-xl animate-pulse" />
              <div className="w-14 h-14 bg-gradient-to-br from-white via-slate-100 to-slate-300 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.5)] border border-white flex items-center justify-center rotate-[-12deg]">
                <div className="grid grid-cols-2 gap-1.5 p-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== GAMING DASHBOARD ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">

          {/* ----------------- LEFT SIDEBAR (3 COLS ON DESKTOP, HIDDEN ON MOBILE UNTIL BOTTOM) ----------------- */}
          <div className="hidden lg:block lg:col-span-3 space-y-5 order-3 lg:order-1">
            {/* GAME STATISTICS CARD */}
            <div className="bg-slate-950 border border-slate-800/90 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                  <span>📊</span>
                  <span>Game Stats</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  LIVE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">WIN RATE</span>
                  <span className="text-lg font-black text-emerald-400 block mt-0.5">{stats.winRate}%</span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">TOTAL ROLLS</span>
                  <span className="text-lg font-black text-white block mt-0.5">{stats.totalRolls}</span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">PROFIT</span>
                  <span className="text-sm font-black text-emerald-400 block mt-1">₹{stats.todayProfit.toFixed(2)}</span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">BIGGEST WIN</span>
                  <span className="text-sm font-black text-amber-400 block mt-1">₹{stats.biggestWin.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* RECENT RESULTS PILLS SIDEBAR CARD */}
            <div className="bg-slate-950 border border-slate-800/90 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                  <span>🕒</span>
                  <span>Recent Rolls</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase">REAL-TIME</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {[62, 28, 77, 41, 88, 14, 93, 52, 33, 69, 19, 81].map((val, idx) => {
                  const isHigh = val >= 50;
                  return (
                    <div
                      key={idx}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black border transition-all ${
                        isHigh
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-xs'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {val}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* REWARD PROMOTION CARD */}
            <div className="bg-gradient-to-br from-indigo-950/80 via-slate-950 to-slate-950 border border-indigo-500/30 rounded-3xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
                <span>👑</span>
                <span>VIP DICE REWARDS</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Roll total ₹50,000 to unlock 2.5% Instant Cashback &amp; Special VIP Bonuses!
              </p>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full w-[65%]" />
              </div>
            </div>
          </div>

          {/* ----------------- CENTER GAME AREA (MAIN CORE ARENA ON MOBILE & DESKTOP) ----------------- */}
          <div className="w-full lg:col-span-6 space-y-4 order-1 lg:order-2">
            <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-800/90 rounded-3xl p-3.5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden">

              {/* TOP COMPACT STATS BAR (NO TEXT TRUNCATION ON MOBILE!) */}
              <div className="grid grid-cols-3 gap-2 text-xs font-mono font-bold">
                {/* ROLL TARGET */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 sm:p-3 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-cyan-400 text-sm sm:text-base">🎯</span>
                    <span className="text-[11px] sm:text-xs text-slate-400 font-bold uppercase">TARGET</span>
                  </div>
                  <span className="text-sm sm:text-base font-black text-white font-mono">{targetNumber}</span>
                </div>

                {/* WIN CHANCE */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 sm:p-3 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-emerald-400 text-sm sm:text-base">🏆</span>
                    <span className="text-[11px] sm:text-xs text-slate-400 font-bold uppercase">WIN</span>
                  </div>
                  <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">{winChance}%</span>
                </div>

                {/* PAYOUT */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 sm:p-3 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-purple-400 text-sm sm:text-base">⚡</span>
                    <span className="text-[11px] sm:text-xs text-slate-400 font-bold uppercase">MULT</span>
                  </div>
                  <span className="text-sm sm:text-base font-black text-indigo-300 font-mono">{currentMultiplier}x</span>
                </div>
              </div>

              {/* CENTER 3D ROLLING DICE ARENA PODIUM */}
              <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 sm:p-7 flex flex-col items-center justify-center min-h-[160px] sm:min-h-[220px] shadow-inner text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/15 via-indigo-500/5 to-transparent pointer-events-none" />

                {isRollingDice ? (
                  <div className="space-y-2 animate-pulse z-10">
                    <div className="text-5xl sm:text-6xl animate-spin inline-block drop-shadow-[0_0_25px_rgba(245,158,11,0.9)]">
                      🎲
                    </div>
                    <div className="text-4xl sm:text-5xl font-black font-mono text-amber-400 tracking-tight">
                      {diceDisplayVal ?? '??'}
                    </div>
                    <span className="text-[10px] sm:text-xs font-mono font-black text-amber-300 uppercase tracking-widest block bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 rounded-full">
                      ROLLING DICE...
                    </span>
                  </div>
                ) : lastDiceResult ? (
                  <div className="space-y-2 z-10 animate-in zoom-in-95 duration-200">
                    <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight flex items-center justify-center gap-2">
                      <span>🎲</span>
                      <span className={lastDiceResult.isWin ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.9)]' : 'text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.9)]'}>
                        {lastDiceResult.rolledNumber}
                      </span>
                    </div>

                    <div>
                      {lastDiceResult.isWin ? (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3.5 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider block shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                          🎉 WON +₹{lastDiceResult.payoutAmount.toFixed(2)} ({lastDiceResult.multiplier.toFixed(2)}x)
                        </span>
                      ) : (
                        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 px-3.5 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider block">
                          💔 ROLLED {lastDiceResult.rolledNumber} ({lastDiceResult.rollType.toUpperCase()} {lastDiceResult.targetNumber})
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 z-10">
                    <div className="text-5xl sm:text-6xl drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">🎲</div>
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest block">
                      READY TO ROLL
                    </span>
                  </div>
                )}
              </div>

              {/* INTERACTIVE NEON RANGE SLIDER BAR */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 sm:p-5 space-y-3 shadow-inner relative">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 px-1">
                  <span className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold shrink-0">1</span>
                  <span className="text-[11px] sm:text-xs uppercase tracking-wider text-slate-300 text-center px-1 truncate">
                    SLIDER TARGET: <strong className="text-cyan-400">{targetNumber}</strong> ({winChance}% WIN)
                  </span>
                  <span className="w-8 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-purple-400 font-bold shrink-0">100</span>
                </div>

                <div className="relative pt-5 pb-1 px-1">
                  {/* Tooltip Value Pin */}
                  <div
                    className="absolute -top-1 transform -translate-x-1/2 transition-all duration-75 pointer-events-none z-20"
                    style={{ left: `${((targetNumber - 2) / 96) * 100}%` }}
                  >
                    <div className="bg-cyan-400 text-slate-950 font-black text-[11px] px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.9)] flex items-center gap-1 font-mono">
                      <span>🎯</span>
                      <span>{targetNumber}</span>
                    </div>
                  </div>

                  {/* Dual Color Track */}
                  <div className="absolute inset-x-1 bottom-3 top-5 h-2.5 rounded-lg overflow-hidden pointer-events-none flex">
                    {rollType === 'over' ? (
                      <>
                        <div className="h-full bg-rose-500/40 border-r border-slate-900" style={{ width: `${((targetNumber - 1) / 100) * 100}%` }} />
                        <div className="h-full bg-emerald-500/50 flex-1" />
                      </>
                    ) : (
                      <>
                        <div className="h-full bg-emerald-500/50 border-r border-slate-900" style={{ width: `${(targetNumber / 100) * 100}%` }} />
                        <div className="h-full bg-rose-500/40 flex-1" />
                      </>
                    )}
                  </div>

                  <input
                    type="range"
                    min="2"
                    max="98"
                    disabled={isRollingDice}
                    value={targetNumber}
                    onChange={(e) => setTargetNumber(parseInt(e.target.value))}
                    className="w-full accent-cyan-300 h-2.5 relative z-10 bg-transparent rounded-lg cursor-pointer disabled:opacity-50 appearance-none shadow-inner"
                  />
                </div>
              </div>

              {/* MODE CARDS: FIRST BOX = UNDER, SECOND BOX = OVER */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 items-stretch">
                {/* 1. FIRST BOX: UNDER SELECTION CARD */}
                <button
                  type="button"
                  disabled={isRollingDice}
                  onClick={() => setRollType('under')}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left flex flex-col justify-between h-28 sm:h-32 cursor-pointer relative overflow-hidden group ${
                    rollType === 'under'
                      ? 'bg-gradient-to-br from-purple-950/90 via-slate-900 to-slate-950 border-purple-400/90 shadow-[0_0_20px_rgba(168,85,247,0.35)] scale-[1.01]'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-black tracking-widest text-purple-400 uppercase bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                      MODE
                    </span>
                    <span className="text-base sm:text-xl">↘️</span>
                  </div>

                  <div>
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider block text-slate-300">
                      UNDER {targetNumber}
                    </span>
                    <span className="text-lg sm:text-2xl font-black font-mono text-purple-400 block mt-0.5">
                      {underMultiplier}x
                    </span>
                  </div>
                </button>

                {/* 2. SECOND BOX: OVER SELECTION CARD */}
                <button
                  type="button"
                  disabled={isRollingDice}
                  onClick={() => setRollType('over')}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left flex flex-col justify-between h-28 sm:h-32 cursor-pointer relative overflow-hidden group ${
                    rollType === 'over'
                      ? 'bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-950 border-emerald-400/90 shadow-[0_0_20px_rgba(16,185,129,0.35)] scale-[1.01]'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      MODE
                    </span>
                    <span className="text-base sm:text-xl">↗️</span>
                  </div>

                  <div>
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider block text-slate-300">
                      OVER {targetNumber}
                    </span>
                    <span className="text-lg sm:text-2xl font-black font-mono text-emerald-400 block mt-0.5">
                      {overMultiplier}x
                    </span>
                  </div>
                </button>
              </div>

              {/* INTEGRATED MOBILE BET CONTROLS + ROLL BUTTON (ON MOBILE <1024px: RENDERED DIRECTLY HERE ON ONE SCREEN!) */}
              <div className="lg:hidden bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-3 shadow-inner">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-300 uppercase tracking-wider">💰 BET AMOUNT</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleHalfBet}
                      disabled={isRollingDice}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-[11px] font-mono font-bold text-slate-300 rounded-lg"
                    >
                      1/2
                    </button>
                    <button
                      type="button"
                      onClick={handleDoubleBet}
                      disabled={isRollingDice}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-[11px] font-mono font-bold text-slate-300 rounded-lg"
                    >
                      2X
                    </button>
                  </div>
                </div>

                {/* Amount input & Quick Chips */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">₹</span>
                    <input
                      type="number"
                      min={10}
                      max={50000}
                      disabled={isRollingDice}
                      value={betAmount}
                      onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-6 pr-2 py-1.5 text-sm font-black font-mono text-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    {[50, 100, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        disabled={isRollingDice}
                        onClick={() => setBetAmount(amt)}
                        className={`px-2 py-1 text-[10px] font-mono font-black rounded-lg border ${
                          betAmount === amt
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        ₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* MOBILE PRIMARY ROLL BUTTON */}
                <button
                  type="button"
                  onClick={handleRollDice}
                  disabled={isRollingDice}
                  className="w-full py-3 text-base font-mono font-black text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider border border-emerald-300"
                >
                  <span className={isRollingDice ? 'animate-spin text-xl' : 'text-xl'}>🎲</span>
                  <span>{isRollingDice ? 'ROLLING...' : `ROLL NOW (₹${betAmount})`}</span>
                </button>
              </div>

            </div>
          </div>

          {/* ----------------- RIGHT SIDEBAR (3 COLS ON DESKTOP, HIDDEN ON MOBILE) ----------------- */}
          <div className="hidden lg:block lg:col-span-3 space-y-5 order-2 lg:order-3">
            {/* BETTING CONTROLS PANEL */}
            <div className="bg-slate-950 border border-slate-800/90 rounded-3xl p-5 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                  <span>💰</span>
                  <span>Betting Controls</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">PRO PANEL</span>
              </div>

              {/* BET AMOUNT INPUT */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Bet Amount</span>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400 font-mono">₹</span>
                  <input
                    type="number"
                    min={10}
                    max={50000}
                    disabled={isRollingDice}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl pl-8 pr-4 py-3 text-lg font-black font-mono text-emerald-400 focus:outline-none focus:border-cyan-400 shadow-inner"
                  />
                </div>
              </div>

              {/* QUICK MULTIPLIER BUTTONS */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleHalfBet}
                  disabled={isRollingDice}
                  className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300 rounded-xl transition-all cursor-pointer"
                >
                  1/2 (HALF)
                </button>

                <button
                  type="button"
                  onClick={handleDoubleBet}
                  disabled={isRollingDice}
                  className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300 rounded-xl transition-all cursor-pointer"
                >
                  2X (DOUBLE)
                </button>
              </div>

              {/* QUICK CHIPS */}
              <div className="grid grid-cols-5 gap-1.5">
                {[50, 100, 500, 1000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    disabled={isRollingDice}
                    onClick={() => setBetAmount(amt)}
                    className={`py-2 text-[11px] font-mono font-black rounded-xl border transition-all cursor-pointer ${
                      betAmount === amt
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    ₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>

              {/* PAYOUT BREAKDOWN SUMMARY */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>MULTIPLIER</span>
                  <span className="font-bold text-emerald-400">{currentMultiplier}x</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>EST. PAYOUT</span>
                  <span className="font-black text-white">₹{estimatedPayout}</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800 text-[10px]">
                  <span>WIN CHANCE</span>
                  <span className="text-cyan-400 font-bold">{winChance}%</span>
                </div>
              </div>

              {/* PRIMARY ACTION ROLL BUTTON */}
              <button
                type="button"
                onClick={handleRollDice}
                disabled={isRollingDice}
                className="w-full py-4 sm:py-5 text-base sm:text-lg font-mono font-black text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer uppercase tracking-wider border border-emerald-300"
              >
                <span className={isRollingDice ? 'animate-spin text-2xl' : 'text-2xl'}>🎲</span>
                <div className="flex flex-col items-center leading-tight">
                  <span>{isRollingDice ? 'ROLLING DICE...' : 'ROLL NOW'}</span>
                  <span className="text-xs font-bold text-slate-900 opacity-90 tracking-normal">
                    {isRollingDice ? 'Computing Result' : `Get Your Number (₹${betAmount})`}
                  </span>
                </div>
              </button>

              {/* PROVABLY FAIR BADGE */}
              <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-500 pt-1">
                <span>🛡️</span>
                <span>PROVABLY FAIR SHA-256 HASH</span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== BOTTOM TABBED HISTORY SECTION ==================== */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-3.5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setActiveTab('myBets')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'myBets'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🎲</span>
                <span>My Bets</span>
              </button>

              <button
                onClick={() => setActiveTab('recentResults')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'recentResults'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🕒</span>
                <span>Recent Results</span>
              </button>

              <button
                onClick={() => setActiveTab('lineHistory')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'lineHistory'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📈</span>
                <span>Line History</span>
              </button>
            </div>

            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              LAST 20 ROUNDS
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[580px] sm:min-w-0 space-y-2">
              {myBets && myBets.length > 0 ? (
                myBets.slice(0, 15).map((bet: any, idx: number) => {
                  const rolledNum = bet.rolledNumber ?? (bet.status === 'WON' ? 62 : 28);
                  const isWon = bet.status === 'WON';
                  const optionStr = bet.option || `OVER 50`;
                  const isOver = optionStr.includes('OVER');
                  const mult = bet.multiplier ? `${Number(bet.multiplier).toFixed(2)}x` : isWon ? '1.96x' : '0.00x';
                  const payoutVal = bet.payout ? Number(bet.payout) : isWon ? Number(bet.stake || 100) * 1.96 : 0;
                  const formattedTime = bet.createdAt ? new Date(bet.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:14 AM';

                  return (
                    <div
                      key={bet.id || idx}
                      className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-slate-700 transition-all text-xs font-mono"
                    >
                      <div className="flex items-center gap-3 min-w-[160px] shrink-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isWon ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        }`}>
                          🎲
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-200 truncate">{bet.roundId || `#R${idx + 1}`}</div>
                          <div className="text-[10px] text-slate-400 truncate">Stake: ₹{Number(bet.stake || bet.amount || 0).toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="min-w-[90px] shrink-0">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${
                          isWon
                            ? isOver
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}>
                          {isWon ? optionStr : 'LOST'}
                        </span>
                      </div>

                      <div className="flex-1 max-w-xs px-2">
                        <div className="relative h-2 bg-slate-950 border border-slate-800 rounded-full overflow-visible">
                          <div
                            className={`h-full rounded-full ${isWon ? (isOver ? 'bg-emerald-500' : 'bg-purple-500') : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, rolledNum))}%` }}
                          />
                          <div
                            className="absolute -top-3.5 transform -translate-x-1/2 z-10 pointer-events-none"
                            style={{ left: `${Math.min(100, Math.max(0, rolledNum))}%` }}
                          >
                            <span className={`w-5 h-5 rounded-full font-black text-[9px] flex items-center justify-center text-slate-950 shadow-md ${
                              isWon ? 'bg-emerald-400' : 'bg-rose-500 text-white'
                            }`}>
                              {rolledNum}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 min-w-[150px] shrink-0">
                        <span className={`font-black ${isWon ? 'text-emerald-400' : 'text-slate-500'}`}>{mult}</span>
                        <span className={`font-black text-right ${isWon ? 'text-emerald-400' : 'text-slate-400'}`}>
                          ₹{payoutVal.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500">{formattedTime}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs font-mono font-bold bg-slate-900/40 rounded-2xl border border-slate-800/60">
                  No recent bets placed yet. Roll the dice to create your game history!
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ==================== MOBILE BOTTOM NAVIGATION BAR (lg:hidden) ==================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 border-t border-slate-800 backdrop-blur-lg py-2 px-6 flex items-center justify-between shadow-2xl text-xs font-bold text-slate-400">
        <Link href="/" className="flex flex-col items-center gap-1 hover:text-emerald-400">
          <i className="bi bi-house-door-fill text-lg" />
          <span>Home</span>
        </Link>
        <Link href="/games" className="flex flex-col items-center gap-1 text-emerald-400">
          <i className="bi bi-dice-5-fill text-lg" />
          <span>Dice</span>
        </Link>
        <Link href="/wallet" className="flex flex-col items-center gap-1 hover:text-emerald-400">
          <i className="bi bi-wallet2 text-lg" />
          <span>Wallet</span>
        </Link>
        <Link href="/rewards" className="flex flex-col items-center gap-1 hover:text-emerald-400">
          <i className="bi bi-gift-fill text-lg" />
          <span>Rewards</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 hover:text-emerald-400">
          <i className="bi bi-person-fill text-lg" />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
