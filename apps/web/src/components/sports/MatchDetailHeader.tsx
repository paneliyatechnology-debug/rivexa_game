'use client';

import React from 'react';
import Link from 'next/link';
import { IMatch } from '@gaming-platform/types';
import { TeamIdentity } from './TeamIdentity';
import { MatchStatusBadge } from './MatchStatusBadge';
import { ConnectionIndicator } from './ConnectionIndicator';
import { ChevronRight, MapPin, Calendar, Clock } from 'lucide-react';

export function MatchDetailHeader({
  match,
  isConnected = true,
}: {
  match: IMatch;
  isConnected?: boolean;
}) {
  const score = match.score;

  const startDate = new Date(match.startTime);
  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = startDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="w-full bg-gradient-to-b from-[#0A1635] via-[#08132E] to-[#050C20] border-b border-white/10 pt-4 pb-6 px-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Breadcrumb & Connection Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#7183A8]">
          <nav className="flex items-center gap-1.5 flex-wrap">
            <Link href="/sports" className="hover:text-white transition-colors">
              Sports
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-white/30" />
            <Link href={`/sports?sport=${match.sport?.slug || 'cricket'}`} className="hover:text-white transition-colors">
              {match.sport?.name || 'Cricket'}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[#00E5A0] font-medium">{match.competition?.name || 'International'}</span>
          </nav>

          <ConnectionIndicator isConnected={isConnected} />
        </div>

        {/* Title Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <MatchStatusBadge status={match.status} />
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#101F42] text-[#00D9FF] border border-white/10">
                {match.matchType || 'T20'}
              </span>
              <span className="text-xs text-[#7183A8] font-medium hidden sm:inline">
                {match.competition?.name}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              {match.teamA?.name} vs {match.teamB?.name}
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#7183A8] bg-[#0A1633] px-3.5 py-2 rounded-xl border border-white/5">
            {match.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#00D9FF]" />
                {match.venue}
              </span>
            )}
            <span className="flex items-center gap-1 border-l border-white/10 pl-3">
              <Calendar className="w-3.5 h-3.5 text-[#287BFF]" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1 border-l border-white/10 pl-3">
              <Clock className="w-3.5 h-3.5 text-[#287BFF]" />
              {formattedTime}
            </span>
          </div>
        </div>

        {/* Live Score Banner */}
        <div className="bg-gradient-to-r from-[#0C1A3E] via-[#091533] to-[#0C1A3E] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#00D9FF]/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-center relative z-10">
            {/* Mobile Layout (Flex row on small screens, 3-col on md+) */}
            <div className="flex md:hidden items-center justify-between gap-2 bg-[#061026] p-3 rounded-xl border border-white/5">
              {/* Team A Mobile */}
              <div className="flex items-center gap-2 min-w-0">
                <TeamIdentity team={match.teamA} size="sm" showFull={false} />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{match.teamA?.shortName || match.teamA?.name}</div>
                  {score?.teamAScore ? (
                    <div className="font-mono text-sm font-black text-[#00E5A0]">{score.teamAScore}</div>
                  ) : (
                    <div className="text-[10px] text-slate-400">Yet to bat</div>
                  )}
                </div>
              </div>

              {/* VS / Status Badge Mobile */}
              <div className="text-center px-2 shrink-0">
                <span className="text-[10px] font-black text-[#00D9FF] px-2 py-0.5 rounded-full bg-[#101F42] border border-white/10 uppercase">
                  {match.status === 'LIVE' ? 'LIVE' : match.matchType || 'VS'}
                </span>
              </div>

              {/* Team B Mobile */}
              <div className="flex items-center gap-2 min-w-0 text-right justify-end">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{match.teamB?.shortName || match.teamB?.name}</div>
                  {score?.teamBScore ? (
                    <div className="font-mono text-sm font-black text-[#00D9FF]">{score.teamBScore}</div>
                  ) : (
                    <div className="text-[10px] text-slate-400">Yet to bat</div>
                  )}
                </div>
                <TeamIdentity team={match.teamB} size="sm" showFull={false} />
              </div>
            </div>

            {/* Desktop Team A (Hidden on mobile) */}
            <div className="hidden md:flex items-center justify-end gap-4 text-right">
              <div className="space-y-1">
                <div className="text-lg sm:text-xl font-extrabold text-white">{match.teamA?.name}</div>
                {score?.teamAScore ? (
                  <div className="font-mono text-2xl sm:text-3xl font-black text-[#00E5A0] tracking-wider">
                    {score.teamAScore}
                    {score.teamAOvers && (
                      <span className="text-xs text-[#7183A8] font-normal ml-2">({score.teamAOvers} ov)</span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-[#7183A8]">Yet to bat</div>
                )}
              </div>
              <TeamIdentity team={match.teamA} size="lg" showFull={false} />
            </div>

            {/* VS / Status text */}
            <div className="flex flex-col items-center justify-center text-center space-y-1.5 bg-[#061026] py-3 px-4 rounded-xl border border-white/5">
              <div className="text-[11px] sm:text-xs font-bold text-[#7183A8] uppercase tracking-widest">
                {match.status === 'LIVE' ? 'LIVE INNINGS' : match.status}
              </div>
              {score?.statusText ? (
                <div className="text-xs sm:text-sm font-bold text-amber-300 animate-pulse leading-snug">{score.statusText}</div>
              ) : match.resultSummary ? (
                <div className="text-xs sm:text-sm font-bold text-emerald-300 leading-snug">{match.resultSummary}</div>
              ) : (
                <div className="text-xs text-[#7183A8]">Match starts soon</div>
              )}
              {score?.recentOvers && (
                <div className="text-[11px] text-[#7183A8] font-mono flex items-center gap-1 mt-0.5">
                  <span>Recent:</span>
                  <span className="text-white font-bold bg-white/5 px-2 py-0.5 rounded">{score.recentOvers}</span>
                </div>
              )}
            </div>

            {/* Desktop Team B (Hidden on mobile) */}
            <div className="hidden md:flex items-center justify-start gap-4 text-left">
              <TeamIdentity team={match.teamB} size="lg" showFull={false} />
              <div className="space-y-1">
                <div className="text-lg sm:text-xl font-extrabold text-white">{match.teamB?.name}</div>
                {score?.teamBScore ? (
                  <div className="font-mono text-2xl sm:text-3xl font-black text-[#00D9FF] tracking-wider">
                    {score.teamBScore}
                    {score.teamBOvers && (
                      <span className="text-xs text-[#7183A8] font-normal ml-2">({score.teamBOvers} ov)</span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-[#7183A8]">Yet to bat</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
