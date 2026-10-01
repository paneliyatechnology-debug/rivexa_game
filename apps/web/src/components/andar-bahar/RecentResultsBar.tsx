'use client';

import React from 'react';

export interface HistoryRecord {
  period_number?: string;
  periodId?: string;
  winner?: 'andar' | 'bahar' | 'tie' | string;
  winning_side?: 'andar' | 'bahar' | 'tie' | string;
}

interface RecentResultsBarProps {
  history: HistoryRecord[];
  onViewAll: () => void;
}

export const RecentResultsBar: React.FC<RecentResultsBarProps> = ({ history, onViewAll }) => {
  return (
    <div className="bg-[#071735]/95 border-2 border-[#00D9FF]/50 rounded-[22px] p-3 sm:p-4 shadow-[0_0_25px_rgba(0,217,255,0.25)] backdrop-blur-2xl space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#243D66]">
        <div className="flex items-center gap-2">
          <i className="bi bi-clock-history text-[#00D9FF] text-xs sm:text-sm drop-shadow-[0_0_8px_#00D9FF]" />
          <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
            RECORD HISTORY (RECENT 30)
          </h3>
        </div>
        <button
          onClick={onViewAll}
          className="text-[#00D9FF] hover:underline text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
        >
          <span>More</span>
          <i className="bi bi-chevron-right text-[10px]" />
        </button>
      </div>

      {/* Horizontal Scrollable Pills Row */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#00D9FF]/40 pb-1.5 pt-0.5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-max">
          {history.length === 0 ? (
            <p className="text-xs text-[#8795B5] py-2 font-mono italic">No record history yet.</p>
          ) : (
            history.slice(0, 30).map((item, idx) => {
              const winnerStr = (item.winner || item.winning_side || 'andar').toLowerCase();
              const periodNum = item.period_number || item.periodId || `P${idx}`;
              const shortPeriod = periodNum.slice(-4);

              let badgeStyle = '';
              let badgeLetter = 'A';

              if (winnerStr === 'bahar') {
                badgeLetter = 'B';
                badgeStyle =
                  'bg-[#F4145B] border border-[#F13FA4] text-white shadow-[0_0_12px_rgba(244,20,91,0.6)]';
              } else if (winnerStr === 'tie') {
                badgeLetter = 'T';
                badgeStyle =
                  'bg-[#FFC928] border border-[#F59E0B] text-[#03081B] shadow-[0_0_12px_rgba(255,201,40,0.6)] font-black';
              } else {
                badgeLetter = 'A';
                badgeStyle =
                  'bg-[#1677FF] border border-[#00D9FF] text-white shadow-[0_0_12px_rgba(22,119,255,0.6)]';
              }

              return (
                <div key={`${periodNum}-${idx}`} className="flex flex-col items-center gap-1 group">
                  {/* Circular Pill */}
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-xs sm:text-sm transition-all duration-300 group-hover:scale-110 cursor-pointer ${badgeStyle}`}
                  >
                    {badgeLetter}
                  </div>
                  {/* Short Period Number */}
                  <span className="text-[9px] sm:text-[10px] font-mono text-[#8795B5] group-hover:text-[#00D9FF] transition-all">
                    #{shortPeriod}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
