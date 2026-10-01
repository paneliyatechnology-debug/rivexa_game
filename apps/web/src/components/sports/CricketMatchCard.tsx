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
      className="group block bg-gradient-to-br from-[#0B1736] to-[#050C21] hover:from-[#10224C] hover:to-[#0A173A] border border-white/10 hover:border-[#00D9FF]/50 rounded-2xl p-4 transition-all duration-300 shadow-md hover:shadow-[0_8px_30px_rgba(0,217,255,0.15)] transform hover:-translate-y-0.5"
    >
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* LEFT: Teams & Status */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2.5">
          <div className="flex items-center gap-2 mb-1">
            <MatchStatusBadge status={match.status} />
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#101F42] text-[#00E5A0] border border-white/5">
              {match.matchType || 'T20'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <TeamIdentity team={match.teamA} size="md" />
              {score?.teamAScore && (
                <span className="font-mono text-base font-extrabold text-white tracking-wider">
                  {score.teamAScore}{' '}
                  {score.teamAOvers && (
                    <span className="text-xs text-[#7183A8] font-medium">({score.teamAOvers} ov)</span>
                  )}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <TeamIdentity team={match.teamB} size="md" />
              {score?.teamBScore && (
                <span className="font-mono text-base font-extrabold text-white tracking-wider">
                  {score.teamBScore}{' '}
                  {score.teamBOvers && (
                    <span className="text-xs text-[#7183A8] font-medium">({score.teamBOvers} ov)</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Match Context & Status text */}
        <div className="flex-1 lg:border-x lg:border-white/10 lg:px-5 flex flex-col justify-center gap-1.5 text-xs text-[#B8C7E6]">
          <div className="font-bold text-white text-sm truncate flex items-center justify-between">
            <span className="truncate">{match.competition?.name || 'International Cricket'}</span>
          </div>

          {match.venue && (
            <div className="flex items-center gap-1.5 text-[#7183A8] truncate">
              <MapPin className="w-3.5 h-3.5 text-[#00D9FF] shrink-0" />
              <span className="truncate">{match.venue}</span>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-[#7183A8]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#287BFF]" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#287BFF]" />
              {formattedTime}
            </span>
          </div>

          {score?.statusText && (
            <div className="mt-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="truncate">{score.statusText}</span>
            </div>
          )}

          {match.resultSummary && !score?.statusText && (
            <div className="mt-1 px-3 py-1.5 rounded-xl bg-[#101F42] text-slate-300 text-xs font-medium">
              {match.resultSummary}
            </div>
          )}
        </div>

        {/* RIGHT: Non-monetary Match Odds & Statistical Insight Tile */}
        <div className="lg:w-64 shrink-0 flex flex-col justify-between gap-2.5 bg-[#091531] p-3 rounded-xl border border-white/5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#7183A8] font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-[#00E5A0]" />
              Match Odds (Stats)
            </span>
            <span className="text-[#00E5A0] font-bold text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              Stats Model
            </span>
          </div>

          {/* Odds & Probability Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px] font-bold text-white">
              <span className="flex items-center gap-1">
                <span className="text-slate-300">{match.teamA?.shortName}:</span>
                <span className="text-[#00E5A0] font-mono">1.75</span>
                <span className="text-[10px] text-slate-400">(62%)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-slate-300">{match.teamB?.shortName}:</span>
                <span className="text-[#00D9FF] font-mono">2.15</span>
                <span className="text-[10px] text-slate-400">(38%)</span>
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#101C3A] overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-[#00E5A0] to-[#00D9FF]" style={{ width: '62%' }}></div>
              <div className="h-full bg-[#287BFF]" style={{ width: '38%' }}></div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-[#7183A8]">Back/Lay exchange unavailable</span>
            <div className="w-7 h-7 rounded-lg bg-[#142654] group-hover:bg-[#287BFF] text-white flex items-center justify-center transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
