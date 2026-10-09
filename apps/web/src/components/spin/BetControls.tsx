'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface BetControlsProps {
  betAmount: number;
  onBetAmountChange: (amount: number) => void;
  minBet: number;
  maxBet: number;
  balance: number;
  disabled: boolean;
}

export function BetControls({
  betAmount,
  onBetAmountChange,
  minBet,
  maxBet,
  balance,
  disabled,
}: BetControlsProps) {
  const quickBets = [
    { label: '₹10', value: 10 },
    { label: '₹25', value: 25 },
    { label: '₹50', value: 50 },
    { label: '₹100', value: 100 },
    { label: '₹250', value: 250 },
    { label: '₹500', value: 500 },
    { label: '₹1K', value: 1000 },
  ];

  const handleStep = (delta: number) => {
    if (disabled) return;
    const next = Math.max(minBet, Math.min(maxBet, betAmount + delta));
    onBetAmountChange(next);
  };

  const handleSetQuick = (amount: number) => {
    if (disabled) return;
    const next = Math.max(minBet, Math.min(maxBet, amount));
    onBetAmountChange(next);
  };

  const handleSetMax = () => {
    if (disabled) return;
    const walletBalance = Math.max(0, Math.floor(balance || 0));
    const maxVal = Math.min(maxBet, walletBalance);
    onBetAmountChange(maxVal > 0 ? maxVal : minBet);
  };

  const currentMaxVal = Math.min(maxBet, Math.max(0, Math.floor(balance || 0)));
  const isMaxSelected = betAmount === currentMaxVal && currentMaxVal > 0;

  return (
    <div className="space-y-1.5 sm:space-y-2">
      {/* Header with Limits */}
      <div className="flex items-center justify-between">
        <label className="text-[10px] sm:text-xs font-black uppercase text-[#9DB5D8] tracking-wider flex items-center gap-1.5">
          <span>💰</span>
          <span>BET AMOUNT</span>
        </label>
        <span className="text-[10px] sm:text-xs font-mono font-bold text-[#7285AE]">
          Limits: ₹{minBet.toLocaleString('en-IN')} - ₹{maxBet.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Stepper Input: Amount on Left, Minus & Plus on Right */}
      <div className="flex items-center justify-between bg-[#06122E] border border-white/10 rounded-xl px-3 py-1.5 sm:py-2 focus-within:border-[#00D9FF]/60 transition-all shadow-inner">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-lg sm:text-xl font-black font-mono text-[#00D9FF] shrink-0 select-none">
            ₹
          </span>
          <input
            type="number"
            min={minBet}
            max={maxBet}
            disabled={disabled}
            value={betAmount === 0 ? '' : betAmount}
            placeholder="100"
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
              onBetAmountChange(val);
            }}
            className="w-full bg-transparent text-left text-base sm:text-lg font-black font-mono text-white focus:outline-none tracking-tight min-w-0"
          />
        </div>

        {/* Minus and Plus on the Right */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            type="button"
            disabled={disabled || betAmount <= minBet}
            onClick={() => handleStep(-10)}
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg bg-[#0B1E4A] hover:bg-[#162E6B] active:scale-95 disabled:opacity-40 text-white font-black flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed border border-white/5"
            title="Decrease bet"
          >
            <Minus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
          <button
            type="button"
            disabled={disabled || betAmount >= maxBet}
            onClick={() => handleStep(10)}
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg bg-[#0B1E4A] hover:bg-[#162E6B] active:scale-95 disabled:opacity-40 text-white font-black flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed border border-white/5"
            title="Increase bet"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Quick Bet Buttons: 4 per row on mobile (2 rows), 8 on desktop (1 row) */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        {quickBets.map((item) => {
          const isSelected = betAmount === item.value;

          return (
            <button
              key={item.value}
              type="button"
              disabled={disabled}
              onClick={() => handleSetQuick(item.value)}
              className={`py-1.5 px-1 rounded-lg text-xs font-black font-mono border transition-all cursor-pointer text-center select-none ${
                isSelected
                  ? 'bg-gradient-to-r from-[#287BFF] to-[#00D9FF] text-[#06122E] border-[#00D9FF] shadow-[0_0_12px_rgba(0,217,255,0.4)] scale-[1.02]'
                  : 'bg-[#091735]/80 hover:bg-[#0B1E4A] text-[#9DB5D8] hover:text-white border-white/10'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
            >
              {item.label}
            </button>
          );
        })}

        {/* MAX Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleSetMax}
          className={`py-1.5 px-1 rounded-lg text-xs font-black font-mono border uppercase tracking-wider transition-all cursor-pointer select-none text-center ${
            isMaxSelected
              ? 'bg-[#873BFF] text-white border-[#B266FF] shadow-[0_0_12px_rgba(178,102,255,0.4)] scale-[1.02]'
              : 'bg-[#091735]/80 hover:bg-[#0B1E4A] text-[#B266FF] border-[#873BFF]/35 hover:border-[#873BFF]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
        >
          MAX
        </button>
      </div>

      {/* Warnings if limits exceeded */}
      {betAmount > maxBet && (
        <p className="text-[10px] text-[#FF2468] font-mono font-bold">
          ⚠️ Maximum allowed bet is ₹{maxBet.toLocaleString('en-IN')}.
        </p>
      )}
      {betAmount < minBet && betAmount > 0 && (
        <p className="text-[10px] text-[#FFB703] font-mono font-bold">
          ⚠️ Minimum allowed bet is ₹{minBet.toLocaleString('en-IN')}.
        </p>
      )}
    </div>
  );
}
