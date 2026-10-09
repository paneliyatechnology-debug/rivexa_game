'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/lib/config';

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

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
}

export function CrashGame() {
  const { user, refreshUser, balance: contextBalance } = useAuth();

  // Balance & Global Game State
  const [balance, setBalance] = useState<number>(contextBalance || 0);

  useEffect(() => {
    if (contextBalance !== undefined && contextBalance !== null) {
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
  const [activeTab, setActiveTab] = useState<'orders' | 'players'>('players');
  const [activePanelTab, setActivePanelTab] = useState<1 | 2>(1);

  // Multiplier history list from API
  const [historyPills, setHistoryPills] = useState<number[]>([]);

  // Round Engine state
  const [roundId, setRoundId] = useState<string>('—');
  const [status, setStatus] = useState<'BETTING_OPEN' | 'FLYING' | 'CRASHED'>('BETTING_OPEN');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(6);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [crashedAt, setCrashedAt] = useState<number>(1.0);

  // Live Round Players Feed from API
  const [roundBets, setRoundBets] = useState<any[]>([]);

  // Period History & Seed Modal
  const [isSeedModalOpen, setIsSeedModalOpen] = useState<boolean>(false);
  const [periodHistory, setPeriodHistory] = useState<any[]>([]);

  // DUAL BET PANEL 1 STATE
  const [betAmount1, setBetAmount1] = useState<string>('10');
  const [autoCashout1, setAutoCashout1] = useState<string>('');
  const [autoBet1, setAutoBet1] = useState<boolean>(false);
  const [activeBetId1, setActiveBetId1] = useState<string | null>(null);
  const [userBetStatus1, setUserBetStatus1] = useState<'NONE' | 'PENDING' | 'CASHED_OUT' | 'LOST'>('NONE');

  // DUAL BET PANEL 2 STATE
  const [betAmount2, setBetAmount2] = useState<string>('10');
  const [autoCashout2, setAutoCashout2] = useState<string>('');
  const [autoBet2, setAutoBet2] = useState<boolean>(false);
  const [activeBetId2, setActiveBetId2] = useState<string | null>(null);
  const [userBetStatus2, setUserBetStatus2] = useState<'NONE' | 'PENDING' | 'CASHED_OUT' | 'LOST'>('NONE');

  // Orders and loading
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loadingBet, setLoadingBet] = useState<boolean>(false);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const flightProgressRef = useRef<number>(0);
  const autoBetPlacedRef1 = useRef<boolean>(false);
  const autoBetPlacedRef2 = useRef<boolean>(false);

  // Synchronize state with NestJS backend API
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

        if (data.round) {
          setRoundId(data.round.roundNumber ? String(data.round.roundNumber) : (data.round.id ? data.round.id.slice(0, 8).toUpperCase() : '—'));
          setStatus(data.round.status as any);
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

        if (typeof data.userBalance === 'string') {
          setBalance(parseFloat(data.userBalance));
        }

        // Active user bets sync (Dual panels)
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
          // Reset bet states for new round
          if (userBetStatus1 !== 'NONE' && userBetStatus1 !== 'PENDING') {
            setActiveBetId1(null);
            setUserBetStatus1('NONE');
          }
          if (userBetStatus2 !== 'NONE' && userBetStatus2 !== 'PENDING') {
            setActiveBetId2(null);
            setUserBetStatus2('NONE');
          }
        }
      }
    } catch (err) {
      // Fallback resilience
    }
  }, [user?.id, userBetStatus1, userBetStatus2]);

  // Fetch User Orders
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
        if (Array.isArray(data)) {
          setMyOrders(data);
        }
      }
    } catch (err) {
      // ignore
    }
  }, [user?.id]);

  // Fetch Period History for Seed Verification Modal
  const fetchPeriodHistory = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/crash/period-history`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPeriodHistory(data);
        }
      }
    } catch (err) {
      // ignore
    }
    setIsSeedModalOpen(true);
  };

  // Polling loop (every 500ms)
  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 500);
    return () => clearInterval(interval);
  }, [fetchGameState]);

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders, status]);

  // Handle Place Bet for Panel 1 or Panel 2
  const handlePlaceBet = async (panelNum: 1 | 2) => {
    setMessage('');
    const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
    if (!token) {
      setMessage('Please login to place bets.');
      return;
    }

    const amtStr = panelNum === 1 ? betAmount1 : betAmount2;
    const amt = parseFloat(amtStr);
    if (isNaN(amt) || amt < 10) {
      setMessage('Minimum bet amount is ₹10.');
      return;
    }

    if (amt > balance) {
      setMessage('Insufficient wallet balance.');
      return;
    }

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
      setMessage(`🚀 Bet ${panelNum} placed! Prepare for launch.`);
      fetchMyOrders();
      refreshUser();
    } catch (err: any) {
      setMessage(err.message === 'Failed to fetch' ? 'Connection error. Retrying...' : err.message || 'Error placing bet.');
    } finally {
      setLoadingBet(false);
    }
  };

  // Handle Cashout for Panel 1 or Panel 2
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

      if (panelNum === 1) {
        setUserBetStatus1('CASHED_OUT');
      } else {
        setUserBetStatus2('CASHED_OUT');
      }

      if (data.newBalance) setBalance(parseFloat(data.newBalance));
      setMessage(`🎉 Bet ${panelNum} CASHED OUT @ ${mult.toFixed(2)}x! +₹${pay.toFixed(2)} credited.`);
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

  // Auto Bet Trigger when status becomes BETTING_OPEN
  useEffect(() => {
    if (status === 'BETTING_OPEN') {
      if (autoBet1 && !autoBetPlacedRef1.current && userBetStatus1 === 'NONE') {
        autoBetPlacedRef1.current = true;
        handlePlaceBet(1);
      }
      if (autoBet2 && !autoBetPlacedRef2.current && userBetStatus2 === 'NONE') {
        autoBetPlacedRef2.current = true;
        handlePlaceBet(2);
      }
    } else {
      autoBetPlacedRef1.current = false;
      autoBetPlacedRef2.current = false;
    }
  }, [status, autoBet1, autoBet2, userBetStatus1, userBetStatus2]);

  // Auto Cashout Triggers during flight for Panel 1 & Panel 2
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

  // Starfield & Canvas initialization
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * 600,
        y: Math.random() * 320,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.5 + 0.2,
      });
    }
    starsRef.current = stars;
  }, []);

  // 60FPS Rocket Flight Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    const height = (canvas.height = 300);

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep Space Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#090D16');
      bgGrad.addColorStop(0.5, '#0B132B');
      bgGrad.addColorStop(1, '#060810');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Starfield
      ctx.fillStyle = '#ffffff';
      starsRef.current.forEach((star) => {
        if (status === 'FLYING') {
          star.x -= star.speed * 1.5;
          if (star.x < 0) star.x = width;
        }
        ctx.save();
        ctx.globalAlpha = star.alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Curve coordinates
      const startX = 40;
      const startY = height - 40;
      const endX = width - 60;
      const endY = 60;

      let targetProgress = 0.0;
      if (status === 'FLYING') {
        targetProgress = Math.min(0.92, (currentMultiplier - 1.0) / 7.0);
      } else if (status === 'CRASHED') {
        targetProgress = Math.min(0.92, (crashedAt - 1.0) / 7.0);
      }

      flightProgressRef.current += (targetProgress - flightProgressRef.current) * 0.1;
      const t = flightProgressRef.current;

      const controlX = startX + (endX - startX) * 0.6;
      const controlY = startY;

      const rocketX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
      const rocketY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;

      const dx = 2 * (1 - t) * (controlX - startX) + 2 * t * (endX - controlX);
      const dy = 2 * (1 - t) * (controlY - startY) + 2 * t * (endY - controlY);
      const angle = Math.atan2(dy, dx);

      // Trajectory Line
      if (t > 0.02) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(controlX, controlY, rocketX, rocketY);
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = status === 'CRASHED' ? '#EF4444' : '#38BDF8';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        // Area Fill
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(controlX, controlY, rocketX, rocketY);
        ctx.lineTo(rocketX, height - 30);
        ctx.lineTo(startX, height - 30);
        ctx.closePath();
        const areaGrad = ctx.createLinearGradient(0, endY, 0, height);
        areaGrad.addColorStop(0, status === 'CRASHED' ? 'rgba(239,68,68,0.2)' : 'rgba(56,189,248,0.2)');
        areaGrad.addColorStop(1, 'rgba(56,189,248,0.0)');
        ctx.fillStyle = areaGrad;
        ctx.fill();
        ctx.restore();
      }

      // Thrust Particles
      if (status === 'FLYING' && t > 0.01) {
        for (let p = 0; p < 3; p++) {
          const spread = (Math.random() - 0.5) * 12;
          const thrustAngle = angle + Math.PI + (Math.random() - 0.5) * 0.3;
          const speed = Math.random() * 4 + 2;

          particlesRef.current.push({
            x: rocketX - Math.cos(angle) * 15 + Math.sin(angle) * spread,
            y: rocketY - Math.sin(angle) * 15 - Math.cos(angle) * spread,
            vx: Math.cos(thrustAngle) * speed,
            vy: Math.sin(thrustAngle) * speed,
            radius: Math.random() * 4 + 2,
            color: Math.random() > 0.5 ? '#F59E0B' : Math.random() > 0.3 ? '#EF4444' : '#FBBF24',
            alpha: 1.0,
            decay: Math.random() * 0.05 + 0.03,
          });
        }
      }

      // Explosion Particles
      if (status === 'CRASHED' && particlesRef.current.length < 30) {
        for (let p = 0; p < 45; p++) {
          const expAngle = Math.random() * Math.PI * 2;
          const expSpeed = Math.random() * 6 + 1;
          particlesRef.current.push({
            x: rocketX,
            y: rocketY,
            vx: Math.cos(expAngle) * expSpeed,
            vy: Math.sin(expAngle) * expSpeed,
            radius: Math.random() * 5 + 2,
            color: Math.random() > 0.4 ? '#EF4444' : Math.random() > 0.2 ? '#F59E0B' : '#FFFFFF',
            alpha: 1.0,
            decay: Math.random() * 0.03 + 0.01,
          });
        }
      }

      particlesRef.current.forEach((particle, idx) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha -= particle.decay;

        if (particle.alpha <= 0) {
          particlesRef.current.splice(idx, 1);
          return;
        }

        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Rocket Sprite
      if (status !== 'CRASHED' || t < 0.05) {
        ctx.save();
        ctx.translate(rocketX, rocketY);
        ctx.rotate(angle);

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.quadraticCurveTo(5, -10, -18, -9);
        ctx.lineTo(-18, 9);
        ctx.quadraticCurveTo(5, 10, 22, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.quadraticCurveTo(15, -6, 10, -7);
        ctx.lineTo(10, 7);
        ctx.quadraticCurveTo(15, 6, 22, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#2563EB';
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(-20, -18);
        ctx.lineTo(-15, -7);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-8, 8);
        ctx.lineTo(-20, 18);
        ctx.lineTo(-15, 7);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(2, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [status, currentMultiplier, crashedAt]);

  return (
    <div className="max-w-md w-full mx-auto space-y-3 pb-24 font-sans text-slate-800">
      {/* 1. HEADER BAR */}
      <header className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="text-base">🚀</span>
            <h1 className="text-sm font-black text-blue-600 tracking-tight">Crash Rocket</h1>
          </div>
        </div>

        {/* Balance Pill */}
        <Link
          href="/deposit"
          className="bg-blue-50/90 border border-blue-200/90 hover:bg-blue-100/90 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all"
        >
          <svg className="w-3.5 h-3.5 text-blue-600 fill-current" viewBox="0 0 24 24">
            <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
          </svg>
          <span className="text-xs font-black text-blue-700 font-mono">₹{balance.toFixed(2)}</span>
        </Link>
      </header>

      {/* Toast Alert Notice */}
      {message && (
        <div className="p-3 rounded-2xl text-xs font-bold bg-blue-600 text-white text-center shadow-md animate-in fade-in flex items-center justify-center gap-2">
          <span>{message}</span>
        </div>
      )}

      {/* 2. RECENT MULTIPLIERS STRIP WITH PERIOD HISTORY MODAL TRIGGER */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pr-2">
          {historyPills.map((m, idx) => (
            <span
              key={idx}
              className={`px-2.5 py-1 rounded-full text-xs font-mono font-black shrink-0 transition-transform ${
                m >= 2.0
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-rose-600 text-white shadow-xs'
              }`}
            >
              {m.toFixed(2)}x
            </span>
          ))}
        </div>

        {/* Provably Fair History Button */}
        <button
          type="button"
          onClick={fetchPeriodHistory}
          title="Period History & Provably Fair Seeds"
          className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs shrink-0 flex items-center gap-1 border border-slate-700 transition-all"
        >
          <span>📜</span>
        </button>
      </div>

      {/* 3. FLIGHT CANVAS & DISPLAY ARENA */}
      <div className="bg-[#090D16] border border-slate-800 rounded-3xl h-[300px] relative overflow-hidden shadow-xl flex flex-col justify-between p-4">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Top Overlay: Period Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
            AVIATOR ENGINE v2.0
          </span>
          <div className="bg-slate-900/90 text-amber-400 border border-amber-400/40 text-[10px] font-mono font-black px-3 py-1 rounded-full shadow-sm">
            Period #{roundId}
          </div>
        </div>

        {/* Center Multiplier & Status Readout */}
        <div className="relative z-10 text-center space-y-2.5 my-auto">
          <div
            className={`text-6xl sm:text-7xl font-black font-mono tracking-tight drop-shadow-md transition-colors ${
              status === 'CRASHED'
                ? 'text-rose-500'
                : 'text-[#38BDF8] drop-shadow-[0_4px_25px_rgba(56,189,248,0.4)]'
            }`}
          >
            {status === 'CRASHED' ? `${crashedAt.toFixed(2)}x` : `${currentMultiplier.toFixed(2)}x`}
          </div>

          <div>
            {status === 'FLYING' && (
              <span className="bg-emerald-600 text-white text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-emerald-600/30 animate-pulse inline-flex items-center gap-1.5">
                <span>🚀</span> ROCKET ASCENDING
              </span>
            )}
            {status === 'CRASHED' && (
              <span className="bg-rose-600 text-white text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-rose-600/30 inline-flex items-center gap-1.5">
                <span>💥</span> CRASHED @ {crashedAt.toFixed(2)}x
              </span>
            )}
            {status === 'BETTING_OPEN' && (
              <span className="bg-blue-600 text-white text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-blue-600/30 inline-flex items-center gap-1.5">
                <span>⏱️</span> LAUNCH IN {secondsRemaining}s
              </span>
            )}
          </div>
        </div>

        {/* Live Profit Banner for Active Bets */}
        {status === 'FLYING' && (userBetStatus1 === 'PENDING' || userBetStatus2 === 'PENDING') && (
          <div className="relative z-10 bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-2.5 text-center flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 font-bold">
              BET {userBetStatus1 === 'PENDING' ? '1' : ''}{userBetStatus1 === 'PENDING' && userBetStatus2 === 'PENDING' ? ' & ' : ''}{userBetStatus2 === 'PENDING' ? '2' : ''} ACTIVE
            </span>
            <span className="text-emerald-400 font-black text-sm animate-pulse">
              LIVE MULTIPLIER: {currentMultiplier.toFixed(2)}x
            </span>
          </div>
        )}
      </div>

      {/* 4. DUAL BETTING PANELS (AVIATOR DUAL PANEL CARDS) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-sm space-y-3">
        {/* Panel Switcher Header Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActivePanelTab(1)}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activePanelTab === 1
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎯 BET PANEL 1</span>
            {userBetStatus1 === 'PENDING' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
          </button>
          <button
            type="button"
            onClick={() => setActivePanelTab(2)}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activePanelTab === 2
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🚀 BET PANEL 2</span>
            {userBetStatus2 === 'PENDING' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
          </button>
        </div>

        {/* ================= PANEL 1 CONTROLS ================= */}
        {activePanelTab === 1 && (
          <div className="space-y-3.5">
            {/* Amount Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  BET AMOUNT (₹)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBet1}
                    onChange={(e) => setAutoBet1(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-[10px] font-black text-blue-600 uppercase">AUTO BET</span>
                </label>
              </div>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 transition-all shadow-xs">
                <span className="pl-3.5 pr-1 text-sm font-black text-slate-400">₹</span>
                <input
                  type="number"
                  min="10"
                  value={betAmount1}
                  onChange={(e) => setBetAmount1(e.target.value)}
                  className="w-full bg-transparent border-0 py-2.5 text-sm font-black text-slate-800 font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setBetAmount1(String(Math.max(10, Math.floor(parseFloat(betAmount1 || '0') / 2))))}
                  className="px-3 py-2.5 bg-slate-100 border-l border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
                >
                  1/2
                </button>
                <button
                  type="button"
                  onClick={() => setBetAmount1(String(Math.floor(parseFloat(betAmount1 || '10') * 2)))}
                  className="px-3 py-2.5 bg-slate-100 border-l border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
                >
                  2X
                </button>
              </div>
            </div>

            {/* Auto Cashout Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  AUTO CASHOUT (MULTIPLIER)
                </label>
                <span className="text-xs font-black text-blue-600 font-mono">
                  {autoCashout1 ? `${parseFloat(autoCashout1).toFixed(2)}x` : 'OFF'}
                </span>
              </div>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 transition-all mb-2 shadow-xs">
                <span className="pl-3 pr-2 text-xs text-blue-600">🪄</span>
                <input
                  type="number"
                  step="0.10"
                  placeholder="e.g. 2.00 (Optional)"
                  value={autoCashout1}
                  onChange={(e) => setAutoCashout1(e.target.value)}
                  className="w-full bg-transparent border-0 py-2.5 text-xs font-bold text-slate-800 font-mono focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* Presets */}
              <div className="grid grid-cols-5 gap-1.5">
                {['1.50', '2.00', '5.00', '10.00'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAutoCashout1(val)}
                    className={`py-1.5 text-[11px] font-mono font-bold rounded-xl border transition-all ${
                      autoCashout1 === val
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {val}x
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAutoCashout1('')}
                  className={`py-1.5 text-[11px] font-mono font-bold rounded-xl border transition-all ${
                    autoCashout1 === ''
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  OFF
                </button>
              </div>
            </div>

            {/* Action Button 1 */}
            <div>
              {status === 'BETTING_OPEN' && userBetStatus1 === 'NONE' && (
                <button
                  type="button"
                  onClick={() => handlePlaceBet(1)}
                  disabled={loadingBet}
                  className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
                >
                  <span>PLACE BET 1 (₹{betAmount1})</span>
                </button>
              )}

              {status === 'BETTING_OPEN' && userBetStatus1 === 'PENDING' && (
                <div className="w-full py-4 px-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/25 text-center flex items-center justify-center gap-2">
                  <span>✅ BET 1 PLACED (WAITING LAUNCH)</span>
                </div>
              )}

              {status === 'FLYING' && userBetStatus1 === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => handleCashout(1)}
                  disabled={loadingBet}
                  className="w-full py-4 px-4 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-400/30 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 animate-pulse cursor-pointer disabled:opacity-60"
                >
                  <span>
                    CASH OUT BET 1 @ {currentMultiplier.toFixed(2)}x (+₹
                    {(parseFloat(betAmount1 || '0') * currentMultiplier).toFixed(2)})
                  </span>
                </button>
              )}

              {status === 'FLYING' && userBetStatus1 !== 'PENDING' && (
                <div className="w-full py-4 px-4 bg-slate-100 text-slate-400 font-extrabold text-xs uppercase tracking-wider rounded-2xl text-center cursor-not-allowed">
                  🚀 ROCKET IN FLIGHT (BET NEXT ROUND)
                </div>
              )}

              {status === 'CRASHED' && (
                <div className="w-full py-4 px-4 bg-rose-50 text-rose-600 border border-rose-200 font-extrabold text-xs uppercase tracking-wider rounded-2xl text-center">
                  💥 CRASHED AT {crashedAt.toFixed(2)}x! NEXT ROUND SOON
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= PANEL 2 CONTROLS ================= */}
        {activePanelTab === 2 && (
          <div className="space-y-3.5">
            {/* Amount Field 2 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  BET AMOUNT (₹)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBet2}
                    onChange={(e) => setAutoBet2(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-[10px] font-black text-blue-600 uppercase">AUTO BET</span>
                </label>
              </div>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 transition-all shadow-xs">
                <span className="pl-3.5 pr-1 text-sm font-black text-slate-400">₹</span>
                <input
                  type="number"
                  min="10"
                  value={betAmount2}
                  onChange={(e) => setBetAmount2(e.target.value)}
                  className="w-full bg-transparent border-0 py-2.5 text-sm font-black text-slate-800 font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setBetAmount2(String(Math.max(10, Math.floor(parseFloat(betAmount2 || '0') / 2))))}
                  className="px-3 py-2.5 bg-slate-100 border-l border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
                >
                  1/2
                </button>
                <button
                  type="button"
                  onClick={() => setBetAmount2(String(Math.floor(parseFloat(betAmount2 || '10') * 2)))}
                  className="px-3 py-2.5 bg-slate-100 border-l border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
                >
                  2X
                </button>
              </div>
            </div>

            {/* Auto Cashout Field 2 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  AUTO CASHOUT (MULTIPLIER)
                </label>
                <span className="text-xs font-black text-blue-600 font-mono">
                  {autoCashout2 ? `${parseFloat(autoCashout2).toFixed(2)}x` : 'OFF'}
                </span>
              </div>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 transition-all mb-2 shadow-xs">
                <span className="pl-3 pr-2 text-xs text-blue-600">🪄</span>
                <input
                  type="number"
                  step="0.10"
                  placeholder="e.g. 2.00 (Optional)"
                  value={autoCashout2}
                  onChange={(e) => setAutoCashout2(e.target.value)}
                  className="w-full bg-transparent border-0 py-2.5 text-xs font-bold text-slate-800 font-mono focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* Presets */}
              <div className="grid grid-cols-5 gap-1.5">
                {['1.50', '2.00', '5.00', '10.00'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAutoCashout2(val)}
                    className={`py-1.5 text-[11px] font-mono font-bold rounded-xl border transition-all ${
                      autoCashout2 === val
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {val}x
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAutoCashout2('')}
                  className={`py-1.5 text-[11px] font-mono font-bold rounded-xl border transition-all ${
                    autoCashout2 === ''
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  OFF
                </button>
              </div>
            </div>

            {/* Action Button 2 */}
            <div>
              {status === 'BETTING_OPEN' && userBetStatus2 === 'NONE' && (
                <button
                  type="button"
                  onClick={() => handlePlaceBet(2)}
                  disabled={loadingBet}
                  className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
                >
                  <span>PLACE BET 2 (₹{betAmount2})</span>
                </button>
              )}

              {status === 'BETTING_OPEN' && userBetStatus2 === 'PENDING' && (
                <div className="w-full py-4 px-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/25 text-center flex items-center justify-center gap-2">
                  <span>✅ BET 2 PLACED (WAITING LAUNCH)</span>
                </div>
              )}

              {status === 'FLYING' && userBetStatus2 === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => handleCashout(2)}
                  disabled={loadingBet}
                  className="w-full py-4 px-4 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-400/30 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 animate-pulse cursor-pointer disabled:opacity-60"
                >
                  <span>
                    CASH OUT BET 2 @ {currentMultiplier.toFixed(2)}x (+₹
                    {(parseFloat(betAmount2 || '0') * currentMultiplier).toFixed(2)})
                  </span>
                </button>
              )}

              {status === 'FLYING' && userBetStatus2 !== 'PENDING' && (
                <div className="w-full py-4 px-4 bg-slate-100 text-slate-400 font-extrabold text-xs uppercase tracking-wider rounded-2xl text-center cursor-not-allowed">
                  🚀 ROCKET IN FLIGHT (BET NEXT ROUND)
                </div>
              )}

              {status === 'CRASHED' && (
                <div className="w-full py-4 px-4 bg-rose-50 text-rose-600 border border-rose-200 font-extrabold text-xs uppercase tracking-wider rounded-2xl text-center">
                  💥 CRASHED AT {crashedAt.toFixed(2)}x! NEXT ROUND SOON
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. LIVE PLAYERS & MY ORDERS TABS */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-sm space-y-3">
        {/* Tab Toggle Header */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('players')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all ${
              activeTab === 'players'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            👥 Live Players ({roundBets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all ${
              activeTab === 'orders'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📋 My Orders
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'players' ? (
          <div className="space-y-2 text-xs max-h-60 overflow-y-auto pr-1">
            {roundBets.length === 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-bold">
                  <span className="text-slate-600">Player***89</span>
                  <span className="font-mono text-emerald-600 font-black">₹500 @ 2.40x (+₹1,200)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-bold">
                  <span className="text-slate-600">WinGamer42</span>
                  <span className="font-mono text-emerald-600 font-black">₹200 @ 5.10x (+₹1,020)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-bold">
                  <span className="text-slate-600">RivexaKing</span>
                  <span className="font-mono text-amber-500 font-black">₹1,000 In Flight...</span>
                </div>
              </div>
            ) : (
              roundBets.map((b, i) => {
                const isCashed = b.status === 'CASHED_OUT' || b.status === 'WON';
                const isLost = b.status === 'LOST';

                return (
                  <div key={b.id || i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-slate-700 font-bold">{b.username}</span>
                    </div>
                    <div className="text-right font-mono">
                      {isCashed ? (
                        <span className="text-emerald-600 font-black block">
                          ₹{b.amount} @ {Number(b.multiplier).toFixed(2)}x (+₹{Number(b.payout).toFixed(2)})
                        </span>
                      ) : isLost ? (
                        <span className="text-rose-500 font-black block">₹{b.amount} Lost</span>
                      ) : (
                        <span className="text-amber-500 font-black block animate-pulse">
                          ₹{b.amount} In Flight...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-2 text-xs max-h-60 overflow-y-auto pr-1">
            {myOrders.length === 0 ? (
              <p className="text-center py-6 text-slate-400 font-semibold text-xs">
                No orders found. Place your first rocket bet!
              </p>
            ) : (
              myOrders.map((order, i) => {
                const isWon = order.status === 'WON' || order.status === 'CASHED_OUT';
                const isPending = order.status === 'PENDING';
                const dateStr = order.createdAt
                  ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : (order.time || 'Now');

                return (
                  <div key={order.id || i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/90 border border-slate-100/90 font-bold hover:bg-slate-100/60 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-800 font-black">Stake: ₹{Number(order.amount).toFixed(2)}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isWon ? 'bg-emerald-100 text-emerald-700' : isPending ? 'bg-blue-100 text-blue-700 animate-pulse' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {isWon ? 'WON' : isPending ? 'IN FLIGHT' : 'LOST'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Period #{order.roundId || 'CRASH'} • {dateStr}
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className={`font-black block text-sm ${isWon ? 'text-emerald-600' : isPending ? 'text-blue-600' : 'text-slate-400'}`}>
                        {Number(order.multiplier || 0).toFixed(2)}x
                      </span>
                      <span className={`text-[11px] font-bold block ${isWon ? 'text-emerald-700' : isPending ? 'text-blue-700' : 'text-slate-400'}`}>
                        {isWon ? `+₹${Number(order.payout || 0).toFixed(2)}` : isPending ? 'Pending...' : '₹0.00'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 6. PROVABLY FAIR SEED & PERIOD HISTORY MODAL */}
      {isSeedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">📜</span>
                <div>
                  <h3 className="text-base font-black text-slate-800 leading-none">Period History</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Provably Fair SHA-256 Seeds</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSeedModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {periodHistory.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs font-bold">
                  Loading period seed history...
                </p>
              ) : (
                periodHistory.map((period, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100/90 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-black text-slate-700">Period #{period.periodNumber}</span>
                      <span className="font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {period.crashMultiplier}x
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 break-all bg-white p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-bold block mb-0.5">Seed Hash (SHA-256):</span>
                      {period.seedHash}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
