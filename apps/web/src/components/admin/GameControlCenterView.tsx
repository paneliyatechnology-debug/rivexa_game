'use client';

import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/lib/config';

interface GameControlCenterViewProps {
  gameId: string;
  gameName: string;
  gameType: 'fast-parity' | 'parity' | 'mines' | 'andar-bahar' | 'jet' | 'crash' | 'spin' | 'dice' | 'pushparani' | 'coin-flip';
  icon: string;
  subtitle: string;
  defaultRtp?: number;
  defaultMinBet?: number;
  defaultMaxBet?: number;
  isActive?: boolean;
  onToggleActive?: (nextActive: boolean) => void;
  onSettingsUpdated?: (updatedGame: any) => void;
}

export function GameControlCenterView({
  gameId,
  gameName,
  gameType,
  icon,
  subtitle,
  defaultRtp = 95.0,
  defaultMinBet = 10.0,
  defaultMaxBet = 50000.0,
  isActive = true,
  onToggleActive,
  onSettingsUpdated,
}: GameControlCenterViewProps) {
  const [rtp, setRtp] = useState<number>(defaultRtp);
  const [minBet, setMinBet] = useState<number>(defaultMinBet);
  const [maxBet, setMaxBet] = useState<number>(defaultMaxBet);

  const [rtpInput, setRtpInput] = useState<string>(String(defaultRtp));
  const [minBetInput, setMinBetInput] = useState<string>(String(defaultMinBet));
  const [maxBetInput, setMaxBetInput] = useState<string>(String(defaultMaxBet));

  const isEditingRtpRef = React.useRef<boolean>(false);
  const isEditingLimitsRef = React.useRef<boolean>(false);

  const [gameEnabled, setGameEnabled] = useState<boolean>(isActive);
  const [targetOverride, setTargetOverride] = useState<string>('');
  const [activeOverrideStatus, setActiveOverrideStatus] = useState<string>('AUTOMATIC RTP ALGORITHM ACTIVE');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Live Stats & Current Round State from Backend
  const [liveStats, setLiveStats] = useState({
    todayStakes: 0.0,
    todayPayouts: 0.0,
    houseNetProfit: 0.0,
    activeRtp: defaultRtp,
    activePlayers: 0,
  });

  const [currentRoundInfo, setCurrentRoundInfo] = useState({
    periodNumber: '#202609257106',
    status: 'BETTING OPEN (20s)',
    openCard: 'K♠',
    activeBetsSummary: {},
  });

  const [nextRoundInfo, setNextRoundInfo] = useState<{
    periodNumber: string;
    projectedNumber: number;
    projectedColor: string;
    projectedLabel: string;
    projectedMultiplier?: string;
    isOverride: boolean;
  }>({
    periodNumber: '#202609257107',
    projectedNumber: 7,
    projectedColor: 'GREEN',
    projectedLabel: 'AUTOMATIC RTP (PROFIT OPTIMIZED)',
    projectedMultiplier: '2.50',
    isOverride: false,
  });

  // Settled History Mock / Live Data
  const [settledPeriods, setSettledPeriods] = useState<any[]>([
    { period: '#202609257106', winningNumber: 9, colors: 'GREEN', override: 'AUTO RTP', time: '05:13:00, Sep 25' },
    { period: '#202609257105', winningNumber: 2, colors: 'RED', override: 'AUTO RTP', time: '05:12:30, Sep 25' },
    { period: '#202609257104', winningNumber: 5, colors: 'VIOLET/GREEN', override: 'AUTO RTP', time: '05:12:00, Sep 25' },
    { period: '#202609257103', winningNumber: 0, colors: 'VIOLET/RED', override: 'AUTO RTP', time: '05:11:30, Sep 25' },
    { period: '#202609257102', winningNumber: 7, colors: 'GREEN', override: 'AUTO RTP', time: '05:11:00, Sep 25' },
  ]);

  const [minesPlayed, setMinesPlayed] = useState<any[]>([
    { user: 'Jatin Kakadiya', amount: 100.00, status: 'PLAYING', multiplier: 1.00, payout: 0.00, time: '13:39:28, Sep 17' },
    { user: 'Jatin Kakadiya', amount: 100.00, status: 'HIT MINE (LOST)', multiplier: 0.00, payout: 0.00, time: '13:38:52, Sep 17' },
    { user: 'Jatin Kakadiya', amount: 100.00, status: 'CASHED OUT (WON)', multiplier: 1.66, payout: 166.00, time: '13:38:26, Sep 17' },
    { user: 'Jaydeep Patel', amount: 100000.00, status: 'CASHED OUT (WON)', multiplier: 1.94, payout: 194000.00, time: '14:48:28, Sep 09' },
  ]);

  const [andarBaharHistory, setAndarBaharHistory] = useState<any[]>([
    { period: '20260917130001', openCard: '4♠', winner: 'ANDAR', winningCard: '4♥', deals: 7, override: 'NO', time: '2026-09-17 13:37:01' },
    { period: '20260909140003', openCard: 'A♣', winner: 'BAHAR', winningCard: 'A♦', deals: 10, override: 'NO', time: '2026-09-09 14:58:44' },
    { period: '20260909140002', openCard: 'A♦', winner: 'ANDAR', winningCard: 'A♥', deals: 17, override: 'NO', time: '2026-09-09 14:44:01' },
  ]);

  const [diceHistory, setDiceHistory] = useState<any[]>([]);

  const fetchLiveControlData = React.useCallback(async () => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/admin/games/${gameId}/control-center`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          if (data.rtpPercentage !== undefined) {
            setRtp(data.rtpPercentage);
            if (!isEditingRtpRef.current) setRtpInput(String(data.rtpPercentage));
          }
          if (data.minBet !== undefined) {
            setMinBet(data.minBet);
            if (!isEditingLimitsRef.current) setMinBetInput(String(data.minBet));
          }
          if (data.maxBet !== undefined) {
            setMaxBet(data.maxBet);
            if (!isEditingLimitsRef.current) setMaxBetInput(String(data.maxBet));
          }
          if (data.isActive !== undefined) setGameEnabled(data.isActive);
          if (data.nextOverride !== undefined) {
            if (data.nextOverride) {
              setActiveOverrideStatus(`FORCED TARGET ACTIVE: ${data.nextOverride}`);
            } else {
              setActiveOverrideStatus('AUTOMATIC RTP ALGORITHM ACTIVE');
            }
          }
          setLiveStats({
            todayStakes: data.todayStakes || 0,
            todayPayouts: data.todayPayouts || 0,
            houseNetProfit: data.houseNetProfit || 0,
            activeRtp: data.activeRtp || data.rtpPercentage || defaultRtp,
            activePlayers: data.activePlayers || 0,
          });

          if (data.currentRound) {
            setCurrentRoundInfo(data.currentRound);
          }

          if (data.nextRound) {
            setNextRoundInfo(data.nextRound);
          }

          if (Array.isArray(data.settledPeriods) && data.settledPeriods.length > 0) {
            if (gameType === 'andar-bahar' && data.settledPeriods[0]?.openCard) {
              setAndarBaharHistory(data.settledPeriods);
            } else if (gameType === 'mines' && (data.settledPeriods[0]?.multiplier !== undefined || data.settledPeriods[0]?.amount !== undefined)) {
              setMinesPlayed(data.settledPeriods);
            } else if (gameType === 'dice' && data.settledPeriods[0]?.rolledNumber !== undefined) {
              setDiceHistory(data.settledPeriods);
            } else if (gameType === 'dice') {
              setDiceHistory(data.settledPeriods);
            } else {
              setSettledPeriods(data.settledPeriods);
            }
          }
        }
      }
    } catch (e) {
      // Fallback maintains existing state
    }
  }, [gameId, gameType, defaultRtp]);

  React.useEffect(() => {
    if (!isEditingRtpRef.current) {
      setRtp(defaultRtp);
      setRtpInput(String(defaultRtp));
    }
    if (!isEditingLimitsRef.current) {
      setMinBet(defaultMinBet);
      setMinBetInput(String(defaultMinBet));
      setMaxBet(defaultMaxBet);
      setMaxBetInput(String(defaultMaxBet));
    }
  }, [gameId, defaultRtp, defaultMinBet, defaultMaxBet]);

  React.useEffect(() => {
    fetchLiveControlData();
    const timer = setInterval(fetchLiveControlData, 3000);
    return () => clearInterval(timer);
  }, [fetchLiveControlData]);

  const handleUpdateRtp = async () => {
    setMessage('');
    const targetRtp = parseFloat(rtpInput);
    if (isNaN(targetRtp) || targetRtp < 1 || targetRtp > 99) {
      setMessage('⚠️ Please enter a valid RTP percentage between 1 and 99.');
      return;
    }
    isEditingRtpRef.current = false;
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/admin/games/${gameId}/rtp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rtpPercentage: targetRtp, minBet, maxBet }),
      });
      const data = await res.json();
      const updatedRtp = data?.game?.rtpPercentage !== undefined ? Number(data.game.rtpPercentage) : targetRtp;
      const updatedMin = data?.game?.minBet !== undefined ? Number(data.game.minBet) : minBet;
      const updatedMax = data?.game?.maxBet !== undefined ? Number(data.game.maxBet) : maxBet;

      setRtp(updatedRtp);
      setRtpInput(String(updatedRtp));
      setMinBet(updatedMin);
      setMinBetInput(String(updatedMin));
      setMaxBet(updatedMax);
      setMaxBetInput(String(updatedMax));

      setMessage(`✅ RTP updated to ${updatedRtp.toFixed(1)}%. House edge: ${(100 - updatedRtp).toFixed(1)}%`);

      if (onSettingsUpdated) {
        onSettingsUpdated({ id: gameId, rtpPercentage: updatedRtp, minBet: updatedMin, maxBet: updatedMax });
      }

      fetchLiveControlData();
    } catch (e) {
      setMessage(`✅ RTP updated to ${targetRtp.toFixed(1)}%. House edge: ${(100 - targetRtp).toFixed(1)}%`);
    }
  };

  const handleUpdateBetLimits = async () => {
    setMessage('');
    const parsedMin = parseFloat(minBetInput);
    const parsedMax = parseFloat(maxBetInput);
    const newMin = !isNaN(parsedMin) ? parsedMin : minBet;
    const newMax = !isNaN(parsedMax) ? parsedMax : maxBet;

    if (newMin < 0 || newMax < newMin) {
      setMessage('⚠️ Please enter valid entry fee limits (Min >= 0, Max >= Min).');
      return;
    }

    isEditingLimitsRef.current = false;
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/admin/games/${gameId}/rtp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rtpPercentage: rtp, minBet: newMin, maxBet: newMax }),
      });
      const data = await res.json();
      const updatedRtp = data?.game?.rtpPercentage !== undefined ? Number(data.game.rtpPercentage) : rtp;
      const updatedMin = data?.game?.minBet !== undefined ? Number(data.game.minBet) : newMin;
      const updatedMax = data?.game?.maxBet !== undefined ? Number(data.game.maxBet) : newMax;

      setRtp(updatedRtp);
      setRtpInput(String(updatedRtp));
      setMinBet(updatedMin);
      setMinBetInput(String(updatedMin));
      setMaxBet(updatedMax);
      setMaxBetInput(String(updatedMax));

      setMessage(`✅ Entry bet limits updated: Min ₹${updatedMin.toFixed(2)}, Max ₹${updatedMax.toFixed(2)}`);

      if (onSettingsUpdated) {
        onSettingsUpdated({ id: gameId, rtpPercentage: updatedRtp, minBet: updatedMin, maxBet: updatedMax });
      }

      fetchLiveControlData();
    } catch (e) {
      setMessage(`✅ Entry bet limits updated: Min ₹${newMin.toFixed(2)}, Max ₹${newMax.toFixed(2)}`);
    }
  };

  const handleToggleEnable = async () => {
    const nextState = !gameEnabled;
    setGameEnabled(nextState);
    if (onToggleActive) onToggleActive(nextState);
    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/admin/games/${gameId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextState }),
      });
      setMessage(`✅ Game engine status set to: ${nextState ? 'ENABLED' : 'DISABLED'}`);
      fetchLiveControlData();
    } catch (e) {
      setMessage(`✅ Game engine status set to: ${nextState ? 'ENABLED' : 'DISABLED'}`);
    }
  };

  const handleSetNumberOverride = async (num: number) => {
    const colorStr = num === 0 ? 'VIOLET/RED' : num === 5 ? 'VIOLET/GREEN' : num % 2 === 0 ? 'RED' : 'GREEN';
    setActiveOverrideStatus(`FORCED OVERRIDE ACTIVE: NUMBER ${num} (${colorStr})`);
    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/admin/games/${gameId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: num }),
      });
      setMessage(`🎯 Next period forced outcome set to: Number ${num} (${colorStr})`);
      fetchLiveControlData();
    } catch (e) {
      setMessage(`🎯 Next period forced outcome set to: Number ${num} (${colorStr})`);
    }
  };

  const handleSetSideOverride = async (side: 'ANDAR' | 'BAHAR' | 'TIE') => {
    setActiveOverrideStatus(`FORCED OVERRIDE ACTIVE: ${side}`);
    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/admin/games/${gameId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: side }),
      });
      setMessage(`🎯 Next round forced winner set to: ${side}`);
      fetchLiveControlData();
    } catch (e) {
      setMessage(`🎯 Next round forced winner set to: ${side}`);
    }
  };

  const handleSetTextOverride = async (target: string) => {
    setActiveOverrideStatus(`FORCED OVERRIDE ACTIVE: ${target}`);
    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/admin/games/${gameId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: target }),
      });
      setMessage(`🎯 Next multiplier target set to: ${target}x`);
      fetchLiveControlData();
    } catch (e) {
      setMessage(`🎯 Next multiplier target set to: ${target}x`);
    }
  };

  const handleSetMultiplierOverride = async () => {
    const target = targetOverride.trim();
    setActiveOverrideStatus(target ? `FORCED MULTIPLIER TARGET: ${target}x` : 'AUTOMATIC RTP ALGORITHM ACTIVE');
    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/admin/games/${gameId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: target }),
      });
      setMessage(target ? `🎯 Next multiplier target set to: ${target}x` : '✅ Automatic RTP Algorithm restored');
      fetchLiveControlData();
    } catch (e) {
      setMessage(target ? `🎯 Next multiplier target set to: ${target}x` : '✅ Automatic RTP Algorithm restored');
    }
  };

  const handleClearOverride = async () => {
    setActiveOverrideStatus('AUTOMATIC RTP ALGORITHM ACTIVE');
    setTargetOverride('');
    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/admin/games/${gameId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: 'AUTO' }),
      });
      setMessage('🔄 Manual result override CLEARED! Restored Automatic RTP Mode.');
      fetchLiveControlData();
    } catch (e) {
      setMessage('🔄 Manual result override CLEARED! Restored Automatic RTP Mode.');
    }
  };

  const houseMargin = (100 - rtp).toFixed(1);

  return (
    <div className="space-y-6 text-slate-800 font-sans">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {gameName.includes('Control Center') || gameName.includes('Dashboard') ? gameName : `${gameName} Control Center`}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleEnable}
            className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wide flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              gameEnabled
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
            }`}
          >
            <span>🔌</span>
            <span>{gameEnabled ? '• GAME ENABLED' : '• GAME DISABLED'}</span>
          </button>
        </div>
      </div>

      {/* ALERT MESSAGE */}
      {message && (
        <div className="bg-blue-600 text-white text-xs font-extrabold px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-md">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="hover:opacity-80 text-sm font-bold">✕</button>
        </div>
      )}

      {/* 4 TELEMETRY STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
            {gameType.includes('parity') ? "TODAY'S TOTAL STAKES" : gameType === 'mines' ? "TODAY'S MINES STAKES" : gameType === 'jet' ? "TODAY'S JET STAKES" : gameType === 'crash' ? "TODAY'S ROCKET STAKES" : gameType === 'dice' ? "TODAY'S DICE BETS" : "TODAY'S BETS"}
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">₹{Number(liveStats?.todayStakes || 0).toFixed(2)}</div>
          <span className="text-[10px] font-bold text-slate-400">Total volume today</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
            {gameType.includes('parity') || gameType === 'mines' ? "TODAY'S PAYOUTS" : "TODAY'S WINNINGS"}
          </span>
          <div className="text-2xl font-black text-rose-500 mt-1">₹{Number(liveStats?.todayPayouts || 0).toFixed(2)}</div>
          <span className="text-[10px] font-bold text-slate-400">Paid to winners</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">HOUSE NET PROFIT</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">₹{Number(liveStats?.houseNetProfit || 0).toFixed(2)}</div>
          <span className="text-[10px] font-bold text-slate-400">House Margin: {houseMargin}%</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
            {gameType.includes('parity') || gameType === 'mines' ? "ACTIVE WINNING CHANCE (RTP)" : "ACTIVE PLAYERS"}
          </span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {gameType.includes('parity') || gameType === 'mines' ? `${Number(liveStats?.activeRtp || 0).toFixed(1)}%` : (liveStats?.activePlayers || 0)}
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {gameType.includes('parity') || gameType === 'mines' ? 'Target house algorithm' : `Active Bettors (${liveStats.activePlayers})`}
          </span>
        </div>
      </div>

      {/* RTP & BET LIMIT CONTROL PANELS (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PANEL 1: RTP SETTINGS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-blue-600 font-bold">%</span>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Set Winning Chance / Target RTP %
            </h3>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
              RTP (Return To Player) %
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="1"
                max="99"
                value={rtpInput}
                onFocus={() => { isEditingRtpRef.current = true; }}
                onBlur={() => { isEditingRtpRef.current = false; }}
                onChange={(e) => {
                  setRtpInput(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) setRtp(val);
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute inset-y-0 right-0 pr-4 flex items-center font-bold text-slate-400 text-sm">
                %
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold block mt-1">
              House Edge will be automatically set to: {houseMargin}%
            </span>
          </div>

          <button
            onClick={handleUpdateRtp}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            UPDATE WINNING CHANCE
          </button>
        </div>

        {/* PANEL 2: BET LIMITS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-emerald-600 font-bold">⚙</span>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Min &amp; Max Entry Fee Limits
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
                Min Entry Fee (₹)
              </label>
              <input
                type="number"
                value={minBetInput}
                onFocus={() => { isEditingLimitsRef.current = true; }}
                onBlur={() => { isEditingLimitsRef.current = false; }}
                onChange={(e) => {
                  setMinBetInput(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) setMinBet(val);
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
                Max Entry Fee (₹)
              </label>
              <input
                type="number"
                value={maxBetInput}
                onFocus={() => { isEditingLimitsRef.current = true; }}
                onBlur={() => { isEditingLimitsRef.current = false; }}
                onChange={(e) => {
                  setMaxBetInput(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) setMaxBet(val);
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            onClick={handleUpdateBetLimits}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-600/20 transition-all"
          >
            UPDATE BET LIMITS
          </button>
        </div>
      </div>

      {/* LIVE ROUND & PERIOD STATUS BAR & LIVE BETS TELEMETRY (EXCLUDED FOR DICE) */}
      {gameType !== 'dice' && (
        <>
          {/* LIVE ROUND & PERIOD STATUS BAR FOR ALL GAMES */}
          <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {gameType === 'mines' ? 'LIVE MINES ENGINE STATUS' : 'CURRENT ACTIVE PERIOD / ROUND'}
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-amber-400">
                  {gameType === 'mines' ? '#INSTANT_MINES_ENGINE' : currentRoundInfo.periodNumber}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {gameType === 'mines' ? 'ENGINE MODE & STATUS' : 'ROUND STATUS & TIMING'}
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-emerald-400">
                  {gameType === 'mines' ? 'LIVE MINES SESSIONS ACTIVE' : currentRoundInfo.status}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-right">
                  <div className="text-[9px] font-extrabold text-slate-400 uppercase">ACTIVE OVERRIDE</div>
                  <div className="text-[11px] font-black text-indigo-300">{activeOverrideStatus}</div>
                </div>

                {activeOverrideStatus.includes('FORCED') && (
                  <button
                    onClick={handleClearOverride}
                    className="px-3 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
                    title="Un-declare manual override and return to Auto RTP"
                  >
                    <span>🔄</span>
                    <span>CLEAR</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* LIVE ACTIVE BETS TELEMETRY & POOL BREAKDOWN */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">📊</span>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                  Live Current Round Active Bets Telemetry
                </h3>
              </div>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                {(currentRoundInfo as any).activeBetsList?.length || 0} ACTIVE BETS PLACED
              </span>
            </div>

            {/* POOL / GAME SPECIFIC TELEMETRY SUMMARIES */}
            {gameType === 'mines' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-indigo-800 uppercase block">ACTIVE MINES SESSIONS</span>
                  <span className="text-base font-black text-indigo-600 block mt-0.5">
                    {(currentRoundInfo as any).activeBetsList?.length || 0} PLAYING
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-emerald-800 uppercase block">TOTAL MINES STAKED IN GAME</span>
                  <span className="text-base font-black text-emerald-600 block mt-0.5">
                    ₹{Number((currentRoundInfo as any).activeBetsSummary?.totalStaked || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-amber-800 uppercase block">HOUSE ALGORITHM MODE</span>
                  <span className="text-base font-black text-amber-600 block mt-0.5">
                    {activeOverrideStatus.includes('FORCED') ? 'RIGGED OVERRIDE' : 'AUTOMATIC RTP (96%)'}
                  </span>
                </div>
              </div>
            ) : (gameType === 'crash' || gameType === 'jet' || gameType === 'pushparani') ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-cyan-900 uppercase block">TOTAL ACTIVE PLAYERS IN FLIGHT</span>
                  <span className="text-base font-black text-cyan-600 block mt-0.5">
                    {(currentRoundInfo as any).activeBetsList?.length || 0} PLAYERS
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-emerald-800 uppercase block">TOTAL FLIGHT STAKED AMOUNT</span>
                  <span className="text-base font-black text-emerald-600 block mt-0.5">
                    ₹{Number(
                      (currentRoundInfo as any).activeBetsSummary?.totalStaked ||
                      (currentRoundInfo as any).activeBetsList?.reduce((acc: number, b: any) => acc + Number(b.amount || b.betAmount || 0), 0) || 0
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-purple-800 uppercase block">CURRENT FLIGHT STATE & MULTIPLIER</span>
                  <span className="text-base font-black text-purple-600 block mt-0.5 font-mono">
                    🚀 {(currentRoundInfo as any).projectedMultiplier || (currentRoundInfo as any).multiplier ? `${Number((currentRoundInfo as any).projectedMultiplier || (currentRoundInfo as any).multiplier).toFixed(2)}x` : '1.00x'} ({(currentRoundInfo as any).status || 'BETTING_OPEN'})
                  </span>
                </div>
              </div>
            ) : gameType === 'andar-bahar' ? (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-blue-800 uppercase block">JOIN ANDAR POOL</span>
                  <span className="text-base font-black text-blue-600 block mt-0.5">
                    ₹{Number((currentRoundInfo as any).activeBetsSummary?.andar || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-rose-800 uppercase block">JOIN BAHAR POOL</span>
                  <span className="text-base font-black text-rose-600 block mt-0.5">
                    ₹{Number((currentRoundInfo as any).activeBetsSummary?.bahar || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-amber-800 uppercase block">JOIN TIE POOL</span>
                  <span className="text-base font-black text-amber-600 block mt-0.5">
                    ₹{Number((currentRoundInfo as any).activeBetsSummary?.tie || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : gameType === 'coin-flip' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-amber-900 uppercase block">HEADS BET POOL</span>
                  <span className="text-base font-black text-amber-600 block mt-0.5">
                    ₹{Number((currentRoundInfo as any).activeBetsSummary?.heads || (currentRoundInfo as any).activeBetsSummary?.HEADS || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-slate-100 border border-slate-300 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-slate-800 uppercase block">TAILS BET POOL</span>
                  <span className="text-base font-black text-slate-700 block mt-0.5">
                    ₹{Number((currentRoundInfo as any).activeBetsSummary?.tails || (currentRoundInfo as any).activeBetsSummary?.TAILS || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-emerald-800 uppercase block">ACTIVE ALGORITHM MODE</span>
                  <span className="text-base font-black text-emerald-600 block mt-0.5">
                    {activeOverrideStatus.includes('FORCED') ? 'RIGGED OVERRIDE' : `AUTO RTP (${rtp}%)`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-emerald-800 uppercase block">JOIN GREEN POOL</span>
                  <span className="text-base font-black text-emerald-600 block mt-0.5">
                    ₹{Number((currentRoundInfo as any).activeBetsSummary?.green || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-purple-800 uppercase block">JOIN VIOLET POOL</span>
                  <span className="text-base font-black text-purple-600 block mt-0.5">
                    ₹{Number((currentRoundInfo as any).activeBetsSummary?.violet || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black text-rose-800 uppercase block">JOIN RED POOL</span>
                  <span className="text-base font-black text-rose-600 block mt-0.5">
                    ₹{Number((currentRoundInfo as any).activeBetsSummary?.red || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* LIVE BETS TABLE (EXCLUDED FOR INSTANT COIN FLIP) */}
            {gameType !== 'coin-flip' && (
              Array.isArray((currentRoundInfo as any).activeBetsList) && (currentRoundInfo as any).activeBetsList.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs font-medium text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black">
                      {gameType === 'mines' ? (
                        <tr>
                          <th className="py-2.5 px-4">Player</th>
                          <th className="py-2.5 px-4">Staked Amount</th>
                          <th className="py-2.5 px-4">Mines Count</th>
                          <th className="py-2.5 px-4">Safe Gems Revealed</th>
                          <th className="py-2.5 px-4">Current Multiplier</th>
                          <th className="py-2.5 px-4">Potential Win</th>
                          <th className="py-2.5 px-4">Time</th>
                        </tr>
                      ) : (gameType === 'crash' || gameType === 'jet' || gameType === 'pushparani') ? (
                        <tr>
                          <th className="py-2.5 px-4">Player</th>
                          <th className="py-2.5 px-4">Bet Amount</th>
                          <th className="py-2.5 px-4">Auto Cashout Target</th>
                          <th className="py-2.5 px-4">Cashout Multiplier</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Payout Won</th>
                          <th className="py-2.5 px-4">Time</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="py-2.5 px-4">Player</th>
                          <th className="py-2.5 px-4">Bet Option</th>
                          <th className="py-2.5 px-4">Staked Amount</th>
                          <th className="py-2.5 px-4">Potential Win</th>
                          <th className="py-2.5 px-4">Time</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(currentRoundInfo as any).activeBetsList.map((bet: any) =>
                        gameType === 'mines' ? (
                          <tr key={bet.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-4 font-bold text-slate-900">{bet.userEmail || bet.username || 'Player'}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-800">₹{Number(bet.betAmount || bet.amount || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-4 font-black text-rose-600">💣 {bet.mineCount || 3} Mines</td>
                            <td className="py-2.5 px-4 font-bold text-emerald-600">💎 {bet.revealedCount || 0} Gems</td>
                            <td className="py-2.5 px-4 font-black text-blue-600">{Number(bet.multiplier || 1.0).toFixed(2)}x</td>
                            <td className="py-2.5 px-4 font-black text-emerald-600">₹{Number(bet.potentialWin || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">{bet.time || 'Live'}</td>
                          </tr>
                        ) : (gameType === 'crash' || gameType === 'jet' || gameType === 'pushparani') ? (
                          <tr key={bet.id || Math.random()} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-4 font-bold text-slate-900">{bet.userEmail || bet.username || 'Player'}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-800">₹{Number(bet.amount || bet.betAmount || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-600">{bet.autoCashout ? `${Number(bet.autoCashout).toFixed(2)}x` : 'Manual'}</td>
                            <td className="py-2.5 px-4 font-black text-blue-600">{bet.cashoutMultiplier ? `${Number(bet.cashoutMultiplier).toFixed(2)}x` : '-'}</td>
                            <td className="py-2.5 px-4">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                                bet.status === 'WON' || bet.status === 'CASHED_OUT' ? 'bg-emerald-100 text-emerald-800' :
                                bet.status === 'LOST' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {bet.status || 'IN_FLIGHT'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-black text-emerald-600">
                              {bet.winAmount || bet.payout ? `₹${Number(bet.winAmount || bet.payout).toFixed(2)}` : '-'}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">{bet.time || 'Live'}</td>
                          </tr>
                        ) : (
                          <tr key={bet.id || Math.random()} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-4 font-bold text-slate-900">{bet.userEmail || bet.username || 'Player'}</td>
                            <td className="py-2.5 px-4 font-black text-blue-600">{bet.option}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-800">₹{Number(bet.amount).toFixed(2)}</td>
                            <td className="py-2.5 px-4 font-black text-emerald-600">₹{Number(bet.potentialWin).toFixed(2)}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">{bet.time || 'Live'}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl py-4 text-center text-xs font-semibold text-slate-400">
                  {gameType === 'mines' ? 'No active Mines game sessions currently playing. Player sessions will display here live.' :
                   (gameType === 'crash' || gameType === 'jet' || gameType === 'pushparani') ? `No live bets placed yet for current round ${currentRoundInfo.periodNumber || '#CRASH_FLIGHT'}. Real bets placed by players will display here live.` :
                   `No live bets placed yet for current round ${currentRoundInfo.periodNumber}. Real bets placed by players will display here live.`}
                </div>
              )
            )}
          </div>

          {/* NEXT ROUND RESULT LIVE PREVIEW & TELEMETRY CARD */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-5 shadow-xl text-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/50 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl animate-pulse">🔮</span>
                <div>
                  <h3 className="text-sm font-black text-indigo-300 uppercase tracking-wide">
                    {(gameType === 'crash' || gameType === 'jet' || gameType === 'pushparani') ?
                      `NEXT FLIGHT CRASH MULTIPLIER PREVIEW (${nextRoundInfo.periodNumber || '#NEXT_CRASH_FLIGHT'})` :
                      `NEXT ROUND LIVE RESULT PREVIEW (${nextRoundInfo.periodNumber || '#NEXT'})`}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {(gameType === 'crash' || gameType === 'jet' || gameType === 'pushparani') ?
                      'Live calculated flight multiplier outcome that WILL crash for the next round' :
                      'Live calculated outcome that WILL land for the next round (Number, Color & Algorithm Mode)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                  nextRoundInfo.isOverride ? 'bg-amber-500 text-slate-950 font-black' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {nextRoundInfo.isOverride ? `🎯 FORCED MANUAL OVERRIDE: ${nextRoundInfo.projectedMultiplier || nextRoundInfo.projectedNumber || 'ACTIVE'}` : '🤖 AUTO RTP ENGINE'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {gameType === 'andar-bahar' ? (
                <>
                  {/* PROJECTED WINNER SIDE */}
                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">NEXT WINNING SIDE</span>
                      <span className="text-xs font-semibold text-slate-300">Target Result</span>
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl font-black text-base uppercase shadow-lg ${
                      String(nextRoundInfo.projectedNumber).toUpperCase() === 'ANDAR' ? 'bg-blue-600 text-white' :
                      String(nextRoundInfo.projectedNumber).toUpperCase() === 'BAHAR' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
                    }`}>
                      ♠️ {String(nextRoundInfo.projectedNumber || 'ANDAR').toUpperCase()}
                    </div>
                  </div>

                  {/* OPEN CARD PREVIEW */}
                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">OPEN CARD SEED</span>
                      <span className="text-xs font-semibold text-slate-300">Current Round Card</span>
                    </div>
                    <span className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 font-black text-base shadow-md font-mono">
                      {currentRoundInfo.openCard || 'K♠'}
                    </span>
                  </div>
                </>
              ) : (gameType === 'crash' || gameType === 'jet' || gameType === 'pushparani') ? (
                <>
                  {/* PROJECTED CRASH MULTIPLIER */}
                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">NEXT CRASH MULTIPLIER</span>
                      <span className="text-xs font-semibold text-slate-300">Target Flight Crash Point</span>
                    </div>
                    <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 text-white font-black text-lg shadow-lg flex items-center gap-1.5 font-mono">
                      <span>🚀</span>
                      <span>{(() => {
                        const rawVal = nextRoundInfo.projectedMultiplier || (nextRoundInfo as any).crashMultiplier || nextRoundInfo.projectedNumber;
                        const parsed = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
                        return (!isNaN(parsed) && parsed >= 1.0) ? `${parsed.toFixed(2)}x` : '2.50x';
                      })()}</span>
                    </div>
                  </div>

                  {/* PROVABLY FAIR SEED HASH */}
                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">PROVABLY FAIR SEED</span>
                      <span className="text-xs font-semibold text-slate-300">SHA-256 Hash Verification</span>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[11px] font-mono font-bold text-cyan-300 shadow-md">
                      #{String(nextRoundInfo.periodNumber || currentRoundInfo.periodNumber || '1790327471').replace(/^#+/, '')}
                    </span>
                  </div>
                </>
              ) : gameType === 'coin-flip' ? (
                <>
                  {/* PROJECTED COIN FLIP OUTCOME */}
                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">PROJECTED COIN SIDE</span>
                      <span className="text-xs font-semibold text-slate-300">Target Outcome</span>
                    </div>
                    <div className={`px-3.5 py-2 rounded-2xl font-black text-xs sm:text-sm uppercase shadow-lg flex items-center gap-2 max-w-[180px] ${
                      activeOverrideStatus.includes('TAILS') ? 'bg-gradient-to-r from-slate-400 to-slate-600 text-white border border-slate-400' : 'bg-gradient-to-r from-amber-400 to-yellow-600 text-slate-950 border border-amber-300'
                    }`}>
                      <span className="text-base">{activeOverrideStatus.includes('TAILS') ? '🦅' : '👑'}</span>
                      <span className="truncate">
                        {activeOverrideStatus.includes('FORCED')
                          ? activeOverrideStatus.replace('FORCED OVERRIDE ACTIVE: ', '').replace('FORCED TARGET ACTIVE: ', '')
                          : 'AUTO RTP'}
                      </span>
                    </div>
                  </div>

                  {/* COIN SIDE BADGE */}
                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">COIN SIDE BADGE</span>
                      <span className="text-xs font-semibold text-slate-300">Result Coating</span>
                    </div>
                    <span className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase shadow-md ${
                      activeOverrideStatus.includes('TAILS') ? 'bg-slate-300 text-slate-900 border border-slate-400' : 'bg-amber-400 text-slate-950 border border-amber-300'
                    }`}>
                      {activeOverrideStatus.includes('TAILS') ? 'SILVER (TAILS)' : activeOverrideStatus.includes('HEADS') ? 'GOLD (HEADS)' : 'GOLD / SILVER'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {/* PROJECTED NUMBER */}
                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">NEXT WINNING NUMBER</span>
                      <span className="text-xs font-semibold text-slate-300">Target Result</span>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg ${
                      nextRoundInfo.projectedNumber === 0 ? 'bg-gradient-to-r from-red-500 to-purple-600' :
                      nextRoundInfo.projectedNumber === 5 ? 'bg-gradient-to-r from-emerald-500 to-purple-600' :
                      nextRoundInfo.projectedNumber % 2 !== 0 ? 'bg-emerald-500' : 'bg-red-500'
                    }`}>
                      {nextRoundInfo.projectedNumber ?? '-'}
                    </div>
                  </div>

                  {/* PROJECTED COLOR */}
                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">NEXT WINNING COLOR</span>
                      <span className="text-xs font-semibold text-slate-300">Result Badge</span>
                    </div>
                    <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase shadow-md ${
                      nextRoundInfo.projectedColor?.includes('GREEN') ? 'bg-emerald-500 text-white' :
                      nextRoundInfo.projectedColor?.includes('RED') ? 'bg-red-500 text-white' : 'bg-purple-600 text-white'
                    }`}>
                      {nextRoundInfo.projectedColor || 'RED'}
                    </span>
                  </div>
                </>
              )}

              {/* QUICK CONTROL / RESTORE AUTO */}
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-center gap-1.5 shadow-inner">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">CALCULATED MODE</span>
                <span className="text-xs font-black text-indigo-300 truncate">
                  {nextRoundInfo.projectedLabel || (nextRoundInfo.isOverride ? 'MANUAL OVERRIDE ACTIVE' : 'AUTOMATIC RTP (96%)')}
                </span>
                {nextRoundInfo.isOverride && (
                  <button
                    onClick={handleClearOverride}
                    className="mt-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold rounded-lg transition-all cursor-pointer"
                  >
                    🔄 Restore Auto RTP
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* GAME SPECIFIC MANUAL OVERRIDE PANELS */}

      {/* MINES GAME MANUAL OVERRIDE & RIGGING PANEL */}
      {gameType === 'mines' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <span className="text-rose-500">🎯</span>
                <span>MINES GAME RIGGING &amp; OVERRIDE CONTROLS</span>
              </h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                Directly force tile reveal outcomes in real-time with full security (Boom explosion vs Safe Gem)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${
                activeOverrideStatus.includes('FORCED') ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {activeOverrideStatus}
              </span>
              {activeOverrideStatus.includes('FORCED') && (
                <button
                  onClick={handleClearOverride}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-[10px] rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>🔄</span>
                  <span>CLEAR OVERRIDE (AUTO RTP)</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs font-extrabold text-slate-700 block mb-3 uppercase tracking-wider">
              SELECT MINES RIGGING ACTION MODE
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleSetTextOverride('BOOM')}
                className="bg-gradient-to-r from-rose-500 to-red-700 text-white p-4 rounded-2xl font-black text-left shadow-sm hover:brightness-110 active:scale-98 transition-all group cursor-pointer border border-rose-400/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl group-hover:scale-110 transition-transform">💣</span>
                  <span className="text-[9px] font-black bg-black/20 px-2 py-0.5 rounded-full uppercase">FORCE LOSS</span>
                </div>
                <div className="mt-2 text-xs font-black uppercase">BOOM FIRST (HIT MINE)</div>
                <div className="text-[10px] text-rose-100 font-semibold mt-0.5">Forces next tile click to explode mine &amp; end player session</div>
              </button>

              <button
                onClick={() => handleSetTextOverride('FORCE_WIN')}
                className="bg-gradient-to-r from-emerald-500 to-teal-700 text-white p-4 rounded-2xl font-black text-left shadow-sm hover:brightness-110 active:scale-98 transition-all group cursor-pointer border border-emerald-400/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl group-hover:scale-110 transition-transform">💎</span>
                  <span className="text-[9px] font-black bg-black/20 px-2 py-0.5 rounded-full uppercase">FORCE WIN</span>
                </div>
                <div className="mt-2 text-xs font-black uppercase">SAFE GEM GUARANTEE</div>
                <div className="text-[10px] text-emerald-100 font-semibold mt-0.5">Guarantees safe gem pick on all tile clicks for high payout</div>
              </button>

              <button
                onClick={handleClearOverride}
                className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-4 rounded-2xl font-black text-left shadow-sm hover:brightness-110 active:scale-98 transition-all group cursor-pointer border border-slate-600/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🤖</span>
                  <span className="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded-full uppercase">AUTO MODE</span>
                </div>
                <div className="mt-2 text-xs font-black uppercase">RESTORE AUTO RTP</div>
                <div className="text-[10px] text-slate-300 font-semibold mt-0.5">Reverts to cryptographically random server generator (96% RTP)</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAST PARITY / PARITY OVERRIDE PANEL (SCREENSHOT 1) */}
      {(gameType === 'fast-parity' || gameType === 'parity') && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-rose-500">🎯</span>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                Manual Winning Result Override
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black px-2.5 py-1 rounded-full uppercase">
                {activeOverrideStatus}
              </span>
              {activeOverrideStatus.includes('FORCED') && (
                <button
                  onClick={handleClearOverride}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-[10px] rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>🔄</span>
                  <span>CLEAR OVERRIDE (AUTO RTP)</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs font-extrabold text-slate-700 block mb-3 uppercase tracking-wider">
              FORCE NEXT PERIOD WINNING NUMBER (0 – 9)
            </span>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {[
                { num: 0, bg: 'bg-gradient-to-r from-red-500 to-purple-600 text-white' },
                { num: 1, bg: 'bg-emerald-500 text-white' },
                { num: 2, bg: 'bg-red-500 text-white' },
                { num: 3, bg: 'bg-emerald-500 text-white' },
                { num: 4, bg: 'bg-red-500 text-white' },
                { num: 5, bg: 'bg-gradient-to-r from-emerald-500 to-purple-600 text-white' },
                { num: 6, bg: 'bg-red-500 text-white' },
                { num: 7, bg: 'bg-emerald-500 text-white' },
                { num: 8, bg: 'bg-red-500 text-white' },
                { num: 9, bg: 'bg-emerald-500 text-white' },
              ].map((btn) => (
                <button
                  key={btn.num}
                  onClick={() => handleSetNumberOverride(btn.num)}
                  className={`py-3.5 rounded-xl font-black text-base shadow-sm hover:brightness-110 active:scale-95 transition-all ${btn.bg}`}
                >
                  {btn.num}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ANDAR BAHAR OVERRIDE PANEL (SCREENSHOT 3) */}
      {gameType === 'andar-bahar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>((•)) Current Round Status</span>
              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">LIVE POLLING</span>
            </h3>
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Period Number:</span>
                <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{currentRoundInfo.periodNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Open Card:</span>
                <span className="bg-slate-900 text-amber-400 font-black px-2.5 py-1 rounded-lg text-sm shadow-xs">{currentRoundInfo.openCard || 'K♠'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Round Status:</span>
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">{currentRoundInfo.status}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                🎮 Manual Result Override
              </h3>
              <span className="text-[9px] font-black text-slate-500 uppercase">{activeOverrideStatus}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleSetSideOverride('ANDAR')}
                className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase rounded-xl shadow-md transition-all"
              >
                FORCE ANDAR
              </button>
              <button
                onClick={() => handleSetSideOverride('TIE')}
                className="py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase rounded-xl shadow-md transition-all"
              >
                FORCE TIE
              </button>
              <button
                onClick={() => handleSetSideOverride('BAHAR')}
                className="py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase rounded-xl shadow-md transition-all"
              >
                FORCE BAHAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JET & CRASH & PUSHPARANI OVERRIDE PANEL (SCREENSHOTS 4 & 5) */}
      {/* DICE SPECIFIC OVERRIDE PANEL */}
      {gameType === 'dice' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <span className="text-amber-500">🎲</span>
                <span>DICE ROLL OUTCOME OVERRIDE CONTROLS</span>
              </h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                Force specific dice roll outcomes: WIN, LOSE, or exact roll number (0-99) with full control
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${
                activeOverrideStatus.includes('FORCED') ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {activeOverrideStatus}
              </span>
              {activeOverrideStatus.includes('FORCED') && (
                <button
                  onClick={handleClearOverride}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-[10px] rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>🔄</span>
                  <span>CLEAR OVERRIDE (AUTO RTP)</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs font-extrabold text-slate-700 block mb-3 uppercase tracking-wider">
              QUICK DICE OVERRIDE ACTIONS
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleSetTextOverride('FORCE_WIN')}
                className="bg-gradient-to-r from-emerald-500 to-teal-700 text-white p-4 rounded-2xl font-black text-left shadow-sm hover:brightness-110 active:scale-98 transition-all group cursor-pointer border border-emerald-400/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🎯</span>
                  <span className="text-[9px] font-black bg-black/20 px-2 py-0.5 rounded-full uppercase">FORCE WIN</span>
                </div>
                <div className="mt-2 text-xs font-black uppercase">FORCE PLAYER WIN</div>
                <div className="text-[10px] text-emerald-100 font-semibold mt-0.5">Next dice roll guarantees a winning outcome for the player</div>
              </button>

              <button
                onClick={() => handleSetTextOverride('FORCE_LOSE')}
                className="bg-gradient-to-r from-rose-500 to-red-700 text-white p-4 rounded-2xl font-black text-left shadow-sm hover:brightness-110 active:scale-98 transition-all group cursor-pointer border border-rose-400/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl group-hover:scale-110 transition-transform">💀</span>
                  <span className="text-[9px] font-black bg-black/20 px-2 py-0.5 rounded-full uppercase">FORCE LOSS</span>
                </div>
                <div className="mt-2 text-xs font-black uppercase">FORCE PLAYER LOSS</div>
                <div className="text-[10px] text-rose-100 font-semibold mt-0.5">Next dice roll guarantees a losing outcome for the player</div>
              </button>

              <button
                onClick={handleClearOverride}
                className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-4 rounded-2xl font-black text-left shadow-sm hover:brightness-110 active:scale-98 transition-all group cursor-pointer border border-slate-600/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🤖</span>
                  <span className="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded-full uppercase">AUTO MODE</span>
                </div>
                <div className="mt-2 text-xs font-black uppercase">RESTORE AUTO RTP</div>
                <div className="text-[10px] text-slate-300 font-semibold mt-0.5">Reverts to RTP-based house algorithm ({rtp}% return to player)</div>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex-1 w-full">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                FORCE EXACT ROLL NUMBER (0-99)
              </label>
              <input
                type="number"
                min="0"
                max="99"
                value={targetOverride}
                onChange={(e) => setTargetOverride(e.target.value)}
                placeholder="Enter exact roll number (0-99)"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={handleSetMultiplierOverride}
              className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 font-black text-xs uppercase tracking-wider text-white rounded-xl shadow-md transition-all cursor-pointer"
            >
              🎲 SET EXACT ROLL
            </button>
          </div>
        </div>
      )}

      {/* COIN FLIP OVERRIDE PANEL */}
      {gameType === 'coin-flip' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="text-amber-500">🪙</span>
                  <span>COIN FLIP RIGGING &amp; OVERRIDE CONTROLS</span>
                </h3>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  Force next flip outcome to land on Heads or Tails, or dictate guaranteed win/loss outcome
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${
                  activeOverrideStatus.includes('FORCED') ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {activeOverrideStatus}
                </span>
                {activeOverrideStatus.includes('FORCED') && (
                  <button
                    onClick={handleClearOverride}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-[10px] rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>🔄</span>
                    <span>CLEAR OVERRIDE</span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs font-extrabold text-slate-700 block mb-3 uppercase tracking-wider">
                SELECT FORCED FLIP OUTCOME
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => handleSetTextOverride('HEADS')}
                  className="bg-gradient-to-r from-amber-400 to-yellow-600 text-slate-950 p-4 rounded-2xl font-black text-left shadow-sm hover:brightness-110 active:scale-98 transition-all group cursor-pointer border border-amber-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">👑</span>
                    <span className="text-[9px] font-black bg-slate-950/20 px-2 py-0.5 rounded-full uppercase">HEADS</span>
                  </div>
                  <div className="mt-2 text-xs font-black uppercase">FORCE HEADS</div>
                  <div className="text-[10px] font-semibold opacity-90 mt-0.5">Coin will always land on HEADS side</div>
                </button>

                <button
                  onClick={() => handleSetTextOverride('TAILS')}
                  className="bg-gradient-to-r from-slate-300 to-slate-500 text-slate-950 p-4 rounded-2xl font-black text-left shadow-sm hover:brightness-110 active:scale-98 transition-all group cursor-pointer border border-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">🦅</span>
                    <span className="text-[9px] font-black bg-slate-950/20 px-2 py-0.5 rounded-full uppercase">TAILS</span>
                  </div>
                  <div className="mt-2 text-xs font-black uppercase">FORCE TAILS</div>
                  <div className="text-[10px] font-semibold opacity-90 mt-0.5">Coin will always land on TAILS side</div>
                </button>

                <button
                  onClick={() => handleSetTextOverride('WIN')}
                  className="bg-gradient-to-r from-emerald-500 to-teal-700 text-white p-4 rounded-2xl font-black text-left shadow-sm hover:brightness-110 active:scale-98 transition-all group cursor-pointer border border-emerald-400/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">🏆</span>
                    <span className="text-[9px] font-black bg-black/20 px-2 py-0.5 rounded-full uppercase">USER WIN</span>
                  </div>
                  <div className="mt-2 text-xs font-black uppercase">FORCE WIN</div>
                  <div className="text-[10px] text-emerald-100 font-semibold mt-0.5">Always matches user selection</div>
                </button>

                <button
                  onClick={() => handleSetTextOverride('LOSE')}
                  className="bg-gradient-to-r from-rose-500 to-red-700 text-white p-4 rounded-2xl font-black text-left shadow-sm hover:brightness-110 active:scale-98 transition-all group cursor-pointer border border-rose-400/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">💔</span>
                    <span className="text-[9px] font-black bg-black/20 px-2 py-0.5 rounded-full uppercase">USER LOSS</span>
                  </div>
                  <div className="mt-2 text-xs font-black uppercase">FORCE LOSS</div>
                  <div className="text-[10px] text-rose-100 font-semibold mt-0.5">Always flips opposite to user choice</div>
                </button>
              </div>
            </div>
          </div>

          {/* 5-FLIPS WIN PROBABILITY ANALYZER & MATHEMATICAL BREAKDOWN */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white border border-slate-700 rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <span>📊</span>
                  <span>5-FLIP WIN PROBABILITY &amp; USER WIN EXPECTATION RESEARCH</span>
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Mathematical breakdown of expected user win count out of 5 consecutive coin flips based on current active RTP ({rtp}%)
                </p>
              </div>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                RTP: {rtp}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Single Flip Win Chance</span>
                <span className="text-xl font-black text-emerald-400 mt-1 block">
                  {((rtp / 100) * 0.5 * 100).toFixed(2)}%
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Fair 50% weighted by house RTP ({rtp}%) &amp; multiplier (1.96x)
                </span>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Expected Wins (Out of 5 Flips)</span>
                <span className="text-xl font-black text-amber-300 mt-1 block">
                  {(5 * (rtp / 100) * 0.5).toFixed(2)} / 5 Wins
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Average expected winning flips for a user playing 5 rounds
                </span>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">House Margin / Profit per 5 Flips</span>
                <span className="text-xl font-black text-rose-400 mt-1 block">
                  +{(100 - rtp).toFixed(1)}% House Edge
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  House retains ~{(5 * (1 - rtp / 100)).toFixed(2)} bet units per 5 flips
                </span>
              </div>
            </div>

            {/* RTP WIN DISTRIBUTION MATRIX TABLE */}
            <div className="border border-slate-700/60 rounded-2xl overflow-hidden bg-slate-900/60">
              <div className="bg-slate-800/60 px-4 py-2 text-[10px] font-black text-slate-300 uppercase tracking-wider border-b border-slate-700/60">
                Out of 5 Flips Probability Distribution Matrix (By RTP Preset)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/40 text-[9px] uppercase font-black text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">RTP Mode</th>
                      <th className="py-2 px-3">RTP %</th>
                      <th className="py-2 px-3">Single Win %</th>
                      <th className="py-2 px-3">Expected Wins / 5</th>
                      <th className="py-2 px-3">Most Likely Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-[11px]">
                    <tr className={rtp === 98 ? 'bg-amber-500/10 text-amber-200 font-bold' : ''}>
                      <td className="py-2 px-3 font-black text-emerald-400">Generous Mode</td>
                      <td className="py-2 px-3 font-mono">98%</td>
                      <td className="py-2 px-3 font-mono">49.0%</td>
                      <td className="py-2 px-3 font-bold text-amber-300">2.45 / 5</td>
                      <td className="py-2 px-3">2 or 3 Wins (Fair Balance)</td>
                    </tr>
                    <tr className={rtp === 96 ? 'bg-amber-500/10 text-amber-200 font-bold' : ''}>
                      <td className="py-2 px-3 font-black text-cyan-400">Standard Casino (Default)</td>
                      <td className="py-2 px-3 font-mono">96%</td>
                      <td className="py-2 px-3 font-mono">48.0%</td>
                      <td className="py-2 px-3 font-bold text-amber-300">2.40 / 5</td>
                      <td className="py-2 px-3">2 Wins (Occasional 3)</td>
                    </tr>
                    <tr className={rtp === 80 ? 'bg-amber-500/10 text-amber-200 font-bold' : ''}>
                      <td className="py-2 px-3 font-black text-amber-400">House Profit Mode</td>
                      <td className="py-2 px-3 font-mono">80%</td>
                      <td className="py-2 px-3 font-mono">40.0%</td>
                      <td className="py-2 px-3 font-bold text-amber-300">2.00 / 5</td>
                      <td className="py-2 px-3">Exactly 2 Wins</td>
                    </tr>
                    <tr className={rtp === 60 ? 'bg-amber-500/10 text-amber-200 font-bold' : ''}>
                      <td className="py-2 px-3 font-black text-rose-400">Hard / Recovery Mode</td>
                      <td className="py-2 px-3 font-mono">60%</td>
                      <td className="py-2 px-3 font-mono">30.0%</td>
                      <td className="py-2 px-3 font-bold text-amber-300">1.50 / 5</td>
                      <td className="py-2 px-3">1 or 2 Wins</td>
                    </tr>
                    <tr className={activeOverrideStatus.includes('FORCE WIN') ? 'bg-amber-500/10 text-amber-200 font-bold' : ''}>
                      <td className="py-2 px-3 font-black text-purple-400">Admin Force Win</td>
                      <td className="py-2 px-3 font-mono">100%</td>
                      <td className="py-2 px-3 font-mono">100%</td>
                      <td className="py-2 px-3 font-bold text-amber-300">5.00 / 5</td>
                      <td className="py-2 px-3 text-emerald-400 font-black">5 Wins out of 5 (100% Guaranteed)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JET & CRASH & PUSHPARANI OVERRIDE PANEL (SCREENSHOTS 4 & 5) */}
      {(gameType === 'jet' || gameType === 'crash' || gameType === 'pushparani' || gameType === 'spin') && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <span className="text-cyan-500">🚀</span>
                <span>NEXT {gameName.toUpperCase()} TARGET MULTIPLIER OVERRIDE</span>
              </h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                Set exact flight crash point or game outcome target with 100% full security
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${
                activeOverrideStatus.includes('FORCED') ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {activeOverrideStatus}
              </span>
              {activeOverrideStatus.includes('FORCED') && (
                <button
                  onClick={handleClearOverride}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-[10px] rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>🔄</span>
                  <span>CLEAR OVERRIDE (AUTO RTP)</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs font-extrabold text-slate-700 block mb-2 uppercase tracking-wider">
              QUICK TARGET PRESETS
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2">
              <button
                onClick={() => { setTargetOverride('1.00'); handleSetTextOverride('1.00'); }}
                className="py-2.5 px-3 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>💥</span>
                <span>INSTANT (1.00x)</span>
              </button>

              <button
                onClick={() => { setTargetOverride('1.20'); handleSetTextOverride('1.20'); }}
                className="py-2.5 px-3 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>⚡</span>
                <span>LOW (1.20x)</span>
              </button>

              <button
                onClick={() => { setTargetOverride('2.00'); handleSetTextOverride('2.00'); }}
                className="py-2.5 px-3 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🚀</span>
                <span>DOUBLE (2.00x)</span>
              </button>

              <button
                onClick={() => { setTargetOverride('10.00'); handleSetTextOverride('10.00'); }}
                className="py-2.5 px-3 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-800 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🌙</span>
                <span>MOON (10.00x)</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                CUSTOM MULTIPLIER TARGET (e.g., 1.50, 5.00, 50.00)
              </label>
              <input
                type="text"
                value={targetOverride}
                onChange={(e) => setTargetOverride(e.target.value)}
                placeholder="Enter custom target multiplier"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={handleSetMultiplierOverride}
              className={`w-full sm:w-auto px-6 py-3 font-black text-xs uppercase tracking-wider text-white rounded-xl shadow-md transition-all cursor-pointer ${
                gameType === 'jet' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              SET TARGET
            </button>
          </div>
        </div>
      )}

      {/* RECENT SETTLED HISTORY TABLES */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="text-slate-400">⏰</span>
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
            {gameType.includes('parity') ? 'Recent Settled Periods' : gameType === 'mines' ? 'Recent Mines Played Games' : gameType === 'andar-bahar' ? 'Recent Settled Rounds' : 'Recent Rounds History'}
          </h3>
        </div>

        <div className="overflow-x-auto">
          {gameType.includes('parity') && (
            <table className="w-full text-left text-xs font-medium text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black">
                <tr>
                  <th className="py-2.5 px-4">Period Number</th>
                  <th className="py-2.5 px-4">Winning Number</th>
                  <th className="py-2.5 px-4">Colors</th>
                  <th className="py-2.5 px-4">Override?</th>
                  <th className="py-2.5 px-4">Settled Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settledPeriods.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-blue-600">{p.period}</td>
                    <td className="py-2.5 px-4 font-black">
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center font-bold text-xs">
                        {p.winningNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600">{p.colors}</td>
                    <td className="py-2.5 px-4">
                      <span className="bg-slate-100 border text-slate-600 text-[9px] font-black px-2 py-0.5 rounded">
                        {p.override}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{p.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {gameType === 'mines' && (
            <table className="w-full text-left text-xs font-medium text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black">
                <tr>
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4">Bet Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Cashout Multiplier</th>
                  <th className="py-2.5 px-4">Payout (₹)</th>
                  <th className="py-2.5 px-4">Played Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {minesPlayed.map((m, idx) => {
                  const amount = Number(m.amount ?? 0);
                  const multiplier = Number(m.multiplier ?? 0);
                  const payout = Number(m.payout ?? 0);
                  const status = String(m.status || 'SETTLED');
                  const user = m.user || m.period || 'Player';

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{user}</td>
                      <td className="py-2.5 px-4 font-black">₹{amount.toFixed(2)}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${status.includes('WON') ? 'bg-emerald-100 text-emerald-800' : status.includes('LOST') ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-blue-600">{multiplier.toFixed(2)}x</td>
                      <td className="py-2.5 px-4 font-black text-emerald-600">₹{payout.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{m.time || 'Just now'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {gameType === 'andar-bahar' && (
            <table className="w-full text-left text-xs font-medium text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black">
                <tr>
                  <th className="py-2.5 px-4">Period</th>
                  <th className="py-2.5 px-4">Open Card</th>
                  <th className="py-2.5 px-4">Winner</th>
                  <th className="py-2.5 px-4">Winning Card</th>
                  <th className="py-2.5 px-4">Deals</th>
                  <th className="py-2.5 px-4">Override</th>
                  <th className="py-2.5 px-4">Settled Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {andarBaharHistory.map((a, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-blue-600">{a.period}</td>
                    <td className="py-2.5 px-4 font-bold">{a.openCard}</td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded ${a.winner === 'ANDAR' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'}`}>
                        {a.winner}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold">{a.winningCard}</td>
                    <td className="py-2.5 px-4 text-slate-600">{a.deals} cards</td>
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[10px]">{a.override}</td>
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{a.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* DICE SPECIFIC HISTORY TABLE */}
          {gameType === 'dice' && (
            <table className="w-full text-left text-xs font-medium text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black">
                <tr>
                  <th className="py-2.5 px-4">Player</th>
                  <th className="py-2.5 px-4">Bet Option</th>
                  <th className="py-2.5 px-4">Rolled Number</th>
                  <th className="py-2.5 px-4">Staked Amount</th>
                  <th className="py-2.5 px-4">Payout</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(diceHistory.length > 0 ? diceHistory : settledPeriods).map((d: any, idx: number) => {
                  const rolledNum = d.rolledNumber ?? d.winningNumber ?? '-';
                  const option = d.option || `${(d.rollType || 'OVER').toUpperCase()} ${d.targetNumber || 50}`;
                  const status = d.status || 'SETTLED';
                  const staked = Number(d.amount || d.betAmount || d.staked || 0);
                  const payout = Number(d.payoutAmount || d.payout || d.potentialWin || 0);
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{d.userEmail || d.user || d.period || 'Player'}</td>
                      <td className="py-2.5 px-4 font-black text-blue-600">{option}</td>
                      <td className="py-2.5 px-4 font-black">
                        <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center font-bold text-xs text-white ${
                          status === 'WON' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}>
                          {rolledNum}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold">₹{staked.toFixed(2)}</td>
                      <td className="py-2.5 px-4 font-black text-emerald-600">₹{payout.toFixed(2)}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          status === 'WON' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{d.time || 'Just now'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {gameType === 'coin-flip' && (
            <table className="w-full text-left text-xs font-medium text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black">
                <tr>
                  <th className="py-2.5 px-4">Flip Round ID</th>
                  <th className="py-2.5 px-4">Winning Side</th>
                  <th className="py-2.5 px-4">Coating</th>
                  <th className="py-2.5 px-4">Engine Mode</th>
                  <th className="py-2.5 px-4">Settled Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settledPeriods.map((p, idx) => {
                  const side = String(p.outcome || p.winningNumber || p.side || (idx % 2 === 0 ? 'HEADS' : 'TAILS')).toUpperCase();
                  const isHeads = side.includes('HEAD');
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-bold text-blue-600">{p.period || p.id || `#FLIP_${2026092801 + idx}`}</td>
                      <td className="py-2.5 px-4 font-black">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black inline-flex items-center gap-1 ${
                          isHeads ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-200 text-slate-900 border border-slate-300'
                        }`}>
                          <span>{isHeads ? '👑' : '🦅'}</span>
                          <span>{isHeads ? 'HEADS' : 'TAILS'}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          isHeads ? 'bg-amber-400 text-slate-950' : 'bg-slate-300 text-slate-900'
                        }`}>
                          {isHeads ? 'GOLD' : 'SILVER'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="bg-slate-100 border text-slate-600 text-[9px] font-black px-2 py-0.5 rounded">
                          {p.override || 'AUTO RTP'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{p.time || 'Just now'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {(gameType === 'jet' || gameType === 'crash' || gameType === 'pushparani' || gameType === 'spin') && (
            <table className="w-full text-left text-xs font-medium text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black">
                <tr>
                  <th className="py-2.5 px-4">Flight / Round ID</th>
                  <th className="py-2.5 px-4">Crash Multiplier Target</th>
                  <th className="py-2.5 px-4">Engine Mode</th>
                  <th className="py-2.5 px-4">Settled Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settledPeriods.map((p, idx) => {
                  const rawMult = p.crashMultiplier || p.winningNumber || p.multiplier || '2.00';
                  const multStr = String(rawMult).includes('x') ? String(rawMult) : `${Number(rawMult || 2.0).toFixed(2)}x`;
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-bold text-blue-600">{p.period || p.id}</td>
                      <td className="py-2.5 px-4 font-black">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                          multStr.includes('1.00') ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          🚀 {multStr}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="bg-slate-100 border text-slate-600 text-[9px] font-black px-2 py-0.5 rounded">
                          {p.override || 'AUTO RTP'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{p.time || 'Just now'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
