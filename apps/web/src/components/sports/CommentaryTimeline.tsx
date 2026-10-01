'use client';

import React, { useState } from 'react';
import { ICommentaryEvent } from '@gaming-platform/types';
import { MessageSquareText, Filter } from 'lucide-react';

export function CommentaryTimeline({
  commentaries = [],
}: {
  commentaries: ICommentaryEvent[];
}) {
  const [filter, setFilter] = useState<'all' | 'boundaries' | 'wickets'>('all');

  const filtered = commentaries.filter((c) => {
    if (filter === 'boundaries') return c.event === 'FOUR' || c.event === 'SIX' || c.runs >= 4;
    if (filter === 'wickets') return c.event === 'WICKET';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#08132E] p-4 rounded-2xl border border-white/10">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <MessageSquareText className="w-4 h-4 text-[#00E5A0]" />
          Ball-by-Ball Live Commentary
        </h3>

        <div className="flex items-center gap-1.5 bg-[#050C20] p-1 rounded-xl border border-white/5 text-xs">
          <Filter className="w-3.5 h-3.5 text-[#7183A8] ml-2" />
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filter === 'all' ? 'bg-[#287BFF] text-white' : 'text-[#7183A8] hover:text-white'
            }`}
          >
            All Balls
          </button>
          <button
            onClick={() => setFilter('boundaries')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filter === 'boundaries' ? 'bg-emerald-500 text-slate-950' : 'text-[#7183A8] hover:text-white'
            }`}
          >
            4s & 6s
          </button>
          <button
            onClick={() => setFilter('wickets')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filter === 'wickets' ? 'bg-rose-500 text-white' : 'text-[#7183A8] hover:text-white'
            }`}
          >
            Wickets
          </button>
        </div>
      </div>

      {/* Commentary Items */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item, idx) => {
            const isFour = item.event === 'FOUR' || item.runs === 4;
            const isSix = item.event === 'SIX' || item.runs === 6;
            const isWicket = item.event === 'WICKET';

            return (
              <div
                key={item.id || idx}
                className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all ${
                  isFour
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : isSix
                    ? 'bg-purple-950/20 border-purple-500/30'
                    : isWicket
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : 'bg-[#08132E]/80 border-white/5 hover:border-white/10'
                }`}
              >
                {/* Over Badge */}
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[#050C20] border border-white/10 shrink-0 font-mono">
                  <span className="text-xs font-bold text-white">{item.overNumber}</span>
                  <span className="text-[9px] text-[#7183A8]">OVER</span>
                </div>

                {/* Event Outcome Pill */}
                <div className="shrink-0 pt-0.5">
                  {isFour && (
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black text-xs shadow-md">
                      4
                    </span>
                  )}
                  {isSix && (
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-xs shadow-md animate-pulse">
                      6
                    </span>
                  )}
                  {isWicket && (
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-600 text-white font-black text-xs shadow-md">
                      W
                    </span>
                  )}
                  {!isFour && !isSix && !isWicket && (
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#101C3A] text-white font-bold text-xs border border-white/10">
                      {item.runs}
                    </span>
                  )}
                </div>

                {/* Description */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#00D9FF]">
                    <span>{item.bowler}</span>
                    <span className="text-white/30">to</span>
                    <span>{item.batsman}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#0A1633] p-8 rounded-2xl border border-white/10 text-center text-[#7183A8]">
          No commentary events found matching the selected filter.
        </div>
      )}
    </div>
  );
}
