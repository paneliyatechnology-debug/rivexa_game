'use client';

import React from 'react';
import Link from 'next/link';
import { Volume2, VolumeX, HelpCircle, Plus, Menu } from 'lucide-react';

interface SpinHeaderProps {
  balance: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRules: () => void;
  onOpenMobileMenu?: () => void;
}

function formatIndianCurrency(amount: number): string {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

export function SpinHeader({
  balance,
  soundEnabled,
  onToggleSound,
  onOpenRules,
  onOpenMobileMenu,
}: SpinHeaderProps) {
  const formattedBalance = formatIndianCurrency(balance);

  return (
    <header className="w-full max-w-full rounded-xl bg-gradient-to-r from-[#091735] via-[#0B1E4A] to-[#091735] border border-[#287BFF]/35 shadow-[0_0_25px_rgba(40,123,255,0.15)] text-white select-none overflow-hidden">
      {/* =========================================================================
          MOBILE LAYOUT (< 640px / sm:hidden): Compact, non-overflowing 2-Row Header
          ========================================================================= */}
      <div className="sm:hidden flex flex-col gap-1.5 p-2">
        {/* Row 1 — Game Identity & Navigation: [←] [🎡] [SPIN & WIN + LIVE] [☰] */}
        <div className="flex items-center justify-between gap-1.5 min-w-0 w-full">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Back button */}
            <Link
              href="/"
              className="h-8 w-8 rounded-lg bg-[#06122E] border border-white/10 hover:border-[#00D9FF]/50 flex items-center justify-center text-[#9DB5D8] hover:text-[#00D9FF] transition-all cursor-pointer shrink-0"
              title="Back to Lobby"
            >
              ←
            </Link>

            {/* Game Icon */}
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#00D9FF]/20 via-[#287BFF]/30 to-[#873BFF]/20 border border-[#00D9FF]/50 flex items-center justify-center text-base shadow-[0_0_10px_rgba(0,217,255,0.3)] shrink-0">
              🎡
            </div>

            {/* Title & Compact LIVE Badge on same line */}
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <h1 className="text-[13px] xs:text-sm font-black tracking-wide text-white font-mono whitespace-nowrap leading-none">
                SPIN & WIN
              </h1>
              <span className="bg-[#00E5A0]/20 border border-[#00E5A0]/50 text-[#00E5A0] text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(0,229,160,0.3)] shrink-0 leading-none">
                LIVE
              </span>
            </div>
          </div>

          {/* Hamburger / Menu at Far Right */}
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="h-8 w-8 rounded-lg bg-[#06122E] border border-white/10 hover:border-[#00D9FF]/50 text-[#9DB5D8] hover:text-[#00D9FF] flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Row 2 — Wallet & Quick Controls: [🔊 Sound] [WALLET: ₹9,959.39] [+ Deposit] */}
        <div className="flex items-center justify-between gap-1.5 min-w-0 w-full pt-1.5 border-t border-white/5">
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="h-8 w-8 rounded-lg bg-[#06122E] border border-white/10 hover:border-white/30 text-[#9DB5D8] hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            title={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#00D9FF]" />
            ) : (
              <VolumeX className="w-4 h-4 text-rose-500" />
            )}
          </button>

          {/* Full Wallet Balance Card (Flexible & Non-clipping) */}
          <div className="flex-1 min-w-0 bg-[#061B1E] border border-[#00E5A0]/40 rounded-lg px-2 py-1 flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(0,229,160,0.15)] overflow-hidden">
            <span className="text-[9px] font-bold text-[#7285AE] uppercase tracking-wider shrink-0">
              Wallet:
            </span>
            <span className="text-xs xs:text-[13px] font-black font-mono text-[#00E5A0] tracking-tight whitespace-nowrap overflow-hidden">
              ₹{formattedBalance}
            </span>
          </div>

          {/* Compact Deposit Button */}
          <Link
            href="/deposit"
            className="bg-gradient-to-r from-[#00E5A0] to-[#00C7A0] text-[#06152C] h-8 px-2.5 rounded-lg text-xs font-black flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_10px_rgba(0,229,160,0.3)] shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Deposit</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          DESKTOP LAYOUT (>= 640px / hidden sm:flex): Unchanged 1-Row Desktop Header
          ========================================================================= */}
      <div className="hidden sm:flex items-center justify-between gap-2 p-2.5 sm:px-4">
        {/* Left: Back + Icon + Titles */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="h-9 w-9 rounded-xl bg-[#06122E] border border-white/10 hover:border-[#00D9FF]/50 flex items-center justify-center text-[#9DB5D8] hover:text-[#00D9FF] transition-all cursor-pointer"
            title="Back to Lobby"
          >
            ←
          </Link>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#00D9FF]/20 via-[#287BFF]/30 to-[#873BFF]/20 border border-[#00D9FF]/50 flex items-center justify-center text-xl shadow-[0_0_12px_rgba(0,217,255,0.3)] shrink-0">
            🎡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wider text-white font-mono leading-none">
                SPIN & WIN
              </h1>
              <span className="bg-[#00E5A0]/20 border border-[#00E5A0]/50 text-[#00E5A0] text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(0,229,160,0.3)]">
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-[#7285AE] font-semibold mt-1">
              Spin • Predict • Win
            </p>
          </div>
        </div>

        {/* Right: Controls + Balance + Deposit */}
        <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
          {/* Rules button (desktop) */}
          <button
            onClick={onOpenRules}
            className="hidden sm:flex h-8 sm:h-9 px-3 rounded-xl bg-[#06122E] border border-white/10 hover:border-[#00D9FF]/50 text-[#9DB5D8] hover:text-[#00D9FF] text-xs font-bold items-center gap-1.5 transition-all cursor-pointer"
            title="Game Rules"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How to Play</span>
          </button>

          {/* Mobile menu toggle (if visible on tablet < lg) */}
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden h-8 w-8 rounded-xl bg-[#06122E] border border-white/10 hover:border-[#00D9FF]/50 text-[#9DB5D8] hover:text-[#00D9FF] flex items-center justify-center transition-all cursor-pointer"
              title="Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Sound toggle */}
          <button
            onClick={onToggleSound}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-[#06122E] border border-white/10 hover:border-white/30 text-[#9DB5D8] hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#00D9FF]" />
            ) : (
              <VolumeX className="w-4 h-4 text-rose-500" />
            )}
          </button>

          {/* Balance Badge */}
          <div className="bg-[#061B1E] border border-[#00E5A0]/40 rounded-xl px-2.5 sm:px-3 py-1 flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,229,160,0.15)]">
            <span className="text-[10px] font-bold text-[#7285AE] uppercase">Wallet:</span>
            <span className="text-xs sm:text-sm font-black font-mono text-[#00E5A0] tracking-tight">
              ₹{formattedBalance}
            </span>
          </div>

          {/* Deposit Button */}
          <Link
            href="/deposit"
            className="bg-gradient-to-r from-[#00E5A0] to-[#00C7A0] text-[#06152C] h-8 sm:h-9 px-3 rounded-xl text-xs font-black flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(0,229,160,0.3)] shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Deposit</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
