'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Trophy,
  Cpu,
  CircleDot,
  Activity,
  Shield,
  Dribbble,
  Zap,
  Flame,
  Target,
  Swords,
} from 'lucide-react';

export interface ISportsNavItem {
  id: string;
  slug: string;
  name: string;
  iconName: string;
  matchCount?: number;
}

const defaultSports: ISportsNavItem[] = [
  { id: '1', slug: 'cricket', name: 'Cricket', iconName: 'trophy' },
  { id: '2', slug: 'virtual-sports', name: 'Virtual Sports', iconName: 'cpu' },
  { id: '3', slug: 'football', name: 'Football', iconName: 'circle-dot' },
  { id: '4', slug: 'tennis', name: 'Tennis', iconName: 'activity' },
  { id: '5', slug: 'american-football', name: 'American Football', iconName: 'shield' },
  { id: '6', slug: 'basketball', name: 'Basketball', iconName: 'dribble' },
  { id: '7', slug: 'horse-racing', name: 'Horse Racing', iconName: 'zap' },
  { id: '8', slug: 'greyhound-racing', name: 'Greyhound Racing', iconName: 'flame' },
  { id: '9', slug: 'baseball', name: 'Baseball', iconName: 'target' },
  { id: '10', slug: 'mma', name: 'Mixed Martial Arts', iconName: 'swords' },
];

function getSportIcon(name: string) {
  switch (name) {
    case 'trophy':
      return Trophy;
    case 'cpu':
      return Cpu;
    case 'circle-dot':
      return CircleDot;
    case 'activity':
      return Activity;
    case 'shield':
      return Shield;
    case 'dribble':
      return Dribbble;
    case 'zap':
      return Zap;
    case 'flame':
      return Flame;
    case 'target':
      return Target;
    case 'swords':
      return Swords;
    default:
      return Trophy;
  }
}

export function SportsNavigation({
  activeSportSlug = 'cricket',
  sports = defaultSports,
  onSelectSport,
}: {
  activeSportSlug?: string;
  sports?: ISportsNavItem[];
  onSelectSport?: (slug: string) => void;
}) {
  const pathname = usePathname();

  return (
    <div className="w-full bg-[#08132C]/90 backdrop-blur-md border-y border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none no-scrollbar select-none">
          {sports.map((sport) => {
            const Icon = getSportIcon(sport.iconName);
            const isActive = activeSportSlug === sport.slug;

            return (
              <button
                key={sport.id || sport.slug}
                onClick={() => onSelectSport?.(sport.slug)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#397F32] to-[#579D43] text-white shadow-[0_0_15px_rgba(57,127,50,0.4)] border border-[#579D43]/60 scale-[1.02]'
                    : 'bg-[#0E1C3E]/70 hover:bg-[#152754] text-[#B8C7E6] hover:text-white border border-white/5 hover:border-white/15'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-200' : 'text-[#00E5A0]'}`} />
                <span className="whitespace-nowrap">{sport.name}</span>
                {sport.matchCount !== undefined && sport.matchCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-black/30 text-emerald-200' : 'bg-[#182B5C] text-[#00D9FF]'
                    }`}
                  >
                    {sport.matchCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
