'use client';

import React from 'react';

interface BetConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOption: 'andar' | 'bahar' | 'tie';
  betAmount: number;
  period: string;
  isSubmitting: boolean;
  onConfirm: (e: React.FormEvent) => void;
}

export const BetConfirmationModal: React.FC<BetConfirmationModalProps> = ({
  isOpen,
  onClose,
  selectedOption,
  betAmount,
  period,
  isSubmitting,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const odds = selectedOption === 'tie' ? 9.0 : 2.0;
  const potentialWin = betAmount * odds;

  let optionColor = 'text-[#00D9FF] bg-[#1677FF]/20 border-[#00D9FF]';
  if (selectedOption === 'bahar') {
    optionColor = 'text-[#F13FA4] bg-[#F4145B]/20 border-[#F13FA4]';
  } else if (selectedOption === 'tie') {
    optionColor = 'text-[#FFC928] bg-[#FFC928]/20 border-[#FFC928]';
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#071735] border-2 border-[#00D9FF]/60 rounded-[28px] max-w-sm w-full p-5 sm:p-6 text-white space-y-4 shadow-[0_0_50px_rgba(0,217,255,0.4)] animate-in fade-in zoom-in-95 relative overflow-hidden">
        {/* Top Glow Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00D9FF] to-transparent shadow-[0_0_15px_#00D9FF]" />

        <div className="flex items-center justify-between border-b border-[#243D66] pb-3">
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <span>🎲</span> Confirm Your Bet
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#10254B] border border-[#287BFF]/30 text-[#A5B4D0] hover:text-white flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Bet Details Card */}
        <div className="bg-[#0B1530] border border-[#287BFF]/30 rounded-2xl p-4 space-y-2.5 font-mono text-xs">
          <div className="flex justify-between items-center text-[#A5B4D0]">
            <span>PERIOD NUMBER</span>
            <span className="font-bold text-white">#{period}</span>
          </div>

          <div className="flex justify-between items-center text-[#A5B4D0]">
            <span>SELECTED OPTION</span>
            <span className={`font-black uppercase px-2.5 py-0.5 rounded-full border text-[11px] ${optionColor}`}>
              {selectedOption} ({odds}x)
            </span>
          </div>

          <div className="flex justify-between items-center text-[#A5B4D0]">
            <span>BET STAKE</span>
            <span className="font-black text-[#00D9FF] text-sm">₹{betAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-[#A5B4D0] pt-2 border-t border-white/10">
            <span>POTENTIAL PAYOUT</span>
            <span className="font-black text-[#00E5A0] text-sm sm:text-base drop-shadow-[0_0_8px_rgba(0,229,160,0.6)]">
              ₹{potentialWin.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="py-3 rounded-xl bg-[#10254B] border border-[#287BFF]/40 text-[#A5B4D0] font-bold text-xs hover:text-white cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="py-3 rounded-xl bg-gradient-to-r from-[#00E5A0] via-[#00D9FF] to-[#00E5A0] text-[#03081B] font-black text-xs uppercase shadow-[0_0_20px_rgba(0,217,255,0.6)] hover:brightness-110 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'PLACING...' : 'CONFIRM BET'}
          </button>
        </div>
      </div>
    </div>
  );
};
