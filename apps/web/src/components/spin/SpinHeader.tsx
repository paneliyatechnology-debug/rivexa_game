'use client';

import React from 'react';
import Link from 'next/link';

interface SpinHeaderProps {
  balance: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRules: () => void;
}

export const SpinHeader: React.FC<SpinHeaderProps> = ({
  balance,
  soundEnabled,
  onToggleSound,
  onOpenRules,
}) => {
  return (
    <header className="h-14 bg-gradient-to-r from-[#09101d] via-[#0d1728] to-[#09101d] border-b border-[#1c2d4a]/80 px-3 sm:px-6 flex items-center justify-between shadow-xl shrink-0 z-30">
      {/* LEFT: BACK BUTTON & LOGO */}
      <div className="flex items-center gap-2.5">
        <Link
          href="/"
          className="w-9 h-9 rounded-full bg-[#15243b] hover:bg-[#1c2d4a] border border-[#273d61] flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95 shadow-sm"
          title="Back to Lobby"
        >
          ←
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">🏆</span>
          <div>
            <h1 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 tracking-wider uppercase font-mono leading-tight">
              SPIN & WIN
            </h1>
            <p className="text-[10px] text-slate-400 font-medium hidden xs:block">
              Choose your lucky sector
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT: WALLET BALANCE, SOUND TOGGLE & RULES */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Wallet Balance Pill */}
        <Link
          href="/deposit"
          className="bg-gradient-to-r from-[#0b1b30] to-[#12243d] border border-emerald-500/40 hover:border-emerald-400 px-3 py-1.5 rounded-full flex items-center gap-2 transition-all shadow-md group hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
            ₹
          </div>
          <span className="text-xs font-mono font-black text-emerald-400 group-hover:text-emerald-300 transition-colors">
            ₹{balance.toFixed(2)}
          </span>
          <span className="text-[10px] font-bold text-slate-400 bg-[#1c2d4a] px-1.5 py-0.5 rounded-full hidden sm:inline">
            +
          </span>
        </Link>

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={onToggleSound}
          className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs transition-all active:scale-95 shadow-sm ${
            soundEnabled
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
              : 'bg-[#15243b] border-[#273d61] text-slate-500'
          }`}
          title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        {/* Rules Button */}
        <button
          type="button"
          onClick={onOpenRules}
          className="px-3 py-1.5 rounded-full bg-[#15243b] hover:bg-[#1c2d4a] text-xs font-bold text-slate-300 border border-[#273d61] flex items-center gap-1.5 transition-all active:scale-95 shadow-sm hover:border-amber-400/50 hover:text-amber-300"
        >
          <span className="text-amber-400">ℹ</span>
          <span className="hidden sm:inline">Rules</span>
        </button>
      </div>
    </header>
  );
};
