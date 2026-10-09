'use client';

import React, { useEffect } from 'react';
import { ResultModalData } from './types';
import { X } from 'lucide-react';

interface ResultModalProps {
  data: ResultModalData | null;
  onClose: () => void;
}

export function ResultModal({ data, onClose }: ResultModalProps) {
  useEffect(() => {
    if (!data?.isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [data?.isOpen, onClose]);

  if (!data || !data.isOpen) return null;

  const isWin = data.isWin;
  const choiceUpper = (data.choice || 'RED').toUpperCase();
  const resultUpper = (data.result || 'RED').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl border transition-all transform animate-in zoom-in-95 duration-200 ${
          isWin
            ? 'bg-gradient-to-b from-[#092520] via-[#061B1E] to-[#041014] border-[#00E5A0]/60 shadow-[0_0_50px_rgba(0,229,160,0.35)] text-white'
            : 'bg-gradient-to-b from-[#2A0D18] via-[#1A0710] to-[#0D0308] border-[#FF2468]/60 shadow-[0_0_50px_rgba(255,36,104,0.35)] text-white'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Celebration Icon */}
        <div className="mb-3">
          <span className="text-5xl inline-block animate-bounce">
            {isWin ? '🎉' : '💔'}
          </span>
        </div>

        {/* Title */}
        <h3
          className={`text-2xl font-black font-mono tracking-wider ${
            isWin ? 'text-[#00E5A0] drop-shadow-[0_0_12px_rgba(0,229,160,0.6)]' : 'text-[#FF2468]'
          }`}
        >
          {isWin ? 'YOU WON!' : 'YOU LOST'}
        </h3>

        <p className="text-xs font-mono font-bold text-[#7285AE] mt-0.5">
          {data.roundId}
        </p>

        {/* Result details card */}
        <div className="my-4 p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[#9DB5D8]">Your Choice:</span>
            <span
              className={`font-black px-2 py-0.5 rounded text-[11px] ${
                choiceUpper === 'GREEN'
                  ? 'bg-[#00E5A0]/20 text-[#00E5A0]'
                  : choiceUpper === 'BLUE'
                  ? 'bg-[#00D9FF]/20 text-[#00D9FF]'
                  : 'bg-[#FF2468]/20 text-[#FF2468]'
              }`}
            >
              {choiceUpper}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#9DB5D8]">Wheel Result:</span>
            <span
              className={`font-black px-2 py-0.5 rounded text-[11px] ${
                resultUpper === 'GREEN'
                  ? 'bg-[#00E5A0]/20 text-[#00E5A0]'
                  : resultUpper === 'BLUE'
                  ? 'bg-[#00D9FF]/20 text-[#00D9FF]'
                  : 'bg-[#FF2468]/20 text-[#FF2468]'
              }`}
            >
              {resultUpper}
            </span>
          </div>

          {isWin && (
            <div className="flex items-center justify-between">
              <span className="text-[#9DB5D8]">Multiplier:</span>
              <span className="font-bold text-[#00E5A0]">
                {data.multiplier.toFixed(2)}x
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-[#9DB5D8]">Bet Stake:</span>
            <span className="font-bold text-white">₹{data.betAmount.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#9DB5D8]">{isWin ? 'Total Payout:' : 'Loss:'}</span>
            <span className="font-bold text-white">
              {isWin ? `₹${data.payoutAmount.toFixed(2)}` : `-₹${data.betAmount.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Profit Highlight Pill */}
        <div
          className={`py-2 px-4 rounded-xl font-black font-mono text-sm tracking-wider ${
            isWin
              ? 'bg-[#00E5A0]/20 border border-[#00E5A0] text-[#00E5A0]'
              : 'bg-[#FF2468]/20 border border-[#FF2468] text-[#FF2468]'
          }`}
        >
          {isWin ? `PROFIT: +₹${data.profitLoss.toFixed(2)}` : `LOSS: -₹${Math.abs(data.profitLoss).toFixed(2)}`}
        </div>
      </div>
    </div>
  );
}
