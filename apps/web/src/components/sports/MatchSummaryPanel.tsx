'use client';

import React from 'react';
import { IMatch } from '@gaming-platform/types';
import { Activity, Flame, ShieldAlert, Award, TrendingUp } from 'lucide-react';

export function MatchSummaryPanel({ match }: { match: IMatch }) {
  const score = match.score;

  const stats = match.statsSummary as any;
  let winProbA = stats?.winProbabilityTeamA;
  let winProbB = stats?.winProbabilityTeamB;
  let oddsA = stats?.oddsA ? String(stats.oddsA) : null;
  let oddsB = stats?.oddsB ? String(stats.oddsB) : null;

  if (winProbA === undefined || winProbA === null) {
    if (score?.currentRunRate && score?.requiredRunRate) {
      const diff = score.currentRunRate - score.requiredRunRate;
      winProbA = Math.min(92, Math.max(8, Math.round(50 + diff * 5)));
    } else {
      winProbA = 50;
    }
    winProbB = 100 - winProbA;
  }

  if (!oddsA) oddsA = (100 / (winProbA || 50)).toFixed(2);
  if (!oddsB) oddsB = (100 / (winProbB || 50)).toFixed(2);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Live Match Odds (Stats Model) Widget */}
      <div className="bg-gradient-to-br from-[#122452] via-[#0E1C44] to-[#0B1638] border border-cyan-500/35 p-4 sm:p-5 rounded-2xl space-y-4 shadow-[0_6px_24px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-2 tracking-wide">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Live Match Odds &amp; Win Probability Projections
          </h3>
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            {stats?.isManual ? 'Admin Override' : 'Statistical Model'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 text-center">
          <div className="bg-[#081535] p-3.5 sm:p-4 rounded-xl border border-emerald-500/30 space-y-1 shadow-[0_0_15px_rgba(0,255,135,0.1)]">
            <div className="text-xs text-slate-300 font-extrabold truncate">{match.teamA?.name || 'Team A'}</div>
            <div className="text-2xl font-mono font-black text-[#00FF87] drop-shadow-[0_0_10px_rgba(0,255,135,0.7)]">{oddsA}</div>
            <div className="text-[11px] text-emerald-400 font-bold">{winProbA}% Win Probability</div>
          </div>

          <div className="bg-[#081535] p-3.5 sm:p-4 rounded-xl border border-purple-500/30 space-y-1 shadow-[0_0_15px_rgba(224,102,255,0.1)]">
            <div className="text-xs text-slate-300 font-extrabold truncate">{match.teamB?.name || 'Team B'}</div>
            <div className="text-2xl font-mono font-black text-[#E066FF] drop-shadow-[0_0_10px_rgba(224,102,255,0.7)]">{oddsB}</div>
            <div className="text-[11px] text-purple-300 font-bold">{winProbB}% Win Probability</div>
          </div>
        </div>

        {/* Dynamic Progress Meter */}
        <div className="space-y-1">
          <div className="w-full h-3 rounded-full bg-[#050C20] overflow-hidden flex p-0.5 border border-white/10 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#00FF87] to-emerald-500 rounded-l-full transition-all duration-500 shadow-[0_0_12px_rgba(0,255,135,0.8)]"
              style={{ width: `${winProbA}%` }}
            ></div>
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-[#E066FF] rounded-r-full transition-all duration-500 shadow-[0_0_12px_rgba(224,102,255,0.8)]"
              style={{ width: `${winProbB}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Current Batter & Bowler Widget */}
      {score?.activeBatsman && (
        <div className="bg-gradient-to-br from-[#122452] via-[#0E1C44] to-[#0B1638] border border-cyan-500/35 p-4 sm:p-5 rounded-2xl space-y-4 shadow-lg">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00FF87]" />
            Active Players On Crease
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#081535] p-3.5 rounded-xl border border-emerald-500/30 space-y-1">
              <div className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Batsmen at Crease</div>
              <div className="text-sm font-black text-[#00FF87]">{score.activeBatsman}</div>
            </div>

            <div className="bg-[#081535] p-3.5 rounded-xl border border-cyan-500/30 space-y-1">
              <div className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Current Bowler</div>
              <div className="text-sm font-black text-cyan-300">{score.activeBowler || 'J. Archer 1/28'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Match Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-[#122452] to-[#0E1C44] border border-cyan-500/30 p-4 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-[#00FF87] flex items-center justify-center font-bold border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,135,0.2)]">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold">Run Rate</div>
            <div className="text-base font-black text-white">
              {score?.currentRunRate ? `${score.currentRunRate} CRR` : '9.67 CRR'}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#122452] to-[#0E1C44] border border-cyan-500/30 p-4 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center font-bold border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold">Target</div>
            <div className="text-base font-black text-white">
              {score?.targetRuns ? `${score.targetRuns} Runs` : '179 Runs'}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#122452] to-[#0E1C44] border border-cyan-500/30 p-4 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-300 flex items-center justify-center font-bold border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold">Format</div>
            <div className="text-base font-black text-white">{match.matchType || 'T20'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

