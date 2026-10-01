'use client';

import React from 'react';

interface BettingControlsProps {
  selectedOption: 'andar' | 'bahar' | 'tie';
  onSelectOption: (option: 'andar' | 'bahar' | 'tie') => void;
  betAmount: number;
  onBetAmountChange: (amount: number) => void;
  bettingOpen: boolean;
  balance: number;
  minBet: number;
  maxBet: number;
  onPlaceBet: (option: 'andar' | 'bahar' | 'tie') => void;
}

export const BettingControls: React.FC<BettingControlsProps> = ({
  selectedOption,
  onSelectOption,
  betAmount,
  onBetAmountChange,
  bettingOpen,
  balance,
  minBet,
  maxBet,
  onPlaceBet,
}) => {
  const handleChipClick = (addVal: number) => {
    onBetAmountChange(Math.min(maxBet, betAmount + addVal));
  };

  const handleMultiplierClick = (factor: number) => {
    if (factor === 0.5) {
      onBetAmountChange(Math.max(minBet, Math.floor(betAmount / 2)));
    } else if (factor === 2) {
      onBetAmountChange(Math.min(maxBet, betAmount * 2));
    } else if (factor === -1) {
      // MAX
      onBetAmountChange(Math.min(maxBet, Math.floor(balance)));
    }
  };

  return (
    <div className="bg-[#071735]/95 border-2 border-[#00D9FF]/50 rounded-[22px] p-3 sm:p-4 shadow-[0_0_25px_rgba(0,217,255,0.25)] backdrop-blur-2xl space-y-3.5 relative overflow-hidden">
      {/* ⏳ Transition Notification Banner when Betting is Closed */}
      {!bettingOpen && (
        <div className="bg-[#0B1530]/95 border-2 border-[#873BFF]/60 rounded-xl p-2.5 text-center flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(135,59,255,0.4)] animate-pulse">
          <i className="bi bi-arrow-repeat animate-spin text-[#873BFF] text-base" />
          <span className="text-xs sm:text-sm font-black text-[#873BFF] font-mono tracking-wider uppercase">
            BETTING CLOSED — WAITING FOR NEXT ROUND...
          </span>
        </div>
      )}

      {/* ─── 1. THREE MAIN BETTING BUTTONS (ANDAR, TIE, BAHAR) ─── */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {/* ANDAR BUTTON */}
        <button
          onClick={() => {
            onSelectOption('andar');
            onPlaceBet('andar');
          }}
          disabled={!bettingOpen}
          className={`relative group py-3 sm:py-4 px-2 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center cursor-pointer border overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedOption === 'andar'
              ? 'bg-gradient-to-r from-[#1677FF] via-[#0099FF] to-[#00D9FF] text-white border-[#00D9FF] shadow-[0_0_30px_rgba(0,217,255,0.7)] scale-[1.03] ring-2 ring-[#00D9FF]'
              : 'bg-gradient-to-r from-[#0D2456] to-[#0B1E48] text-[#00D9FF] border-[#1677FF]/50 hover:border-[#00D9FF] hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] hover:scale-[1.02]'
          }`}
        >
          {/* Neon Top Glow Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#00D9FF] shadow-[0_0_10px_#00D9FF]" />
          <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
            <span className="text-base sm:text-lg">↑</span>
            <span className="text-sm sm:text-lg font-black tracking-wider uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              ANDAR
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-black/30 border border-white/20">
            2.0x Payout
          </span>
        </button>

        {/* TIE BUTTON */}
        <button
          onClick={() => {
            onSelectOption('tie');
            onPlaceBet('tie');
          }}
          disabled={!bettingOpen}
          className={`relative group py-3 sm:py-4 px-2 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center cursor-pointer border overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedOption === 'tie'
              ? 'bg-gradient-to-r from-[#FFC928] via-[#F59E0B] to-[#D97706] text-[#03081B] border-[#FFC928] shadow-[0_0_30px_rgba(255,201,40,0.8)] scale-[1.03] ring-2 ring-[#FFC928]'
              : 'bg-gradient-to-r from-[#423207] to-[#241A03] text-[#FFC928] border-[#FFC928]/50 hover:border-[#FFC928] hover:shadow-[0_0_20px_rgba(255,201,40,0.4)] hover:scale-[1.02]'
          }`}
        >
          {/* Neon Top Glow Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#FFC928] shadow-[0_0_10px_#FFC928]" />
          <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
            <span className="text-base sm:text-lg">⚖</span>
            <span className="text-sm sm:text-lg font-black tracking-wider uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              TIE
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-black/30 border border-white/20">
            9.0x Payout
          </span>
        </button>

        {/* BAHAR BUTTON */}
        <button
          onClick={() => {
            onSelectOption('bahar');
            onPlaceBet('bahar');
          }}
          disabled={!bettingOpen}
          className={`relative group py-3 sm:py-4 px-2 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center cursor-pointer border overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedOption === 'bahar'
              ? 'bg-gradient-to-r from-[#F4145B] via-[#E11D48] to-[#873BFF] text-white border-[#F13FA4] shadow-[0_0_30px_rgba(244,20,91,0.7)] scale-[1.03] ring-2 ring-[#F13FA4]'
              : 'bg-gradient-to-r from-[#4C091F] to-[#26040F] text-[#F13FA4] border-[#F4145B]/50 hover:border-[#F13FA4] hover:shadow-[0_0_20px_rgba(241,63,164,0.4)] hover:scale-[1.02]'
          }`}
        >
          {/* Neon Top Glow Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#F4145B] shadow-[0_0_10px_#F4145B]" />
          <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
            <span className="text-base sm:text-lg">↓</span>
            <span className="text-sm sm:text-lg font-black tracking-wider uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              BAHAR
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-black/30 border border-white/20">
            2.0x Payout
          </span>
        </button>
      </div>

      {/* ─── 2. BET AMOUNT INPUT & QUICK CONTROLS ─── */}
      <div className="bg-[#0B1530] border border-[#287BFF]/30 rounded-2xl p-2.5 sm:p-3 space-y-2">
        <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold text-[#A5B4D0]">
          <span>BET AMOUNT (₹)</span>
          <span className="text-[#00D9FF]">Min: ₹{minBet} • Max: ₹{maxBet.toLocaleString('en-IN')}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Amount Input */}
          <div className="flex-1 flex items-center bg-[#10254B] border border-[#00D9FF]/40 rounded-xl px-3 py-1.5 focus-within:border-[#00D9FF] focus-within:ring-2 focus-within:ring-[#00D9FF]/50 transition-all shadow-[inset_0_0_10px_rgba(0,217,255,0.1)]">
            <span className="text-xs sm:text-sm font-mono text-[#00D9FF] mr-1.5 font-bold">₹</span>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => onBetAmountChange(Math.max(0, parseFloat(e.target.value) || 0))}
              disabled={!bettingOpen}
              className="w-full bg-transparent text-white font-mono font-bold text-xs sm:text-sm focus:outline-none"
            />
          </div>

          {/* Quick Multipliers */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleMultiplierClick(0.5)}
              disabled={!bettingOpen}
              className="px-2 py-1.5 rounded-xl bg-[#10254B] border border-[#287BFF]/40 text-[#00D9FF] text-xs font-mono font-bold hover:bg-[#172947] hover:border-[#00D9FF] disabled:opacity-40 cursor-pointer transition-all"
            >
              1/2
            </button>
            <button
              type="button"
              onClick={() => handleMultiplierClick(2)}
              disabled={!bettingOpen}
              className="px-2 py-1.5 rounded-xl bg-[#10254B] border border-[#287BFF]/40 text-[#00D9FF] text-xs font-mono font-bold hover:bg-[#172947] hover:border-[#00D9FF] disabled:opacity-40 cursor-pointer transition-all"
            >
              2X
            </button>
            <button
              type="button"
              onClick={() => handleMultiplierClick(-1)}
              disabled={!bettingOpen}
              className="px-2 py-1.5 rounded-xl bg-[#10254B] border border-[#FFC928]/40 text-[#FFC928] text-xs font-mono font-bold hover:bg-[#172947] hover:border-[#FFC928] disabled:opacity-40 cursor-pointer transition-all"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Quick Amount Chips */}
        <div className="grid grid-cols-5 gap-1.5 pt-1">
          {[10, 50, 100, 500, 1000].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleChipClick(val)}
              disabled={!bettingOpen}
              className="py-1 rounded-xl bg-[#10254B] border border-[#287BFF]/30 text-[#A5B4D0] hover:text-white hover:border-[#00D9FF] text-[10px] sm:text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-40"
            >
              +₹{val}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
