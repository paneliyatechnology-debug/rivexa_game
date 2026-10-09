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
  const playCooldown = useChickenRoadStore((s) => s.playCooldown);

  const { handlePlay, handleMove, handleCashout } = useChickenRoad();

  const isRunning = status === 'RUNNING' || status === 'MOVING';
  const isGoDisabled = status !== 'RUNNING' || !canMove;
  const symbol = currency === 'INR' ? '₹' : currency;

  // Keyboard navigation & TV remote shortcut handlers
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing in inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        if (!isRunning && playCooldown === 0) {
          e.preventDefault();
          handlePlay();
        } else if (status === 'RUNNING' && canMove) {
          e.preventDefault();
          handleMove();
        }
      } else if (e.code === 'KeyC' || (e.shiftKey && e.code === 'Enter')) {
        if (isRunning && canCashout) {
          e.preventDefault();
          handleCashout();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, status, canMove, canCashout, playCooldown, handlePlay, handleMove, handleCashout]);

  return (
    <div className="w-full bg-[#17191e] border-t border-[#2a2d36] px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 md:py-6 lg:py-7 text-white flex flex-col shrink-0">
      {/* Sleek Rounded Bet Container matching Official Reference Screenshot */}
      <div className="bg-[#242731] border border-[#343744] rounded-2xl p-4 sm:p-5 md:p-6 lg:p-7 shadow-2xl w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.05fr_1.2fr_0.75fr] gap-4 sm:gap-5 md:gap-6 items-stretch w-full">
          {/* Bet Amount Controls */}
          <div className="w-full min-w-0 col-span-1 flex flex-col justify-between">
            <BetAmountControl />
          </div>

          {/* Difficulty Controls */}
          <div className="w-full min-w-0 col-span-1 flex flex-col justify-between">
            <DifficultySelector />
          </div>

          {/* Big Action Buttons */}
          <div className="w-full min-w-0 col-span-1 md:col-span-2 lg:col-span-1 flex flex-col justify-end">
            {!isRunning ? (
              playCooldown > 0 ? (
                /* Disabled Cooldown Button (5s countdown) */
                <button
                  disabled
                  className="w-full h-full min-h-[110px] sm:min-h-[124px] md:min-h-[140px] lg:min-h-[164px] bg-slate-800 border border-slate-700 text-slate-400 font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-wide rounded-2xl shadow-lg flex items-center justify-center cursor-not-allowed select-none opacity-80"
                >
                  Wait {playCooldown}s...
                </button>
              ) : (
                /* Big Emerald Green Play Button matching Official Reference Image */
                <button
                  onClick={handlePlay}
                  className="w-full h-full min-h-[110px] sm:min-h-[124px] md:min-h-[140px] lg:min-h-[164px] bg-[#27cf68] hover:bg-[#22b85c] active:scale-[0.98] text-white font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-wide rounded-2xl shadow-xl transition-all flex items-center justify-center cursor-pointer select-none py-4"
                >
                  Play
                </button>
              )
            ) : (
              /* Active Game Buttons (CASH OUT + GO) */
              <div className="grid grid-cols-2 gap-3 w-full h-full min-h-[110px] sm:min-h-[124px] md:min-h-[140px] lg:min-h-[164px]">
                {/* CASH OUT Button matching Official Reference Yellow Style */}
                <button
                  onClick={handleCashout}
                  disabled={!canCashout}
                  className={`h-full flex flex-col items-center justify-center rounded-2xl font-black shadow-lg transition-all p-2.5 ${
                    canCashout
                      ? 'bg-[#facc15] hover:bg-[#eab308] text-slate-950 active:scale-95 cursor-pointer'
                      : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className="text-xs sm:text-sm md:text-base uppercase tracking-wider font-black opacity-90">CASH OUT</span>
                  <span className="text-base sm:text-lg md:text-2xl lg:text-3xl font-mono font-black leading-tight truncate">
                    {potentialPayout.toFixed(2)} {symbol}
                  </span>
                </button>

                {/* GO Button */}
                <button
                  onClick={handleMove}
                  disabled={status === 'MOVING'}
                  className={`h-full bg-[#27cf68] hover:bg-[#22b85c] active:scale-95 text-white font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center cursor-pointer ${
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
