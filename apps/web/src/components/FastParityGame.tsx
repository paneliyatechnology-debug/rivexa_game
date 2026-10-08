'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getApiBaseUrl } from '@/lib/config';
import ValidationErrorModal, { ValidationErrorType } from './ValidationErrorModal';
import { useAuth } from '@/context/AuthContext';

// ─── Web Audio Sound Engine ───────────────────────────────────────────────────
class SoundEngine {
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

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.18) {
    try {
      if (typeof window !== 'undefined') {
        const savedGlobal =
          localStorage.getItem('rivexa_sound_enabled') ??
          localStorage.getItem('game_sound_enabled');
        if (savedGlobal === 'false') return; // Strict global sound check
        const savedFastParity = localStorage.getItem('fastparity_sound_enabled');
        if (savedFastParity === 'false') return;
      }
      const ctx = this.getCtx();
      const osc  = ctx.createOscillator();
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

  // ⏰ 5-second countdown alert: 5 rapid beeps, one per second
  fiveSecondAlert() {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.tone(1100, 0.12, 'square', 0.18), i * 1000);
    }
  }

  // 💰 Bet placed: two ascending tones
  betPlaced() {
    this.tone(600, 0.12, 'sine', 0.22);
    setTimeout(() => this.tone(900, 0.15, 'sine', 0.18), 120);
  }

  // 🏆 Win: ascending 4-note fanfare
  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => this.tone(f, 0.28, 'sine', 0.24), i * 90));
  }

  // 💔 Loss: descending two-tone buzz
  loss() {
    this.tone(280, 0.3, 'sawtooth', 0.18);
    setTimeout(() => this.tone(210, 0.45, 'sawtooth', 0.13), 220);
  }
}

const soundEngine = typeof window !== 'undefined' ? new SoundEngine() : null;

interface FastParityGameProps {
  user?: { id: string; email: string } | null;
  balance?: number;
  onBalanceUpdate?: (newBalance?: number) => void;
  gameMode?: 'fast-parity' | 'parity';
}

interface PeriodResult {
  periodNumber: string;
  number: number;
  colors: string[];
  createdAt?: string | null; // real ISO timestamp from API
}

interface UserBet {
  id?: string;
  periodNumber: string;
  selectOption: string;
  amount: number;
  winAmount: number;
  status: 'pending' | 'won' | 'lost';
  createdAt?: string | null;
}

interface SettledBetPopupData {
  id: string;
  period_number: string;
  bet_type: string;
  bet_amount: string;
  win_amount: string;
  status: 'won' | 'lost';
  winning_number: number;
  winning_colors: string[];
  settled_at_unix: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Session start time to prevent stale result popups on page reload
const SESSION_START_TIME = Math.floor(Date.now() / 1000);

// ─── Exact time formatter: always shows clock time like "3:21:23 PM" ──────────
function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', {
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).toUpperCase(); // e.g. "03:21:23 PM"
  } catch {
    return '--:--';
  }
}

