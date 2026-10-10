'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, Trophy, Target, TrendingDown, Clock } from 'lucide-react';

interface RoundHistory {
  id: string;
  publicId?: string;
  difficulty: string;
  betAmount: number;
  currentStep: number;
  currentMultiplier: number;
  payout: number;
  status: string;
  result: string;
  homeTeam: string;
  awayTeam: string;
  createdAt: string;
}

interface GameHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: RoundHistory[];
}

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'text-emerald-400',
  MEDIUM: 'text-blue-400',
  HARD: 'text-orange-400',
  HARDCORE: 'text-red-400',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  CASHED_OUT: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', label: 'CASHOUT' },
  COMPLETED: { bg: 'bg-amber-500/15', text: 'text-amber-300', label: 'WIN' },
  SAVED: { bg: 'bg-red-500/15', text: 'text-red-300', label: 'SAVED' },
  WIN: { bg: 'bg-amber-500/15', text: 'text-amber-300', label: 'WIN' },
  LOSS: { bg: 'bg-red-500/15', text: 'text-red-300', label: 'LOSS' },
  ACTIVE: { bg: 'bg-blue-500/15', text: 'text-blue-300', label: 'ACTIVE' },
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function GameHistoryPanel({ isOpen, onClose, history }: GameHistoryPanelProps) {
  const totalWins = history.filter((r) => ['CASHED_OUT', 'COMPLETED'].includes(r.status)).length;
  const totalPaid = history
    .filter((r) => ['CASHED_OUT', 'COMPLETED'].includes(r.status))
    .reduce((sum, r) => sum + (r.payout || 0), 0);
  const totalStaked = history.reduce((sum, r) => sum + (r.betAmount || 0), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative bg-gradient-to-b from-[#0c1830] to-[#060b17] border border-white/15 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                  <History className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Round History</h3>
                  <p className="text-[10px] text-gray-400">Your last {history.length} rounds</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 px-6 py-4">
              <div className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Rounds</p>
                <p className="text-xl font-black text-white">{history.length}</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">Won</p>
                <p className="text-xl font-black text-emerald-300">
                  ₹{totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">Staked</p>
                <p className="text-xl font-black text-red-300">
                  ₹{totalStaked.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* History list */}
            <div className="px-4 pb-6 max-h-96 overflow-y-auto space-y-2 scrollbar-none">
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm font-bold">No rounds played yet</p>
                  <p className="text-gray-600 text-xs mt-1">Start a round to see your history here</p>
                </div>
              ) : (
                history.map((round) => {
                  const statusStyle = STATUS_STYLES[round.status] || STATUS_STYLES.LOSS;
                  const diffColor = DIFFICULTY_COLORS[round.difficulty] || 'text-gray-400';
                  const isWin = ['CASHED_OUT', 'COMPLETED'].includes(round.status);
                  const profit = (round.payout || 0) - (round.betAmount || 0);

                  return (
                    <div
                      key={round.id}
                      className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-2xl p-3.5 hover:bg-white/8 transition"
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${statusStyle.bg}`}>
                        {isWin ? (
                          <Trophy className={`w-4 h-4 ${statusStyle.text}`} />
                        ) : (
                          <TrendingDown className={`w-4 h-4 ${statusStyle.text}`} />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${diffColor}`}>
                            {round.difficulty}
                          </span>
                          <span className="text-[9px] text-gray-500">•</span>
                          <span className="text-[10px] text-gray-400">
                            {round.homeTeam} vs {round.awayTeam}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          <Target className="w-3 h-3" />
                          <span>{round.currentStep}/5 goals</span>
                          <span>•</span>
                          <span>{round.currentMultiplier.toFixed(2)}x</span>
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="text-right flex-shrink-0">
                        <div className={`text-sm font-black ${isWin ? 'text-emerald-300' : 'text-red-300'}`}>
                          {isWin ? '+' : ''}₹{(isWin ? (round.payout || 0) : round.betAmount).toFixed(0)}
                        </div>
                        <div className={`text-[10px] font-bold ${statusStyle.text} ${statusStyle.bg} px-2 py-0.5 rounded-full`}>
                          {statusStyle.label}
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex flex-col items-center text-[10px] text-gray-500 ml-1">
                        <Clock className="w-3 h-3 mb-0.5" />
                        {formatTimeAgo(round.createdAt)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
