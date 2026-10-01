'use client';

import React from 'react';
import { PlayingCard } from './PlayingCard';

interface GameStatusPanelProps {
  countdown: number;
  bettingOpen: boolean;
  isDealing: boolean;
  currentWin?: number;
  balance: number;
  openCard?: string;
}

export const GameStatusPanel: React.FC<GameStatusPanelProps> = ({
  countdown,
  bettingOpen,
  isDealing,
  currentWin = 0,
  balance,
  openCard = '7♦',
}) => {
  // Format MM:SS
  const mins = String(Math.floor(countdown / 60)).padStart(2, '0');
  const secs = String(countdown % 60).padStart(2, '0');
  const timerText = `${mins}:${secs}`;

  // Timer Color Dynamics
  let timerColorClass = 'text-[#00E5A0] drop-shadow-[0_0_12px_rgba(0,229,160,0.8)]';
  let pulseClass = '';

  if (countdown <= 5) {
    timerColorClass = 'text-[#FF3155] drop-shadow-[0_0_15px_rgba(255,49,85,1)]';
    pulseClass = 'animate-pulse scale-105';
  } else if (countdown <= 10) {
    timerColorClass = 'text-[#FFC928] drop-shadow-[0_0_14px_rgba(255,201,40,0.8)]';
  }

  return (
    <div className="bg-[#071735]/95 border-2 border-[#00D9FF]/50 rounded-[22px] p-3 sm:p-4 shadow-[0_0_25px_rgba(0,217,255,0.25)] text-white backdrop-blur-2xl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 items-center">
        {/* 1. Countdown Timer Section */}
        <div className="bg-[#0B1530] border border-[#287BFF]/30 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 shadow-[inset_0_0_15px_rgba(0,217,255,0.1)]">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#10254B] border border-[#287BFF]/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(40,123,255,0.4)]">
            <i className={`bi bi-clock-history text-lg sm:text-xl ${timerColorClass}`} />
          </div>

          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-extrabold text-[#A5B4D0] uppercase tracking-wider block">
              COUNTDOWN TIMER
            </span>
            <span className={`text-base sm:text-xl font-black font-mono tracking-tight block ${timerColorClass} ${pulseClass}`}>
              {timerText}
            </span>
            <div className="inline-flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  bettingOpen ? 'bg-[#00E5A0] animate-ping' : 'bg-[#873BFF]'
                }`}
              />
              <span
                className={`text-[9px] sm:text-[10px] font-extrabold font-mono uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  bettingOpen
                    ? 'bg-[#00E5A0]/20 text-[#00E5A0] border border-[#00E5A0]/50'
                    : isDealing
                    ? 'bg-[#FFC928]/20 text-[#FFC928] border border-[#FFC928]/50 animate-pulse'
                    : 'bg-[#873BFF]/20 text-[#873BFF] border border-[#873BFF]/50 animate-pulse'
                }`}
              >
                {bettingOpen ? (
                  'BETTING OPEN'
                ) : isDealing ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin text-[10px]" /> CARDS DEALING...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin text-[10px]" /> WAITING NEXT ROUND...
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* 2. OPEN CARD (JOKER CARD) DISPLAY BOX */}
        <div className="bg-[#0B1530] border-2 border-[#00D9FF]/60 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-[0_0_20px_rgba(0,217,255,0.25)] relative overflow-hidden">
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-black text-[#A5B4D0] uppercase tracking-wider block">
              OPEN JOKER CARD
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[#00D9FF] block">
              Match rank to win
            </span>
            <span className="text-[9px] font-mono text-[#A5B4D0] block mt-0.5">
              Target Card
            </span>
          </div>

          <div className="shrink-0 flex items-center justify-center pl-2">
            <PlayingCard card={openCard} size="md" className="shadow-[0_0_15px_rgba(0,217,255,0.6)]" />
          </div>
        </div>

        {/* 3. Current Win */}
        <div className="bg-[#0B1530] border border-[#287BFF]/30 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 shadow-[inset_0_0_15px_rgba(0,217,255,0.1)]">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#10254B] border border-[#FFC928]/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,201,40,0.4)]">
            <i className="bi bi-trophy-fill text-lg sm:text-xl text-[#FFC928]" />
          </div>
          <div>
            <span className="text-[9px] sm:text-[10px] font-extrabold text-[#A5B4D0] uppercase tracking-wider block">
              CURRENT WIN
            </span>
            <span className="text-base sm:text-xl font-black font-mono text-[#00E5A0] drop-shadow-[0_0_12px_rgba(0,229,160,0.6)]">
              ₹{Number(currentWin).toFixed(2)}
            </span>
          </div>
        </div>

        {/* 4. Wallet Balance */}
        <div className="bg-[#0B1530] border border-[#287BFF]/30 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 shadow-[inset_0_0_15px_rgba(0,217,255,0.1)]">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#10254B] border border-[#00D9FF]/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,217,255,0.4)]">
            <i className="bi bi-wallet2 text-lg sm:text-xl text-[#00D9FF]" />
          </div>
          <div>
            <span className="text-[9px] sm:text-[10px] font-extrabold text-[#A5B4D0] uppercase tracking-wider block">
              BALANCE
            </span>
            <span className="text-base sm:text-xl font-black font-mono text-[#00D9FF] drop-shadow-[0_0_12px_rgba(0,217,255,0.6)]">
              ₹{Number(balance).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
