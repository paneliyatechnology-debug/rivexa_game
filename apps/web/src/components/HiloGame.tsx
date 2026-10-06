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
  Shield,
  Sparkles,
  Plus,
  Minus,
  X,
  Menu,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  Coins,
  TrendingUp,
  Award,
  Gamepad2,
  Search,
  Bell,
  User,
  Trophy,
  HeartCrack,
  ArrowLeft,
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

export interface HiloPlayItem {
  id?: string;
  sequence: number;
  previousCard: CardData;
  nextCard: CardData;
  choice: 'UP' | 'DOWN' | 'SAME';
  result: 'WIN' | 'LOSS';
  predictionMultiplier: number;
  multiplierAfterPlay: number;
  cashoutAfterPlay: number;
  createdAt: string;
}

export interface HiloSessionItem {
  id: string;
  sessionId: string;
  originalBet: number;
  betAmount?: number;
  payout?: number;
  profit?: number;
  multiplier?: number;
  currentCard: CardData;
  nextCard?: CardData | null;
  choice?: 'UP' | 'DOWN' | 'SAME' | null;
  result?: string;
  currentMultiplier: number;
  finalMultiplier: number;
  highestMultiplier: number;
  cashoutAmount: number;
  status: 'ACTIVE' | 'CASHED_OUT' | 'LOST' | 'COMPLETED' | 'READY';
  predictionsCount: number;
  plays: HiloPlayItem[];
  createdAt: string;
  endedAt?: string | null;
}

export interface ActiveSessionState {
  sessionId: string;
  originalBet: number;
  currentMultiplier: number;
  cashoutMultiplier: number;
  currentCashoutAmount: number;
  upMultiplier: number | null;
  downMultiplier: number | null;
  sameMultiplier: number;
  canUp: boolean;
  canDown: boolean;
  canSame: boolean;
  remainingCardsCount: number;
  status: 'READY' | 'ACTIVE' | 'CASHED_OUT' | 'LOST' | 'IDLE';
  plays: HiloPlayItem[];
}

