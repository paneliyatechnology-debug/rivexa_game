'use client';

import React from 'react';
import { ITeam } from '@gaming-platform/types';

const countryFlagMap: Record<string, string> = {
  IN: '🇮🇳',
  AU: '🇦🇺',
  GB: '🇬🇧',
  ZA: '🇿🇦',
  NZ: '🇳🇿',
  PK: '🇵🇰',
  SL: '🇱🇰',
  WI: '🌴',
  BAN: '🇧🇩',
  AFG: '🇦🇫',
  ES: '🇪🇸',
  FR: '🇫🇷',
  DE: '🇩🇪',
  IT: '🇮🇹',
  US: '🇺🇸',
};

export function TeamIdentity({
  team,
  size = 'md',
  showFull = true,
}: {
  team: ITeam;
  size?: 'sm' | 'md' | 'lg';
  showFull?: boolean;
}) {
  const flagEmoji = team.flagCode ? countryFlagMap[team.flagCode.toUpperCase()] || '🏏' : '🏏';

  const avatarSize = size === 'sm' ? 'w-6 h-6 text-xs' : size === 'lg' ? 'w-10 h-10 text-xl' : 'w-8 h-8 text-base';

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className={`${avatarSize} rounded-full bg-gradient-to-br from-[#101C3A] to-[#1A2B56] border border-white/15 flex items-center justify-center shadow-sm shrink-0 overflow-hidden`}
      >
        {team.logoUrl ? (
          <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
        ) : (
          <span>{flagEmoji}</span>
        )}
      </div>
      <div className="min-w-0 truncate">
        <span className={`font-bold tracking-tight text-white ${size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {showFull ? team.name : team.shortName}
        </span>
        {showFull && team.shortName && (
          <span className="text-xs text-[#7183A8] ml-1.5 font-medium hidden md:inline">
            ({team.shortName})
          </span>
        )}
      </div>
    </div>
  );
}
