'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl, getWsBaseUrl } from '@/lib/config';
import { io, Socket } from 'socket.io-client';
import { SpribeAudioEngine } from '@/utils/spribeAudio';
import ValidationErrorModal, { ValidationErrorType } from './ValidationErrorModal';

import { getCalibratedXRatio, getCalibratedYRatio } from '@/lib/crash-calibration';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

interface WindStreak {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
  width: number;
}

interface CloudWisp {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  speed: number;
  alpha: number;
}

interface SimulatedBet {
  id: string;
  userId?: string;
  username: string;
  amount: number;
  targetMultiplier: number;
  multiplier?: number;
  payout?: number;
  status: 'PENDING' | 'CASHED_OUT' | 'LOST';
  cashedOutAt?: number;
  isSimulated?: boolean;
}

const FAKE_USERS_POOL = [
  'Aarav_99', 'Rahul***82', 'Pooja_K', 'Vikram_X', 'Amit_Winner',
  'Aviator_Pro', 'Rohan_77', 'Deepak_B', 'Sneha_Sharma', 'Kabir_X',
  'Prince_007', 'Rajesh_Patel', 'Karan_Pro', 'Ananya_21', 'Sunil_Reddy',
  'Priya_G', 'Lucky_88', 'Sanjay_Trader', 'Harsh_V', 'Manish_Kumar',
  'Aditi_Rao', 'Neeraj_Chopra', 'Jatin_777', 'Divya_S', 'Ritu_Queen',
  'Gaurav_X', 'Vikas_Jet', 'Sachin_M', 'Ajay_Pilot', 'Bhavin_Ahmedabad',
  'Ramesh_Bhai', 'Chirag_Surat', 'Mehul_01', 'Tarun_Max', 'Vijay_Casino',
  'Kunal_Flyer', 'Dev_Aviator', 'Nikhil_99', 'Rakesh_Pro', 'Rohit_45',
  'Akash_Sky', 'Yash_King', 'Mohit_Sharma', 'Varun_99', 'Alok_Singh',
  'Hitesh_G', 'Pratik_92', 'Suresh_R', 'Naveen_Express', 'Kiran_V'
];

const COMMON_BET_AMOUNTS = [
  50, 100, 100, 150, 200, 200, 300, 500, 500, 500,
  800, 1000, 1000, 1500, 2000, 2500, 3000, 5000, 8000, 10000
];

function generateRealisticTargetMultiplier(): number {
  const roll = Math.random();
  if (roll < 0.40) {
    // 40% early cashout: 1.15x - 1.95x
    return +(1.15 + Math.random() * 0.8).toFixed(2);
  } else if (roll < 0.72) {
    // 32% mid cashout: 2.00x - 3.80x
    return +(2.0 + Math.random() * 1.8).toFixed(2);
  } else if (roll < 0.88) {
    // 16% high cashout: 3.90x - 8.50x
    return +(3.9 + Math.random() * 4.6).toFixed(2);
  } else if (roll < 0.96) {
    // 8% very high cashout: 8.60x - 18.00x
    return +(8.6 + Math.random() * 9.4).toFixed(2);
  } else {
    // 4% greedy cashout: 18.00x - 45.00x
    return +(18.0 + Math.random() * 27.0).toFixed(2);
  }
}

