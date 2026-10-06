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
    <div className="w-full bg-[#08132C]/90 backdrop-blur-md border-y border-cyan-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none no-scrollbar select-none">
          {sports.map((sport) => {
            const Icon = getSportIcon(sport.iconName);
            const isActive = activeSportSlug === sport.slug;

            return (
              <button
                key={sport.id || sport.slug}
                onClick={() => onSelectSport?.(sport.slug)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-cyan-300/80 scale-[1.03]'
                    : 'bg-[#0E1C3E]/80 hover:bg-[#152754] text-[#B8C7E6] hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 hover:shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-200 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]' : 'text-cyan-400'}`} />
                <span className="whitespace-nowrap tracking-wide">{sport.name}</span>
                {sport.matchCount !== undefined && sport.matchCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                      isActive
                        ? 'bg-slate-950/60 text-cyan-200 border border-cyan-400/40'
                        : 'bg-[#182B5C] text-cyan-300 border border-cyan-500/20'
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
