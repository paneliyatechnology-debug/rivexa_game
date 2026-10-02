'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUp,
  ArrowDown,
  Volume2,
  VolumeX,
  Clock,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Plus,
  Minus,
  X,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { getApiBaseUrl } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';
import ValidationErrorModal, { ValidationErrorType } from './ValidationErrorModal';

export type CardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export interface CardData {
  code: string;
  rank: CardRank;
  rankValue: number;
  suit: CardSuit;
  suitSymbol: string;
  color: 'red' | 'black';
}

export interface HiloHistoryItem {
  id: string;
  roundId: string;
  currentCard: string;
  currentCardDetails?: CardData | null;
  choice: 'UP' | 'DOWN' | null;
  nextCard: string | null;
  nextCardDetails?: CardData | null;
  betAmount: number;
  result: 'WIN' | 'LOSS' | 'PENDING';
  profit: number;
  payout: number;
  balanceBefore?: number;
  balanceAfter?: number | null;
  createdAt: string;
}

export default function HiloGame() {
  const { user, balance: authBalance, refreshBalance } = useAuth();
  const currentBalance = authBalance !== undefined && authBalance !== null ? authBalance : 0;

  // Sound and mounting
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Betting state
  const [betAmount, setBetAmount] = useState<string>('100');
  const [selectedChoice, setSelectedChoice] = useState<'UP' | 'DOWN' | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCardFlipping, setIsCardFlipping] = useState<boolean>(false);

  // Cards state
  const [currentCard, setCurrentCard] = useState<CardData>({
    code: 'JC',
    rank: 'J',
    rankValue: 11,
    suit: 'clubs',
    suitSymbol: '♣',
    color: 'black',
  });
  const [nextCard, setNextCard] = useState<CardData | null>(null);
  const [isNextRevealed, setIsNextRevealed] = useState<boolean>(false);
  const [activeRoundId, setActiveRoundId] = useState<string>('HILO-READY');

  // Result state
  const [lastResult, setLastResult] = useState<{
    result: 'WIN' | 'LOSS';
    profit: number;
    payout: number;
    choice: 'UP' | 'DOWN';
    isSameRank: boolean;
  } | null>(null);

  // Modals & Panels
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [history, setHistory] = useState<HiloHistoryItem[]>([]);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Validation modal state
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    type: ValidationErrorType;
    message: string;
    requiredAmount?: number;
    minBet?: number;
    maxBet?: number;
    currentBalance?: number;
  } | null>(null);

  // Confetti particles for WIN
  const [confettiActive, setConfettiActive] = useState<boolean>(false);

  // Initialize
  useEffect(() => {
    setMounted(true);
    try {
      const savedSound = localStorage.getItem('rivexa_sound_enabled');
      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }
    } catch (e) {}

    // Generate initial pleasant card
    generateInitialClientCard();
    fetchHistory();
  }, [user]);

  const generateInitialClientCard = () => {
    const ranks: CardRank[] = ['7', '8', '9', '10', 'J', 'Q'];
    const suits: CardSuit[] = ['clubs', 'hearts', 'spades', 'diamonds'];
    const r = ranks[Math.floor(Math.random() * ranks.length)];
    const s = suits[Math.floor(Math.random() * suits.length)];
    const symbols: Record<CardSuit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
    const codeMap: Record<CardSuit, string> = { spades: 'S', hearts: 'H', diamonds: 'D', clubs: 'C' };
    const rankVals: Record<string, number> = { '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12 };

    setCurrentCard({
      code: `${r}${codeMap[s]}`,
      rank: r,
      rankValue: rankVals[r],
      suit: s,
      suitSymbol: symbols[s],
      color: s === 'hearts' || s === 'diamonds' ? 'red' : 'black',
    });
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('rivexa_sound_enabled', String(next));
    } catch (e) {}
  };

  // Sound Engine using Web Audio API
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
  };

  const playCardFlipSound = () => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch (e) {}
  };

  const playWinSound = () => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.35, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
      });
    } catch (e) {}
  };

  const playLossSound = () => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  };

  // Fetch real game history from server
  const fetchHistory = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const userId = user?.id || '';
      if (!userId) return;
      const res = await fetch(`${apiBase}/hilo/history?userId=${userId}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.rounds)) {
          setHistory(data.rounds);
        }
      }
    } catch (e) {}
  };

  // Quick Bet Amount Helpers
  const handleQuickAmount = (val: number | string) => {
    if (isProcessing) return;
    if (typeof val === 'number') {
      setBetAmount(val.toString());
    } else if (val === '2X') {
      const curr = parseFloat(betAmount) || 10;
      setBetAmount(Math.min(50000, curr * 2).toString());
    } else if (val === 'HALF') {
      const curr = parseFloat(betAmount) || 10;
      setBetAmount(Math.max(10, Math.floor(curr / 2)).toString());
    } else if (val === 'MAX') {
      setBetAmount(Math.min(currentBalance, 50000).toString());
    }
  };

  const handleStepAmount = (delta: number) => {
    if (isProcessing) return;
    const curr = parseFloat(betAmount) || 10;
    const next = Math.max(10, Math.min(50000, curr + delta));
    setBetAmount(next.toString());
  };

  // Validation Check Before Placing Bet
  const validateBet = (amt: number): boolean => {
    if (!user || !user.id) {
      setValidationModal({
        isOpen: true,
        type: 'AUTH_REQUIRED',
        message: 'Please log in or create an account to place bets and play HILO.',
      });
      return false;
    }

    if (isNaN(amt) || amt < 10) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Minimum bet amount for HILO is ₹10.',
        minBet: 10,
        maxBet: 50000,
        requiredAmount: amt || 0,
      });
      return false;
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
      return false;
    }

    if (currentBalance <= 0 || amt > currentBalance) {
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: `Your current balance (₹${currentBalance.toFixed(2)}) is insufficient for a ₹${amt.toFixed(2)} bet. Please recharge your wallet.`,
        requiredAmount: amt,
        currentBalance,
      });
      return false;
    }

    return true;
  };

  /**
   * MAIN PLAY ACTION:
   * When player selects UP or DOWN, the backend creates round, deducts bet atomically,
   * draws next card, evaluates result, and credits payout.
   */
  const handlePlayPrediction = async (choice: 'UP' | 'DOWN') => {
    if (isProcessing || isCardFlipping) return;

    const amt = parseFloat(betAmount);
    if (!validateBet(amt)) return;

    setSelectedChoice(choice);
    setIsProcessing(true);
    setLastResult(null);
    setIsNextRevealed(false);
    setToastMessage(null);

    try {
      const apiBase = getApiBaseUrl();
      const userId = user!.id;

      // 1. Create Round on Server & Deduct Bet Atomically
      const roundRes = await fetch(`${apiBase}/hilo/round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          betAmount: amt,
        }),
      });

      const roundData = await roundRes.json();
      if (!roundRes.ok) {
        setIsProcessing(false);
        setSelectedChoice(null);
        setValidationModal({
          isOpen: true,
          type: roundRes.status === 400 && roundData.message?.toLowerCase().includes('balance') ? 'INSUFFICIENT_BALANCE' : 'GAME_ERROR',
          message: roundData.message || 'Failed to initialize HILO round',
          currentBalance,
          requiredAmount: amt,
        });
        refreshBalance();
        return;
      }

      // Update current card with server's authorized initial card
      const serverCurrentCard = roundData.currentCard;
      setCurrentCard(serverCurrentCard);
      setActiveRoundId(roundData.roundId);
      refreshBalance();

      // 2. Play Choice on Server (UP / DOWN)
      const playRes = await fetch(`${apiBase}/hilo/round/${roundData.roundId}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          choice,
        }),
      });

      const playData = await playRes.json();
      if (!playRes.ok) {
        setIsProcessing(false);
        setSelectedChoice(null);
        setToastMessage({ text: playData.message || 'Error resolving round', type: 'error' });
        refreshBalance();
        return;
      }

      // 3. Initiate Card Flip Animation
      const revealedCard: CardData = playData.nextCardDetails;
      setNextCard(revealedCard);
      setIsCardFlipping(true);
      playCardFlipSound();

      // Card flip animation duration: 650ms
      setTimeout(() => {
        setIsNextRevealed(true);
        setIsCardFlipping(false);

        const isWin = playData.isWin;
        const isSame = revealedCard.rankValue === serverCurrentCard.rankValue;

        setLastResult({
          result: isWin ? 'WIN' : 'LOSS',
          profit: playData.profit,
          payout: playData.payout,
          choice,
          isSameRank: isSame,
        });

        if (isWin) {
          playWinSound();
          setConfettiActive(true);
          setTimeout(() => setConfettiActive(false), 3500);
        } else {
          playLossSound();
        }

        refreshBalance();
        fetchHistory();

        // 4. Smoothly shift revealed card to become the current card for next round after 2.4s
        setTimeout(() => {
          setCurrentCard(revealedCard);
          setNextCard(null);
          setIsNextRevealed(false);
          setIsProcessing(false);
          setSelectedChoice(null);
        }, 2200);
      }, 650);
    } catch (err: any) {
      console.error('HILO Play Error:', err);
      setIsProcessing(false);
      setIsCardFlipping(false);
      setSelectedChoice(null);
      setToastMessage({ text: 'Network connection error. Please try again.', type: 'error' });
      refreshBalance();
    }
  };

  // Render Card Component
  const renderCardView = (card: CardData, isCurrent: boolean = true) => {
    const isRed = card.color === 'red';
    return (
      <div
        className={`relative w-40 sm:w-48 h-60 sm:h-72 rounded-2xl p-3 flex flex-col justify-between select-none shadow-2xl transition-all duration-300 ${
          isCurrent
            ? 'bg-gradient-to-br from-slate-900 via-[#0d1629] to-[#080d1a] border-2 border-[#287BFF]/60 shadow-[0_0_35px_rgba(40,123,255,0.3)]'
            : lastResult?.result === 'WIN'
            ? 'bg-gradient-to-br from-slate-900 via-[#0a201c] to-[#061412] border-2 border-[#00E5A0] shadow-[0_0_35px_rgba(0,229,160,0.45)]'
            : 'bg-gradient-to-br from-slate-900 via-[#260e15] to-[#14060b] border-2 border-[#FF416C] shadow-[0_0_35px_rgba(255,65,108,0.45)]'
        }`}
      >
        {/* Holographic Inner Border & Gloss Accent */}
        <div className="absolute inset-1 rounded-xl border border-white/10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        {/* Top-Left Rank & Suit */}
        <div className="flex flex-col items-start leading-none z-10">
          <span className={`text-2xl sm:text-3xl font-black tracking-tight ${isRed ? 'text-[#FF416C]' : 'text-slate-100'}`}>
            {card.rank}
          </span>
          <span className={`text-xl sm:text-2xl ${isRed ? 'text-[#FF416C]' : 'text-[#00D9FF]'}`}>
            {card.suitSymbol}
          </span>
        </div>

        {/* Center Gigantic Suit Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={`text-6xl sm:text-7xl font-bold select-none opacity-25 filter drop-shadow-md transition-transform ${
              isRed ? 'text-[#FF416C]' : 'text-[#00D9FF]'
            }`}
          >
            {card.suitSymbol}
          </span>
        </div>

        {/* Center Badge with Card Code & Rank Value */}
        <div className="flex items-center justify-center z-10">
          <span className="px-2.5 py-1 rounded-full bg-slate-950/70 border border-white/10 text-[10px] sm:text-xs font-mono font-bold text-slate-300">
            Rank: <strong className="text-white">{card.rankValue}</strong> / 14
          </span>
        </div>

        {/* Bottom-Right Inverted Rank & Suit */}
        <div className="flex flex-col items-end leading-none z-10 rotate-180">
          <span className={`text-2xl sm:text-3xl font-black tracking-tight ${isRed ? 'text-[#FF416C]' : 'text-slate-100'}`}>
            {card.rank}
          </span>
          <span className={`text-xl sm:text-2xl ${isRed ? 'text-[#FF416C]' : 'text-[#00D9FF]'}`}>
            {card.suitSymbol}
          </span>
        </div>
      </div>
    );
  };

  // Render Face-Down Card Back
  const renderCardBack = () => {
    return (
      <div className="relative w-40 sm:w-48 h-60 sm:h-72 rounded-2xl p-3 flex flex-col items-center justify-center select-none bg-gradient-to-br from-[#0c1630] via-[#081024] to-[#040814] border-2 border-[#287BFF]/40 shadow-[0_0_30px_rgba(40,123,255,0.2)] overflow-hidden">
        {/* Decorative Geometric Holographic Pattern */}
        <div className="absolute inset-1 rounded-xl border border-[#00D9FF]/20 flex items-center justify-center p-2">
          <div className="w-full h-full rounded-lg border border-dashed border-[#873BFF]/40 flex flex-col items-center justify-center bg-[radial-gradient(#287BFF_1px,transparent_1px)] [background-size:12px_12px] opacity-60" />
        </div>

        {/* Center Glowing Logo Monogram */}
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#287BFF]/30 to-[#00D9FF]/20 border border-[#00D9FF]/50 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(0,217,255,0.3)]">
          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00D9FF] to-[#287BFF]">
            HILO
          </span>
          <span className="text-[9px] text-[#A8B9DE] font-bold tracking-widest uppercase">CARDS</span>
        </div>

        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-[#050B20] text-gray-100 flex flex-col font-sans selection:bg-[#287BFF]/30 selection:text-[#00D9FF]">
      
      {/* ─── TOP BAR ─── */}
      <header className="w-full bg-[#081226]/90 border-b border-[#1b2b4d] backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 py-3 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-[#101E3D] hover:bg-[#182C5A] border border-[#22396E] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer text-sm shadow-sm"
              title="Back to GameHub"
            >
              ←
            </Link>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#287BFF] via-[#00D9FF] to-[#873BFF] flex items-center justify-center font-black text-[#050B20] text-lg shadow-[0_0_15px_rgba(0,217,255,0.4)]">
                ♠
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-black tracking-wider text-white">
                    HI<span className="text-[#00D9FF]">LO</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-gradient-to-r from-[#287BFF]/20 to-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40">
                    2.0X
                  </span>
                </div>
                <span className="text-[10px] text-[#7285AE] font-medium hidden sm:inline">
                  Higher or Lower Card Prediction
                </span>
              </div>
            </div>
          </div>

          {/* Right Header: How to Play, Sound, History, Balance */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* How to Play Button */}
            <button
              onClick={() => setShowHowToPlay(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101E3D] hover:bg-[#182C5A] border border-[#22396E] text-[#00D9FF] hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="How to Play"
            >
              <HelpCircle className="w-4 h-4 text-[#00D9FF]" />
              <span className="hidden sm:inline">How to Play?</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                soundEnabled
                  ? 'bg-[#287BFF]/20 border-[#287BFF]/50 text-[#00D9FF] shadow-[0_0_10px_rgba(0,217,255,0.25)]'
                  : 'bg-[#101E3D] border-[#22396E] text-slate-500 hover:text-slate-300'
              }`}
              title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* History Button */}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101E3D] hover:bg-[#182C5A] border border-[#22396E] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              title="Round History"
            >
              <Clock className="w-4 h-4 text-[#00D9FF]" />
              <span className="hidden md:inline">History</span>
            </button>

            {/* Wallet Balance Pill */}
            <div className="flex items-center gap-2 bg-[#0c1833] border border-[#22396E] rounded-xl px-3 py-1.5 shadow-inner">
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-bold text-[#7285AE] leading-none uppercase">Balance</span>
                <span className="text-xs sm:text-sm font-black text-[#00E5A0] leading-tight">
                  ₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <Link
                href="/wallet"
                className="w-5 h-5 rounded-full bg-gradient-to-r from-[#00D9FF] to-[#287BFF] hover:brightness-110 text-[#050B20] flex items-center justify-center text-xs font-black shadow-md transition-transform hover:scale-110 ml-0.5"
                title="Deposit Funds"
              >
                +
              </Link>
            </div>
          </div>

        </div>
      </header>

      {/* ─── TOAST NOTIFICATION ─── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-bold shadow-xl border flex items-center gap-2 ${
              toastMessage.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-600'
                : 'bg-emerald-950/90 text-emerald-200 border-emerald-600'
            }`}
          >
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CONFETTI CANVAS EFFECT ON WIN ─── */}
      {confettiActive && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 40 }).map((_, idx) => (
            <motion.div
              key={idx}
              className="absolute w-2.5 h-2.5 rounded-sm"
              style={{
                backgroundColor: ['#00D9FF', '#00E5A0', '#FFC928', '#FF3FA4', '#287BFF'][idx % 5],
                top: '-5%',
                left: `${(idx * 2.5) % 100}%`,
              }}
              animate={{
                y: ['0vh', '110vh'],
                rotate: [0, 720],
                x: [0, (idx % 2 === 0 ? 1 : -1) * (30 + (idx % 40))],
              }}
              transition={{
                duration: 2.2 + (idx % 10) * 0.15,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-6 py-6 flex flex-col gap-6">
        
        {/* ROUND ID PILL & PROVABLY FAIR */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-[#0c1833]/80 border border-[#1d325c] px-3.5 py-1.5 rounded-full text-xs font-mono shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#00E5A0] animate-pulse" />
            <span className="text-[#7285AE]">Round ID:</span>
            <span className="font-bold text-[#00D9FF]">{activeRoundId}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#7285AE]">
            <ShieldCheck className="w-4 h-4 text-[#00E5A0]" />
            <span className="font-semibold text-slate-300">Provably Fair Deck</span>
          </div>
        </div>

        {/* ─── CENTER CARD ARENA ─── */}
        <div className="relative bg-gradient-to-b from-[#0a142c]/90 via-[#070e20]/95 to-[#040814] border border-[#1d325c] rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-[0_0_40px_rgba(2,10,28,0.9)] overflow-hidden">
          
          {/* Ambient Background Glows */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-[#287BFF]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-64 h-64 bg-[#00D9FF]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Result Alert Overlay if previous round completed */}
          <AnimatePresence>
            {lastResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`mb-4 px-6 py-2.5 rounded-2xl border font-black text-center flex flex-col items-center gap-0.5 shadow-xl ${
                  lastResult.result === 'WIN'
                    ? 'bg-emerald-950/80 border-[#00E5A0] text-[#00E5A0] shadow-[0_0_25px_rgba(0,229,160,0.35)]'
                    : 'bg-rose-950/80 border-[#FF416C] text-[#FF416C] shadow-[0_0_25px_rgba(255,65,108,0.35)]'
                }`}
              >
                <div className="text-sm sm:text-base tracking-wider flex items-center gap-1.5">
                  {lastResult.result === 'WIN' ? (
                    <>
                      <span>🎉</span>
                      <span>YOU WIN!</span>
                    </>
                  ) : lastResult.isSameRank ? (
                    <>
                      <span>⚠️</span>
                      <span>SAME RANK — BET LOST</span>
                    </>
                  ) : (
                    <>
                      <span>💔</span>
                      <span>BET LOST</span>
                    </>
                  )}
                </div>
                <div className="text-xs font-mono font-bold">
                  {lastResult.result === 'WIN'
                    ? `+₹${lastResult.profit.toFixed(2)} (Total Payout: ₹${lastResult.payout.toFixed(2)})`
                    : `-₹${Math.abs(lastResult.profit).toFixed(2)}`}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CARDS DISPLAY CONTAINER */}
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 my-2 z-10 w-full">
            
            {/* CURRENT CARD */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-bold text-[#7285AE] uppercase tracking-wider flex items-center gap-1">
                <span>Current Card</span>
              </span>
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {renderCardView(currentCard, true)}
              </motion.div>
            </div>

            {/* FLOW ARROW & PREDICTION GLOW INDICATORS */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="px-3 py-1 rounded-full bg-[#101E3D] border border-[#287BFF]/40 text-[#00D9FF] text-xs font-black flex items-center gap-1 shadow-md">
                <ArrowUp className="w-3.5 h-3.5 text-[#00D9FF]" />
                <span>HIGHER</span>
              </div>

              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#142347] to-[#0c1833] border border-[#287BFF]/40 flex items-center justify-center shadow-lg text-slate-300">
                <span className="text-sm font-bold animate-pulse">VS</span>
              </div>

              <div className="px-3 py-1 rounded-full bg-[#101E3D] border border-[#873BFF]/40 text-[#FF3FA4] text-xs font-black flex items-center gap-1 shadow-md">
                <ArrowDown className="w-3.5 h-3.5 text-[#FF3FA4]" />
                <span>LOWER</span>
              </div>
            </div>

            {/* NEXT CARD (Face Down or Flipped) */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-bold text-[#7285AE] uppercase tracking-wider flex items-center gap-1">
                <span>Next Card</span>
              </span>
              
              <div
                className={`relative transition-transform duration-500 [transform-style:preserve-3d] ${
                  isCardFlipping ? '[transform:rotateY(180deg)]' : ''
                } ${lastResult?.result === 'LOSS' && isNextRevealed ? 'animate-shake' : ''}`}
              >
                {isNextRevealed && nextCard ? (
                  renderCardView(nextCard, false)
                ) : (
                  renderCardBack()
                )}
              </div>
            </div>

          </div>

          {/* Hint Notice */}
          <p className="mt-6 text-xs text-[#7285AE] font-medium text-center max-w-md">
            Will the next card rank higher or lower than{' '}
            <strong className="text-white">
              {currentCard.rank} ({currentCard.rankValue})
            </strong>
            ? Equal rank is treated as a loss.
          </p>

        </div>

        {/* ─── BETTING CONTROLS & PREDICTION BUTTONS ─── */}
        <div className="bg-gradient-to-b from-[#0a142c]/95 to-[#060c1a] border border-[#1d325c] rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl">
          
          {/* Bet Amount Row */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[#A8B9DE]">
              <span className="uppercase tracking-wider">Bet Amount</span>
              <span>Min: ₹10 | Max: ₹50,000</span>
            </div>

            {/* Stepper + Input */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              
              {/* Numeric Input with Stepper */}
              <div className="sm:col-span-6 flex items-center bg-[#060c18] border border-[#1b2b4d] rounded-2xl p-1.5 focus-within:border-[#00D9FF] transition-colors">
                <span className="px-3.5 text-[#00D9FF] font-black text-lg">₹</span>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={isProcessing}
                  placeholder="100"
                  className="w-full bg-transparent text-white font-black text-lg focus:outline-none disabled:opacity-50"
                />
                
                {/* Stepper Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStepAmount(-10)}
                    disabled={isProcessing}
                    className="w-8 h-8 rounded-xl bg-[#101E3D] hover:bg-[#182C5A] text-slate-300 font-black flex items-center justify-center cursor-pointer transition-all border border-[#22396E] disabled:opacity-40"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepAmount(10)}
                    disabled={isProcessing}
                    className="w-8 h-8 rounded-xl bg-[#101E3D] hover:bg-[#182C5A] text-slate-300 font-black flex items-center justify-center cursor-pointer transition-all border border-[#22396E] disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Chips */}
              <div className="sm:col-span-6 grid grid-cols-6 gap-1.5">
                {[10, 25, 50, 100, 250, 500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    disabled={isProcessing}
                    className="py-2.5 rounded-xl bg-[#091329] hover:bg-[#122349] text-xs font-black text-[#A8B9DE] hover:text-white transition-all border border-[#1b2b4d] cursor-pointer disabled:opacity-40"
                  >
                    ₹{val}
                  </button>
                ))}
              </div>

            </div>

            {/* Multiplier Quick Chips: 2X, Half, Max */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickAmount('HALF')}
                disabled={isProcessing}
                className="flex-1 py-1.5 rounded-xl bg-[#091329] hover:bg-[#122349] text-[11px] font-bold text-[#A8B9DE] hover:text-white border border-[#1b2b4d] cursor-pointer disabled:opacity-40"
              >
                ½ HALF
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount('2X')}
                disabled={isProcessing}
                className="flex-1 py-1.5 rounded-xl bg-[#091329] hover:bg-[#122349] text-[11px] font-bold text-[#A8B9DE] hover:text-white border border-[#1b2b4d] cursor-pointer disabled:opacity-40"
              >
                2X DOUBLE
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount('MAX')}
                disabled={isProcessing}
                className="flex-1 py-1.5 rounded-xl bg-[#091329] hover:bg-[#122349] text-[11px] font-bold text-[#00D9FF] border border-[#1b2b4d] cursor-pointer disabled:opacity-40"
              >
                MAX BET
              </button>
            </div>
          </div>

          {/* TWO LARGE PREDICTION BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            {/* UP BUTTON (Higher Card) */}
            <button
              type="button"
              onClick={() => handlePlayPrediction('UP')}
              disabled={isProcessing}
              className={`relative p-5 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-1.5 overflow-hidden cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedChoice === 'UP'
                  ? 'bg-gradient-to-b from-[#287BFF]/30 via-[#00D9FF]/30 to-[#08152e] border-[#00D9FF] text-white shadow-[0_0_35px_rgba(0,217,255,0.5)] scale-[1.02]'
                  : 'bg-gradient-to-b from-[#0c1a3b] to-[#070f24] border-[#22396E] hover:border-[#00D9FF]/70 text-slate-200 hover:text-white hover:shadow-[0_0_20px_rgba(0,217,255,0.25)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <ArrowUp className="w-6 h-6 text-[#00D9FF] stroke-[3]" />
                <span className="text-xl sm:text-2xl font-black tracking-wider text-white">UP</span>
              </div>
              <span className="text-xs text-[#A8B9DE] font-semibold">Higher Card Rank</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 text-[10px] font-black uppercase">
                Payout: 2.00x
              </span>

              {/* Glowing Corner Badge */}
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#00D9FF] opacity-60" />
            </button>

            {/* DOWN BUTTON (Lower Card) */}
            <button
              type="button"
              onClick={() => handlePlayPrediction('DOWN')}
              disabled={isProcessing}
              className={`relative p-5 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-1.5 overflow-hidden cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedChoice === 'DOWN'
                  ? 'bg-gradient-to-b from-[#873BFF]/30 via-[#FF3FA4]/30 to-[#08152e] border-[#FF3FA4] text-white shadow-[0_0_35px_rgba(255,63,164,0.5)] scale-[1.02]'
                  : 'bg-gradient-to-b from-[#1a0f33] to-[#070f24] border-[#362254] hover:border-[#FF3FA4]/70 text-slate-200 hover:text-white hover:shadow-[0_0_20px_rgba(255,63,164,0.25)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <ArrowDown className="w-6 h-6 text-[#FF3FA4] stroke-[3]" />
                <span className="text-xl sm:text-2xl font-black tracking-wider text-white">DOWN</span>
              </div>
              <span className="text-xs text-[#A8B9DE] font-semibold">Lower Card Rank</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF3FA4]/20 text-[#FF3FA4] border border-[#FF3FA4]/40 text-[10px] font-black uppercase">
                Payout: 2.00x
              </span>

              {/* Glowing Corner Badge */}
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF3FA4] opacity-60" />
            </button>

          </div>

        </div>

        {/* ─── GAME HISTORY SECTION ─── */}
        <div className="bg-[#081226]/90 border border-[#1b2b4d] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00D9FF]" />
              <h3 className="text-sm sm:text-base font-black text-white">Recent HILO Rounds</h3>
            </div>
            <button
              onClick={fetchHistory}
              className="text-xs font-bold text-[#00D9FF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {history.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#7285AE]">
              No previous rounds found. Place your first bet to start building your prediction history!
            </div>
          ) : (
            <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[#7285AE] font-bold">
                    <th className="py-2.5 px-3">Round ID</th>
                    <th className="py-2.5 px-3">Card</th>
                    <th className="py-2.5 px-3">Choice</th>
                    <th className="py-2.5 px-3">Next Card</th>
                    <th className="py-2.5 px-3">Bet</th>
                    <th className="py-2.5 px-3">Result</th>
                    <th className="py-2.5 px-3 text-right">P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {history.slice(0, 10).map((item) => {
                    const isWin = item.result === 'WIN';
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors font-medium">
                        <td className="py-3 px-3 font-mono text-[11px] text-[#A8B9DE]">
                          #{item.roundId.replace('HILO-', '')}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">
                          {item.currentCard}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              item.choice === 'UP'
                                ? 'bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/30'
                                : 'bg-[#FF3FA4]/15 text-[#FF3FA4] border border-[#FF3FA4]/30'
                            }`}
                          >
                            {item.choice || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-white">
                          {item.nextCard || '-'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          ₹{item.betAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              isWin
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {item.result}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-mono font-bold ${
                            isWin ? 'text-[#00E5A0]' : 'text-[#FF416C]'
                          }`}
                        >
                          {isWin ? `+₹${item.profit.toFixed(2)}` : `-₹${Math.abs(item.profit).toFixed(2)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* ─── HOW TO PLAY MODAL ─── */}
      <AnimatePresence>
        {showHowToPlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-gradient-to-b from-[#0e1b38] to-[#081024] border border-[#22396E] rounded-3xl p-6 shadow-2xl text-left space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">♠</span>
                  <h3 className="text-lg font-black text-white">How HILO Works</h3>
                </div>
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-[#A8B9DE] leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
                <p>
                  HILO is a fast-paced card prediction game using a standard 52-card deck.
                </p>

                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-200">
                  <li><strong>Choose your bet amount</strong> (min ₹10, max ₹50,000).</li>
                  <li><strong>Select ↑ UP</strong> if you think the next card rank will be higher than the current card.</li>
                  <li><strong>Select ↓ DOWN</strong> if you think the next card rank will be lower than the current card.</li>
                  <li>The next card is drawn and revealed.</li>
                  <li><strong>Correct prediction</strong> = WIN (2.00x Payout, net profit equal to bet).</li>
                  <li><strong>Incorrect prediction</strong> = Lose your bet.</li>
                  <li><strong>Same Rank</strong> = LOSS (complete bet amount is lost).</li>
                </ol>

                <div className="bg-[#050b1a] border border-[#1b2b4d] rounded-2xl p-3 space-y-2">
                  <span className="text-white font-bold block text-[11px] uppercase tracking-wider">
                    Rank Hierarchy:
                  </span>
                  <p className="font-mono text-[11px] text-[#00D9FF]">
                    2 &lt; 3 &lt; 4 &lt; 5 &lt; 6 &lt; 7 &lt; 8 &lt; 9 &lt; 10 &lt; J (11) &lt; Q (12) &lt; K (13) &lt; A (14)
                  </p>
                </div>

                <div className="bg-[#050b1a] border border-[#1b2b4d] rounded-2xl p-3 space-y-1.5">
                  <span className="text-white font-bold block text-[11px] uppercase tracking-wider">
                    Quick Examples:
                  </span>
                  <ul className="space-y-1 font-mono text-[11px]">
                    <li className="text-emerald-400">8 → K with UP prediction = <strong>WIN (+₹100)</strong></li>
                    <li className="text-emerald-400">K → 5 with DOWN prediction = <strong>WIN (+₹100)</strong></li>
                    <li className="text-rose-400">Q → Q with UP or DOWN = <strong>LOSS (Same Rank)</strong></li>
                  </ul>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowHowToPlay(false)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#287BFF] to-[#00D9FF] text-[#050B20] font-black text-sm uppercase tracking-wider shadow-lg hover:brightness-110 cursor-pointer transition-all"
                >
                  Got It, Let&apos;s Play!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── FULL HISTORY MODAL ─── */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-gradient-to-b from-[#0e1b38] to-[#081024] border border-[#22396E] rounded-3xl p-6 shadow-2xl text-left space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#00D9FF]" />
                  <h3 className="text-lg font-black text-white">Full HILO Round History</h3>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[#7285AE]">No rounds recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((item) => {
                      const isWin = item.result === 'WIN';
                      return (
                        <div
                          key={item.id}
                          className="bg-[#060c18] border border-white/5 p-3 rounded-2xl flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                                isWin
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {isWin ? 'W' : 'L'}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-white font-mono">
                                #{item.roundId}
                              </span>
                              <span className="text-[11px] text-[#7285AE]">
                                {item.currentCard} → {item.nextCard || '?'} ({item.choice})
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col text-right">
                            <span className={`font-mono font-black ${isWin ? 'text-[#00E5A0]' : 'text-[#FF416C]'}`}>
                              {isWin ? `+₹${item.profit.toFixed(2)}` : `-₹${Math.abs(item.profit).toFixed(2)}`}
                            </span>
                            <span className="text-[10px] text-[#7285AE]">
                              Bet: ₹{item.betAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── VALIDATION / INSUFFICIENT BALANCE ERROR MODAL ─── */}
      {validationModal && (
        <ValidationErrorModal
          isOpen={validationModal.isOpen}
          type={validationModal.type}
          message={validationModal.message}
          requiredAmount={validationModal.requiredAmount}
          minBet={validationModal.minBet}
          maxBet={validationModal.maxBet}
          currentBalance={validationModal.currentBalance}
          onClose={() => setValidationModal(null)}
        />
      )}

    </div>
  );
}
