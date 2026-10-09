'use client';

import React from 'react';

interface SpinButtonProps {
  betAmount: number;
  selectedColor: string;
  potentialPayout: number;
  phase: 'BETTING_OPEN' | 'SPINNING' | 'RESULT';
  secondsRemaining: number;
  isBetPlaced: boolean;
  disabled: boolean;
  onPlaceBet: () => void;
  statusText?: string;
}

export function SpinButton({
  betAmount,
  selectedColor,
  potentialPayout,
  phase,
  secondsRemaining,
  isBetPlaced,
  disabled,
  onPlaceBet,
  statusText,
}: SpinButtonProps) {
  const isBettingOpen = phase === 'BETTING_OPEN' && secondsRemaining > 0;
  const isSpinning = phase === 'SPINNING';
  const colorUpper = (selectedColor || 'GREEN').toUpperCase();

  // After successful bet: compact locked card
  // ✓ BET PLACED
  // GREEN • ₹100
  // Potential Payout: ₹200
  // Bet Status: LOCKED
  if (isBetPlaced) {
    return (
      <div className="w-full rounded-xl bg-gradient-to-r from-[#00E5A0]/20 via-[#091D2C] to-[#00E5A0]/20 border border-[#00E5A0]/50 shadow-[0_0_20px_rgba(0,229,160,0.2)] p-2.5 sm:p-3 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#00E5A0] text-[#06122E] flex items-center justify-center font-black text-sm shadow-[0_0_10px_#00E5A0] shrink-0">
            ✓
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black text-white font-mono tracking-wider">
                BET PLACED
              </span>
              <span className="text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-[#00E5A0]/20 text-[#00E5A0] border border-[#00E5A0]/40">
                LOCKED
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-xs font-black font-mono tracking-wider ${
                  colorUpper === 'GREEN'
                    ? 'text-[#00E5A0]'
                    : colorUpper === 'BLUE'
                    ? 'text-[#00D9FF]'
                    : 'text-[#FF2468]'
                }`}
              >
                {colorUpper}
              </span>
              <span className="text-xs font-mono font-bold text-[#7285AE]">•</span>
              <span className="text-xs font-mono font-black text-white">
                ₹{betAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[9px] uppercase tracking-wider text-[#7285AE] font-mono block">
            Potential Payout
          </span>
          <span className="text-xs sm:text-sm font-black font-mono text-[#00E5A0] drop-shadow-[0_0_8px_rgba(0,229,160,0.4)]">
            ₹{potentialPayout.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    );
  }

  // Primary PLACE BET button
  return (
    <button
      type="button"
      onClick={onPlaceBet}
      disabled={disabled || !isBettingOpen}
      className={`w-full py-2.5 sm:py-3 px-4 rounded-xl font-black font-mono text-xs sm:text-sm md:text-base tracking-wider transition-all duration-200 select-none shadow-xl relative overflow-hidden group cursor-pointer ${
        isSpinning
          ? 'bg-[#101C3A] border border-[#287BFF]/50 text-[#00D9FF] cursor-not-allowed shadow-[0_0_20px_rgba(40,123,255,0.3)]'
          : !isBettingOpen
          ? 'bg-[#0B1736] border border-white/10 text-[#7285AE] cursor-not-allowed opacity-60'
          : disabled
          ? 'bg-[#0B1736] border border-white/10 text-[#7285AE] cursor-not-allowed opacity-60'
          : 'bg-gradient-to-r from-[#287BFF] via-[#00D9FF] to-[#287BFF] bg-[length:200%_auto] hover:bg-right text-[#06122E] border border-[#00D9FF] shadow-[0_0_20px_rgba(0,217,255,0.4)] hover:shadow-[0_0_30px_rgba(0,217,255,0.55)] hover:scale-[1.005] active:scale-[0.99]'
      }`}
    >
      {/* Top shine */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

      <div className="relative flex items-center justify-center gap-2">
        {isSpinning ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
            <span className="tracking-widest">WHEEL SPINNING...</span>
          </>
        ) : !isBettingOpen ? (
          <span>BETTING CLOSED</span>
        ) : statusText ? (
          <span>{statusText}</span>
        ) : (
          <>
            <span className="text-base sm:text-lg">🎡</span>
            <span>PLACE BET • ₹{betAmount.toLocaleString('en-IN')}</span>
          </>
        )}
      </div>
    </button>
  );
}