export default function HiloGame() {
  const { user, balance: authBalance, refreshBalance, loading: authLoading } = useAuth();
  const currentBalance = authBalance !== undefined && authBalance !== null ? authBalance : 0;

  // Sound and mounting
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Betting state
  const [betAmount, setBetAmount] = useState<string>('100');
  const [selectedChoice, setSelectedChoice] = useState<'UP' | 'DOWN' | 'SAME' | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCardFlipping, setIsCardFlipping] = useState<boolean>(false);

  // Active Session state
  const [activeSession, setActiveSession] = useState<ActiveSessionState | null>(null);

  // Cards display state
  const [currentCard, setCurrentCard] = useState<CardData>({
    code: 'QS',
    rank: 'Q',
    rankValue: 12,
    suit: 'spades',
    suitSymbol: '♠',
    color: 'black',
  });
  const [nextCard, setNextCard] = useState<CardData | null>(null);
  const [isNextRevealed, setIsNextRevealed] = useState<boolean>(false);
  const [activeRoundId, setActiveRoundId] = useState<string>('HILO-READY');

  // Multipliers for idle/preview state
  const [previewOdds, setPreviewOdds] = useState<{
    upMultiplier: number | null;
    downMultiplier: number | null;
    sameMultiplier: number;
    canUp: boolean;
    canDown: boolean;
    canSame: boolean;
    remainingCardsCount: number;
  }>({
    upMultiplier: 6.06,
    downMultiplier: 1.21,
    sameMultiplier: 14.99,
    canUp: true,
    canDown: true,
    canSame: true,
    remainingCardsCount: 51,
  });

  // Result Banner / Overlay state
  const [lastPlayResult, setLastPlayResult] = useState<{
    result: 'WIN' | 'LOSS';
    choice: 'UP' | 'DOWN' | 'SAME';
    isSameRank: boolean;
    multiplier: number;
    cashout: number;
    profit: number;
  } | null>(null);

  // Cashout Success Modal state
  const [cashoutModal, setCashoutModal] = useState<{
    isOpen: boolean;
    sessionId: string;
    originalBet: number;
    finalMultiplier: number;
    cashoutAmount: number;
    netProfit: number;
  } | null>(null);

  // Loss Modal / Banner state
  const [lossModal, setLossModal] = useState<{
    isOpen: boolean;
    sessionId: string;
    originalBet: number;
    lostCashout: number;
    lastCard: CardData;
    isSameRank: boolean;
  } | null>(null);

  // Modals & Panels
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // History state with server-side pagination (10 per page) - strictly DB-driven
  const [sessionHistory, setSessionHistory] = useState<HiloSessionItem[]>([]);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<boolean>(false);
  const [historyViewMode, setHistoryViewMode] = useState<'cards' | 'table'>('table');

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

  // Confetti particles for WIN / CASHOUT
  const [confettiActive, setConfettiActive] = useState<boolean>(false);

  // Sound Engine
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
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.14);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) { }
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

        gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
      });
    } catch (e) { }
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
      osc.frequency.exponentialRampToValueAtTime(105, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) { }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('rivexa_sound_enabled', String(next));
    } catch (e) { }
  };

  // Ref to track if session has been initialized once on mount
  const sessionInitializedRef = useRef<boolean>(false);
  const [isSessionLoaded, setIsSessionLoaded] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Initialize and check active session
  useEffect(() => {
    setMounted(true);
    try {
      const savedSound = localStorage.getItem('rivexa_sound_enabled');
      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }
    } catch (e) { }

    // Wait for auth to resolve before querying user-specific data
    if (authLoading) return;

    if (user?.id) {
      if (!sessionInitializedRef.current) {
        sessionInitializedRef.current = true;
        fetchActiveSession(user.id);
      } else {
        refreshBalance();
      }
      fetchHistory(1, user.id);
    } else {
      // Unauthenticated state: empty history, no fake demo records
      setSessionHistory([]);
      setHistoryTotal(0);
      setHistoryTotalPages(1);
      setIsHistoryLoading(false);
      setHistoryError(false);
      if (!sessionInitializedRef.current) {
        sessionInitializedRef.current = true;
        fetchActiveSession();
      }
    }
  }, [user, authLoading]);

  // Fetch real game history from server with pagination (10 per page)
  const fetchHistory = useCallback(async (page = 1, explicitUserId?: string) => {
    const activeUserId = explicitUserId || user?.id || '';
    if (!activeUserId) {
      setSessionHistory([]);
      setHistoryTotal(0);
      setHistoryTotalPages(1);
      setIsHistoryLoading(false);
      setHistoryError(false);
      return;
    }

    try {
      setIsHistoryLoading(true);
      setHistoryError(false);
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/hilo/session/history?userId=${encodeURIComponent(activeUserId)}&page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.items) ? data.items : (Array.isArray(data.sessions) ? data.sessions : []);
        setSessionHistory(list);
        setHistoryPage(data.page || page);
        setHistoryTotalPages(data.totalPages || 1);
        setHistoryTotal(data.total || 0);
      } else {
        setHistoryError(true);
      }
    } catch (e: any) {
      console.warn('HILO history network notice:', e?.message || e);
      setHistoryError(true);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [user]);

  // Fetch or create backend session (READY or ACTIVE)
  const fetchActiveSession = async (explicitUserId?: string, retryCount = 0) => {
    try {
      const apiBase = getApiBaseUrl();
      const userId = explicitUserId || user?.id || '';
      const storedSessionId = typeof window !== 'undefined' ? localStorage.getItem('rivexa_hilo_session_id') : null;

      const queryParams = new URLSearchParams();
      if (userId) queryParams.set('userId', userId);
      if (storedSessionId) queryParams.set('sessionId', storedSessionId);

      const res = await fetch(`${apiBase}/hilo/session/active?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.session) {
          const s = data.session;
          setActiveSession({
            sessionId: s.sessionId,
            originalBet: s.originalBet,
            currentMultiplier: s.currentMultiplier,
            cashoutMultiplier: s.cashoutMultiplier,
            currentCashoutAmount: s.currentCashoutAmount,
            upMultiplier: s.upMultiplier,
            downMultiplier: s.downMultiplier,
            sameMultiplier: s.sameMultiplier || 14.99,
            canUp: s.canUp,
            canDown: s.canDown,
            canSame: s.canSame !== undefined ? s.canSame : true,
            remainingCardsCount: s.remainingCardsCount,
            status: s.status,
            plays: s.plays || [],
          });
          setCurrentCard(s.currentCard);
          setActiveRoundId(s.sessionId);
          if (s.originalBet > 0) {
            setBetAmount(s.originalBet.toString());
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('rivexa_hilo_session_id', s.sessionId);
          }
          setIsSessionLoaded(true);
          return;
        }
      }
      setIsSessionLoaded(true);
    } catch (e: any) {
      console.warn('HILO active session notice:', e?.message || e);
      if (retryCount < 2) {
        setTimeout(() => fetchActiveSession(explicitUserId, retryCount + 1), 1500);
      } else {
        setIsSessionLoaded(true);
      }
    }
  };

  // Bet Amount Helpers
  const handleQuickAmount = (val: number | string) => {
    if (isProcessing || activeSession?.status === 'ACTIVE') return;
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
    if (isProcessing || activeSession?.status === 'ACTIVE') return;
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
        message: 'Please log in or create an account to play HILO.',
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
   * START HILO SESSION (Deducts Bet Once)
   */
  const handleStartSession = async (): Promise<ActiveSessionState | null> => {
    const amt = parseFloat(betAmount);
    if (!validateBet(amt)) return null;

    setIsProcessing(true);
    setLastPlayResult(null);
    setLossModal(null);
    setCashoutModal(null);
    setToastMessage(null);

    try {
      const apiBase = getApiBaseUrl();
      const userId = user!.id;

      const res = await fetch(`${apiBase}/hilo/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, betAmount: amt, sessionId: activeSession?.sessionId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsProcessing(false);
        setValidationModal({
          isOpen: true,
          type: res.status === 400 && data.message?.toLowerCase().includes('balance') ? 'INSUFFICIENT_BALANCE' : 'GAME_ERROR',
          message: data.message || 'Failed to start HILO session',
          currentBalance,
          requiredAmount: amt,
        });
        refreshBalance();
        return null;
      }

      const newSession: ActiveSessionState = {
        sessionId: data.sessionId,
        originalBet: data.originalBet,
        currentMultiplier: data.currentMultiplier || 1.0,
        cashoutMultiplier: data.cashoutMultiplier || 1.0,
        currentCashoutAmount: data.currentCashoutAmount || data.originalBet,
        upMultiplier: data.upMultiplier,
        downMultiplier: data.downMultiplier,
        sameMultiplier: data.sameMultiplier || 14.99,
        canUp: data.canUp,
        canDown: data.canDown,
        canSame: data.canSame !== undefined ? data.canSame : true,
        remainingCardsCount: data.remainingCardsCount,
        status: 'ACTIVE',
        plays: [],
      };

      setActiveSession(newSession);
      setCurrentCard(data.currentCard);
      setActiveRoundId(data.sessionId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('rivexa_hilo_session_id', data.sessionId);
      }
      setNextCard(null);
      setIsNextRevealed(false);
      setIsProcessing(false);
      refreshBalance();

      return newSession;
    } catch (err: any) {
      console.warn('Start Session notice:', err?.message || err);
      setIsProcessing(false);
      setToastMessage({ text: 'Network connection error. Please try again.', type: 'error' });
      refreshBalance();
      return null;
    }
  };

  /**
   * UP / SAME / DOWN PREDICTION (CONTINUOUS PLAY)
   */
  const handlePlayPrediction = async (choice: 'UP' | 'DOWN' | 'SAME') => {
    if (isProcessing || isCardFlipping) return;

    let session = activeSession;

    // If session is not active, start the session first with the selected bet amount
    if (!session || session.status !== 'ACTIVE') {
      const started = await handleStartSession();
      if (!started) return;
      session = started;
    }

    // Verify choice is allowed
    if (choice === 'UP' && !session.canUp) {
      setToastMessage({ text: 'Higher prediction is not available for this card.', type: 'info' });
      return;
    }
    if (choice === 'DOWN' && !session.canDown) {
      setToastMessage({ text: 'Lower prediction is not available for this card.', type: 'info' });
      return;
    }
    if (choice === 'SAME' && !session.canSame) {
      setToastMessage({ text: 'Same rank prediction is not available because no cards of this rank remain.', type: 'info' });
      return;
    }

    setSelectedChoice(choice);
    setIsProcessing(true);
    setLastPlayResult(null);
    setIsNextRevealed(false);
    setToastMessage(null);

    try {
      const apiBase = getApiBaseUrl();
      const userId = user!.id;

      const res = await fetch(`${apiBase}/hilo/session/${session.sessionId}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, choice }),
      });

      const playData = await res.json();
      if (!res.ok) {
        setIsProcessing(false);
        setSelectedChoice(null);
        setToastMessage({ text: playData.message || 'Error processing prediction', type: 'error' });
        refreshBalance();
        return;
      }

      // 3D Card Flip Animation (600ms)
      const revealedCard: CardData = playData.nextCard;
      setNextCard(revealedCard);
      setIsCardFlipping(true);
      playCardFlipSound();

      setTimeout(() => {
        setIsNextRevealed(true);
        setIsCardFlipping(false);

        const isWin = playData.isWin;

        if (isWin) {
          playWinSound();
          setConfettiActive(true);
          setTimeout(() => setConfettiActive(false), 2400);

          setLastPlayResult({
            result: 'WIN',
            choice,
            isSameRank: choice === 'SAME',
            multiplier: playData.currentMultiplier,
            cashout: playData.currentCashoutAmount,
            profit: playData.currentCashoutAmount - session!.originalBet,
          });

          // Update active session state with new accumulated values
          setActiveSession((prev) => {
            if (!prev) return null;
            const updatedPlays: HiloPlayItem[] = [
              ...prev.plays,
              {
                sequence: playData.sequenceNumber,
                previousCard: playData.previousCard,
                nextCard: playData.nextCard,
                choice,
                result: 'WIN',
                predictionMultiplier: playData.predictionMultiplier,
                multiplierAfterPlay: playData.currentMultiplier,
                cashoutAfterPlay: playData.currentCashoutAmount,
                createdAt: new Date().toISOString(),
              },
            ];

            return {
              ...prev,
              currentMultiplier: playData.currentMultiplier,
              cashoutMultiplier: playData.cashoutMultiplier,
              currentCashoutAmount: playData.currentCashoutAmount,
              upMultiplier: playData.upMultiplier,
              downMultiplier: playData.downMultiplier,
              sameMultiplier: playData.sameMultiplier || 14.99,
              canUp: playData.canUp,
              canDown: playData.canDown,
              canSame: playData.canSame !== undefined ? playData.canSame : true,
              remainingCardsCount: playData.remainingCardsCount,
              plays: updatedPlays,
            };
          });

          // Smoothly shift revealed card to become current card after 1.3s
          setTimeout(() => {
            setCurrentCard(revealedCard);
            setNextCard(null);
            setIsNextRevealed(false);
            setIsProcessing(false);
            setSelectedChoice(null);
          }, 1300);

        } else {
          // LOSS
          playLossSound();
          setLastPlayResult({
            result: 'LOSS',
            choice,
            isSameRank: playData.isSameRank,
            multiplier: session!.currentMultiplier,
            cashout: 0,
            profit: -session!.originalBet,
          });

          setActiveSession((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              status: 'LOST',
              currentCashoutAmount: 0,
            };
          });

          setIsProcessing(false);
          setSelectedChoice(null);
          refreshBalance();
          fetchHistory(1, user?.id);

          // Open loss modal / prompt
          setTimeout(() => {
            setLossModal({
              isOpen: true,
              sessionId: session!.sessionId,
              originalBet: session!.originalBet,
              lostCashout: playData.lostCashout || session!.currentCashoutAmount,
              lastCard: revealedCard,
              isSameRank: playData.isSameRank,
            });
          }, 900);
        }
      }, 600);
    } catch (err: any) {
      console.warn('Play prediction notice:', err?.message || err);
      setIsProcessing(false);
      setIsCardFlipping(false);
      setSelectedChoice(null);
      setToastMessage({ text: 'Network connection error. Please try again.', type: 'error' });
      refreshBalance();
    }
  };

  /**
   * CASH OUT (COLLECT ACCUMULATED WINNINGS)
   */
  const handleCashout = async () => {
    if (!activeSession || activeSession.status !== 'ACTIVE' || isProcessing || isCardFlipping) return;

    if (activeSession.currentCashoutAmount <= 0) return;

    setIsProcessing(true);
    setToastMessage(null);

    try {
      const apiBase = getApiBaseUrl();
      const userId = user!.id;

      const res = await fetch(`${apiBase}/hilo/session/${activeSession.sessionId}/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsProcessing(false);
        setToastMessage({ text: data.message || 'Failed to cash out', type: 'error' });
        refreshBalance();
        return;
      }

      playWinSound();
      setConfettiActive(true);
      setTimeout(() => setConfettiActive(false), 3500);

      refreshBalance();
      fetchHistory(1, user?.id);

      setActiveSession((prev) => (prev ? { ...prev, status: 'CASHED_OUT' } : null));
      setIsProcessing(false);

      // Open Cashout Success Modal
      setCashoutModal({
        isOpen: true,
        sessionId: data.sessionId,
        originalBet: data.originalBet,
        finalMultiplier: data.finalMultiplier,
        cashoutAmount: data.cashoutAmount,
        netProfit: data.netProfit,
      });
    } catch (err: any) {
      console.warn('Cashout notice:', err?.message || err);
      setIsProcessing(false);
      setToastMessage({ text: 'Network connection error during cash out.', type: 'error' });
      refreshBalance();
    }
  };

  /**
   * PLAY AGAIN (RESET STATE FOR NEW GAME)
   */
  const handlePlayAgain = async () => {
    setCashoutModal(null);
    setLossModal(null);
    setLastPlayResult(null);
    setNextCard(null);
    setIsNextRevealed(false);
    setSelectedChoice(null);
    setIsProcessing(true);

    try {
      const apiBase = getApiBaseUrl();
      const userId = user?.id || '';

      const res = await fetch(`${apiBase}/hilo/session/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.session) {
          const s = data.session;
          setActiveSession({
            sessionId: s.sessionId,
            originalBet: s.originalBet,
            currentMultiplier: s.currentMultiplier,
            cashoutMultiplier: s.cashoutMultiplier,
            currentCashoutAmount: s.currentCashoutAmount,
            upMultiplier: s.upMultiplier,
            downMultiplier: s.downMultiplier,
            sameMultiplier: s.sameMultiplier || 14.99,
            canUp: s.canUp,
            canDown: s.canDown,
            canSame: s.canSame !== undefined ? s.canSame : true,
            remainingCardsCount: s.remainingCardsCount,
            status: 'READY',
            plays: [],
          });
          setCurrentCard(s.currentCard);
          setActiveRoundId(s.sessionId);
          if (typeof window !== 'undefined') {
            localStorage.setItem('rivexa_hilo_session_id', s.sessionId);
          }
          setIsProcessing(false);
          refreshBalance();
          return;
        }
      }
      setIsProcessing(false);
      fetchActiveSession();
    } catch (e: any) {
      console.warn('Play again reset notice:', e?.message || e);
      setIsProcessing(false);
      fetchActiveSession();
    }
  };

  // Current display multipliers on buttons
  const isSessionActive = activeSession?.status === 'ACTIVE';
  const displayUpMultiplier = activeSession?.upMultiplier ?? previewOdds.upMultiplier;
  const displayDownMultiplier = activeSession?.downMultiplier ?? previewOdds.downMultiplier;
  const displaySameMultiplier = 14.99; // Fixed 14.99x as required
  const canUpChoice = activeSession ? activeSession.canUp : previewOdds.canUp;
  const canDownChoice = activeSession ? activeSession.canDown : previewOdds.canDown;
  const canSameChoice = activeSession ? activeSession.canSame : previewOdds.canSame;
  const canCashout = isSessionActive && (activeSession?.plays?.length || 0) > 0 && (activeSession?.currentCashoutAmount || 0) > 0;

  // Render Front Face Card Component (Crisp Casino Card Face matching GameHub screenshot)
  const renderCardView = (card: CardData, isCurrent: boolean = true) => {
    const isRed = card.color === 'red';
    return (
      <div
        className={`relative w-full max-w-[185px] sm:max-w-[200px] aspect-[2/3] rounded-2xl p-2 min-[360px]:p-2.5 sm:p-3.5 flex flex-col justify-between select-none shadow-[0_12px_35px_rgba(0,0,0,0.45)] transition-all duration-300 bg-white border border-slate-200 overflow-hidden ${isCurrent
            ? 'ring-2 ring-[#00D9FF]/50 shadow-[0_0_30px_rgba(40,123,255,0.4)]'
            : lastPlayResult?.result === 'WIN'
              ? 'ring-2 ring-[#00E5A0] shadow-[0_0_25px_rgba(0,229,160,0.45)]'
              : 'ring-2 ring-[#FF416C] shadow-[0_0_25px_rgba(255,65,108,0.45)]'
          }`}
      >
        {/* Subtle Card Glare Effect */}
        <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-bl from-white/60 via-slate-100/20 to-transparent rounded-full pointer-events-none" />

        {/* Top-Left Rank & Suit */}
        <div className="flex flex-col items-start leading-none z-10">
          <span className={`text-base min-[360px]:text-lg sm:text-2xl md:text-3xl font-black tracking-tight ${isRed ? 'text-[#E11D48]' : 'text-[#0F172A]'}`}>
            {card.rank}
          </span>
          <span className={`text-sm min-[360px]:text-base sm:text-xl md:text-2xl mt-0.5 ${isRed ? 'text-[#E11D48]' : 'text-[#0F172A]'}`}>
            {card.suitSymbol}
          </span>
        </div>

        {/* Center Gigantic Suit Symbol */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={`text-4xl min-[360px]:text-5xl sm:text-6xl md:text-7xl select-none filter drop-shadow-sm transition-transform ${isRed ? 'text-[#E11D48]' : 'text-[#0F172A]'
              }`}
          >
            {card.suitSymbol}
          </span>
        </div>

        {/* Bottom-Right Inverted Rank & Suit */}
        <div className="flex flex-col items-end leading-none z-10 rotate-180">
          <span className={`text-base min-[360px]:text-lg sm:text-2xl md:text-3xl font-black tracking-tight ${isRed ? 'text-[#E11D48]' : 'text-[#0F172A]'}`}>
            {card.rank}
          </span>
          <span className={`text-sm min-[360px]:text-base sm:text-xl md:text-2xl mt-0.5 ${isRed ? 'text-[#E11D48]' : 'text-[#0F172A]'}`}>
            {card.suitSymbol}
          </span>
        </div>
      </div>
    );
  };

  // Render Face-Down Card Back (Deep blue neon card back matching GameHub screenshot)
  const renderCardBack = () => {
    return (
      <div className="relative w-full max-w-[185px] sm:max-w-[200px] aspect-[2/3] rounded-2xl p-2 sm:p-3 flex flex-col items-center justify-center select-none bg-gradient-to-br from-[#0d1e44] via-[#08122a] to-[#040918] border-2 border-[#00D9FF] shadow-[0_0_30px_rgba(0,217,255,0.55),inset_0_0_15px_rgba(0,217,255,0.25)] ring-1 ring-[#00D9FF]/50 overflow-hidden">
        {/* Inner Glowing Cyan Dotted Frame */}
        <div className="absolute inset-1.5 sm:inset-2 rounded-xl border border-dotted border-[#00D9FF]/60 flex items-center justify-center p-1 sm:p-2 pointer-events-none">
          <div className="w-full h-full rounded-lg border border-dashed border-[#287BFF]/40 flex flex-col items-center justify-center bg-[radial-gradient(#00D9FF_1.5px,transparent_1.5px)] [background-size:10px_10px] sm:[background-size:12px_12px] opacity-45" />
        </div>

        {/* Center Glowing Logo Monogram */}
        <div className="relative z-10 w-9 h-9 min-[360px]:w-11 min-[360px]:h-11 sm:w-16 sm:h-16 lg:w-18 lg:h-18 rounded-2xl bg-[#081530]/90 border border-[#00D9FF]/60 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(0,217,255,0.4)]">
          <span className="text-[11px] min-[360px]:text-xs sm:text-lg lg:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00D9FF] to-[#287BFF]">
            HILO
          </span>
          <span className="text-[5px] min-[360px]:text-[6px] sm:text-[9px] text-[#A8B9DE] font-bold tracking-widest uppercase mt-0.5">
            CARDS
          </span>
        </div>

        {/* Ambient Corner Accents */}
        <div className="absolute top-1 left-1 text-[8px] text-[#00D9FF]/40 font-mono">♠</div>
        <div className="absolute top-1 right-1 text-[8px] text-[#00D9FF]/40 font-mono">♦</div>
        <div className="absolute bottom-1 left-1 text-[8px] text-[#00D9FF]/40 font-mono">♣</div>
        <div className="absolute bottom-1 right-1 text-[8px] text-[#00D9FF]/40 font-mono">♥</div>
      </div>
    );
  };

  // Render Compact History Cards (For mobile screens and compact view)
  const renderHistoryCardList = () => {
    return (
      <div className="space-y-2.5 w-full">
        {sessionHistory.map((item, idx) => {
          const originalBet = item.originalBet || item.betAmount || 0;
          const payout = item.payout !== undefined ? item.payout : (item.cashoutAmount || 0);
          const isWin = item.status === 'CASHED_OUT' || item.result === 'WIN' || (payout > 0 && payout >= originalBet && item.status !== 'LOST');
          const isExpanded = expandedSessionId === item.sessionId;
          const rowNumber = (historyPage - 1) * 10 + idx + 1;
          const profit = item.profit !== undefined
            ? item.profit
            : (isWin ? Math.max(0, payout - originalBet) : -originalBet);
          const mult = item.multiplier || item.highestMultiplier || item.finalMultiplier || 1.0;
          const choiceVal = item.choice;
          const timeFormatted = item.createdAt
            ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '-';

          return (
            <div
              key={item.id || item.sessionId || idx}
              className="bg-[#060c18] border border-white/10 rounded-2xl p-3 flex flex-col gap-2 hover:border-[#287BFF]/40 transition-colors shadow-sm w-full"
            >
              {/* ROW 1: #1   06:28 PM                 WIN ✅ */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="font-bold text-[#A8B9DE]">#{rowNumber}</span>
                  <span className="text-[#7285AE]">{timeFormatted}</span>
                </div>
                <div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${isWin
                        ? 'bg-emerald-500/20 text-[#00E5A0] border border-emerald-500/35'
                        : item.status === 'ACTIVE'
                          ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/35'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/35'
                      }`}
                  >
                    <span>{isWin ? 'WIN ✅' : item.status === 'ACTIVE' ? 'ACTIVE ⚡' : 'LOSS ❌'}</span>
                  </span>
                </div>
              </div>

              {/* ROW 2: A♥ → J♥          ↓ DOWN */}
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-1.5">
                  {item.currentCard ? (
                    <span className={`font-mono font-black text-xs px-2 py-0.5 rounded bg-slate-900 border border-white/10 ${item.currentCard.color === 'red' ? 'text-[#FF416C]' : 'text-slate-100'}`}>
                      {item.currentCard.rank}{item.currentCard.suitSymbol}
                    </span>
                  ) : (
                    <span className="text-slate-500 font-mono text-xs">-</span>
                  )}
                  <span className="text-slate-500 text-xs font-bold">→</span>
                  {item.nextCard ? (
                    <span className={`font-mono font-black text-xs px-2 py-0.5 rounded bg-slate-900 border border-white/10 ${item.nextCard.color === 'red' ? 'text-[#FF416C]' : 'text-slate-100'}`}>
                      {item.nextCard.rank}{item.nextCard.suitSymbol}
                    </span>
                  ) : (
                    <span className="text-slate-500 font-mono text-xs">-</span>
                  )}
                </div>

                <div>
                  {choiceVal === 'SAME' ? (
                    <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black text-[#FFC928] bg-[#FFC928]/15 border border-[#FFC928]/40 shadow-[0_0_10px_rgba(255,201,40,0.2)] whitespace-nowrap leading-none">
                      <span>=</span>
                      <span>SAME</span>
                    </span>
                  ) : choiceVal === 'UP' ? (
                    <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black text-[#00D9FF] bg-[#00D9FF]/15 border border-[#00D9FF]/40 whitespace-nowrap leading-none">
                      <span>↑</span>
                      <span>UP</span>
                    </span>
                  ) : choiceVal === 'DOWN' ? (
                    <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black text-[#FF3FA4] bg-[#FF3FA4]/15 border border-[#FF3FA4]/40 whitespace-nowrap leading-none">
                      <span>↓</span>
                      <span>DOWN</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 font-mono text-xs">-</span>
                  )}
                </div>
              </div>

              {/* ROW 3: 15.14x      Bet ₹100      Payout ₹1,514 */}
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/5 font-mono">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#00D9FF] bg-[#00D9FF]/10 px-1.5 py-0.5 rounded border border-[#00D9FF]/25">
                    {mult.toFixed(2)}x
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Bet ₹{Math.round(originalBet).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#7285AE] mr-1 uppercase">Payout:</span>
                  <span className="font-bold text-[#00E5A0]">
                    ₹{Math.round(payout).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* ROW 4: Profit/Loss & Plays Details Button */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#7285AE] uppercase">Profit:</span>
                  {profit > 0 ? (
                    <span className="font-mono font-black text-[#00E5A0]">
                      +₹{Math.round(profit).toLocaleString('en-IN')}
                    </span>
                  ) : profit < 0 ? (
                    <span className="font-mono font-black text-[#FF416C]">
                      -₹{Math.round(Math.abs(profit)).toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="font-mono text-slate-400">₹0</span>
                  )}
                </div>

                {item.plays && item.plays.length > 0 && (
                  <button
                    onClick={() => setExpandedSessionId(isExpanded ? null : item.sessionId)}
                    className="px-2 py-0.5 rounded-lg bg-[#101E3D] hover:bg-[#182C5A] text-slate-300 hover:text-white text-[10px] font-bold cursor-pointer inline-flex items-center gap-1 transition-colors border border-[#22396E]"
                  >
                    <span>{isExpanded ? 'Hide' : `${item.plays.length} plays`}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {/* Expandable Streak sequence inside card */}
              {isExpanded && item.plays && item.plays.length > 0 && (
                <div className="mt-1.5 pt-2 border-t border-white/5 space-y-1.5 pl-2 border-l-2 border-[#287BFF]/40 text-xs">
                  <span className="text-[10px] font-bold text-[#7285AE] uppercase tracking-wider block">
                    Sequence:
                  </span>
                  {item.plays.map((play, pIdx) => (
                    <div key={pIdx} className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-b-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#7285AE] font-mono">#{play.sequence}</span>
                        <span className="font-mono font-bold text-white">{play.previousCard.code}</span>
                        <span className="text-slate-500">→</span>
                        <span className="font-mono font-bold text-white">{play.nextCard.code}</span>
                        <span
                          className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-black ${play.choice === 'UP'
                              ? 'text-[#00D9FF] bg-[#00D9FF]/10'
                              : play.choice === 'SAME'
                                ? 'text-[#FFC928] bg-[#FFC928]/10'
                                : 'text-[#FF3FA4] bg-[#FF3FA4]/10'
                            }`}
                        >
                          {play.choice === 'UP' ? '↑ UP' : play.choice === 'SAME' ? '= SAME' : '↓ DOWN'}
                        </span>
                      </div>
                      <span className={`font-black text-[10px] ${play.result === 'WIN' ? 'text-[#00E5A0]' : 'text-[#FF416C]'}`}>
                        {play.predictionMultiplier.toFixed(2)}x {play.result}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render Full History Table (For desktop history column)
  const renderHistoryTableList = () => {
    return (
      <div className="overflow-x-auto [scrollbar-width:thin] w-full">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/5 text-[#7285AE] text-[10px] font-bold">
              <th className="py-2 px-1 whitespace-nowrap">#</th>
              <th className="py-2 px-1 whitespace-nowrap">Time</th>
              <th className="py-2 px-1 whitespace-nowrap">Cards</th>
              <th className="py-2 px-1 whitespace-nowrap">Choice</th>
              <th className="py-2 px-1 whitespace-nowrap">Multiplier</th>
              <th className="py-2 px-1 whitespace-nowrap">Bet</th>
              <th className="py-2 px-1 whitespace-nowrap">Payout</th>
              <th className="py-2 px-1 whitespace-nowrap">P/L</th>
              <th className="py-2 px-1 text-right whitespace-nowrap">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sessionHistory.map((item, idx) => {
              const originalBet = item.originalBet || item.betAmount || 0;
              const payout = item.payout !== undefined ? item.payout : (item.cashoutAmount || 0);
              const isWin = item.status === 'CASHED_OUT' || item.result === 'WIN' || (payout > 0 && payout >= originalBet && item.status !== 'LOST');
              const isExpanded = expandedSessionId === item.sessionId;
              const rowNumber = (historyPage - 1) * 10 + idx + 1;
              const profit = item.profit !== undefined
                ? item.profit
                : (isWin ? Math.max(0, payout - originalBet) : -originalBet);
              const mult = item.multiplier || item.highestMultiplier || item.finalMultiplier || 1.0;
              const choiceVal = item.choice;
              const timeFormatted = item.createdAt
                ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '-';

              return (
                <React.Fragment key={item.id || item.sessionId || idx}>
                  <tr
                    onClick={() => item.plays && item.plays.length > 0 && setExpandedSessionId(isExpanded ? null : item.sessionId)}
                    className={`hover:bg-white/[0.03] transition-colors font-medium ${item.plays && item.plays.length > 0 ? 'cursor-pointer' : ''}`}
                  >
                    <td className="py-2 px-1 font-mono text-[10px] text-[#A8B9DE] whitespace-nowrap">
                      #{rowNumber}
                    </td>
                    <td className="py-2 px-1 font-mono text-[10px] text-[#7285AE] whitespace-nowrap">
                      {timeFormatted}
                    </td>
                    <td className="py-2 px-1 whitespace-nowrap">
                      <div className="flex items-center gap-0.5 font-mono font-bold text-[11px] whitespace-nowrap">
                        {item.currentCard ? (
                          <span className={item.currentCard.color === 'red' ? 'text-[#FF416C]' : 'text-slate-100'}>
                            {item.currentCard.rank}{item.currentCard.suitSymbol}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono">-</span>
                        )}
                        <span className="text-slate-500 text-[9px]">→</span>
                        {item.nextCard ? (
                          <span className={item.nextCard.color === 'red' ? 'text-[#FF416C]' : 'text-slate-100'}>
                            {item.nextCard.rank}{item.nextCard.suitSymbol}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-1 whitespace-nowrap">
                      {choiceVal === 'SAME' ? (
                        <span className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black text-[#FFC928] bg-[#FFC928]/15 border border-[#FFC928]/40 shadow-[0_0_10px_rgba(255,201,40,0.2)] whitespace-nowrap leading-none">
                          <span>=</span>
                          <span>SAME</span>
                        </span>
                      ) : choiceVal === 'UP' ? (
                        <span className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black text-[#00D9FF] bg-[#00D9FF]/15 border border-[#00D9FF]/40 whitespace-nowrap leading-none">
                          <span>↑</span>
                          <span>UP</span>
                        </span>
                      ) : choiceVal === 'DOWN' ? (
                        <span className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black text-[#FF3FA4] bg-[#FF3FA4]/15 border border-[#FF3FA4]/40 whitespace-nowrap leading-none">
                          <span>↓</span>
                          <span>DOWN</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px]">-</span>
                      )}
                    </td>
                    <td className="py-2 px-1 font-mono font-bold text-[11px] text-[#00D9FF] whitespace-nowrap">
                      {mult.toFixed(2)}x
                    </td>
                    <td className="py-2 px-1 font-mono text-[10px] text-slate-300 whitespace-nowrap">
                      ₹{Math.round(originalBet).toLocaleString('en-IN')}
                    </td>
                    <td className={`py-2 px-1 font-mono font-bold text-[10px] whitespace-nowrap ${payout > 0 ? 'text-[#00E5A0]' : 'text-slate-400'}`}>
                      ₹{Math.round(payout).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-1 font-mono font-bold text-[10px] whitespace-nowrap">
                      {profit > 0 ? (
                        <span className="text-[#00E5A0]">+₹{Math.round(profit).toLocaleString('en-IN')}</span>
                      ) : profit < 0 ? (
                        <span className="text-[#FF416C]">-₹{Math.round(Math.abs(profit)).toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>
                    <td className="py-2 px-1 text-right whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase whitespace-nowrap inline-flex items-center justify-center ${isWin
                            ? 'bg-emerald-500/15 text-[#00E5A0] border border-emerald-500/35 shadow-[0_0_10px_rgba(0,229,160,0.25)]'
                            : item.status === 'ACTIVE'
                              ? 'bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/35'
                              : 'bg-rose-500/15 text-[#FF416C] border border-rose-500/35 shadow-[0_0_10px_rgba(255,65,108,0.25)]'
                          }`}
                      >
                        {isWin ? 'WIN' : item.status === 'ACTIVE' ? 'ACTIVE' : 'LOSS'}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && item.plays && item.plays.length > 0 && (
                    <tr className="bg-[#040916]">
                      <td colSpan={9} className="p-3">
                        <div className="space-y-1.5 pl-4 border-l-2 border-[#287BFF]/40">
                          <span className="text-[10px] font-bold text-[#7285AE] uppercase tracking-wider block mb-1">
                            Prediction Sequence:
                          </span>
                          {item.plays.map((play, pIdx) => (
                            <div
                              key={pIdx}
                              className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-b-0"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-[#7285AE] font-mono">#{play.sequence}</span>
                                <span className="font-bold font-mono text-white">{play.previousCard.code}</span>
                                <span className="text-slate-400">→</span>
                                <span className="font-bold font-mono text-white">{play.nextCard.code}</span>
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black whitespace-nowrap leading-none ${play.choice === 'UP'
                                      ? 'text-[#00D9FF] bg-[#00D9FF]/10 border border-[#00D9FF]/30'
                                      : play.choice === 'SAME'
                                        ? 'text-[#FFC928] bg-[#FFC928]/10 border border-[#FFC928]/30'
                                        : 'text-[#FF3FA4] bg-[#FF3FA4]/10 border border-[#FF3FA4]/30'
                                    }`}
                                >
                                  {play.choice === 'UP' ? '↑ UP' : play.choice === 'SAME' ? '= SAME' : '↓ DOWN'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`font-black text-[10px] px-1.5 py-0.5 rounded ${play.result === 'WIN'
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-rose-500/10 text-rose-400'
                                    }`}
                                >
                                  {play.result} ({play.predictionMultiplier.toFixed(2)}x)
                                </span>
                                <span className="font-mono text-[11px] text-[#00E5A0]">
                                  Accumulated: {play.multiplierAfterPlay.toFixed(2)}x (₹{Math.round(play.cashoutAfterPlay).toLocaleString('en-IN')})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-[#050B20] text-gray-100 flex flex-col font-sans selection:bg-[#287BFF]/30 selection:text-[#00D9FF] overflow-x-hidden">

      {/* ─── SLIDE-OUT MOBILE NAVIGATION DRAWER (GameHub Sidebar) ─── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] max-w-[85vw] bg-gradient-to-b from-[#091735] via-[#060e22] to-[#040814] border-r border-[#287BFF]/30 z-50 p-4 flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#287BFF] via-[#00D9FF] to-[#873BFF] flex items-center justify-center font-black text-[#050B20] text-base shadow-[0_0_12px_rgba(0,217,255,0.4)]">
                      ♠
                    </div>
                    <span className="text-base font-black text-white">
                      Game<span className="text-[#00D9FF]">Hub</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-8 h-8 rounded-xl bg-[#101E3D] text-slate-300 hover:text-white flex items-center justify-center border border-[#22396E]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-[#0c1833] border border-[#1d325c] rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#7285AE] font-bold uppercase">Balance</span>
                    <span className="text-sm font-black text-[#00E5A0]">
                      ₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <Link
                    href="/wallet"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#287BFF] text-[#050B20] text-xs font-black shadow-md"
                  >
                    Deposit
                  </Link>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-black tracking-widest text-[#7183A8] px-2 block">
                    Navigation
                  </span>
                  {[
                    { label: 'Home', href: '/' },
                    { label: 'All Games', href: '/#games' },
                    { label: 'Sports', href: '/sports' },
                    { label: 'Wallet', href: '/deposit' },
                    { label: 'Rewards', href: '/rewards' },
                    { label: 'Invite & Earn', href: '/invite' },
                    { label: 'Profile', href: '/profile' },
                  ].map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold text-[#B8C7E6] hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <span>{link.label}</span>
                      <span className="text-xs text-[#7285AE]">→</span>
                    </Link>
                  ))}
                </div>

                <div className="space-y-1 pt-2 border-t border-white/5">
                  <span className="text-[9px] uppercase font-black tracking-widest text-[#7183A8] px-2 block">
                    Popular Games
                  </span>
                  {[
                    { name: 'Aviator (Crash)', href: '/play/crash' },
                    { name: 'Fast Parity', href: '/play/fast-parity' },
                    { name: 'Mines', href: '/play/mines' },
                    { name: 'Dice', href: '/play/dice' },
                    { name: 'Coin Flip', href: '/play/coin-flip' },
                  ].map((g) => (
                    <Link
                      key={g.name}
                      href={g.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-[#00D9FF] hover:bg-white/5 transition-colors"
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#7285AE]">
                <span>Provably Fair RNG</span>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowHowToPlay(true);
                  }}
                  className="text-[#00D9FF] font-bold hover:underline"
                >
                  Game Rules
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── TOP BAR (GameHub Glowing Header) ─── */}
      <header className="w-full bg-[#081226]/95 border-b border-[#1b2b4d] backdrop-blur-md sticky top-0 z-40 px-2.5 sm:px-4 lg:px-6 h-[54px] sm:h-[62px] flex items-center shadow-xl">
        <div className="max-w-[1580px] mx-auto w-full flex items-center justify-between gap-2 sm:gap-3">

          {/* Left: Mobile Back + Title (< sm) OR GameHub Logo (>= sm) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Back button (< sm) */}
            <Link
              href="/"
              className="sm:hidden w-8 h-8 rounded-xl bg-[#101E3D] hover:bg-[#182C5A] border border-[#22396E] text-[#00D9FF] flex items-center justify-center transition-all shadow-sm"
              title="Back to Games"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {/* Mobile Title (< sm) */}
            <div className="sm:hidden flex items-center gap-1.5">
              <span className="text-base font-black tracking-wide text-white">HILO</span>
              <span className="text-[10px] font-black text-[#00D9FF] bg-[#00D9FF]/15 px-1.5 py-0.5 rounded border border-[#00D9FF]/30">2.0x</span>
            </div>

            {/* Desktop / Tablet GameHub Logo (>= sm) */}
            <Link href="/" className="hidden sm:flex items-center gap-2.5 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#00D9FF] flex items-center justify-center text-white shadow-[0_0_16px_rgba(0,217,255,0.45)] group-hover:scale-105 transition-transform">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base sm:text-lg font-black tracking-wide text-white">
                  Game<span className="text-[#00D9FF]">Hub</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-[#7285AE] font-semibold tracking-wider mt-0.5">
                  Play • Win • Repeat
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Search Bar matching screenshot (md and up) */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#7285AE] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search games, categories..."
                readOnly
                className="w-full bg-[#0c1833] hover:bg-[#0f1e40] border border-[#1d325c] focus:border-[#00D9FF]/50 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-[#7285AE] focus:outline-none transition-colors cursor-pointer shadow-inner"
                onClick={() => setMobileMenuOpen(true)}
              />
            </div>
          </div>

          {/* Right: Sound & Notifications (desktop/tablet), Balance Pill, Profile (desktop), and Mobile ☰ Menu */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Audio Toggle (hidden on mobile < sm) */}
            <button
              onClick={toggleSound}
              className={`hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 rounded-full border items-center justify-center transition-all cursor-pointer shadow-sm ${soundEnabled
                  ? 'bg-[#101E3D] border-[#287BFF]/50 text-[#00D9FF] shadow-[0_0_12px_rgba(0,217,255,0.25)]'
                  : 'bg-[#0c1833] border-[#1d325c] text-slate-500 hover:text-slate-300'
                }`}
              title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Notification Bell (hidden on mobile < sm) */}
            <button
              className="hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0c1833] hover:bg-[#122349] border border-[#1d325c] text-slate-300 hover:text-white items-center justify-center transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-[#FFC928] absolute top-2 right-2 shadow-[0_0_6px_#FFC928]" />
            </button>

            {/* Wallet Balance Pill */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-[#091f17] border border-[#00E5A0]/60 rounded-full pl-2.5 sm:pl-3 pr-1 py-1 shadow-[0_0_15px_rgba(0,229,160,0.2)]">
              <Coins className="w-3.5 h-3.5 text-[#00E5A0] shrink-0" />
              <span className="text-xs sm:text-sm font-black font-mono text-[#00E5A0] whitespace-nowrap">
                ₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <Link
                href="/wallet"
                className="hidden min-[420px]:flex px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[#00E5A0] hover:bg-[#10f0ab] text-[#050B20] text-[10px] sm:text-xs font-black shadow-md transition-all hover:scale-105 ml-1 items-center gap-0.5"
                title="Deposit Funds"
              >
                <span>+</span>
                <span>Deposit</span>
              </Link>
            </div>

            {/* User Profile Pill (desktop) */}
            <Link
              href="/profile"
              className="hidden sm:flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-white/5 transition-colors"
              title="Profile"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#873BFF] to-[#EC4899] flex items-center justify-center text-white text-xs font-black shadow-md">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1">
                <span>{user?.name || (user as any)?.username || (user?.email ? user.email.split('@')[0] : 'Sharma ji')}</span>
                <ChevronDown className="w-3 h-3 text-[#7285AE]" />
              </span>
            </Link>

            {/* Mobile Sidebar Menu ☰ Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-8 h-8 rounded-xl bg-[#101E3D] hover:bg-[#182C5A] border border-[#22396E] text-[#00D9FF] flex items-center justify-center transition-all cursor-pointer shadow-sm ml-0.5"
              title="Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
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
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-bold shadow-xl border flex items-center gap-2 ${toastMessage.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-600'
                : 'bg-emerald-950/90 text-emerald-200 border-emerald-600'
              }`}
          >
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CONFETTI CANVAS EFFECT ON WIN / CASHOUT ─── */}
      {confettiActive && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 45 }).map((_, idx) => (
            <motion.div
              key={idx}
              className="absolute w-2.5 h-2.5 rounded-sm"
              style={{
                backgroundColor: ['#00D9FF', '#00E5A0', '#FFC928', '#FF3FA4', '#287BFF'][idx % 5],
                top: '-5%',
                left: `${(idx * 2.2) % 100}%`,
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

      {/* ─── MAIN CONTENT (DESKTOP 3-COLUMN / MOBILE 1-COLUMN) ─── */}
      <main className="flex-1 max-w-[1580px] mx-auto w-full px-2 sm:px-4 lg:px-6 py-3 sm:py-5 min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_minmax(360px,430px)] gap-3 sm:gap-4 lg:gap-5 items-start w-full min-w-0">

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ─── 1. LEFT COLUMN: HILO SIDEBAR (Desktop Sticky Panel) ─── */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <aside className="hidden lg:flex flex-col justify-between bg-[#081226]/90 border border-[#1b2b4d] rounded-3xl p-4 shadow-xl sticky top-[76px] w-[240px] shrink-0 min-h-[580px]">
            <div className="space-y-4">
              {/* Spade Logo Box & Title matching screenshot */}
              <div className="flex flex-col items-start gap-1">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#00D9FF] flex items-center justify-center text-2xl text-white font-black shadow-[0_0_20px_rgba(0,217,255,0.45)] mb-1">
                  ♠
                </div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-black text-white tracking-wide">
                    HILO <span className="text-[#00D9FF]">2.0x</span>
                  </h2>
                </div>
                <p className="text-[10px] text-[#7285AE] font-semibold leading-tight">
                  Higher or Lower Card Prediction
                </p>
              </div>

              {/* Navigation Items matching screenshot */}
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <Link
                  href="/"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm">←</span>
                  <span>Back to Games</span>
                </Link>

                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#00D9FF] text-white text-xs font-black shadow-[0_0_15px_rgba(0,217,255,0.4)] cursor-default">
                  <span className="text-sm">🎮</span>
                  <span>HILO Game</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    fetchHistory(1);
                    setShowHistoryModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                >
                  <span className="text-sm">📜</span>
                  <span>History</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHowToPlay(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                >
                  <span className="text-sm">❓</span>
                  <span>How to Play</span>
                </button>
              </div>
            </div>

            {/* Bottom: Provably Fair & Round ID */}
            <div className="pt-3 border-t border-white/5 space-y-1.5 text-[11px] text-[#7285AE]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00D9FF]" />
                <span className="font-semibold text-slate-300">Provably Fair</span>
              </div>
              <div className="text-[10px] font-mono text-[#7285AE]">
                Round ID: <span className="text-slate-400 font-bold">{activeRoundId}</span>
              </div>
            </div>
          </aside>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ─── 2. CENTER COLUMN: MAIN HILO GAMEPLAY ARENA ─── */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-3 w-full min-w-0">

            {/* UNIFIED GAMEPLAY CARD: Exact GameHub Styling with Cosmic Arena Backdrop */}
            <div className="relative bg-gradient-to-b from-[#08122d]/98 via-[#050d22]/98 to-[#030714] border border-[#1d325c] rounded-2xl sm:rounded-3xl p-3 sm:p-5 lg:p-6 flex flex-col gap-3 sm:gap-4 shadow-[0_0_50px_rgba(2,10,28,0.95)] overflow-hidden w-full max-w-full min-w-0">

              {/* ─── COSMIC ARENA BACKDROP: RADIANT LIGHT BEAMS & ELECTRIC SWOOSHES ─── */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                {/* Top-center radial energy corona */}
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[600px] h-[340px] bg-[radial-gradient(ellipse_at_center,rgba(0,217,255,0.22)_0%,rgba(40,123,255,0.1)_45%,transparent_75%)] blur-2xl" />

                {/* Left magenta/purple cosmic nebula */}
                <div className="absolute top-1/4 left-0 w-80 h-80 bg-[#873BFF]/15 rounded-full blur-3xl" />

                {/* Right cyan cosmic nebula */}
                <div className="absolute top-1/4 right-0 w-80 h-80 bg-[#00D9FF]/18 rounded-full blur-3xl" />

                {/* Dynamic Electric Laser Beams (Curved light sweeps matching screenshot) */}
                <svg
                  className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="none"
                  viewBox="0 0 800 600"
                >
                  <defs>
                    <linearGradient id="beam1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.85" />
                      <stop offset="50%" stopColor="#287BFF" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#873BFF" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="beam2" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.95" />
                      <stop offset="60%" stopColor="#00E5A0" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </linearGradient>
                    <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {/* Swooping dynamic electric arcs */}
                  <path d="M 120 0 Q 300 180 380 320 Q 420 400 480 440" stroke="url(#beam1)" strokeWidth="3" fill="none" filter="url(#laserGlow)" opacity="0.65" />
                  <path d="M 760 30 Q 640 160 560 270 Q 500 370 520 460" stroke="url(#beam2)" strokeWidth="3.5" fill="none" filter="url(#laserGlow)" opacity="0.8" />
                  <path d="M 800 130 Q 670 210 590 300" stroke="#00D9FF" strokeWidth="2" fill="none" filter="url(#laserGlow)" opacity="0.45" />
                  <path d="M 0 110 Q 180 200 270 280" stroke="#873BFF" strokeWidth="2" fill="none" filter="url(#laserGlow)" opacity="0.4" />
                </svg>
              </div>

              {/* ─── 3D HOLOGRAPHIC FLOATING GAMING ACCENTS (Left & Right Flanking) ─── */}
              {/* Left Floating 3D Tilted Card */}
              <motion.div
                animate={{
                  y: [-3, 5, -3],
                  rotate: [-18, -14, -18],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="hidden min-[480px]:flex absolute left-2 sm:left-4 lg:left-6 top-[32%] -translate-y-1/2 z-10 pointer-events-none flex-col items-center justify-center w-10 h-14 sm:w-13 sm:h-18 lg:w-15 lg:h-22 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#162354]/80 via-[#0b1435]/90 to-[#04081c] border-2 border-[#873BFF]/60 shadow-[0_0_22px_rgba(135,59,255,0.45)] backdrop-blur-md select-none"
              >
                <div className="absolute inset-1 rounded-lg border border-[#873BFF]/30 flex items-center justify-center">
                  <span className="text-base sm:text-xl lg:text-2xl font-mono text-[#873BFF] drop-shadow-[0_0_8px_#873BFF]">♠</span>
                </div>
              </motion.div>

              {/* Left Floating 3D Glowing Neon Heart */}
              <motion.div
                animate={{
                  y: [4, -4, 4],
                  scale: [0.96, 1.04, 0.96],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.4,
                }}
                className="hidden min-[480px]:block absolute left-4 sm:left-7 lg:left-10 top-[56%] sm:top-[58%] z-10 pointer-events-none select-none text-2xl sm:text-3xl lg:text-4xl text-[#EC4899] drop-shadow-[0_0_16px_#EC4899]"
              >
                ♥
              </motion.div>

              {/* Right Floating 3D Tilted Card */}
              <motion.div
                animate={{
                  y: [-4, 4, -4],
                  rotate: [18, 14, 18],
                }}
                transition={{
                  duration: 5.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.6,
                }}
                className="hidden min-[480px]:flex absolute right-2 sm:right-4 lg:right-6 top-[32%] -translate-y-1/2 z-10 pointer-events-none flex-col items-center justify-center w-10 h-14 sm:w-13 sm:h-18 lg:w-15 lg:h-22 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0c2e56]/80 via-[#071d3d]/90 to-[#030d20] border-2 border-[#00D9FF]/60 shadow-[0_0_22px_rgba(0,217,255,0.45)] backdrop-blur-md select-none"
              >
                <div className="absolute inset-1 rounded-lg border border-[#00D9FF]/30 flex items-center justify-center">
                  <span className="text-base sm:text-xl lg:text-2xl font-mono text-[#00D9FF] drop-shadow-[0_0_8px_#00D9FF]">♠</span>
                </div>
              </motion.div>

              {/* Right Floating 3D Glowing Neon Diamond */}
              <motion.div
                animate={{
                  y: [4, -4, 4],
                  scale: [0.96, 1.04, 0.96],
                }}
                transition={{
                  duration: 4.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.8,
                }}
                className="hidden min-[480px]:block absolute right-4 sm:right-7 lg:right-10 top-[56%] sm:top-[58%] z-10 pointer-events-none select-none text-2xl sm:text-3xl lg:text-4xl text-[#EC4899] drop-shadow-[0_0_16px_#EC4899]"
              >
                ♦
              </motion.div>

              {/* Top Header Row Inside Game Arena Card matching screenshot */}
              <div className="flex items-center justify-between z-10 px-0.5">
                {/* Round ID with Green Dot */}
                <div className="flex items-center gap-2 bg-[#0c1833]/90 border border-[#1d325c] px-3 py-1 rounded-full text-xs font-mono shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#00E5A0] shadow-[0_0_6px_#00E5A0] animate-pulse" />
                  <span className="text-slate-300 font-bold">Round ID:</span>
                  <span className="text-[#00D9FF] font-bold">{activeRoundId}</span>
                </div>

                {/* Provably Fair Deck Pill */}
                <div className="flex items-center gap-1.5 bg-[#0c1833]/90 border border-[#1d325c] px-3 py-1 rounded-full text-xs text-[#7285AE] shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00D9FF]" />
                  <span className="font-semibold text-slate-300">Provably Fair Deck</span>
                </div>
              </div>

              {/* Compact Result Alert Banner (if available) */}
              <AnimatePresence>
                {lastPlayResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`py-1.5 px-3 rounded-xl border text-center flex items-center justify-between text-xs font-bold shadow-lg z-10 ${
                      lastPlayResult.result === 'WIN'
                        ? 'bg-emerald-950/80 border-[#00E5A0] text-[#00E5A0]'
                        : 'bg-rose-950/80 border-[#FF416C] text-[#FF416C]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-black">
                      {lastPlayResult.result === 'WIN' ? '🎉 WIN!' : '💔 LOST'}
                      <span className="font-normal opacity-90 text-[11px]">
                        {lastPlayResult.choice === 'SAME'
                          ? 'Equal Rank (14.99x)'
                          : lastPlayResult.choice === 'UP'
                          ? 'Higher Card'
                          : 'Lower Card'}
                      </span>
                    </span>
                    <span className="font-mono font-black text-xs">
                      {lastPlayResult.result === 'WIN'
                        ? `${lastPlayResult.multiplier.toFixed(2)}x (₹${Math.round(lastPlayResult.cashout)})`
                        : `-₹${Math.abs(lastPlayResult.profit)}`}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CARDS DISPLAY CONTAINER: CURRENT CARD & NEXT CARD SIDE-BY-SIDE IN 3-COLUMN GRID */}
              <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center justify-items-center gap-1 min-[360px]:gap-2 sm:gap-4 my-1 z-10 w-full px-1 sm:px-4 lg:px-6 max-w-full">

                {/* CURRENT CARD (LEFT) */}
                <div className="flex flex-col items-center gap-1 sm:gap-1.5 w-full min-w-0 max-w-full">
                  <span className="text-[9px] min-[360px]:text-[10px] sm:text-xs font-black text-white uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-1.5 w-full text-center">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#EC4899] shadow-[0_0_8px_#EC4899] animate-pulse" />
                    <span>CURRENT CARD</span>
                  </span>

                  <div className="flex flex-col items-center justify-center w-full min-w-0 max-w-full">
                    <motion.div
                      key={isSessionLoaded ? currentCard.code : 'loading-card'}
                      initial={{ scale: 0.96 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.25 }}
                      className="w-full flex items-center justify-center relative z-10"
                    >
                      {isSessionLoaded ? renderCardView(currentCard, true) : renderCardBack()}
                    </motion.div>

                    {/* 3D Glowing Cylindrical Stage Pedestal under Current Card */}
                    <div className="relative w-full max-w-[195px] sm:max-w-[215px] flex flex-col items-center -mt-2.5 sm:-mt-3 pointer-events-none select-none z-0">
                      {/* Stage Top Ellipse Rim */}
                      <div className="w-full h-5 sm:h-7 rounded-[100%] bg-gradient-to-b from-[#133769] via-[#091e42] to-[#051126] border-2 border-[#00D9FF] shadow-[0_0_22px_#00D9FF,inset_0_0_12px_rgba(0,217,255,0.7)] relative z-10 flex items-center justify-center">
                        <div className="w-[85%] h-[60%] rounded-[100%] border border-[#00D9FF]/40 bg-gradient-to-b from-[#0e2c56]/60 to-transparent" />
                      </div>

                      {/* Stage 3D Cylindrical Body */}
                      <div className="w-full h-3 sm:h-4.5 -mt-2.5 sm:-mt-3.5 bg-gradient-to-b from-[#091f42] via-[#051329] to-[#020713] border-x-2 border-[#00D9FF]/50 relative z-0 flex flex-col justify-end">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00D9FF]/25 via-transparent to-[#00D9FF]/25" />
                        <div className="w-full h-4 sm:h-6 rounded-[100%] border-b-2 border-[#00D9FF]/80 shadow-[0_4px_15px_rgba(0,217,255,0.5)] bg-gradient-to-b from-transparent to-[#020713]" />
                      </div>

                      {/* Stage Ground Spotlight Glow / Floor Reflection */}
                      <div className="w-[125%] h-5 sm:h-8 rounded-[100%] bg-gradient-to-r from-transparent via-[#00D9FF]/45 to-transparent blur-md -mt-2 shadow-[0_0_32px_#00D9FF]" />
                    </div>
                  </div>
                </div>

                {/* CENTER VS INDICATOR WITH ODDS PILLS */}
                <div className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 shrink-0 w-[66px] min-[360px]:w-[74px] sm:w-[100px] lg:w-[110px] z-20">
                  {/* Center Glowing VS Circle (At Top) */}
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-[#07132c] border-2 border-[#00D9FF] text-[#00D9FF] flex items-center justify-center font-black text-[10px] sm:text-xs shadow-[0_0_20px_rgba(0,217,255,0.6)] shrink-0">
                    VS
                  </div>

                  {/* Cyan HIGHER Pill */}
                  <div className="px-1 sm:px-2 py-0.5 sm:py-1 rounded-full bg-[#0c1e3d] border border-[#00D9FF]/70 text-[#00D9FF] text-[7.5px] sm:text-[10px] font-black flex items-center gap-0.5 sm:gap-1 shadow-[0_0_12px_rgba(0,217,255,0.35)] w-full justify-center whitespace-nowrap">
                    <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#00D9FF] stroke-[3] shrink-0" />
                    <span className="font-bold">HIGHER</span>
                    <span className="font-mono text-white text-[7.5px] sm:text-xs">{displayUpMultiplier ? `${displayUpMultiplier.toFixed(2)}x` : '—'}</span>
                  </div>

                  {/* Gold EQUAL Pill */}
                  <div className="px-1 sm:px-2 py-0.5 sm:py-1 rounded-full bg-[#231a05] border border-[#FFC928]/70 text-[#FFC928] text-[7.5px] sm:text-[10px] font-black flex items-center gap-0.5 sm:gap-1 shadow-[0_0_12px_rgba(255,201,40,0.35)] w-full justify-center whitespace-nowrap">
                    <span className="font-mono text-[8px] sm:text-xs leading-none shrink-0 font-black">=</span>
                    <span className="font-bold">EQUAL</span>
                    <span className="font-mono text-white text-[7.5px] sm:text-xs font-black">14.99x</span>
                  </div>

                  {/* Pink LOWER Pill */}
                  <div className="px-1 sm:px-2 py-0.5 sm:py-1 rounded-full bg-[#2d0b1a] border border-[#EC4899]/70 text-[#EC4899] text-[7.5px] sm:text-[10px] font-black flex items-center gap-0.5 sm:gap-1 shadow-[0_0_12px_rgba(236,72,153,0.35)] w-full justify-center whitespace-nowrap">
                    <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#EC4899] stroke-[3] shrink-0" />
                    <span className="font-bold">LOWER</span>
                    <span className="font-mono text-white text-[7.5px] sm:text-xs">{displayDownMultiplier ? `${displayDownMultiplier.toFixed(2)}x` : '—'}</span>
                  </div>
                </div>

                {/* NEXT CARD (RIGHT) */}
                <div className="flex flex-col items-center gap-1 sm:gap-1.5 w-full min-w-0 max-w-full">
                  <span className="text-[9px] min-[360px]:text-[10px] sm:text-xs font-black text-white uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-1.5 w-full text-center">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#FFC928] shadow-[0_0_8px_#FFC928] animate-pulse" />
                    <span>NEXT CARD</span>
                  </span>

                  <div className="flex flex-col items-center justify-center w-full min-w-0 max-w-full">
                    {/* 3D Flip Card Container matching exact card dimensions */}
                    <div className="relative [perspective:1000px] select-none flex items-center justify-center w-full min-w-0 max-w-full z-10">
                      <motion.div
                        className="relative [transform-style:preserve-3d] flex items-center justify-center w-full max-w-[185px] sm:max-w-[200px] aspect-[2/3]"
                        animate={{
                          rotateY: isCardFlipping || isNextRevealed ? 180 : 0,
                        }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                      >
                        {/* FACE-DOWN CARD (FRONT) */}
                        <div className="w-full h-full [backface-visibility:hidden] flex items-center justify-center">
                          {renderCardBack()}
                        </div>

                        {/* REVEALED CARD (BACK) */}
                        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center">
                          {nextCard ? renderCardView(nextCard, false) : renderCardBack()}
                        </div>
                      </motion.div>
                    </div>

                    {/* 3D Glowing Cylindrical Stage Pedestal under Next Card matching Current Card */}
                    <div className="relative w-full max-w-[195px] sm:max-w-[215px] flex flex-col items-center -mt-2.5 sm:-mt-3 pointer-events-none select-none z-0">
                      {/* Stage Top Ellipse Rim */}
                      <div className="w-full h-5 sm:h-7 rounded-[100%] bg-gradient-to-b from-[#133769] via-[#091e42] to-[#051126] border-2 border-[#00D9FF] shadow-[0_0_22px_#00D9FF,inset_0_0_12px_rgba(0,217,255,0.7)] relative z-10 flex items-center justify-center">
                        <div className="w-[85%] h-[60%] rounded-[100%] border border-[#00D9FF]/40 bg-gradient-to-b from-[#0e2c56]/60 to-transparent" />
                      </div>

                      {/* Stage 3D Cylindrical Body */}
                      <div className="w-full h-3 sm:h-4.5 -mt-2.5 sm:-mt-3.5 bg-gradient-to-b from-[#091f42] via-[#051329] to-[#020713] border-x-2 border-[#00D9FF]/50 relative z-0 flex flex-col justify-end">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00D9FF]/25 via-transparent to-[#00D9FF]/25" />
                        <div className="w-full h-4 sm:h-6 rounded-[100%] border-b-2 border-[#00D9FF]/80 shadow-[0_4px_15px_rgba(0,217,255,0.5)] bg-gradient-to-b from-transparent to-[#020713]" />
                      </div>

                      {/* Stage Ground Spotlight Glow / Floor Reflection */}
                      <div className="w-[125%] h-5 sm:h-8 rounded-[100%] bg-gradient-to-r from-transparent via-[#00D9FF]/45 to-transparent blur-md -mt-2 shadow-[0_0_32px_#00D9FF]" />
                    </div>
                  </div>
                </div>

              </div>

              {/* THREE PREDICTION BUTTONS: UP | SAME | DOWN in 1 row */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3 lg:gap-3.5 w-full max-w-full pt-1 z-10">

                {/* 1. UP BUTTON (Cyan Accent) */}
                <button
                  type="button"
                  onClick={() => handlePlayPrediction('UP')}
                  disabled={isProcessing || isCardFlipping || !canUpChoice}
                  className={`relative py-2 sm:py-2.5 px-1 sm:px-2 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-0.5 min-h-[64px] sm:min-h-[76px] cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed w-full min-w-0 ${
                    selectedChoice === 'UP'
                      ? 'bg-gradient-to-b from-[#0c224a] to-[#071329] border-[#00D9FF] text-white shadow-[0_0_25px_rgba(0,217,255,0.45)]'
                      : 'bg-gradient-to-b from-[#0a1835] to-[#060f22] border-[#00D9FF]/50 hover:border-[#00D9FF] text-slate-200 hover:text-white shadow-[0_0_15px_rgba(0,217,255,0.15)]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00D9FF] stroke-[3]" />
                    <span className="text-xs sm:text-base font-black tracking-wider text-white">UP</span>
                  </div>
                  <span className="text-[8px] sm:text-[10px] text-[#7285AE] font-semibold">Higher Card</span>
                  <span className="text-xs sm:text-sm font-mono font-black text-[#00D9FF] leading-tight mt-0.5">
                    {displayUpMultiplier ? `${displayUpMultiplier.toFixed(2)}x` : '—'}
                  </span>
                </button>

                {/* 2. SAME BUTTON (Gold Accent 14.99x) */}
                <button
                  type="button"
                  onClick={() => handlePlayPrediction('SAME')}
                  disabled={isProcessing || isCardFlipping || !canSameChoice}
                  className={`relative py-2 sm:py-2.5 px-1 sm:px-2 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-0.5 min-h-[64px] sm:min-h-[76px] cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed w-full min-w-0 ${
                    selectedChoice === 'SAME'
                      ? 'bg-gradient-to-b from-[#332205] to-[#1a1102] border-[#FFC928] text-white shadow-[0_0_25px_rgba(255,201,40,0.45)]'
                      : 'bg-gradient-to-b from-[#241904] to-[#120d02] border-[#FFC928]/50 hover:border-[#FFC928] text-slate-200 hover:text-white shadow-[0_0_15px_rgba(255,201,40,0.15)]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-sm sm:text-base text-[#FFC928] font-black leading-none">=</span>
                    <span className="text-xs sm:text-base font-black tracking-wider text-white">SAME</span>
                  </div>
                  <span className="text-[8px] sm:text-[10px] text-[#7285AE] font-semibold">Equal Rank</span>
                  <span className="text-xs sm:text-sm font-mono font-black text-[#FFC928] leading-tight mt-0.5">
                    14.99x
                  </span>
                </button>

                {/* 3. DOWN BUTTON (Pink Accent) */}
                <button
                  type="button"
                  onClick={() => handlePlayPrediction('DOWN')}
                  disabled={isProcessing || isCardFlipping || !canDownChoice}
                  className={`relative py-2 sm:py-2.5 px-1 sm:px-2 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-0.5 min-h-[64px] sm:min-h-[76px] cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed w-full min-w-0 ${
                    selectedChoice === 'DOWN'
                      ? 'bg-gradient-to-b from-[#3a0c20] to-[#1a050f] border-[#EC4899] text-white shadow-[0_0_25px_rgba(236,72,153,0.45)]'
                      : 'bg-gradient-to-b from-[#290918] to-[#14040c] border-[#EC4899]/50 hover:border-[#EC4899] text-slate-200 hover:text-white shadow-[0_0_15px_rgba(236,72,153,0.15)]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#EC4899] stroke-[3]" />
                    <span className="text-xs sm:text-base font-black tracking-wider text-white">DOWN</span>
                  </div>
                  <span className="text-[8px] sm:text-[10px] text-[#7285AE] font-semibold">Lower Card</span>
                  <span className="text-xs sm:text-sm font-mono font-black text-[#EC4899] leading-tight mt-0.5">
                    {displayDownMultiplier ? `${displayDownMultiplier.toFixed(2)}x` : '—'}
                  </span>
                </button>

              </div>

              {/* BET AMOUNT PANEL: 2-Row Layout matching specification */}
              <div className="w-full bg-[#060c18]/90 border border-[#1b2b4d] rounded-2xl p-2.5 sm:p-3.5 flex flex-col gap-2.5 z-10 max-w-full">
                <span className="text-[10px] sm:text-xs font-bold text-[#7285AE] uppercase tracking-wider">
                  BET AMOUNT
                </span>

                {/* Row 1: Dedicated Full-Width Stepper Input */}
                <div className="flex items-center justify-between bg-[#091329] border border-[#22396E] rounded-xl px-3 py-1.5 sm:py-2 w-full">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[#00D9FF] font-black text-sm sm:text-base shrink-0">₹</span>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      disabled={isProcessing || isSessionActive}
                      placeholder="100"
                      className="w-full bg-transparent text-white font-black text-sm sm:text-base focus:outline-none disabled:opacity-50 font-mono tracking-wide"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => handleStepAmount(-10)}
                      disabled={isProcessing || isSessionActive}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#101E3D] hover:bg-[#182C5A] text-slate-300 hover:text-white flex items-center justify-center border border-[#22396E] disabled:opacity-40 cursor-pointer active:scale-95 transition-all"
                      title="Decrease by ₹10"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepAmount(10)}
                      disabled={isProcessing || isSessionActive}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#101E3D] hover:bg-[#182C5A] text-slate-300 hover:text-white flex items-center justify-center border border-[#22396E] disabled:opacity-40 cursor-pointer active:scale-95 transition-all"
                      title="Increase by ₹10"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Row 2: Quick Bet Chips in flexible responsive grid */}
                <div className="grid grid-cols-4 sm:grid-cols-5 xl:grid-cols-9 gap-1 sm:gap-1.5 w-full">
                  {[10, 25, 50, 100, 250, 500].map((val) => {
                    const isSelected = betAmount === String(val) && !isSessionActive;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickAmount(val)}
                        disabled={isProcessing || isSessionActive}
                        className={`py-1.5 sm:py-1 px-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer disabled:opacity-40 text-center flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#00D9FF] text-[#050B20] font-black shadow-[0_0_12px_rgba(0,217,255,0.6)] border border-[#00D9FF]'
                            : 'bg-[#091329] hover:bg-[#122349] text-[#A8B9DE] hover:text-white border border-[#1b2b4d]'
                        }`}
                      >
                        ₹{val}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => handleQuickAmount('HALF')}
                    disabled={isProcessing || isSessionActive}
                    className="py-1.5 sm:py-1 px-1 rounded-lg sm:rounded-xl bg-[#091329] hover:bg-[#122349] text-[11px] sm:text-xs font-bold text-[#A8B9DE] hover:text-white border border-[#1b2b4d] disabled:opacity-40 cursor-pointer text-center flex items-center justify-center"
                  >
                    ½
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAmount('2X')}
                    disabled={isProcessing || isSessionActive}
                    className="py-1.5 sm:py-1 px-1 rounded-lg sm:rounded-xl bg-[#091329] hover:bg-[#122349] text-[11px] sm:text-xs font-bold text-[#A8B9DE] hover:text-white border border-[#1b2b4d] disabled:opacity-40 cursor-pointer text-center flex items-center justify-center"
                  >
                    2X
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAmount('MAX')}
                    disabled={isProcessing || isSessionActive}
                    className="col-span-4 sm:col-span-1 py-1.5 sm:py-1 px-1 rounded-lg sm:rounded-xl bg-[#091329] hover:bg-[#122349] text-[11px] sm:text-xs font-black text-[#00D9FF] border border-[#1b2b4d] disabled:opacity-40 cursor-pointer text-center flex items-center justify-center"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* ACTION BUTTON: START GAME or CASH OUT matching screenshot */}
              <div className="z-10">
                {isSessionActive ? (
                  <button
                    type="button"
                    onClick={handleCashout}
                    disabled={!canCashout || isProcessing || isCardFlipping}
                    className={`w-full relative py-3.5 sm:py-4 px-4 rounded-2xl font-black transition-all flex flex-col items-center justify-center gap-0.5 shadow-2xl cursor-pointer active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed overflow-hidden ${
                      canCashout
                        ? 'bg-gradient-to-r from-[#00b06f] via-[#00e5a0] to-[#00b06f] hover:from-[#00c57c] hover:to-[#00f3aa] text-[#050b1a] shadow-[0_0_30px_rgba(0,229,160,0.55)] border-2 border-[#54ffcc]'
                        : 'bg-[#091a1e] border-2 border-[#123830] text-slate-400'
                    }`}
                  >
                    {canCashout && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 z-10">
                      <div className="flex items-center gap-1">
                        <span className="text-lg sm:text-xl">💰</span>
                        <span className="text-base sm:text-lg font-black tracking-wider uppercase">
                          CASH OUT
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-black/25 text-current font-mono font-black text-xs sm:text-sm border border-black/15">
                        {(activeSession.currentMultiplier || 1).toFixed(2)}x
                      </span>
                      <span className="text-base sm:text-lg font-mono font-black">
                        Get ₹{Math.round(activeSession.currentCashoutAmount || 0).toLocaleString('en-IN')}
                      </span>
                      {activeSession.originalBet > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-mono font-black text-emerald-950 bg-black/20">
                          +₹{Math.max(0, Math.round((activeSession.currentCashoutAmount || 0) - activeSession.originalBet)).toLocaleString('en-IN')} Profit
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] sm:text-xs font-bold z-10 opacity-90">
                      <span>{canCashout ? 'Click to Collect Winnings to Wallet' : 'Make at least 1 correct prediction to Cash Out'}</span>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartSession()}
                    disabled={isProcessing}
                    className="w-full relative py-3.5 sm:py-4 px-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-[#2563EB] to-[#00D9FF] hover:brightness-110 text-[#050B20] text-sm sm:text-base uppercase tracking-wider shadow-[0_0_28px_rgba(0,217,255,0.45)] cursor-pointer active:scale-[0.98] disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>START GAME • ₹{betAmount}</span>
                  </button>
                )}
              </div>

            </div>
          </div>
          {/* ─── END OF LEFT COLUMN: COMPLETE HILO GAME ─── */}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ─── RIGHT COLUMN: RECENT HILO HISTORY (~30–35% WIDTH) ─── */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="w-full min-w-0 lg:sticky lg:top-[68px] lg:self-start">
            <div className="bg-[#081226]/90 border border-[#1b2b4d] rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5 shadow-xl flex flex-col w-full max-w-full lg:max-h-[calc(100vh-84px)] overflow-hidden">
              {/* Header Row: Title, View Switcher & Refresh Button */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2 shrink-0">
                  <Clock className="w-4 h-4 text-[#00D9FF]" />
                  <h3 className="text-sm sm:text-base font-black text-white whitespace-nowrap">Recent HILO History</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHistoryViewMode(historyViewMode === 'cards' ? 'table' : 'cards')}
                    className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#101E3D] hover:bg-[#182C5A] text-[10px] font-bold text-[#A8B9DE] hover:text-white border border-[#22396E] transition-colors cursor-pointer"
                    title={historyViewMode === 'cards' ? 'Switch to Table View' : 'Switch to Cards View'}
                  >
                    {historyViewMode === 'cards' ? '📊 Table' : '🗂️ Cards'}
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchHistory(historyPage)}
                    disabled={isHistoryLoading}
                    className="text-xs font-bold text-[#00D9FF] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isHistoryLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Records Container (independent vertical scrolling on desktop) */}
              <div className="flex-1 lg:overflow-y-auto lg:overflow-x-hidden py-2 space-y-2.5 [scrollbar-width:thin] [scrollbar-color:#22396E_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#22396E] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                {authLoading || isHistoryLoading ? (
                  <>
                    {/* Mobile skeleton */}
                    <div className="block lg:hidden space-y-2.5 animate-pulse">
                      {[...Array(3)].map((_, idx) => (
                        <div key={idx} className="bg-[#060c18] border border-white/5 rounded-2xl p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="h-3 w-20 bg-slate-800 rounded"></div>
                            <div className="h-4 w-12 bg-slate-800 rounded-full"></div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="h-5 w-24 bg-slate-800 rounded"></div>
                            <div className="h-5 w-16 bg-slate-800 rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop skeleton */}
                    <div className="hidden lg:block overflow-x-auto [scrollbar-width:thin]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-[#7285AE] text-[10px] font-bold">
                            <th className="py-2 px-1 whitespace-nowrap">#</th>
                            <th className="py-2 px-1 whitespace-nowrap">Time</th>
                            <th className="py-2 px-1 whitespace-nowrap">Cards</th>
                            <th className="py-2 px-1 whitespace-nowrap">Choice</th>
                            <th className="py-2 px-1 whitespace-nowrap">Multiplier</th>
                            <th className="py-2 px-1 whitespace-nowrap">Bet</th>
                            <th className="py-2 px-1 whitespace-nowrap">Payout</th>
                            <th className="py-2 px-1 whitespace-nowrap">P/L</th>
                            <th className="py-2 px-1 text-right whitespace-nowrap">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {[...Array(5)].map((_, idx) => (
                            <tr key={idx} className="animate-pulse">
                              <td className="py-2 px-1"><div className="h-3 w-5 bg-slate-800/80 rounded"></div></td>
                              <td className="py-2 px-1"><div className="h-3 w-12 bg-slate-800/80 rounded"></div></td>
                              <td className="py-2 px-1"><div className="h-4 w-12 bg-slate-800/80 rounded"></div></td>
                              <td className="py-2 px-1"><div className="h-4 w-12 bg-slate-800/80 rounded"></div></td>
                              <td className="py-2 px-1"><div className="h-3 w-8 bg-slate-800/80 rounded"></div></td>
                              <td className="py-2 px-1"><div className="h-3 w-10 bg-slate-800/80 rounded"></div></td>
                              <td className="py-2 px-1"><div className="h-3 w-10 bg-slate-800/80 rounded"></div></td>
                              <td className="py-2 px-1"><div className="h-3 w-10 bg-slate-800/80 rounded"></div></td>
                              <td className="py-2 px-1 text-right"><div className="h-4 w-10 bg-slate-800/80 rounded ml-auto"></div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : historyError ? (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-xs text-rose-400 font-bold">Unable to load HILO history.</p>
                    <button
                      type="button"
                      onClick={() => fetchHistory(historyPage, user?.id)}
                      className="px-4 py-1.5 rounded-xl bg-[#287BFF]/20 hover:bg-[#287BFF]/30 text-[#00D9FF] border border-[#00D9FF]/40 text-xs font-bold cursor-pointer transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : sessionHistory.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <div className="text-2xl">🕘</div>
                    <p className="text-sm font-bold text-white">No HILO bets yet</p>
                    <p className="text-xs text-[#7285AE]">Your completed HILO bets will appear here.</p>
                  </div>
                ) : (
                  <>
                    {/* ─── MOBILE VIEW (< lg): Always render compact cards per Requirement 25 ─── */}
                    <div className="block lg:hidden w-full">
                      {renderHistoryCardList()}
                    </div>

                    {/* ─── DESKTOP VIEW (>= lg): Render Table (or Cards if toggled) per Requirement 14 ─── */}
                    <div className="hidden lg:block w-full">
                      {historyViewMode === 'cards' ? renderHistoryCardList() : renderHistoryTableList()}
                    </div>
                  </>
                )}
              </div>

              {/* ─── IN-PLACE PAGINATION CONTROLS (Server-side 10 per page, compact one-line) ─── */}
              {historyTotal > 10 && (
                <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-xs shrink-0 mt-auto w-full">
                  <button
                    type="button"
                    onClick={() => fetchHistory(historyPage - 1)}
                    disabled={historyPage <= 1 || isHistoryLoading}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#0d1b38] hover:bg-[#13264f] text-[#A8B9DE] hover:text-white border border-[#1e3567] text-xs font-bold cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm"
                  >
                    <span>‹ Prev</span>
                  </button>

                  <div className="text-xs font-bold text-[#7285AE] font-mono px-2 text-center whitespace-nowrap">
                    <span>{historyPage} / {historyTotalPages || 1}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchHistory(historyPage + 1)}
                    disabled={historyPage >= historyTotalPages || isHistoryLoading}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#0072FF] to-[#00D9FF] hover:brightness-110 text-white font-black text-xs shadow-[0_0_18px_rgba(0,217,255,0.45)] cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <span>Next ›</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* ─── CASHOUT SUCCESS MODAL (Matches GameHub CASH OUT card) ─── */}
      <AnimatePresence>
        {cashoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-[#091326] border border-[#00E5A0]/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(0,229,160,0.3)] text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-[#00E5A0] flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(0,229,160,0.5)]">
                <Trophy className="w-8 h-8 text-[#00E5A0]" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
                  CASH OUT
                </h3>
                <p className="text-xs text-[#7285AE] mt-1">
                  You successfully cashed out!
                </p>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-2 gap-3 bg-[#050b1a] border border-[#00E5A0]/25 rounded-2xl p-4 text-left font-mono">
                <div>
                  <span className="text-[10px] text-[#7285AE] uppercase block">ORIGINAL BET</span>
                  <span className="text-base sm:text-lg font-black text-white">
                    ₹{cashoutModal.originalBet.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-[#7285AE] uppercase block">CASH OUT MULTIPLIER</span>
                  <span className="text-base sm:text-lg font-black text-[#00E5A0]">
                    {cashoutModal.finalMultiplier.toFixed(2)}x
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-[#7285AE] uppercase block">PAYOUT AMOUNT</span>
                  <span className="text-base sm:text-lg font-black text-white">
                    ₹{cashoutModal.cashoutAmount.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-[#7285AE] uppercase block">PROFIT</span>
                  <span className="text-base sm:text-lg font-black text-[#00E5A0]">
                    +₹{cashoutModal.netProfit.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePlayAgain}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00b06f] to-[#00e5a0] text-[#050b1a] font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(0,229,160,0.45)] hover:brightness-110 cursor-pointer transition-all active:scale-[0.99]"
              >
                CONTINUE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── LOSS MODAL / PROMPT (Matches GameHub YOU LOST card) ─── */}
      <AnimatePresence>
        {lossModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-[#091326] border border-[#FF2E74]/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(255,46,116,0.3)] text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-[#FF2E74] flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(255,46,116,0.5)]">
                <HeartCrack className="w-8 h-8 text-[#FF2E74]" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
                  YOU LOST
                </h3>
                <p className="text-xs text-[#7285AE] mt-1">
                  {lossModal.isSameRank
                    ? `Equal card rank (${lossModal.lastCard.rank}) was drawn, which is treated as a loss.`
                    : 'The card rank did not match your prediction.'}
                </p>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-2 gap-3 bg-[#050b1a] border border-[#FF2E74]/25 rounded-2xl p-4 text-left font-mono">
                <div>
                  <span className="text-[10px] text-[#7285AE] uppercase block">ORIGINAL BET</span>
                  <span className="text-base sm:text-lg font-black text-white">
                    ₹{lossModal.originalBet.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-[#7285AE] uppercase block">PEAK CASHOUT</span>
                  <span className="text-base sm:text-lg font-black text-[#FF2E74]">
                    ₹{lossModal.lostCashout.toFixed(2)}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="text-[10px] text-[#7285AE] uppercase block">NET LOSS</span>
                  <span className="text-base sm:text-lg font-black text-[#FF2E74]">
                    -₹{lossModal.originalBet.toFixed(2)} (Original Stake)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePlayAgain}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF2E74] to-[#FF4E98] text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(255,46,116,0.45)] hover:brightness-110 cursor-pointer transition-all active:scale-[0.99]"
              >
                PLAY AGAIN
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <h3 className="text-lg font-black text-white">How Continuous HILO Works</h3>
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
                  HILO is a continuous card prediction game with dynamic probability-based multipliers and live Cash Out.
                </p>

                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-200">
                  <li><strong>Place your bet once</strong> (min ₹10, max ₹50,000) to start a session.</li>
                  <li><strong>Select ↑ UP, = SAME, or ↓ DOWN</strong> to predict if the next card rank is higher, equal rank (14.99x), or lower.</li>
                  <li>The next card flips. On a <strong>WIN</strong>:
                    <ul className="list-disc list-inside pl-4 text-xs text-[#00E5A0] mt-0.5 space-y-0.5">
                      <li>The revealed card becomes the new <strong>Current Card</strong>.</li>
                      <li>Multipliers accumulate: <code className="text-white">totalMultiplier = prev × odds</code> (or <code className="text-white">× 14.99</code> for = SAME).</li>
                      <li><strong>The game does NOT end!</strong> You can make another prediction or <strong>CASH OUT</strong> anytime!</li>
                    </ul>
                  </li>
                  <li><strong>CASH OUT</strong>: Instantly collect your accumulated winnings directly to your wallet!</li>
                  <li><strong>LOSS</strong>: A wrong prediction ends the session and the original stake is lost. (For UP or DOWN, equal rank is a loss; for = SAME, equal rank is a WIN!)</li>
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
                    Dynamic Multiplier Formula:
                  </span>
                  <p className="font-mono text-[11px] text-slate-300">
                    Odds = (1 - HouseEdge) / Probability. The rarer the outcome, the higher the multiplier!
                  </p>
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
                  <h3 className="text-lg font-black text-white">Full HILO Session History</h3>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {sessionHistory.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[#7285AE]">No sessions recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sessionHistory.map((item) => {
                      const isWin = item.status === 'CASHED_OUT';
                      return (
                        <div
                          key={item.id}
                          className="bg-[#060c18] border border-white/5 p-3 rounded-2xl flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${isWin
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                            >
                              {isWin ? 'W' : 'L'}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-white font-mono">
                                #{item.sessionId}
                              </span>
                              <span className="text-[11px] text-[#7285AE]">
                                {item.predictionsCount} plays • Peak: {item.highestMultiplier.toFixed(2)}x
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col text-right">
                            <span className={`font-mono font-black ${isWin ? 'text-[#00E5A0]' : 'text-[#FF416C]'}`}>
                              {isWin ? `₹${item.cashoutAmount.toFixed(2)}` : `-₹${item.originalBet.toFixed(2)}`}
                            </span>
                            <span className="text-[10px] text-[#7285AE]">
                              Bet: ₹{item.originalBet.toFixed(2)}
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

      {/* ─── BOTTOM RADIANT ENERGY ARC & AMBIENT FLOATING SUITS MATCHING SCREENSHOT ─── */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-14 overflow-hidden z-20">
        {/* Curved Glowing Laser Ribbon */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#873BFF] via-[#00D9FF] to-[#EC4899] shadow-[0_0_20px_#00D9FF]" />
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-4/5 h-24 bg-[radial-gradient(ellipse_at_bottom,rgba(0,217,255,0.25)_0%,rgba(135,59,255,0.15)_45%,transparent_75%)] blur-xl" />

        {/* Ambient Neon Heart on Bottom Left */}
        <motion.div
          animate={{ y: [-3, 3, -3], rotate: [-8, 6, -8] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          className="hidden min-[480px]:block absolute bottom-1.5 left-6 lg:left-12 text-2xl sm:text-3xl text-[#EC4899] drop-shadow-[0_0_16px_#EC4899] select-none"
        >
          ♥
        </motion.div>

        {/* Ambient Neon Diamond on Bottom Right */}
        <motion.div
          animate={{ y: [3, -3, 3], rotate: [8, -6, 8] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
          className="hidden min-[480px]:block absolute bottom-1.5 right-6 lg:right-12 text-2xl sm:text-3xl text-[#873BFF] drop-shadow-[0_0_16px_#873BFF] select-none"
        >
          ♦
        </motion.div>
      </div>

    </div>
  );
}
