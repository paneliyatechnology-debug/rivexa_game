'use client';

import React from 'react';
import Link from 'next/link';

interface SpinSidebarProps {
  roundId: string;
  onOpenRules: () => void;
  onOpenHistory?: () => void;
}

export function SpinSidebar({ roundId, onOpenRules, onOpenHistory }: SpinSidebarProps) {
  return (
    <aside className="w-[210px] xl:w-[230px] shrink-0 hidden lg:flex flex-col gap-3 select-none">
      {/* Game Brand Card */}
      <div className="bg-[#091735]/90 backdrop-blur-xl border border-[#287BFF]/30 rounded-2xl p-4 shadow-[0_0_25px_rgba(40,123,255,0.15)] flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00D9FF]/20 via-[#287BFF]/30 to-[#873BFF]/20 border border-[#00D9FF]/50 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(0,217,255,0.35)] shrink-0 animate-pulse">
            🎡
          </div>
          <div>
            <h2 className="text-base font-black tracking-wider text-white font-mono leading-tight">
              SPIN & WIN
            </h2>
            <p className="text-[10px] text-[#7285AE] font-semibold mt-0.5">
              Spin • Predict • Win
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#06122E] border border-white/10 hover:border-[#00D9FF]/50 text-xs font-bold text-[#9DB5D8] hover:text-[#00D9FF] transition-all cursor-pointer group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform text-xs">←</span>
          <span>Back to Games</span>
        </Link>
      </div>

      {/* Navigation Card */}
      <nav className="bg-[#091735]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 shadow-xl flex flex-col gap-1.5 flex-1">
        <button
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#287BFF] via-[#00D9FF]/80 to-[#287BFF] text-white font-extrabold text-xs shadow-[0_0_15px_rgba(0,217,255,0.35)] border border-[#00D9FF]/40 text-left cursor-pointer transition-all"
        >
          <span className="text-base">🎡</span>
          <span>Spin & Win</span>
          <span className="ml-auto w-2 h-2 rounded-full bg-[#00E5A0] animate-ping" />
        </button>

        <button
          onClick={onOpenRules}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#9DB5D8] hover:text-white hover:bg-white/5 font-bold text-xs transition-all text-left cursor-pointer border border-transparent hover:border-white/10"
        >
          <span className="text-base">❓</span>
          <span>How to Play</span>
        </button>

        <div className="mt-auto pt-3 border-t border-white/10 flex flex-col gap-2">
          {/* Provably Fair Badge */}
          <div className="bg-[#06122E]/80 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2.5">
            <span className="text-lg">🛡️</span>
            <div>
              <span className="block text-[11px] font-black text-emerald-400 uppercase tracking-wider">
                Provably Fair
              </span>
              <span className="text-[9px] text-[#7285AE] block">
                Cryptographically Verified
              </span>
            </div>
          </div>

          {/* Active Round Info */}
          <div className="bg-[#06122E]/80 border border-[#287BFF]/30 rounded-xl p-2.5 text-center">
            <span className="text-[9px] font-bold text-[#7285AE] uppercase tracking-wider block">
              CURRENT ROUND ID
            </span>
            <span className="text-[11px] font-mono font-black text-[#00D9FF] truncate block mt-0.5">
              {roundId || 'SPIN-LIVE'}
            </span>
          </div>
        </div>
      </nav>
    </aside>
  );
}
