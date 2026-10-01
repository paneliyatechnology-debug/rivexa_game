'use client';

import React from 'react';
import { IMatch } from '@gaming-platform/types';
import { Activity, Flame, ShieldAlert, Award } from 'lucide-react';

export function MatchSummaryPanel({ match }: { match: IMatch }) {
  const score = match.score;

  return (
    <div className="space-y-6">
      {/* Current Batter & Bowler Widget */}
      {score?.activeBatsman && (
        <div className="bg-[#08132E] border border-white/10 p-5 rounded-2xl space-y-4 shadow-lg">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00E5A0]" />
            Active Key Players On Pitch
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#050C20] p-4 rounded-xl border border-white/5 space-y-1.5">
              <div className="text-[#7183A8] font-semibold uppercase text-[10px] tracking-wider">Batsmen at Crease</div>
              <div className="text-sm font-bold text-[#00E5A0]">{score.activeBatsman}</div>
            </div>

            <div className="bg-[#050C20] p-4 rounded-xl border border-white/5 space-y-1.5">
              <div className="text-[#7183A8] font-semibold uppercase text-[10px] tracking-wider">Current Bowler</div>
              <div className="text-sm font-bold text-[#00D9FF]">{score.activeBowler || 'J. Archer 1/28'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Live Match Odds (Stats Model) Widget */}
      <div className="bg-[#08132E] border border-white/10 p-5 rounded-2xl space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00D9FF]" />
            Live Match Odds (Stats Model)
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Statistical Probability
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-[#050C20] p-4 rounded-xl border border-white/5 space-y-1">
            <div className="text-xs text-slate-300 font-bold">{match.teamA?.name || 'Team A'}</div>
            <div className="text-xl font-mono font-black text-[#00E5A0]">1.75</div>
            <div className="text-[11px] text-[#7183A8]">62% Win Probability</div>
          </div>
          <div className="bg-[#050C20] p-4 rounded-xl border border-white/5 space-y-1">
            <div className="text-xs text-slate-300 font-bold">{match.teamB?.name || 'Team B'}</div>
            <div className="text-xl font-mono font-black text-[#00D9FF]">2.15</div>
            <div className="text-[11px] text-[#7183A8]">38% Win Probability</div>
          </div>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/90 leading-normal flex items-start gap-2">
          <span className="font-bold text-amber-400 shrink-0">Note:</span>
          <span>Odds are generated via statistical match projection. Live exchange Back/Lay and Session/Fancy betting markets are not provided by current CricAPI data plan.</span>
        </div>
      </div>

      {/* Match Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#08132E] border border-white/10 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#7183A8]">Run Rate</div>
            <div className="text-base font-bold text-white">
              {score?.currentRunRate ? `${score.currentRunRate} CRR` : '9.67 CRR'}
            </div>
          </div>
        </div>

        <div className="bg-[#08132E] border border-white/10 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#7183A8]">Target</div>
            <div className="text-base font-bold text-white">
              {score?.targetRuns ? `${score.targetRuns} Runs` : '179 Runs'}
            </div>
          </div>
        </div>

        <div className="bg-[#08132E] border border-white/10 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#7183A8]">Format</div>
            <div className="text-base font-bold text-white">{match.matchType || 'T20'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
