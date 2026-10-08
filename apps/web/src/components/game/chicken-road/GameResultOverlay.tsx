'use client';

import React from 'react';
import { useChickenRoadStore } from '../../../store/chickenRoadStore';
import { Trophy, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';

export const GameResultOverlay: React.FC = () => {
  const status = useChickenRoadStore((s) => s.status);
  const multiplier = useChickenRoadStore((s) => s.multiplier);
  const potentialPayout = useChickenRoadStore((s) => s.potentialPayout);
  const currency = useChickenRoadStore((s) => s.currency);
  const resetGame = useChickenRoadStore((s) => s.resetGame);
  const openModal = useChickenRoadStore((s) => s.openModal);
  const roundId = useChickenRoadStore((s) => s.roundId);

  // On CRASH / loss, do NOT show modal popup window (matches reference game Screenshot 2)
  if (status !== 'CASHED_OUT') {
    return null;
  }

  const symbol = currency === 'INR' ? '₹' : currency;

  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#2a2a2a] border border-[#444] rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center text-white shadow-2xl flex flex-col items-center gap-4">
        <div className="relative w-20 h-20 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center text-amber-400 p-2">
          <img
            src="/assets/chicken-road/Assets/chicken.png"
            alt="Winner Chicken"
            className="w-full h-full object-contain animate-bounce"
          />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-extrabold text-amber-400 tracking-wide uppercase">CASHED OUT!</h2>
          <p className="text-zinc-400 text-xs">Chicken crossed safely!</p>
        </div>

        <div className="bg-[#1f1f1f] border border-[#333] rounded-2xl p-4 w-full flex flex-col items-center">
          <span className="text-sm font-mono text-zinc-400">Multiplier: {multiplier.toFixed(2)}x</span>
          <span className="text-3xl font-extrabold text-emerald-400 mt-1">
            +{symbol}{potentialPayout.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col w-full gap-2 mt-2">
          <button
            onClick={resetGame}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-extrabold text-lg rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
            <span>PLAY AGAIN</span>
          </button>

          {roundId && (
            <button
              onClick={() => openModal('fairness', roundId)}
              className="w-full py-2.5 bg-[#333] hover:bg-[#444] text-zinc-300 font-semibold text-xs rounded-xl border border-[#444] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verify Provably Fair</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
