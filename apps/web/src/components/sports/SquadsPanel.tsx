'use client';

import React from 'react';
import { IMatch, IPlayer } from '@gaming-platform/types';
import { Users, User } from 'lucide-react';

export function SquadsPanel({ match }: { match: IMatch }) {
  const teamAPlayers = match.teamA?.players || [];
  const teamBPlayers = match.teamB?.players || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Team A Squad */}
      <div className="bg-[#08132E] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
        <h3 className="text-base font-bold text-white flex items-center justify-between border-b border-white/10 pb-3">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00E5A0]" />
            {match.teamA?.name} Playing XI
          </span>
          <span className="text-xs font-mono text-[#00E5A0] font-bold">{teamAPlayers.length} Players</span>
        </h3>

        {teamAPlayers.length > 0 ? (
          <div className="space-y-2">
            {teamAPlayers.map((player: IPlayer) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#050C20] border border-white/5 hover:border-white/15 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#101C3A] text-[#00E5A0] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {player.jerseyNumber || '#'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{player.name}</div>
                    <div className="text-xs text-[#7183A8]">{player.role}</div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#101F42] text-[#00D9FF]">
                  {player.role}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-[#7183A8] text-xs">Squad list not announced yet.</div>
        )}
      </div>

      {/* Team B Squad */}
      <div className="bg-[#08132E] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
        <h3 className="text-base font-bold text-white flex items-center justify-between border-b border-white/10 pb-3">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#287BFF]" />
            {match.teamB?.name} Playing XI
          </span>
          <span className="text-xs font-mono text-[#287BFF] font-bold">{teamBPlayers.length} Players</span>
        </h3>

        {teamBPlayers.length > 0 ? (
          <div className="space-y-2">
            {teamBPlayers.map((player: IPlayer) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#050C20] border border-white/5 hover:border-white/15 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#101C3A] text-[#287BFF] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {player.jerseyNumber || '#'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{player.name}</div>
                    <div className="text-xs text-[#7183A8]">{player.role}</div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#101F42] text-[#00D9FF]">
                  {player.role}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-[#7183A8] text-xs">Squad list not announced yet.</div>
        )}
      </div>
    </div>
  );
}
