'use client';

import React from 'react';

interface RoundStatusProps {
  roundId: string;
  status: 'BETTING_OPEN' | 'SPINNING' | 'RESULT';
  secondsRemaining: number;
}

export const RoundStatus: React.FC<RoundStatusProps> = ({
  roundId,
  status,
  secondsRemaining,
}) => {
  return (
    <div className="bg-gradient-to-r from-[#0b1424] via-[#0e1a2e] to-[#0b1424] border border-[#1c2d4a] rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-lg">
      {/* ROUND / PERIOD NUMBER */}
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider">
            ROUND / PERIOD
          </span>
          <span className="text-xs sm:text-sm font-mono font-black text-amber-300 tracking-tight">
            #{roundId || '202609220001'}
          </span>
        </div>
      </div>

      {/* GAME STATUS BADGE */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#15243b] border border-[#273d61] shadow-inner">
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'BETTING_OPEN'
              ? 'bg-emerald-400 animate-ping'
              : status === 'SPINNING'
              ? 'bg-amber-400 animate-spin'
              : 'bg-blue-400'
          }`}
        />
        <span
          className={`text-[11px] font-mono font-extrabold uppercase tracking-wider ${
            status === 'BETTING_OPEN'
              ? 'text-emerald-400'
              : status === 'SPINNING'
              ? 'text-amber-400'
              : 'text-blue-400'
          }`}
        >
          {status === 'BETTING_OPEN'
            ? 'BETTING OPEN'
            : status === 'SPINNING'
            ? 'SPINNING...'
            : 'RESULT'}
        </span>
      </div>

      {/* COUNTDOWN TIMER */}
      <div className="text-right">
        <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider">
          COUNTDOWN
        </span>
        <span className="text-sm sm:text-base font-mono font-black text-white tracking-tight">
          {secondsRemaining.toFixed(1)}s
        </span>
      </div>
    </div>
  );
};
