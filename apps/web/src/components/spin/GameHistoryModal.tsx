'use client';

import React from 'react';
import { UserBet, SpinResult } from './types';

interface GameHistoryModalProps {
  showMyBetsModal: boolean;
  showHistoryModal: boolean;
  userBets: UserBet[];
  history: SpinResult[];
  onCloseMyBets: () => void;
  onCloseHistory: () => void;
}

export const GameHistoryModal: React.FC<GameHistoryModalProps> = ({
  showMyBetsModal,
  showHistoryModal,
  userBets,
  history,
  onCloseMyBets,
  onCloseHistory,
}) => {
  // Performance Stats Calculation for My Past Record
  const totalBetsCount = userBets.length;
  const totalWageredAmount = userBets.reduce((acc, b) => acc + b.amount, 0);
  const totalWonAmount = userBets.reduce(
    (acc, b) => acc + (b.status === 'won' ? b.payout : 0),
    0
  );
  const totalWinsCount = userBets.filter((b) => b.status === 'won').length;
  const winRatePercent =
    totalBetsCount > 0 ? ((totalWinsCount / totalBetsCount) * 100).toFixed(1) : '0.0';

  if (showMyBetsModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-[#0b1424] border border-[#273d61] rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#1c2d4a] pb-3">
            <h3 className="text-lg font-black text-amber-400 flex items-center gap-2 font-mono">
              <span>📜</span> MY PAST BET RECORDS
            </h3>
            <button
              type="button"
              onClick={onCloseMyBets}
              className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Performance Stats Cards */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
            <div className="bg-[#15243b] p-2 rounded-xl border border-[#273d61]">
              <span className="text-[10px] text-slate-400 block">TOTAL BETS</span>
              <span className="font-bold text-white text-sm">{totalBetsCount}</span>
            </div>
            <div className="bg-[#15243b] p-2 rounded-xl border border-[#273d61]">
              <span className="text-[10px] text-slate-400 block">WAGERED</span>
              <span className="font-bold text-white text-sm">
                ₹{totalWageredAmount.toFixed(0)}
              </span>
            </div>
            <div className="bg-[#15243b] p-2 rounded-xl border border-[#273d61]">
              <span className="text-[10px] text-slate-400 block">TOTAL WON</span>
              <span className="font-bold text-emerald-400 text-sm">
                ₹{totalWonAmount.toFixed(0)}
              </span>
            </div>
            <div className="bg-[#15243b] p-2 rounded-xl border border-[#273d61]">
              <span className="text-[10px] text-slate-400 block">WIN RATE</span>
              <span className="font-bold text-amber-400 text-sm">
                {winRatePercent}%
              </span>
            </div>
          </div>

          {/* User History Table */}
          <div className="max-h-72 overflow-y-auto divide-y divide-[#1c2d4a] text-xs font-mono scrollbar-thin">
            {userBets.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No past record found.</div>
            ) : (
              userBets.map((b) => (
                <div
                  key={b.id}
                  className="py-2.5 flex items-center justify-between hover:bg-[#122037]/50 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <div className="font-bold text-slate-200">
                      [{b.betType === 'number' ? `NUM #${b.option}` : b.option.toUpperCase()}] — ₹{b.amount.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Period #{b.periodNumber} • {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    {b.status === 'won' ? (
                      <span className="font-black text-emerald-400 text-sm">
                        +₹{b.payout.toFixed(2)}
                      </span>
                    ) : b.status === 'pending' ? (
                      <span className="text-amber-400 font-bold animate-pulse">
                        PENDING
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold">LOST</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={onCloseMyBets}
            className="w-full py-3 bg-[#15243b] hover:bg-[#20304c] text-white font-bold rounded-xl text-xs transition-all font-mono cursor-pointer"
          >
            CLOSE RECORD
          </button>
        </div>
      </div>
    );
  }

  if (showHistoryModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-[#0b1424] border border-[#273d61] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#1c2d4a] pb-3">
            <h3 className="text-lg font-black text-amber-400 flex items-center gap-2 font-mono">
              <span>⏱</span> PERIOD RESULT HISTORY
            </h3>
            <button
              type="button"
              onClick={onCloseHistory}
              className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#1c2d4a] text-xs font-mono scrollbar-thin">
            {history.map((h, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] block">
                    Period #{h.periodNumber}
                  </span>
                  <span className="font-bold text-slate-200">
                    Sector #{h.label || h.number} ({h.animal.toUpperCase()})
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-amber-400 text-sm">
                    {h.multiplier.toFixed(2)}x
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onCloseHistory}
            className="w-full py-2.5 bg-[#15243b] hover:bg-[#20304c] text-white font-bold rounded-xl text-xs transition-all font-mono cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    );
  }

  return null;
};
