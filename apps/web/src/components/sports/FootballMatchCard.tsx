'use client';

import React from 'react';
import Link from 'next/link';
import { IMatch } from '@gaming-platform/types';
import { TeamIdentity } from './TeamIdentity';
import { MatchStatusBadge } from './MatchStatusBadge';
import { MapPin, Calendar, Clock, ChevronRight } from 'lucide-react';

export function FootballMatchCard({ match }: { match: IMatch }) {
  const score = match.score;

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
    <div className="bg-gradient-to-br from-[#0B1736] to-[#050C21] border border-white/10 rounded-2xl p-4 transition-all shadow-md hover:border-emerald-500/40">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center gap-2">
            <MatchStatusBadge status={match.status} />
            <span className="text-xs text-[#7183A8] font-medium">{match.competition?.name || 'Football'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between bg-[#0A1633] p-2.5 rounded-xl border border-white/5">
              <TeamIdentity team={match.teamA} size="md" />
              <span className="font-mono text-lg font-bold text-white">
                {score?.teamAScore || '0'}
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#0A1633] p-2.5 rounded-xl border border-white/5">
              <TeamIdentity team={match.teamB} size="md" />
              <span className="font-mono text-lg font-bold text-white">
                {score?.teamBScore || '0'}
              </span>
            </div>
          </div>
        </div>

        <div className="sm:w-48 shrink-0 flex flex-col justify-center gap-1.5 text-xs text-[#7183A8] sm:border-l sm:border-white/10 sm:pl-4">
          {match.venue && (
            <div className="flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#00D9FF]" />
              <span className="truncate">{match.venue}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#287BFF]" />
            <span>{formattedDate}</span>
            <Clock className="w-3.5 h-3.5 text-[#287BFF] ml-1" />
            <span>{formattedTime}</span>
          </div>
          {score?.statusText && (
            <div className="text-emerald-400 font-semibold text-xs mt-1">
              {score.statusText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
