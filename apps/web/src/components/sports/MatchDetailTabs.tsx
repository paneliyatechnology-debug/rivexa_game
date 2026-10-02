'use client';

import React from 'react';

export type MatchTabType = 'summary' | 'markets' | 'scorecard' | 'commentary' | 'statistics' | 'squads';

export function MatchDetailTabs({
  activeTab = 'summary',
  onTabChange,
}: {
  activeTab: MatchTabType;
  onTabChange: (tab: MatchTabType) => void;
}) {
  const tabs: { id: MatchTabType; label: string }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'markets', label: 'Markets & Odds' },
    { id: 'scorecard', label: 'Scorecard' },
    { id: 'commentary', label: 'Commentary' },
    { id: 'statistics', label: 'Statistics' },
    { id: 'squads', label: 'Squads' },
  ];

  return (
    <div className="w-full bg-[#122554]/95 border-t border-b border-cyan-500/25 px-1.5 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 sm:py-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 sm:px-5 py-1 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-black transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-500 text-slate-950 font-black shadow-[0_0_12px_rgba(6,182,212,0.6)] border border-cyan-200'
                    : 'bg-[#18316E]/70 text-[#C6D8FB] hover:text-white hover:bg-[#1E3B84] border border-white/10'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
