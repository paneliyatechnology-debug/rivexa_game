'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { TopHeader, BottomNavigation } from '@/components/Navigation';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { FastParityGame } from '@/components/FastParityGame';
import { AviatorGame } from '@/components/AviatorGame';
import { JetXGame } from '@/components/JetXGame';
import { SpinGame } from '@/components/SpinGame';
import { AndarBaharGame } from '@/components/AndarBaharGame';
import { PushparaniGame } from '@/components/PushparaniGame';
import CoinFlipGame from '@/components/CoinFlipGame';
import { DiceGame } from '@/components/DiceGame';
import { MinesGame } from '@/components/MinesGame';
import HiloGame from '@/components/HiloGame';
import ChickenRoadGame from '@/components/game/chicken-road/ChickenRoadGame';
import PenaltyShootoutGame from '@/components/game/penalty-shootout/PenaltyShootoutGame';
import { getApiBaseUrl } from '@/lib/config';
import ValidationErrorModal, { ValidationErrorType } from '@/components/ValidationErrorModal';
import { useAuth } from '@/context/AuthContext';
import { useGameTokenValidation } from '@/hooks/useGameTokenValidation';
import { InvalidCredentialsModal } from '@/components/InvalidCredentialsModal';

export default function PlayGamePage() {
  const params = useParams();
  const slug = (params.slug as string) || 'crash';

  const { isInvalid, errorMessage } = useGameTokenValidation();
  const { user: authUser, balance: authBalance, refreshBalance } = useAuth();

  // If page was accessed directly without session token query parameters, auto-create a session & update address bar URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const hasToken =
      urlParams.get('st') ||
      urlParams.get('gt') ||
      urlParams.get('ticket') ||
      urlParams.get('t') ||
      urlParams.get('authToken') ||
      urlParams.get('token') ||
      urlParams.get('sessionToken');

    if (!hasToken) {
      const apiBase = getApiBaseUrl();
      const token = localStorage.getItem('rivexa_token') || '00000000-0000-4000-a000-000000000000';
      fetch(`${apiBase}/games/${slug}/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: 'REAL', currency: 'INR' }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.launchUrl) {
            window.history.replaceState(null, '', data.launchUrl);
            if (data?.token) {
              sessionStorage.setItem('gs_token', data.token);
            }
            if (data?.sessionId) {
              sessionStorage.setItem('gs_active_session_id', data.sessionId);
            }
          }
        })
        .catch(() => {});
    }
  }, [slug]);

  if (isInvalid) {
    return (
      <div className="w-full min-h-screen bg-[#050B20] text-gray-100 flex flex-col font-sans">
        <InvalidCredentialsModal
          isOpen={true}
          message={errorMessage || 'Invalid user login credentials(Error:45)'}
        />
      </div>
    );
  }

  if (slug === 'hilo') {
    return <HiloGame />;
  }

  if (slug === 'coin-flip' || slug === 'flipcoin') {
    return <CoinFlipGame />;
  }

  if (slug === 'dice') {
    return <DiceGame />;
  }

  if (slug === 'crash') {
    return <AviatorGame />;
  }

  if (slug === 'jet') {
    return <JetXGame />;
  }

  if (slug === 'spin') {
    return <SpinGame />;
  }

  if (slug === 'andar-bahar') {
    return <AndarBaharGame />;
  }

  if (slug === 'pushparani' || slug === 'horn-ok-please' || slug === 'pushparani-2') {
    return <PushparaniGame />;
  }

  if (slug === 'mines') {
    return <MinesGame />;
  }

  if (slug === 'chicken-road' || slug === 'chickenroad') {
    return <ChickenRoadGame />;
  }

  if (slug === 'penalty' || slug === 'penalty-shootout' || slug === 'penalty-nations-cup') {
    return <PenaltyShootoutGame />;
  }

  const [userState, setUserState] = useState<{ id: string; email: string } | null>(null);
  const [localBalance, setLocalBalance] = useState<number | null>(null);

  useEffect(() => {
    if (authBalance !== undefined && authBalance !== null) {
      setLocalBalance(authBalance);
    }
  }, [authBalance]);

  const user = authUser || userState;
  const balance = localBalance !== null ? localBalance : (authBalance ?? 0);

  const setBalance = (updater: number | ((prev: number) => number)) => {
    setLocalBalance((prev) => {
      const current = prev !== null ? prev : (authBalance ?? 0);
      return typeof updater === 'function' ? updater(current) : updater;
    });
  };
  const [betAmount, setBetAmount] = useState<string>('100');
  const [autoCashout, setAutoCashout] = useState<string>('');
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
  const [activeTab, setActiveTab] = useState<'orders' | 'players'>('orders');

  // Multiplier history pills
  const [historyPills, setHistoryPills] = useState<number[]>([1.58, 2.34, 1.12, 4.56, 1.89, 12.40]);

  // Jet/Crash engine state
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [isFlying, setIsFlying] = useState<boolean>(false);
  const [cashedOut, setCashedOut] = useState<boolean>(false);
  const [cashedMultiplier, setCashedMultiplier] = useState<number>(0);
  const [roundId, setRoundId] = useState<string>('19100002');
  const [orders, setOrders] = useState<any[]>([]);

  // Mines state
  const [minesCount, setMinesCount] = useState<number>(3);
  const [minesGameId, setMinesGameId] = useState<string | null>(null);
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [minesStatus, setMinesStatus] = useState<string>('IDLE');
  const [minesMultiplier, setMinesMultiplier] = useState<number>(1.0);
  const [minesWinModal, setMinesWinModal] = useState<{ isOpen: boolean; payout: number; multiplier: number; title: string } | null>(null);
  const [minesBoomModal, setMinesBoomModal] = useState<{ isOpen: boolean; betAmount: number; mineCount: number } | null>(null);

  // Parity state
  const [parityPeriodId, setParityPeriodId] = useState<string>('202609190042');

  // Dice state
  const [targetNumber, setTargetNumber] = useState<number>(50);
  const [rollType, setRollType] = useState<'over' | 'under'>('over');

  // Spin state
  const [spinColor, setSpinColor] = useState<string | null>(null);

  // Andar Bahar state
  const [jokerCard, setJokerCard] = useState<string | null>(null);
  const [cardsDealt, setCardsDealt] = useState<any[]>([]);

  // Dice animation states
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

  // Helper to update orders state AND persist to localStorage so history is NEVER lost on refresh
  const saveAndSetOrders = (updater: any[] | ((prev: any[]) => any[])) => {
    setOrders((prev) => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`rivexa_orders_${slug}`, JSON.stringify(updated.slice(0, 100)));
        } catch (e) {}
      }
      return updated;
    });
  };

  useEffect(() => {
    let currentUserId = 'demo_user';
    const saved = localStorage.getItem('rivexa_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setUserState(u);
        currentUserId = u.id;
        refreshBalance();
      } catch (e) {
        // ignore
      }
    }

    // Load saved orders from localStorage for current game slug so history is preserved on page refresh
    if (typeof window !== 'undefined') {
      try {
        const savedOrdersKey = `rivexa_orders_${slug}`;
        const localSaved = localStorage.getItem(savedOrdersKey);
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOrders(parsed);
          } else {
            setOrders([]);
          }
        } else {
          setOrders([]);
        }
      } catch (e) {}
    }

    if (slug === 'mines') {
      fetchMinesHistory(currentUserId);
    }
    if (slug === 'dice') {
      fetchDiceState(currentUserId);
    }
  }, [slug]);

  const fetchMinesHistory = async (userId: string) => {
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/games/mines/history?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          saveAndSetOrders(data);
        }
      }
    } catch (e) {
      // fallback
    }
  };

  const fetchDiceState = async (userId: string) => {
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/games/dice/state?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user_balance !== undefined) {
          setBalance(Number(data.user_balance));
        }
        if (Array.isArray(data.my_bets) && data.my_bets.length > 0) {
          const diceOrders = data.my_bets.map((b: any) => ({
            id: b.id,
            roundId: b.id.slice(0, 8).toUpperCase(),
            stake: b.betAmount,
            multiplier: b.status === 'WON' ? b.multiplier : 0,
            payout: b.payoutAmount,
            status: b.status,
            option: `${(b.rollType || 'over').toUpperCase()} ${b.targetNumber}`,
            createdAt: b.createdAt,
          }));
          saveAndSetOrders(diceOrders);
        }
      }
    } catch (e) {
      // fallback
    }
  };

  const fetchBalance = async (userId: string) => {
    try {
      if (refreshBalance) {
        refreshBalance().catch(() => {});
      }
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/wallet/balance?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        const mainBal = Number(data.mainBalance);
        if (!isNaN(mainBal)) {
          setLocalBalance(mainBal);
        }
      }
    } catch (e) {
      // fallback
    }
  };

  useEffect(() => {
    const handleBalanceEvent = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce?.detail?.newBalance !== undefined && typeof ce.detail.newBalance === 'number') {
        setLocalBalance(ce.detail.newBalance);
      } else {
        if (user?.id) fetchBalance(user.id);
      }
    };
    window.addEventListener('balance_updated', handleBalanceEvent);
    return () => window.removeEventListener('balance_updated', handleBalanceEvent);
  }, [user?.id]);

  // Jet flight animation tick
  useEffect(() => {
    let timer: any;
    if (isFlying) {
      timer = setInterval(() => {
        setMultiplier((prev) => {
          const next = +(prev + 0.05).toFixed(2);
          if (next > 8.5) {
            setIsFlying(false);
            setMessage('💥 JET EXPLODED @ 8.50x!');
            setHistoryPills((p) => [8.5, ...p]);
            return 1.0;
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isFlying]);

  const validateBetBeforePlay = (amount: number, minBet: number = 10, maxBet: number = 10000): boolean => {
    if (!user || !user.id) {
      setValidationModal({
        isOpen: true,
        type: 'AUTH_REQUIRED',
        message: 'Please log in or create an account to place bets and play.',
      });
      return false;
    }
    if (isNaN(amount) || amount < minBet) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: `Minimum bet amount is ₹${minBet}.`,
        minBet,
        maxBet,
        requiredAmount: amount || 0,
      });
      return false;
    }
    if (amount > maxBet) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: `Bet amount must be between ₹${minBet} and ₹${maxBet.toLocaleString('en-IN')}.`,
        minBet,
        maxBet,
        requiredAmount: amount,
      });
      return false;
    }
    if (balance <= 0 || amount > balance) {
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: `Your current balance (₹${balance.toFixed(2)}) is insufficient for a ₹${amount.toFixed(2)} bet. Please recharge your wallet.`,
        requiredAmount: amount,
        currentBalance: balance,
      });
      return false;
    }
    return true;
  };

  const handleStartJetBet = async () => {
    setMessage('');
    const amount = parseFloat(betAmount || '100');
    if (!validateBetBeforePlay(amount, 10, 10000)) return;

    setMultiplier(1.0);
    setIsFlying(true);
    setCashedOut(false);
    setCashedMultiplier(0);
    setRoundId(String(Math.floor(10000000 + Math.random() * 90000000)));

    const userId = user!.id;

    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/games/crash/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roundId, amount }),
      });
      const data = await res.json();
      if (res.ok) {
        refreshBalance();
      } else {
        setValidationModal({
          isOpen: true,
          type: res.status === 400 && data.message?.toLowerCase().includes('balance') ? 'INSUFFICIENT_BALANCE' : 'GAME_ERROR',
          message: data.message || 'Failed to place Jet bet',
          currentBalance: balance,
          requiredAmount: amount,
        });
        setIsFlying(false);
        refreshBalance();
      }
    } catch (e: any) {
      setIsFlying(false);
      refreshBalance();
    }
  };

  const handleCashoutJet = async () => {
    if (isFlying && !cashedOut) {
      setCashedOut(true);
      setCashedMultiplier(multiplier);
      setIsFlying(false);

      const userId = user?.id || 'demo_user';
      const amount = parseFloat(betAmount || '100');
      const payout = amount * multiplier;

      try {
        const apiUrl = getApiBaseUrl();
        await fetch(`${apiUrl}/games/crash/cashout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, amount, cashoutMultiplier: multiplier, crashPoint: 10.0 }),
        });
        refreshBalance();
      } catch (e) {
        refreshBalance();
      }

      setMessage(`🎉 Cashed out @ ${multiplier.toFixed(2)}x! Payout: ₹${payout.toFixed(2)}`);
      setOrders((o) => [{ id: Date.now(), roundId, stake: amount, multiplier, payout, status: 'WON' }, ...o]);
      setHistoryPills((p) => [multiplier, ...p]);
    }
  };

  // Mines handlers
  const handleStartMines = async () => {
    setMessage('');
    const amt = parseFloat(betAmount || '100');
    if (!validateBetBeforePlay(amt, 10, 10000)) return;

    try {
      const userId = user!.id;
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/games/mines/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, betAmount: amt, mineCount: minesCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setValidationModal({
          isOpen: true,
          type: res.status === 400 && data.message?.toLowerCase().includes('balance') ? 'INSUFFICIENT_BALANCE' : 'GAME_ERROR',
          message: data.message || 'Failed to start Mines',
          currentBalance: balance,
          requiredAmount: amt,
        });
        return;
      }

      setMinesGameId(data.gameId);
      setRevealedTiles(data.revealedTiles || []);
      setMinesMultiplier(Number(data.multiplier) || 1.0);
      setMinePositions([]);
      setMinesStatus('PLAYING');
      refreshBalance();

      const newOrder = {
        id: data.gameId,
        roundId: data.gameId.slice(-8).toUpperCase(),
        stake: parseFloat(betAmount),
        multiplier: 1.0,
        payout: 0,
        status: 'PENDING',
        mineCount: minesCount,
        createdAt: new Date().toISOString(),
      };
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== data.gameId)]);
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleRevealTile = async (tileIndex: number) => {
    if (!minesGameId || minesStatus !== 'PLAYING') return;
    try {
      const userId = user?.id || 'demo_user';
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/games/mines/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, gameId: minesGameId, tileIndex }),
      });
      const data = await res.json();

      if (data.hitMine || data.isMine) {
        setMinesStatus('LOST');
        const mines = (data.minePositions || []) as number[];
        setMinePositions(mines);
        setRevealedTiles((prev) => Array.from(new Set([...prev, ...(data.revealedTiles || [])])).filter((t) => !mines.includes(t)));
        setMinesMultiplier(1.0);
        setMessage('💥 BOOM! Hit a mine!');
        setMinesBoomModal({
          isOpen: true,
          betAmount: parseFloat(betAmount || '100'),
          mineCount: minesCount,
        });

        setOrders((prev) =>
          prev.map((o) => (o.id === minesGameId ? { ...o, status: 'LOST', multiplier: 1.0, payout: 0 } : o))
        );
        refreshBalance();
      } else {
        setRevealedTiles((prev) => {
          const serverTiles = Array.isArray(data.revealedTiles) ? data.revealedTiles : [];
          return Array.from(new Set([...prev, tileIndex, ...serverTiles]));
        });
        if (data.multiplier !== undefined && data.multiplier !== null) {
          setMinesMultiplier(Number(data.multiplier) || 1.0);
        }
        if (data.status === 'WON') {
          setMinesStatus('WON');
          setMinePositions(data.minePositions || []);
          const winAmt = Number(data.winAmount || data.payout || data.currentPayout || 0);
          const mult = Number(data.multiplier || minesMultiplier || 1.0);
          setMessage(`🎉 Field cleared! Won ₹${winAmt.toFixed(2)}!`);
          setMinesWinModal({
            isOpen: true,
            payout: winAmt,
            multiplier: mult,
            title: '🏆 FIELD CLEARED!',
          });
          refreshBalance();

          setOrders((prev) =>
            prev.map((o) => (o.id === minesGameId ? { ...o, status: 'WON', multiplier: mult, payout: winAmt } : o))
          );
          refreshBalance();
        }
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleCashoutMines = async () => {
    if (!minesGameId || minesStatus !== 'PLAYING') return;
    try {
      const userId = user?.id || 'demo_user';
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/games/mines/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, gameId: minesGameId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMinesStatus('CASHED_OUT');
      setMinePositions(data.minePositions || []);
      const mult = Number(data.multiplier || minesMultiplier || 1.0);
      const payoutVal = Number(data.payout || data.winAmount || 0);
      setMessage(`💰 Cashed Out @ ${mult.toFixed(2)}x! Won ₹${payoutVal.toFixed(2)}!`);
      setMinesWinModal({
        isOpen: true,
        payout: payoutVal,
        multiplier: mult,
        title: '💰 CASHED OUT!',
      });
      refreshBalance();

      setOrders((prev) =>
        prev.map((o) => (o.id === minesGameId ? { ...o, status: 'CASHED_OUT', multiplier: mult, payout: payoutVal } : o))
      );
      refreshBalance();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  // Parity Handler
  const handleParityBet = async (option: string) => {
    setMessage('');
    const amount = parseFloat(betAmount || '100');
    if (!validateBetBeforePlay(amount, 10, 10000)) return;
    try {
      const userId = user!.id;
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/games/parity/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, selectOption: option, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const isWin = !!data.isWin;
      const payout = isWin ? Number(data.payout || 0) : 0;
      const mult = isWin ? (amount > 0 ? payout / amount : 1.95) : 0;

      const newOrder = {
        id: Date.now().toString(),
        roundId: parityPeriodId,
        stake: amount,
        multiplier: mult,
        payout: payout,
        status: isWin ? 'WON' : 'LOST',
        option: option.toUpperCase(),
        createdAt: new Date().toISOString(),
      };
      setOrders((prev) => [newOrder, ...prev]);

      if (isWin) {
        setMessage(`🎉 Result ${data.resultNumber} (${data.resultColor}). Won ₹${payout.toFixed(2)}!`);
      } else {
        setMessage(`💔 Result ${data.resultNumber} (${data.resultColor}). Better luck next round!`);
      }
      refreshBalance();
    } catch (err: any) {
      setValidationModal({
        isOpen: true,
        type: err.message?.toLowerCase().includes('balance') ? 'INSUFFICIENT_BALANCE' : 'GAME_ERROR',
        message: err.message || 'Failed to place Parity bet',
        currentBalance: balance,
        requiredAmount: amount,
      });
      refreshBalance();
    }
  };

  // Spin Handler
  const handleSpin = async (color: string) => {
    setMessage('');
    const amount = parseFloat(betAmount || '100');
    if (!validateBetBeforePlay(amount, 10, 10000)) return;
    try {
      const userId = user!.id;
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/games/spin/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, selectedColor: color, betAmount: amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSpinColor(data.resultColor);
      const isWin = !!data.isWin;
      const payout = isWin ? Number(data.payoutAmount || 0) : 0;
      const mult = isWin ? (amount > 0 ? payout / amount : 2.0) : 0;

      const newOrder = {
        id: Date.now().toString(),
        roundId: String(Math.floor(Date.now() / 1000)),
        stake: amount,
        multiplier: mult,
        payout: payout,
        status: isWin ? 'WON' : 'LOST',
        option: color.toUpperCase(),
        createdAt: new Date().toISOString(),
      };
      setOrders((prev) => [newOrder, ...prev]);

      if (isWin) {
        setMessage(`🎡 Landed on ${data.resultColor.toUpperCase()}! Won ₹${payout.toFixed(2)}!`);
      } else {
        setMessage(`🎡 Landed on ${data.resultColor.toUpperCase()}. Loss.`);
      }
      refreshBalance();
    } catch (err: any) {
      setValidationModal({
        isOpen: true,
        type: err.message?.toLowerCase().includes('balance') ? 'INSUFFICIENT_BALANCE' : 'GAME_ERROR',
        message: err.message || 'Failed to spin wheel',
        currentBalance: balance,
        requiredAmount: amount,
      });
      refreshBalance();
    }
  };

  // Dice Handler with Smooth Rolling Animation & Sound Feel
  const handleRollDice = async () => {
    if (isRollingDice) return;
    setMessage('');
    const amount = parseFloat(betAmount || '100');

    // 1. Validate IMMEDIATELY on button click
    if (!validateBetBeforePlay(amount, 20, 10000)) return;

    try {
      const userId = user!.id;
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/games/dice/roll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetNumber, rollType, betAmount: amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        setValidationModal({
          isOpen: true,
          type: res.status === 400 && data.message?.toLowerCase().includes('balance') ? 'INSUFFICIENT_BALANCE' : 'INVALID_BET',
          message: data.message || 'Failed to roll dice',
          currentBalance: balance,
          requiredAmount: amount,
          minBet: 20,
          maxBet: 10000,
        });
        refreshBalance();
        return;
      }

      // 2. API OK -> Now start rolling animation!
      setIsRollingDice(true);
      const rollInterval = setInterval(() => {
        setDiceDisplayVal(Math.floor(1 + Math.random() * 99));
      }, 45);

      await new Promise((resolve) => setTimeout(resolve, 1000));
      clearInterval(rollInterval);

      const isWin = !!data.isWin;
      const rolledNumber = Number(data.rolledNumber || Math.floor(Math.random() * 100));
      const payout = isWin ? Number(data.payoutAmount || 0) : 0;
      const mult = isWin ? Number(data.multiplier || 1.95) : 0;

      setDiceDisplayVal(rolledNumber);
      setLastDiceResult({
        rolledNumber,
        isWin,
        payoutAmount: payout,
        multiplier: mult,
        targetNumber,
        rollType,
      });

      const newOrder = {
        id: Date.now().toString(),
        roundId: String(Math.floor(100000 + Math.random() * 900000)),
        stake: amount,
        multiplier: mult,
        payout: payout,
        status: isWin ? 'WON' : 'LOST',
        option: `${rollType.toUpperCase()} ${targetNumber}`,
        createdAt: new Date().toISOString(),
      };
      saveAndSetOrders((prev) => [newOrder, ...prev]);

      if (isWin) {
        setMessage(`🎲 Rolled ${rolledNumber}! Won ₹${payout.toFixed(2)} (${mult}x)!`);
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
        requiredAmount: amount,
      });
      refreshBalance();
    } finally {
      setIsRollingDice(false);
    }
  };

  // Andar Bahar Handler
  const handlePlayAndarBahar = async (side: 'andar' | 'bahar' | 'tie') => {
    setMessage('');
    const amount = parseFloat(betAmount || '100');
    if (!validateBetBeforePlay(amount)) return;
    try {
      const userId = user!.id;
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/games/andar-bahar/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, side, betAmount: amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setJokerCard(data.jokerCard);
      setCardsDealt(data.cardsDealt || []);

      const isWin = !!data.isWin;
      const payout = isWin ? Number(data.payout || 0) : 0;
      const mult = isWin ? (amount > 0 ? payout / amount : 1.95) : 0;

      const newOrder = {
        id: Date.now().toString(),
        roundId: String(Math.floor(100000 + Math.random() * 900000)),
        stake: amount,
        multiplier: mult,
        payout: payout,
        status: isWin ? 'WON' : 'LOST',
        option: side.toUpperCase(),
        createdAt: new Date().toISOString(),
      };
      setOrders((prev) => [newOrder, ...prev]);

      if (isWin) {
        setMessage(`🃏 Joker ${data.jokerCard} matched on ${data.winningSide.toUpperCase()}! Won ₹${payout.toFixed(2)}!`);
      } else {
        setMessage(`🃏 Joker ${data.jokerCard} matched on ${data.winningSide.toUpperCase()}. Loss.`);
      }
      refreshBalance();
    } catch (err: any) {
      setValidationModal({
        isOpen: true,
        type: err.message?.toLowerCase().includes('balance') ? 'INSUFFICIENT_BALANCE' : 'GAME_ERROR',
        message: err.message || 'Failed to play Andar Bahar',
        currentBalance: balance,
        requiredAmount: amount,
      });
      refreshBalance();
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#050B20] text-gray-100 flex flex-col font-sans selection:bg-[#287BFF]/30 selection:text-[#00D9FF] pt-[84px]">
      {/* INVALID GAME TOKEN ERROR OVERLAY */}
      <InvalidCredentialsModal
        isOpen={isInvalid}
        message={errorMessage || 'Invalid user login credentials(Error:45)'}
      />
      <TopHeader balance={balance} onSearch={() => {}} />

      <div className="flex-1 flex w-full max-w-[1700px] mx-auto px-2 sm:px-4 py-4 gap-6 lg:pl-[220px] xl:pl-60 relative z-10">
        <DesktopSidebar />

        <main className="flex-1 min-w-0 pb-20 lg:pb-8 px-2 sm:px-4 space-y-4">
          {/* Message Toast Notice */}
          {message && (
            <div className="bg-[#287BFF] text-white font-bold text-xs py-2 px-4 rounded-xl shadow-lg text-center animate-in fade-in">
              {message}
            </div>
          )}
        {/* MULTIPLIER HISTORY PILLS (For Jet & Crash) */}
        {(slug === 'jet' || slug === 'crash') && (
          <div className="bg-slate-900 rounded-2xl p-2 flex items-center gap-2 overflow-x-auto text-nowrap scrollbar-none shadow-sm">
            {historyPills.map((m, idx) => (
              <span
                key={idx}
                className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                  m >= 2.0 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-emerald-400 border border-slate-700'
                }`}
              >
                {m.toFixed(2)}x
              </span>
            ))}
          </div>
        )}

        {/* ==================== 1. JET / CRASH ARENA ==================== */}
        {(slug === 'jet' || slug === 'crash') && (
          <div className="bg-slate-900 rounded-3xl p-4 h-[300px] relative overflow-hidden flex flex-col items-center justify-center border border-slate-800 shadow-xl">
            {/* Round Badge Overlay */}
            <div className="absolute top-3 right-3 z-10">
              <span className="bg-slate-950/80 text-amber-400 border border-amber-400/40 text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-full shadow-sm">
                Period #{roundId}
              </span>
            </div>

            {/* Cloud & Jet Vector Animation Canvas */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 flex items-center justify-center pointer-events-none opacity-90">
              <div className="absolute w-full h-full bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
              <div className="text-8xl text-blue-500/20 transform -rotate-12 animate-pulse">
                🚀
              </div>
            </div>

            {/* Center Multiplier Display */}
            <div className="text-center z-10 space-y-2">
              <div className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-amber-400 drop-shadow-md">
                {multiplier.toFixed(2)}x
              </div>

              <div className="inline-block">
                <span className="bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow">
                  {isFlying ? 'JET IN FLIGHT ✈️' : 'READY FOR BET'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. MINES ARENA ==================== */}
        {slug === 'mines' && <MinesGame />}

        {/* ==================== 3. FAST PARITY ARENA ==================== */}
        {(slug === 'fast-parity' || slug === 'parity') && (
          <div className="space-y-4">
            <FastParityGame
              user={user}
              balance={balance}
              onBalanceUpdate={(newBal) => {
                if (typeof newBal === 'number') {
                  setLocalBalance(newBal);
                }
                fetchBalance(user?.id || 'demo_user');
              }}
              gameMode={slug === 'parity' ? 'parity' : 'fast-parity'}
            />
          </div>
        )}

        {/* ==================== 4. SPIN WHEEL ARENA ==================== */}
        {slug === 'spin' && (
          <div className="bg-slate-900 rounded-3xl p-6 text-center space-y-4 border border-slate-800 shadow-xl">
            <div className="h-56 w-56 mx-auto rounded-full bg-slate-950 border-4 border-slate-800 flex items-center justify-center relative shadow-2xl">
              <div className="text-center">
                <span className="text-5xl block animate-bounce">🎡</span>
                <span className="text-xs font-mono font-bold text-amber-400 mt-2 block">
                  {spinColor ? `LANDED ON ${spinColor.toUpperCase()}` : 'PICK COLOR & SPIN'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => handleSpin('red')} className="py-2.5 text-xs font-extrabold text-white bg-rose-600 rounded-xl">
                RED (2x)
              </button>
              <button onClick={() => handleSpin('blue')} className="py-2.5 text-xs font-extrabold text-white bg-blue-600 rounded-xl">
                BLUE (3x)
              </button>
              <button onClick={() => handleSpin('green')} className="py-2.5 text-xs font-extrabold text-white bg-emerald-600 rounded-xl">
                GREEN (5x)
              </button>
              <button onClick={() => handleSpin('gold')} className="py-2.5 text-xs font-extrabold text-slate-950 bg-amber-400 rounded-xl">
                GOLD (50x)
              </button>
            </div>
          </div>
        )}

        {/* ==================== 5. DICE ARENA ==================== */}
        {slug === 'dice' && (
          <DiceGame
            balance={balance}
            refreshBalance={refreshBalance}
            user={user}
            setValidationModal={setValidationModal}
            setMessage={setMessage}
            myBets={orders}
            saveAndSetOrders={saveAndSetOrders}
          />
        )}

        {/* ==================== 6. ANDAR BAHAR ARENA ==================== */}
        {slug === 'andar-bahar' && (
          <div className="bg-slate-900 rounded-3xl p-6 text-center space-y-4 border border-slate-800 shadow-xl">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 block font-mono">Joker Card</span>
              <span className="text-3xl font-extrabold font-mono text-amber-400">{jokerCard || '🃏 JOKER'}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handlePlayAndarBahar('andar')}
                className="py-4 text-sm font-extrabold text-white bg-indigo-600 rounded-2xl shadow-lg active:scale-95"
              >
                ANDAR (1.95x)
              </button>
              <button
                onClick={() => handlePlayAndarBahar('bahar')}
                className="py-4 text-sm font-extrabold text-white bg-purple-600 rounded-2xl shadow-lg active:scale-95"
              >
                BAHAR (1.95x)
              </button>
            </div>
          </div>
        )}

        {/* BETTING FORM CARD (Only for Jet, Crash, Mines, etc.) */}
        {slug !== 'fast-parity' && slug !== 'parity' && (
          <>
            <div className="bg-white border border-gray-200 rounded-2xl p-3.5 space-y-3 shadow-sm">
              {slug === 'mines' ? (
                /* MINES MODE: Side-by-Side Reduced Bet Amount & Bomb Dropdown */
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Left Column: Bet Amount (₹) */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                      BET AMOUNT (₹)
                    </label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all shadow-xs">
                      <span className="pl-2.5 pr-1 text-xs font-black text-gray-500">₹</span>
                      <input
                        type="number"
                        min="10"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        className="w-full min-w-0 bg-transparent border-0 py-2 text-xs font-extrabold font-mono text-gray-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setBetAmount(String(Math.max(10, Math.floor(parseFloat(betAmount || '0') / 2))))}
                        className="px-2 py-2 bg-gray-100 border-l border-gray-200 text-[10px] font-black text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
                      >
                        1/2
                      </button>
                      <button
                        type="button"
                        onClick={() => setBetAmount(String(Math.floor(parseFloat(betAmount || '100') * 2)))}
                        className="px-2 py-2 bg-gray-100 border-l border-gray-200 text-[10px] font-black text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
                      >
                        2X
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Single Bomb Dropdown */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        💣 BOMBS
                      </label>
                      <span className="text-[9px] font-black text-amber-900 bg-amber-400 px-1.5 py-0.5 rounded-full font-mono">
                        {minesCount} {minesCount === 1 ? 'BOMB' : 'BOMBS'}
                      </span>
                    </div>
                    <div className="flex items-center border border-amber-200/80 rounded-xl overflow-hidden bg-amber-50/50 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/30 transition-all shadow-xs">
                      <span className="pl-2 text-xs">💣</span>
                      <select
                        disabled={minesStatus === 'PLAYING'}
                        value={minesCount}
                        onChange={(e) => setMinesCount(parseInt(e.target.value, 10))}
                        className="w-full min-w-0 bg-transparent border-0 py-2 pr-2 text-xs font-black text-gray-900 font-mono focus:outline-none disabled:opacity-50 cursor-pointer"
                      >
                        {Array.from({ length: 24 }, (_, idx) => idx + 1).map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Bomb' : 'Bombs'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* OTHER GAMES (Jet, Crash, etc.): Full-Width Bet Amount Input */
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    BET AMOUNT (₹)
                  </label>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-inner">
                    <span className="px-3 text-sm font-bold text-gray-500">₹</span>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="w-full bg-transparent border-0 py-2 text-sm font-bold text-gray-900 font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setBetAmount(String(Math.max(10, Math.floor(parseFloat(betAmount || '0') / 2))))}
                      className="px-3 py-2 bg-gray-100 border-l border-gray-200 text-xs font-extrabold text-gray-800 hover:bg-gray-200"
                    >
                      1/2
                    </button>
                    <button
                      type="button"
                      onClick={() => setBetAmount(String(Math.floor(parseFloat(betAmount || '100') * 2)))}
                      className="px-3 py-2 bg-gray-100 border-l border-gray-200 text-xs font-extrabold text-gray-800 hover:bg-gray-200"
                    >
                      2X
                    </button>
                  </div>
                </div>
              )}

          {/* Auto Cashout Controls (For Jet & Crash) */}
          {(slug === 'jet' || slug === 'crash') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  AUTO CASHOUT (MULTIPLIER)
                </label>
                <span className="text-[10px] font-bold text-emerald-600 font-mono">
                  {autoCashout ? `${autoCashout}x` : 'OFF'}
                </span>
              </div>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 mb-2">
                <span className="px-2.5 text-xs text-emerald-600">🪄</span>
                <input
                  type="number"
                  step="0.10"
                  placeholder="e.g. 2.00 (Optional)"
                  value={autoCashout}
                  onChange={(e) => setAutoCashout(e.target.value)}
                  className="w-full bg-transparent border-0 py-1.5 text-xs font-bold text-gray-900 font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-5 gap-1">
                {['1.50', '2.00', '5.00', '10.00'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAutoCashout(val)}
                    className="py-1 text-[10px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200"
                  >
                    {val}x
                  </button>
                ))}
                <button
                  onClick={() => setAutoCashout('')}
                  className="py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200"
                >
                  OFF
                </button>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          {(slug === 'jet' || slug === 'crash') && (
            <div>
              {!isFlying ? (
                <button
                  onClick={handleStartJetBet}
                  className="w-full py-3.5 text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-full shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <i className="bi bi-airplane-fill" /> PLACE JET BET (₹{betAmount})
                </button>
              ) : (
                <button
                  onClick={handleCashoutJet}
                  disabled={cashedOut}
                  className="w-full py-3.5 text-sm font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-full shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <i className="bi bi-cash-stack" /> CASH OUT NOW @ {multiplier.toFixed(2)}x
                </button>
              )}
            </div>
          )}

          {slug === 'mines' && (
            <div>
              {minesStatus !== 'PLAYING' ? (
                <button
                  onClick={handleStartMines}
                  className="w-full py-3.5 text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-full shadow-md active:scale-95"
                >
                  START MINES GAME (₹{betAmount})
                </button>
              ) : (
                <button
                  onClick={handleCashoutMines}
                  className="w-full py-3.5 text-sm font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-full shadow-md active:scale-95"
                >
                  CASHOUT @ {Number(minesMultiplier || 1.0).toFixed(2)}x
                </button>
              )}
            </div>
          )}
        </div>

        {/* MY PLAYING HISTORY SECTION */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-100">
            <span className="font-extrabold text-xs text-gray-800 flex items-center gap-1.5">
              <i className="bi bi-receipt-cutoff text-emerald-600 text-sm" /> My Playing History
            </span>
            <span className="text-[10px] font-mono font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
              {orders.length} {orders.length === 1 ? 'Round' : 'Rounds'}
            </span>
          </div>

          <div className="space-y-2">
            {orders.length > 0 ? (
              orders.map((o) => {
                const isWin = o.status === 'WON' || o.status === 'CASHED_OUT';
                const isLost = o.status === 'LOST';
                return (
                  <div
                    key={o.id}
                    className="flex items-center justify-between text-xs p-2.5 bg-gray-50 hover:bg-gray-100/80 rounded-xl border border-gray-100 transition-all"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-gray-900">
                          #{o.roundId || (typeof o.id === 'string' ? o.id.slice(-6).toUpperCase() : o.id)}
                        </span>
                        {o.option && (
                          <span className="text-[10px] font-bold text-gray-600 bg-gray-200 px-1.5 py-0.2 rounded font-mono">
                            {o.option}
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase ${
                            isWin
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isLost
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {o.status === 'CASHED_OUT' ? 'CASHED OUT' : o.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                        <span>
                          Stake: <strong className="text-gray-800">₹{Number(o.stake || 0).toFixed(2)}</strong>
                        </span>
                        {o.mineCount && <span>• 💣 {o.mineCount} Mines</span>}
                        {o.createdAt && <span>• {new Date(o.createdAt).toLocaleTimeString()}</span>}
                      </div>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span
                        className={`font-mono font-black text-xs block ${
                          isWin ? 'text-emerald-600' : isLost ? 'text-rose-600' : 'text-amber-600'
                        }`}
                      >
                        {Number(o.multiplier || 1.0).toFixed(2)}x
                      </span>
                      <span
                        className={`font-mono font-black text-xs block ${
                          isWin ? 'text-emerald-700' : 'text-gray-400'
                        }`}
                      >
                        {isWin ? `+₹${Number(o.payout || 0).toFixed(2)}` : '₹0.00'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-gray-400 font-medium space-y-1">
                <i className="bi bi-inbox text-2xl text-gray-300 block mb-1" />
                <span>No recent playing history found.</span>
              </div>
            )}
          </div>
        </div>
      </>
    )}
      </main>
    </div>

      {/* ── MINES WIN / CASHOUT POPUP MODAL ─────────────────── */}
      {minesWinModal?.isOpen && (
        <div className="fixed inset-0 w-full max-w-[480px] mx-auto z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl w-full max-w-xs overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center relative transform transition-transform animate-in fade-in zoom-in-95 duration-200">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="text-4xl mb-1 drop-shadow-md animate-bounce">💰</div>
              <h3 className="text-lg font-black tracking-wide drop-shadow">{minesWinModal.title}</h3>
              <p className="text-[11px] opacity-90 font-mono font-bold tracking-tight">Mines Game Round Completed</p>
            </div>

            <div className="p-5 space-y-4 text-slate-200">
              {/* Multiplier Badge */}
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  CASHOUT MULTIPLIER
                </span>
                <span className="text-4xl font-black font-mono text-amber-400 tracking-tight drop-shadow">
                  {minesWinModal.multiplier.toFixed(2)}x
                </span>
              </div>

              {/* Win Amount Highlight Box */}
              <div className="bg-gradient-to-br from-emerald-950/80 to-slate-950 border border-emerald-500/40 rounded-2xl p-3.5 shadow-inner">
                <span className="text-[10px] font-extrabold text-emerald-400 uppercase block tracking-wider mb-0.5">
                  TOTAL WIN PAYOUT
                </span>
                <span className="text-3xl font-black font-mono text-emerald-400 drop-shadow">
                  +₹{minesWinModal.payout.toFixed(2)}
                </span>
              </div>

              {/* Continue Button */}
              <button
                onClick={() => setMinesWinModal(null)}
                className="w-full py-3.5 text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 rounded-2xl shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all uppercase tracking-wider"
              >
                CONTINUE PLAYING 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MINES BOOM / HIT MINE POPUP MODAL ─────────────────── */}
      {minesBoomModal?.isOpen && (
        <div className="fixed inset-0 w-full max-w-[480px] mx-auto z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl w-full max-w-xs overflow-hidden shadow-[0_0_50px_rgba(244,63,94,0.25)] text-center relative transform transition-transform animate-in fade-in zoom-in-95 duration-200">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 p-5 text-white relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="text-4xl mb-1 drop-shadow-md animate-bounce">💥</div>
              <h3 className="text-lg font-black tracking-wide drop-shadow">BOOM! HIT A MINE!</h3>
              <p className="text-[11px] opacity-90 font-mono font-bold tracking-tight">You uncovered a hidden mine</p>
            </div>

            <div className="p-5 space-y-4 text-slate-200">
              {/* Mine Count & Stake Details */}
              <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-3.5 text-xs font-mono space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>BOMBS IN FIELD:</span>
                  <span className="font-bold text-amber-400">{minesBoomModal.mineCount} MINES</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>STAKE LOST:</span>
                  <span className="font-bold text-rose-400">₹{minesBoomModal.betAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Try Again Button */}
              <button
                onClick={() => setMinesBoomModal(null)}
                className="w-full py-3.5 text-xs font-black text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl shadow-md active:scale-95 transition-all uppercase tracking-wider"
              >
                TRY AGAIN 🎯
              </button>
            </div>
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
          currentBalance={validationModal.currentBalance ?? balance}
          requiredAmount={validationModal.requiredAmount}
          minBet={validationModal.minBet}
          maxBet={validationModal.maxBet}
        />
      )}

      <BottomNavigation />
    </div>
  );
}
