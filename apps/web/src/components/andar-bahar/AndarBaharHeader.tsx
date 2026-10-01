'use client';

import React from 'react';
import Link from 'next/link';
import { PlayingCard } from './PlayingCard';

interface AndarBaharHeaderProps {
  period: string;
  openCard?: string;
  balance: number;
  onOpenRules: () => void;
}

export const AndarBaharHeader: React.FC<AndarBaharHeaderProps> = ({
  period,
  openCard = '7♦',
  balance,
  onOpenRules,
}) => {
  return (
    <div className="bg-[#071735]/95 border-2 border-[#00D9FF]/50 rounded-[22px] p-2.5 sm:p-4 shadow-[0_0_25px_rgba(0,217,255,0.25)] text-white relative overflow-hidden backdrop-blur-2xl">
      {/* Top Ambient Glow Bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#00D9FF] to-transparent shadow-[0_0_15px_#00D9FF]" />

      <div className="flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Back Arrow + Title + Period */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#10254B] border border-[#287BFF]/50 flex items-center justify-center text-[#00D9FF] hover:border-[#00D9FF] hover:bg-[#172947] hover:shadow-[0_0_15px_rgba(0,217,255,0.5)] transition-all shadow-md shrink-0 cursor-pointer"
          >
            <i className="bi bi-arrow-left text-base sm:text-lg stroke-[3]" />
          </Link>

          {/* Game Title Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#873BFF] to-[#287BFF] p-0.5 shadow-[0_0_15px_rgba(135,59,255,0.5)] hidden xs:flex items-center justify-center shrink-0">
              <span className="text-white text-base">🎴</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <h1 className="text-sm sm:text-xl font-black tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] truncate">
                  Andar Bahar
                </h1>
                <span className="bg-[#873BFF]/20 border border-[#873BFF]/50 text-[#873BFF] text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(135,59,255,0.4)] shrink-0">
                  30s
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#A5B4D0] font-medium hidden sm:block">
                Predict the matching card and win big!
              </p>
              <span className="text-[10px] sm:text-xs font-mono text-[#00D9FF] font-bold block truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                Period #{period}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Open Card Badge (Shown on Desktop/Large screen header, on mobile it is in GameStatusPanel) */}
        {openCard && (
          <div className="hidden lg:flex items-center gap-2.5 bg-[#0B1530] border-2 border-[#00D9FF]/60 rounded-2xl px-3 py-1.5 shadow-[0_0_20px_rgba(0,217,255,0.3)]">
            <div className="text-center">
              <span className="text-[10px] font-black text-[#A5B4D0] uppercase tracking-wider block">
                JOKER CARD
              </span>
              <span className="text-[9px] font-bold text-[#00D9FF]">MATCH THIS</span>
            </div>
            <PlayingCard card={openCard} size="md" className="shadow-[0_0_15px_rgba(0,217,255,0.5)]" />
          </div>
        )}

        {/* Right: Wallet Balance & Rules */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="bg-[#0B1530] border border-[#00E5A0]/40 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 shadow-[0_0_12px_rgba(0,229,160,0.25)]">
            <i className="bi bi-wallet2 text-[#00E5A0] text-xs sm:text-sm" />
            <span className="text-xs sm:text-sm font-black font-mono text-[#00E5A0]">
              ₹{Number(balance).toFixed(2)}
            </span>
          </div>

          <button
            onClick={onOpenRules}
            className="border border-[#00D9FF]/60 text-[#00D9FF] bg-[#10254B] hover:bg-[#172947] px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full font-extrabold text-[10px] sm:text-xs shadow-[0_0_15px_rgba(0,217,255,0.3)] flex items-center gap-1 transition-all cursor-pointer shrink-0 hover:scale-105"
          >
            <i className="bi bi-book-fill text-[10px]" /> Rules
          </button>
        </div>
      </div>
    </div>
  );
};
