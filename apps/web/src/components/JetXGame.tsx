'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl, getWsBaseUrl } from '@/lib/config';
import { io, Socket } from 'socket.io-client';

import { SpribeAudioEngine } from '@/utils/spribeAudio';
import ValidationErrorModal, { ValidationErrorType } from './ValidationErrorModal';

export function JetXGame() {
  const { user: authUser, refreshBalance, balance: contextBalance } = useAuth();

  // Game engine state
  const [status, setStatus] = useState<'BETTING_OPEN' | 'FLYING' | 'CRASHED'>('BETTING_OPEN');
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.00);
  const [crashedAt, setCrashedAt] = useState<number>(1.00);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(5);
  const [roundId, setRoundId] = useState<string>('9E56A9DF');
  const [historyPills, setHistoryPills] = useState<number[]>([5.12, 1.88, 3.45, 12.10, 1.25, 2.80, 8.44, 1.05]);

  // Wallet & User
  const [balance, setBalance] = useState<number>(contextBalance || 0.00);
  const [user, setUser] = useState<{ id: string; name?: string; email: string } | null>(authUser);

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

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
    }
  }, [authUser]);

  // Active bets for Dual Control Panels
  const [betAmount1, setBetAmount1] = useState<number>(10);
  const [activeBetId1, setActiveBetId1] = useState<string | null>(null);
  const [userBetStatus1, setUserBetStatus1] = useState<'NONE' | 'PENDING' | 'CASHED_OUT' | 'LOST'>('NONE');

  const [betAmount2, setBetAmount2] = useState<number>(10);
  const [activeBetId2, setActiveBetId2] = useState<string | null>(null);
  const [userBetStatus2, setUserBetStatus2] = useState<'NONE' | 'PENDING' | 'CASHED_OUT' | 'LOST'>('NONE');

  // Auto Bet / Cashout
  const [autoBet1, setAutoBet1] = useState<boolean>(false);
  const [autoCashout1, setAutoCashout1] = useState<string>('');
  const [autoBet2, setAutoBet2] = useState<boolean>(false);
  const [autoCashout2, setAutoCashout2] = useState<string>('');

  const autoBetPlaced1 = useRef<boolean>(false);
  const autoBetPlaced2 = useRef<boolean>(false);

  // Live sidebar & orders tab
  const [sidebarTab, setSidebarTab] = useState<'all' | 'my' | 'top'>('all');
  const [roundBets, setRoundBets] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);

  // Seed / Provably Fair Modal & Full History Modal
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

  // UI Toast & Sound Toggle
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  const [loadingBet, setLoadingBet] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved =
        localStorage.getItem('rivexa_sound_enabled') ??
        localStorage.getItem('jetx_sound_enabled') ??
        localStorage.getItem('game_sound_enabled');
      if (saved !== null) {
        setSoundEnabled(saved === 'true');
      }
    } catch (e) {}
  }, []);

  const [activeMobileBetTab, setActiveMobileBetTab] = useState<1 | 2>(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const processedJetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processedFallCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animatedMultiplierRef = useRef<number>(1.0);

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
      localStorage.setItem('rivexa_sound_enabled', String(soundEnabled));
      localStorage.setItem('jetx_sound_enabled', String(soundEnabled));
      localStorage.setItem('game_sound_enabled', String(soundEnabled));
    } catch (e) {}
    if (audioEngineRef.current) {
      audioEngineRef.current.toggleMute(!soundEnabled);
    }
  }, [soundEnabled, mounted]);

  // Preload & Offscreen Keying for 100% Background Transparency (No Square Boxes)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const processImage = (src: string, targetRef: React.MutableRefObject<HTMLCanvasElement | null>) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        img.onload = () => {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = img.width;
          offCanvas.height = img.height;
          const offCtx = offCanvas.getContext('2d');
          if (!offCtx) return;

          offCtx.drawImage(img, 0, 0);
          const imgData = offCtx.getImageData(0, 0, img.width, img.height);
          const data = imgData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Filter out white, light gray, sky blue, or checkerboard pixels completely
            if (r > 150 && g > 150 && b > 150 && Math.abs(r - g) < 35 && Math.abs(g - b) < 35) {
              data[i + 3] = 0; // 100% transparent
            } else if (b > 140 && r > 110 && g > 130 && Math.abs(r - g) < 40) {
              data[i + 3] = 0;
            }
          }

          offCtx.putImageData(imgData, 0, 0);
          targetRef.current = offCanvas;
        };
      };

      processImage('/images/real_girl_aviator_jet.png', processedJetCanvasRef);
      processImage('/images/real_girl_eject_fall_nobg.png', processedFallCanvasRef);
    }
  }, []);

  // Refresh user details
  const refreshUser = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
    if (!token) return;

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const u = await res.json();
        setUser(u);
        if (u.wallet?.mainBalance) {
          setBalance(parseFloat(u.wallet.mainBalance));
        }
      }
    } catch (err) {}
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Process incoming Jet game state (from REST or Socket.IO)
  const processGameStateData = useCallback((data: any) => {
    if (!data) return;

    if (data.round) {
      const newStatus = data.round.status as any;

      // Sound state updates
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

  // Fallback REST fetch JetX game state (/api/v1/games/jet/state)
  const fetchGameState = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

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
      const res = await fetch(`${apiBase}/games/jet/state${userIdParam}`, { headers });

      if (res.ok) {
        const data = await res.json();
        processGameStateDataRef.current(data);
      }
    } catch (err) {}
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
      socket.emit('subscribe:jet', { userId: effectiveUserId });
    });

    socket.on('jet:state', (data: any) => {
      processGameStateDataRef.current(data);
    });

    // Initial REST fetch to populate immediately while socket connects
    fetchGameState();

    return () => {
      if (socket.connected) {
        socket.disconnect();
      } else {
        socket.once('connect', () => {
          socket.disconnect();
        });
      }
    };
  }, [user?.id, fetchGameState]);

  // Fetch Jet bet history orders
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
      const res = await fetch(`${apiBase}/games/jet/history?userId=${effectiveUserId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setMyOrders(data);
      }
    } catch (err) {}
  }, [user?.id]);

  // Fetch Jet Provably Fair Period History
  const fetchPeriodHistory = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/jet/period-history`);
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
      const res = await fetch(`${apiBase}/games/jet/history?userId=${effectiveUserId}&limit=100`);
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
    let effectiveUserId = authUser?.id;
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
        message: 'Please log in to place bets on JetX.',
      });
      return;
    }

    const amt = panelNum === 1 ? betAmount1 : betAmount2;
    if (isNaN(amt) || amt < 10) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Minimum bet amount for JetX is ₹10.',
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
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/jet/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      setMessage(`🚀 Jet Bet ${panelNum} placed! Prepare for high-altitude launch.`);
      fetchMyOrders();
      refreshUser();
    } catch (err: any) {
      setValidationModal({
        isOpen: true,
        type: 'GAME_ERROR',
        message: err.message || 'Error placing bet.',
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
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/jet/cashout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ betId }),
      });

      const data = await res.json();
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
      setMessage(err.message || 'Cashout error.');
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

  // 60FPS CINEMATIC REAL-VIDEO CANVAS ANIMATION ENGINE WITH GIRL TAKEOFF JUMP & NO-PARACHUTE CRASH FALL
  // 60FPS GPU-ACCELERATED VECTOR JET ENGINE & CRASH PARTICLE SYSTEM
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let cloudSlowOffset = 0;
    let cloudMidOffset = 0;
    let cloudFastOffset = 0;

    // Crash Particles State
    let crashParticles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
      rotation: number;
      vRot: number;
      type: 'spark' | 'smoke' | 'shard';
    }> = [];
    let crashTime = 0;
    let crashCoords = { x: 0, y: 0 };
    let hasSpawnedCrash = false;

    // Render Supersonic Jet Aircraft (Vector Graphic, Zero Image Artifacts)
    const drawJetAircraft = (
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      angle: number,
      scale: number,
      timeSec: number
    ) => {
      c.save();
      c.translate(x, y);
      c.rotate(angle);
      c.scale(scale, scale);

      // Jet Thruster Engine Glow Aura
      const engineGlow = c.createRadialGradient(-50, 0, 2, -50, 0, 35);
      engineGlow.addColorStop(0, '#ffffaa');
      engineGlow.addColorStop(0.3, '#ff3b00');
      engineGlow.addColorStop(0.7, 'rgba(255, 0, 85, 0.4)');
      engineGlow.addColorStop(1, 'transparent');
      c.fillStyle = engineGlow;
      c.beginPath();
      c.arc(-50, 0, 35, 0, Math.PI * 2);
      c.fill();

      // Pulsing Engine Afterburner Fire Cone
      const flameLen = 40 + Math.sin(timeSec * 40) * 8;
      const flameGrad = c.createLinearGradient(-45, 0, -45 - flameLen, 0);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.2, '#ffea00');
      flameGrad.addColorStop(0.6, '#ff3b00');
      flameGrad.addColorStop(1, 'transparent');
      c.fillStyle = flameGrad;
      c.beginPath();
      c.moveTo(-45, -7);
      c.lineTo(-45 - flameLen, 0);
      c.lineTo(-45, 7);
      c.closePath();
      c.fill();

      // Sleek Main Fuselage Body (Neon Crimson Metallic)
      const bodyGrad = c.createLinearGradient(60, 0, -50, 0);
      bodyGrad.addColorStop(0, '#ff3d5e');
      bodyGrad.addColorStop(0.4, '#ff1a43');
      bodyGrad.addColorStop(0.8, '#a80521');
      bodyGrad.addColorStop(1, '#47020e');

      c.shadowColor = 'rgba(255, 26, 67, 0.5)';
      c.shadowBlur = 18;

      c.fillStyle = bodyGrad;
      c.beginPath();
      c.moveTo(65, 0); // Nose tip
      c.bezierCurveTo(35, -14, -20, -14, -50, -6);
      c.lineTo(-50, 6);
      c.bezierCurveTo(-20, 14, 35, 14, 65, 0);
      c.closePath();
      c.fill();

      // Delta Wings (Top Wing)
      const wingGrad = c.createLinearGradient(15, 0, -35, -45);
      wingGrad.addColorStop(0, '#ff2e51');
      wingGrad.addColorStop(1, '#5e0314');
      c.fillStyle = wingGrad;
      c.beginPath();
      c.moveTo(18, -4);
      c.lineTo(-25, -42);
      c.lineTo(-40, -42);
      c.lineTo(-30, -4);
      c.closePath();
      c.fill();

      // Delta Wings (Bottom Wing)
      c.beginPath();
      c.moveTo(18, 4);
      c.lineTo(-25, 42);
      c.lineTo(-40, 42);
      c.lineTo(-30, 4);
      c.closePath();
      c.fill();

      // Wingtip Glowing LED Lights
      c.fillStyle = '#00f0ff';
      c.shadowColor = '#00f0ff';
      c.shadowBlur = 10;
      c.beginPath();
      c.arc(-35, -42, 3, 0, Math.PI * 2);
      c.arc(-35, 42, 3, 0, Math.PI * 2);
      c.fill();

      // Vertical Tail Twin Stabilizers
      c.shadowColor = 'transparent';
      c.fillStyle = '#ff1a43';
      c.beginPath();
      c.moveTo(-25, -5);
      c.lineTo(-48, -25);
      c.lineTo(-55, -25);
      c.lineTo(-45, -5);
      c.closePath();
      c.fill();

      // Cockpit Glass Canopy (Cyan Tint with Reflection Sweep)
      const canopyGrad = c.createLinearGradient(35, -8, 5, 2);
      canopyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      canopyGrad.addColorStop(0.3, '#3ce7ff');
      canopyGrad.addColorStop(1, 'rgba(10, 50, 80, 0.9)');
      c.fillStyle = canopyGrad;
      c.beginPath();
      c.moveTo(35, -2);
      c.bezierCurveTo(20, -12, 0, -12, -10, -2);
      c.closePath();
      c.fill();

      // Pilot Aviator Helmet & Flowing Wind Scarf
      c.fillStyle = '#1e0818';
      c.beginPath();
      c.arc(8, -5, 4.5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffb700'; // Gold Helmet Visor
      c.beginPath();
      c.arc(9.5, -5.5, 2, 0, Math.PI * 2);
      c.fill();

      // Animated Scarf Wind Ribbon Trail
      c.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(5, -3);
      c.bezierCurveTo(
        -15,
        -12 + Math.sin(timeSec * 25) * 5,
        -35,
        -2 + Math.cos(timeSec * 20) * 6,
        -55,
        -10 + Math.sin(timeSec * 30) * 4
      );
      c.stroke();

      c.restore();
    };

    const render = () => {
      const width = (canvas.width = canvas.parentElement?.clientWidth || 800);
      const height = (canvas.height = canvas.parentElement?.clientHeight || 450);
      const timeSec = Date.now() / 1000;

      ctx.clearRect(0, 0, width, height);

      // Reset Crash Spawn state when entering NEW round
      if (status === 'BETTING_OPEN') {
        hasSpawnedCrash = false;
        crashTime = 0;
        crashParticles = [];
      }

      // 1. Atmospheric Deep Sunset Sky Linear Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#120211');
      skyGrad.addColorStop(0.35, '#2e071c');
      skyGrad.addColorStop(0.7, '#4a0c20');
      skyGrad.addColorStop(1, '#090208');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Parallax Atmospheric Clouds
      if (status === 'FLYING') {
        cloudSlowOffset = (cloudSlowOffset + 0.6) % height;
        cloudMidOffset = (cloudMidOffset + 1.8) % height;
        cloudFastOffset = (cloudFastOffset + 3.5) % height;
      }

      ctx.save();
      ctx.fillStyle = 'rgba(255, 200, 220, 0.04)';
      for (let i = -1; i < 3; i++) {
        const py = i * (height / 2) + cloudSlowOffset;
        ctx.beginPath();
        ctx.arc(width * 0.1, py, 130, 0, Math.PI * 2);
        ctx.arc(width * 0.5, py + 40, 160, 0, Math.PI * 2);
        ctx.arc(width * 0.85, py - 30, 150, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(255, 180, 200, 0.06)';
      for (let i = -1; i < 3; i++) {
        const py = i * (height / 2) + cloudMidOffset;
        ctx.beginPath();
        ctx.arc(width * 0.25, py + 20, 100, 0, Math.PI * 2);
        ctx.arc(width * 0.65, py - 10, 120, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Atmospheric Grid Lines with Continuous Flight Scroll
      const isMobileScreen = width < 640;
      const gridScrollX = status === 'FLYING' ? (timeSec * 45) % 60 : 0;
      const gridScrollY = status === 'FLYING' ? (timeSec * 25) % 60 : 0;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = -gridScrollX; x < width + 60; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = gridScrollY; y < height + 60; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3. Dynamic Multi-Sample Trajectory Wave & Altitude System (Upper/Down Circuit Wave Motion)
      let targetProgressMult = 1.0;
      if (status === 'FLYING') {
        targetProgressMult = currentMultiplier;
      } else if (status === 'CRASHED') {
        targetProgressMult = crashedAt;
      } else {
        targetProgressMult = 1.0;
      }

      // Smooth 60FPS Lerp Multiplier Interpolation
      animatedMultiplierRef.current += (targetProgressMult - animatedMultiplierRef.current) * 0.08;

      // Safe Framed Viewport Target Bounds - Plane never flies off screen edge on long rounds
      const originX = width * 0.08;
      const originY = height * 0.82;
      const targetX = width * (isMobileScreen ? 0.62 : 0.65);
      const targetY = height * (isMobileScreen ? 0.38 : 0.35);

      // Logarithmic continuous flight scaling (1.00x to 500.0x+)
      const currentMult = Math.max(1.0, animatedMultiplierRef.current);
      const logVal = Math.min(1.0, Math.log(currentMult) / Math.log(60.0));
      const easeProgress = Math.pow(logVal, 0.78);

      // Multi-sample trajectory curve with dynamic upper circuit & down circuit wave harmonics
      const numSamples = 50;
      const curvePoints: Array<{ x: number; y: number }> = [];

      for (let i = 0; i <= numSamples; i++) {
        const u = i / numSamples;
        const bx = originX + (targetX - originX) * easeProgress * u;
        const by = originY - (originY - targetY) * easeProgress * Math.pow(u, 0.85);

        curvePoints.push({
          x: bx,
          y: by,
        });
      }

      // Plane position is at the end of the dynamic trajectory curve
      const tipPoint = curvePoints[curvePoints.length - 1];
      const planeX = tipPoint.x;
      const planeY = tipPoint.y;

      // Tangent flight angle calculation from curve tip
      const prevTipPoint = curvePoints[Math.max(0, curvePoints.length - 3)];
      const flightAngle = Math.atan2(planeY - prevTipPoint.y, planeX - prevTipPoint.x);

      // Render Dynamic Wave Trajectory Path Line & Glowing Ribbon (During FLYING & CRASHED)
      if (status === 'FLYING' || status === 'CRASHED') {
        ctx.save();
        ctx.shadowColor = '#ff2a5f';
        ctx.shadowBlur = 20;

        const pathGrad = ctx.createLinearGradient(originX, originY, planeX, planeY);
        pathGrad.addColorStop(0, '#ff1a43');
        pathGrad.addColorStop(0.7, '#ff6b00');
        pathGrad.addColorStop(1, '#ffe600');

        ctx.strokeStyle = pathGrad;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(curvePoints[0].x, curvePoints[0].y);

        for (let i = 1; i < curvePoints.length; i++) {
          ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
        }
        ctx.stroke();

        // Shaded Gradient Fill Area Under Dynamic Path
        ctx.lineTo(planeX, originY);
        ctx.lineTo(originX, originY);
        ctx.closePath();
        const fillGrad = ctx.createLinearGradient(0, targetY, 0, originY);
        fillGrad.addColorStop(0, 'rgba(255, 26, 64, 0.28)');
        fillGrad.addColorStop(1, 'rgba(255, 26, 64, 0.02)');
        ctx.fillStyle = fillGrad;
        ctx.fill();
        ctx.restore();
      }

      // 4. FLYING STATE: Render Flying Supersonic Jet with Engine Jitter & Exhaust
      if (status === 'FLYING') {
        // Multi-stage Engine Exhaust Smoke Plumes
        for (let p = 0; p < 12; p++) {
          const pOffset = (timeSec * 50 + p * 7) % 70;
          const px = planeX - pOffset * Math.cos(flightAngle) * 1.2;
          const py = planeY - pOffset * Math.sin(flightAngle) * 1.2;
          const pAlpha = 1 - pOffset / 70;

          ctx.fillStyle = `rgba(255, 40, 80, ${pAlpha * 0.35})`;
          ctx.beginPath();
          ctx.arc(px, py, 3 + pOffset * 0.15, 0, Math.PI * 2);
          ctx.fill();
        }

        // Engine Pitch Sway & Subtle 3D Scale
        const pitchSway = Math.sin(timeSec * 4) * 0.03;
        const jetScale = 1.0 + easeProgress * 0.25;

        drawJetAircraft(ctx, planeX, planeY, flightAngle + pitchSway, jetScale, timeSec);
      } else if (status === 'BETTING_OPEN') {
        // IDLE STATE: Jet Resting at Launch Pad with Hover Idle
        const idleHoverY = Math.sin(timeSec * 3) * 4;
        drawJetAircraft(ctx, originX, originY + idleHoverY, -0.2, 0.95, timeSec);
      } else if (status === 'CRASHED') {
        // 5. CRASH STATE: Impact Shake + Vector Particles & Metallic Shards
        if (!hasSpawnedCrash) {
          hasSpawnedCrash = true;
          crashTime = 0;
          crashCoords = { x: planeX, y: planeY };

          // Spawn 40+ Pure Vector Particles (Zero Image Slice Bugs)
          crashParticles = [];

          // A. Sparks & Glowing Embers (30 particles)
          for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 2;
            crashParticles.push({
              x: planeX,
              y: planeY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: Math.random() * 4 + 2,
              color: i % 2 === 0 ? '#ffea00' : i % 3 === 0 ? '#ff3b00' : '#ffffff',
              alpha: 1.0,
              decay: Math.random() * 0.03 + 0.015,
              rotation: 0,
              vRot: 0,
              type: 'spark',
            });
          }

          // B. Metallic Jet Hull Shards (10 geometric pieces)
          for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 1.5;
            crashParticles.push({
              x: planeX,
              y: planeY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: Math.random() * 12 + 6,
              color: i % 2 === 0 ? '#ff1a43' : '#3d1235',
              alpha: 1.0,
              decay: Math.random() * 0.02 + 0.01,
              rotation: Math.random() * Math.PI,
              vRot: (Math.random() - 0.5) * 0.3,
              type: 'shard',
            });
          }

          // C. Expanding Smoke Plumes (8 particles)
          for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 0.5;
            crashParticles.push({
              x: planeX,
              y: planeY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: Math.random() * 18 + 12,
              color: 'rgba(255, 50, 80, 0.4)',
              alpha: 0.8,
              decay: Math.random() * 0.02 + 0.015,
              rotation: 0,
              vRot: 0,
              type: 'smoke',
            });
          }
        }

        crashTime += 0.016;

        // Camera Shake Jitter during initial 200ms impact
        const shakeX = crashTime < 0.2 ? (Math.random() - 0.5) * 7 : 0;
        const shakeY = crashTime < 0.2 ? (Math.random() - 0.5) * 7 : 0;

        ctx.save();
        ctx.translate(crashCoords.x + shakeX, crashCoords.y + shakeY);

        // Explosive Fireball Flash (Fades over 800ms)
        const flashAlpha = Math.max(0, 1 - crashTime * 1.3);
        if (flashAlpha > 0) {
          ctx.fillStyle = `rgba(255, 70, 0, ${flashAlpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(0, 0, 50 + crashTime * 90, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255, 230, 0, ${flashAlpha * 0.8})`;
          ctx.beginPath();
          ctx.arc(0, 0, 25 + crashTime * 50, 0, Math.PI * 2);
          ctx.fill();

          // Expanding Shockwave Ring
          ctx.strokeStyle = `rgba(255, 255, 255, ${flashAlpha})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, crashTime * 140, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();

        // Render Vector Particles & Shards (No Image Cutouts!)
        crashParticles.forEach((p) => {
          if (p.alpha <= 0) return;

          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.12; // Gravity
          p.rotation += p.vRot;
          p.alpha = Math.max(0, p.alpha - p.decay);

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.alpha;

          if (p.type === 'spark') {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'shard') {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.moveTo(-p.size / 2, -p.size / 3);
            ctx.lineTo(p.size / 2, 0);
            ctx.lineTo(-p.size / 4, p.size / 2);
            ctx.closePath();
            ctx.fill();
          } else if (p.type === 'smoke') {
            p.size += 0.8;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [status, currentMultiplier, crashedAt]);

  return (
    <div className="fixed inset-0 w-screen z-50 bg-[#0c030b] text-white flex flex-col font-sans select-none overflow-hidden" style={{ height: '100dvh' }}>
      {/* JetX Top Header */}
      <header className="h-11 sm:h-14 bg-[#140612] border-b border-[#2d0a22] px-2 sm:px-4 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-extrabold text-white text-sm sm:text-base shadow-sm">
              🚀
            </span>
            <span className="font-black text-base sm:text-lg tracking-wider text-white">
              JetX<span className="text-rose-500 hidden min-[360px]:inline">FLIGHT</span>
            </span>
          </Link>
          <span className="hidden lg:inline-block bg-rose-950/80 text-rose-400 text-[10px] font-black border border-rose-800/50 px-2 py-0.5 rounded-full font-mono shrink-0">
            RIVEXA ENGINE
          </span>
        </div>

        {/* User Balance & Sound Toggle & Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 max-w-full overflow-hidden">
          <Link
            href="/deposit"
            className="bg-[#20091c] border border-[#3d1235] hover:border-rose-500/50 px-2.5 sm:px-3.5 py-1 rounded-full flex items-center gap-1.5 transition-all shrink-0"
          >
            <span className="text-[11px] sm:text-xs font-black text-emerald-400 font-mono whitespace-nowrap">
              {balance.toFixed(2)} INR
            </span>
          </Link>

          <div className="flex items-center gap-1 text-slate-400 text-xs sm:text-sm shrink-0">
            <button
              type="button"
              onClick={() => {
                if (audioEngineRef.current) {
                  audioEngineRef.current.toggleMute();
                }
                setSoundEnabled(!soundEnabled);
              }}
              title="Toggle Audio Effects"
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#3d1235] flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
                soundEnabled ? 'bg-rose-900/60 text-rose-300' : 'bg-[#20091c] text-slate-500'
              }`}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.open('/play/jet', '_blank');
                }
              }}
              title="Open JetX in New Tab"
              className="w-7 h-7 sm:w-auto px-2 sm:px-2.5 py-1 rounded-full bg-[#20091c] hover:bg-[#320f2c] text-xs font-bold text-slate-300 flex items-center justify-center gap-1 transition-colors border border-[#3d1235] shrink-0"
            >
              <span className="text-rose-400">↗</span>
              <span className="hidden sm:inline">New Tab</span>
            </button>
            <button
              type="button"
              onClick={fetchPeriodHistory}
              title="Provably Fair Seed Verification"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#20091c] hover:bg-[#320f2c] flex items-center justify-center text-amber-400 font-bold transition-colors border border-[#3d1235] shrink-0 text-xs sm:text-sm"
            >
              📜
            </button>
            <Link
              href="/"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#20091c] hover:bg-[#320f2c] flex items-center justify-center text-slate-300 font-bold transition-colors border border-[#3d1235] shrink-0 text-xs sm:text-sm"
            >
              ✕
            </Link>
          </div>
        </div>
      </header>

      {/* Main Responsive Grid Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-0">
        {/* Left Live Bets Sidebar (Desktop 3 cols) */}
        <div className="hidden md:flex md:col-span-3 lg:col-span-3 bg-[#11050f] border-r border-[#2d0a22] flex-col overflow-hidden">
          <div className="p-2 border-b border-[#2d0a22] flex items-center gap-1 bg-[#170615]">
            <button
              onClick={() => setSidebarTab('all')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                sidebarTab === 'all'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Bets
            </button>
            <button
              onClick={() => setSidebarTab('my')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                sidebarTab === 'my'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Bets
            </button>
            <button
              onClick={() => setSidebarTab('top')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                sidebarTab === 'top'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Top
            </button>
          </div>

          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 border-b border-[#2d0a22] flex items-center justify-between">
            <span>PLAYER / BET</span>
            <span>MULT / PAYOUT</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#20081b] scrollbar-thin">
            {sidebarTab === 'my' ? (
              myOrders.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-medium">No order history found</div>
              ) : (
                myOrders.map((ord) => (
                  <div key={ord.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-[#1a0817]">
                    <div>
                      <div className="font-bold text-slate-200">₹{ord.amount.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{new Date(ord.createdAt).toLocaleTimeString()}</div>
                    </div>
                    <div className="text-right">
                      {ord.status === 'CASHED_OUT' ? (
                        <div className="font-black text-emerald-400 font-mono">
                          {ord.multiplier.toFixed(2)}x (+₹{ord.payout.toFixed(2)})
                        </div>
                      ) : ord.status === 'PENDING' ? (
                        <span className="text-amber-400 font-bold animate-pulse">IN FLIGHT</span>
                      ) : (
                        <span className="text-rose-500 font-bold">CRASHED</span>
                      )}
                    </div>
                  </div>
                ))
              )
            ) : (
              roundBets.map((b) => (
                <div key={b.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-[#1a0817]">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-950 text-rose-300 font-black text-[10px] flex items-center justify-center border border-rose-800/40">
                      {b.username.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="font-bold text-slate-200 text-[11px]">{b.username}</div>
                      <div className="text-[10px] text-slate-400 font-mono">₹{b.amount.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    {b.status === 'CASHED_OUT' ? (
                      <span className="font-black text-emerald-400 text-xs">
                        {b.multiplier.toFixed(2)}x (+₹{b.payout.toFixed(2)})
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">-</span>
                    )}
                  </div>
                </div>
              ))
            )}
            {sidebarTab === 'my' && (
              <div className="p-2 border-t border-[#2d0a22]">
                <button
                  onClick={fetchFullUserHistory}
                  className="w-full py-2 bg-[#20091c] hover:bg-[#320f2c] border border-[#3d1235] rounded-lg text-xs font-bold text-rose-400 hover:text-white flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  📜 View Full History
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Main Game Area */}
        <div className="col-span-1 md:col-span-9 lg:col-span-9 flex flex-col bg-[#0b030a] relative min-h-0 overflow-hidden">
          {/* Top Multiplier History Strip */}
          <div className="h-9 sm:h-10 bg-[#140612] border-b border-[#2d0a22] px-2 sm:px-3 flex items-center justify-between gap-1.5 shrink-0 relative overflow-hidden">
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-1 flex-1 min-w-0 touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
              {historyPills.map((mult, idx) => {
                const colorClass =
                  mult >= 10.0
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black'
                    : mult >= 2.0
                    ? 'bg-purple-900/90 text-purple-300 border border-purple-700/50 font-bold'
                    : 'bg-blue-950/80 text-blue-300 border border-blue-800/40 font-bold';

                return (
                  <span
                    key={idx}
                    className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-mono shrink-0 shadow-xs transition-transform active:scale-95 ${colorClass}`}
                  >
                    {mult.toFixed(2)}x
                  </span>
                );
              })}
            </div>

            <button
              type="button"
              onClick={fetchPeriodHistory}
              className="shrink-0 bg-[#20091c] hover:bg-[#320f2c] border border-[#3d1235] text-amber-400 hover:text-amber-300 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1 transition-all shadow-xs"
              title="Provably Fair History"
            >
              <span>📜</span>
              <span className="hidden min-[400px]:inline">History</span>
            </button>
          </div>

          {/* Center Flight Canvas & Multiplier Screen */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center min-h-0">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

            {/* Display State Overlay */}
            <div className="relative z-10 text-center pointer-events-none">
              {status === 'BETTING_OPEN' && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <span className="text-amber-400 text-xs font-black uppercase tracking-widest bg-amber-950/80 border border-amber-800/60 px-4 py-1.5 rounded-full shadow-lg">
                    NEXT ROUND IN
                  </span>
                  <div className="text-5xl sm:text-6xl md:text-7xl font-black text-white font-mono drop-shadow-md">
                    {secondsRemaining}s
                  </div>
                  <div className="w-48 h-2 bg-[#2d0a22] rounded-full mx-auto overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                      style={{ width: `${(secondsRemaining / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {status === 'FLYING' && (
                <div className="space-y-1">
                  <div className="text-5xl sm:text-6xl md:text-8xl font-black text-white font-mono tracking-tight drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
                    {currentMultiplier.toFixed(2)}x
                  </div>
                  <div className="text-rose-400 text-xs font-bold font-mono tracking-wider uppercase drop-shadow-sm">
                    JET IN HIGH ALTITUDE FLIGHT
                  </div>
                </div>
              )}

              {status === 'CRASHED' && (
                <div className="space-y-2 animate-in zoom-in-95 duration-200">
                  <div className="text-rose-500 text-sm md:text-base font-black tracking-widest uppercase bg-rose-950/90 border border-rose-800/80 px-4 py-1 rounded-full shadow-xl">
                    FLEW AWAY!
                  </div>
                  <div className="text-4xl sm:text-5xl md:text-7xl font-black text-rose-500 font-mono drop-shadow-lg">
                    {crashedAt.toFixed(2)}x
                  </div>
                </div>
              )}
            </div>

            {/* Period Number Tag */}
            <div className="absolute top-3 right-3 text-[10px] font-mono text-slate-400 bg-[#140612]/80 border border-[#2d0a22] px-2.5 py-1 rounded-full">
              Period #{roundId}
            </div>
          </div>

          {/* Toast Message Alert */}
          {message && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-rose-600 text-white font-bold text-xs px-4 py-1.5 rounded-full shadow-lg animate-in fade-in">
              {message}
            </div>
          )}

          {/* Bottom Dual Bet Control Panels - fixed height with overflow scroll on mobile */}
          <div className="bg-[#140612] border-t border-[#2d0a22] p-2 md:p-3 flex flex-col gap-2 shrink-0">
            {/* Mobile Tab Switcher (< md) */}
            <div className="flex md:hidden items-center border-b border-[#2d0a22] pb-1.5 gap-1">
              <button
                type="button"
                onClick={() => setActiveMobileBetTab(1)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  activeMobileBetTab === 1
                    ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-sm'
                    : 'text-slate-400 bg-[#1c0819] border border-[#380e32]'
                }`}
              >
                <span>BET PANEL 1</span>
                {userBetStatus1 === 'PENDING' && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileBetTab(2)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  activeMobileBetTab === 2
                    ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-sm'
                    : 'text-slate-400 bg-[#1c0819] border border-[#380e32]'
                }`}
              >
                <span>BET PANEL 2</span>
                {userBetStatus2 === 'PENDING' && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {/* Panel 1 */}
              <div
                className={`bg-[#1c0819] border border-[#380e32] rounded-xl p-2 flex-col justify-between gap-1.5 shadow-inner ${
                  activeMobileBetTab === 1 ? 'flex' : 'hidden md:flex'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300">BET PANEL 1</span>
                    <button
                      onClick={() => setAutoBet1(!autoBet1)}
                      className={`px-2 py-0.5 rounded text-[10px] font-black transition-colors ${
                        autoBet1 ? 'bg-rose-600 text-white' : 'bg-[#290c25] text-slate-400 hover:text-white'
                      }`}
                    >
                      AUTO BET
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">Auto Cashout:</span>
                    <input
                      type="number"
                      placeholder="2.00"
                      value={autoCashout1}
                      onChange={(e) => setAutoCashout1(e.target.value)}
                      className="w-14 bg-[#10040e] border border-[#3d1235] text-emerald-400 font-mono text-xs px-1.5 py-0.5 rounded text-center focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="bg-[#10040e] border border-[#3d1235] rounded-lg p-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setBetAmount1(Math.max(1, betAmount1 - 10))}
                        className="w-7 h-7 rounded bg-[#290c25] hover:bg-[#3d1235] font-black text-rose-400 transition-colors"
                      >
                        -
                      </button>
                      <div className="flex items-center gap-0.5 font-mono font-bold text-sm text-white">
                        <span className="text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          min="1"
                          value={betAmount1 || ''}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setBetAmount1(isNaN(v) ? 0 : Math.max(0, v));
                          }}
                          className="w-20 bg-transparent text-white font-mono font-bold text-sm text-center focus:outline-none focus:bg-[#20071c] rounded py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setBetAmount1(betAmount1 + 10)}
                        className="w-7 h-7 rounded bg-[#290c25] hover:bg-[#3d1235] font-black text-rose-400 transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Preset Amount Chips */}
                    <div className="grid grid-cols-4 gap-1">
                      {[100, 200, 500, 1000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBetAmount1(preset)}
                          className={`font-mono font-bold text-[10px] py-1 rounded transition-colors border ${
                            betAmount1 === preset
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-[#290c25] hover:bg-[#42123b] text-slate-200 border-[#380e32]'
                          }`}
                        >
                          ₹{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {userBetStatus1 === 'PENDING' ? (
                    <button
                      onClick={() => handleCashout(1)}
                      disabled={status !== 'FLYING' || loadingBet}
                      className="flex-1 py-2.5 sm:py-4 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                      CASHOUT @ {currentMultiplier.toFixed(2)}x
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePlaceBet(1)}
                      disabled={status !== 'BETTING_OPEN' || loadingBet}
                      className="flex-1 py-2.5 sm:py-4 rounded-lg bg-gradient-to-r from-rose-600 to-rose-500 text-white font-black text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                      BET ₹{betAmount1}
                    </button>
                  )}
                </div>
              </div>

              {/* Panel 2 */}
              <div
                className={`bg-[#1c0819] border border-[#380e32] rounded-xl p-2 flex-col justify-between gap-1.5 shadow-inner ${
                  activeMobileBetTab === 2 ? 'flex' : 'hidden md:flex'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300">BET PANEL 2</span>
                    <button
                      onClick={() => setAutoBet2(!autoBet2)}
                      className={`px-2 py-0.5 rounded text-[10px] font-black transition-colors ${
                        autoBet2 ? 'bg-rose-600 text-white' : 'bg-[#290c25] text-slate-400 hover:text-white'
                      }`}
                    >
                      AUTO BET
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">Auto Cashout:</span>
                    <input
                      type="number"
                      placeholder="5.00"
                      value={autoCashout2}
                      onChange={(e) => setAutoCashout2(e.target.value)}
                      className="w-14 bg-[#10040e] border border-[#3d1235] text-emerald-400 font-mono text-xs px-1.5 py-0.5 rounded text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="bg-[#10040e] border border-[#3d1235] rounded-lg p-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setBetAmount2(Math.max(1, betAmount2 - 10))}
                        className="w-7 h-7 rounded bg-[#290c25] hover:bg-[#3d1235] font-black text-rose-400 transition-colors"
                      >
                        -
                      </button>
                      <div className="flex items-center gap-0.5 font-mono font-bold text-sm text-white">
                        <span className="text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          min="1"
                          value={betAmount2 || ''}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setBetAmount2(isNaN(v) ? 0 : Math.max(0, v));
                          }}
                          className="w-20 bg-transparent text-white font-mono font-bold text-sm text-center focus:outline-none focus:bg-[#20071c] rounded py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setBetAmount2(betAmount2 + 10)}
                        className="w-7 h-7 rounded bg-[#290c25] hover:bg-[#3d1235] font-black text-rose-400 transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Preset Amount Chips */}
                    <div className="grid grid-cols-4 gap-1">
                      {[100, 200, 500, 1000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBetAmount2(preset)}
                          className={`font-mono font-bold text-[10px] py-1 rounded transition-colors border ${
                            betAmount2 === preset
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-[#290c25] hover:bg-[#42123b] text-slate-200 border-[#380e32]'
                          }`}
                        >
                          ₹{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {userBetStatus2 === 'PENDING' ? (
                    <button
                      onClick={() => handleCashout(2)}
                      disabled={status !== 'FLYING' || loadingBet}
                      className="flex-1 py-2.5 sm:py-4 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                      CASHOUT @ {currentMultiplier.toFixed(2)}x
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePlaceBet(2)}
                      disabled={status !== 'BETTING_OPEN' || loadingBet}
                      className="flex-1 py-2.5 sm:py-4 rounded-lg bg-gradient-to-r from-rose-600 to-rose-500 text-white font-black text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                      BET ₹{betAmount2}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full User Bet History Modal */}
      {isFullHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#170615] border border-[#3d1235] rounded-2xl w-full max-w-2xl p-5 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2d0a22] pb-3">
              <h3 className="font-black text-base flex items-center gap-2 text-rose-400">
                📜 My Complete JetX Bet History
              </h3>
              <button
                onClick={() => setIsFullHistoryOpen(false)}
                className="w-7 h-7 rounded-full bg-[#290c25] flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {fullHistoryOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">No bet history recorded for JetX yet.</div>
              ) : (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-12 text-[11px] font-bold text-slate-400 border-b border-[#2d0a22] pb-2 px-2">
                    <span className="col-span-4">Date / Time</span>
                    <span className="col-span-2 text-center">Bet (₹)</span>
                    <span className="col-span-3 text-center">Mult / Result</span>
                    <span className="col-span-3 text-right">Payout (₹)</span>
                  </div>
                  {fullHistoryOrders.map((b) => (
                    <div
                      key={b.id}
                      className="grid grid-cols-12 items-center text-xs p-2 bg-[#20091c]/60 hover:bg-[#20091c] rounded-lg border border-[#3d1235]/40 font-mono"
                    >
                      <div className="col-span-4">
                        <div className="font-bold text-slate-200 text-[11px]">{new Date(b.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">{new Date(b.createdAt).toLocaleTimeString()}</div>
                      </div>
                      <div className="col-span-2 text-center font-bold text-white">
                        ₹{b.amount.toFixed(2)}
                      </div>
                      <div className="col-span-3 text-center">
                        {b.status === 'CASHED_OUT' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                            {b.multiplier ? `${b.multiplier.toFixed(2)}x` : 'WIN'}
                          </span>
                        ) : b.status === 'PENDING' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-950 text-amber-400 border border-amber-800/40">
                            IN FLIGHT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-950 text-rose-400 border border-rose-800/40">
                            CRASHED
                          </span>
                        )}
                      </div>
                      <div className="col-span-3 text-right font-black">
                        {b.status === 'CASHED_OUT' ? (
                          <span className="text-emerald-400">+₹{b.payout.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-500">₹0.00</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[#2d0a22] pt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Showing up to 100 recent game orders</span>
              <button
                onClick={() => setIsFullHistoryOpen(false)}
                className="px-4 py-1.5 bg-[#290c25] hover:bg-[#3d1235] text-white font-bold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provably Fair Modal */}
      {isSeedModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#170615] border border-[#3d1235] rounded-2xl w-full max-w-lg p-5 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2d0a22] pb-3">
              <h3 className="font-black text-base flex items-center gap-2 text-rose-400">
                📜 JetX Provably Fair Period Seed Log
              </h3>
              <button
                onClick={() => setIsSeedModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#290c25] flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {periodHistory.map((p) => (
                <div key={p.id} className="p-3 bg-[#10040e] border border-[#2d0a22] rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-amber-400 font-mono">Period #{p.periodNumber}</span>
                    <span className="text-rose-400 font-mono">{p.crashMultiplier}x</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">SHA256: {p.seedHash}</div>
                </div>
              ))}
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
