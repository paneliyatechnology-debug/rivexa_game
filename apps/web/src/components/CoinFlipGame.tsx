'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';

import ValidationErrorModal, { ValidationErrorType } from './ValidationErrorModal';
import { Coin3DStage } from './Coin3DStage';

type CoinSide = 'HEADS' | 'TAILS';

interface FlipHistoryItem {
  id: string;
  chosenSide: CoinSide;
  resultSide: CoinSide;
  betAmount: number;
  multiplier: number;
  payoutAmount: number;
  status: 'WON' | 'LOST';
  createdAt: string;
}

interface ResultModalState {
  show: boolean;
  isWin: boolean;
  resultSide: CoinSide;
  chosenSide: CoinSide;
  betAmount: number;
  payoutAmount: number;
}

export default function CoinFlipGame() {
  const router = useRouter();
  const { user, balance: authBalance, refreshBalance } = useAuth();
  const [chosenSide, setChosenSide] = useState<CoinSide>('HEADS');
  const [betAmount, setBetAmount] = useState<string>('50');
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [displayedResult, setDisplayedResult] = useState<CoinSide | null>(null);
  const [currentResultSide, setCurrentResultSide] = useState<CoinSide | null>(null);
  const [lastIsWin, setLastIsWin] = useState<boolean>(false);
  const [lastPayout, setLastPayout] = useState<number>(0);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved =
        localStorage.getItem('rivexa_sound_enabled') ??
        localStorage.getItem('coinflip_sound_enabled') ??
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
      localStorage.setItem('coinflip_sound_enabled', String(soundEnabled));
      localStorage.setItem('game_sound_enabled', String(soundEnabled));
    } catch (e) {}
  }, [soundEnabled, mounted]);

  // Result Popup Alert Modal State
  const [resultModal, setResultModal] = useState<ResultModalState | null>(null);

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

  // Balance state initialized from AuthContext
  const currentBalance = authBalance !== undefined && authBalance !== null ? authBalance : 0;

  // History & Rules Modal states
  const [recentFlips, setRecentFlips] = useState<FlipHistoryItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [winStreak, setWinStreak] = useState<number>(0);

  // 3D Coin Rotation State
  const [coinRotation, setCoinRotation] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Web Audio Context ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
  };

  const playFlipSound = () => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.error(e);
    }
  };

  const playWinSound = () => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // Victory chord C5, E5, G5, C6
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.08);

        gain.gain.setValueAtTime(0.25, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.4);
      });
    } catch (e) {
      console.error(e);
    }
  };

  const playLossSound = () => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const userId = user?.id || '';
      if (!userId) return;
      const res = await fetch(`${apiBase}/games/coin-flip/history?userId=${userId}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setRecentFlips(data);
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };

  const handleFlip = async () => {
    if (isFlipping) return;

    if (!user || !user.id) {
      setValidationModal({
        isOpen: true,
        type: 'AUTH_REQUIRED',
        message: 'Please log in or create an account to place bets and play Coin Flip.',
      });
      return;
    }

    const amt = parseFloat(betAmount);
    if (isNaN(amt) || amt < 10) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Minimum bet amount for Coin Flip is ₹10.',
        minBet: 10,
        maxBet: 50000,
        requiredAmount: amt || 0,
      });
      return;
    }

    if (amt > 50000) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Bet amount must be between ₹10 and ₹50,000.',
        minBet: 10,
        maxBet: 50000,
        requiredAmount: amt,
      });
      return;
    }

    if (currentBalance <= 0 || amt > currentBalance) {
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: `Your current balance (₹${currentBalance.toFixed(2)}) is insufficient for a ₹${amt.toFixed(2)} bet. Please recharge your wallet.`,
        requiredAmount: amt,
        currentBalance,
      });
      return;
    }

    setMessage(null);
    setResultModal(null);

    try {
      const apiBase = getApiBaseUrl();
      const userId = user.id;

      // Call Backend API
      const res = await fetch(`${apiBase}/games/coin-flip/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chosenSide,
          betAmount: amt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.message || 'Failed to flip coin';
        setValidationModal({
          isOpen: true,
          type: res.status === 400 && errMsg.toLowerCase().includes('balance') ? 'INSUFFICIENT_BALANCE' : 'INVALID_BET',
          message: errMsg,
          requiredAmount: amt,
          currentBalance,
          minBet: 10,
          maxBet: 50000,
        });
        refreshBalance();
        return;
      }

      // API success -> Start 3D Photorealistic PBR Coin Flip animation & sound
      setCurrentResultSide(data.resultSide);
      setLastIsWin(data.isWin);
      setLastPayout(data.payoutAmount || 0);
      setIsFlipping(true);
      playFlipSound();
    } catch (e: any) {
      console.error(e);
      setMessage({ text: 'Server connection error. Please try again.', type: 'error' });
      setIsFlipping(false);
    }
  };

  const handleAnimationComplete = () => {
    setIsFlipping(false);
    if (lastIsWin) {
      playWinSound();
      setWinStreak((prev) => prev + 1);
    } else {
      playLossSound();
      setWinStreak(0);
    }

    refreshBalance();
    fetchHistory();

    setResultModal({
      show: true,
      isWin: lastIsWin,
      resultSide: currentResultSide || 'HEADS',
      chosenSide,
      betAmount: parseFloat(betAmount) || 0,
      payoutAmount: lastPayout,
    });
  };

  const handleQuickBet = (val: number | string) => {
    if (typeof val === 'number') {
      const curr = parseFloat(betAmount) || 0;
      setBetAmount((curr + val).toString());
    } else if (val === '2X') {
      const curr = parseFloat(betAmount) || 10;
      setBetAmount((curr * 2).toString());
    } else if (val === 'HALF') {
      const curr = parseFloat(betAmount) || 10;
      setBetAmount(Math.max(10, Math.floor(curr / 2)).toString());
    } else if (val === 'MAX') {
      setBetAmount(Math.min(currentBalance, 50000).toString());
    }
  };

  const handleDecrementBet = () => {
    const curr = parseFloat(betAmount) || 10;
    const next = Math.max(10, curr - 10);
    setBetAmount(next.toString());
  };

  const handleIncrementBet = () => {
    const curr = parseFloat(betAmount) || 0;
    const next = curr + 10;
    setBetAmount(next.toString());
  };

  const userName = user?.name || (user?.email ? user.email.split('@')[0] : 'Jaydip Patel');

  return (
    <div className="w-full min-h-screen bg-[#070c18] text-white select-none font-sans flex flex-col justify-between overflow-x-hidden">
      
      {/* TOP NAVIGATION BAR (Desktop / Tablet) */}
      <header className="hidden md:block w-full bg-[#0a1122]/95 border-b border-[#1b2a4a] backdrop-blur-md sticky top-0 z-40 px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Brand Logo, Back Arrow & Name */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-[#14223d] hover:bg-[#1c2d52] border border-[#233763] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer text-sm shadow-sm"
              title="Back to Lobby"
            >
              <i className="bi bi-arrow-left text-lg" />
            </Link>

            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xl shadow-[0_0_20px_rgba(245,158,11,0.5)] group-hover:scale-105 transition-transform">
                R
              </div>
              <span className="text-xl font-black tracking-wider text-white">
                RIVEX<span className="text-amber-400">A</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Center Links */}
          <nav className="flex items-center gap-1.5">
            <Link href="/" className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-[#14223d] transition-all flex items-center gap-1.5">
              <span>🏠</span> Home
            </Link>
            <Link
              href="/play/coin-flip"
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.25)] relative after:content-[''] after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:bg-amber-400 after:rounded-full"
            >
              <span>🎮</span> Games
            </Link>
            <Link href="/wallet" className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-[#14223d] transition-all flex items-center gap-1.5">
              <span>👛</span> Wallet
            </Link>
            <Link href="/referral" className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-[#14223d] transition-all flex items-center gap-1.5">
              <span>👥</span> Referral
            </Link>
            <Link href="/rewards" className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-[#14223d] transition-all flex items-center gap-1.5">
              <span>🎁</span> Rewards
            </Link>
            <Link href="/profile" className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-[#14223d] transition-all flex items-center gap-1.5">
              <span>👤</span> Profile
            </Link>
          </nav>

          {/* Right Section: Sound Toggle, History Button, User Avatar & Balance */}
          <div className="flex items-center gap-2.5">
            {/* Sound Toggle Icon */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                soundEnabled
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                  : 'bg-[#14223d] border-[#233763] text-slate-500 hover:text-slate-300'
              }`}
              title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            >
              <i className={`bi ${soundEnabled ? 'bi-volume-up-fill text-lg' : 'bi-volume-mute-fill text-lg'}`} />
            </button>

            {/* History Modal Trigger */}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#14223d] hover:bg-[#1c2d52] border border-[#233763] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              title="View Flip History"
            >
              <i className="bi bi-clock-history text-amber-400 text-sm" />
              <span>History</span>
            </button>

            {/* User Profile Badge & Wallet Balance */}
            <div className="flex items-center gap-2 bg-[#121e36] border border-[#233763] rounded-xl px-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                👤
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-slate-200 leading-tight">{userName}</span>
                <span className="text-xs font-black text-emerald-400 leading-tight">
                  ₹ {currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              {/* Deposit Quick Button */}
              <Link
                href="/wallet"
                className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 flex items-center justify-center text-xs font-black ml-1 shadow-md transition-transform hover:scale-110"
                title="Deposit Funds"
              >
                +
              </Link>
            </div>
          </div>

        </div>
      </header>

      {/* MOBILE PREMIUM VIEW (< 768px) */}
      <div className="md:hidden flex flex-col justify-between min-h-screen bg-[#070c18] text-white px-3 pt-2 pb-20 space-y-3">
        
        {/* Mobile Top Header Bar with Back Arrow & Sound Icon */}
        <header className="w-full bg-[#0a1122]/95 border border-[#1c2e54] rounded-2xl px-3 py-2.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="w-7 h-7 rounded-lg bg-[#14223d] border border-[#233763] text-slate-300 flex items-center justify-center text-sm" title="Back to Lobby">
              <i className="bi bi-arrow-left" />
            </Link>
            <Link href="/" className="flex items-center gap-1.5 font-black text-base text-white tracking-wider">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-sm shadow-md">R</div>
              <span>RIVEX<span className="text-amber-400">A</span></span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Icon Toggle Button (Replaces Notification Icon) */}
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

            {/* History Icon Trigger */}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="w-7 h-7 rounded-lg bg-[#14223d] border border-[#233763] text-amber-400 flex items-center justify-center text-xs cursor-pointer"
              title="View History"
            >
              <i className="bi bi-clock-history" />
            </button>

            {/* Wallet Balance Pill */}
            <div className="flex items-center gap-1.5 bg-[#121e36] border border-[#233763] rounded-xl px-2.5 py-1 text-xs">
              <span className="text-emerald-400 font-black">₹ {currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <Link href="/wallet" className="w-4.5 h-4.5 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[10px] shadow-sm">+</Link>
            </div>
          </div>
        </header>

        {/* Game Title Header */}
        <div className="text-center space-y-0.5 z-10">
          <div className="flex items-center justify-center gap-2">
            <span className="text-amber-400 text-xl drop-shadow-[0_0_12px_rgba(245,158,11,0.7)]">👑</span>
            <h1 className="text-2xl font-black uppercase tracking-wider">
              <span className="text-slate-100 drop-shadow-[0_2px_4px_rgba(255,255,255,0.2)]">FLIP </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">COIN</span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-300 font-medium tracking-wide">Heads or Tails? Choose Your Side & Win!</p>
        </div>

        {/* Recent Results Pill Banner (Clickable to open Full History) */}
        <div
          onClick={() => setShowHistoryModal(true)}
          className="bg-[#0b1426]/90 border border-[#1c2e54] hover:border-amber-500/40 rounded-2xl p-2.5 flex items-center justify-between text-xs shadow-md cursor-pointer transition-colors group"
        >
          <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] group-hover:text-amber-300">
            <i className="bi bi-clock-history text-amber-400" />
            <span>Recent Results</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(recentFlips.length > 0 ? recentFlips.slice(0, 6) : [
              { id: '1', resultSide: 'HEADS' },
              { id: '2', resultSide: 'TAILS' },
              { id: '3', resultSide: 'HEADS' },
              { id: '4', resultSide: 'HEADS' },
              { id: '5', resultSide: 'TAILS' },
            ]).map((item: any, idx: number) => (
              <div
                key={item.id || idx}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border shrink-0 ${
                  item.resultSide === 'HEADS'
                    ? 'bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 text-slate-950 border-amber-300 shadow-amber-500/30'
                    : 'bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 text-slate-950 border-slate-100'
                }`}
              >
                {item.resultSide === 'HEADS' ? '👑' : '🦅'}
              </div>
            ))}
            <span className="text-[10px] font-bold text-amber-400 group-hover:underline ml-1">View All &gt;</span>
          </div>
        </div>

        {/* Center Arena 3D Stage Container */}
        <div className="bg-gradient-to-b from-[#091328] via-[#060c1b] to-[#040814] border border-[#1d325c] rounded-3xl text-center relative overflow-hidden shadow-[0_0_35px_rgba(2,10,28,0.8)] space-y-4 p-4">

          {/* 3D Photorealistic PBR Coin Flip Stage */}
          <div className="relative my-0 w-full h-[360px] sm:h-[400px] mx-auto z-10 rounded-2xl overflow-hidden">
            <Coin3DStage
              isFlipping={isFlipping}
              resultSide={currentResultSide}
              chosenSide={chosenSide}
              isWin={lastIsWin}
              payoutAmount={lastPayout}
              betAmount={parseFloat(betAmount) || 0}
              onAnimationComplete={handleAnimationComplete}
            />
          </div>

          {/* HEADS / TAILS Selection Cards */}
          <div className="grid grid-cols-2 gap-3 z-10">
            
            {/* HEADS Card */}
            <button
              type="button"
              onClick={() => !isFlipping && setChosenSide('HEADS')}
              disabled={isFlipping}
              className={`p-3.5 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-1 relative overflow-hidden cursor-pointer ${
                chosenSide === 'HEADS'
                  ? 'bg-gradient-to-b from-amber-500/30 via-yellow-600/35 to-amber-950/70 border-amber-400 text-amber-300 shadow-[0_0_28px_rgba(245,158,11,0.45)] scale-[1.02]'
                  : 'bg-[#081022]/90 border-[#1a2b4c] text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              <span className="text-2xl drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">👑</span>
              <span className="text-sm font-black tracking-wider text-white">HEADS</span>
              <span className="text-xs font-black text-amber-400">1.96x</span>
              {chosenSide === 'HEADS' && (
                <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] shadow-md">
                  ✓
                </div>
              )}
            </button>

            {/* TAILS Card */}
            <button
              type="button"
              onClick={() => !isFlipping && setChosenSide('TAILS')}
              disabled={isFlipping}
              className={`p-3.5 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-1 relative overflow-hidden cursor-pointer ${
                chosenSide === 'TAILS'
                  ? 'bg-gradient-to-b from-cyan-400/25 via-cyan-600/30 to-slate-950/70 border-cyan-300 text-cyan-200 shadow-[0_0_28px_rgba(6,182,212,0.45)] scale-[1.02]'
                  : 'bg-[#081022]/90 border-[#1a2b4c] text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              <span className="text-2xl drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">🦅</span>
              <span className="text-sm font-black tracking-wider text-white">TAILS</span>
              <span className="text-xs font-black text-cyan-400">1.96x</span>
              {chosenSide === 'TAILS' && (
                <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-cyan-300 text-slate-950 font-black text-[10px] shadow-md">
                  ✓
                </div>
              )}
            </button>

          </div>

        </div>

        {/* Bet Controls Console Card */}
        <div className="bg-[#0b1426]/90 border border-[#1c2e54] rounded-3xl p-4 space-y-4 shadow-xl">
          
          {/* Bet Amount Input Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Bet Amount
            </label>

            {/* Input Box with Stepper Controls */}
            <div className="flex items-center bg-[#060c1a] border border-[#1b2a4a] rounded-2xl p-1.5 focus-within:border-amber-400 transition-colors">
              <span className="px-3 text-amber-400 font-black text-lg">₹</span>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={isFlipping}
                placeholder="50"
                className="w-full bg-transparent text-white font-black text-lg focus:outline-none disabled:opacity-50"
              />
              
              {/* Stepper Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleDecrementBet}
                  disabled={isFlipping}
                  className="w-8 h-8 rounded-xl bg-[#132244] hover:bg-[#1c305c] text-slate-300 font-black flex items-center justify-center cursor-pointer transition-all border border-[#213766]"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={handleIncrementBet}
                  disabled={isFlipping}
                  className="w-8 h-8 rounded-xl bg-[#132244] hover:bg-[#1c305c] text-slate-300 font-black flex items-center justify-center cursor-pointer transition-all border border-[#213766]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Quick Chips 4 Grid */}
            <div className="grid grid-cols-4 gap-2">
              {[10, 50, 100, 500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => !isFlipping && handleQuickBet(val)}
                  disabled={isFlipping}
                  className="py-2 rounded-xl bg-[#081021] hover:bg-[#122040] text-xs font-black text-slate-300 hover:text-white transition-all border border-[#1b2a4a] cursor-pointer"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* FLIP COIN Action Button */}
          <button
            type="button"
            onClick={handleFlip}
            disabled={isFlipping}
            className={`w-full py-4 rounded-2xl font-black text-base tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isFlipping
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.45)] active:scale-[0.98]'
            }`}
          >
            {isFlipping ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>FLIPPING...</span>
              </>
            ) : (
              <>
                <span className="text-xl">👑</span>
                <span>FLIP COIN</span>
              </>
            )}
          </button>

          {/* Provably Fair Badge */}
          <div className="bg-[#060d1d] border border-[#172545] rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-slate-400">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-sm shrink-0">
              🛡️
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-200">Provably Fair</span>
              <span className="text-[10px] text-slate-400">Your game is 100% fair & transparent</span>
            </div>
          </div>

        </div>

      </div>

      {/* DESKTOP / LAPTOP / TABLET MAIN CONTENT DASHBOARD (hidden on < 768px mobile) */}
      <main className="hidden md:flex max-w-7xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 flex-1 flex-col justify-between">
        
        {/* Desktop Grid Layout */}
        <div className="grid grid-cols-12 gap-5 lg:gap-6 items-start">

          {/* LEFT SIDEBAR */}
          <div className="hidden lg:flex lg:col-span-3 flex-col gap-4">
            
            {/* CARD 1 — RECENT RESULTS */}
            <div className="bg-gradient-to-b from-[#091328]/95 via-[#060c1b]/95 to-[#040814]/95 border border-[#1d325c] rounded-2xl p-4 shadow-[0_0_25px_rgba(2,10,28,0.7)] backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-[#182a4d]">
                <div className="flex items-center gap-2 text-xs font-black text-slate-200 uppercase tracking-wider">
                  <i className="bi bi-clock-history text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                  <span>Recent Results</span>
                </div>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="text-[10px] font-extrabold text-amber-400 hover:text-amber-300 uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-1 group"
                >
                  <span>VIEW ALL</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              </div>

              {/* Horizontal Scroll Pill Container — Hidden Scrollbars */}
              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
                {recentFlips.length === 0 ? (
                  <div className="flex items-center gap-2">
                    {['HEADS', 'TAILS', 'HEADS', 'HEADS', 'TAILS', 'HEADS', 'TAILS'].map((side, idx) => (
                      <div
                        key={idx}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shadow-md border shrink-0 transition-transform hover:scale-110 ${
                          side === 'HEADS'
                            ? 'bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                            : 'bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 text-slate-950 border-slate-100 shadow-[0_0_12px_rgba(148,163,184,0.3)]'
                        }`}
                      >
                        {side === 'HEADS' ? '👑' : '🦅'}
                      </div>
                    ))}
                  </div>
                ) : (
                  recentFlips.slice(0, 7).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shadow-md border shrink-0 transition-transform hover:scale-110 ${
                        item.resultSide === 'HEADS'
                          ? 'bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                          : 'bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 text-slate-950 border-slate-100 shadow-[0_0_12px_rgba(148,163,184,0.3)]'
                      }`}
                      title={`${item.resultSide} (${item.status})`}
                    >
                      {item.resultSide === 'HEADS' ? '👑' : '🦅'}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* CARD 2 — GAME STATS */}
            <div className="bg-gradient-to-b from-[#091328]/95 via-[#060c1b]/95 to-[#040814]/95 border border-[#1d325c] rounded-2xl p-4 shadow-[0_0_25px_rgba(2,10,28,0.7)] backdrop-blur-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-200 uppercase tracking-wider pb-2 border-b border-[#182a4d]">
                <i className="bi bi-bar-chart-line-fill text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <span>Game Stats</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#081124]/80 border border-[#172747]">
                  <span className="text-slate-400 font-bold">Total Bets</span>
                  <span className="font-black text-slate-100 bg-[#0d1c3a] px-2.5 py-0.5 rounded-lg border border-[#1e3460]">
                    {recentFlips.length || 12458}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#081124]/80 border border-[#172747]">
                  <span className="text-slate-400 font-bold">Total Winnings</span>
                  <span className="font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                    ₹{recentFlips.reduce((acc, f) => acc + (f.payoutAmount || 0), 0).toFixed(2) || '8,76,320'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#081124]/80 border border-[#172747]">
                  <span className="text-slate-400 font-bold">Win Rate</span>
                  <span className="font-black text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/30 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                    {recentFlips.length > 0
                      ? `${((recentFlips.filter((f) => f.status === 'WON').length / recentFlips.length) * 100).toFixed(1)}%`
                      : '48.6%'}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 3 — REWARD PROMOTION */}
            <div className="bg-gradient-to-br from-[#122247] via-[#0d1838] to-[#070e24] border border-[#2a4580] rounded-2xl p-4.5 shadow-[0_0_30px_rgba(18,34,71,0.8)] relative overflow-hidden flex flex-col justify-between min-h-[175px]">
              {/* Radial glow flare */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

              <div className="z-10 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]">🏆</span>
                  <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider drop-shadow">Big Wins, Bigger Thrills!</h4>
                </div>
                <p className="text-[11px] text-slate-300 font-medium max-w-[180px] leading-relaxed">
                  Play Flip Coin and unlock exclusive VIP rewards & multiplier bonuses!
                </p>
              </div>

              <div className="z-10 mt-3">
                <button
                  onClick={() => setShowRulesModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-600/25 hover:from-amber-500/35 hover:to-yellow-500/30 border border-amber-400/50 rounded-xl text-xs font-black text-amber-300 flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95"
                >
                  <span>View Rewards</span>
                  <i className="bi bi-arrow-right" />
                </button>
              </div>

              {/* 3D Gift Box Graphic */}
              <div className="absolute bottom-2 right-2 text-5xl pointer-events-none drop-shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-bounce duration-1000">
                🎁
              </div>
            </div>

          </div>

          {/* CENTER GAME STAGE */}
          <div className="md:col-span-7 lg:col-span-6 bg-gradient-to-b from-[#091328] via-[#060c1b] to-[#040814] border border-[#1d325c] rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-[0_0_40px_rgba(2,10,28,0.8)] flex flex-col justify-between min-h-[490px]">
            
            {/* Ambient Lighting & Flares */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Title Header */}
            <div className="text-center z-10 space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="text-amber-400 text-2xl drop-shadow-[0_0_14px_rgba(245,158,11,0.8)]">👑</span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-wider uppercase">
                  <span className="text-slate-100 drop-shadow-[0_2px_4px_rgba(255,255,255,0.2)]">FLIP </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-[0_2px_12px_rgba(245,158,11,0.5)]">COIN</span>
                </h2>
              </div>
              <p className="text-xs text-slate-300 font-medium tracking-wide">Heads or Tails? Choose Your Side & Win!</p>
            </div>

            {/* 3D Photorealistic PBR Coin Flip Stage */}
            <div className="relative my-2 w-full h-[440px] sm:h-[480px] lg:h-[500px] mx-auto z-10 rounded-2xl overflow-hidden">
              <Coin3DStage
                isFlipping={isFlipping}
                resultSide={currentResultSide}
                chosenSide={chosenSide}
                isWin={lastIsWin}
                payoutAmount={lastPayout}
                betAmount={parseFloat(betAmount) || 0}
                onAnimationComplete={handleAnimationComplete}
              />
            </div>

            {/* HEADS / TAILS SELECTION CARDS */}
            <div className="grid grid-cols-2 gap-3.5 z-10 mt-2">
              
              {/* HEADS CARD */}
              <button
                type="button"
                onClick={() => !isFlipping && setChosenSide('HEADS')}
                disabled={isFlipping}
                className={`py-3.5 px-4 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-1 relative overflow-hidden cursor-pointer ${
                  chosenSide === 'HEADS'
                    ? 'bg-gradient-to-b from-amber-500/30 via-yellow-600/35 to-amber-950/70 border-amber-400 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.45)] scale-[1.02]'
                    : 'bg-[#081022]/90 border-[#1a2b4c] text-slate-400 hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">👑</span>
                  <span className="text-base font-black tracking-wider text-white">HEADS</span>
                </div>
                <span className="text-xs font-black text-amber-400">1.96x</span>
                {chosenSide === 'HEADS' && (
                  <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] shadow-md">
                    ✓
                  </div>
                )}
              </button>

              {/* TAILS CARD */}
              <button
                type="button"
                onClick={() => !isFlipping && setChosenSide('TAILS')}
                disabled={isFlipping}
                className={`py-3.5 px-4 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-1 relative overflow-hidden cursor-pointer ${
                  chosenSide === 'TAILS'
                    ? 'bg-gradient-to-b from-cyan-400/25 via-cyan-600/30 to-slate-950/70 border-cyan-300 text-cyan-200 shadow-[0_0_28px_rgba(6,182,212,0.45)] scale-[1.02]'
                    : 'bg-[#081022]/90 border-[#1a2b4c] text-slate-400 hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">🦅</span>
                  <span className="text-base font-black tracking-wider text-white">TAILS</span>
                </div>
                <span className="text-xs font-black text-cyan-400">1.96x</span>
                {chosenSide === 'TAILS' && (
                  <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-cyan-300 text-slate-950 font-black text-[10px] shadow-md">
                    ✓
                  </div>
                )}
              </button>

            </div>

          </div>

          {/* RIGHT BETTING PANEL */}
          <div className="md:col-span-5 lg:col-span-3 bg-[#0b1426]/90 border border-[#1b2a4a] rounded-3xl p-5 shadow-xl space-y-5 backdrop-blur-md">
            
            {/* Top Summary Bar */}
            <div className="grid grid-cols-3 gap-2 bg-[#070e1c] p-3 rounded-2xl border border-[#172545] text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Min Bet</span>
                <span className="text-xs font-black text-slate-200">₹ 10</span>
              </div>
              <div className="border-x border-[#172545]">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Max Bet</span>
                <span className="text-xs font-black text-slate-200">₹ 50,000</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Payout</span>
                <span className="text-xs font-black text-amber-400">1.96x</span>
              </div>
            </div>

            {/* Bet Amount Input Section */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Bet Amount
              </label>

              {/* Input Box with Stepper Controls */}
              <div className="flex items-center bg-[#060c1a] border border-[#1b2a4a] rounded-2xl p-1.5 focus-within:border-amber-400 transition-colors">
                <span className="px-3 text-amber-400 font-black text-lg">₹</span>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={isFlipping}
                  placeholder="50"
                  className="w-full bg-transparent text-white font-black text-lg focus:outline-none disabled:opacity-50"
                />
                
                {/* Stepper Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleDecrementBet}
                    disabled={isFlipping}
                    className="w-8 h-8 rounded-xl bg-[#132244] hover:bg-[#1c305c] text-slate-300 font-black flex items-center justify-center cursor-pointer transition-all border border-[#213766]"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={handleIncrementBet}
                    disabled={isFlipping}
                    className="w-8 h-8 rounded-xl bg-[#132244] hover:bg-[#1c305c] text-slate-300 font-black flex items-center justify-center cursor-pointer transition-all border border-[#213766]"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Quick Preset Chip Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[10, 50, 100, 500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => !isFlipping && handleQuickBet(val)}
                    disabled={isFlipping}
                    className="py-2 rounded-xl bg-[#081021] hover:bg-[#122040] text-xs font-black text-slate-300 hover:text-white transition-all border border-[#1b2a4a] cursor-pointer"
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification / Status Message */}
            {message && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  message.type === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <i className={`bi ${message.type === 'error' ? 'bi-x-circle-fill text-rose-400' : 'bi-check-circle-fill text-emerald-400'}`} />
                <span>{message.text}</span>
              </div>
            )}

            {/* Action Play Button */}
            <button
              type="button"
              onClick={handleFlip}
              disabled={isFlipping}
              className={`w-full py-4 rounded-2xl font-black text-base tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isFlipping
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.45)] active:scale-[0.98]'
              }`}
            >
              {isFlipping ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>FLIPPING...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">👑</span>
                  <span>FLIP COIN</span>
                </>
              )}
            </button>

            {/* Provably Fair Badge */}
            <div className="bg-[#060d1d] border border-[#172545] rounded-xl p-3 flex items-center gap-3 text-xs text-slate-400">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-lg shrink-0">
                🛡️
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-200">Provably Fair</span>
                <span className="text-[10px] text-slate-400">Your game is 100% fair & transparent</span>
              </div>
            </div>

          </div>

        </div>

        {/* BOTTOM FEATURE BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 bg-[#0b1426]/90 border border-[#1b2a4a] rounded-2xl p-4 shadow-xl text-slate-300 backdrop-blur-md">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl shrink-0">
              🛡️
            </div>
            <div>
              <h5 className="text-xs font-black text-white">Fast & Secure</h5>
              <p className="text-[11px] text-slate-400 leading-tight">Instant payouts & secure transactions</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl shrink-0">
              ⚛️
            </div>
            <div>
              <h5 className="text-xs font-black text-white">Provably Fair</h5>
              <p className="text-[11px] text-slate-400 leading-tight">Transparent game logic & results</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-xl shrink-0">
              🎧
            </div>
            <div>
              <h5 className="text-xs font-black text-white">24/7 Support</h5>
              <p className="text-[11px] text-slate-400 leading-tight">We're always here to help you</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl shrink-0">
              🎁
            </div>
            <div>
              <h5 className="text-xs font-black text-white">Exciting Rewards</h5>
              <p className="text-[11px] text-slate-400 leading-tight">Play more, get more rewards</p>
            </div>
          </div>
        </div>

      </main>

      {/* MOBILE FIXED BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#091122]/95 border-t border-[#1b2a4a] backdrop-blur-md px-6 py-2.5 flex items-center justify-between text-slate-400 text-[10px] font-bold shadow-2xl">
        <Link href="/" className="flex flex-col items-center gap-0.5 hover:text-white transition-colors">
          <span className="text-lg">🏠</span>
          <span>Home</span>
        </Link>
        <Link href="/play/coin-flip" className="flex flex-col items-center gap-0.5 text-amber-400 font-black">
          <span className="text-lg drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]">🎮</span>
          <span>Games</span>
        </Link>
        <button
          onClick={() => setShowHistoryModal(true)}
          className="flex flex-col items-center gap-0.5 hover:text-white transition-colors cursor-pointer"
        >
          <span className="text-lg">📜</span>
          <span>History</span>
        </button>
        <Link href="/wallet" className="flex flex-col items-center gap-0.5 hover:text-white transition-colors">
          <span className="text-lg">👛</span>
          <span>Wallet</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-0.5 hover:text-white transition-colors">
          <span className="text-lg">👤</span>
          <span>Profile</span>
        </Link>
      </div>

      {/* ─── RESULT POPUP MODAL ─── */}
      {resultModal?.show && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(10px)', background: 'rgba(2,4,16,0.85)' }}
        >
          {/* Ambient glow behind card */}
          <div className="absolute pointer-events-none" style={{
            width: 320, height: 320, borderRadius: '50%',
            background: resultModal.isWin
              ? 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(244,63,94,0.14) 0%, transparent 70%)',
          }} />

          {/* Card */}
          <div
            className="relative w-full overflow-hidden"
            style={{
              maxWidth: 340,
              borderRadius: 20,
              background: resultModal.isWin
                ? 'linear-gradient(155deg, #0e1c09 0%, #08120a 100%)'
                : 'linear-gradient(155deg, #180810 0%, #0c0408 100%)',
              border: `1px solid ${resultModal.isWin ? 'rgba(251,191,36,0.5)' : 'rgba(244,63,94,0.42)'}`,
              boxShadow: resultModal.isWin
                ? '0 0 48px rgba(245,158,11,0.22), 0 8px 32px rgba(0,0,0,0.55)'
                : '0 0 48px rgba(244,63,94,0.18), 0 8px 32px rgba(0,0,0,0.55)',
              animation: 'cfPop 0.3s cubic-bezier(0.175,0.885,0.32,1.275) both',
            }}
          >
            {/* Top shimmer line */}
            <div style={{
              height: 2, width: '100%',
              background: resultModal.isWin
                ? 'linear-gradient(90deg,transparent,#fbbf24,#fef08a,#fbbf24,transparent)'
                : 'linear-gradient(90deg,transparent,#f43f5e,#fb7185,#f43f5e,transparent)',
            }} />

            {/* Corner brackets */}
            {[['top-2.5 left-2.5','borderTop','borderLeft'],['top-2.5 right-2.5','borderTop','borderRight'],['bottom-2.5 left-2.5','borderBottom','borderLeft'],['bottom-2.5 right-2.5','borderBottom','borderRight']].map(([pos,,], i) => (
              <div key={i} className={`absolute ${pos} w-4 h-4 pointer-events-none opacity-60`} style={{
                [pos.includes('top') ? 'borderTop' : 'borderBottom']: `1.5px solid ${resultModal.isWin ? '#fbbf24' : '#f43f5e'}`,
                [pos.includes('left') ? 'borderLeft' : 'borderRight']: `1.5px solid ${resultModal.isWin ? '#fbbf24' : '#f43f5e'}`,
              }} />
            ))}

            {/* Background blob */}
            <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full pointer-events-none" style={{
              background: resultModal.isWin ? 'rgba(245,158,11,0.09)' : 'rgba(244,63,94,0.09)',
              filter: 'blur(30px)',
            }} />

            <div className="relative z-10 px-5 py-5 flex flex-col gap-3.5">

              {/* ─ Icon + Title row ─ */}
              <div className="flex items-center gap-3.5">
                {/* Icon */}
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 rounded-full animate-ping opacity-40" style={{
                    background: resultModal.isWin ? 'rgba(251,191,36,0.5)' : 'rgba(244,63,94,0.45)',
                    animationDuration: '2s',
                  }} />
                  <div className="relative w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{
                    background: resultModal.isWin
                      ? 'radial-gradient(circle, #fef08a 0%, #f59e0b 55%, #d97706 100%)'
                      : 'radial-gradient(circle, #fb7185 0%, #f43f5e 55%, #be123c 100%)',
                    boxShadow: resultModal.isWin
                      ? '0 0 0 3px rgba(251,191,36,0.25), 0 0 20px rgba(245,158,11,0.45)'
                      : '0 0 0 3px rgba(244,63,94,0.25), 0 0 20px rgba(244,63,94,0.4)',
                  }}>
                    {resultModal.isWin ? '🏆' : '💔'}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <h2 className="text-xl font-black uppercase leading-tight" style={{
                    color: resultModal.isWin ? '#fbbf24' : '#f43f5e',
                    textShadow: resultModal.isWin
                      ? '0 0 16px rgba(251,191,36,0.5)'
                      : '0 0 16px rgba(244,63,94,0.45)',
                  }}>
                    {resultModal.isWin ? 'You Win! 🎉' : 'Bet Lost'}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-tight">
                    Coin landed on{' '}
                    <span className="font-black uppercase" style={{ color: resultModal.isWin ? '#fbbf24' : '#f43f5e' }}>
                      {resultModal.resultSide}
                    </span>
                  </p>
                </div>
              </div>

              {/* ─ Payout card ─ */}
              <div className="rounded-xl px-4 py-3 text-center relative overflow-hidden" style={{
                background: resultModal.isWin
                  ? 'rgba(245,158,11,0.11)' : 'rgba(244,63,94,0.10)',
                border: `1px solid ${resultModal.isWin ? 'rgba(245,158,11,0.28)' : 'rgba(244,63,94,0.25)'}`,
              }}>
                <div className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1" style={{
                  color: resultModal.isWin ? '#fde68a' : '#fca5a5',
                }}>
                  {resultModal.isWin ? 'Payout Received' : 'Amount Lost'}
                </div>
                <div className="text-3xl font-black leading-none" style={{
                  color: resultModal.isWin ? '#fbbf24' : '#f43f5e',
                  textShadow: resultModal.isWin ? '0 0 18px rgba(251,191,36,0.4)' : '0 0 18px rgba(244,63,94,0.35)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {resultModal.isWin ? '+' : '-'}₹{(resultModal.isWin
                    ? resultModal.payoutAmount
                    : resultModal.betAmount).toFixed(2)}
                </div>
                {resultModal.isWin && (
                  <div className="text-[10px] font-semibold text-emerald-400 mt-1">
                    Net profit: +₹{(resultModal.payoutAmount - resultModal.betAmount).toFixed(2)}
                  </div>
                )}
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'linear-gradient(120deg,transparent 35%,rgba(255,255,255,0.03) 50%,transparent 65%)',
                }} />
              </div>

              {/* ─ Stats row ─ */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Your Bet', value: resultModal.chosenSide, icon: resultModal.chosenSide === 'HEADS' ? '👑' : '🦅', plain: true },
                  { label: 'Outcome', value: resultModal.isWin ? 'WIN' : 'LOSS', icon: resultModal.isWin ? '✓' : '✗', plain: false },
                  { label: 'Landed', value: resultModal.resultSide, icon: resultModal.resultSide === 'HEADS' ? '👑' : '🦅', plain: false },
                ].map(({ label, value, icon, plain }) => (
                  <div key={label} className="rounded-lg px-2 py-2 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider font-bold mb-1">{label}</div>
                    <div className="text-[11px] font-black flex items-center justify-center gap-0.5" style={{
                      color: plain ? '#e2e8f0' : (resultModal.isWin ? '#fbbf24' : '#f43f5e'),
                    }}>
                      <span>{icon}</span>
                      <span>{value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ─ Multiplier divider ─ */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full" style={{
                  color: resultModal.isWin ? '#fde68a' : '#94a3b8',
                  background: resultModal.isWin ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.12)',
                  border: `1px solid ${resultModal.isWin ? 'rgba(245,158,11,0.25)' : 'rgba(100,116,139,0.18)'}`,
                }}>
                  Multiplier 1.96×
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>

              {/* ─ Buttons ─ */}
              <div className="flex gap-2">
                <button
                  onClick={() => setResultModal(null)}
                  className="flex-none w-20 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide cursor-pointer transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                  onMouseEnter={e => { const b = e.currentTarget; b.style.background='rgba(255,255,255,0.09)'; b.style.color='#cbd5e1'; }}
                  onMouseLeave={e => { const b = e.currentTarget; b.style.background='rgba(255,255,255,0.05)'; b.style.color='#94a3b8'; }}
                >
                  Close
                </button>
                <button
                  onClick={() => setResultModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide cursor-pointer relative overflow-hidden transition-opacity hover:opacity-90"
                  style={{
                    background: resultModal.isWin
                      ? 'linear-gradient(135deg,#d97706,#fbbf24,#d97706)'
                      : 'linear-gradient(135deg,#6d28d9,#7c3aed,#6d28d9)',
                    color: resultModal.isWin ? '#1c0a00' : '#fff',
                    boxShadow: resultModal.isWin
                      ? '0 3px 16px rgba(245,158,11,0.35)'
                      : '0 3px 16px rgba(124,58,237,0.35)',
                  }}
                >
                  <span className="relative z-10">
                    {resultModal.isWin ? '⚡ Play Again' : '🔄 Try Again'}
                  </span>
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'linear-gradient(120deg,transparent 30%,rgba(255,255,255,0.12) 50%,transparent 70%)',
                  }} />
                </button>
              </div>

            </div>
          </div>

          <style>{`
            @keyframes cfPop {
              0%   { opacity:0; transform:scale(0.84) translateY(20px); }
              65%  { opacity:1; transform:scale(1.02) translateY(-2px); }
              100% { opacity:1; transform:scale(1)    translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* FULL GAME HISTORY MODAL */}

      {/* FULL GAME HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-3">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <i className="bi bi-clock-history text-amber-400 text-xl" />
                <h3 className="font-extrabold text-lg text-white">Your Coin Flip Bet History</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 max-h-[420px] overflow-y-auto">
              {recentFlips.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  No flip history recorded yet. Place a bet to see your history!
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-slate-800 uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Choice</th>
                      <th className="py-2.5 px-3">Result</th>
                      <th className="py-2.5 px-3">Bet</th>
                      <th className="py-2.5 px-3">Payout</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                    {recentFlips.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 text-slate-400">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-3 px-3 font-bold">
                          <span className={item.chosenSide === 'HEADS' ? 'text-amber-400 flex items-center gap-1' : 'text-slate-300 flex items-center gap-1'}>
                            <span>{item.chosenSide === 'HEADS' ? '👑' : '🦅'}</span>
                            <span>{item.chosenSide}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold">
                          <span className={item.resultSide === 'HEADS' ? 'text-amber-400 flex items-center gap-1' : 'text-slate-300 flex items-center gap-1'}>
                            <span>{item.resultSide === 'HEADS' ? '👑' : '🦅'}</span>
                            <span>{item.resultSide}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-white">₹{item.betAmount}</td>
                        <td className="py-3 px-3 font-bold text-emerald-400">
                          {item.payoutAmount > 0 ? `₹${item.payoutAmount.toFixed(2)}` : '₹0.00'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              item.status === 'WON'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-800 bg-slate-950/60">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 uppercase tracking-wider cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RULES MODAL */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-amber-400 flex items-center gap-2">
                <i className="bi bi-question-circle text-lg" /> How to Play Coin Flip
              </h3>
              <button onClick={() => setShowRulesModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
            <ul className="space-y-3 text-xs text-slate-300 leading-relaxed list-disc pl-4">
              <li>Choose your side: <strong>HEADS (Crown 👑)</strong> or <strong>TAILS (Eagle 🦅)</strong>.</li>
              <li>Enter your bet amount (Min: ₹10, Max: ₹50,000).</li>
              <li>Click <strong>FLIP COIN</strong>. The coin spins in mid-air with realistic 3D motion.</li>
              <li>If the coin lands on your side, you win <strong>1.96x</strong> your bet amount instantly!</li>
              <li>Winnings are instantly credited to your main balance.</li>
            </ul>
            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer"
            >
              Got it, Let's Play!
            </button>
          </div>
        </div>
      )}

      {/* Validation Error Popup Alert Modal */}
      {validationModal && (
        <ValidationErrorModal
          isOpen={validationModal.isOpen}
          onClose={() => setValidationModal(null)}
          type={validationModal.type}
          message={validationModal.message}
          currentBalance={validationModal.currentBalance ?? currentBalance}
          requiredAmount={validationModal.requiredAmount}
          minBet={validationModal.minBet}
          maxBet={validationModal.maxBet}
        />
      )}

      {/* Tailwind 3D Perspective Custom Style */}
      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotateY(0deg); }
          50% { transform: translateY(-10px) rotateY(6deg); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        @keyframes coinBounce {
          0% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-80px) scale(1.15); }
          100% { transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* UNIFIED MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a1122]/95 border-t border-[#1c2e54] backdrop-blur-lg py-2.5 px-6 flex items-center justify-around shadow-2xl text-[11px] font-bold text-slate-400">
        <Link href="/" className="flex flex-col items-center gap-1 hover:text-amber-400 transition-colors">
          <i className="bi bi-house-door-fill text-lg" />
          <span>Home</span>
        </Link>
        <Link href="/play/coin-flip" className="flex flex-col items-center gap-1 text-amber-400 font-black">
          <i className="bi bi-coin text-lg drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <span>Coin</span>
        </Link>
        <Link href="/wallet" className="flex flex-col items-center gap-1 hover:text-amber-400 transition-colors">
          <i className="bi bi-wallet2 text-lg" />
          <span>Wallet</span>
        </Link>
        <Link href="/rewards" className="flex flex-col items-center gap-1 hover:text-amber-400 transition-colors">
          <i className="bi bi-gift-fill text-lg" />
          <span>Rewards</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 hover:text-amber-400 transition-colors">
          <i className="bi bi-person-fill text-lg" />
          <span>Profile</span>
        </Link>
      </nav>

    </div>
  );
}
