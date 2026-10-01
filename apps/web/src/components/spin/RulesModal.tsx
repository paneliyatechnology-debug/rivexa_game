'use client';

import React from 'react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#0b1424] border border-[#273d61] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1c2d4a] pb-3">
          <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
            <span>ℹ</span> SPIN & WIN RULES
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
          <p>
            <strong>1. Select Bet Category & Amount:</strong> Choose your bet amount (e.g. ₹50) and select either Animal Cards OR specific Wheel Numbers (0-36).
          </p>

          <div className="bg-[#15243b] p-3 rounded-2xl space-y-2 font-mono text-[11px] border border-[#273d61]">
            <div className="flex justify-between items-center text-emerald-400">
              <span className="flex items-center gap-1.5">
                <img src="/images/elephant_avatar.png" alt="Elephant" className="w-5 h-5 rounded-full object-cover" />
                ELEPHANT (GREEN):
              </span>
              <span className="font-bold">2x Payout (1:2)</span>
            </div>

            <div className="flex justify-between items-center text-amber-400">
              <span className="flex items-center gap-1.5">
                <img src="/images/lion_avatar.png" alt="Lion" className="w-5 h-5 rounded-full object-cover" />
                LION (YELLOW):
              </span>
              <span className="font-bold">2x Payout (1:2)</span>
            </div>

            <div className="flex justify-between items-center text-rose-400">
              <span className="flex items-center gap-1.5">
                <img src="/images/bull_avatar.png" alt="Bull" className="w-5 h-5 rounded-full object-cover" />
                BULL (RED):
              </span>
              <span className="font-bold">18x Payout (1:18)</span>
            </div>

            <div className="flex justify-between items-center text-yellow-300">
              <span className="flex items-center gap-1.5">
                <span className="text-base">👑</span>
                GOLD (CROWN):
              </span>
              <span className="font-bold">50x Multiplier (1:50)</span>
            </div>

            <div className="flex justify-between items-center text-blue-300 border-t border-[#273d61] pt-1.5 mt-1.5">
              <span>🔢 WHEEL NUMBERS (0 - 36):</span>
              <span className="font-bold">36x - 50x Payout</span>
            </div>
          </div>

          <p>
            <strong>2. Wheel Settlement:</strong> The wheel spins at the end of each 15s round. When the top arrow pointer lands on your chosen sector or animal, your bet pays out automatically to your wallet!
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-black rounded-xl text-sm shadow-md transition-all cursor-pointer font-mono"
        >
          GOT IT!
        </button>
      </div>
    </div>
  );
};
