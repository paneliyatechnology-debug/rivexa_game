'use client';

import React from 'react';

interface SpinButtonProps {
  status: 'BETTING_OPEN' | 'SPINNING' | 'RESULT';
  betAmount: number;
  autoSpin: boolean;
  onPlaceBet: () => void;
  onToggleAutoSpin: () => void;
}

export const SpinButton: React.FC<SpinButtonProps> = ({
  status,
  betAmount,
  autoSpin,
  onPlaceBet,
  onToggleAutoSpin,
}) => {
  return (
    <div className="space-y-2.5">
      {/* Primary Spin Action Button */}
      <button
        type="button"
        onClick={onPlaceBet}
        disabled={status !== 'BETTING_OPEN'}
        className="w-full py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-slate-950 font-black text-lg sm:text-xl shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:brightness-110 hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] active:scale-98 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none flex items-center justify-center gap-2.5 cursor-pointer uppercase font-mono border border-emerald-300/40"
      >
        <span className={status === 'SPINNING' ? 'animate-spin text-2xl' : 'text-2xl'}>
          {status === 'SPINNING' ? '🔮' : '↻'}
        </span>
        <span>
          {status === 'BETTING_OPEN'
            ? `SPIN ₹${betAmount}`
            : status === 'SPINNING'
            ? 'SPINNING...'
            : 'RESULT'}
        </span>
      </button>

      {/* Auto Spin Toggle Button */}
      <button
        type="button"
        onClick={onToggleAutoSpin}
        className={`w-full py-2.5 rounded-xl text-xs font-mono font-black transition-all border flex items-center justify-center gap-2 cursor-pointer ${
          autoSpin
            ? 'bg-blue-600/30 text-blue-300 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
            : 'bg-[#15243b] text-slate-400 border-[#273d61] hover:text-white hover:bg-[#1c2d4a]'
        }`}
      >
        <span>🔁</span>
        <span>AUTO SPIN {autoSpin ? '(ON)' : '(OFF)'}</span>
      </button>
    </div>
  );
};
