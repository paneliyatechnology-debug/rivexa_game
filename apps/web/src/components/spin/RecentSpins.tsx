'use client';

import React from 'react';
import { SpinResult } from './types';

interface RecentSpinsProps {
  history: SpinResult[];
  onOpenHistoryModal: () => void;
}

export const RecentSpins: React.FC<RecentSpinsProps> = ({
  history,
  onOpenHistoryModal,
}) => {
  return (
    <div className="bg-[#0b1424] border border-[#1c2d4a] rounded-2xl p-2.5 shadow-md">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-amber-400 text-xs">⏱</span>
          <span className="text-[11px] font-mono font-bold text-slate-300 tracking-wider">
            RECENT SPINS
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenHistoryModal}
          className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1 transition-colors group"
        >
          <span>Full History</span>
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 touch-pan-x">
        {history.length === 0 ? (
          <div className="text-xs text-slate-500 font-mono py-1 px-2">
            No spin records yet
          </div>
        ) : (
          history.slice(0, 15).map((h, idx) => {
            const bgBadge =
              h.color === 'yellow'
                ? 'bg-amber-400 text-slate-950 font-black'
                : h.color === 'green'
                ? 'bg-emerald-600 text-white font-black'
                : h.color === 'red'
                ? 'bg-rose-600 text-white font-black'
                : 'bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-950 font-black';

            let avatarSrc = '';
            if (h.animal === 'lion') avatarSrc = '/images/lion_avatar.png';
            else if (h.animal === 'elephant') avatarSrc = '/images/elephant_avatar.png';
            else if (h.animal === 'bull') avatarSrc = '/images/bull_avatar.png';

            const animalIcon =
              h.animal === 'lion'
                ? '🦁'
                : h.animal === 'elephant'
                ? '🐘'
                : h.animal === 'bull'
                ? '🐂'
                : '👑';

            return (
              <div
                key={idx}
                className="bg-[#15243b]/90 border border-[#273d61] rounded-xl p-1.5 flex flex-col items-center gap-1 shrink-0 w-12 shadow-sm transition-transform hover:scale-105 group relative"
                title={`Sector #${h.label || h.number} - ${h.animal.toUpperCase()} (${h.multiplier}x)`}
              >
                <span
                  className={`w-full py-0.5 rounded text-[10px] font-mono text-center shadow-xs ${bgBadge}`}
                >
                  {h.label || h.number}
                </span>

                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={h.animal}
                    className="w-6 h-6 rounded-full object-cover shadow-sm border border-[#273d61]"
                  />
                ) : (
                  <span className="text-sm">{animalIcon}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
