'use client';

import React from 'react';
import { ConnectionIndicator } from './ConnectionIndicator';

export function LiveUpcomingTabs({
  activeTab = 'all',
  liveCount = 0,
  upcomingCount = 0,
  totalCount = 0,
  isConnected = true,
  onTabChange,
}: {
  activeTab: 'all' | 'live' | 'upcoming';
  liveCount?: number;
  upcomingCount?: number;
  totalCount?: number;
  isConnected?: boolean;
  onTabChange: (tab: 'all' | 'live' | 'upcoming') => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-white/10">
      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-[#0A1633] p-1.5 rounded-2xl border border-white/10 shadow-inner">
        <button
          onClick={() => onTabChange('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[#1E3366] text-white shadow-md border border-[#287BFF]/40'
              : 'text-[#B8C7E6] hover:text-white hover:bg-white/5'
          }`}
        >
          <span>All Matches</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'all' ? 'bg-[#287BFF] text-white' : 'bg-white/10 text-slate-300'
            }`}
          >
            {totalCount || liveCount + upcomingCount}
          </span>
        </button>

        <button
          onClick={() => onTabChange('live')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'live'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] border border-emerald-400/50'
              : 'text-[#B8C7E6] hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
          <span>Live</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'live' ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {liveCount}
          </span>
        </button>

        <button
          onClick={() => onTabChange('upcoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'upcoming'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(40,123,255,0.3)] border border-blue-400/50'
              : 'text-[#B8C7E6] hover:text-white hover:bg-white/5'
          }`}
        >
          <span>Upcoming</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'upcoming' ? 'bg-blue-400 text-slate-950' : 'bg-blue-500/20 text-blue-300'
            }`}
          >
            {upcomingCount}
          </span>
        </button>
      </div>

      {/* Connection Indicator */}
      <ConnectionIndicator isConnected={isConnected} />
    </div>
  );
}
