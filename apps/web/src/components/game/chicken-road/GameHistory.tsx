'use client';

import React, { useEffect, useState } from 'react';
import { useChickenRoadStore } from '../../../store/chickenRoadStore';
import { chickenRoadApi } from '../../../lib/chicken-road-api';
import { GameHistoryItem } from '../../../types/chicken-road';
import { X, History, ExternalLink } from 'lucide-react';

export const GameHistory: React.FC = () => {
  const activeModal = useChickenRoadStore((s) => s.activeModal);
  const closeModal = useChickenRoadStore((s) => s.closeModal);
  const openModal = useChickenRoadStore((s) => s.openModal);

  const [items, setItems] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');

  useEffect(() => {
    if (activeModal === 'history') {
      setLoading(true);
      chickenRoadApi
        .getHistory(1, 30)
        .then((res) => setItems(res.items))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [activeModal]);

  if (activeModal !== 'history') return null;

  const filteredItems = items.filter((item) => {
    if (filter === 'WIN') return item.result === 'WIN' || item.result === 'CASHOUT';
    if (filter === 'LOSS') return item.result === 'LOSS' || item.status === 'CRASHED';
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#242424] border border-[#3e3e3e] rounded-3xl p-6 max-w-2xl w-full text-white shadow-2xl relative max-h-[90vh] flex flex-col">
        <button
          onClick={closeModal}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full bg-[#333]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <History className="w-7 h-7 text-amber-400" />
          <h2 className="text-xl font-bold">Game History</h2>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-4">
          {(['ALL', 'WIN', 'LOSS'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#333] text-zinc-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="py-12 text-center text-zinc-400 text-sm">Loading game history...</div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">No game rounds found.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredItems.map((item) => {
                const isWin = item.result === 'WIN' || item.result === 'CASHOUT';
                return (
                  <div
                    key={item.id}
                    className="p-3 bg-[#1e1e1e] border border-[#333] rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-400 font-semibold">#{item.publicId || item.id.substring(0, 8)}</span>
                        <span className="text-[10px] text-zinc-500 uppercase">{item.difficulty}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(item.date).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right font-mono">
                        <div className="text-zinc-300">Bet: ₹{item.betAmount}</div>
                        <div className="text-amber-400">{item.multiplier.toFixed(2)}x</div>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className={`font-bold ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isWin ? `+₹${item.payout.toFixed(2)}` : '₹0.00'}
                        </span>
                      </div>

                      <button
                        onClick={() => openModal('fairness', item.id)}
                        className="p-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded-xl text-zinc-400 hover:text-amber-300"
                        title="Verify Fairness"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
