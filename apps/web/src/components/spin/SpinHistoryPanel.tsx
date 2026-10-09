'use client';

import React from 'react';
import { SpinHistoryItem } from './types';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface SpinHistoryPanelProps {
  items: SpinHistoryItem[];
  page: number;
  totalPages: number;
  totalRecords: number;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onRefresh: () => void;
}

function formatTime(isoOrTime?: string): string {
  if (!isoOrTime) return '--:--';
  try {
    const d = new Date(isoOrTime);
    if (isNaN(d.getTime())) return isoOrTime;
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).toUpperCase();
  } catch {
    return '--:--';
  }
}

export function SpinHistoryPanel({
  items,
  page,
  totalPages,
  totalRecords,
  isLoading,
  onPageChange,
  onRefresh,
}: SpinHistoryPanelProps) {
  return (
    <div className="w-full min-w-0 bg-[#091735]/90 backdrop-blur-xl border border-[#287BFF]/30 rounded-2xl p-2.5 sm:p-3.5 shadow-[0_0_25px_rgba(40,123,255,0.12)] flex flex-col max-h-[560px] lg:max-h-[calc(100vh-5.5rem)] overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base">🕘</span>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white font-mono tracking-tight">
              Recent Spin History
            </h3>
            <span className="text-[10px] text-[#7285AE] font-semibold">
              {totalRecords > 0 ? `${totalRecords} Total Bets` : 'Latest Records'}
            </span>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="h-8 px-2.5 rounded-xl bg-[#06122E] border border-white/10 hover:border-[#00D9FF]/50 text-[#9DB5D8] hover:text-[#00D9FF] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          title="Refresh History"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#00D9FF]' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* History Content Area */}
      <div className="flex-1 overflow-y-auto my-2 space-y-2 pr-0.5 custom-scrollbar">
        {isLoading && items.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#7285AE]">
            <RefreshCw className="w-5 h-5 animate-spin text-[#00D9FF]" />
            <span className="text-xs font-mono">Loading spin history...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-center text-[#7285AE]">
            <span className="text-3xl">📜</span>
            <p className="text-xs font-bold text-[#9DB5D8]">No bets placed yet</p>
            <p className="text-[10px]">Place a spin bet to see your history!</p>
          </div>
        ) : (
          items.map((item, idx) => {
            const isPending = item.status === 'PENDING';
            const isWin = item.status === 'WON' || item.payoutAmount > 0;
            const choiceColor = (item.choice || 'RED').toUpperCase();
            const resultColor = (item.result || 'RED').toUpperCase();

            return (
              <div
                key={item.id || idx}
                className={`bg-[#06122E]/80 border ${
                  isPending ? 'border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]' : 'border-white/5 hover:border-[#287BFF]/30'
                } rounded-xl p-2.5 transition-all flex flex-col gap-1.5 text-xs font-mono`}
              >
                {/* Top Row: Round ID, Time, Status badge */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#00D9FF] font-bold">
                    #{item.index || (totalRecords - ((page - 1) * 10 + idx))} • {item.roundId}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#7285AE]">{formatTime(item.time)}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                        isPending
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                          : isWin
                          ? 'bg-[#00E5A0]/20 text-[#00E5A0] border border-[#00E5A0]/40'
                          : 'bg-[#FF2468]/20 text-[#FF2468] border border-[#FF2468]/40'
                      }`}
                    >
                      {isPending ? 'PENDING' : isWin ? 'WIN' : 'LOSS'}
                    </span>
                  </div>
                </div>

                {/* Middle Row: Choice -> Result, Multiplier */}
                <div className="flex items-center justify-between py-0.5 border-y border-white/5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#7285AE]">Pick:</span>
                    <span
                      className={`font-black px-1.5 py-0.5 rounded text-[10px] ${
                        choiceColor === 'GREEN'
                          ? 'bg-[#00E5A0]/20 text-[#00E5A0]'
                          : choiceColor === 'BLUE'
                          ? 'bg-[#00D9FF]/20 text-[#00D9FF]'
                          : 'bg-[#FF2468]/20 text-[#FF2468]'
                      }`}
                    >
                      {choiceColor}
                    </span>
                    <span className="text-[#7285AE]">→</span>
                    <span className="text-[#7285AE]">Result:</span>
                    {isPending ? (
                      <span className="font-bold px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400/90 border border-amber-500/20 animate-pulse">
                        ⏳ PENDING
                      </span>
                    ) : (
                      <span
                        className={`font-black px-1.5 py-0.5 rounded text-[10px] ${
                          resultColor === 'GREEN'
                            ? 'bg-[#00E5A0]/20 text-[#00E5A0]'
                            : resultColor === 'BLUE'
                            ? 'bg-[#00D9FF]/20 text-[#00D9FF]'
                            : 'bg-[#FF2468]/20 text-[#FF2468]'
                        }`}
                      >
                        {resultColor}
                      </span>
                    )}
                  </div>
                  <span className="text-[#9DB5D8] font-bold">
                    {isPending ? (
                      <span className="text-amber-400/80 font-normal">--</span>
                    ) : item.multiplier > 0 ? (
                      `${item.multiplier.toFixed(2)}x`
                    ) : (
                      '0.00x'
                    )}
                  </span>
                </div>

                {/* Bottom Row: Bet, Payout, Profit */}
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <div className="text-[#7285AE]">
                    Bet: <span className="text-white font-bold">₹{item.betAmount.toFixed(2)}</span>
                  </div>
                  <div className="text-[#7285AE]">
                    Payout:{' '}
                    <span className="text-white font-bold">
                      {isPending ? <span className="text-amber-400/80">Pending</span> : `₹${item.payoutAmount.toFixed(2)}`}
                    </span>
                  </div>
                  <div>
                    {isPending ? (
                      <span className="text-amber-400/80 font-bold font-mono">--</span>
                    ) : (
                      <span
                        className={`font-black font-mono ${
                          item.profitLoss >= 0 ? 'text-[#00E5A0]' : 'text-[#FF2468]'
                        }`}
                      >
                        {item.profitLoss >= 0
                          ? `+₹${item.profitLoss.toFixed(2)}`
                          : `-₹${Math.abs(item.profitLoss).toFixed(2)}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer: Exactly 10 records per page */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#06122E] border border-white/10 hover:border-[#00D9FF]/40 text-[#9DB5D8] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <span className="text-[11px] font-bold text-[#7285AE]">
          Page <strong className="text-white">{page}</strong> of{' '}
          <strong className="text-white">{Math.max(1, totalPages)}</strong>
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#06122E] border border-white/10 hover:border-[#00D9FF]/40 text-[#9DB5D8] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
