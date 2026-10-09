'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl, getWsBaseUrl } from '@/lib/config';
import { io, Socket } from 'socket.io-client';

import { SpribeAudioEngine } from '@/utils/spribeAudio';
import ValidationErrorModal, { ValidationErrorType } from './ValidationErrorModal';

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
}

export function AviatorGame() {
  const { user, refreshUser, refreshBalance, balance: contextBalance } = useAuth();

  // Balance & Global Game State
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
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  const [sidebarTab, setSidebarTab] = useState<'all' | 'previous' | 'top'>('all');
  const [mobileTab, setMobileTab] = useState<'game' | 'bets'>('game');

  // History Pills from API
  const [historyPills, setHistoryPills] = useState<number[]>([]);

  // Round Engine State from API
  const [roundId, setRoundId] = useState<string>('—');
  const [status, setStatus] = useState<'BETTING_OPEN' | 'FLYING' | 'CRASHED'>('BETTING_OPEN');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(6);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [crashedAt, setCrashedAt] = useState<number>(1.0);

  // Live Player Bets from API
  const [roundBets, setRoundBets] = useState<any[]>([]);

  // Provably Fair Modal
  const [isSeedModalOpen, setIsSeedModalOpen] = useState<boolean>(false);
  const [periodHistory, setPeriodHistory] = useState<any[]>([]);
  const [isFullHistoryOpen, setIsFullHistoryOpen] = useState<boolean>(false);
  const [fullHistoryOrders, setFullHistoryOrders] = useState<any[]>([]);

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

  // DUAL BET PANEL 1 STATE
  const [betTab1, setBetTab1] = useState<'bet' | 'auto'>('bet');
  const [betAmount1, setBetAmount1] = useState<number>(10.0);
  const [autoCashout1, setAutoCashout1] = useState<string>('');
  const [autoBet1, setAutoBet1] = useState<boolean>(false);
  const [activeBetId1, setActiveBetId1] = useState<string | null>(null);
  const [userBetStatus1, setUserBetStatus1] = useState<'NONE' | 'PENDING' | 'CASHED_OUT' | 'LOST'>('NONE');

  // DUAL BET PANEL 2 STATE
  const [betTab2, setBetTab2] = useState<'bet' | 'auto'>('bet');
  const [betAmount2, setBetAmount2] = useState<number>(10.0);
  const [autoCashout2, setAutoCashout2] = useState<string>('');
  const [autoBet2, setAutoBet2] = useState<boolean>(false);
  const [activeBetId2, setActiveBetId2] = useState<string | null>(null);
  const [userBetStatus2, setUserBetStatus2] = useState<'NONE' | 'PENDING' | 'CASHED_OUT' | 'LOST'>('NONE');

  // User Orders
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loadingBet, setLoadingBet] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved =
        localStorage.getItem('rivexa_sound_enabled') ??
        localStorage.getItem('aviator_sound_muted') ??
        localStorage.getItem('game_sound_enabled');
      if (saved !== null) {
        setSoundMuted(saved === 'false' || saved === 'true' && localStorage.getItem('aviator_sound_muted') === 'true');
      }
    } catch (e) {}
  }, []);

  // Canvas & Audio Engine Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flightProgressRef = useRef<number>(0);
  const autoBetPlaced1 = useRef<boolean>(false);
  const autoBetPlaced2 = useRef<boolean>(false);

  // Continuous Spribe Audio Engine Ref
  const audioEngineRef = useRef<any>(null);
  const prevStatusRef = useRef<string>('BETTING_OPEN');

  useEffect(() => {
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
    window.addEventListener('popstate', handleCleanup);
    window.addEventListener('route_change_audio_cleanup', handleCleanup);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handleCleanup);
      window.removeEventListener('beforeunload', handleCleanup);
      window.removeEventListener('popstate', handleCleanup);
      window.removeEventListener('route_change_audio_cleanup', handleCleanup);
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

  // Process incoming game state (from REST or Socket.IO)
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
        } else if (newStatus === 'CRASHED') {
          if (prevStatusRef.current === 'FLYING') {
            audioEngineRef.current.playCrashExplosion();
          }
        } else if (newStatus === 'BETTING_OPEN') {
          if (prevStatusRef.current !== 'BETTING_OPEN') {
            audioEngineRef.current.stopFlightTheme();
            audioEngineRef.current.playPreFlightChime();
          }
        }
      }
      prevStatusRef.current = newStatus;

      setRoundId(data.round.roundNumber ? String(data.round.roundNumber) : (data.round.id ? data.round.id.slice(0, 8).toUpperCase() : '—'));
      setStatus(newStatus);
      setCrashedAt(parseFloat(data.round.crashMultiplier || '1.0'));
    }

    if (typeof data.secondsRemaining === 'number') {
      setSecondsRemaining(data.secondsRemaining);
    }

    const multVal = parseFloat(data.currentMultiplier || '1.0');
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

    // Active user bets sync
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

  // Ref to hold latest processGameStateData to avoid unnecessary socket reconnects
  const processGameStateDataRef = useRef(processGameStateData);
  useEffect(() => {
    processGameStateDataRef.current = processGameStateData;
  }, [processGameStateData]);

  // Fallback REST Synchronize state with NestJS backend API
  const fetchGameState = useCallback(async () => {
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
        const data = await res.json();
        processGameStateDataRef.current(data);
      }
    } catch (err) {
      // Fallback
    }
  }, [user?.id]);

  // Real-time Socket.IO connection for continuous 24/7 background sync
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

    // Initial REST fetch to populate immediately while socket connects
    fetchGameState();
    const interval = setInterval(fetchGameState, 1000);

    return () => {
      clearInterval(interval);
      if (socket.connected) {
        socket.disconnect();
      } else {
        socket.once('connect', () => {
          socket.disconnect();
        });
      }
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

  // Fetch Provably Fair History
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

  // Fetch Full User Bet History (Limit 100)
  const fetchFullUserHistory = async () => {
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
      const res = await fetch(`${apiBase}/games/crash/history?userId=${effectiveUserId}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setFullHistoryOrders(data);
      }
    } catch (err) {}
    setIsFullHistoryOpen(true);
  };

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders, status]);

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
        message: 'Please log in to place bets on Aviator.',
      });
      return;
    }

    const amt = panelNum === 1 ? betAmount1 : betAmount2;
    if (isNaN(amt) || amt < 10) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Minimum bet amount for Aviator is ₹10.',
        minBet: 10,
        requiredAmount: amt || 0,
      });
      return;
    }

    if (balance <= 0 || amt > balance) {
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: `Your current balance (₹${balance.toFixed(2)}) is insufficient for a ₹${amt.toFixed(2)} bet. Please recharge your wallet.`,
        requiredAmount: amt,
        currentBalance: balance,
      });
      return;
    }

    setLoadingBet(true);
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
      if (!res.ok) {
        const errMsg = data.message || 'Failed to place bet.';
        if (errMsg.toLowerCase().includes('balance') || res.status === 400) {
          setValidationModal({
            isOpen: true,
            type: 'INSUFFICIENT_BALANCE',
            message: errMsg,
            requiredAmount: amt,
            currentBalance: balance,
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

      if (panelNum === 1) {
        setActiveBetId1(data.betId);
        setUserBetStatus1('PENDING');
      } else {
        setActiveBetId2(data.betId);
        setUserBetStatus2('PENDING');
      }

      if (data.newBalance) setBalance(parseFloat(data.newBalance));
      setMessage(`🚀 Bet ${panelNum} placed! Prepare for launch.`);
      fetchMyOrders();
      refreshUser();
    } catch (err: any) {
      setValidationModal({
        isOpen: true,
        type: 'GAME_ERROR',
        message: err.message === 'Failed to fetch' ? 'Connection error. Retrying...' : err.message || 'Error placing bet.',
      });
    } finally {
      setLoadingBet(false);
    }
  };

  // Cashout Handler
  const handleCashout = async (panelNum: 1 | 2) => {
    const betId = panelNum === 1 ? activeBetId1 : activeBetId2;
    const statusVal = panelNum === 1 ? userBetStatus1 : userBetStatus2;

    if (!betId || statusVal !== 'PENDING') return;

    setMessage('');
    setLoadingBet(true);
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
      setMessage(`🎉 CASHED OUT @ ${mult.toFixed(2)}x! +₹${pay.toFixed(2)} credited.`);
      fetchMyOrders();
      refreshUser();
    } catch (err: any) {
      setMessage(err.message === 'Failed to fetch' ? 'Connection error. Retrying...' : err.message || 'Cashout error.');
      if (panelNum === 1) setUserBetStatus1('LOST');
      else setUserBetStatus2('LOST');
      fetchMyOrders();
    } finally {
      setLoadingBet(false);
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

  // 60FPS Aviator Canvas Loop (Radiating Sunburst + Red Aircraft Vector)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    const height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Spribe Aviator Dark Burgundy Radial Background
      const bgGrad = ctx.createRadialGradient(width * 0.1, height * 0.9, 50, width * 0.5, height * 0.5, width);
      bgGrad.addColorStop(0, '#2d0016');
      bgGrad.addColorStop(0.4, '#1b0512');
      bgGrad.addColorStop(1, '#0e0e0e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Radiating Sunburst Fan Rays from Bottom-Left Origin (0, height)
      const rayOriginX = 0;
      const rayOriginY = height;
      const totalRays = 32;

      ctx.save();
      for (let i = 0; i < totalRays; i++) {
        const angleStart = (i * (Math.PI / 2)) / totalRays;
        const angleEnd = ((i + 0.5) * (Math.PI / 2)) / totalRays;

        ctx.beginPath();
        ctx.moveTo(rayOriginX, rayOriginY);
        ctx.arc(rayOriginX, rayOriginY, width * 1.5, -angleStart, -angleEnd, true);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? 'rgba(229, 9, 20, 0.04)' : 'rgba(0, 0, 0, 0.08)';
        ctx.fill();
      }
      ctx.restore();

      // 3. Dynamic Multi-Sample Flight Curve Coordinates & Trajectory Wave System
      const isMobileScreen = width < 640;
      const startX = width * 0.05;
      const startY = height * 0.85;
      const endX = width * (isMobileScreen ? 0.62 : 0.65);
      const endY = height * (isMobileScreen ? 0.38 : 0.35);
      const timeSec = Date.now() / 1000;

      let targetProgressMult = 1.0;
      if (status === 'FLYING') {
        targetProgressMult = currentMultiplier;
      } else if (status === 'CRASHED') {
        targetProgressMult = crashedAt;
      } else {
        targetProgressMult = 1.0;
      }

      flightProgressRef.current += (targetProgressMult - flightProgressRef.current) * 0.08;

      // Logarithmic continuous flight scaling (1.00x to 500.0x+)
      const currentMult = Math.max(1.0, flightProgressRef.current);
      const logVal = Math.min(1.0, Math.log(currentMult) / Math.log(60.0));
      const easeProgress = Math.pow(logVal, 0.78);

      // Multi-sample trajectory curve with dynamic upper circuit & down circuit wave harmonics
      const numSamples = 50;
      const curvePoints: Array<{ x: number; y: number }> = [];

      for (let i = 0; i <= numSamples; i++) {
        const u = i / numSamples;
        const bx = startX + (endX - startX) * easeProgress * u;
        const by = startY - (startY - endY) * easeProgress * Math.pow(u, 0.85);

        curvePoints.push({
          x: bx,
          y: by,
        });
      }

      const tipPoint = curvePoints[curvePoints.length - 1];
      const planeX = tipPoint.x;
      const planeY = tipPoint.y;

      const prevTipPoint = curvePoints[Math.max(0, curvePoints.length - 3)];
      const angle = Math.atan2(planeY - prevTipPoint.y, planeX - prevTipPoint.x);

      // Draw Dynamic Wave Flight Path Line & Shaded Area Under Curve
      if (easeProgress > 0.005) {
        // Red Fill under curve
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        for (let i = 0; i < curvePoints.length; i++) {
          ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
        }
        ctx.lineTo(planeX, height);
        ctx.lineTo(startX, height);
        ctx.closePath();
        const areaGrad = ctx.createLinearGradient(0, endY, 0, height);
        areaGrad.addColorStop(0, status === 'CRASHED' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(229, 9, 20, 0.35)');
        areaGrad.addColorStop(1, 'rgba(229, 9, 20, 0.02)');
        ctx.fillStyle = areaGrad;
        ctx.fill();
        ctx.restore();

        // Glowing Solid Red Dynamic Curve
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        for (let i = 0; i < curvePoints.length; i++) {
          ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
        }
        ctx.strokeStyle = status === 'CRASHED' ? '#ef4444' : '#ff0038';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff0038';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }

      // 4. Draw Official Red Aviator Aircraft Vector Sprite at (planeX, planeY)
      if (status !== 'CRASHED' || easeProgress < 0.05) {
        ctx.save();
        ctx.translate(planeX, planeY);
        ctx.rotate(angle);

        // Plane Fuselage & Wings (Bright Red #e50914)
        ctx.fillStyle = '#e50914';
        ctx.beginPath();
        // Fuselage Body
        ctx.moveTo(28, 0);
        ctx.quadraticCurveTo(12, -8, -22, -6);
        ctx.lineTo(-24, 6);
        ctx.quadraticCurveTo(12, 8, 28, 0);
        ctx.closePath();
        ctx.fill();

        // Top Main Wing
        ctx.beginPath();
        ctx.moveTo(2, -4);
        ctx.lineTo(-12, -26);
        ctx.lineTo(-20, -26);
        ctx.lineTo(-8, -4);
        ctx.closePath();
        ctx.fill();

        // Bottom Main Wing
        ctx.beginPath();
        ctx.moveTo(2, 4);
        ctx.lineTo(-12, 26);
        ctx.lineTo(-20, 26);
        ctx.lineTo(-8, 4);
        ctx.closePath();
        ctx.fill();

        // Tail Fin
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(-30, -14);
        ctx.lineTo(-26, 0);
        ctx.closePath();
        ctx.fill();

        // Propeller Line Spin Animation
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const propY = (Date.now() / 15) % 18 - 9;
        ctx.moveTo(29, propY);
        ctx.lineTo(29, -propY);
        ctx.stroke();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [status, currentMultiplier, crashedAt]);

  return (
    <div className="fixed inset-0 w-screen z-50 bg-[#0e0e0e] text-[#a0a0a0] font-sans flex flex-col select-none overflow-hidden" style={{ height: '100dvh' }}>
      {/* ================= 1. TOP BRAND HEADER ================= */}
      <header className="h-10 sm:h-12 bg-[#141414] border-b border-[#222222] px-2 sm:px-4 flex items-center justify-between shrink-0 z-20">
        {/* Left Logo */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <span className="text-lg sm:text-xl font-black text-red-600 font-mono italic tracking-wider group-hover:scale-105 transition-transform">
              Aviator
            </span>
          </Link>
          <span className="hidden lg:inline-block text-[10px] font-mono font-bold bg-[#222222] text-[#888888] px-2 py-0.5 rounded shrink-0">
            RIVEXA ENGINE
          </span>
        </div>

        {/* Center Toast Notice */}
        {message && (
          <div className="hidden md:flex items-center gap-2 bg-red-600 text-white font-bold text-xs px-4 py-1 rounded-full shadow-md animate-in fade-in">
            <span>{message}</span>
          </div>
        )}

        {/* Right Controls & Balance */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0 max-w-full overflow-hidden">
          <Link
            href="/deposit"
            className="bg-[#1c1c1c] border border-[#2a2a2a] hover:border-emerald-500/50 px-2.5 sm:px-3.5 py-1 rounded-full flex items-center gap-1.5 transition-all shrink-0"
          >
            <span className="text-[11px] sm:text-xs font-black text-emerald-400 font-mono whitespace-nowrap">
              {balance.toFixed(2)} INR
            </span>
          </Link>

          <div className="flex items-center gap-1 text-slate-400 text-xs sm:text-sm shrink-0">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.open('/play/crash', '_blank');
                }
              }}
              title="Open Aviator in New Tab"
              className="w-7 h-7 sm:w-auto px-2 sm:px-2.5 py-1 rounded-full bg-[#1c1c1c] hover:bg-[#282828] text-xs font-bold text-slate-300 flex items-center justify-center gap-1 transition-colors shrink-0"
            >
              <span className="text-red-500">↗</span>
              <span className="hidden sm:inline">New Tab</span>
            </button>
            <button
              type="button"
              onClick={fetchPeriodHistory}
              title="Provably Fair Seed Verification"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1c1c1c] hover:bg-[#282828] flex items-center justify-center text-amber-400 font-bold transition-colors shrink-0 text-xs sm:text-sm"
            >
              📜
            </button>
            <Link
              href="/"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1c1c1c] hover:bg-[#282828] flex items-center justify-center text-slate-300 font-bold transition-colors shrink-0 text-xs sm:text-sm"
            >
              ✕
            </Link>
          </div>
        </div>
      </header>

      {/* Toast Alert for Mobile */}
      {message && (
        <div className="md:hidden bg-red-600 text-white font-bold text-xs py-1.5 px-3 text-center shrink-0">
          {message}
        </div>
      )}

      {/* ================= 2. MAIN RESPONSIVE BODY ================= */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] p-1.5 sm:p-2 gap-1.5 sm:gap-2 overflow-hidden min-h-0">
        
        {/* LEFT SIDEBAR: LIVE BETS / PREVIOUS / TOP (DESKTOP) */}
        <aside className="hidden lg:flex flex-col bg-[#141414] border border-[#222222] rounded-xl overflow-hidden h-full">
          {/* Sidebar Header Tabs */}
          <div className="flex items-center bg-[#1c1c1c] border-b border-[#252525] p-1">
            <button
              type="button"
              onClick={() => setSidebarTab('all')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                sidebarTab === 'all' ? 'bg-[#2a2a2a] text-white shadow-xs' : 'text-[#888888] hover:text-slate-200'
              }`}
            >
              All Bets
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('previous')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                sidebarTab === 'previous' ? 'bg-[#2a2a2a] text-white shadow-xs' : 'text-[#888888] hover:text-slate-200'
              }`}
            >
              My Bets
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('top')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                sidebarTab === 'top' ? 'bg-[#2a2a2a] text-white shadow-xs' : 'text-[#888888] hover:text-slate-200'
              }`}
            >
              Top
            </button>
          </div>

          {/* Subheader Stats */}
          <div className="px-3 py-2 bg-[#181818] border-b border-[#222222] flex items-center justify-between text-[11px] font-mono font-bold">
            <span className="text-[#888888]">{roundBets.length || '85'} / 1750 Bets</span>
            <span className="text-emerald-400">3,554,493.61 Total win INR</span>
          </div>

          {/* Table Headers */}
          <div className="px-3 py-1.5 bg-[#141414] border-b border-[#222222] grid grid-cols-4 text-[10px] font-bold text-[#666666] uppercase tracking-wider">
            <span>Player</span>
            <span className="text-right">Bet INR</span>
            <span className="text-right">X</span>
            <span className="text-right">Win INR</span>
          </div>

          {/* Table Body List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1e1e1e] scrollbar-thin scrollbar-thumb-slate-800">
            {sidebarTab === 'previous' ? (
              myOrders.length === 0 ? (
                <div className="p-6 text-center text-xs font-semibold text-[#666666]">
                  No bets placed yet.
                </div>
              ) : (
                myOrders.map((order, i) => {
                  const isWon = order.status === 'WON' || order.status === 'CASHED_OUT';
                  return (
                    <div key={i} className="px-3 py-2 grid grid-cols-4 items-center text-xs font-mono">
                      <span className="text-[#aaaaaa] truncate">You</span>
                      <span className="text-right font-bold text-white">{Number(order.amount).toFixed(2)}</span>
                      <span className={`text-right font-bold ${isWon ? 'text-emerald-400' : 'text-red-500'}`}>
                        {Number(order.multiplier || 0).toFixed(2)}x
                      </span>
                      <span className={`text-right font-bold ${isWon ? 'text-emerald-400' : 'text-[#666666]'}`}>
                        {isWon ? Number(order.payout).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  );
                })
              )
            ) : roundBets.length === 0 ? (
              /* Reference Mock Live Bets matching screenshot */
              [
                { user: '8***4', bet: '8,000.00', mult: '-', win: '-' },
                { user: 'c***4', bet: '8,000.00', mult: '-', win: '-' },
                { user: 'm***2', bet: '8,000.00', mult: '1.95x', win: '15,600.00' },
                { user: 'z***0', bet: '8,000.00', mult: '2.17x', win: '17,360.00' },
                { user: 'g***8', bet: '8,000.00', mult: '7.08x', win: '56,640.00' },
                { user: 'j***7', bet: '7,500.00', mult: '1.27x', win: '9,525.00' },
                { user: '1***6', bet: '7,000.00', mult: '-', win: '-' },
                { user: 'a***6', bet: '7,000.00', mult: '-', win: '-' },
                { user: 'o***9', bet: '6,200.00', mult: '1.93x', win: '11,966.00' },
                { user: 'a***1', bet: '5,800.00', mult: '1.33x', win: '7,714.00' },
                { user: 's***9', bet: '5,600.00', mult: '4.89x', win: '27,384.00' },
              ].map((row, i) => (
                <div key={i} className="px-3 py-2 grid grid-cols-4 items-center text-xs font-mono hover:bg-[#1c1c1c] transition-colors">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-4 h-4 rounded-full bg-red-600/30 text-red-400 flex items-center justify-center text-[9px] font-bold shrink-0">
                      👤
                    </span>
                    <span className="text-[#aaaaaa] truncate">{row.user}</span>
                  </div>
                  <span className="text-right font-bold text-[#dddddd]">{row.bet}</span>
                  <span className={`text-right font-bold ${row.mult !== '-' ? 'text-emerald-400' : 'text-[#555555]'}`}>
                    {row.mult}
                  </span>
                  <span className={`text-right font-bold ${row.win !== '-' ? 'text-emerald-400' : 'text-[#555555]'}`}>
                    {row.win}
                  </span>
                </div>
              ))
            ) : (
              roundBets.map((b, i) => {
                const isCashed = b.status === 'CASHED_OUT' || b.status === 'WON';
                return (
                  <div key={i} className="px-3 py-2 grid grid-cols-4 items-center text-xs font-mono hover:bg-[#1c1c1c]">
                    <span className="text-[#aaaaaa] truncate">{b.username}</span>
                    <span className="text-right font-bold text-[#dddddd]">{Number(b.amount).toFixed(2)}</span>
                    <span className={`text-right font-bold ${isCashed ? 'text-emerald-400' : 'text-[#555555]'}`}>
                      {isCashed ? `${Number(b.multiplier).toFixed(2)}x` : '-'}
                    </span>
                    <span className={`text-right font-bold ${isCashed ? 'text-emerald-400' : 'text-[#555555]'}`}>
                      {isCashed ? Number(b.payout).toFixed(2) : '-'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Provably Fair */}
          <div className="p-2 bg-[#101010] border-t border-[#222222] text-[10px] font-mono text-[#555555] text-center">
            🔒 Provably Fair Game • Powered by SPRIBE
          </div>
        </aside>

        {/* RIGHT COLUMN: MAIN CANVAS ARENA + DUAL BET PANELS */}
        <main className="flex flex-col gap-1.5 sm:gap-2 min-h-0 overflow-hidden">
          
          {/* TOP MULTIPLIER HISTORY STRIP */}
          <div className="bg-[#141414] border border-[#222222] rounded-xl px-2 py-1 sm:py-1.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none pr-2" style={{ WebkitOverflowScrolling: 'touch' }}>
              {historyPills.map((m, idx) => {
                const isPurple = m >= 10.0;
                const isBlue = m < 2.0;

                return (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold shrink-0 transition-transform ${
                      isPurple
                        ? 'bg-[#c01cff]/20 text-[#c01cff] border border-[#c01cff]/40'
                        : isBlue
                        ? 'bg-[#34b4ff]/15 text-[#34b4ff] border border-[#34b4ff]/30'
                        : 'bg-[#913bfd]/20 text-[#913bfd] border border-[#913bfd]/40'
                    }`}
                  >
                    {m.toFixed(2)}x
                  </span>
                );
              })}
            </div>

            <button
              type="button"
              onClick={fetchPeriodHistory}
              className="text-[#666666] hover:text-amber-400 text-xs font-mono font-bold px-2 py-1 rounded bg-[#1c1c1c] shrink-0"
              title="Provably Fair History"
            >
              📜
            </button>
          </div>

          {/* MAIN FLIGHT CANVAS ARENA */}
          <div className="flex-1 min-h-0 bg-[#0e0e0e] border border-[#222222] rounded-xl relative overflow-hidden flex flex-col justify-between p-2 sm:p-4">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            {/* Top Period Badge */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#555555]">
                SPIBE AVIATOR ENGINE
              </span>
              <span className="bg-[#181818] border border-[#2a2a2a] text-amber-400 font-mono font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                Period #{roundId}
              </span>
            </div>

            {/* Huge Multiplier Readout Display */}
            <div className="relative z-10 text-center space-y-1 sm:space-y-2 my-auto">
              <div
                className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-mono tracking-tight transition-colors ${
                  status === 'CRASHED' ? 'text-red-600' : 'text-white drop-shadow-[0_4px_30px_rgba(255,255,255,0.4)]'
                }`}
              >
                {status === 'CRASHED' ? `${crashedAt.toFixed(2)}x` : `${currentMultiplier.toFixed(2)}x`}
              </div>

              {status === 'CRASHED' && (
                <div className="text-red-500 font-mono font-black text-sm uppercase tracking-widest animate-pulse">
                  FLEW AWAY!
                </div>
              )}

              {status === 'BETTING_OPEN' && (
                <div className="text-emerald-400 font-mono font-bold text-xs uppercase tracking-widest">
                  WAITING FOR LAUNCH ({secondsRemaining}s)
                </div>
              )}
            </div>

            {/* Bottom Live Profit Ticker */}
            {status === 'FLYING' && (userBetStatus1 === 'PENDING' || userBetStatus2 === 'PENDING') && (
              <div className="relative z-10 bg-[#181818]/90 border border-emerald-500/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold">BET IN FLIGHT...</span>
                <span className="text-emerald-400 font-black text-sm animate-pulse">
                  {currentMultiplier.toFixed(2)}x
                </span>
              </div>
            )}
          </div>

          {/* DUAL BET CONTROL PANELS (SIDE-BY-SIDE ON DESKTOP) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-2 shrink-0">
            
            {/* ================= BET PANEL 1 ================= */}
            <div className="bg-[#141414] border border-[#222222] rounded-xl p-2 sm:p-3 flex flex-col justify-between gap-2 sm:gap-3">
              {/* Top Header Tabs */}
              <div className="flex items-center justify-between">
                <div className="bg-[#1c1c1c] p-0.5 rounded-lg flex text-xs font-mono font-bold">
                  <button
                    type="button"
                    onClick={() => setBetTab1('bet')}
                    className={`px-4 py-1 rounded-md transition-all ${
                      betTab1 === 'bet' ? 'bg-[#2a2a2a] text-white shadow-xs' : 'text-[#666666]'
                    }`}
                  >
                    Bet
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetTab1('auto')}
                    className={`px-4 py-1 rounded-md transition-all ${
                      betTab1 === 'auto' ? 'bg-[#2a2a2a] text-white shadow-xs' : 'text-[#666666]'
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
                    <span className="text-[10px] font-bold text-red-500 uppercase">Auto Bet</span>
                  </label>
                )}
              </div>

              {/* Input Stepper + Action Button — side by side on all screen sizes */}
              <div className="flex items-center gap-2">
                {/* Left Stepper & Preset Chips */}
                <div className="flex-1 space-y-1">
                  <div className="bg-[#0e0e0e] border border-[#262626] rounded-full flex items-center justify-between px-2 sm:px-3 py-1 text-white font-mono font-black text-sm">
                    <button
                      type="button"
                      onClick={() => setBetAmount1((prev) => Math.max(1, prev - 10))}
                      className="w-6 h-6 rounded-full bg-[#1e1e1e] hover:bg-[#282828] flex items-center justify-center text-slate-300 font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={betAmount1 || ''}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setBetAmount1(isNaN(v) ? 0 : Math.max(0, v));
                      }}
                      className="w-16 sm:w-20 bg-transparent text-white font-mono font-bold text-sm text-center focus:outline-none focus:bg-[#1a1a1a] rounded py-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => setBetAmount1((prev) => prev + 10)}
                      className="w-6 h-6 rounded-full bg-[#1e1e1e] hover:bg-[#282828] flex items-center justify-center text-slate-300 font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Preset Chips */}
                  <div className="grid grid-cols-4 gap-1">
                    {[100, 200, 500, 1000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setBetAmount1(val)}
                        className="bg-[#1c1c1c] hover:bg-[#282828] text-slate-300 font-mono font-bold text-[10px] py-1 rounded-md transition-colors"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Green Bet / Cash Out Button */}
                <div className="w-20 sm:w-24 flex-shrink-0">
                  {status === 'BETTING_OPEN' && userBetStatus1 === 'NONE' && (
                    <button
                      type="button"
                      onClick={() => handlePlaceBet(1)}
                      disabled={loadingBet}
                      className="w-full py-2.5 sm:py-3.5 px-1 sm:px-2 bg-[#28a745] hover:bg-[#218838] active:bg-[#1e7e34] text-white font-black rounded-xl shadow-lg shadow-green-900/30 active:scale-[0.99] transition-all flex flex-col items-center justify-center leading-tight cursor-pointer disabled:opacity-50"
                    >
                      <span className="text-sm sm:text-base">Bet</span>
                      <span className="text-[10px] sm:text-xs font-mono font-bold">{betAmount1.toFixed(0)} INR</span>
                    </button>
                  )}

                  {status === 'BETTING_OPEN' && userBetStatus1 === 'PENDING' && (
                    <div className="w-full py-2.5 sm:py-3.5 px-1 bg-emerald-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-xl text-center">
                      WAIT
                    </div>
                  )}

                  {status === 'FLYING' && userBetStatus1 === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => handleCashout(1)}
                      disabled={loadingBet}
                      className="w-full py-2.5 sm:py-3.5 px-1 sm:px-2 bg-[#ff9900] hover:bg-[#e68a00] active:bg-[#cc7a00] text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/30 active:scale-[0.99] transition-all flex flex-col items-center justify-center leading-tight animate-pulse cursor-pointer disabled:opacity-50"
                    >
                      <span className="text-[10px] sm:text-xs uppercase font-extrabold">Cash Out</span>
                      <span className="text-xs sm:text-sm font-mono font-black">
                        {(betAmount1 * currentMultiplier).toFixed(2)}
                      </span>
                    </button>
                  )}

                  {status === 'FLYING' && userBetStatus1 !== 'PENDING' && (
                    <div className="w-full py-2.5 sm:py-3.5 px-1 bg-[#1c1c1c] text-[#555555] font-extrabold text-[10px] sm:text-xs uppercase rounded-xl text-center cursor-not-allowed">
                      IN FLIGHT
                    </div>
                  )}

                  {status === 'CRASHED' && (
                    <div className="w-full py-2.5 sm:py-3.5 px-1 bg-[#1c1c1c] text-[#555555] font-extrabold text-[10px] sm:text-xs uppercase rounded-xl text-center">
                      CRASHED
                    </div>
                  )}
                </div>
              </div>

              {/* Auto Cashout Field in Auto Tab */}
              {betTab1 === 'auto' && (
                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  <span className="text-[#888888]">Auto Cashout:</span>
                  <input
                    type="number"
                    step="0.10"
                    placeholder="e.g. 2.00"
                    value={autoCashout1}
                    onChange={(e) => setAutoCashout1(e.target.value)}
                    className="w-24 bg-[#0e0e0e] border border-[#262626] rounded-md px-2 py-0.5 text-xs text-right text-white font-bold"
                  />
                </div>
              )}
            </div>

            {/* ================= BET PANEL 2 ================= */}
            <div className="bg-[#141414] border border-[#222222] rounded-xl p-2 sm:p-3 flex flex-col justify-between gap-2 sm:gap-3">
              {/* Header Tabs */}
              <div className="flex items-center justify-between">
                <div className="bg-[#1c1c1c] p-0.5 rounded-lg flex text-xs font-mono font-bold">
                  <button
                    type="button"
                    onClick={() => setBetTab2('bet')}
                    className={`px-4 py-1 rounded-md transition-all ${
                      betTab2 === 'bet' ? 'bg-[#2a2a2a] text-white shadow-xs' : 'text-[#666666]'
                    }`}
                  >
                    Bet
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetTab2('auto')}
                    className={`px-4 py-1 rounded-md transition-all ${
                      betTab2 === 'auto' ? 'bg-[#2a2a2a] text-white shadow-xs' : 'text-[#666666]'
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
                    <span className="text-[10px] font-bold text-red-500 uppercase">Auto Bet</span>
                  </label>
                )}
              </div>

              {/* Stepper + Action Button — side by side on all screens */}
              <div className="flex items-center gap-2">
                {/* Left Stepper & Preset Chips */}
                <div className="flex-1 space-y-1">
                  <div className="bg-[#0e0e0e] border border-[#262626] rounded-full flex items-center justify-between px-2 sm:px-3 py-1 text-white font-mono font-black text-sm">
                    <button
                      type="button"
                      onClick={() => setBetAmount2((prev) => Math.max(1, prev - 10))}
                      className="w-6 h-6 rounded-full bg-[#1e1e1e] hover:bg-[#282828] flex items-center justify-center text-slate-300 font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={betAmount2 || ''}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setBetAmount2(isNaN(v) ? 0 : Math.max(0, v));
                      }}
                      className="w-20 bg-transparent text-white font-mono font-bold text-sm text-center focus:outline-none focus:bg-[#1a1a1a] rounded py-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => setBetAmount2((prev) => prev + 10)}
                      className="w-6 h-6 rounded-full bg-[#1e1e1e] hover:bg-[#282828] flex items-center justify-center text-slate-300 font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Preset Chips */}
                  <div className="grid grid-cols-4 gap-1">
                    {[100, 200, 500, 1000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setBetAmount2(val)}
                        className="bg-[#1c1c1c] hover:bg-[#282828] text-slate-300 font-mono font-bold text-[10px] py-1 rounded-md transition-colors"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Bet / Cash Out Button */}
                <div className="w-20 sm:w-24 flex-shrink-0">
                  {status === 'BETTING_OPEN' && userBetStatus2 === 'NONE' && (
                    <button
                      type="button"
                      onClick={() => handlePlaceBet(2)}
                      disabled={loadingBet}
                      className="w-full py-2.5 sm:py-3.5 px-1 sm:px-2 bg-[#28a745] hover:bg-[#218838] active:bg-[#1e7e34] text-white font-black rounded-xl shadow-lg shadow-green-900/30 active:scale-[0.99] transition-all flex flex-col items-center justify-center leading-tight cursor-pointer disabled:opacity-50"
                    >
                      <span className="text-sm sm:text-base">Bet</span>
                      <span className="text-[10px] sm:text-xs font-mono font-bold">{betAmount2.toFixed(0)} INR</span>
                    </button>
                  )}

                  {status === 'BETTING_OPEN' && userBetStatus2 === 'PENDING' && (
                    <div className="w-full py-2.5 sm:py-3.5 px-1 bg-emerald-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-xl text-center">
                      WAIT
                    </div>
                  )}

                  {status === 'FLYING' && userBetStatus2 === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => handleCashout(2)}
                      disabled={loadingBet}
                      className="w-full py-2.5 sm:py-3.5 px-1 sm:px-2 bg-[#ff9900] hover:bg-[#e68a00] active:bg-[#cc7a00] text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/30 active:scale-[0.99] transition-all flex flex-col items-center justify-center leading-tight animate-pulse cursor-pointer disabled:opacity-50"
                    >
                      <span className="text-[10px] sm:text-xs uppercase font-extrabold">Cash Out</span>
                      <span className="text-xs sm:text-sm font-mono font-black">
                        {(betAmount2 * currentMultiplier).toFixed(2)}
                      </span>
                    </button>
                  )}

                  {status === 'FLYING' && userBetStatus2 !== 'PENDING' && (
                    <div className="w-full py-2.5 sm:py-3.5 px-1 bg-[#1c1c1c] text-[#555555] font-extrabold text-[10px] sm:text-xs uppercase rounded-xl text-center cursor-not-allowed">
                      IN FLIGHT
                    </div>
                  )}

                  {status === 'CRASHED' && (
                    <div className="w-full py-2.5 sm:py-3.5 px-1 bg-[#1c1c1c] text-[#555555] font-extrabold text-[10px] sm:text-xs uppercase rounded-xl text-center">
                      CRASHED
                    </div>
                  )}
                </div>
              </div>

              {/* Auto Cashout Field in Auto Tab */}
              {betTab2 === 'auto' && (
                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  <span className="text-[#888888]">Auto Cashout:</span>
                  <input
                    type="number"
                    step="0.10"
                    placeholder="e.g. 2.00"
                    value={autoCashout2}
                    onChange={(e) => setAutoCashout2(e.target.value)}
                    className="w-24 bg-[#0e0e0e] border border-[#262626] rounded-md px-2 py-0.5 text-xs text-right text-white font-bold"
                  />
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* PROVABLY FAIR SEED & PERIOD HISTORY MODAL */}
      {isSeedModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#252525] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <span className="text-lg">📜</span>
                <div>
                  <h3 className="text-base font-black leading-none text-white">Period History</h3>
                  <p className="text-[10px] font-bold text-[#888888] mt-0.5">Provably Fair SHA-256 Seeds</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSeedModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#222222] hover:bg-[#333333] text-slate-300 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {periodHistory.length === 0 ? (
                <p className="text-center py-6 text-[#666666] text-xs font-bold">
                  Loading period seed history...
                </p>
              ) : (
                periodHistory.map((period, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#1c1c1c] border border-[#262626] space-y-1 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-slate-200">Period #{period.periodNumber}</span>
                      <span className="font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        {period.crashMultiplier}x
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-[#777777] break-all bg-[#0e0e0e] p-2 rounded-lg border border-[#222222]">
                      <span className="text-[#aaaaaa] font-bold block mb-0.5">Seed Hash (SHA-256):</span>
                      {period.seedHash}
                    </div>
                  </div>
                ))
              )}
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
    </div>
  );
}
