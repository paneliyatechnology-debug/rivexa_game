'use client';

import React, { useState } from 'react';
import { PlayingCard } from './PlayingCard';

export interface HistoryItemData {
  id?: string;
  period_number?: string;
  periodId?: string;
  open_card?: string;
  openCard?: string;
  winner?: string;
  winning_side?: string;
  winning_card?: string;
  winningCard?: string;
  created_at?: string;
  createdAt?: string;
}

interface FullHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyData: HistoryItemData[];
  isLoading?: boolean;
}

export const FullHistoryModal: React.FC<FullHistoryModalProps> = ({
  isOpen,
  onClose,
  historyData,
  isLoading = false,
}) => {
  const [page, setPage] = useState<number>(1);
  const perPage = 8;

  if (!isOpen) return null;

  const totalItems = historyData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const rows = historyData.slice((page - 1) * perPage, page * perPage);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-[#071735] border-2 border-[#00D9FF]/60 rounded-[28px] max-w-xl w-full p-3.5 sm:p-6 text-white space-y-3.5 shadow-[0_0_50px_rgba(0,217,255,0.4)] animate-in fade-in zoom-in-95 relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Ambient Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00D9FF] to-transparent shadow-[0_0_15px_#00D9FF]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#243D66] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <i className="bi bi-clock-history text-[#00D9FF] text-base sm:text-lg drop-shadow-[0_0_8px_#00D9FF]" />
            <h3 className="text-sm sm:text-lg font-black text-white uppercase tracking-wider">
              COMPLETE RECORD HISTORY
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#10254B] border border-[#287BFF]/30 text-[#A5B4D0] hover:text-white flex items-center justify-center cursor-pointer transition-all shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto flex-1 min-h-[320px] pr-0.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <i className="bi bi-arrow-repeat text-3xl text-[#00D9FF] animate-spin" />
              <span className="text-xs font-mono font-bold text-[#A5B4D0]">
                Loading complete history...
              </span>
            </div>
          ) : totalItems === 0 ? (
            <p className="text-center text-xs text-[#8795B5] py-16 font-mono italic">
              No complete history records found.
            </p>
          ) : (
            <>
              {/* Desktop / Laptop Table View */}
              <table className="w-full text-left text-xs font-mono border-collapse hidden sm:table">
                <thead className="text-[10px] text-[#A5B4D0] uppercase tracking-wider border-b border-[#243D66]">
                  <tr>
                    <th className="py-2 px-2">PERIOD</th>
                    <th className="py-2 px-2">JOKER CARD</th>
                    <th className="py-2 px-2">WINNER</th>
                    <th className="py-2 px-2">WINNING CARD</th>
                    <th className="py-2 px-2 text-right">TIME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[#F4F8FF]">
                  {rows.map((item, idx) => {
                    const periodNum = item.period_number || item.periodId || `P${idx}`;
                    const shortPeriod = periodNum.length > 8 ? periodNum.slice(-8) : periodNum;
                    const openC = item.open_card || item.openCard || '7♦';
                    const winnerStr = (item.winner || item.winning_side || 'andar').toLowerCase();
                    const winC = item.winning_card || item.winningCard || openC;

                    let badgeClass = 'bg-[#1677FF]/20 text-[#00D9FF] border-[#1677FF]/60';
                    if (winnerStr === 'bahar') {
                      badgeClass = 'bg-[#F4145B]/20 text-[#F13FA4] border-[#F4145B]/60';
                    } else if (winnerStr === 'tie') {
                      badgeClass = 'bg-[#FFC928]/20 text-[#FFC928] border-[#FFC928]/60';
                    }

                    return (
                      <tr key={item.id || idx} className="hover:bg-[#10254B]/60 transition-all">
                        <td className="py-2.5 px-2 font-bold text-white text-[11px]" title={`#${periodNum}`}>
                          #{shortPeriod}
                        </td>
                        <td className="py-2.5 px-2">
                          <PlayingCard card={openC} size="sm" />
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase border shadow-md ${badgeClass}`}
                          >
                            {winnerStr}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <PlayingCard card={winC} size="sm" />
                        </td>
                        <td className="py-2.5 px-2 text-right text-[#8795B5] text-[10px]">
                          {formatTime(item.created_at || item.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile View: Compact Responsive Item Cards */}
              <div className="space-y-2 sm:hidden">
                {rows.map((item, idx) => {
                  const periodNum = item.period_number || item.periodId || `P${idx}`;
                  const shortPeriod = periodNum.length > 8 ? periodNum.slice(-8) : periodNum;
                  const openC = item.open_card || item.openCard || '7♦';
                  const winnerStr = (item.winner || item.winning_side || 'andar').toLowerCase();
                  const winC = item.winning_card || item.winningCard || openC;

                  let badgeClass = 'bg-[#1677FF]/20 text-[#00D9FF] border-[#1677FF]/60';
                  if (winnerStr === 'bahar') {
                    badgeClass = 'bg-[#F4145B]/20 text-[#F13FA4] border-[#F4145B]/60';
                  } else if (winnerStr === 'tie') {
                    badgeClass = 'bg-[#FFC928]/20 text-[#FFC928] border-[#FFC928]/60';
                  }

                  return (
                    <div
                      key={item.id || idx}
                      className="bg-[#0B1530] border border-[#287BFF]/30 rounded-xl p-2.5 flex items-center justify-between font-mono text-xs"
                    >
                      {/* Left: Period & Winner */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-[11px]" title={`#${periodNum}`}>
                            #{shortPeriod}
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded-full font-black text-[9px] uppercase border ${badgeClass}`}
                          >
                            {winnerStr}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#8795B5] block">
                          {formatTime(item.created_at || item.createdAt)}
                        </span>
                      </div>

                      {/* Right: Cards Pair (Open Card -> Win Card) */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] text-[#A5B4D0] font-bold mb-0.5">JOKER</span>
                          <PlayingCard card={openC} size="sm" />
                        </div>
                        <span className="text-[#00D9FF] font-bold text-xs">➔</span>
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] text-[#00E5A0] font-bold mb-0.5">WIN</span>
                          <PlayingCard card={winC} size="sm" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Modal Pagination Footer */}
        <div className="pt-2 border-t border-[#243D66] flex items-center justify-between text-xs font-mono shrink-0">
          <span className="text-[10px] text-[#8795B5]">
            Page {page} of {totalPages} ({totalItems} Total)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg bg-[#10254B] border border-[#287BFF]/40 text-[#00D9FF] text-[11px] font-bold hover:bg-[#172947] disabled:opacity-40 transition-all cursor-pointer"
            >
              ‹ Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg bg-[#10254B] border border-[#287BFF]/40 text-[#00D9FF] text-[11px] font-bold hover:bg-[#172947] disabled:opacity-40 transition-all cursor-pointer"
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
