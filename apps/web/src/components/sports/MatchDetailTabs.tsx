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
    <div className="w-full bg-[#08132E] border-b border-white/10 sticky top-[60px] z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#287BFF] to-[#00D9FF] text-slate-950 shadow-[0_0_15px_rgba(0,217,255,0.3)]'
                    : 'bg-[#0E1C3E]/60 text-[#B8C7E6] hover:text-white hover:bg-[#152754] border border-white/5'
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