function generateSimulatedBetsForRound(seedStr: string): SimulatedBet[] {
  const shuffledNames = [...FAKE_USERS_POOL].sort(() => Math.random() - 0.5);
  const count = 26 + Math.floor(Math.random() * 9); // 26-34 active players
  const bets: SimulatedBet[] = [];

  for (let i = 0; i < count && i < shuffledNames.length; i++) {
    const amount = COMMON_BET_AMOUNTS[Math.floor(Math.random() * COMMON_BET_AMOUNTS.length)];
    const targetMultiplier = generateRealisticTargetMultiplier();
    bets.push({
      id: `sim-${seedStr}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      username: shuffledNames[i],
      amount,
      targetMultiplier,
      multiplier: undefined,
      payout: undefined,
      status: 'PENDING',
      isSimulated: true,
    });
  }
  return bets.sort((a, b) => b.amount - a.amount);
}

export function AviatorGame() {
  const { user, refreshUser, refreshBalance, balance: contextBalance } = useAuth();

  // Balance & Global State
  const [balance, setBalance] = useState<number>(contextBalance || 0);

  // Synchronize authentic wallet balance
  const fetchUserWalletBalance = useCallback(async () => {
    let effectiveUserId = user?.id;
    if (!effectiveUserId && typeof window !== 'undefined') {
      const savedUserStr = localStorage.getItem('rivexa_user');
      if (savedUserStr) {
        try {
          const u = JSON.parse(savedUserStr);
          effectiveUserId = u.id;
        } catch (e) {}
      }
    }
    if (!effectiveUserId) return;

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/wallet/balance?userId=${effectiveUserId}`);
      if (res.ok) {
        const data = await res.json();
        const mainBal = Number(data.mainBalance);
        if (!isNaN(mainBal)) {
          setBalance(mainBal);
        }
      }
    } catch (e) {}
  }, [user?.id]);

  useEffect(() => {
    fetchUserWalletBalance();
  }, [fetchUserWalletBalance]);

  useEffect(() => {
    if (contextBalance !== undefined && contextBalance !== null && contextBalance > 0) {
      setBalance(contextBalance);
    }
  }, [contextBalance]);

  const [message, setMessage] = useState<string>('');
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Sidebar Tabs & Mobile Tab
  const [sidebarTab, setSidebarTab] = useState<'all' | 'my' | 'top'>('all');
  const [mobileTab, setMobileTab] = useState<'game' | 'bets'>('game');

  // History Pills from real backend
  const [historyPills, setHistoryPills] = useState<number[]>([]);
  const [selectedRoundDetail, setSelectedRoundDetail] = useState<{
    roundNumber?: string;
    multiplier?: number;
    seedHash?: string;
  } | null>(null);

  // Round Engine state from authoritative server
  const [roundId, setRoundId] = useState<string>('—');
  const [status, setStatus] = useState<'BETTING_OPEN' | 'FLYING' | 'CRASHED'>('BETTING_OPEN');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(5);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [crashedAt, setCrashedAt] = useState<number>(1.0);

  // Live Round Player Bets from API
  const [roundBets, setRoundBets] = useState<any[]>([]);

  // Live Simulated Bets for realistic active multiplayer feeling
  const [simulatedBets, setSimulatedBets] = useState<SimulatedBet[]>([]);
  const lastSimRoundIdRef = useRef<string>('');
  const prevSimStatusRef = useRef<string>('BETTING_OPEN');

  // Provably Fair Modal & Rules Modal
  const [isSeedModalOpen, setIsSeedModalOpen] = useState<boolean>(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);
  const [periodHistory, setPeriodHistory] = useState<any[]>([]);

  // Validation Error Modal
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    type: ValidationErrorType;
    message: string;
    requiredAmount?: number;
    minBet?: number;
    maxBet?: number;
    currentBalance?: number;
  } | null>(null);

  // Network Ping Latency
  const [pingLatency, setPingLatency] = useState<number>(45);

  // Sound Engine
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const audioEngineRef = useRef<any>(null);
  const prevStatusRef = useRef<string>('BETTING_OPEN');

  useEffect(() => {
    setMounted(true);
    try {
      const saved =
        localStorage.getItem('rivexa_sound_enabled') ??
        localStorage.getItem('aviator_sound_muted') ??
        localStorage.getItem('game_sound_enabled');
      if (saved !== null) {
        setSoundMuted(saved === 'false' || (saved === 'true' && localStorage.getItem('aviator_sound_muted') === 'true'));
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      audioEngineRef.current = new SpribeAudioEngine();
    }

    const handleVisibility = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        audioEngineRef.current?.stopFlightTheme();
      }
    };

    const handleCleanup = () => {
      audioEngineRef.current?.destroy();
      audioEngineRef.current = null;
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handleCleanup);
    window.addEventListener('beforeunload', handleCleanup);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handleCleanup);
      window.removeEventListener('beforeunload', handleCleanup);
      if (audioEngineRef.current) {
        audioEngineRef.current.destroy();
        audioEngineRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const soundEnabledStr = String(!soundMuted);
      localStorage.setItem('rivexa_sound_enabled', soundEnabledStr);
      localStorage.setItem('game_sound_enabled', soundEnabledStr);
      localStorage.setItem('aviator_sound_muted', String(soundMuted));
    } catch (e) {}
    if (audioEngineRef.current) {
      audioEngineRef.current.toggleMute(soundMuted);
    }
  }, [soundMuted, mounted]);

  // ==========================================
  // DUAL BET PANEL 1 STATE
  // ==========================================
  const [betTab1, setBetTab1] = useState<'bet' | 'auto'>('bet');
  const [betAmount1, setBetAmount1] = useState<number>(10.0);
  const [autoCashout1, setAutoCashout1] = useState<string>('');
  const [autoBet1, setAutoBet1] = useState<boolean>(false);
  const [activeBetId1, setActiveBetId1] = useState<string | null>(null);
  const [userBetStatus1, setUserBetStatus1] = useState<'NONE' | 'PENDING' | 'CASHED_OUT' | 'LOST'>('NONE');

  // ==========================================
  // DUAL BET PANEL 2 STATE
  // ==========================================
  const [betTab2, setBetTab2] = useState<'bet' | 'auto'>('bet');
  const [betAmount2, setBetAmount2] = useState<number>(10.0);
  const [autoCashout2, setAutoCashout2] = useState<string>('');
  const [autoBet2, setAutoBet2] = useState<boolean>(false);
  const [activeBetId2, setActiveBetId2] = useState<string | null>(null);
  const [userBetStatus2, setUserBetStatus2] = useState<'NONE' | 'PENDING' | 'CASHED_OUT' | 'LOST'>('NONE');

  // User Orders
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loadingBet1, setLoadingBet1] = useState<boolean>(false);
  const [loadingBet2, setLoadingBet2] = useState<boolean>(false);

  // Canvas & Physics Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayMultiplierRef = useRef<number>(1.0);
  const particlesRef = useRef<Particle[]>([]);
  const crashBurstFiredRef = useRef<boolean>(false);
  const autoBetPlaced1 = useRef<boolean>(false);
  const autoBetPlaced2 = useRef<boolean>(false);

  // Authentic Aviator Aircraft & Live Propeller Sprite Refs
  const planeFuselageImgRef = useRef<HTMLImageElement | null>(null);
  const planePropellerImgRef = useRef<HTMLImageElement | null>(null);
  const propAngleRef = useRef<number>(0);

  // Dynamic Background Flight Atmosphere Refs (Wind Streaks & Clouds)
  const windStreaksRef = useRef<WindStreak[]>([]);
  const cloudsRef = useRef<CloudWisp[]>([]);

  // Performance Decoupled Animation Refs (Prevents requestAnimationFrame teardown on socket ticks)
  const statusRef = useRef<'BETTING_OPEN' | 'FLYING' | 'CRASHED'>('BETTING_OPEN');
  const leadMultiplierRef = useRef<number>(1.0);
  const crashedAtRef = useRef<number>(1.0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    leadMultiplierRef.current = currentMultiplier;
  }, [currentMultiplier]);

  useEffect(() => {
    crashedAtRef.current = crashedAt;
  }, [crashedAt]);

  // Preload plane fuselage and propeller images
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fuselage = new Image();
    fuselage.src = '/assets/aviator-plane-fuselage.png';
    fuselage.onload = () => {
      planeFuselageImgRef.current = fuselage;
    };
    if (fuselage.complete) {
      planeFuselageImgRef.current = fuselage;
    }

    const propeller = new Image();
    propeller.src = '/assets/aviator-propeller.png';
    propeller.onload = () => {
      planePropellerImgRef.current = propeller;
    };
    if (propeller.complete) {
      planePropellerImgRef.current = propeller;
    }
  }, []);

  // Process Game State Data (from REST or Socket.IO)
  const processGameStateData = useCallback((data: any) => {
    if (!data) return;

    if (data.round) {
      const newStatus = data.round.status as any;

      if (audioEngineRef.current) {
        if (prevStatusRef.current !== 'FLYING' && newStatus === 'FLYING') {
          audioEngineRef.current.startFlightTheme();
        } else if (prevStatusRef.current === 'FLYING' && newStatus === 'FLYING') {
          const multVal = parseFloat(data.currentMultiplier || '1.0');
          audioEngineRef.current.updateFlightMultiplier(multVal);
        } else if (newStatus === 'CRASHED' && prevStatusRef.current === 'FLYING') {
          audioEngineRef.current.playCrashExplosion();
        } else if (newStatus === 'BETTING_OPEN' && prevStatusRef.current !== 'BETTING_OPEN') {
          audioEngineRef.current.stopFlightTheme();
          audioEngineRef.current.playPreFlightChime();
        }
      }
      prevStatusRef.current = newStatus;

      setRoundId(data.round.roundNumber ? String(data.round.roundNumber) : (data.round.id ? data.round.id.slice(0, 8).toUpperCase() : '—'));
      statusRef.current = newStatus;
      setStatus(newStatus);
      const crashVal = parseFloat(data.round.crashMultiplier || '1.0');
      crashedAtRef.current = crashVal;
      setCrashedAt(crashVal);
    }

    if (typeof data.secondsRemaining === 'number') {
      setSecondsRemaining(data.secondsRemaining);
    }

    const multVal = parseFloat(data.currentMultiplier || '1.0');
    leadMultiplierRef.current = multVal;
    setCurrentMultiplier(multVal);

    if (Array.isArray(data.history)) {
      setHistoryPills(data.history);
    }

    if (Array.isArray(data.roundBets)) {
      setRoundBets(data.roundBets);
    }

    if (typeof data.userBalance === 'string' && data.userBalance !== '0.00') {
      setBalance(parseFloat(data.userBalance));
    }

    // Active User Bets Sync (Dual panels)
    if (Array.isArray(data.userBets) && data.userBets.length > 0) {
      const b1 = data.userBets[0];
      if (b1) {
        setActiveBetId1(b1.id);
        setUserBetStatus1(b1.status as any);
      }
      if (data.userBets.length > 1) {
        const b2 = data.userBets[1];
        setActiveBetId2(b2.id);
        setUserBetStatus2(b2.status as any);
      }
    } else if (data.round && data.round.status === 'BETTING_OPEN') {
      if (userBetStatus1 !== 'NONE' && userBetStatus1 !== 'PENDING') {
        setActiveBetId1(null);
        setUserBetStatus1('NONE');
      }
      if (userBetStatus2 !== 'NONE' && userBetStatus2 !== 'PENDING') {
        setActiveBetId2(null);
        setUserBetStatus2('NONE');
      }
    }
  }, [userBetStatus1, userBetStatus2]);

  const processGameStateDataRef = useRef(processGameStateData);
  useEffect(() => {
    processGameStateDataRef.current = processGameStateData;
  }, [processGameStateData]);

  // REST State Fetcher
  const fetchGameState = useCallback(async () => {
    const startTime = Date.now();
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let effectiveUserId = user?.id;
      if (!effectiveUserId && typeof window !== 'undefined') {
        const savedUserStr = localStorage.getItem('rivexa_user');
        if (savedUserStr) {
          try {
            const u = JSON.parse(savedUserStr);
            effectiveUserId = u.id;
          } catch (e) {}
        }
      }

      const userIdParam = effectiveUserId ? `?userId=${effectiveUserId}` : '';
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/crash/state${userIdParam}`, { headers });

      if (res.ok) {
        const elapsed = Math.max(12, Math.min(300, Date.now() - startTime));
        setPingLatency(elapsed);
        const data = await res.json();
        processGameStateDataRef.current(data);
      }
    } catch (err) {}
  }, [user?.id]);

  // Realtime Socket.IO Connection + REST Polling Sync
  useEffect(() => {
    let effectiveUserId = user?.id;
    if (!effectiveUserId && typeof window !== 'undefined') {
      const savedUserStr = localStorage.getItem('rivexa_user');
      if (savedUserStr) {
        try {
          const u = JSON.parse(savedUserStr);
          effectiveUserId = u.id;
        } catch (e) {}
      }
    }

    const wsUrl = getWsBaseUrl();
    const socket: Socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      socket.emit('subscribe:crash', { userId: effectiveUserId });
    });

    socket.on('crash:state', (data: any) => {
      processGameStateDataRef.current(data);
    });

    fetchGameState();
    const interval = setInterval(fetchGameState, 600);

    return () => {
      clearInterval(interval);
      if (socket.connected) socket.disconnect();
      else socket.once('connect', () => socket.disconnect());
    };
  }, [user?.id, fetchGameState]);

  // Fetch Order History
  const fetchMyOrders = useCallback(async () => {
    let effectiveUserId = user?.id;
    if (!effectiveUserId && typeof window !== 'undefined') {
      const savedUserStr = localStorage.getItem('rivexa_user');
      if (savedUserStr) {
        try {
          const u = JSON.parse(savedUserStr);
          effectiveUserId = u.id;
        } catch (e) {}
      }
    }
    if (!effectiveUserId) return;

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/crash/history?userId=${effectiveUserId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setMyOrders(data);
      }
    } catch (err) {}
  }, [user?.id]);

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders, status]);

  // Fetch Period History (Provably Fair)
  const fetchPeriodHistory = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/crash/period-history`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setPeriodHistory(data);
      }
    } catch (err) {}
    setIsSeedModalOpen(true);
  };

  // Place Bet Handler
  const handlePlaceBet = async (panelNum: 1 | 2) => {
    setMessage('');
    const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
    let effectiveUserId = user?.id;
    if (!effectiveUserId && typeof window !== 'undefined') {
      const savedUserStr = localStorage.getItem('rivexa_user');
      if (savedUserStr) {
        try {
          const u = JSON.parse(savedUserStr);
          effectiveUserId = u.id;
        } catch (e) {}
      }
    }

    if (!token || !effectiveUserId) {
      setValidationModal({
        isOpen: true,
        type: 'AUTH_REQUIRED',
        message: 'Please log in to place bets on Rivexa Crash.',
      });
      return;
    }

    const amt = panelNum === 1 ? betAmount1 : betAmount2;
    if (isNaN(amt) || amt < 10) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Minimum bet amount is ₹10.',
        minBet: 10,
        requiredAmount: amt || 0,
        currentBalance: balance,
      });
      return;
    }

    if (amt > balance) {
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: `Your balance is ₹${balance.toFixed(2)}, but this bet requires ₹${amt.toFixed(2)}.`,
        requiredAmount: amt,
        currentBalance: balance,
      });
      return;
    }

    if (status !== 'BETTING_OPEN') {
      setValidationModal({
        isOpen: true,
        type: 'BETTING_CLOSED',
        message: 'Betting is closed for the active round. Please wait for the next takeoff!',
      });
      return;
    }

    if (panelNum === 1) setLoadingBet1(true);
    else setLoadingBet2(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/crash/bet`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: effectiveUserId, amount: amt }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to place bet.');

      if (panelNum === 1) {
        setActiveBetId1(data.betId);
        setUserBetStatus1('PENDING');
      } else {
        setActiveBetId2(data.betId);
        setUserBetStatus2('PENDING');
      }

      if (data.newBalance) setBalance(parseFloat(data.newBalance));
      setMessage(`✈️ Bet ${panelNum} placed (₹${amt.toFixed(0)})! Prepare for takeoff.`);
      fetchMyOrders();
      refreshUser();
    } catch (err: any) {
      setValidationModal({
        isOpen: true,
        type: 'GAME_ERROR',
        message: err.message === 'Failed to fetch' ? 'Connection error. Retrying...' : err.message || 'Error placing bet.',
      });
    } finally {
      if (panelNum === 1) setLoadingBet1(false);
      else setLoadingBet2(false);
    }
  };

  // Cashout Handler
  const handleCashout = async (panelNum: 1 | 2) => {
    const betId = panelNum === 1 ? activeBetId1 : activeBetId2;
    const statusVal = panelNum === 1 ? userBetStatus1 : userBetStatus2;

    if (!betId || statusVal !== 'PENDING') return;

    setMessage('');
    if (panelNum === 1) setLoadingBet1(true);
    else setLoadingBet2(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
      let effectiveUserId = user?.id;
      if (!effectiveUserId && typeof window !== 'undefined') {
        const savedUserStr = localStorage.getItem('rivexa_user');
        if (savedUserStr) {
          try {
            const u = JSON.parse(savedUserStr);
            effectiveUserId = u.id;
          } catch (e) {}
        }
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/crash/cashout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: effectiveUserId, betId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Cashout failed.');

      const mult = parseFloat(data.multiplier || String(currentMultiplier));
      const pay = parseFloat(data.payout || '0');

      if (panelNum === 1) setUserBetStatus1('CASHED_OUT');
      else setUserBetStatus2('CASHED_OUT');

      if (audioEngineRef.current) audioEngineRef.current.playCashoutFanfare();
      if (data.newBalance) setBalance(parseFloat(data.newBalance));
      setMessage(`🎉 Cashed out @ ${mult.toFixed(2)}x! +₹${pay.toFixed(2)} credited.`);
      fetchMyOrders();
      refreshUser();
    } catch (err: any) {
      setMessage(err.message === 'Failed to fetch' ? 'Connection error. Retrying...' : err.message || 'Cashout error.');
      if (panelNum === 1) setUserBetStatus1('LOST');
      else setUserBetStatus2('LOST');
      fetchMyOrders();
    } finally {
      if (panelNum === 1) setLoadingBet1(false);
      else setLoadingBet2(false);
    }
  };

  // Auto Bet Triggers
  useEffect(() => {
    if (status === 'BETTING_OPEN') {
      if (autoBet1 && !autoBetPlaced1.current && userBetStatus1 === 'NONE') {
        autoBetPlaced1.current = true;
        handlePlaceBet(1);
      }
      if (autoBet2 && !autoBetPlaced2.current && userBetStatus2 === 'NONE') {
        autoBetPlaced2.current = true;
        handlePlaceBet(2);
      }
    } else {
      autoBetPlaced1.current = false;
      autoBetPlaced2.current = false;
    }
  }, [status, autoBet1, autoBet2, userBetStatus1, userBetStatus2]);

  // Auto Cashout Triggers
  useEffect(() => {
    if (status === 'FLYING') {
      if (
        userBetStatus1 === 'PENDING' &&
        activeBetId1 &&
        autoCashout1 &&
        !isNaN(parseFloat(autoCashout1)) &&
        currentMultiplier >= parseFloat(autoCashout1)
      ) {
        handleCashout(1);
      }

      if (
        userBetStatus2 === 'PENDING' &&
        activeBetId2 &&
        autoCashout2 &&
        !isNaN(parseFloat(autoCashout2)) &&
        currentMultiplier >= parseFloat(autoCashout2)
      ) {
        handleCashout(2);
      }
    }
  }, [status, currentMultiplier, userBetStatus1, activeBetId1, autoCashout1, userBetStatus2, activeBetId2, autoCashout2]);

  // ==============================================================
  // SIMULATED REAL-TIME BETS & LIVE CASHOUT ENGINE
  // ==============================================================
  // 1. Generate new batch of simulated bets on new round or betting phase
  useEffect(() => {
    if (roundId !== '—' && roundId !== lastSimRoundIdRef.current) {
      lastSimRoundIdRef.current = roundId;
      setSimulatedBets(generateSimulatedBetsForRound(roundId));
    } else if (simulatedBets.length === 0) {
      setSimulatedBets(generateSimulatedBetsForRound(String(Date.now())));
    }
  }, [roundId, simulatedBets.length]);

  useEffect(() => {
    if (status === 'BETTING_OPEN' && prevSimStatusRef.current !== 'BETTING_OPEN') {
      setSimulatedBets(generateSimulatedBetsForRound(roundId !== '—' ? roundId : String(Date.now())));
    }
    prevSimStatusRef.current = status;
  }, [status, roundId]);

  // 2. Real-time cashouts as plane flies & multiplier ascends
  useEffect(() => {
    if (status === 'FLYING') {
      setSimulatedBets(prev => {
        let changed = false;
        const next = prev.map(bet => {
          if (bet.status === 'PENDING' && currentMultiplier >= bet.targetMultiplier) {
            changed = true;
            return {
              ...bet,
              status: 'CASHED_OUT' as const,
              multiplier: bet.targetMultiplier,
              payout: Math.round(bet.amount * bet.targetMultiplier * 100) / 100,
              cashedOutAt: Date.now(),
            };
          }
          return bet;
        });
        return changed ? next : prev;
      });
    } else if (status === 'CRASHED') {
      setSimulatedBets(prev => {
        let changed = false;
        const next = prev.map(bet => {
          if (bet.status === 'PENDING') {
            changed = true;
            return {
              ...bet,
              status: 'LOST' as const,
            };
          }
          return bet;
        });
        return changed ? next : prev;
      });
    }
  }, [status, currentMultiplier]);

  // Merged Active Bets (Real Server Bets + Realistic Simulated Bets)
  const allActiveBets = useMemo(() => {
    if (roundBets && roundBets.length > 0) {
      const realIds = new Set(roundBets.map(b => String(b.id || b._id || b.username)));
      const filteredSim = simulatedBets.filter(b => !realIds.has(b.id) && !realIds.has(b.username));
      return [...roundBets, ...filteredSim];
    }
    return simulatedBets;
  }, [roundBets, simulatedBets]);

  // Top Sorted Bets (Ranked by Payout / High Roller Stakes)
  const topBets = useMemo(() => {
    const list = [...allActiveBets];
    list.sort((a, b) => {
      const valA = Number(a.payout || a.amount || 0);
      const valB = Number(b.payout || b.amount || 0);
      return valB - valA;
    });
    return list;
  }, [allActiveBets]);

  // Animation Timing & Physics Refs
  const lastTimeRef = useRef<number>(0);
  const crashTimestampRef = useRef<number>(0);
  const freezeCoordsRef = useRef<{ x: number; y: number; angle: number }>({ x: 0, y: 0, angle: 0 });

  // ==============================================================
  // 60FPS ULTRA-SMOOTH VECTOR FLIGHT ENGINE (DECOUPLED & OPTIMIZED)
  // ==============================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // 1. Resizing: ONLY update buffer when element dimensions actually change
      // (Eliminates continuous GPU texture recreation & micro-stutter)
      const parent = canvas.parentElement;
      const targetW = parent?.clientWidth || 800;
      const targetH = parent?.clientHeight || 400;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      const width = canvas.width;
      const height = canvas.height;

      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - (lastTimeRef.current || now)) / 1000));
      lastTimeRef.current = now;

      // Read authoritative state directly from refs
      const currentStatus = statusRef.current;
      const leadMult = leadMultiplierRef.current;
      const crashMult = crashedAtRef.current;

      // 2. Dark Radial Background Arena
      ctx.clearRect(0, 0, width, height);

      const bgGrad = ctx.createRadialGradient(width * 0.1, height * 0.85, 30, width * 0.5, height * 0.5, width * 0.9);
      bgGrad.addColorStop(0, '#1a040b');
      bgGrad.addColorStop(0.35, '#0e0e14');
      bgGrad.addColorStop(1, '#06070a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Subtle Sunburst Fan Rays radiating from bottom-left (0, height)
      ctx.save();
      const originX = 0;
      const originY = height;
      const totalRays = 24;
      for (let i = 0; i < totalRays; i++) {
        const aStart = (i * (Math.PI / 2)) / totalRays;
        const aEnd = ((i + 0.45) * (Math.PI / 2)) / totalRays;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.arc(originX, originY, width * 1.6, -aStart, -aEnd, true);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? 'rgba(239, 68, 68, 0.035)' : 'rgba(0, 0, 0, 0.04)';
        ctx.fill();
      }
      ctx.restore();

      // ==============================================================
      // 3B. HIGH-SPEED FLIGHT BACKGROUND (ZERO GC OVERHEAD)
      // ==============================================================
      const currentSpeedMult = currentStatus === 'FLYING'
        ? Math.min(4.5, 1.2 + (displayMultiplierRef.current - 1.0) * 0.45)
        : 0.35;

      // Lazy-init cloud wisps and wind streaks pool
      if (windStreaksRef.current.length === 0) {
        for (let i = 0; i < 28; i++) {
          windStreaksRef.current.push({
            x: Math.random() * width,
            y: Math.random() * (height * 0.88) + 10,
            length: Math.random() * 90 + 50,
            speed: Math.random() * 220 + 260,
            alpha: Math.random() * 0.35 + 0.15,
            width: Math.random() * 1.5 + 0.8,
          });
        }
        for (let i = 0; i < 7; i++) {
          cloudsRef.current.push({
            x: Math.random() * width,
            y: Math.random() * (height * 0.72) + 20,
            radiusX: Math.random() * 80 + 60,
            radiusY: Math.random() * 28 + 18,
            speed: Math.random() * 55 + 45,
            alpha: Math.random() * 0.06 + 0.03,
          });
        }
      }

      // Render Parallax Atmospheric Clouds Drifting Past (Single styled batch)
      ctx.save();
      for (const cloud of cloudsRef.current) {
        cloud.x -= cloud.speed * currentSpeedMult * dt;
        if (cloud.x + cloud.radiusX < -50) {
          cloud.x = width + cloud.radiusX + Math.random() * 100;
          cloud.y = Math.random() * (height * 0.72) + 20;
        }

        ctx.fillStyle = `rgba(239, 68, 68, ${cloud.alpha * 0.7})`;
        ctx.beginPath();
        ctx.ellipse(cloud.x, cloud.y, cloud.radiusX, cloud.radiusY, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Render Dynamic High-Speed Wind Streaks (Single styled batch - NO gradient allocations!)
      ctx.save();
      for (const streak of windStreaksRef.current) {
        streak.x -= streak.speed * currentSpeedMult * dt;
        if (streak.x + streak.length < -40) {
          streak.x = width + Math.random() * 80;
          streak.y = Math.random() * (height * 0.88) + 10;
          streak.length = Math.random() * 90 + 50;
        }

        ctx.strokeStyle = currentStatus === 'FLYING'
          ? `rgba(255, 230, 230, ${streak.alpha * 0.55})`
          : `rgba(255, 255, 255, ${streak.alpha * 0.22})`;
        ctx.lineWidth = streak.width;
        ctx.beginPath();
        ctx.moveTo(streak.x, streak.y);
        ctx.lineTo(streak.x + streak.length, streak.y);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Grid Tick Dots
      // Vertical axis dots (cyan / light blue)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
      const yStep = height / 7;
      for (let y = yStep; y < height - 20; y += yStep) {
        ctx.beginPath();
        ctx.arc(10, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Horizontal axis dots (white / subtle)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      const xStep = width / 10;
      for (let x = xStep; x < width - 15; x += xStep) {
        ctx.beginPath();
        ctx.arc(x, height - 10, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Ultra-Smooth Continuous Dead-Reckoning Multiplier
      // Smoothly continuing exponential growth between server ticks
      if (currentStatus === 'FLYING') {
        const lead = Math.max(1.0, leadMult);
        const diff = lead - displayMultiplierRef.current;
        // Standard Spribe Aviator exponential growth rate
        const growthStep = displayMultiplierRef.current * 0.06 * dt;
        const catchupStep = diff * Math.min(1.0, dt * 8.0);
        displayMultiplierRef.current = Math.min(lead + 0.12, displayMultiplierRef.current + growthStep + catchupStep);
        crashBurstFiredRef.current = false;
      } else if (currentStatus === 'CRASHED') {
        displayMultiplierRef.current = crashMult;
      } else {
        displayMultiplierRef.current = 1.0;
        crashBurstFiredRef.current = false;
      }

      const effectiveMult = Math.max(1.0, displayMultiplierRef.current);

      // 5. Calculate Aircraft Coordinates using Calibrated Ratios (1.50x = 50% width)
      const startX = width * 0.04;
      const startY = height * 0.82;
      const planeX = width * getCalibratedXRatio(effectiveMult);
      const planeY = height * getCalibratedYRatio(effectiveMult);

      // Quadratic Curve Control Point: horizontal takeoff curving smoothly upward
      const cpX = startX + (planeX - startX) * 0.58;
      const cpY = startY;

      // Tangent vector and base flight angle
      const dx = 2 * (planeX - cpX);
      const dy = 2 * (planeY - cpY);
      const flightAngle = Math.atan2(dy, dx);

      // 6. Handle Crash Freeze & Explosion Trigger
      if (currentStatus === 'CRASHED' && !crashBurstFiredRef.current) {
        crashBurstFiredRef.current = true;
        crashTimestampRef.current = Date.now();
        freezeCoordsRef.current = { x: planeX, y: planeY, angle: flightAngle };

        // Burst of explosion embers at exact crash location
        for (let i = 0; i < 40; i++) {
          const expAngle = Math.random() * Math.PI * 2;
          const expSpeed = Math.random() * 7 + 1.5;
          particlesRef.current.push({
            x: planeX,
            y: planeY,
            vx: Math.cos(expAngle) * expSpeed,
            vy: Math.sin(expAngle) * expSpeed,
            radius: Math.random() * 5 + 2,
            color: Math.random() > 0.5 ? '#ef4444' : Math.random() > 0.25 ? '#f97316' : '#fde047',
            alpha: 1.0,
            decay: Math.random() * 0.035 + 0.015,
          });
        }
      }

      // Check if plane is in cinematic "Fly Away" exit sequence (first 800ms of crash)
      const timeSinceCrash = currentStatus === 'CRASHED' ? (Date.now() - crashTimestampRef.current) : 0;
      const isFlyingAway = currentStatus === 'CRASHED' && timeSinceCrash < 800;

      // ==============================================================
      // 6B. SMOOTH, STABLE AERODYNAMIC FLIGHT (CALM & ROCK-SOLID)
      // ==============================================================
      const timeSec = now / 1000;
      let soarYOffset = 0;

      if (currentStatus === 'FLYING') {
        // Calm, gentle aerodynamic breathing wave (subtle 3.5px - 5px float, zero harsh shaking)
        const waveFreq = 1.3; // Slow, graceful 4.8s breathing cycle
        const waveAmp = effectiveMult >= 2.0 ? 5.0 : 3.5;
        soarYOffset = Math.sin(timeSec * waveFreq) * waveAmp;
      } else {
        // Calm runway idle float
        soarYOffset = Math.sin(timeSec * 2.2) * 1.5;
      }

      // Stable, elegant cruise pitch (rock-solid ~7° incline, no seesaw rocking)
      const baseCruiseAngle = currentStatus === 'FLYING' ? -0.12 : 0.0;

      let planeDrawX = planeX;
      let planeDrawY = planeY + soarYOffset;
      let planeDrawAngle = baseCruiseAngle;
      let planeAlpha = 1.0;

      if (isFlyingAway) {
        const tFly = timeSinceCrash / 800;
        const easeFly = tFly * tFly * (3 - 2 * tFly);
        const freeze = freezeCoordsRef.current;
        const exitDist = easeFly * width * 0.5;
        planeDrawX = freeze.x + Math.cos(freeze.angle - 0.12) * exitDist;
        planeDrawY = freeze.y + Math.sin(freeze.angle - 0.12) * exitDist;
        planeDrawAngle = freeze.angle - easeFly * 0.18;
        planeAlpha = Math.max(0, 1.0 - tFly * 1.3);
      }

      // 7. Spawn Exhaust Trail Particles
      if (currentStatus === 'FLYING' && effectiveMult > 1.01) {
        for (let i = 0; i < 2; i++) {
          const spread = (Math.random() - 0.5) * 6;
          const trailAngle = planeDrawAngle + Math.PI + (Math.random() - 0.5) * 0.2;
          const speed = Math.random() * 2.2 + 1.0;
          particlesRef.current.push({
            x: planeDrawX - Math.cos(planeDrawAngle) * 44 + Math.sin(planeDrawAngle) * spread,
            y: planeDrawY - Math.sin(planeDrawAngle) * 44 - Math.cos(planeDrawAngle) * spread,
            vx: Math.cos(trailAngle) * speed,
            vy: Math.sin(trailAngle) * speed,
            radius: Math.random() * 3 + 1.5,
            color: Math.random() > 0.4 ? '#ff1e38' : '#fbbf24',
            alpha: 0.85,
            decay: 0.045,
          });
        }
      }

      // Render & Update Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 8. Draw Trajectory Area Fill & Path Line
      // Follows seamlessly beneath the soaring aircraft
      if (currentStatus === 'FLYING' || currentStatus === 'CRASHED') {
        const targetX = currentStatus === 'CRASHED' ? planeX : planeDrawX - 16;
        const targetY = currentStatus === 'CRASHED' ? planeY : planeDrawY + 8;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, targetX, targetY);
        ctx.lineTo(targetX, height);
        ctx.lineTo(startX, height);
        ctx.closePath();

        const fillGrad = ctx.createLinearGradient(0, targetY, 0, height);
        fillGrad.addColorStop(0, currentStatus === 'CRASHED' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(229, 9, 20, 0.32)');
        fillGrad.addColorStop(0.7, 'rgba(229, 9, 20, 0.08)');
        fillGrad.addColorStop(1, 'rgba(229, 9, 20, 0.00)');
        ctx.fillStyle = fillGrad;
        ctx.fill();
        ctx.restore();

        // Glowing Solid Red Line (Double stroke for high-speed GPU rendering without shadowBlur)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, targetX, targetY);
        ctx.strokeStyle = currentStatus === 'CRASHED' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 0, 56, 0.35)';
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, targetX, targetY);
        ctx.strokeStyle = currentStatus === 'CRASHED' ? '#ef4444' : '#ff0038';
        ctx.lineWidth = 3.5;
        ctx.stroke();
        ctx.restore();
      }

      // 9. Draw Authentic Rivexa Monoplane Aircraft with Live Spinning Propeller
      if (currentStatus !== 'CRASHED' || isFlyingAway) {
        ctx.save();
        ctx.globalAlpha = planeAlpha;
        ctx.translate(planeDrawX, planeDrawY);
        ctx.rotate(planeDrawAngle);

        // Responsive Aircraft Dimensions
        const planeW = Math.max(92, Math.min(136, width * 0.125));
        const planeH = planeW * (172 / 585); // aspect ratio of fuselage
        const noseX = planeW * 0.485;
        const noseY = 0;
        const propSize = planeW * (360 / 585);

        // Soft Engine Exhaust Plume Behind Tail
        if (currentStatus === 'FLYING') {
          const plumeGrad = ctx.createRadialGradient(-planeW * 0.42, 0, 1, -planeW * 0.58, 0, 16);
          plumeGrad.addColorStop(0, 'rgba(255, 230, 150, 0.9)');
          plumeGrad.addColorStop(0.35, 'rgba(255, 60, 20, 0.6)');
          plumeGrad.addColorStop(1, 'rgba(255, 0, 0, 0.0)');
          ctx.fillStyle = plumeGrad;
          ctx.beginPath();
          ctx.ellipse(-planeW * 0.48, 0, 16, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Wingtip Vapor Condensation Streamers (Active during high-speed soaring above 1.8x)
        if (currentStatus === 'FLYING' && effectiveMult >= 1.8) {
          ctx.save();
          const vaporLen = Math.min(65, 30 + (effectiveMult - 1.8) * 8);
          const vaporGrad = ctx.createLinearGradient(0, 0, -vaporLen, 0);
          vaporGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
          vaporGrad.addColorStop(0.4, 'rgba(239, 68, 68, 0.25)');
          vaporGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

          ctx.strokeStyle = vaporGrad;
          ctx.lineWidth = 1.6;
          // Upper wingtip vapor
          ctx.beginPath();
          ctx.moveTo(-planeW * 0.15, -planeH * 0.65);
          ctx.lineTo(-planeW * 0.15 - vaporLen, -planeH * 0.65);
          ctx.stroke();
          // Lower runner vapor
          ctx.beginPath();
          ctx.moveTo(-planeW * 0.15, planeH * 0.65);
          ctx.lineTo(-planeW * 0.15 - vaporLen, planeH * 0.65);
          ctx.stroke();
          ctx.restore();
        }

        // Live Propeller Rotation Dynamics:
        // FLYING: high RPM (48 rad/s ≈ 7.6 rev/s)
        // BETTING_OPEN / Idle: smooth cruising rotation (9 rad/s ≈ 1.4 rev/s)
        const spinSpeed = currentStatus === 'FLYING' ? 48.0 : 9.0;
        propAngleRef.current = (propAngleRef.current + spinSpeed * dt) % (Math.PI * 2);
        const currentPropAngle = propAngleRef.current;

        const fuseImg = planeFuselageImgRef.current;
        const propImg = planePropellerImgRef.current;

        if (fuseImg && fuseImg.complete) {
          // 1. Draw Fuselage (centered on aircraft center of gravity)
          ctx.drawImage(fuseImg, -planeW * 0.5, -planeH * 0.5, planeW, planeH);

          // 2. Draw Live Spinning Propeller at Front Nose
          ctx.save();
          ctx.translate(noseX, noseY);

          // Flight Mode: Aerodynamic Propeller Motion Blur (Subtle red/warm glow, NO harsh white ring)
          if (currentStatus === 'FLYING') {
            const blurRadius = propSize * 0.44;
            const discGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, blurRadius);
            discGrad.addColorStop(0, 'rgba(239, 68, 68, 0.38)');
            discGrad.addColorStop(0.5, 'rgba(255, 60, 70, 0.16)');
            discGrad.addColorStop(0.85, 'rgba(255, 140, 150, 0.08)');
            discGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

            ctx.save();
            ctx.fillStyle = discGrad;
            ctx.beginPath();
            ctx.arc(0, 0, blurRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // High-speed blade motion sweep arc
            ctx.save();
            ctx.rotate(currentPropAngle);
            ctx.strokeStyle = 'rgba(255, 200, 200, 0.45)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(0, 0, blurRadius * 0.90, -0.6, 0.6);
            ctx.stroke();
            ctx.restore();
          }

          // Draw Live Rotating Propeller Sprite
          if (propImg && propImg.complete) {
            ctx.save();
            ctx.rotate(currentPropAngle);
            ctx.drawImage(propImg, -propSize * 0.5, -propSize * 0.5, propSize, propSize);
            ctx.restore();
          }

          // Metallic Spinner Hub Cone (stays at nose apex)
          ctx.fillStyle = '#ff1828';
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-1.2, -1.2, 1.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        } else {
          // Fallback vector monoplane if image is buffering
          ctx.fillStyle = '#e50914';
          ctx.beginPath();
          ctx.moveTo(26, 0);
          ctx.quadraticCurveTo(12, -7, -20, -5);
          ctx.lineTo(-24, 5);
          ctx.quadraticCurveTo(12, 7, 26, 0);
          ctx.closePath();
          ctx.fill();

          // Live spinning propeller fallback
          ctx.save();
          ctx.translate(27, 0);
          ctx.rotate(currentPropAngle);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(0, -18);
          ctx.lineTo(0, 18);
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="fixed inset-0 w-screen z-50 bg-[#0a0a0f] text-[#a0a0a0] font-sans flex flex-col select-none overflow-hidden" style={{ height: '100dvh' }}>
      
      {/* ======================================================== */}
      {/* 1. TOP BRAND HEADER BAR (ORIGINAL RIVEXA CRASH BRANDING) */}
      {/* ======================================================== */}
      <header className="h-11 sm:h-12 bg-[#12131a] border-b border-[#212330] px-2.5 sm:px-4 flex items-center justify-between shrink-0 z-20">
        {/* Left: Brand Logo + Rules Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-1.5 group">
            <span className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center text-white text-xs font-black shadow-md shadow-red-600/30">
              ✈
            </span>
            <span className="text-base sm:text-lg font-black text-red-500 font-mono tracking-wider italic group-hover:scale-105 transition-transform">
              RIVEXA
            </span>
            <span className="text-xs sm:text-sm font-black text-white font-mono tracking-tight">
              CRASH
            </span>
          </Link>

          {/* How to Play / Rules Button */}
          <button
            type="button"
            onClick={() => setIsRulesModalOpen(true)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[#1b1c28] hover:bg-[#25283a] text-amber-400 font-mono font-bold text-[11px] sm:text-xs transition-colors border border-amber-400/20"
          >
            <span>?</span>
            <span className="hidden sm:inline">How to play?</span>
          </button>
        </div>

        {/* Center Toast Message */}
        {message && (
          <div className="hidden md:flex items-center gap-1.5 bg-red-600 text-white font-bold text-xs px-3.5 py-1 rounded-full shadow-lg shadow-red-600/30 animate-in fade-in">
            <span>{message}</span>
          </div>
        )}

        {/* Right: Sound, Wallet Balance, Provably Fair, Close */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundMuted((prev) => !prev)}
            title={soundMuted ? 'Unmute Game Audio' : 'Mute Game Audio'}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1a1b26] hover:bg-[#262838] flex items-center justify-center text-xs sm:text-sm text-slate-300 transition-colors border border-[#2b2d40]"
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>

          {/* Current Wallet Balance */}
          <Link
            href="/deposit"
            className="bg-[#171822] border border-[#2d2f42] hover:border-emerald-500/50 px-2.5 sm:px-3.5 py-1 rounded-full flex items-center gap-1.5 transition-all group"
          >
            <span className="text-[11px] sm:text-xs font-black text-emerald-400 font-mono whitespace-nowrap group-hover:text-emerald-300">
              {balance.toFixed(2)} INR
            </span>
          </Link>

          {/* Deposit Button */}
          <Link
            href="/deposit"
            className="hidden sm:flex items-center px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
          >
            Deposit
          </Link>

          {/* Provably Fair History Trigger */}
          <button
            type="button"
            onClick={fetchPeriodHistory}
            title="Provably Fair Seeds & Round History"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1a1b26] hover:bg-[#262838] flex items-center justify-center text-amber-400 font-bold transition-colors text-xs border border-[#2b2d40]"
          >
            🛡️
          </button>

          {/* Close Game */}
          <Link
            href="/"
            title="Exit to Lobby"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1a1b26] hover:bg-[#262838] flex items-center justify-center text-slate-300 font-bold transition-colors text-xs border border-[#2b2d40]"
          >
            ✕
          </Link>
        </div>
      </header>

      {/* Mobile Toast Alert */}
      {message && (
        <div className="md:hidden bg-red-600 text-white font-bold text-xs py-1 px-3 text-center shrink-0">
          {message}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TOP MULTIPLIER HISTORY STRIP (AUTHENTIC ROUND PILLS)   */}
      {/* ======================================================== */}
      <div className="bg-[#101118] border-b border-[#1f212d] px-2 sm:px-4 py-1.5 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5 pr-2" style={{ WebkitOverflowScrolling: 'touch' }}>
          {historyPills.length === 0 ? (
            <span className="text-[10px] font-mono text-slate-500">Connecting to round engine...</span>
          ) : (
            historyPills.map((m, idx) => {
              const isHigh = m >= 10.0;
              const isMedium = m >= 2.0 && m < 10.0;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedRoundDetail({ multiplier: m })}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-mono font-bold shrink-0 transition-transform hover:scale-105 active:scale-95 ${
                    isHigh
                      ? 'bg-[#c01cff]/20 text-[#d846ff] border border-[#c01cff]/50'
                      : isMedium
                      ? 'bg-[#913bfd]/20 text-[#a95dff] border border-[#913bfd]/40'
                      : 'bg-[#34b4ff]/15 text-[#34b4ff] border border-[#34b4ff]/30'
                  }`}
                >
                  {m.toFixed(2)}x
                </button>
              );
            })
          )}
        </div>

        {/* Round ID, Latency & History Icon */}
        <div className="flex items-center gap-2 shrink-0 text-[10px] sm:text-[11px] font-mono text-slate-400">
          <span className="hidden md:inline-block">Round ID: {roundId}</span>
          <span className="text-emerald-400">Ping:{pingLatency}ms</span>
          <button
            type="button"
            onClick={fetchPeriodHistory}
            title="View Round History Archive"
            className="p-1 rounded bg-[#1a1b26] hover:bg-[#25283a] text-slate-300"
          >
            ⏱️
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher (Game Canvas vs Bet History) */}
      <div className="flex lg:hidden bg-[#12131a] border-b border-[#212330] p-1">
        <button
          type="button"
          onClick={() => setMobileTab('game')}
          className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
            mobileTab === 'game' ? 'bg-[#222436] text-white' : 'text-slate-400'
          }`}
        >
          Flight Canvas & Bet Controls
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('bets')}
          className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
            mobileTab === 'bets' ? 'bg-[#222436] text-white' : 'text-slate-400'
          }`}
        >
          Live Bets History ({allActiveBets.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* 3. MAIN WORKSPACE (LEFT BET HISTORY + CENTER ARENA)       */}
      {/* ======================================================== */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[290px_1fr] p-1.5 sm:p-2 gap-1.5 sm:gap-2 overflow-hidden min-h-0">
        
        {/* ====================================================== */}
        {/* LEFT COLUMN — BET HISTORY PANEL (DESKTOP & MOBILE TAB) */}
        {/* ====================================================== */}
        <aside className={`${mobileTab === 'bets' ? 'flex' : 'hidden'} lg:flex flex-col bg-[#12131a] border border-[#212330] rounded-xl overflow-hidden h-full`}>
          {/* Tabs: All Bets / My Bets / Top */}
          <div className="flex items-center bg-[#171822] border-b border-[#212330] p-1">
            <button
              type="button"
              onClick={() => setSidebarTab('all')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                sidebarTab === 'all' ? 'bg-[#252738] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Bets
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('my')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                sidebarTab === 'my' ? 'bg-[#252738] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              My Bets
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('top')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                sidebarTab === 'top' ? 'bg-[#252738] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Top
            </button>
          </div>

          {/* Subheader Bet Count */}
          <div className="px-3 py-1.5 bg-[#14151f] border-b border-[#212330] flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400 font-bold">
              {sidebarTab === 'all' ? `ALL BETS (${allActiveBets.length})` : sidebarTab === 'my' ? `MY BETS (${myOrders.length})` : `TOP BETS (${topBets.length})`}
            </span>
            <span className="text-emerald-400 font-bold">INR Verified</span>
          </div>

          {/* Table Headers */}
          <div className="px-3 py-1 bg-[#101118] border-b border-[#1f212d] grid grid-cols-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>User</span>
            <span className="text-right">Bet INR</span>
            <span className="text-right">X</span>
            <span className="text-right">Cash Out</span>
          </div>

          {/* Table Rows List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#181a24] scrollbar-thin scrollbar-thumb-slate-800">
            {sidebarTab === 'my' ? (
              myOrders.length === 0 ? (
                <div className="p-8 text-center text-xs font-semibold text-slate-500">
                  No bets placed yet. Place your bet below!
                </div>
              ) : (
                myOrders.map((order, i) => {
                  const isWon = order.status === 'WON' || order.status === 'CASHED_OUT';
                  return (
                    <div key={i} className={`px-3 py-2 grid grid-cols-4 items-center text-xs font-mono transition-colors ${isWon ? 'bg-emerald-950/20' : ''}`}>
                      <span className="text-slate-300 font-bold truncate">You</span>
                      <span className="text-right font-bold text-white">{Number(order.amount).toFixed(2)}</span>
                      <span className={`text-right font-bold ${isWon ? 'text-emerald-400' : 'text-red-500'}`}>
                        {Number(order.multiplier || 0).toFixed(2)}x
                      </span>
                      <span className={`text-right font-bold ${isWon ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {isWon ? Number(order.payout).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  );
                })
              )
            ) : sidebarTab === 'top' ? (
              topBets.length === 0 ? (
                <div className="p-8 text-center text-xs font-semibold text-slate-500">
                  Waiting for active round bets...
                </div>
              ) : (
                topBets.map((b, i) => {
                  const isCashed = b.status === 'CASHED_OUT' || b.status === 'WON';
                  return (
                    <div key={b.id || i} className={`px-3 py-1.5 grid grid-cols-4 items-center text-xs font-mono transition-colors hover:bg-[#1a1b26] ${isCashed ? 'bg-emerald-950/25 border-l-2 border-emerald-500' : 'border-l-2 border-transparent'}`}>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold shrink-0">
                          👑
                        </span>
                        <span className="text-slate-300 truncate font-medium">{b.username}</span>
                      </div>
                      <span className="text-right font-bold text-slate-200">{Number(b.amount).toFixed(2)}</span>
                      <div className="text-right">
                        {isCashed ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                            {Number(b.multiplier).toFixed(2)}x
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </div>
                      <span className={`text-right font-bold ${isCashed ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {isCashed ? Number(b.payout).toFixed(2) : '-'}
                      </span>
                    </div>
                  );
                })
              )
            ) : allActiveBets.length === 0 ? (
              <div className="p-8 text-center text-xs font-semibold text-slate-500">
                Waiting for player bets in this round...
              </div>
            ) : (
              allActiveBets.map((b, i) => {
                const isCashed = b.status === 'CASHED_OUT' || b.status === 'WON';
                const isLost = b.status === 'LOST';
                return (
                  <div key={b.id || i} className={`px-3 py-1.5 grid grid-cols-4 items-center text-xs font-mono transition-all duration-300 hover:bg-[#1a1b26] ${isCashed ? 'bg-emerald-950/25 border-l-2 border-emerald-500' : isLost ? 'border-l-2 border-red-500/30 opacity-70' : 'border-l-2 border-transparent'}`}>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${isCashed ? 'bg-emerald-500/20 text-emerald-400' : isLost ? 'bg-red-500/20 text-red-400' : 'bg-red-600/30 text-red-400'}`}>
                        {isCashed ? '✓' : isLost ? '✕' : '👤'}
                      </span>
                      <span className={`truncate font-medium ${isCashed ? 'text-emerald-200' : 'text-slate-300'}`}>{b.username}</span>
                    </div>
                    <span className="text-right font-bold text-slate-200">{Number(b.amount).toFixed(2)}</span>
                    <div className="text-right">
                      {isCashed ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                          {Number(b.multiplier).toFixed(2)}x
                        </span>
                      ) : isLost ? (
                        <span className="text-red-500/60 text-[10px]">Crashed</span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">-</span>
                      )}
                    </div>
                    <span className={`text-right font-bold ${isCashed ? 'text-emerald-400 font-black' : isLost ? 'text-red-500/50' : 'text-slate-500'}`}>
                      {isCashed ? Number(b.payout).toFixed(2) : isLost ? '0.00' : '-'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Provably Fair Verification Indicator */}
          <div className="p-2 bg-[#0f1017] border-t border-[#212330] text-[10px] font-mono text-slate-400 text-center flex items-center justify-center gap-1">
            <span className="text-emerald-400">🛡️</span>
            <span>This game is</span>
            <button
              type="button"
              onClick={fetchPeriodHistory}
              className="text-emerald-400 hover:underline font-bold"
            >
              Provably Fair
            </button>
          </div>
        </aside>

        {/* ====================================================== */}
        {/* CENTER & RIGHT COLUMN — CANVAS ARENA + DUAL CONTROLS   */}
        {/* ====================================================== */}
        <main className={`${mobileTab === 'game' ? 'flex' : 'hidden'} lg:flex flex-col gap-1.5 sm:gap-2 min-h-0 overflow-hidden`}>
          
          {/* ==================================================== */}
          {/* MAIN FLIGHT CANVAS ARENA                             */}
          {/* ==================================================== */}
          <div className="flex-1 min-h-[240px] sm:min-h-[290px] bg-[#07080d] border border-[#212330] rounded-xl relative overflow-hidden flex flex-col justify-between p-3 sm:p-4 shadow-2xl">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            {/* Top Period Badge Overlay */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                RIVEXA FLIGHT ARENA
              </span>
              <span className="bg-[#12131c]/90 border border-[#2b2d40] text-amber-400 font-mono font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">
                Period #{roundId}
              </span>
            </div>

            {/* Huge Multiplier Readout Display in Center */}
            <div className="relative z-10 text-center space-y-1.5 my-auto">
              <div
                className={`text-5xl sm:text-7xl md:text-8xl font-black font-mono tracking-tight transition-colors drop-shadow-[0_4px_30px_rgba(255,255,255,0.15)] ${
                  status === 'CRASHED' ? 'text-red-600' : 'text-white'
                }`}
              >
                {status === 'CRASHED' ? `${crashedAt.toFixed(2)}x` : `${currentMultiplier.toFixed(2)}x`}
              </div>

              {/* Crash Result Status */}
              {status === 'CRASHED' && (
                <div className="text-red-500 font-mono font-black text-sm sm:text-base uppercase tracking-widest animate-pulse">
                  FLEW AWAY!
                </div>
              )}

              {/* Waiting For Next Round */}
              {status === 'BETTING_OPEN' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs uppercase tracking-wider">
                  <span className="animate-spin">⏳</span>
                  <span>WAITING FOR NEXT ROUND ({secondsRemaining}s)</span>
                </div>
              )}
            </div>

            {/* Live Profit Banner for Active Bets */}
            {status === 'FLYING' && (userBetStatus1 === 'PENDING' || userBetStatus2 === 'PENDING') && (
              <div className="relative z-10 bg-[#12131d]/90 border border-emerald-500/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-mono shadow-md">
                <span className="text-slate-300 font-bold">
                  BET {userBetStatus1 === 'PENDING' ? '1' : ''}{userBetStatus1 === 'PENDING' && userBetStatus2 === 'PENDING' ? ' & ' : ''}{userBetStatus2 === 'PENDING' ? '2' : ''} IN FLIGHT...
                </span>
                <span className="text-emerald-400 font-black text-sm animate-pulse">
                  {currentMultiplier.toFixed(2)}x
                </span>
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* DUAL BET CONTROL PANELS (SIDE-BY-SIDE ON DESKTOP)     */}
          {/* ==================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-2 shrink-0">
            
            {/* ================= PANEL 1 ================= */}
            <div className="bg-[#12131a] border border-[#212330] rounded-xl p-2.5 sm:p-3 flex flex-col justify-between gap-2">
              {/* Tab Toggle: Bet | Auto */}
              <div className="flex items-center justify-between">
                <div className="bg-[#171822] p-0.5 rounded-lg flex text-xs font-mono font-bold border border-[#212330]">
                  <button
                    type="button"
                    onClick={() => setBetTab1('bet')}
                    className={`px-4 py-1 rounded-md transition-all ${
                      betTab1 === 'bet' ? 'bg-[#252738] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Bet
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetTab1('auto')}
                    className={`px-4 py-1 rounded-md transition-all ${
                      betTab1 === 'auto' ? 'bg-[#252738] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Auto
                  </button>
                </div>

                {betTab1 === 'auto' && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoBet1}
                      onChange={(e) => setAutoBet1(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-700 text-red-600 accent-red-600"
                    />
                    <span className="text-[10px] font-bold text-red-400 uppercase">Auto Bet</span>
                  </label>
                )}
              </div>

              {/* Stepper + Action Button */}
              <div className="flex items-center gap-2">
                {/* Stepper & Preset Chips */}
                <div className="flex-1 space-y-1.5">
                  <div className="bg-[#0b0c12] border border-[#242636] rounded-xl flex items-center justify-between px-2 sm:px-3 py-1 text-white font-mono font-black text-sm">
                    <button
                      type="button"
                      onClick={() => setBetAmount1((prev) => Math.max(10, prev - 10))}
                      className="w-7 h-7 rounded-lg bg-[#1a1b26] hover:bg-[#252738] active:scale-95 flex items-center justify-center text-slate-200 font-bold"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="10"
                      value={betAmount1 || ''}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setBetAmount1(isNaN(v) ? 0 : Math.max(0, v));
                      }}
                      className="w-20 bg-transparent text-white font-mono font-bold text-sm text-center focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setBetAmount1((prev) => prev + 10)}
                      className="w-7 h-7 rounded-lg bg-[#1a1b26] hover:bg-[#252738] active:scale-95 flex items-center justify-center text-slate-200 font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Preset Chips */}
                  <div className="grid grid-cols-4 gap-1">
                    {[10, 100, 500, 1000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setBetAmount1(val)}
                        className="bg-[#171822] hover:bg-[#252738] text-slate-300 font-mono font-bold text-[10px] py-1 rounded-md border border-[#242636] transition-colors"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Big Action Button 1 */}
                <div className="w-28 sm:w-32 flex-shrink-0">
                  {status === 'BETTING_OPEN' && userBetStatus1 === 'NONE' && (
                    <button
                      type="button"
                      onClick={() => handlePlaceBet(1)}
                      disabled={loadingBet1}
                      className="w-full h-full py-3 sm:py-4 px-2 bg-[#28a745] hover:bg-[#218838] active:bg-[#1e7e34] text-white font-black rounded-xl shadow-lg shadow-green-950/40 active:scale-[0.98] transition-all flex flex-col items-center justify-center leading-tight cursor-pointer disabled:opacity-50"
                    >
                      <span className="text-base sm:text-lg">BET</span>
                      <span className="text-xs font-mono font-bold">{betAmount1.toFixed(0)} INR</span>
                    </button>
                  )}

                  {status === 'BETTING_OPEN' && userBetStatus1 === 'PENDING' && (
                    <div className="w-full h-full py-3 sm:py-4 px-2 bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl text-center flex flex-col items-center justify-center">
                      <span>WAIT</span>
                      <span className="text-[10px] font-mono">{betAmount1.toFixed(0)} INR</span>
                    </div>
                  )}

                  {status === 'FLYING' && userBetStatus1 === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => handleCashout(1)}
                      disabled={loadingBet1}
                      className="w-full h-full py-3 sm:py-4 px-2 bg-[#ff9900] hover:bg-[#e68a00] active:bg-[#cc7a00] text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all flex flex-col items-center justify-center leading-tight animate-pulse cursor-pointer disabled:opacity-50"
                    >
                      <span className="text-xs uppercase font-extrabold">CASH OUT</span>
                      <span className="text-sm font-mono font-black">
                        {(betAmount1 * currentMultiplier).toFixed(2)} INR
                      </span>
                    </button>
                  )}

                  {status === 'FLYING' && userBetStatus1 === 'CASHED_OUT' && (
                    <div className="w-full h-full py-3 sm:py-4 px-2 bg-[#171822] text-emerald-400 font-extrabold text-xs uppercase rounded-xl text-center flex flex-col items-center justify-center border border-emerald-500/30">
                      <span>CASHED OUT</span>
                    </div>
                  )}

                  {status === 'FLYING' && userBetStatus1 === 'NONE' && (
                    <div className="w-full h-full py-3 sm:py-4 px-2 bg-[#171822] text-slate-500 font-extrabold text-xs uppercase rounded-xl text-center flex flex-col items-center justify-center">
                      <span>IN FLIGHT</span>
                    </div>
                  )}

                  {status === 'CRASHED' && (
                    <div className="w-full h-full py-3 sm:py-4 px-2 bg-[#171822] text-red-500 font-extrabold text-xs uppercase rounded-xl text-center flex flex-col items-center justify-center border border-red-500/20">
                      <span>CRASHED</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto Cashout Field in Auto Tab */}
              {betTab1 === 'auto' && (
                <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-[#212330]">
                  <span className="text-slate-400">Auto Cash Out:</span>
                  <input
                    type="number"
                    step="0.10"
                    placeholder="e.g. 2.00x"
                    value={autoCashout1}
                    onChange={(e) => setAutoCashout1(e.target.value)}
                    className="w-24 bg-[#0b0c12] border border-[#242636] rounded-md px-2 py-0.5 text-xs text-right text-white font-bold"
                  />
                </div>
              )}
            </div>

            {/* ================= PANEL 2 ================= */}
            <div className="bg-[#12131a] border border-[#212330] rounded-xl p-2.5 sm:p-3 flex flex-col justify-between gap-2">
              {/* Tab Toggle: Bet | Auto */}
              <div className="flex items-center justify-between">
                <div className="bg-[#171822] p-0.5 rounded-lg flex text-xs font-mono font-bold border border-[#212330]">
                  <button
                    type="button"
                    onClick={() => setBetTab2('bet')}
                    className={`px-4 py-1 rounded-md transition-all ${
                      betTab2 === 'bet' ? 'bg-[#252738] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Bet
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetTab2('auto')}
                    className={`px-4 py-1 rounded-md transition-all ${
                      betTab2 === 'auto' ? 'bg-[#252738] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Auto
                  </button>
                </div>

                {betTab2 === 'auto' && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoBet2}
                      onChange={(e) => setAutoBet2(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-700 text-red-600 accent-red-600"
                    />
                    <span className="text-[10px] font-bold text-red-400 uppercase">Auto Bet</span>
                  </label>
                )}
              </div>

              {/* Stepper + Action Button */}
              <div className="flex items-center gap-2">
                {/* Stepper & Preset Chips */}
                <div className="flex-1 space-y-1.5">
                  <div className="bg-[#0b0c12] border border-[#242636] rounded-xl flex items-center justify-between px-2 sm:px-3 py-1 text-white font-mono font-black text-sm">
                    <button
                      type="button"
                      onClick={() => setBetAmount2((prev) => Math.max(10, prev - 10))}
                      className="w-7 h-7 rounded-lg bg-[#1a1b26] hover:bg-[#252738] active:scale-95 flex items-center justify-center text-slate-200 font-bold"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="10"
                      value={betAmount2 || ''}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setBetAmount2(isNaN(v) ? 0 : Math.max(0, v));
                      }}
                      className="w-20 bg-transparent text-white font-mono font-bold text-sm text-center focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setBetAmount2((prev) => prev + 10)}
                      className="w-7 h-7 rounded-lg bg-[#1a1b26] hover:bg-[#252738] active:scale-95 flex items-center justify-center text-slate-200 font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Preset Chips */}
                  <div className="grid grid-cols-4 gap-1">
                    {[10, 100, 500, 1000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setBetAmount2(val)}
                        className="bg-[#171822] hover:bg-[#252738] text-slate-300 font-mono font-bold text-[10px] py-1 rounded-md border border-[#242636] transition-colors"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Big Action Button 2 */}
                <div className="w-28 sm:w-32 flex-shrink-0">
                  {status === 'BETTING_OPEN' && userBetStatus2 === 'NONE' && (
                    <button
                      type="button"
                      onClick={() => handlePlaceBet(2)}
                      disabled={loadingBet2}
                      className="w-full h-full py-3 sm:py-4 px-2 bg-[#28a745] hover:bg-[#218838] active:bg-[#1e7e34] text-white font-black rounded-xl shadow-lg shadow-green-950/40 active:scale-[0.98] transition-all flex flex-col items-center justify-center leading-tight cursor-pointer disabled:opacity-50"
                    >
                      <span className="text-base sm:text-lg">BET</span>
                      <span className="text-xs font-mono font-bold">{betAmount2.toFixed(0)} INR</span>
                    </button>
                  )}

                  {status === 'BETTING_OPEN' && userBetStatus2 === 'PENDING' && (
                    <div className="w-full h-full py-3 sm:py-4 px-2 bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl text-center flex flex-col items-center justify-center">
                      <span>WAIT</span>
                      <span className="text-[10px] font-mono">{betAmount2.toFixed(0)} INR</span>
                    </div>
                  )}

                  {status === 'FLYING' && userBetStatus2 === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => handleCashout(2)}
                      disabled={loadingBet2}
                      className="w-full h-full py-3 sm:py-4 px-2 bg-[#ff9900] hover:bg-[#e68a00] active:bg-[#cc7a00] text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all flex flex-col items-center justify-center leading-tight animate-pulse cursor-pointer disabled:opacity-50"
                    >
                      <span className="text-xs uppercase font-extrabold">CASH OUT</span>
                      <span className="text-sm font-mono font-black">
                        {(betAmount2 * currentMultiplier).toFixed(2)} INR
                      </span>
                    </button>
                  )}

                  {status === 'FLYING' && userBetStatus2 === 'CASHED_OUT' && (
                    <div className="w-full h-full py-3 sm:py-4 px-2 bg-[#171822] text-emerald-400 font-extrabold text-xs uppercase rounded-xl text-center flex flex-col items-center justify-center border border-emerald-500/30">
                      <span>CASHED OUT</span>
                    </div>
                  )}

                  {status === 'FLYING' && userBetStatus2 === 'NONE' && (
                    <div className="w-full h-full py-3 sm:py-4 px-2 bg-[#171822] text-slate-500 font-extrabold text-xs uppercase rounded-xl text-center flex flex-col items-center justify-center">
                      <span>IN FLIGHT</span>
                    </div>
                  )}

                  {status === 'CRASHED' && (
                    <div className="w-full h-full py-3 sm:py-4 px-2 bg-[#171822] text-red-500 font-extrabold text-xs uppercase rounded-xl text-center flex flex-col items-center justify-center border border-red-500/20">
                      <span>CRASHED</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto Cashout Field in Auto Tab */}
              {betTab2 === 'auto' && (
                <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-[#212330]">
                  <span className="text-slate-400">Auto Cash Out:</span>
                  <input
                    type="number"
                    step="0.10"
                    placeholder="e.g. 2.00x"
                    value={autoCashout2}
                    onChange={(e) => setAutoCashout2(e.target.value)}
                    className="w-24 bg-[#0b0c12] border border-[#242636] rounded-md px-2 py-0.5 text-xs text-right text-white font-bold"
                  />
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* ======================================================== */}
      {/* 4. MODALS (RULES, PROVABLY FAIR SEEDS, VALIDATION ERROR) */}
      {/* ======================================================== */}

      {/* RULES / "HOW TO PLAY" MODAL */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#14151f] border border-[#25283a] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-white max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#212330]">
              <div className="flex items-center gap-2">
                <span className="text-xl">✈</span>
                <h3 className="text-base font-black text-white">How to Play Rivexa Crash</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#212330] hover:bg-[#2d3042] text-slate-300 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300 font-sans">
              <div className="bg-[#1b1c28] p-3 rounded-xl border border-[#282a3c] space-y-1">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <span className="text-emerald-400">1.</span> Place Your Bets
                </h4>
                <p>
                  Choose your bet amount in Panel 1 and/or Panel 2 before the round starts. You can place one or two bets simultaneously.
                </p>
              </div>

              <div className="bg-[#1b1c28] p-3 rounded-xl border border-[#282a3c] space-y-1">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <span className="text-emerald-400">2.</span> Watch the Aircraft Ascend
                </h4>
                <p>
                  The aircraft takes off and the multiplier starts at 1.00x, climbing continuously into the sky. At 1.50x, the plane reaches approximately halfway across the arena!
                </p>
              </div>

              <div className="bg-[#1b1c28] p-3 rounded-xl border border-[#282a3c] space-y-1">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <span className="text-emerald-400">3.</span> Cash Out Before the Crash
                </h4>
                <p>
                  Click "CASH OUT" at any moment to claim your winnings equal to your stake multiplied by the current multiplier. If the aircraft flies away before you cash out, your bet is lost!
                </p>
              </div>

              <div className="bg-[#1b1c28] p-3 rounded-xl border border-[#282a3c] space-y-1">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <span className="text-emerald-400">4.</span> Provably Fair SHA-256 Engine
                </h4>
                <p>
                  Every round multiplier is predetermined through cryptographic HMAC-SHA256 seeds generated server-side. No outcome can be manipulated or influenced.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRulesModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 font-black text-xs text-white uppercase tracking-wider transition-colors shadow-lg shadow-red-600/30"
            >
              Got it, let's fly!
            </button>
          </div>
        </div>
      )}

      {/* PROVABLY FAIR SEED & PERIOD HISTORY MODAL */}
      {isSeedModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#14151f] border border-[#25283a] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#212330]">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                <div>
                  <h3 className="text-base font-black leading-none text-white">Period Seed Verification</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Provably Fair HMAC-SHA256 Multipliers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSeedModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#212330] hover:bg-[#2d3042] text-slate-300 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {periodHistory.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs font-bold">
                  Loading verified round seed history...
                </p>
              ) : (
                periodHistory.map((period, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#1b1c28] border border-[#282a3c] space-y-1 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-slate-200">Period #{period.periodNumber}</span>
                      <span className="font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        {period.crashMultiplier}x
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 break-all bg-[#0e0e14] p-2 rounded-lg border border-[#212330]">
                      <span className="text-slate-300 font-bold block mb-0.5">Seed Hash (SHA-256):</span>
                      {period.seedHash}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SINGLE ROUND DETAIL PILL MODAL */}
      {selectedRoundDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#14151f] border border-[#25283a] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#212330]">
              <h3 className="text-base font-black text-white">Verified Round Result</h3>
              <button
                type="button"
                onClick={() => setSelectedRoundDetail(null)}
                className="w-7 h-7 rounded-full bg-[#212330] hover:bg-[#2d3042] text-slate-300 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="text-center py-4 space-y-2">
              <span className="text-4xl font-black font-mono text-emerald-400">
                {selectedRoundDetail.multiplier?.toFixed(2)}x
              </span>
              <p className="text-xs text-slate-400">
                Authoritative crash point generated by provably fair RNG.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedRoundDetail(null)}
              className="w-full py-2.5 rounded-xl bg-[#212330] hover:bg-[#2d3042] font-bold text-xs text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Validation Error Popup Modal */}
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
