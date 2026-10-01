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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        {sports.slice(0, 6).map((sport) => {
          const Icon = getIcon(sport.slug);
          const isActive = activeSlug === sport.slug;

          return (
            <button
              key={sport.id || sport.slug}
              onClick={() => onSelect(sport.slug)}
              className={`flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer text-left border ${
                isActive
                  ? 'bg-gradient-to-br from-[#122A58] to-[#0A1A3A] border-[#00D9FF]/60 shadow-[0_0_18px_rgba(0,217,255,0.2)] scale-[1.02]'
                  : 'bg-[#0A1633]/80 hover:bg-[#102046] border-white/10 hover:border-white/20'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-br from-[#00E5A0] to-[#00D9FF] text-slate-950 shadow-md'
                    : 'bg-[#101C3A] text-[#00E5A0]'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className={`text-xs sm:text-sm font-bold truncate ${isActive ? 'text-white' : 'text-[#B8C7E6]'}`}>
                  {sport.name}
                </div>
                <div className="text-[10px] text-[#7183A8] font-medium flex items-center gap-1.5 mt-0.5">
                  {sport.matchCount?.live ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {sport.matchCount.live} Live
                    </span>
                  ) : (
                    <span>{sport.matchCount?.upcoming || 0} Matches</span>
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
