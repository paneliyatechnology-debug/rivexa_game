'use client';

import React from 'react';
import { useChickenRoadStore } from '../../../store/chickenRoadStore';
import { BetAmountControl } from './BetAmountControl';
import { DifficultySelector } from './DifficultySelector';
import { useChickenRoad } from '../../../hooks/useChickenRoad';

export const BetPanel: React.FC = () => {
  const status = useChickenRoadStore((s) => s.status);
  const canMove = useChickenRoadStore((s) => s.canMove);
  const potentialPayout = useChickenRoadStore((s) => s.potentialPayout);
  const canCashout = useChickenRoadStore((s) => s.canCashout);
  const currency = useChickenRoadStore((s) => s.currency);

  const { handlePlay, handleMove, handleCashout } = useChickenRoad();

  const isRunning = status === 'RUNNING' || status === 'MOVING';
  const isGoDisabled = status !== 'RUNNING' || !canMove;
  const symbol = currency === 'INR' ? '₹' : currency;

  return (
    <div className="w-full bg-[#17191e] border-t border-[#2a2d36] p-3 sm:p-5 md:p-6 text-white flex flex-col shrink-0">
      {/* Spacious Rounded Bet Container matching Official Reference Screenshot */}
      <div className="bg-[#22252c] border border-[#323642] rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center">
          {/* Bet Amount Controls */}
          <div className="md:col-span-5 lg:col-span-4">
            <BetAmountControl />
          </div>

          {/* Difficulty Controls */}
          <div className="md:col-span-7 lg:col-span-5">
            <DifficultySelector />
          </div>

          {/* Big Action Buttons */}
          <div className="md:col-span-12 lg:col-span-3 flex items-center justify-end w-full h-full">
            {!isRunning ? (
              /* Big Emerald Green Play Button */
              <button
                onClick={handlePlay}
                className="w-full h-14 sm:h-20 lg:h-[104px] bg-[#22c55e] hover:bg-[#16a34a] active:scale-[0.98] text-white font-black text-2xl sm:text-3xl md:text-5xl tracking-wide rounded-2xl sm:rounded-3xl shadow-xl transition-all flex items-center justify-center cursor-pointer"
              >
                Play
              </button>
            ) : (
              /* Active Game Buttons (CASH OUT + GO) */
              <div className="grid grid-cols-2 gap-3 w-full h-14 sm:h-20 lg:h-[104px]">
                {/* CASH OUT Button matching Official Reference Yellow Style */}
                <button
                  onClick={handleCashout}
                  disabled={!canCashout}
                  className={`h-full flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl font-black shadow-xl transition-all p-2 ${
                    canCashout
                      ? 'bg-[#facc15] hover:bg-[#eab308] text-slate-950 active:scale-95 cursor-pointer'
                      : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className="text-[10px] sm:text-xs md:text-sm uppercase tracking-wider font-black opacity-90">CASH OUT</span>
                  <span className="text-sm sm:text-lg md:text-3xl font-mono font-black leading-tight">
                    {potentialPayout.toFixed(2)} {symbol}
                  </span>
                </button>

                {/* GO Button */}
                <button
                  onClick={handleMove}
                  disabled={status === 'MOVING'}
                  className={`h-full bg-[#22c55e] hover:bg-[#16a34a] active:scale-95 text-white font-black text-2xl sm:text-3xl md:text-5xl tracking-wider rounded-2xl sm:rounded-3xl shadow-xl transition-all flex items-center justify-center cursor-pointer ${
                    status === 'MOVING' ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  {status === 'MOVING' ? '...' : 'GO'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BetPanel;
