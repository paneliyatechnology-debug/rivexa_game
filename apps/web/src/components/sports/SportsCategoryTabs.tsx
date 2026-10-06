'use client';

import React from 'react';
import { ISport } from '@gaming-platform/types';
import { Trophy, Cpu, CircleDot, Activity, Dribbble, Shield } from 'lucide-react';

export function SportsCategoryTabs({
  sports = [],
  activeSlug = 'cricket',
  onSelect,
}: {
  sports: ISport[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}) {
  const getIcon = (slug: string) => {
    switch (slug) {
      case 'cricket':
        return Trophy;
      case 'virtual-sports':
        return Cpu;
      case 'football':
        return CircleDot;
      case 'tennis':
        return Activity;
      case 'basketball':
        return Dribbble;
      default:
        return Shield;
    }
  };

  return (
    <div className="w-full py-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {sports.slice(0, 6).map((sport) => {
          const Icon = getIcon(sport.slug);
          const isActive = activeSlug === sport.slug;

          return (
            <button
              key={sport.id || sport.slug}
              onClick={() => onSelect(sport.slug)}
              className={`group relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 cursor-pointer text-left border ${
                isActive
                  ? 'bg-gradient-to-br from-[#0C2454] via-[#0A1D45] to-[#071430] border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.35)] scale-[1.03]'
                  : 'bg-[#0A1633]/80 hover:bg-[#10224C] border-white/10 hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  isActive
                    ? 'bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.6)] font-extrabold scale-105'
                    : 'bg-[#101C3A] text-cyan-400 group-hover:text-cyan-300 group-hover:bg-[#162752]'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className={`text-xs sm:text-sm font-extrabold truncate ${isActive ? 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]' : 'text-[#B8C7E6] group-hover:text-white'}`}>
                  {sport.name}
                </div>
                <div className="text-[10px] text-[#7183A8] font-medium flex items-center gap-1.5 mt-0.5">
                  {sport.matchCount?.live ? (
                    <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]"></span>
                      {sport.matchCount.live} Live
                    </span>
                  ) : (
                    <span className="text-cyan-400/80 font-bold">{sport.matchCount?.upcoming || 0} Matches</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
