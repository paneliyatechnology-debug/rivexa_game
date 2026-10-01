'use client';

import React, { useState } from 'react';
import { ICompetition, IMatch } from '@gaming-platform/types';
import { CricketMatchCard } from './CricketMatchCard';
import { FootballMatchCard } from './FootballMatchCard';
import { Trophy, ChevronDown, ChevronUp, Globe } from 'lucide-react';

export function CompetitionSection({
  competition,
  sportSlug = 'cricket',
}: {
  competition: ICompetition;
  sportSlug?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const matches: IMatch[] = competition.matches || [];

  if (matches.length === 0) return null;

  return (
    <div className="bg-[#08132E]/70 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-lg transition-all">
      {/* Header / Accordion Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#0E1C3E] via-[#0B1736] to-[#0E1C3E] border-b border-white/10 cursor-pointer select-none hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#397F32] to-[#13B981] flex items-center justify-center text-white shadow-md">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              {competition.name}
              {competition.country && (
                <span className="text-xs text-[#7183A8] font-normal flex items-center gap-1 hidden sm:inline-flex">
                  <Globe className="w-3 h-3 text-[#00D9FF]" />
                  {competition.country}
                </span>
              )}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#101C3A] text-[#00E5A0] border border-white/10">
            {matches.length} {matches.length === 1 ? 'Match' : 'Matches'}
          </span>
          <button
            aria-label="Toggle competition section"
            className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-[#B8C7E6] hover:text-white hover:bg-white/10 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="p-4 space-y-3.5">
          {matches.map((match) =>
            sportSlug === 'football' ? (
              <FootballMatchCard key={match.id} match={match} />
            ) : (
              <CricketMatchCard key={match.id} match={match} />
            )
          )}
        </div>
      )}
    </div>
  );
}