export function FastParityGame({ user, balance, onBalanceUpdate, gameMode }: FastParityGameProps) {
  const { user: authUser, balance: authBalance, refreshBalance } = useAuth();
  const currentBalance = balance !== undefined ? balance : (authBalance ?? 0);
  const currentBalanceRef = useRef(currentBalance);

  useEffect(() => {
    currentBalanceRef.current = currentBalance;
  }, [currentBalance]);

  const triggerBalanceUpdate = useCallback((newBal?: number) => {
    if (typeof newBal === 'number') {
      onBalanceUpdate?.(newBal);
    } else {
      onBalanceUpdate?.();
    }
    if (refreshBalance) {
      refreshBalance().catch(() => {});
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('balance_updated', { detail: { newBalance: newBal } }));
    }
  }, [onBalanceUpdate, refreshBalance]);

  const initialInterval: 30 | 60 = gameMode === 'parity' ? 60 : 30;
  const [intervalMode, setIntervalMode]   = useState<30 | 60>(initialInterval);
  const [countdown,    setCountdown]      = useState<number>(initialInterval);

  useEffect(() => {
    if (gameMode === 'parity') {
      setIntervalMode(60);
      setCountdown(60);
    } else if (gameMode === 'fast-parity') {
      setIntervalMode(30);
      setCountdown(30);
    }
  }, [gameMode]);

  const [periodNumber, setPeriodNumber]   = useState<string>('');
  const [lastResult,   setLastResult]     = useState<PeriodResult | null>(null);
  // Live widget history (from game state polling — last 20)
  const [history,      setHistory]        = useState<PeriodResult[]>([]);

  // ─── Paginated History (server-side lazy-loading) ─────────────────────────
  const [historyRows,       setHistoryRows]       = useState<PeriodResult[]>([]);
  const [historyPagination, setHistoryPagination] = useState<Pagination | null>(null);
  const [historyLoadPage,   setHistoryLoadPage]   = useState<number>(1);
  const [historyLoading,    setHistoryLoading]    = useState<boolean>(false);

  // ─── Paginated My Bets (server-side lazy-loading) ────────────────────────
  const [myBetsRows,       setMyBetsRows]       = useState<UserBet[]>([]);
  const [myBetsPagination, setMyBetsPagination] = useState<Pagination | null>(null);
  const [myBetsLoadPage,   setMyBetsLoadPage]   = useState<number>(1);
  const [myBetsLoading,    setMyBetsLoading]    = useState<boolean>(false);

  // ─── Sound enabled toggle (Synced with Global Header) ─────────────────────
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);

  const isSoundEnabledRef = useRef(isSoundEnabled);

  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  // Sync with global header sound state from localStorage on mount & change events
  useEffect(() => {
    const syncSound = () => {
      try {
        const savedGlobal =
          localStorage.getItem('rivexa_sound_enabled') ??
          localStorage.getItem('game_sound_enabled');
        const savedFastParity = localStorage.getItem('fastparity_sound_enabled');

        let enabled = true;
        if (savedGlobal !== null) {
          enabled = savedGlobal === 'true';
        } else if (savedFastParity !== null) {
          enabled = savedFastParity === 'true';
        }
        setIsSoundEnabled(enabled);
      } catch {}
    };

    syncSound();

    const handleStorage = () => syncSound();
    const handleSoundChange = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom?.detail?.enabled !== undefined) {
        setIsSoundEnabled(custom.detail.enabled);
      } else {
        syncSound();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sound_preference_changed', handleSoundChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sound_preference_changed', handleSoundChange);
    };
  }, []);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => {
      const nextState = !prev;
      try {
        const strVal = String(nextState);
        localStorage.setItem('rivexa_sound_enabled', strVal);
        localStorage.setItem('game_sound_enabled', strVal);
        localStorage.setItem('fastparity_sound_enabled', strVal);
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(
          new CustomEvent('sound_preference_changed', { detail: { enabled: nextState } })
        );
      } catch {}
      return nextState;
    });
  }, []);

  const prevCountdownRef = useRef<number>(initialInterval);

  const playSound = useCallback((fn: () => void) => {
    if (!soundEngine) return;
    try {
      const savedGlobal =
        localStorage.getItem('rivexa_sound_enabled') ??
        localStorage.getItem('game_sound_enabled');
      if (savedGlobal === 'false') return; // Global sound from header is OFF
    } catch {}
    if (isSoundEnabledRef.current) {
      fn();
    }
  }, []);

  const [activeTab,       setActiveTab]       = useState<'history' | 'myBets'>('history');
  const [showRulesModal,  setShowRulesModal]  = useState<boolean>(false);
  const [betModal,        setBetModal]        = useState<{
    isOpen: boolean; type: string; label: string; multiplier: number;
  }>({ isOpen: false, type: '', label: '', multiplier: 2.0 });
  const [betAmount,    setBetAmount]    = useState<string>('10');
  const [message,      setMessage]      = useState<string>('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Result Modals state
  const [winModalData,  setWinModalData]  = useState<SettledBetPopupData | null>(null);
  const [lossModalData, setLossModalData] = useState<SettledBetPopupData | null>(null);

  useEffect(() => {
    if (winModalData) {
      const timer = setTimeout(() => setWinModalData(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [winModalData]);

  useEffect(() => {
    if (lossModalData) {
      const timer = setTimeout(() => setLossModalData(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lossModalData]);

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

  const showToast = (msg: string) => {
    setMessage(msg);
  };

  // Helper to reliably get active user ID from props or localStorage
  const getUserId = useCallback(() => {
    if (user?.id) return user.id;
    if (authUser?.id) return authUser.id;
    if (typeof window !== 'undefined') {
      try {
        const u1 = JSON.parse(localStorage.getItem('rivexa_user') || '{}');
        if (u1?.id) return String(u1.id);
        const u2 = JSON.parse(localStorage.getItem('user') || '{}');
        if (u2?.id) return String(u2.id);
      } catch {}
    }
    return '';
  }, [user?.id, authUser?.id]);

  // Calculate local period ID using exact Laravel formula
  const getLocalPeriodId = useCallback((sec: number) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const periodIndex = Math.floor(timestamp / sec);
    const now = new Date(timestamp * 1000);
    const yyyy = now.getFullYear();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${String(periodIndex % 10000).padStart(4, '0')}`;
  }, []);

  // ─── Paginated History Fetch (lazy loading from server) ──────────────────
  const fetchHistory = useCallback(async (page: number, replace = false) => {
    setHistoryLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/parity/history?page=${page}&limit=10&interval=${intervalMode}`);
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success) return;

      const newRows: PeriodResult[] = (json.data || []).map((h: any) => ({
        periodNumber: h.period_number,
        number: h.number,
        colors: h.colors || [],
        createdAt: h.created_at || null,
      }));

      setHistoryRows(prev => replace ? newRows : [...prev, ...newRows]);
      setHistoryPagination(json.pagination || null);
      setHistoryLoadPage(page);
    } catch {}
    finally { setHistoryLoading(false); }
  }, [intervalMode]);

  // ─── Paginated My Bets Fetch (lazy loading from server) ────────────────
  const fetchMyBets = useCallback(async (page: number, replace = false) => {
    const activeUserId = getUserId();
    if (!activeUserId) return;
    setMyBetsLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/parity/my-bets?userId=${activeUserId}&page=${page}&limit=10`);
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success) return;

      const newRows: UserBet[] = (json.data || []).map((b: any) => ({
        id: b.id,
        periodNumber: b.period_number,
        selectOption: b.bet_type,
        amount: parseFloat(b.bet_amount) || 0,
        winAmount: parseFloat(b.win_amount) || 0,
        status: b.status as 'pending' | 'won' | 'lost',
        createdAt: b.created_at || null,
      }));

      setMyBetsRows(prev => replace ? newRows : [...prev, ...newRows]);
      setMyBetsPagination(json.pagination || null);
      setMyBetsLoadPage(page);
    } catch {}
    finally { setMyBetsLoading(false); }
  }, [getUserId]);

  // ─── Synchronized State Polling (Laravel GameController getGameState) ───────
  const pollGameState = useCallback(async () => {
    try {
      const activeUserId = getUserId();
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/parity/state?userId=${activeUserId}&interval=${intervalMode}`);
      if (!res.ok) return;
      const data = await res.json();

      if (!data.success) return;

      // 0. Synchronize Real-Time User Balance
      if (typeof data.user_balance === 'number') {
        if (Math.abs(data.user_balance - currentBalanceRef.current) > 0.01) {
          triggerBalanceUpdate(data.user_balance);
        }
      }

      // 1. Sync Period Number
      if (data.current_period) {
        setPeriodNumber(data.current_period);
      }

      // 2. Sync Remaining Countdown
      if (typeof data.seconds_remaining === 'number') {
        setCountdown((prev) => {
          if (Math.abs(prev - data.seconds_remaining) > 3 || prev <= 0) {
            return data.seconds_remaining;
          }
          return prev;
        });
      }

      // 3. Sync Last Result
      if (data.last_result) {
        setLastResult({
          periodNumber: data.last_result.period_number,
          number: data.last_result.number,
          colors: data.last_result.colors || [],
        });
      }

      // 4. Sync Period History (live widget — last 20 only, with real timestamps)
      if (Array.isArray(data.history)) {
        setHistory(
          data.history.map((h: any) => ({
            periodNumber: h.period_number,
            number: h.number,
            colors: h.colors || [],
            createdAt: h.created_at || null,
          }))
        );
      }

      // 5. Sync My Bets (live — just for pending bet detection from game state)
      // Full paginated my-bets are loaded via fetchMyBets()
      if (Array.isArray(data.my_bets)) {
        // Refresh paginated my-bets when there are new bets in game state
        // We trigger a background refresh of page 1 to keep it fresh
      }

      // 6. Trigger Result Popups when bet settles
      if (data.user_latest_settled_bet) {
        const bet: SettledBetPopupData = data.user_latest_settled_bet;
        let shownBetIds: string[] = [];
        try {
          shownBetIds = JSON.parse(sessionStorage.getItem('shown_bet_popups') || '[]');
        } catch {}

        const isNewInSession = !bet.settled_at_unix || bet.settled_at_unix >= (SESSION_START_TIME - 5);

        if (isNewInSession && !shownBetIds.includes(bet.id)) {
          shownBetIds.push(bet.id);
          sessionStorage.setItem('shown_bet_popups', JSON.stringify(shownBetIds));

          if (bet.status === 'won') {
            setWinModalData(bet);
            playSound(() => soundEngine!.win());
          } else if (bet.status === 'lost') {
            setLossModalData(bet);
            playSound(() => soundEngine!.loss());
          }
          triggerBalanceUpdate();
          // Refresh my bets after settlement
          setMyBetsLoadPage(1);
          fetchMyBets(1, true);
        }
      }
    } catch (err) {
      // Connection polling retry
    }
  }, [getUserId, intervalMode, triggerBalanceUpdate, playSound, fetchMyBets]);

  // Load history page 1 on mount and when intervalMode changes
  useEffect(() => {
    setHistoryRows([]);
    setHistoryLoadPage(1);
    fetchHistory(1, true);
  }, [intervalMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load my bets page 1 when tab switches to myBets
  useEffect(() => {
    if (activeTab === 'myBets' && getUserId()) {
      setMyBetsRows([]);
      setMyBetsLoadPage(1);
      fetchMyBets(1, true);
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial poll & 2-second background loop
  useEffect(() => {
    pollGameState();
    const interval = setInterval(pollGameState, 2000);
    return () => clearInterval(interval);
  }, [pollGameState]);

  // Countdown 1-second ticker — sound only fires ONCE when countdown hits 5
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        const next = prev <= 1 ? intervalMode : prev - 1;

        if (prev <= 1) {
          // Period just reset — poll for new result and trigger balance sync
          setTimeout(() => {
            pollGameState();
            triggerBalanceUpdate();
          }, 500);
          setTimeout(() => {
            pollGameState();
            triggerBalanceUpdate();
          }, 1500);
          setTimeout(() => {
            pollGameState();
            triggerBalanceUpdate();
          }, 3000);
          // Refresh history list for the new period
          setTimeout(() => fetchHistory(1, true), 1000);
        } else if (prev === 6) {
          // Exactly when countdown goes from 6 -> 5: fire the 5-second alert sound ONCE
          playSound(() => soundEngine!.fiveSecondAlert());
        }

        prevCountdownRef.current = next;
        return next;
      });
      // Fallback local period ID sync
      setPeriodNumber(getLocalPeriodId(intervalMode));
    }, 1000);

    return () => clearInterval(timer);
  }, [intervalMode, pollGameState, getLocalPeriodId, playSound, fetchHistory, triggerBalanceUpdate]);

  // ─── Open bet modal — no sound here, sound fires on CONFIRM ─────────────────
  const openBetModal = (type: string, label: string, multiplier: number) => {
    if (isBettingClosed) {
      showToast('⚠️ Betting closed for the last 5 seconds of period!');
      return;
    }
    setBetModal({ isOpen: true, type, label, multiplier });
  };

  // ─── Confirm bet ──────────────────────────────────────────────────────────────
  const handleConfirmBet = async () => {
    const activeUserId = getUserId();
    if (!activeUserId) {
      setBetModal((prev) => ({ ...prev, isOpen: false }));
      setValidationModal({
        isOpen: true,
        type: 'AUTH_REQUIRED',
        message: 'Please log in to place bets in Parity.',
      });
      return;
    }

    const amount = parseFloat(betAmount || '10');
    if (!amount || amount <= 0 || isNaN(amount) || amount < 10) {
      setBetModal((prev) => ({ ...prev, isOpen: false }));
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Minimum bet amount for Parity is ₹10.',
        minBet: 10,
        maxBet: 10000,
        requiredAmount: amount || 0,
      });
      return;
    }

    if (amount > 10000) {
      setBetModal((prev) => ({ ...prev, isOpen: false }));
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Bet amount must be between ₹10 and ₹10,000.',
        minBet: 10,
        maxBet: 10000,
        requiredAmount: amount,
      });
      return;
    }

    if (currentBalance <= 0 || amount > currentBalance) {
      setBetModal((prev) => ({ ...prev, isOpen: false }));
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: `Your current balance (₹${currentBalance.toFixed(2)}) is insufficient for a ₹${amount.toFixed(2)} bet. Please recharge your wallet.`,
        requiredAmount: amount,
        currentBalance: currentBalance,
      });
      return;
    }

    setIsPlacingBet(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/parity/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, selectOption: betModal.type, amount, interval: intervalMode }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setBetModal((prev) => ({ ...prev, isOpen: false }));
        const errMsg = data.message || 'Bet placement failed';
        const msgLower = errMsg.toLowerCase();
        if (msgLower.includes('locked') || msgLower.includes('closed') || msgLower.includes('period')) {
          setValidationModal({
            isOpen: true,
            type: 'BETTING_CLOSED',
            message: errMsg,
          });
        } else if (msgLower.includes('balance') || msgLower.includes('insufficient')) {
          setValidationModal({
            isOpen: true,
            type: 'INSUFFICIENT_BALANCE',
            message: errMsg,
            requiredAmount: amount,
            currentBalance: currentBalance,
          });
        } else {
          setValidationModal({
            isOpen: true,
            type: 'GAME_ERROR',
            message: errMsg,
          });
        }
        return;
      }

      setBetModal((prev) => ({ ...prev, isOpen: false }));
      setActiveTab('myBets');
      showToast(`✅ ₹${amount.toFixed(2)} bet placed on ${betModal.label} — waiting for result...`);
      playSound(() => soundEngine!.betPlaced());

      // Instantly deduct & sync balance across app
      if (typeof data.new_balance === 'number') {
        triggerBalanceUpdate(data.new_balance);
      } else {
        triggerBalanceUpdate();
      }

      // Poll state immediately to show PENDING bet in table and updated balance
      pollGameState();
      // Refresh my bets list from paginated API
      setMyBetsRows([]);
      setMyBetsLoadPage(1);
      fetchMyBets(1, true);
    } catch {
      setBetModal((prev) => ({ ...prev, isOpen: false }));
      setValidationModal({
        isOpen: true,
        type: 'GAME_ERROR',
        message: 'Network error. Please check your connection.',
      });
    } finally {
      setIsPlacingBet(false);
    }
  };

  const isBettingClosed = countdown <= 5;
  const numAmount       = parseFloat(betAmount || '0');
  const contractAmount  = isNaN(numAmount) ? 0 : numAmount;
  const estWinPayout    = contractAmount * betModal.multiplier * 0.95 + contractAmount;

  return (
    <div className="font-sans text-gray-100 selection:bg-[#287BFF]/30 selection:text-[#00D9FF]">
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Main Game Area */}
        <div className="flex-1 space-y-4 min-w-0">

      {/* 1. INTERVAL SWITCHER (Only shown if gameMode is not explicitly set) */}
      {!gameMode && (
        <div className="flex items-center justify-center gap-2 p-1.5 bg-[#091C46] rounded-full border border-[#287BFF]/35 shadow-lg max-w-md mx-auto">
          {([30, 60] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { setIntervalMode(mode); setCountdown(mode); }}
              className={`flex-1 py-2.5 rounded-full text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                intervalMode === mode
                  ? 'bg-gradient-to-r from-[#287BFF] via-[#5B42FF] to-[#873BFF] text-white shadow-[0_0_16px_rgba(40,123,255,0.4)] border border-[#00D9FF]/40'
                  : 'text-[#9DB5D8] hover:text-white'
              }`}
            >
              {mode === 30
                ? <><i className="bi bi-lightning-charge-fill text-[#00E5A0]" /> 30s Fast Parity</>
                : <><i className="bi bi-clock-history text-[#00D9FF]" /> 1m Parity</>}
            </button>
          ))}
        </div>
      )}

      {/* Toast Notification Banner */}
      {message && (
        <div className="bg-[#287BFF] border border-[#00D9FF]/50 text-white text-xs font-bold py-2.5 px-4 rounded-2xl shadow-[0_0_20px_rgba(40,123,255,0.35)] text-center animate-in fade-in">
          {message}
        </div>
      )}

      {/* 2. MAIN GAME HEADER BANNER */}
      <div className="relative rounded-[24px] bg-gradient-to-r from-[#091735] via-[#091C46] to-[#0B2254] border border-[#287BFF]/40 p-4 sm:p-5 md:p-6 shadow-[0_0_30px_rgba(40,123,255,0.15)] overflow-hidden text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        {/* Glow light accents */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#00D9FF]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[#873BFF]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Left: Back button + Neon Icon + Title + Description */}
        <div className="flex items-center gap-3 z-10 w-full sm:w-auto">
          <a
            href="/"
            className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full bg-[#101C3A] border border-[#287BFF]/50 flex items-center justify-center text-[#00D9FF] hover:border-[#00D9FF] hover:shadow-[0_0_15px_rgba(0,217,255,0.4)] transition-all"
          >
            <i className="bi bi-arrow-left text-base sm:text-lg" />
          </a>
          <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-2xl bg-gradient-to-br from-[#00E5A0]/20 to-[#00D9FF]/20 border border-[#00E5A0]/50 flex items-center justify-center text-[#00E5A0] shadow-[0_0_15px_rgba(0,229,160,0.3)]">
            <i className="bi bi-lightning-charge-fill text-xl sm:text-2xl" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black text-white font-mono tracking-tight">
                  {intervalMode === 60 ? 'Parity' : 'Fast Parity'}
                </h1>
                <span className="bg-[#873BFF]/20 border border-[#873BFF]/60 text-[#873BFF] text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(135,59,255,0.35)]">
                  {intervalMode}s
                </span>
              </div>
              <button
                onClick={() => setShowRulesModal(true)}
                className="sm:hidden border border-[#00D9FF]/50 text-[#00D9FF] bg-[#101C3A] hover:bg-[#142650] px-3 py-1 rounded-full font-bold text-[11px] shadow-[0_0_10px_rgba(0,217,255,0.25)] flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                <i className="bi bi-book-fill text-[10px]" /> Rules
              </button>
            </div>
            <p className="text-[11px] sm:text-xs text-[#9DB5D8] font-medium mt-0.5 truncate sm:whitespace-normal">
              Pick a number and win! Fast & exciting game with instant results.
            </p>
          </div>
        </div>

        {/* Right: Balance Pill + Rules Button */}
        <div className="flex items-center gap-2 sm:gap-3 z-10 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-[#071735]/90 border border-[#00E5A0]/40 shadow-[0_0_12px_rgba(0,229,160,0.15)]">
            <span className="text-[10px] font-black text-[#9DB5D8] uppercase tracking-wider">Balance:</span>
            <span className="text-xs sm:text-sm font-black font-mono text-[#00E5A0]">₹{currentBalance.toFixed(2)}</span>
          </div>
          <button
            onClick={() => setShowRulesModal(true)}
            className="border border-[#00D9FF]/50 text-[#00D9FF] bg-[#101C3A] hover:bg-[#142650] px-4 py-2 rounded-full font-bold text-xs shadow-[0_0_14px_rgba(0,217,255,0.25)] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <i className="bi bi-book-fill text-xs" /> Rules
          </button>
        </div>
      </div>

      {/* 3. PERIOD INFORMATION SECTION */}
      <div className="bg-[#091C46] border border-[#00D9FF]/40 rounded-[22px] p-3.5 sm:p-5 shadow-[0_0_24px_rgba(0,217,255,0.15)] text-white">
        {/* Responsive layout: 2-column header on mobile, 3-column row on sm+ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-center">
          {/* Period Number */}
          <div>
            <span className="text-[10px] font-black text-[#9DB5D8] uppercase tracking-wider block">
              PERIOD NUMBER
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm sm:text-xl font-black font-mono text-[#00D9FF] drop-shadow-[0_0_10px_rgba(0,217,255,0.4)] truncate">
                #{periodNumber || getLocalPeriodId(intervalMode)}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(periodNumber || getLocalPeriodId(intervalMode));
                  showToast('📋 Period ID copied!');
                }}
                className="text-[#9DB5D8] hover:text-[#00D9FF] p-0.5 transition-colors cursor-pointer shrink-0"
                title="Copy Period ID"
              >
                <i className="bi bi-copy text-xs" />
              </button>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="flex items-center justify-end sm:justify-center gap-2 sm:gap-3 bg-[#071735] px-3 sm:px-5 py-2 rounded-2xl border border-[#287BFF]/30 shadow-inner">
            <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-[#00D9FF]/15 border border-[#00D9FF]/40 flex items-center justify-center text-[#00D9FF] animate-pulse shrink-0">
              <i className="bi bi-clock-history text-xs sm:text-lg" />
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-black text-[#9DB5D8] uppercase tracking-wider block">
                COUNTDOWN
              </span>
              <span className={`text-lg sm:text-3xl font-black font-mono tracking-tight drop-shadow-md ${
                countdown === 0 ? 'text-[#FFC928] animate-pulse' :
                isBettingClosed ? 'text-[#FF2468] animate-bounce' : 'text-[#00E5A0] drop-shadow-[0_0_14px_rgba(0,229,160,0.5)]'
              }`}>
                {countdown === 0 ? 'CALCULATING...' : `00:${String(countdown).padStart(2, '0')}`}
              </span>
            </div>
          </div>

          {/* Last Result Pill */}
          <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t border-[#287BFF]/20 sm:border-t-0">
            <span className="text-[10px] font-black text-[#9DB5D8] uppercase tracking-wider">
              LAST RESULT
            </span>
            {lastResult ? (
              <div className="flex items-center gap-1.5">
                {lastResult.colors.map(c => (
                  <span key={c} className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full font-mono font-black text-xs sm:text-sm flex items-center justify-center shadow-md ${
                    c === 'green' ? 'bg-[#00E5A0] text-[#050B20] shadow-[0_0_12px_rgba(0,229,160,0.4)]' :
                    c === 'red' ? 'bg-[#FF2468] text-white shadow-[0_0_12px_rgba(255,36,104,0.4)]' :
                    'bg-[#873BFF] text-white shadow-[0_0_12px_rgba(135,59,255,0.4)]'
                  }`}>
                    {lastResult.number}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs font-mono font-bold text-[#647FA8]">Waiting...</span>
            )}
          </div>
        </div>
      </div>

      {/* 5. BETTING SELECTION CARDS & GRID WRAPPER */}
      <div className="relative">
        {/* HUGE COUNTDOWN OVERLAY */}
        {isBettingClosed && countdown > 0 && (
          <div className="absolute -inset-2 z-20 flex items-center justify-center bg-[#050B20]/80 backdrop-blur-[2px] rounded-[24px]">
            <div className="text-[100px] sm:text-[140px] font-black font-mono text-[#FF2468] drop-shadow-[0_0_40px_rgba(255,36,104,0.8)] flex gap-4 sm:gap-8 animate-in zoom-in-75 duration-300">
              <span className="bg-[#091C46] px-4 sm:px-8 py-2 rounded-3xl border-2 sm:border-4 border-[#FF2468] shadow-2xl leading-none">{Math.floor(countdown / 10)}</span>
              <span className="bg-[#091C46] px-4 sm:px-8 py-2 rounded-3xl border-2 sm:border-4 border-[#FF2468] shadow-2xl leading-none">{countdown % 10}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3.5">
        {/* GREEN CARD */}
        <button
          disabled={isBettingClosed}
          onClick={() => openBetModal('green', 'GREEN', 2.0)}
          className="bg-gradient-to-r from-[#071735] to-[#091C46] border border-[#00E5A0] shadow-[0_0_20px_rgba(0,229,160,0.3)] hover:shadow-[0_0_30px_rgba(0,229,160,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-[14px] sm:rounded-[22px] p-2 sm:p-4 flex flex-col sm:flex-row items-center justify-center sm:justify-between group cursor-pointer text-center sm:text-left gap-1 sm:gap-0"
        >
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
            <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full bg-[#00E5A0]/20 border border-[#00E5A0] flex items-center justify-center text-[#00E5A0] text-sm sm:text-xl shadow-[0_0_12px_rgba(0,229,160,0.3)] shrink-0">
              🍃
            </div>
            <div>
              <span className="block text-[10px] sm:text-base font-black text-white uppercase tracking-wider leading-tight sm:leading-normal">JOIN GREEN</span>
              <span className="block text-[9px] sm:text-xs text-[#9DB5D8] font-bold mt-0.5">2X Payout</span>
            </div>
          </div>
          <div className="hidden sm:flex h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-[#00E5A0]/15 border border-[#00E5A0]/50 items-center justify-center text-[#00E5A0] group-hover:bg-[#00E5A0] group-hover:text-[#050B20] transition-all shrink-0">
            <i className="bi bi-arrow-right text-base sm:text-lg" />
          </div>
        </button>

        {/* VIOLET CARD */}
        <button
          disabled={isBettingClosed}
          onClick={() => openBetModal('violet', 'VIOLET', 4.5)}
          className="bg-gradient-to-r from-[#071735] to-[#091C46] border border-[#873BFF] shadow-[0_0_20px_rgba(135,59,255,0.35)] hover:shadow-[0_0_30px_rgba(135,59,255,0.55)] disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-[14px] sm:rounded-[22px] p-2 sm:p-4 flex flex-col sm:flex-row items-center justify-center sm:justify-between group cursor-pointer text-center sm:text-left gap-1 sm:gap-0"
        >
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
            <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full bg-[#873BFF]/20 border border-[#873BFF] flex items-center justify-center text-[#873BFF] text-sm sm:text-xl shadow-[0_0_12px_rgba(135,59,255,0.3)] shrink-0">
              💎
            </div>
            <div>
              <span className="block text-[10px] sm:text-base font-black text-white uppercase tracking-wider leading-tight sm:leading-normal">JOIN VIOLET</span>
              <span className="block text-[9px] sm:text-xs text-[#9DB5D8] font-bold mt-0.5">4.5X Payout</span>
            </div>
          </div>
          <div className="hidden sm:flex h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-[#873BFF]/15 border border-[#873BFF]/50 items-center justify-center text-[#873BFF] group-hover:bg-[#873BFF] group-hover:text-white transition-all shrink-0">
            <i className="bi bi-arrow-right text-base sm:text-lg" />
          </div>
        </button>

        {/* RED CARD */}
        <button
          disabled={isBettingClosed}
          onClick={() => openBetModal('red', 'RED', 2.0)}
          className="bg-gradient-to-r from-[#071735] to-[#091C46] border border-[#FF2468] shadow-[0_0_20px_rgba(255,36,104,0.35)] hover:shadow-[0_0_30px_rgba(255,36,104,0.55)] disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-[14px] sm:rounded-[22px] p-2 sm:p-4 flex flex-col sm:flex-row items-center justify-center sm:justify-between group cursor-pointer text-center sm:text-left gap-1 sm:gap-0"
        >
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
            <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full bg-[#FF2468]/20 border border-[#FF2468] flex items-center justify-center text-[#FF2468] text-sm sm:text-xl shadow-[0_0_12px_rgba(255,36,104,0.3)] shrink-0">
              ⭐
            </div>
            <div>
              <span className="block text-[10px] sm:text-base font-black text-white uppercase tracking-wider leading-tight sm:leading-normal">JOIN RED</span>
              <span className="block text-[9px] sm:text-xs text-[#9DB5D8] font-bold mt-0.5">2X Payout</span>
            </div>
          </div>
          <div className="hidden sm:flex h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-[#FF2468]/15 border border-[#FF2468]/50 items-center justify-center text-[#FF2468] group-hover:bg-[#FF2468] group-hover:text-white transition-all shrink-0">
            <i className="bi bi-arrow-right text-base sm:text-lg" />
          </div>
        </button>
      </div>

      {/* 6. NUMBER SELECTION GRID */}
      <div className="bg-[#091C46] border border-[#287BFF]/35 rounded-[22px] p-3.5 sm:p-5 shadow-xl space-y-3 sm:space-y-4 text-white">
        <div className="flex items-center justify-between border-b border-[#287BFF]/20 pb-2.5 sm:pb-3">
          <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 sm:gap-2">
            <i className="bi bi-grid-3x3-gap-fill text-[#00D9FF]" /> Select Number
          </h3>
          <span className="bg-[#287BFF]/20 border border-[#287BFF]/50 text-[#00D9FF] text-[10px] sm:text-xs font-black px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg shadow-[0_0_10px_rgba(0,217,255,0.25)]">
            9.0X MULTIPLIER
          </span>
        </div>

        {/* Always 5 columns across mobile & desktop for perfect 2-row layout (0-4 on top, 5-9 on bottom) */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
            let btnClass = 'bg-[#FF2468] hover:bg-[#FF3FA4] text-white border border-[#FF2468] shadow-[0_0_14px_rgba(255,36,104,0.35)]';
            if (n === 0 || n === 5) {
              btnClass = 'bg-gradient-to-r from-[#873BFF] via-[#A020F0] to-[#FF2DAA] text-white border border-[#FF2DAA]/60 shadow-[0_0_14px_rgba(255,45,170,0.35)]';
            } else if (n % 2 !== 0) {
              btnClass = 'bg-[#00C98D] hover:bg-[#00E5A0] text-[#050B20] border border-[#00E5A0] shadow-[0_0_14px_rgba(0,229,160,0.35)]';
            }

            return (
              <button
                key={n}
                disabled={isBettingClosed}
                onClick={() => openBetModal(String(n), `NUMBER ${n}`, 9.0)}
                className={`${btnClass} disabled:opacity-50 disabled:cursor-not-allowed h-11 sm:h-14 rounded-xl sm:rounded-2xl text-base sm:text-xl font-black font-mono shadow-md hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center cursor-pointer`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. BIG / SMALL SELECTION */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          disabled={isBettingClosed}
          onClick={() => openBetModal('big', 'BIG', 2.0)}
          className="bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white border border-[#F97316]/50 shadow-[0_0_20px_rgba(249,115,22,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-[14px] sm:rounded-[22px] p-3 sm:p-4 flex items-center justify-center cursor-pointer active:scale-95 text-lg sm:text-xl font-black uppercase tracking-widest"
        >
          BIG
        </button>
        <button
          disabled={isBettingClosed}
          onClick={() => openBetModal('small', 'SMALL', 2.0)}
          className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] text-white border border-[#3B82F6]/50 shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-[14px] sm:rounded-[22px] p-3 sm:p-4 flex items-center justify-center cursor-pointer active:scale-95 text-lg sm:text-xl font-black uppercase tracking-widest"
        >
          SMALL
        </button>
      </div>

        </div>
      </div>
    </div>

        {/* 7. HISTORY AND MY ORDERS SECTION */}
        <div className="w-full lg:w-[350px] xl:w-[400px] shrink-0">
          <div className="bg-[#091C46] border border-[#287BFF]/35 rounded-[24px] p-4 md:p-5 shadow-xl space-y-4 text-white h-full max-h-[800px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#287BFF]/50 scrollbar-track-transparent">
        {/* Tabs + Sound Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 bg-[#071735] p-1.5 rounded-full border border-[#287BFF]/25">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2.5 rounded-full text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-[#287BFF] via-[#5B42FF] to-[#873BFF] text-white shadow-[0_0_16px_rgba(40,123,255,0.4)] border border-[#00D9FF]/40'
                  : 'text-[#9DB5D8] hover:text-white'
              }`}
            >
              <i className="bi bi-clock-history" /> Period History
            </button>
            <button
              onClick={() => { setActiveTab('myBets'); pollGameState(); }}
              className={`flex-1 py-2.5 rounded-full text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'myBets'
                  ? 'bg-gradient-to-r from-[#287BFF] via-[#5B42FF] to-[#873BFF] text-white shadow-[0_0_16px_rgba(40,123,255,0.4)] border border-[#00D9FF]/40'
                  : 'text-[#9DB5D8] hover:text-white'
              }`}
            >
              <i className="bi bi-receipt" /> My Orders {myBetsPagination ? `(${myBetsPagination.total})` : ''}
            </button>
          </div>
        </div>

        {activeTab === 'history' ? (
          <div className="overflow-x-auto">
            {historyRows.length === 0 && !historyLoading ? (
              <p className="text-center text-xs text-[#647FA8] py-8">No period history yet.</p>
            ) : (
              <div>
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead className="text-[10px] text-[#9DB5D8] uppercase tracking-wider border-b border-[#287BFF]/20">
                    <tr>
                      <th className="py-3 px-3">PERIOD</th>
                      <th className="py-3 px-3 text-center">RESULT</th>
                      <th className="py-3 px-3 text-right">TIME</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#287BFF]/15">
                    {historyRows.map((h, i) => (
                      <tr key={`${h.periodNumber}-${i}`} className="bg-[#071735]/60 hover:bg-[#0B2254] transition-all">
                        <td className="py-3 px-3 text-[#00D9FF] font-bold text-[10px]">#{h.periodNumber}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex justify-center gap-1.5">
                            {h.colors.map((c) => (
                              <span key={c} className={`h-6 w-6 sm:h-7 sm:w-7 rounded-full font-mono font-black text-[10px] sm:text-xs flex items-center justify-center shadow-md ${
                                c === 'green' ? 'bg-[#00E5A0] text-[#050B20] shadow-[0_0_10px_rgba(0,229,160,0.3)]' : c === 'red' ? 'bg-[#FF2468] text-white shadow-[0_0_10px_rgba(255,36,104,0.3)]' : 'bg-[#873BFF] text-white shadow-[0_0_10px_rgba(135,59,255,0.3)]'
                              }`}>
                                {h.number}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-[#9DB5D8] text-[10px] whitespace-nowrap">
                          {formatTimestamp(h.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Load More / Pagination Info */}
                <div className="pt-3 pb-1 px-2 border-t border-[#287BFF]/20 mt-2 flex flex-col items-center gap-2">
                  {historyPagination && (
                    <span className="text-[10px] text-[#647FA8]">
                      Showing {historyRows.length} of {historyPagination.total} records
                    </span>
                  )}
                  {historyPagination?.has_next && (
                    <button
                      disabled={historyLoading}
                      onClick={() => fetchHistory(historyLoadPage + 1)}
                      className="w-full text-xs font-black py-2.5 rounded-xl bg-[#101C3A] text-[#9DB5D8] border border-[#287BFF]/30 disabled:opacity-50 disabled:cursor-not-allowed hover:text-[#00D9FF] hover:border-[#287BFF] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {historyLoading ? (
                        <><i className="bi bi-arrow-clockwise animate-spin" /> Loading...</>
                      ) : (
                        <><i className="bi bi-arrow-down-circle" /> Load More</>
                      )}
                    </button>
                  )}
                  {historyLoading && historyRows.length === 0 && (
                    <div className="py-4 flex justify-center">
                      <i className="bi bi-arrow-clockwise animate-spin text-[#287BFF] text-xl" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {!getUserId() ? (
              <div className="text-center py-8 space-y-3">
                <i className="bi bi-person-lock text-4xl text-[#647FA8]" />
                <p className="text-xs text-[#9DB5D8] font-bold">Login to see your order history</p>
                <a href="/login" className="inline-block text-xs font-black text-[#050B20] bg-[#00E5A0] px-5 py-2.5 rounded-full shadow-[0_0_14px_rgba(0,229,160,0.35)]">
                  Login Now
                </a>
              </div>
            ) : myBetsRows.length === 0 && !myBetsLoading ? (
              <p className="text-center text-xs text-[#647FA8] py-8">
                No orders placed yet. Place your first bet!
              </p>
            ) : (
              <div>
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead className="text-[10px] text-[#9DB5D8] uppercase tracking-wider border-b border-[#287BFF]/20">
                    <tr>
                      <th className="py-3 px-3">PERIOD</th>
                      <th className="py-3 px-3">SELECT</th>
                      <th className="py-3 px-3">AMOUNT</th>
                      <th className="py-3 px-3 text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#287BFF]/15">
                    {myBetsRows.map((b, i) => (
                      <tr key={`${b.id || b.periodNumber}-${i}`} className="bg-[#071735]/60 hover:bg-[#0B2254] transition-all">
                        <td className="py-3 px-3 text-[#00D9FF] text-[10px]">#{b.periodNumber}</td>
                        <td className="py-3 px-3 font-bold text-white uppercase text-[10px]">{b.selectOption}</td>
                        <td className="py-3 px-3 font-bold text-white text-[10px]">₹{b.amount.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right">
                          {b.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase text-[#050B20] bg-[#FFC928] animate-pulse">
                              <i className="bi bi-hourglass-split" /> PENDING
                            </span>
                          ) : b.status === 'won' ? (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase text-[#050B20] bg-[#00E5A0] shadow-[0_0_10px_rgba(0,229,160,0.4)]">
                              +₹{b.winAmount.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase text-white bg-[#FF2468]">
                              LOST
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Load More */}
                <div className="pt-3 pb-1 px-2 border-t border-[#287BFF]/20 mt-2 flex flex-col items-center gap-2">
                  {myBetsPagination && (
                    <span className="text-[10px] text-[#647FA8]">
                      Showing {myBetsRows.length} of {myBetsPagination.total} orders
                    </span>
                  )}
                  {myBetsPagination?.has_next && (
                    <button
                      disabled={myBetsLoading}
                      onClick={() => fetchMyBets(myBetsLoadPage + 1)}
                      className="w-full text-xs font-black py-2.5 rounded-xl bg-[#101C3A] text-[#9DB5D8] border border-[#287BFF]/30 disabled:opacity-50 disabled:cursor-not-allowed hover:text-[#00D9FF] hover:border-[#287BFF] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {myBetsLoading ? (
                        <><i className="bi bi-arrow-clockwise animate-spin" /> Loading...</>
                      ) : (
                        <><i className="bi bi-arrow-down-circle" /> Load More</>
                      )}
                    </button>
                  )}
                  {myBetsLoading && myBetsRows.length === 0 && (
                    <div className="py-4 flex justify-center">
                      <i className="bi bi-arrow-clockwise animate-spin text-[#287BFF] text-xl" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
          </div>
        </div>
      </div>

      {/* ── BET CONFIRMATION MODAL ────────────────────────────────────────── */}
      {betModal.isOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[100] bg-[#050B20]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#091C46] border border-[#00D9FF]/50 rounded-[28px] w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,217,255,0.35)] text-white relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className={`p-5 text-white flex items-center justify-between ${
              betModal.type === 'green'  ? 'bg-gradient-to-r from-[#00C98D] to-[#00E5A0] text-[#050B20]' :
              betModal.type === 'violet' ? 'bg-gradient-to-r from-[#873BFF] to-[#A020F0]'  :
              betModal.type === 'red'    ? 'bg-gradient-to-r from-[#FF2468] to-[#FF3FA4]'    :
              betModal.type === 'big'    ? 'bg-gradient-to-r from-[#F97316] to-[#EA580C]'    :
              betModal.type === 'small'  ? 'bg-gradient-to-r from-[#3B82F6] to-[#2563EB]'    : 'bg-gradient-to-r from-[#287BFF] to-[#00D9FF] text-[#050B20]'
            }`}>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider">
                  Place Bet on {betModal.label}
                </h3>
                <span className="text-xs opacity-90 font-mono font-bold">
                  {betModal.multiplier}X PAYOUT MULTIPLIER
                </span>
              </div>
              <button
                onClick={() => setBetModal((p) => ({ ...p, isOpen: false }))}
                className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white font-bold cursor-pointer"
              >✕</button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-[#9DB5D8] uppercase tracking-wider mb-2">
                  PRESET STAKE AMOUNT (₹)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['10', '100', '1000', '10000'].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setBetAmount(amt)}
                      className={`py-2.5 text-xs font-black font-mono rounded-xl border transition-all cursor-pointer ${
                        betAmount === amt
                          ? 'bg-[#287BFF] text-white border-[#00D9FF] shadow-[0_0_12px_rgba(0,217,255,0.4)]'
                          : 'bg-[#071735] text-[#9DB5D8] border-[#287BFF]/30 hover:border-[#287BFF]'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#9DB5D8] uppercase tracking-wider mb-1.5">
                  CUSTOM AMOUNT (₹)
                </label>
                <div className="flex items-center border border-[#287BFF]/40 rounded-xl overflow-hidden bg-[#071735] p-1.5 focus-within:border-[#00D9FF] shadow-inner">
                  <span className="px-3 text-sm font-bold text-[#00D9FF]">₹</span>
                  <input
                    type="number"
                    min="10"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="w-full bg-transparent py-1.5 text-base font-black font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-[#0B2254] border border-[#287BFF]/35 rounded-2xl p-4 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-[#9DB5D8]">
                  <span>Available Balance:</span>
                  <span className="font-bold text-[#00E5A0]">₹{currentBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#9DB5D8]">
                  <span>Contract Amount:</span>
                  <span className="font-bold text-white">₹{contractAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#9DB5D8]">
                  <span>Multiplier Payout:</span>
                  <span className="font-bold text-[#00D9FF]">{betModal.multiplier.toFixed(1)}X</span>
                </div>
                <div className="border-t border-[#287BFF]/30 pt-2 flex justify-between font-black text-white">
                  <span>Est. Win Payout:</span>
                  <span className="text-[#00E5A0] text-sm drop-shadow">₹{estWinPayout.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => setBetModal((p) => ({ ...p, isOpen: false }))}
                  className="py-3.5 text-xs font-bold text-[#9DB5D8] bg-[#0B2254] hover:bg-[#101C3A] border border-[#287BFF]/30 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBet}
                  disabled={isPlacingBet}
                  className={`py-3.5 text-xs font-black rounded-xl active:scale-95 transition-all cursor-pointer disabled:opacity-60 ${
                    betModal.type === 'green'  ? 'text-[#050B20] bg-gradient-to-r from-[#00E5A0] to-[#00C98D] shadow-[0_0_20px_rgba(0,229,160,0.4)] hover:from-[#26F2B5] hover:to-[#00E5A0]' :
                    betModal.type === 'violet' ? 'text-white bg-gradient-to-r from-[#873BFF] to-[#A020F0] shadow-[0_0_20px_rgba(135,59,255,0.4)] hover:from-[#9B51FF] hover:to-[#873BFF]' :
                    betModal.type === 'red'    ? 'text-white bg-gradient-to-r from-[#FF2468] to-[#FF3FA4] shadow-[0_0_20px_rgba(255,36,104,0.4)] hover:from-[#FF427E] hover:to-[#FF2468]' :
                    betModal.type === 'big'    ? 'text-white bg-gradient-to-r from-[#F97316] to-[#EA580C] shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:from-[#EA580C] hover:to-[#C2410C]' :
                    betModal.type === 'small'  ? 'text-white bg-gradient-to-r from-[#3B82F6] to-[#2563EB] shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:from-[#2563EB] hover:to-[#1D4ED8]' :
                    'text-[#050B20] bg-gradient-to-r from-[#287BFF] to-[#00D9FF] shadow-[0_0_20px_rgba(40,123,255,0.4)] hover:from-[#3A8BFF] hover:to-[#287BFF]'
                  }`}
                >
                  {isPlacingBet ? 'PLACING...' : 'CONFIRM BET'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WINNER RESULT POPUP MODAL (CONGRATULATIONS!) ─────────────────── */}
      {winModalData && (
        <div className="fixed inset-0 w-screen h-screen z-[100] bg-[#050B20]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091C46] border border-[#00E5A0]/60 rounded-3xl w-full max-w-[280px] overflow-hidden shadow-[0_0_40px_rgba(0,229,160,0.4)] text-center text-white relative animate-in zoom-in-75 fade-in duration-300">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-[#00C98D] via-[#00E5A0] to-[#00C98D] p-5 text-[#050B20] relative overflow-hidden">
              <div className="text-4xl mb-1 drop-shadow-md animate-bounce">🏆</div>
              <h3 className="text-lg font-black tracking-wide drop-shadow">YOU WON!</h3>
              <p className="text-[10px] font-mono font-bold tracking-tight opacity-90">Period #{winModalData.period_number}</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Winning Number */}
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="text-[10px] font-black text-[#9DB5D8] uppercase tracking-wider">
                  RESULT
                </span>
                <div className="flex items-center gap-1.5">
                  {winModalData.winning_colors.map((c) => (
                    <span key={c} className={`h-10 w-10 rounded-full font-mono font-black text-lg flex items-center justify-center shadow-md ${
                      c === 'green' ? 'bg-[#00E5A0] text-[#050B20] shadow-[0_0_12px_rgba(0,229,160,0.5)]' :
                      c === 'red' ? 'bg-[#FF2468] text-white shadow-[0_0_12px_rgba(255,36,104,0.5)]' :
                      'bg-[#873BFF] text-white shadow-[0_0_12px_rgba(135,59,255,0.5)]'
                    }`}>
                      {winModalData.winning_number}
                    </span>
                  ))}
                </div>
              </div>

              {/* Win Amount Highlight Box */}
              <div className="bg-[#0B2254] border border-[#00E5A0]/50 rounded-2xl p-3 shadow-inner">
                <span className="text-[10px] font-black text-[#00E5A0] uppercase block tracking-wider mb-0.5">
                  PAYOUT
                </span>
                <span className="text-2xl font-black font-mono text-[#00E5A0] drop-shadow-[0_0_12px_rgba(0,229,160,0.6)]">
                  +₹{winModalData.win_amount}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LOSER RESULT POPUP MODAL (BETTER LUCK NEXT TIME) ─────────────── */}
      {lossModalData && (
        <div className="fixed inset-0 w-screen h-screen z-[100] bg-[#050B20]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091C46] border border-[#FF2468]/60 rounded-3xl w-full max-w-[280px] overflow-hidden shadow-[0_0_40px_rgba(255,36,104,0.4)] text-center text-white relative animate-in zoom-in-75 fade-in duration-300">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-[#FF2468] via-[#FF3FA4] to-[#FF2468] p-5 text-white text-center relative overflow-hidden">
              <div className="text-4xl mb-1 filter drop-shadow-[0_0_10px_rgba(255,36,104,0.8)]">💔</div>
              <h3 className="text-lg font-black tracking-wide drop-shadow">BETTER LUCK NEXT TIME!</h3>
              <p className="text-[10px] font-mono font-bold tracking-tight text-white/90">Period #{lossModalData.period_number}</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Winning Number */}
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="text-[10px] font-black text-[#9DB5D8] uppercase tracking-wider">
                  RESULT
                </span>
                <div className="flex items-center gap-1.5">
                  {lossModalData.winning_colors.map((c) => (
                    <span key={c} className={`h-10 w-10 rounded-full font-mono font-black text-lg flex items-center justify-center shadow-md ${
                      c === 'green' ? 'bg-[#00E5A0] text-[#050B20] shadow-[0_0_12px_rgba(0,229,160,0.5)]' :
                      c === 'red' ? 'bg-[#FF2468] text-white shadow-[0_0_12px_rgba(255,36,104,0.5)]' :
                      'bg-[#873BFF] text-white shadow-[0_0_12px_rgba(135,59,255,0.5)]'
                    }`}>
                      {lossModalData.winning_number}
                    </span>
                  ))}
                </div>
              </div>

              {/* Loss Details Box */}
              <div className="bg-[#0B2254] border border-[#FF2468]/30 rounded-2xl p-3 text-[10px] font-mono space-y-1.5 text-center">
                <div className="flex justify-between text-[#9DB5D8]">
                  <span>YOUR STAKE:</span>
                  <span className="font-bold text-[#FF2468] drop-shadow-sm">₹{lossModalData.bet_amount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RULES MODAL ────────────────────────────────────────────────────── */}
      {showRulesModal && (
        <div className="fixed inset-0 w-screen h-screen z-[100] bg-[#050B20]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#091C46] border border-[#287BFF]/50 rounded-[28px] w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(40,123,255,0.35)] p-6 space-y-4 text-white relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#287BFF]/30 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <i className="bi bi-book-fill text-[#00D9FF]" /> Fast Parity Rules
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="h-8 w-8 rounded-full bg-[#071735] text-[#9DB5D8] hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
              >✕</button>
            </div>
            <div className="space-y-3 text-xs text-[#9DB5D8] leading-relaxed">
              <p><strong className="text-white">Game Interval:</strong> Each round lasts 30s (Fast) or 60s (Parity). Betting open during first 25s/55s.</p>
              <p><strong className="text-white">Last 5 Seconds:</strong> Betting closes at 00:05. All bets show as <span className="font-black text-[#FFC928]">PENDING</span>.</p>
              <p><strong className="text-white">Result Reveal:</strong> When countdown hits 00:00, your PENDING bets update to <span className="font-black text-[#00E5A0]">WON</span> or <span className="font-black text-[#FF2468]">LOST</span> automatically.</p>
              <p><strong className="text-white">Color Multipliers:</strong>
                <br />• <strong className="text-[#00E5A0]">GREEN:</strong> 2.0X on 1,3,7,9 — 1.5X on 5.
                <br />• <strong className="text-[#FF2468]">RED:</strong> 2.0X on 2,4,6,8 — 1.5X on 0.
                <br />• <strong className="text-[#873BFF]">VIOLET:</strong> 4.5X on 0 or 5.
              </p>
              <p><strong className="text-white">Number:</strong> Exact number prediction pays <strong className="text-[#00D9FF]">9.0X</strong>.</p>
            </div>
            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-3.5 text-xs font-black text-[#050B20] bg-[#00E5A0] hover:bg-[#26F2B5] rounded-xl shadow-[0_0_16px_rgba(0,229,160,0.35)] cursor-pointer uppercase tracking-wider"
            >
              GOT IT
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
    </div>
  );
}
