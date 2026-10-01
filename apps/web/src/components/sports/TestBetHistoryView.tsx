'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '@/lib/config';
import { Ticket, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, ShieldAlert, Coins } from 'lucide-react';

export interface ITestBetSelection {
  id: string;
  marketName: string;
  selectionName: string;
  oddsAtPlacement: number;
  stake: number;
  status: string;
}

export interface ITestBet {
  id: string;
  betReference: string;
  totalStake: number;
  potentialReturn: number;
  potentialProfit: number;
  status: string;
  createdAt: string;
  match?: {
    teamA?: { name: string; shortName?: string };
    teamB?: { name: string; shortName?: string };
  };
  selections: ITestBetSelection[];
}

export function TestBetHistoryView({ onClose }: { onClose?: () => void }) {
  const [bets, setBets] = useState<ITestBet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/test-bets/history`);
      if (!res.ok) throw new Error('Failed to load test bet history');
      const json = await res.json();
      if (json.data) {
        setBets(json.data);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading bet history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="bg-gradient-to-br from-[#091533] to-[#050C20] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#287BFF]/20 text-[#00D9FF] flex items-center justify-center border border-[#287BFF]/30">
            <Ticket className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white tracking-wide">Test Bet History</h3>
            <p className="text-[11px] text-[#7183A8]">
              Non-Monetary Development & Testing Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchHistory()}
            className="p-2 bg-[#0C1A3E] hover:bg-[#152754] text-[#B8C7E6] hover:text-white rounded-xl text-xs transition-colors border border-white/5 cursor-pointer flex items-center gap-1.5 font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Test Mode Disclaimer */}
      <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-xs text-amber-300">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <span>All bets listed below are virtual test bets. No real money or real wallet balances are involved.</span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-8 text-center text-xs text-slate-400 space-y-2">
          <div className="w-6 h-6 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Loading test bet records...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && bets.length === 0 && (
        <div className="py-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#0E1C3E] text-slate-500 flex items-center justify-center mx-auto">
            <Ticket className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-400">No test bets placed yet.</p>
        </div>
      )}

      {/* Bet List */}
      {!isLoading && !error && bets.length > 0 && (
        <div className="space-y-3 max-h-[500px] overflow-y-auto no-scrollbar pr-1">
          {bets.map((bet) => {
            const matchName = bet.match
              ? `${bet.match.teamA?.shortName || bet.match.teamA?.name} vs ${bet.match.teamB?.shortName || bet.match.teamB?.name}`
              : 'Cricket Match';

            return (
              <div
                key={bet.id}
                className="bg-[#061026] border border-white/10 rounded-xl p-3 sm:p-4 space-y-3 hover:border-white/20 transition-all"
              >
                {/* Bet Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#00E5A0]">
                      {bet.betReference}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(bet.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        bet.status === 'WON'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : bet.status === 'LOST'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {bet.status}
                    </span>
                  </div>
                </div>

                {/* Match Title */}
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{matchName}</span>
                </div>

                {/* Selections List */}
                <div className="space-y-1.5 bg-[#0A1633] p-2.5 rounded-lg border border-white/5">
                  {bet.selections.map((sel) => (
                    <div
                      key={sel.id}
                      className="flex items-center justify-between text-xs text-slate-200"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-slate-400 text-[11px] font-medium shrink-0">
                          {sel.marketName}:
                        </span>
                        <span className="font-bold truncate text-white">{sel.selectionName}</span>
                      </div>
                      <div className="font-mono text-[11px] shrink-0 text-[#00D9FF]">
                        @{Number(sel.oddsAtPlacement).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bet Summary Financials */}
                <div className="flex items-center justify-between pt-1 text-xs font-mono">
                  <div className="text-slate-400">
                    Stake: <span className="font-bold text-white">₹{Number(bet.totalStake).toFixed(2)}</span>
                  </div>
                  <div className="text-slate-400">
                    Pot. Return:{' '}
                    <span className="font-bold text-[#00E5A0]">
                      ₹{Number(bet.potentialReturn).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    Profit:{' '}
                    <span className="font-bold text-[#00D9FF]">
                      ₹{Number(bet.potentialProfit).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
