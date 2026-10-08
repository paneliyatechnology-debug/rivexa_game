'use client';

import React from 'react';
import { useChickenRoadStore } from '../../../store/chickenRoadStore';
import { X, HelpCircle, ShieldCheck, Play, ArrowRight } from 'lucide-react';

export const HelpModal: React.FC = () => {
  const activeModal = useChickenRoadStore((s) => s.activeModal);
  const closeModal = useChickenRoadStore((s) => s.closeModal);

  if (activeModal !== 'help') return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#242424] border border-[#3e3e3e] rounded-3xl p-6 max-w-lg w-full text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={closeModal}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full bg-[#333]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-7 h-7 text-amber-400" />
          <h2 className="text-xl font-bold">How to Play Chicken Road</h2>
        </div>

        <div className="flex flex-col gap-4 text-xs text-zinc-300">
          <div className="bg-[#1e1e1e] p-4 rounded-2xl border border-[#333] flex flex-col gap-2">
            <h3 className="font-bold text-amber-400 uppercase tracking-wider text-sm flex items-center gap-1.5">
              <Play className="w-4 h-4" /> Game Rules
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-zinc-300 leading-relaxed">
              <li>Select your preferred bet amount.</li>
              <li>Choose a difficulty level: <strong>Easy</strong>, <strong>Medium</strong>, <strong>Hard</strong>, or <strong>Hardcore</strong>.</li>
              <li>Press <strong>PLAY</strong> to start the chicken at the edge of the road.</li>
              <li>Click <strong>GO</strong> to cross each checkpoint manhole.</li>
              <li>Every successful crossing increases your payout multiplier!</li>
              <li>Click <strong>CASH OUT</strong> anytime to collect your winnings before getting hit.</li>
              <li>If a vehicle crashes into the chicken, the round ends.</li>
            </ol>
          </div>

          <div className="bg-[#1e1e1e] p-4 rounded-2xl border border-[#333] flex flex-col gap-2">
            <h3 className="font-bold text-emerald-400 uppercase tracking-wider text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Independent Fair Rounds
            </h3>
            <p className="leading-relaxed">
              Every round is independently generated. Previous wins or losses do not affect future rounds. Outcomes are 100% server-authoritative and provably fair.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
