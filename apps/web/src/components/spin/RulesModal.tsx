'use client';

import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#091735] border border-[#287BFF]/40 p-5 sm:p-6 shadow-[0_0_50px_rgba(40,123,255,0.3)] text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎡</span>
            <h3 className="text-base sm:text-lg font-black font-mono tracking-tight">
              Spin & Win Rules & Payouts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rules Content */}
        <div className="space-y-4 my-4 text-xs font-sans text-[#9DB5D8] leading-relaxed">
          {/* Section 1: Objective */}
          <div>
            <h4 className="text-sm font-black text-white font-mono uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>🎯</span> How to Play
            </h4>
            <p>
              Spin & Win is a fast-paced game of color prediction. Before each round spins, select which outcome color the wheel pointer will land on: <strong>GREEN</strong>, <strong>BLUE</strong>, or <strong>RED</strong>.
            </p>
          </div>

          {/* Section 2: Payouts */}
          <div>
            <h4 className="text-sm font-black text-white font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>💰</span> Outcome Multipliers
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2.5 rounded-xl bg-[#00E5A0]/15 border border-[#00E5A0]/40">
                <span className="block text-[11px] font-black text-[#00E5A0]">GREEN</span>
                <span className="block text-sm font-black text-white mt-0.5">1.90x</span>
                <span className="text-[10px] text-[#7285AE]">11 Winning Slots</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#00D9FF]/15 border border-[#00D9FF]/40">
                <span className="block text-[11px] font-black text-[#00D9FF]">BLUE</span>
                <span className="block text-sm font-black text-white mt-0.5">1.90x</span>
                <span className="text-[10px] text-[#7285AE]">11 Winning Slots</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FF2468]/15 border border-[#FF2468]/40">
                <span className="block text-[11px] font-black text-[#FF2468]">RED</span>
                <span className="block text-sm font-black text-white mt-0.5">9.50x</span>
                <span className="text-[10px] text-[#7285AE]">2 Slots (#1, #11)</span>
              </div>
            </div>
          </div>

          {/* Section 3: Wheel Structure */}
          <div>
            <h4 className="text-sm font-black text-white font-mono uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>🎡</span> Wheel Structure
            </h4>
            <ul className="list-disc list-inside space-y-1 text-[#C4D3EA]">
              <li>The wheel contains 24 total numbered slots (1 to 24).</li>
              <li>There are exactly <strong>11 GREEN slots</strong>, <strong>11 BLUE slots</strong>, and <strong>2 RED slots</strong> (#1 & #11).</li>
              <li>When the wheel stops, the slot beneath the top golden pointer (▼) determines the winning outcome.</li>
            </ul>
          </div>

          {/* Section 4: Fairness */}
          <div className="p-3 rounded-2xl bg-[#06122E] border border-emerald-500/30 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="block text-xs font-black text-emerald-400 font-mono uppercase tracking-wider">
                Provably Fair & Server-Side
              </span>
              <p className="text-[11px] text-[#7285AE] mt-0.5">
                Wheel outcomes are independently generated on the server using cryptographically secure random number generators prior to evaluating your bet.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#287BFF] to-[#00D9FF] text-[#06122E] font-black font-mono text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(0,217,255,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          Got It, Let's Play
        </button>
      </div>
    </div>
  );
}
