'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useChickenRoadStore } from '../../../store/chickenRoadStore';
import { useAuth } from '@/context/AuthContext';
import { HelpCircle, Maximize, Minimize, Menu, ArrowLeft, Wallet } from 'lucide-react';

export const GameHeader: React.FC = () => {
  const { user, balance: liveBalance } = useAuth();
  const openModal = useChickenRoadStore((s) => s.openModal);
  const storeBalance = useChickenRoadStore((s) => s.walletBalance);
  const setWalletBalance = useChickenRoadStore((s) => s.setWalletBalance);
  const currency = useChickenRoadStore((s) => s.currency);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keep store balance synced with AuthContext live balance
  useEffect(() => {
    if (liveBalance !== undefined && liveBalance !== null) {
      setWalletBalance(liveBalance);
    }
  }, [liveBalance, setWalletBalance]);

  const currentBalance = liveBalance !== undefined && liveBalance !== null ? liveBalance : storeBalance;
  const symbol = currency === 'INR' ? '₹' : currency;

  const [balanceAnim, setBalanceAnim] = useState<'idle' | 'win' | 'spend'>('idle');
  const prevBalanceRef = useRef<number>(currentBalance);

  useEffect(() => {
    if (prevBalanceRef.current !== currentBalance) {
      if (currentBalance > prevBalanceRef.current) {
        setBalanceAnim('win');
      } else if (currentBalance < prevBalanceRef.current) {
        setBalanceAnim('spend');
      }
      prevBalanceRef.current = currentBalance;
      const timer = setTimeout(() => {
        setBalanceAnim('idle');
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [currentBalance]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="w-full bg-[#1e2025] px-2.5 sm:px-4 py-2 flex items-center justify-between border-b border-[#2d3038] text-white gap-2 select-none shrink-0 z-30">
      {/* LEFT: Back Button + Game Logo + Online Ticker */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/"
          className="p-1.5 bg-[#2a2d34] hover:bg-[#363a43] rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
          title="Back to Lobby"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <img
          src="/assets/chicken-road/Assets/flat logo.png"
          alt="Chicken 2 Road Logo"
          className="h-6 sm:h-9 max-w-[110px] sm:max-w-none object-contain shrink"
          onError={(e) => {
            e.currentTarget.src = '/assets/chicken-road/Assets/chicken.png';
          }}
        />

        <div className="hidden md:flex items-center gap-2 text-xs border-l border-[#3a3e47] pl-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 font-medium">Online:</span>
          <span className="font-bold text-slate-200">7,183</span>
        </div>
      </div>

      {/* RIGHT: Live Balance Pill with Animated Pulse Effect, Help, Fullscreen & Menu */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Help Button */}
        <button
          onClick={() => openModal('help')}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#2a2d34] hover:bg-[#363a43] rounded-full text-xs font-bold text-slate-200 transition-all cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>How to play?</span>
        </button>

        {/* Live Actual Wallet Balance Pill */}
        <div
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full border text-xs sm:text-sm font-mono font-black transition-all duration-300 ${
            balanceAnim === 'win'
              ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 scale-110 shadow-[0_0_20px_rgba(34,197,94,0.6)]'
              : balanceAnim === 'spend'
              ? 'bg-amber-950/80 border-amber-400 text-amber-300 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
              : 'bg-[#111316] border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
          }`}
        >
          <Wallet className={`w-3.5 h-3.5 ${balanceAnim === 'win' ? 'animate-bounce text-emerald-300' : 'text-emerald-400'}`} />
          <span className="text-slate-300 font-bold">{symbol}</span>
          <span className="tracking-wide">{Number(currentBalance || 0).toFixed(2)}</span>
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 bg-[#2a2d34] hover:bg-[#363a43] rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Menu Button */}
        <button
          onClick={() => openModal('menu')}
          className="p-1.5 bg-[#2a2d34] hover:bg-[#363a43] rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Menu"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default GameHeader;

