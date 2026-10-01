'use client';

import React from 'react';
import { IMatch } from '@gaming-platform/types';
import { BarChart3, TrendingUp, ShieldCheck, Flame } from 'lucide-react';

export function StatisticsPanel({ match }: { match: IMatch }) {
  const stats = match.statsSummary || {
    winProbabilityTeamA: 62,
    winProbabilityTeamB: 38,
    pitchReport: 'Batting-friendly track with good pace and even bounce.',
    weatherReport: '31°C Clear Sky, 45% Humidity',
    tossWinner: match.teamA?.name,
    tossDecision: 'Elected to bat first',
  };

  return (
    <div className="space-y-6">
      {/* Head to Head & Win Probability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Win Probability Card */}
        <div className="bg-[#08132E] border border-white/10 p-5 rounded-2xl space-y-4 shadow-lg">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00E5A0]" />
            Statistical Win Probability Model
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-white">
              <span>{match.teamA?.name}: {stats.winProbabilityTeamA}%</span>
              <span>{match.teamB?.name}: {stats.winProbabilityTeamB}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-[#050C20] overflow-hidden flex p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#00E5A0] to-[#00D9FF] rounded-l-full transition-all duration-500"
                style={{ width: `${stats.winProbabilityTeamA}%` }}
              ></div>
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-r-full transition-all duration-500"
                style={{ width: `${stats.winProbabilityTeamB}%` }}
              ></div>
            </div>
          </div>

          <p className="text-xs text-[#7183A8] leading-relaxed">
            Based on recent team form, venue performance history, head-to-head records, and current match situation.
          </p>
        </div>

        {/* Match Conditions Card */}
        <div className="bg-[#08132E] border border-white/10 p-5 rounded-2xl space-y-4 shadow-lg">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#287BFF]" />
            Pitch & Weather Conditions
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="bg-[#050C20] p-3 rounded-xl border border-white/5 space-y-1">
              <div className="font-bold text-[#00D9FF]">Pitch Report</div>
              <div className="text-slate-300">{stats.pitchReport}</div>
            </div>

            <div className="bg-[#050C20] p-3 rounded-xl border border-white/5 space-y-1">
              <div className="font-bold text-[#00E5A0]">Weather Report</div>
              <div className="text-slate-300">{stats.weatherReport}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Head to Head History */}
      <div className="bg-[#08132E] border border-white/10 p-5 rounded-2xl space-y-4 shadow-lg">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#00D9FF]" />
          Head to Head Statistics (Last 10 Matches)
        </h3>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-[#050C20] p-4 rounded-xl border border-white/5">
            <div className="text-2xl font-black text-[#00E5A0]">6</div>
            <div className="text-xs font-bold text-white mt-1">{match.teamA?.shortName} Wins</div>
          </div>
          <div className="bg-[#050C20] p-4 rounded-xl border border-white/5">
            <div className="text-2xl font-black text-slate-400">1</div>
            <div className="text-xs font-bold text-[#7183A8] mt-1">No Result</div>
          </div>
          <div className="bg-[#050C20] p-4 rounded-xl border border-white/5">
            <div className="text-2xl font-black text-[#287BFF]">3</div>
            <div className="text-xs font-bold text-white mt-1">{match.teamB?.shortName} Wins</div>
          </div>
        </div>
      </div>
    </div>
  );
}
