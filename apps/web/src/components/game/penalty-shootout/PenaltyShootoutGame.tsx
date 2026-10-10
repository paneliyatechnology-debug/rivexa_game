'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  HelpCircle,
  Trophy,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Globe,
  Shuffle,
  History,
  Shield,
  RotateCw,
} from 'lucide-react';
import { usePenaltyShootout, TEAM_LIST, DIFFICULTY_MULTIPLIERS } from '@/hooks/usePenaltyShootout';
import { useAuth } from '@/context/AuthContext';
import ValidationErrorModal, { ValidationErrorType } from '@/components/ValidationErrorModal';
import { Penalty3DScene } from './Penalty3DScene';
import { CountrySelectionModal, FULL_COUNTRY_LIST, type Country } from './CountrySelectionModal';
import { FairnessDialog } from './FairnessDialog';
import { GameHistoryPanel } from './GameHistoryPanel';
import { BuyBonusModal } from './BuyBonusModal';
import { BonusWinModal } from './BonusWinModal';
import { BigWinModal, type WinType } from './BigWinModal';

const GoldCoinIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} inline-block shrink-0`} aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="7.5" fill="none" stroke="#d97706" strokeWidth="1" strokeDasharray="2 2" />
    <text x="12" y="16" fontSize="11" fontWeight="bold" textAnchor="middle" fill="#78350f" fontFamily="sans-serif">$</text>
  </svg>
);

export default function PenaltyShootoutGame() {
  const { user, balance, refreshBalance } = useAuth();
  const {
    roundState,
    isLoading,
    isKicking,
    lastWinAmount,
    history,
    startRound,
    shoot,
    cashout,
  } = usePenaltyShootout();

  const roundStateRef = useRef(roundState);
  roundStateRef.current = roundState;

  const pendingShotResultRef = useRef<any>(null);

  // Local Controls State - defaults matching reference screenshot
  const [betAmount, setBetAmount] = useState<string>('100');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'HARDCORE'>('HARD');

  // Full Country objects (use FULL_COUNTRY_LIST for proper type)
  const [homeTeam, setHomeTeam] = useState<Country>(
    FULL_COUNTRY_LIST.find((c) => c.code === 'BR') || FULL_COUNTRY_LIST[0],
  );
  const [awayTeam, setAwayTeam] = useState<Country>(
    FULL_COUNTRY_LIST.find((c) => c.code === 'AR') || FULL_COUNTRY_LIST[1],
  );

  const [isSoundOn, setIsSoundOn] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showTeamModal, setShowTeamModal] = useState<boolean>(false);
  const [showBuyBonusModal, setShowBuyBonusModal] = useState<boolean>(false);
  const [showFairness, setShowFairness] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Buy Bonus state matching video 01:36 - 02:16
  const [bonusState, setBonusState] = useState<{
    isActive: boolean;
    tier: 'EASY' | 'MEDIUM' | 'HARD';
    totalShots: number;
    remainingShots: number;
    accumulatedWinnings: number;
    accumulatedMultiplier: number;
  } | null>(null);

  const [bonusWinOverlay, setBonusWinOverlay] = useState<{
    isOpen: boolean;
    payout: number;
    multiplier: number;
  } | null>(null);

  // Auto-show country modal on first load if preference not set
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hidden = localStorage.getItem('penalty_hide_country_modal');
      if (!hidden) {
        // Slight delay so the 3D scene loads first
        const timer = setTimeout(() => setShowTeamModal(true), 800);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // 3D Animation Flight State (Supports exact custom net targeting anywhere)
  const [animatingShot, setAnimatingShot] = useState<{
    targetSpot: number;
    customTarget?: { x: number; y: number; z: number };
    keeperSpot: number;
    isGoal: boolean;
    step: 'IDLE' | 'KICKING' | 'RESULT';
  }>({ targetSpot: 3, keeperSpot: 3, isGoal: false, step: 'IDLE' });

  // Big Win / Celebration Overlay State
  const [bigWinOverlay, setBigWinOverlay] = useState<{
    isOpen: boolean;
    type: 'big' | 'mega' | 'epic' | 'legendary';
    multiplier: number;
    payout: number;
  } | null>(null);

  // Result Banner message (Goal / Saved)
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'GOAL' | 'SAVED' | 'CASHOUT';
    text: string;
    subtext?: string;
  } | null>(null);

  // Validation modal state
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    type: ValidationErrorType;
    message: string;
    requiredAmount?: number;
    currentBalance?: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Synthesized realistic audio using Web Audio API
  const playSound = (type: 'kick' | 'goal' | 'save' | 'cashout' | 'whistle' | 'click') => {
    if (!isSoundOn || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'kick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.7, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } else if (type === 'goal') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.2, ctx.currentTime + 0.5);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.05);
          osc.stop(ctx.currentTime + 0.6);
        });
      } else if (type === 'save') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(45, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'cashout') {
        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
          gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.07 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.07);
          osc.stop(ctx.currentTime + idx * 0.07 + 0.25);
        });
      } else if (type === 'whistle') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2600, ctx.currentTime);
        osc.frequency.setValueAtTime(2800, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(2600, ctx.currentTime + 0.14);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch {}
  };

  const handleStartGame = async () => {
    playSound('whistle');
    const amt = parseFloat(betAmount || '0');

    if (!user || !user.id) {
      setValidationModal({
        isOpen: true,
        type: 'AUTH_REQUIRED',
        message: 'Please log in to place real bets in Penalty Nations Cup.',
      });
      return;
    }

    if (isNaN(amt) || amt <= 0) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Minimum bet amount is $1.00.',
        requiredAmount: 1.0,
      });
      return;
    }

    if (balance <= 0 || amt > balance) {
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: `Your balance ($${balance.toFixed(2)}) is insufficient for a $${amt.toFixed(2)} bet.`,
        requiredAmount: amt,
        currentBalance: balance,
      });
      return;
    }

    setBannerMessage(null);
    setBigWinOverlay(null);

    try {
      await startRound(amt, selectedDifficulty, homeTeam.name, awayTeam.name);
    } catch (err: any) {
      setValidationModal({
        isOpen: true,
        type: 'GAME_ERROR',
        message: err.message || 'Failed to start round.',
      });
    }
  };

  const handleShotImpact = (isGoal: boolean) => {
    const result = pendingShotResultRef.current;
    if (isGoal) {
      playSound('goal');
      const mult = result?.multiplier || roundStateRef.current.currentMultiplier;
      setBannerMessage({
        type: 'GOAL',
        text: 'GOAL!',
        subtext: mult > 0 ? `${mult.toFixed(2)}x MULTIPLIER UNLOCKED` : 'MULTIPLIER UNLOCKED',
      });

      // Track Bonus Accumulation if in Bonus Mode
      if (bonusState?.isActive && result) {
        const nextRemaining = bonusState.remainingShots - 1;
        const newWinnings = bonusState.accumulatedWinnings + Number(betAmount) * result.multiplier;
        const newMult = bonusState.accumulatedMultiplier + result.multiplier;
        setBonusState({
          ...bonusState,
          remainingShots: nextRemaining,
          accumulatedWinnings: newWinnings,
          accumulatedMultiplier: newMult,
        });

        if (nextRemaining <= 0) {
          setTimeout(() => {
            setBonusWinOverlay({
              isOpen: true,
              payout: newWinnings,
              multiplier: newMult,
            });
            setBonusState(null);
          }, 1200);
        }
      }

      // Check for big win
      if (!bonusState?.isActive && result && (result.shotNumber >= 3 || result.multiplier >= 5)) {
        setTimeout(() => {
          playSound('cashout');
          const winType: WinType =
            result.shotNumber === 5 || result.multiplier >= 50
              ? 'legendary'
              : result.shotNumber === 4 || result.multiplier >= 20
              ? 'epic'
              : result.multiplier >= 10
              ? 'mega'
              : 'big';
          setBigWinOverlay({
            isOpen: true,
            type: winType,
            multiplier: result.multiplier,
            payout: result.potentialPayout,
          });
        }, 400);
      }
    } else {
      playSound('save');
      setBannerMessage({
        type: 'SAVED',
        text: 'SAVED!',
        subtext: 'The Goalkeeper blocked your shot!',
      });
    }
  };

  const handleShotComplete = () => {
    pendingShotResultRef.current = null;
    setAnimatingShot((prev) => ({ ...prev, step: 'IDLE' }));
    setBannerMessage(null);
  };

  const handleShootSpot = async (
    spotId: number,
    customTarget?: { x: number; y: number; z: number },
    overrideRoundId?: string,
  ) => {
    const isRoundLive = overrideRoundId || roundStateRef.current.status === 'ACTIVE';
    if (!isRoundLive || isKicking || animatingShot.step !== 'IDLE') return;

    playSound('kick');

    // 1. Kick animation towards selected spot or custom net coordinate
    setAnimatingShot({
      targetSpot: spotId,
      customTarget,
      keeperSpot: 3,
      isGoal: false,
      step: 'KICKING',
    });

    try {
      const result = await shoot(spotId, overrideRoundId);
      pendingShotResultRef.current = result;

      // 2. Authoritative server result received — update goalkeeper dive and flight outcome
      setAnimatingShot({
        targetSpot: spotId,
        customTarget,
        keeperSpot: result.keeperSpot,
        isGoal: result.isGoal,
        step: 'RESULT',
      });
    } catch (err: any) {
      setAnimatingShot((prev) => ({ ...prev, step: 'IDLE' }));
      pendingShotResultRef.current = null;
      setValidationModal({
        isOpen: true,
        type: 'GAME_ERROR',
        message: err.message || 'Failed to execute penalty kick.',
      });
    }
  };

  // Seamless 1-click trigger: starts round automatically if idle, then kicks to target
  const handleTargetClick = async (
    spotId: number,
    customTarget?: { x: number; y: number; z: number },
  ) => {
    if (isKicking || animatingShot.step !== 'IDLE') return;

    if (roundStateRef.current.status !== 'ACTIVE') {
      if (!user || !user.id) {
        setValidationModal({
          isOpen: true,
          type: 'AUTH_REQUIRED',
          message: 'Please log in to place real bets in Penalty Nations Cup.',
        });
        return;
      }

      const amt = parseFloat(betAmount || '100');
      if (isNaN(amt) || amt <= 0) return;
      if (balance !== null && balance < amt) {
        setValidationModal({
          isOpen: true,
          type: 'INSUFFICIENT_BALANCE',
          message: `Your balance ($${balance.toFixed(2)}) is insufficient for a $${amt.toFixed(2)} bet.`,
          requiredAmount: amt,
          currentBalance: balance,
        });
        return;
      }
      setBannerMessage(null);
      setBigWinOverlay(null);
      try {
        const roundData = await startRound(amt, selectedDifficulty, homeTeam.name, awayTeam.name);
        await handleShootSpot(spotId, customTarget, roundData?.roundId);
      } catch (err: any) {
        setValidationModal({
          isOpen: true,
          type: 'GAME_ERROR',
          message: err.message || 'Failed to start round.',
        });
      }
    } else {
      await handleShootSpot(spotId, customTarget);
    }
  };

  const handleCashout = async () => {
    if (roundStateRef.current.status !== 'ACTIVE' || roundStateRef.current.currentStep < 1) return;

    playSound('cashout');
    try {
      const res = await cashout();
      setBannerMessage({
        type: 'CASHOUT',
        text: 'CLAIMED!',
        subtext: `Won $${(res.payout || roundStateRef.current.potentialPayout).toFixed(2)} (${roundStateRef.current.currentMultiplier.toFixed(2)}x)`,
      });

      if (roundStateRef.current.currentMultiplier >= 3) {
        const mult = roundStateRef.current.currentMultiplier;
        const winType: WinType =
          mult >= 50
            ? 'legendary'
            : mult >= 20
            ? 'epic'
            : mult >= 10
            ? 'mega'
            : 'big';
        setBigWinOverlay({
          isOpen: true,
          type: winType,
          multiplier: mult,
          payout: res.payout || roundStateRef.current.potentialPayout,
        });
      }
    } catch (err: any) {
      setValidationModal({
        isOpen: true,
        type: 'GAME_ERROR',
        message: err.message || 'Failed to claim winnings.',
      });
    }
  };

  const handleRandomShoot = () => {
    if (isKicking || animatingShot.step !== 'IDLE') return;
    const maxSpots = selectedDifficulty === 'EASY' ? 4 : selectedDifficulty === 'MEDIUM' ? 5 : 8;
    const randomSpot = Math.floor(1 + Math.random() * maxSpots);
    handleTargetClick(randomSpot);
  };

  // Keyboard Spacebar Shoot (Directly inspired by reference Penalty Nations Cup game)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          if (!isKicking && animatingShot.step === 'IDLE' && !bigWinOverlay?.isOpen) {
            handleRandomShoot();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isKicking, animatingShot.step, bigWinOverlay?.isOpen, roundState.status, balance, betAmount]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const activeMultipliers =
    DIFFICULTY_MULTIPLIERS[roundState.status === 'ACTIVE' ? roundState.difficulty : selectedDifficulty] ||
    DIFFICULTY_MULTIPLIERS.HARD;

  const diffNames: ('EASY' | 'MEDIUM' | 'HARD' | 'HARDCORE')[] = ['EASY', 'MEDIUM', 'HARD', 'HARDCORE'];

  const cycleDifficulty = (direction: 'up' | 'down') => {
    if (roundState.status === 'ACTIVE') return;
    playSound('click');
    const currIdx = diffNames.indexOf(selectedDifficulty);
    let nextIdx = direction === 'up' ? currIdx + 1 : currIdx - 1;
    if (nextIdx >= diffNames.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = diffNames.length - 1;
    setSelectedDifficulty(diffNames[nextIdx]);
  };

  const adjustBet = (direction: 'up' | 'down') => {
    if (roundState.status === 'ACTIVE') return;
    playSound('click');
    const curr = parseFloat(betAmount || '100');
    const delta = curr >= 100 ? 50 : curr >= 10 ? 10 : 1;
    const nextVal = direction === 'up' ? curr + delta : Math.max(1, curr - delta);
    setBetAmount(nextVal.toString());
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen h-[100dvh] max-h-[100dvh] bg-[#07190d] text-white flex flex-col font-sans select-none overflow-hidden overscroll-none"
    >
      {/* ── TOP HEADER (Penalty Nations Cup branded) ── */}
      <header className="relative z-30 flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 bg-black/40 backdrop-blur-md border-b border-white/10 shrink-0">
        {/* Left: Official Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="relative h-6 sm:h-8 w-28 sm:w-56">
            <Image
              src="/assets/penalty-nations-cup/logo_b_penalty_nations_cup.png"
              alt="Penalty Nations Cup"
              fill
              className="object-contain object-left drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              priority
            />
          </div>
        </div>

        {/* Right Tools & Balance */}
        <div className="flex items-center space-x-1 sm:space-x-2.5">
          {/* History Button */}
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold transition border border-white/15 text-slate-200"
            title="Game History"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">History</span>
          </button>

          {/* Provably Fair Button */}
          <button
            onClick={() => setShowFairness(true)}
            className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold transition border border-white/15 text-slate-200"
            title="Provably Fair Verification"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Fairness</span>
          </button>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold transition border border-white/15"
            title="How to Play"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">How to play?</span>
          </button>

          {/* Balance Pill */}
          <div className="flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-black/70 border border-white/20 shadow-inner">
            <span className="text-xs sm:text-sm font-black text-white tracking-wide">
              {balance ? balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '995 088'}
            </span>
            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[9px] sm:text-[10px]">
              $
            </span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1 sm:p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition text-gray-300"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setIsSoundOn(!isSoundOn)}
            className="p-1 sm:p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition text-gray-300"
            title="Toggle Sound"
          >
            {isSoundOn ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />}
          </button>
        </div>
      </header>

      {/* ── TOP MULTIPLIER ROAD RUNNER (Exact match to Nations Cup layout) ── */}
      <div className="relative z-20 w-full py-1 sm:py-2 px-2 sm:px-4 shrink-0 bg-gradient-to-b from-black/60 via-black/20 to-transparent">
        <div className="max-w-4xl mx-auto flex items-center justify-between relative px-1 sm:px-2">
          {/* Scroll arrow left */}
          <button className="text-white/40 hover:text-white transition p-0.5 sm:p-1">
            <ChevronUp className="-rotate-90 w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Curved Runner Track */}
          <div className="relative flex-1 mx-2 sm:mx-4 flex items-center justify-between">
            {/* Background connecting track */}
            <div className="absolute top-1/2 left-0 right-0 h-2.5 sm:h-3 bg-white/20 border border-white/30 rounded-full -translate-y-1/2" />

            {/* Glowing Green Progress Fill */}
            <div
              className="absolute top-1/2 left-0 h-2.5 sm:h-3 bg-gradient-to-r from-emerald-500 via-lime-400 to-green-400 rounded-full -translate-y-1/2 transition-all duration-500 shadow-[0_0_12px_rgba(74,222,128,0.8)]"
              style={{
                width: `${Math.min(100, (roundState.currentStep / 5) * 100)}%`,
              }}
            />

            {/* Step 0: Starting Ball Node */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/80 border-2 border-white/60 flex items-center justify-center shadow-lg">
                <Image
                  src="/assets/penalty-nations-cup/item_ball.png"
                  alt="Ball"
                  width={16}
                  height={16}
                  className="object-contain"
                />
              </div>
              <span className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs font-black italic tracking-wide text-blue-300 drop-shadow">
                X0
              </span>
            </div>

            {/* Steps 1 to 5: Multiplier Nodes */}
            {activeMultipliers.map((mult, idx) => {
              const stepNum = idx + 1;
              const isCleared = roundState.currentStep >= stepNum;
              const isCurrent = roundState.currentStep === stepNum;

              return (
                <div key={idx} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-[10px] sm:text-xs transition-all duration-300 ${
                      isCleared
                        ? 'bg-lime-400 text-slate-950 border-2 border-white shadow-[0_0_15px_rgba(163,230,53,1)] scale-110'
                        : 'bg-white text-slate-900 border-2 border-white/50 shadow-md'
                    }`}
                  >
                    {isCleared && isCurrent ? (
                      <Image
                        src="/assets/penalty-nations-cup/item_ball.png"
                        alt="Ball"
                        width={14}
                        height={14}
                        className="object-contain"
                      />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-950" />
                    )}
                  </div>
                  <span
                    className={`mt-0.5 sm:mt-1 text-[10px] sm:text-xs font-black italic tracking-wider transition ${
                      isCleared ? 'text-lime-300 scale-105 drop-shadow-[0_0_8px_rgba(163,230,53,0.8)]' : 'text-blue-200'
                    }`}
                  >
                    X{mult.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Scroll arrow right */}
          <button className="text-white/40 hover:text-white transition p-0.5 sm:p-1">
            <ChevronDown className="-rotate-90 w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* ── MAIN 3D STADIUM ARENA (Three.js WebGL Engine) ── */}
      <main className="relative flex-1 w-full min-h-0 flex flex-col items-center justify-center overflow-hidden">
        
        {/* Full 3D Three.js WebGL Scene */}
        <Penalty3DScene
          difficulty={roundState.status === 'ACTIVE' ? roundState.difficulty : selectedDifficulty}
          isRoundActive={roundState.status === 'ACTIVE'}
          isKicking={isKicking}
          animatingShot={animatingShot}
          onShootSpot={handleTargetClick}
          onBallClick={handleRandomShoot}
          onShotImpact={handleShotImpact}
          onShotComplete={handleShotComplete}
          soundEnabled={isSoundOn}
        />

        {/* Nations Cup Match Badge (Top-Left of Goal): e.g. Brazil 🇧🇷 VS Curaçao 🇨🇼 */}
        <div className="absolute top-1.5 sm:top-2 left-2 sm:left-10 z-20">
          <button
            disabled={roundState.status === 'ACTIVE'}
            onClick={() => setShowTeamModal(true)}
            className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-black/60 border border-white/20 shadow-xl backdrop-blur-md hover:scale-105 active:scale-95 transition disabled:opacity-50"
            title="Change Match Teams"
          >
            <span className="text-lg sm:text-2xl drop-shadow">{homeTeam.flag}</span>
            <span className="text-[10px] sm:text-xs font-black italic text-gray-200">VS</span>
            <span className="text-lg sm:text-2xl drop-shadow">{awayTeam.flag}</span>
          </button>
        </div>

        {/* ── GOAL / SAVED BANNER CELEBRATION ── */}
        <AnimatePresence>
          {bannerMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: -30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 z-40 flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className={`px-10 py-6 rounded-3xl border-2 flex flex-col items-center text-center backdrop-blur-md ${
                  bannerMessage.type === 'GOAL' || bannerMessage.type === 'CASHOUT'
                    ? 'bg-gradient-to-b from-emerald-900/95 via-emerald-950/95 to-slate-950/95 border-lime-400 text-lime-300 shadow-[0_10px_35px_rgba(74,222,128,0.5)]'
                    : 'bg-gradient-to-b from-rose-900/95 via-red-950/95 to-slate-950/95 border-rose-500 text-rose-300 shadow-[0_10px_35px_rgba(244,63,94,0.5)]'
                }`}
              >
                <h2 className="text-5xl sm:text-6xl font-black italic uppercase tracking-wider drop-shadow-xl">
                  {bannerMessage.text}
                </h2>
                {bannerMessage.subtext && (
                  <p className="mt-2 text-sm sm:text-base font-extrabold text-white tracking-widest uppercase">
                    {bannerMessage.subtext}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BIG / MEGA / EPIC / LEGENDARY WIN FULLSCREEN OVERLAY ── */}
        {bigWinOverlay && (
          <BigWinModal
            isOpen={bigWinOverlay.isOpen}
            onClose={() => setBigWinOverlay(null)}
            winType={bigWinOverlay.type}
            multiplier={bigWinOverlay.multiplier}
            payout={bigWinOverlay.payout}
          />
        )}
      </main>

      {/* ── BOTTOM CONTROLS DOCK ── */}
      <footer className="absolute bottom-0 inset-x-0 z-30 w-full px-2 sm:px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-3 pt-0 flex justify-center pointer-events-none">
        {/* DESKTOP / TABLET DOCK (Single row with central ball cradle) */}
        <div className="hidden sm:flex relative w-full max-w-3xl items-center justify-between bg-[#181c17]/95 border border-[#2d352c] rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl pointer-events-auto">
          
          {/* 1. LEFT SECTION: DIFFICULTY & BET */}
          <div className="flex items-center space-x-2">
            {/* DIFFICULTY */}
            <div className="flex items-center justify-between bg-[#222621] border border-white/5 rounded-xl px-3 py-1.5 min-w-[110px]">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">
                  {bonusState?.isActive ? 'BONUS' : 'DIFFICULTY'}
                </span>
                <span className="text-sm font-black text-neutral-200 tracking-wide truncate">
                  {bonusState?.isActive
                    ? `${bonusState.remainingShots} SHOTS`
                    : roundState.status === 'ACTIVE'
                    ? roundState.difficulty
                    : selectedDifficulty}
                </span>
              </div>
              {!bonusState?.isActive && (
                <div className="flex flex-col ml-2">
                  <button
                    disabled={roundState.status === 'ACTIVE'}
                    onClick={() => cycleDifficulty('up')}
                    className="text-neutral-400 hover:text-white disabled:opacity-30 p-0.5 cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={roundState.status === 'ACTIVE'}
                    onClick={() => cycleDifficulty('down')}
                    className="text-neutral-400 hover:text-white disabled:opacity-30 p-0.5 cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* BET */}
            <div className="flex items-center justify-between bg-[#222621] border border-white/5 rounded-xl px-3 py-1.5 min-w-[110px]">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">
                  BET
                </span>
                <div className="flex items-center space-x-1 mt-0.5">
                  <GoldCoinIcon className="w-3.5 h-3.5" />
                  <input
                    type="text"
                    disabled={roundState.status === 'ACTIVE'}
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="w-14 bg-transparent text-sm font-black text-neutral-100 outline-none disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex flex-col ml-2">
                <button
                  disabled={roundState.status === 'ACTIVE'}
                  onClick={() => adjustBet('up')}
                  className="text-neutral-400 hover:text-white disabled:opacity-30 p-0.5 cursor-pointer"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={roundState.status === 'ACTIVE'}
                  onClick={() => adjustBet('down')}
                  className="text-neutral-400 hover:text-white disabled:opacity-30 p-0.5 cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. CENTER BALL CRADLE */}
          <div
            onClick={handleRandomShoot}
            className="relative flex-1 min-w-[80px] max-w-[110px] h-12 flex items-center justify-center cursor-pointer pointer-events-auto mx-1"
            title="Click or drag ball to shoot"
          >
            <div className="absolute inset-x-1 bottom-0 h-9 border-b-2 border-lime-400/40 rounded-b-full bg-black/50 pointer-events-none shadow-inner" />
          </div>

          {/* 3. RIGHT SECTION: CLAIM & LAST WIN */}
          <div className="flex items-center space-x-2">
            {/* CLAIM BUTTON */}
            {roundState.status === 'ACTIVE' && roundState.currentStep >= 1 ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCashout}
                className="relative flex flex-col items-center justify-center bg-gradient-to-r from-[#65a30d] via-[#78b820] to-[#84cc16] text-slate-950 font-black px-7 py-1.5 rounded-2xl shadow-[0_0_20px_rgba(112,183,29,0.8)] border border-lime-300 cursor-pointer animate-pulse min-w-[95px]"
              >
                <span className="text-xs font-black tracking-wider uppercase">
                  CLAIM
                </span>
                <div className="flex items-center space-x-1">
                  <GoldCoinIcon className="w-3.5 h-3.5" />
                  <span className="text-sm font-black text-slate-950">
                    {roundState.potentialPayout.toFixed(0)}
                  </span>
                </div>
              </motion.button>
            ) : roundState.status === 'ACTIVE' ? (
              <button
                disabled
                className="flex flex-col items-center justify-center bg-[#222621]/80 text-neutral-500 border border-white/5 px-6 py-1.5 rounded-2xl cursor-not-allowed min-w-[90px]"
              >
                <span className="text-xs font-bold uppercase">CLAIM</span>
                <div className="flex items-center space-x-1">
                  <GoldCoinIcon className="w-2.5 h-2.5 opacity-40" />
                  <span className="text-xs font-bold opacity-40">0</span>
                </div>
              </button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStartGame}
                disabled={isLoading}
                className="flex flex-col items-center justify-center bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 font-black px-6 py-1.5 rounded-2xl shadow-lg shadow-emerald-500/30 border border-emerald-300 cursor-pointer min-w-[90px]"
              >
                <span className="text-xs font-black tracking-wider uppercase">
                  START / KICK
                </span>
                <div className="flex items-center space-x-1">
                  <ArrowRight className="w-3 h-3" />
                </div>
              </motion.button>
            )}

            {/* LAST WIN */}
            <div className="flex flex-col items-start bg-[#222621] border border-white/5 rounded-xl px-3 py-1.5 min-w-[95px]">
              <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">
                LAST WIN
              </span>
              <div className="flex items-center space-x-1 mt-0.5">
                <GoldCoinIcon className="w-3.5 h-3.5" />
                <span className="text-sm font-black text-neutral-100">
                  {lastWinAmount > 0
                    ? lastWinAmount >= 1000
                      ? `${(lastWinAmount / 1000).toFixed(2)}k`
                      : lastWinAmount.toFixed(0)
                    : '10.06k'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE DOCK: Compact 2-Row Ergonomic Layout (Zero scroll, full access) */}
        <div className="flex sm:hidden w-full flex-col gap-1.5 bg-[#181c17]/95 border border-[#2d352c] rounded-2xl p-2 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl pointer-events-auto">
          {/* Row 1: Difficulty Selector & Bet Amount Selector */}
          <div className="flex items-center gap-1.5 w-full">
            {/* DIFFICULTY */}
            <div className="flex-1 flex items-center justify-between bg-[#222621] border border-white/5 rounded-xl px-2.5 py-1 min-h-[38px]">
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[8px] font-bold uppercase text-neutral-400 tracking-wider">
                  {bonusState?.isActive ? 'BONUS' : 'DIFFICULTY'}
                </span>
                <span className="text-xs font-black text-neutral-200 tracking-wide truncate">
                  {bonusState?.isActive
                    ? `${bonusState.remainingShots} SHOTS`
                    : roundState.status === 'ACTIVE'
                    ? roundState.difficulty
                    : selectedDifficulty}
                </span>
              </div>
              {!bonusState?.isActive && (
                <div className="flex items-center ml-1 space-x-0.5">
                  <button
                    disabled={roundState.status === 'ACTIVE'}
                    onClick={() => cycleDifficulty('down')}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-neutral-400 active:text-white disabled:opacity-30 cursor-pointer"
                    aria-label="Decrease Difficulty"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={roundState.status === 'ACTIVE'}
                    onClick={() => cycleDifficulty('up')}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-neutral-400 active:text-white disabled:opacity-30 cursor-pointer"
                    aria-label="Increase Difficulty"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* BET */}
            <div className="flex-1 flex items-center justify-between bg-[#222621] border border-white/5 rounded-xl px-2.5 py-1 min-h-[38px]">
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[8px] font-bold uppercase text-neutral-400 tracking-wider">
                  BET
                </span>
                <div className="flex items-center space-x-1">
                  <GoldCoinIcon className="w-3 h-3" />
                  <input
                    type="text"
                    disabled={roundState.status === 'ACTIVE'}
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="w-12 bg-transparent text-xs font-black text-neutral-100 outline-none disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex items-center ml-1 space-x-0.5">
                <button
                  disabled={roundState.status === 'ACTIVE'}
                  onClick={() => adjustBet('down')}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-neutral-400 active:text-white disabled:opacity-30 cursor-pointer"
                  aria-label="Decrease Bet"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={roundState.status === 'ACTIVE'}
                  onClick={() => adjustBet('up')}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-neutral-400 active:text-white disabled:opacity-30 cursor-pointer"
                  aria-label="Increase Bet"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Primary Action Button (Claim / Start / Kick) & Last Win */}
          <div className="flex items-center gap-1.5 w-full">
            {/* Primary Action Button */}
            {roundState.status === 'ACTIVE' && roundState.currentStep >= 1 ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCashout}
                className="flex-1 flex items-center justify-between bg-gradient-to-r from-[#65a30d] via-[#78b820] to-[#84cc16] text-slate-950 font-black px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(112,183,29,0.8)] border border-lime-300 cursor-pointer animate-pulse min-h-[40px]"
              >
                <span className="text-xs font-black tracking-wider uppercase">
                  CLAIM
                </span>
                <div className="flex items-center space-x-1">
                  <GoldCoinIcon className="w-3.5 h-3.5" />
                  <span className="text-sm font-black text-slate-950">
                    {roundState.potentialPayout.toFixed(0)}
                  </span>
                </div>
              </motion.button>
            ) : roundState.status === 'ACTIVE' ? (
              <button
                onClick={handleRandomShoot}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black px-4 py-2 rounded-xl shadow-md min-h-[40px] cursor-pointer"
              >
                <Shuffle className="w-4 h-4" />
                <span className="text-xs font-black tracking-wider uppercase">RANDOM SHOOT</span>
              </button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleStartGame}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 font-black px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/30 border border-emerald-300 cursor-pointer min-h-[40px]"
              >
                <span className="text-xs font-black tracking-wider uppercase">
                  START / KICK
                </span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
              </motion.button>
            )}

            {/* Quick Random Shoot / Ball trigger on mobile */}
            {roundState.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={handleRandomShoot}
                className="p-2 rounded-xl bg-[#222621] border border-white/10 text-lime-400 hover:text-white flex items-center justify-center shrink-0 min-h-[40px] min-w-[40px]"
                title="Shoot Random Spot"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            )}

            {/* LAST WIN */}
            <div className="flex flex-col items-start justify-center bg-[#222621] border border-white/5 rounded-xl px-2.5 py-1 min-w-[78px] min-h-[40px]">
              <span className="text-[8px] font-bold uppercase text-neutral-400 tracking-wider">
                LAST WIN
              </span>
              <div className="flex items-center space-x-1">
                <GoldCoinIcon className="w-3 h-3" />
                <span className="text-xs font-black text-neutral-100">
                  {lastWinAmount > 0
                    ? lastWinAmount >= 1000
                      ? `${(lastWinAmount / 1000).toFixed(2)}k`
                      : lastWinAmount.toFixed(0)
                    : '10.06k'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ── HOW TO PLAY MODAL ── */}
      <AnimatePresence>
        {showHowToPlay && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0c1326] border border-cyan-500/30 rounded-3xl p-6 max-w-lg w-full text-white shadow-2xl relative"
            >
              <button
                onClick={() => setShowHowToPlay(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
              <h3 className="text-xl font-black uppercase text-cyan-300 mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                Penalty Nations Cup Rules
              </h3>
              <div className="space-y-3 text-xs text-gray-300 leading-relaxed max-h-96 overflow-y-auto pr-2">
                <p>1. <strong>Select your Difficulty</strong> (Easy, Medium, Hard, Hardcore) and bet amount.</p>
                <p>2. <strong>Pick a 3D Target Ring</strong> on the goal net with your cursor, or click the ball for a random kick.</p>
                <p>3. Scoring a <strong>GOAL</strong> advances your progress and increases the multiplier along the top track.</p>
                <p>4. You can click <strong>CLAIM</strong> after any goal to collect your payout immediately!</p>
                <p>5. If the goalkeeper <strong>SAVES</strong> your shot, the round ends.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── COUNTRY SELECTION MODAL ── */}
      <CountrySelectionModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        selectedHome={homeTeam}
        selectedAway={awayTeam}
        onConfirm={(home: Country, away: Country) => {
          setHomeTeam(home);
          setAwayTeam(away);
        }}
        isRoundActive={roundState.status === 'ACTIVE'}
      />

      {/* ── PROVABLY FAIR DIALOG ── */}
      <FairnessDialog
        isOpen={showFairness}
        onClose={() => setShowFairness(false)}
        roundId={roundState.roundId}
        publicId={roundState.publicId}
        serverSeedHash={roundState.serverSeedHash}
        serverSeed={roundState.serverSeed}
        clientSeed={roundState.clientSeed}
        difficulty={roundState.difficulty}
        status={roundState.status}
        userId={user?.id}
      />

      {/* ── GAME HISTORY PANEL ── */}
      <GameHistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={history.map((h: any, i: number) => ({
          id: h.id || `h-${i}`,
          publicId: h.publicId,
          difficulty: h.difficulty || selectedDifficulty,
          betAmount: Number(h.betAmount || 0),
          currentStep: Number(h.currentStep || 0),
          currentMultiplier: Number(h.currentMultiplier || 0),
          payout: Number(h.payout || 0),
          status: h.status || 'SAVED',
          result: h.result || 'LOSS',
          homeTeam: h.homeTeam || homeTeam.name,
          awayTeam: h.awayTeam || awayTeam.name,
          createdAt: h.createdAt || new Date().toISOString(),
        }))}
      />

      {/* ── BUY BONUS MODAL ── */}
      <BuyBonusModal
        isOpen={showBuyBonusModal}
        onClose={() => setShowBuyBonusModal(false)}
        currentBalance={balance || 10000}
        betAmount={parseFloat(betAmount) || 100}
        onActivateBonus={(tier, shotsCount) => {
          setSelectedDifficulty(tier as any);
          setBonusState({
            isActive: true,
            tier,
            totalShots: shotsCount,
            remainingShots: shotsCount,
            accumulatedWinnings: 0,
            accumulatedMultiplier: 0,
          });
          handleStartGame();
        }}
      />

      {/* ── BONUS WIN GOLDEN GLOVE CELEBRATION ── */}
      <BonusWinModal
        isOpen={bonusWinOverlay?.isOpen || false}
        onClose={() => setBonusWinOverlay(null)}
        payout={bonusWinOverlay?.payout || 0}
        multiplier={bonusWinOverlay?.multiplier || 0}
      />

      {/* Validation error popup modal */}
      {validationModal && (
        <ValidationErrorModal
          isOpen={validationModal.isOpen}
          onClose={() => setValidationModal(null)}
          type={validationModal.type}
          message={validationModal.message}
          requiredAmount={validationModal.requiredAmount}
          currentBalance={validationModal.currentBalance}
        />
      )}
    </div>
  );
}
