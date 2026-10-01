'use client';

import React from 'react';

interface BetPanelProps {
  betAmount: number;
  balance: number;
  onChangeBetAmount: (amount: number) => void;
  onPlaySound?: () => void;
}

export const BetPanel: React.FC<BetPanelProps> = ({
  betAmount,
  balance,
  onChangeBetAmount,
  onPlaySound,
}) => {
  const handlePresetClick = (type: 'half' | 'double' | 'max' | 'clear') => {
    if (onPlaySound) onPlaySound();
    if (type === 'half') {
      onChangeBetAmount(Math.max(10, Math.floor(betAmount / 2)));
    } else if (type === 'double') {
      onChangeBetAmount(Math.min(balance > 0 ? balance : 100000, betAmount * 2));
    } else if (type === 'max') {
      onChangeBetAmount(Math.max(10, Math.floor(balance)));
    } else if (type === 'clear') {
      onChangeBetAmount(10);
    }
  };

  const handleChipClick = (amount: number) => {
    if (onPlaySound) onPlaySound();
    onChangeBetAmount(amount);
  };

  return (
    <div className="bg-[#0b1424] border border-[#1c2d4a] rounded-3xl p-3 sm:p-5 space-y-3 shadow-xl">
      <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400">
        <span className="flex items-center gap-1.5 text-slate-300">
          <span>💰</span>
          <span>BET AMOUNT</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handlePresetClick('half')}
            className="px-2.5 py-1 rounded-lg bg-[#15243b] hover:bg-[#1c2d4a] text-slate-300 hover:text-white border border-[#273d61] text-[10px] font-black transition-all active:scale-95"
          >
            ½
          </button>
          <button
            type="button"
            onClick={() => handlePresetClick('double')}
            className="px-2.5 py-1 rounded-lg bg-[#15243b] hover:bg-[#1c2d4a] text-slate-300 hover:text-white border border-[#273d61] text-[10px] font-black transition-all active:scale-95"
          >
            2x
          </button>
          <button
            type="button"
            onClick={() => handlePresetClick('max')}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-black transition-all active:scale-95"
          >
            MAX
          </button>
          <button
            type="button"
            onClick={() => handlePresetClick('clear')}
            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-black transition-all active:scale-95"
          >
            CLEAR
          </button>
        </div>
      </div>

      {/* Quick Add Chips */}
      <div className="grid grid-cols-5 gap-1.5">
        {[10, 50, 100, 500, 1000].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handleChipClick(preset)}
            className={`py-2 rounded-xl text-xs font-mono font-black transition-all border cursor-pointer active:scale-95 ${
              betAmount === preset
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-md scale-102 ring-2 ring-blue-400/40'
                : 'bg-[#15243b] text-slate-300 border-[#273d61] hover:border-blue-500/50 hover:bg-[#1c2d4a]'
            }`}
          >
            +₹{preset}
          </button>
        ))}
      </div>

      {/* Amount Input Row */}
      <div className="bg-[#15243b] border border-[#273d61] rounded-2xl px-3.5 py-2 flex items-center justify-between shadow-inner focus-within:border-amber-400/80 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
        <span className="text-amber-400 font-mono font-black text-xl">₹</span>
        <input
          type="number"
          min="10"
          value={betAmount || ''}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onChangeBetAmount(isNaN(val) ? 0 : Math.max(0, val));
          }}
          className="w-full bg-transparent text-right font-mono font-black text-xl text-white focus:outline-none px-2"
          placeholder="50"
        />
      </div>
    </div>
  );
};
