'use client';

import React from 'react';
import { UserBet } from './types';

interface MyBetsSectionProps {
  userBets: UserBet[];
  onOpenMyPastRecord: () => void;
}

export const MyBetsSection: React.FC<MyBetsSectionProps> = ({
  userBets,
  onOpenMyPastRecord,
}) => {
  return (
    <div className="bg-[#0b1424] border border-[#1c2d4a] rounded-2xl overflow-hidden shadow-md">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-[#1c2d4a] bg-[#15243b] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm">📜</span>
          <span className="text-xs font-mono font-black text-amber-300 tracking-wider uppercase">
            MY BET HISTORY ({userBets.length})
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenMyPastRecord}
          className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>📊</span> <span>Full Record Stats</span>
        </button>
      </div>

      {/* MY BETS HISTORY LIST */}
      <div className="p-3 max-h-60 overflow-y-auto divide-y divide-[#1c2d4a] text-xs font-mono scrollbar-thin">
        {userBets.length === 0 ? (
          <div className="py-6 px-4 text-center text-slate-500 font-sans text-xs">
            <span className="text-2xl block mb-1 opacity-60">🎰</span>
            No bet history yet. Choose an animal or number and press SPIN to place your first bet!
          </div>
        ) : (
          userBets.map((b) => {
            const isWon = b.status === 'won';
            const isPending = b.status === 'pending';

            return (
              <div
                key={b.id}
                className="py-2.5 px-2 flex items-center justify-between hover:bg-[#122037]/50 rounded-xl transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-100 text-xs sm:text-sm">
                      {b.betType === 'number'
                        ? `NUMBER #${b.option}`
                        : b.option.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold bg-[#15243b] px-2 py-0.5 rounded-md border border-[#273d61]">
                      Stake: ₹{b.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                    <span>Period #{b.periodNumber}</span>
                    <span>•</span>
                    <span>{new Date(b.createdAt).toLocaleTimeString()}</span>
                    {b.landedSector && (
                      <>
                        <span>•</span>
                        <span className="text-amber-300 font-bold">
                          {b.landedSector}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {isWon ? (
                    <div>
                      <div className="font-black text-emerald-400 text-sm">
                        +₹{b.payout.toFixed(2)}
                      </div>
                      <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider block">
                        WON
                      </span>
                    </div>
                  ) : isPending ? (
                    <div>
                      <span className="text-amber-400 font-bold text-xs animate-pulse">
                        SPINNING...
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold text-rose-400 text-xs">
                        -₹{b.amount.toFixed(2)}
                      </div>
                      <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">
                        LOST
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
