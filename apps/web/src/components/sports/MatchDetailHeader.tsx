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
    <div className="w-full bg-gradient-to-b from-[#142B63] via-[#0F214F] to-[#0D1C44] border border-cyan-500/30 p-2 sm:p-3.5 rounded-2xl shadow-lg space-y-2">
      {/* TOP META BAR (Breadcrumbs, Status & Venue on Desktop) */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-2 flex-wrap">
          <nav className="hidden sm:flex items-center gap-1.5">
            <Link href="/sports" className="hover:text-cyan-300 transition-colors">
              Sports
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-white/40" />
            <Link href={`/sports?sport=${match.sport?.slug || 'cricket'}`} className="hover:text-cyan-300 transition-colors">
              {match.sport?.name || 'Cricket'}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-white/40" />
            <span className="text-cyan-300 font-extrabold">{match.competition?.name || 'International'}</span>
          </nav>

          <div className="hidden sm:flex items-center gap-1.5">
            <MatchStatusBadge status={match.status} />
            <span className="text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full bg-[#1A3578] text-cyan-300 border border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]">
              {match.matchType || 'T20'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] sm:text-xs text-slate-200">
          {match.venue && (
            <span className="hidden lg:flex items-center gap-1 bg-[#162C63]/80 px-2.5 py-1 rounded-lg border border-cyan-400/20">
              <MapPin className="w-3.5 h-3.5 text-cyan-300" />
              <span className="truncate max-w-[200px]">{match.venue}</span>
            </span>
          )}
          <span className="hidden sm:flex items-center gap-1 bg-[#162C63]/80 px-2.5 py-1 rounded-lg border border-cyan-400/20">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            {formattedDate} • {formattedTime}
          </span>
          {/* Only shown on desktop — mobile has its own ConnectionIndicator inside sm:hidden section */}
          <span className="hidden sm:inline-flex">
            <ConnectionIndicator isConnected={isConnected} />
          </span>
        </div>
      </div>

      {/* MOBILE COMPACT SCORE BAR (Visible on mobile only) */}
      <div className="sm:hidden space-y-2">
        {/* Mobile Header Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-300 px-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <MatchStatusBadge status={match.status} />
            <span className="text-cyan-300 font-black truncate max-w-[180px]">
              {match.competition?.name || 'Cricket Match'}
            </span>
          </div>
          <ConnectionIndicator isConnected={isConnected} />
        </div>

        <div className="bg-gradient-to-r from-[#142B63] via-[#0F214F] to-[#142B63] border border-cyan-400/40 p-2.5 rounded-xl shadow-lg space-y-2">
          {/* Team A Row */}
          <div className="flex items-center justify-between gap-2 bg-[#071333] p-2.5 rounded-lg border border-cyan-500/25">
            <TeamIdentity team={match.teamA} size="sm" showFull={true} />
            <div className="text-right shrink-0">
              <div className="font-mono text-xs font-black text-cyan-300">
                {score?.teamAScore || 'Yet to bat'}
              </div>
              {score?.teamAOvers && (
                <div className="text-[10px] text-slate-400 font-mono">({score.teamAOvers} ov)</div>
              )}
            </div>
          </div>

          {/* Team B Row */}
          <div className="flex items-center justify-between gap-2 bg-[#071333] p-2.5 rounded-lg border border-cyan-500/25">
            <TeamIdentity team={match.teamB} size="sm" showFull={true} />
            <div className="text-right shrink-0">
              <div className="font-mono text-xs font-black text-cyan-300">
                {score?.teamBScore || 'Yet to bat'}
              </div>
              {score?.teamBOvers && (
                <div className="text-[10px] text-slate-400 font-mono">({score.teamBOvers} ov)</div>
              )}
            </div>
          </div>

          {/* Live Status Summary Pill */}
          {(score?.statusText || match.resultSummary) && (
            <div className="text-center text-[10px] font-black text-amber-300 bg-[#060D24] py-1.5 px-2.5 rounded-lg border border-amber-400/30 truncate shadow-inner">
              {score?.statusText || match.resultSummary}
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP / LAPTOP LIVE SCORE BANNER */}
      <div className="hidden sm:block bg-gradient-to-r from-[#183478] via-[#12275A] to-[#183478] border border-cyan-400/30 rounded-xl p-3 sm:p-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] relative overflow-hidden">
        {/* Top Light Beams */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-400/20 to-transparent rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-2xl pointer-events-none"></div>

        <div className="grid grid-cols-3 gap-4 items-center relative z-10">
          {/* Desktop Team A */}
          <div className="flex items-center justify-end gap-3 text-right">
            <div className="space-y-0.5">
              <div className="text-base sm:text-lg font-black text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]">{match.teamA?.name}</div>
              {score?.teamAScore ? (
                <div className="font-mono text-xl sm:text-2xl font-black text-cyan-300 tracking-wider drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]">
                  {score.teamAScore}
                  {score.teamAOvers && (
                    <span className="text-xs text-slate-300 font-normal ml-1.5">({score.teamAOvers} ov)</span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400">Yet to bat</div>
              )}
            </div>
            <TeamIdentity team={match.teamA} size="md" showFull={false} />
          </div>

          {/* Center Status Box */}
          <div className="flex flex-col items-center justify-center text-center space-y-1 bg-[#061026]/90 py-2.5 px-3 rounded-xl border border-cyan-500/20 shadow-md">
            <div className="text-[11px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              {match.status === 'LIVE' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]"></span>}
              {match.status === 'LIVE' ? 'LIVE INNINGS' : match.status}
            </div>
            {score?.statusText ? (
              <div className="text-xs font-extrabold text-amber-300 animate-pulse leading-snug drop-shadow-[0_0_6px_rgba(252,211,77,0.4)]">{score.statusText}</div>
            ) : match.resultSummary ? (
              <div className="text-xs font-extrabold text-emerald-300 leading-snug drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">{match.resultSummary}</div>
            ) : (
              <div className="text-xs text-slate-400">Match starts soon</div>
            )}
            {score?.recentOvers && (
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                <span className="text-cyan-300/80 font-bold">Recent:</span>
                <span className="text-white font-black bg-cyan-500/20 border border-cyan-500/30 px-1.5 py-0.2 rounded shadow-sm">{score.recentOvers}</span>
              </div>
            )}
          </div>

          {/* Desktop Team B */}
          <div className="flex items-center justify-start gap-3 text-left">
            <TeamIdentity team={match.teamB} size="md" showFull={false} />
            <div className="space-y-0.5">
              <div className="text-base sm:text-lg font-black text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]">{match.teamB?.name}</div>
              {score?.teamBScore ? (
                <div className="font-mono text-xl sm:text-2xl font-black text-cyan-300 tracking-wider drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]">
                  {score.teamBScore}
                  {score.teamBOvers && (
                    <span className="text-xs text-slate-300 font-normal ml-1.5">({score.teamBOvers} ov)</span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400">Yet to bat</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
