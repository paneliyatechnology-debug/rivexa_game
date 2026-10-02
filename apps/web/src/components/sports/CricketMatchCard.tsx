'use client';

import React from 'react';
import Link from 'next/link';
import { IMatch } from '@gaming-platform/types';
import { TeamIdentity } from './TeamIdentity';
import { MatchStatusBadge } from './MatchStatusBadge';
import { MapPin, Calendar, Clock, ChevronRight, TrendingUp } from 'lucide-react';

export function CricketMatchCard({ match }: { match: IMatch }) {
  const isLive = match.status === 'LIVE';
  const score = match.score;

  // Format date and time
  const startDate = new Date(match.startTime);
  const formattedDate = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = startDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Link
      href={`/sports/cricket/${match.id}`}
      className={`group block bg-gradient-to-br from-[#0B1838] via-[#071126] to-[#040A1A] rounded-2xl p-4 transition-all duration-300 transform hover:-translate-y-0.5 border ${
        isLive
          ? 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.18)] hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.35)]'
          : 'border-white/10 hover:border-cyan-500/30 hover:shadow-[0_8px_30px_rgba(6,182,212,0.15)]'
      }`}
    >
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* LEFT: Teams & Status */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2.5">
          <div className="flex items-center gap-2 mb-1">
            <MatchStatusBadge status={match.status} />
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#10224A] text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              {match.matchType || 'T20'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <TeamIdentity team={match.teamA} size="md" />
              {score?.teamAScore && (
                <span className="font-mono text-base font-black text-cyan-300 tracking-wider drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                  {score.teamAScore}{' '}
                  {score.teamAOvers && (
                    <span className="text-xs text-slate-400 font-medium">({score.teamAOvers} ov)</span>
                  )}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <TeamIdentity team={match.teamB} size="md" />
              {score?.teamBScore && (
                <span className="font-mono text-base font-black text-cyan-300 tracking-wider drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                  {score.teamBScore}{' '}
                  {score.teamBOvers && (
                    <span className="text-xs text-slate-400 font-medium">({score.teamBOvers} ov)</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Match Context & Status text */}
        <div className="flex-1 lg:border-x lg:border-white/10 lg:px-5 flex flex-col justify-center gap-1.5 text-xs text-[#B8C7E6]">
          <div className="font-extrabold text-white text-sm truncate flex items-center justify-between">
            <span className="truncate">{match.competition?.name || 'International Cricket'}</span>
          </div>

          {match.venue && (
            <div className="flex items-center gap-1.5 text-slate-400 truncate">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{match.venue}</span>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              {formattedTime}
            </span>
          </div>

          {score?.statusText && (
            <div className="mt-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(52,211,153,0.2)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.9)]"></span>
              <span className="truncate">{score.statusText}</span>
            </div>
          )}

          {match.resultSummary && !score?.statusText && (
            <div className="mt-1 px-3 py-1.5 rounded-xl bg-[#101F42] text-slate-300 text-xs font-medium">
              {match.resultSummary}
            </div>
          )}
        </div>

        {/* RIGHT: Match Odds & Stats Tile */}
        <div className="lg:w-64 shrink-0 flex flex-col justify-between gap-2.5 bg-[#08142E] p-3 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(0,0,0,0.3)] group-hover:border-cyan-400/40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              Match Odds (Stats)
            </span>
            <span className="text-cyan-300 font-extrabold text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30">
              Stats Model
            </span>
          </div>

          {/* Odds & Probability Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px] font-extrabold text-white">
              <span className="flex items-center gap-1">
                <span className="text-slate-300">{match.teamA?.shortName}:</span>
                <span className="text-cyan-300 font-mono text-xs">1.75</span>
                <span className="text-[10px] text-cyan-400/80">(62%)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-slate-300">{match.teamB?.shortName}:</span>
                <span className="text-blue-400 font-mono text-xs">2.15</span>
                <span className="text-[10px] text-blue-400/80">(38%)</span>
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#101C3A] overflow-hidden flex shadow-inner">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]" style={{ width: '62%' }}></div>
              <div className="h-full bg-blue-600" style={{ width: '38%' }}></div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400">Back/Lay exchange unavailable</span>
            <div className="w-7 h-7 rounded-lg bg-[#142654] group-hover:bg-cyan-500 group-hover:text-slate-950 text-white flex items-center justify-center transition-all group-hover:shadow-[0_0_12px_rgba(6,182,212,0.6)]">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
