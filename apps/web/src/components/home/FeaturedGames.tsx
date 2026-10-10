'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { GAMEHUB_ASSETS } from '@/config/gamehub-assets';
import { GameHubButton } from '@/components/gamehub/GameHubButton';
import { GameHubIcon } from '@/components/gamehub/GameHubIcon';
import { ArrowRight, Flame, Star, Zap, Loader2, Trophy, Activity, CircleDot, TrendingUp, Sparkles, ChevronRight, Play } from 'lucide-react';
import { useGameSession } from '@/hooks/useGameSession';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/lib/config';

type CardKey = keyof typeof GAMEHUB_ASSETS.gameCards.cards;

const GAME_META: Record<
  string,
  {
    svgKey: CardKey;
    gradient: string;
    border: string;
    shadow: string;
    badgeStyle: string;
    ctaStyle: string;
    glowHex: string;
  }
> = {
  'fast-parity': {
    svgKey: 'fast-parity',
    gradient: 'from-[#061F15] to-[#050B20]',
    border: 'border-[#00E5A0]/45',
    shadow: 'shadow-[#00E5A0]/15',
    badgeStyle: 'bg-[#FF3F4A] text-white',
    ctaStyle: 'bg-gradient-to-r from-[#00E5A0] to-[#00C98B] text-[#04101F] font-black',
    glowHex: '#00E5A0',
  },
  parity: {
    svgKey: 'parity',
    gradient: 'from-[#071738] to-[#050B20]',
    border: 'border-[#287BFF]/45',
    shadow: 'shadow-[#287BFF]/15',
    badgeStyle: 'bg-[#FFC928] text-[#04101F] font-black',
    ctaStyle: 'bg-gradient-to-r from-[#287BFF] to-[#1765E8] text-white font-black',
    glowHex: '#287BFF',
  },
  mines: {
    svgKey: 'mines',
    gradient: 'from-[#241800] to-[#050B20]',
    border: 'border-[#FFC928]/45',
    shadow: 'shadow-[#FFC928]/15',
    badgeStyle: 'bg-[#FFC928] text-[#04101F] font-black',
    ctaStyle: 'bg-gradient-to-r from-[#FFC928] to-[#FF9F1C] text-[#04101F] font-black',
    glowHex: '#FFC928',
  },
  crash: {
    svgKey: 'crash',
    gradient: 'from-[#2B081E] to-[#050B20]',
    border: 'border-[#FF3FA4]/45',
    shadow: 'shadow-[#FF3FA4]/15',
    badgeStyle: 'bg-[#FF3F4A] text-white font-black',
    ctaStyle: 'bg-gradient-to-r from-[#FF3FA4] to-[#D00050] text-white font-black',
    glowHex: '#FF3FA4',
  },
  jet: {
    svgKey: 'jetx-flight',
    gradient: 'from-[#0F103A] to-[#050B20]',
    border: 'border-[#287BFF]/45',
    shadow: 'shadow-[#287BFF]/15',
    badgeStyle: 'bg-[#873BFF] text-white font-black',
    ctaStyle: 'bg-gradient-to-r from-[#287BFF] to-[#873BFF] text-white font-black',
    glowHex: '#287BFF',
  },
  spin: {
    svgKey: 'spin-wheel',
    gradient: 'from-[#221035] to-[#050B20]',
    border: 'border-[#FFC928]/45',
    shadow: 'shadow-[#873BFF]/15',
    badgeStyle: 'bg-[#287BFF] text-white font-black',
    ctaStyle: 'bg-gradient-to-r from-[#FFC928] via-[#873BFF] to-[#FF3FA4] text-white font-black',
    glowHex: '#FFC928',
  },
  dice: {
    svgKey: 'over-under-dice',
    gradient: 'from-[#041824] to-[#050B20]',
    border: 'border-[#00D9FF]/45',
    shadow: 'shadow-[#00D9FF]/15',
    badgeStyle: 'bg-[#00D9FF] text-[#04101F] font-black',
    ctaStyle: 'bg-gradient-to-r from-[#00D9FF] to-[#00E5A0] text-[#04101F] font-black',
    glowHex: '#00D9FF',
  },
  'andar-bahar': {
    svgKey: 'andar-bahar',
    gradient: 'from-[#1F082B] to-[#050B20]',
    border: 'border-[#FF3FA4]/45',
    shadow: 'shadow-[#FF3FA4]/15',
    badgeStyle: 'bg-[#873BFF] text-white font-black',
    ctaStyle: 'bg-gradient-to-r from-[#FF3FA4] to-[#873BFF] text-white font-black',
    glowHex: '#FF3FA4',
  },
  'coin-flip': {
    svgKey: 'coin-flip',
    gradient: 'from-[#221800] to-[#050B20]',
    border: 'border-[#FFC928]/45',
    shadow: 'shadow-[#FFC928]/15',
    badgeStyle: 'bg-[#FFC928] text-[#04101F] font-black',
    ctaStyle: 'bg-gradient-to-r from-[#FFC928] to-[#00D9FF] text-[#04101F] font-black',
    glowHex: '#FFC928',
  },
  pushparani: {
    svgKey: 'pushpani',
    gradient: 'from-[#2B081E] to-[#050B20]',
    border: 'border-[#FF3FA4]/45',
    shadow: 'shadow-[#FF3FA4]/15',
    badgeStyle: 'bg-[#00E5A0] text-[#04101F] font-black',
    ctaStyle: 'bg-gradient-to-r from-[#FF3FA4] to-[#873BFF] text-white font-black',
    glowHex: '#FF3FA4',
  },
  hilo: {
    svgKey: 'more-games',
    gradient: 'from-[#0A1638] via-[#0D1B4D] to-[#050B20]',
    border: 'border-[#00D9FF]/45',
    shadow: 'shadow-[#00D9FF]/15',
    badgeStyle: 'bg-gradient-to-r from-[#00D9FF] to-[#287BFF] text-[#04101F] font-black',
    ctaStyle: 'bg-gradient-to-r from-[#00D9FF] to-[#287BFF] text-[#04101F] font-black',
    glowHex: '#00D9FF',
  },
  'chicken-road': {
    svgKey: 'more-games',
    gradient: 'from-[#2B1B04] via-[#1C1202] to-[#050B20]',
    border: 'border-[#F59E0B]/45',
    shadow: 'shadow-[#F59E0B]/15',
    badgeStyle: 'bg-[#F59E0B] text-slate-950 font-black',
    ctaStyle: 'bg-gradient-to-r from-[#F59E0B] to-[#10B981] text-slate-950 font-black',
    glowHex: '#F59E0B',
  },
  'penalty-shootout': {
    svgKey: 'more-games',
    gradient: 'from-[#062016] via-[#051428] to-[#050B20]',
    border: 'border-[#10B981]/45',
    shadow: 'shadow-[#10B981]/15',
    badgeStyle: 'bg-gradient-to-r from-[#10B981] to-[#06B6D4] text-slate-950 font-black',
    ctaStyle: 'bg-gradient-to-r from-[#10B981] via-[#06B6D4] to-[#3B82F6] text-slate-950 font-black',
    glowHex: '#10B981',
  },
  'penalty': {
    svgKey: 'more-games',
    gradient: 'from-[#062016] via-[#051428] to-[#050B20]',
    border: 'border-[#10B981]/45',
    shadow: 'shadow-[#10B981]/15',
    badgeStyle: 'bg-gradient-to-r from-[#10B981] to-[#06B6D4] text-slate-950 font-black',
    ctaStyle: 'bg-gradient-to-r from-[#10B981] via-[#06B6D4] to-[#3B82F6] text-slate-950 font-black',
    glowHex: '#10B981',
  },
  'penalty-nations-cup': {
    svgKey: 'more-games',
    gradient: 'from-[#062016] via-[#051428] to-[#050B20]',
    border: 'border-[#10B981]/45',
    shadow: 'shadow-[#10B981]/15',
    badgeStyle: 'bg-gradient-to-r from-[#10B981] to-[#06B6D4] text-slate-950 font-black',
    ctaStyle: 'bg-gradient-to-r from-[#10B981] via-[#06B6D4] to-[#3B82F6] text-slate-950 font-black',
    glowHex: '#10B981',
  },
};

const DEFAULT_GAME_META = {
  svgKey: 'more-games' as CardKey,
  gradient: 'from-[#0A1020] to-[#050B20]',
  border: 'border-[#36BFFF]/25',
  shadow: 'shadow-[#36BFFF]/10',
  badgeStyle: 'bg-blue-600 text-white',
  ctaStyle: 'bg-gradient-to-r from-[#36BFFF] to-[#1A50C0] text-white',
  glowHex: '#36BFFF',
};

export const GAME_CATEGORIES = [
  { id: 'ALL', label: 'All Games', icon: '🌟', badge: null },
  { id: 'SPORTS', label: 'Sports & Live', icon: '⚽', badge: 'LIVE' },
  { id: 'CRASH', label: 'Crash Games', icon: '🚀', badge: 'HOT' },
  { id: 'MINES', label: 'Mines & Arcade', icon: '💣', badge: 'NEW' },
  { id: 'FAST', label: 'Fast Originals', icon: '⚡', badge: null },
  { id: 'CASINO', label: 'Casino & Cards', icon: '🎰', badge: null },
];

const SLUG_CATEGORY_MAP: Record<string, string> = {
  'penalty-shootout': 'SPORTS',
  'penalty': 'SPORTS',
  'penalty-nations-cup': 'SPORTS',
  'cricket': 'SPORTS',
  'crash': 'CRASH',
  'jet': 'CRASH',
  'pushparani': 'CRASH',
  'mines': 'MINES',
  'chicken-road': 'MINES',
  'fast-parity': 'FAST',
  'parity': 'FAST',
  'coin-flip': 'FAST',
  'hilo': 'FAST',
  'spin': 'CASINO',
  'andar-bahar': 'CASINO',
  'dice': 'CASINO',
};

const EXTERNAL_GAMES = new Set(['crash', 'jet', 'pushparani', 'coin-flip', 'flipcoin', 'chicken-road', 'penalty-shootout', 'penalty', 'penalty-nations-cup']);

const GAME_DESC: Record<string, string> = {
  'fast-parity': '30 Seconds',
  parity: '1 Minute',
  mines: '5×5 Grid',
  crash: 'Multiplier Game',
  jet: 'Aviator Style',
  spin: 'Spin for Rewards',
  dice: 'Instant Rolls',
  'andar-bahar': 'Traditional Game',
  'coin-flip': 'Win Big',
  pushparani: 'Traditional Game',
  hilo: 'Higher or Lower Card',
  'chicken-road': 'Road Crossing Multiplier',
  'penalty-shootout': 'Penalty Nations Cup',
  'penalty': 'Penalty Nations Cup',
  'penalty-nations-cup': 'Penalty Nations Cup',
};

interface FeaturedGamesProps {
  games: any[];
  searchQuery?: string;
}

export function FeaturedGames({ games, searchQuery = '' }: FeaturedGamesProps) {
  const router = useRouter();
  const { launchGame } = useGameSession();
  const { isAuthenticated } = useAuth();
  const [launchingSlug, setLaunchingSlug] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [liveMatches, setLiveMatches] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function fetchSportsMatches() {
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/sports/cricket/matches/all`).catch(() => null);
        if (res && res.ok) {
          const json = await res.json().catch(() => null);
          if (json && json.data && Array.isArray(json.data) && isMounted) {
            const allM: any[] = [];
            json.data.forEach((comp: any) => {
              if (Array.isArray(comp.matches)) {
                allM.push(...comp.matches);
              }
            });
            setLiveMatches(allM.slice(0, 4));
          }
        }
      } catch {}
    }
    fetchSportsMatches();
    return () => { isMounted = false; };
  }, []);

  const handleGameCardClick = async (e: React.MouseEvent, gameSlug: string) => {
    e.preventDefault();

    // If not logged in, allow guest preview by navigating directly to game page
    if (!isAuthenticated) {
      router.push(`/play/${gameSlug}`);
      return;
    }
    setLaunchingSlug(gameSlug);
    try {
      const result = await launchGame(gameSlug, 'REAL', 'INR');
      if (result && result.launchUrl) {
        if (result.launchUrl.startsWith('http://') || result.launchUrl.startsWith('https://')) {
          window.location.href = result.launchUrl;
        } else {
          router.push(result.launchUrl);
        }
      } else {
        router.push(`/play/${gameSlug}`);
      }
    } catch {
      router.push(`/play/${gameSlug}`);
    } finally {
      setLaunchingSlug(null);
    }
  };

  // Deduplicate games by slug to ensure clean rendering
  const seenSlugs = new Set<string>();
  const uniqueGames = games.filter((g) => {
    const slugKey = (g.slug || g.id || '').toLowerCase();
    if (!slugKey || seenSlugs.has(slugKey)) return false;
    seenSlugs.add(slugKey);
    return true;
  });

  // Filter games based on active category
  const categoryGames = uniqueGames.filter((g) => {
    if (activeCategory === 'ALL') return true;
    const cat = SLUG_CATEGORY_MAP[g.slug] || 'FAST';
    return cat === activeCategory;
  });

  const filtered = searchQuery
    ? categoryGames.filter(
        (g) =>
          g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.slug?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categoryGames;

  const showSportsShowcase = (activeCategory === 'ALL' || activeCategory === 'SPORTS') && !searchQuery;

  return (
    <div id="games" className="space-y-4">
      {/* ── Top Header with Neon Accent ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-[#287BFF]/25 to-[#00D9FF]/20 border border-[#00D9FF]/40 flex items-center justify-center shadow-[0_0_16px_rgba(0,217,255,0.35)]">
            <Flame className="w-5 h-5 text-[#FF3FA4] drop-shadow-[0_0_8px_rgba(255,63,164,0.6)]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Games &amp; Sports Hub</span>
              <span className="w-2 h-2 rounded-full bg-[#00E5A0] shadow-[0_0_8px_#00E5A0] animate-pulse" />
            </h2>
            <p className="text-xs text-[#8EA3D0]">Top instant multiplier games, penalty arena &amp; live sports</p>
          </div>
        </div>
        <Link
          href="/sports"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#102450] to-[#0A1A3A] border border-[#00D9FF]/40 text-xs font-black text-[#00D9FF] hover:border-[#00D9FF] hover:shadow-[0_0_15px_rgba(0,217,255,0.4)] transition-all shrink-0 shadow-md"
        >
          Sportsbook <ArrowRight className="w-3 h-3 stroke-[3]" />
        </Link>
      </div>

      {/* ── Category Selection Pills with High-Voltage Glow (Mobile Horizontal Scrollable) ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1.5 pt-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
        {GAME_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const count =
            cat.id === 'ALL'
              ? uniqueGames.length
              : cat.id === 'SPORTS'
              ? uniqueGames.filter((g) => SLUG_CATEGORY_MAP[g.slug] === 'SPORTS').length + (liveMatches.length > 0 ? liveMatches.length : 1)
              : uniqueGames.filter((g) => SLUG_CATEGORY_MAP[g.slug] === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer relative overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-r from-[#00D9FF] via-[#00E5A0] to-[#287BFF] text-slate-950 border border-white/60 shadow-[0_0_22px_rgba(0,217,255,0.55),0_0_40px_rgba(0,229,160,0.3)] scale-[1.03] before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-white/80'
                  : 'bg-[#0A1633]/90 text-[#9BB1DE] border border-white/12 hover:border-[#00D9FF]/40 hover:text-white hover:shadow-[0_0_14px_rgba(0,217,255,0.2)] backdrop-blur-md'
              }`}
            >
              <span className="text-sm drop-shadow">{cat.icon}</span>
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isActive ? 'bg-black/25 text-slate-950' : 'bg-white/10 text-[#7285AE]'
                }`}
              >
                {count}
              </span>
              {cat.badge && (
                <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black leading-tight animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                  {cat.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Live Sports & Cricket Betting Showcase (When ALL or SPORTS is active) ── */}
      {showSportsShowcase && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">⚽</span>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-emerald-300">
                  Live Sports &amp; Penalty Arena
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.35)] animate-pulse">
                  LIVE ODDS
                </span>
              </h3>
            </div>
            <Link
              href="/sports"
              className="text-[11px] font-bold text-[#00D9FF] hover:underline flex items-center gap-1 drop-shadow-[0_0_6px_rgba(0,217,255,0.4)]"
            >
              View 22+ Matches <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Card 1: Live Cricket Match Preview with Neon Cyber Glow */}
            {liveMatches.length > 0 ? (
              (() => {
                const match = liveMatches[0];
                const score = match.score;
                return (
                  <Link
                    key={match.id}
                    href={`/sports/cricket/${match.id}`}
                    className="relative group rounded-2xl p-4 bg-gradient-to-br from-[#0B1E48]/95 via-[#081735]/95 to-[#040B1D]/95 border-2 border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.22)] hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] transition-all cursor-pointer overflow-hidden block before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-cyan-400/60 before:to-transparent"
                  >
                    {/* Atmospheric Glow Corner */}
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2 relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                          LIVE
                        </span>
                        <span className="text-xs font-black text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]">
                          {match.competition?.name || 'Cricket Tournament'} • {match.matchType || 'T20'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-300 font-mono">
                        {match.venue ? match.venue.split(',')[0] : 'Melbourne'}
                      </span>
                    </div>

                    <div className="space-y-2 mb-3 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-black text-white text-xs sm:text-sm">
                          <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-xs shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                            🏏
                          </div>
                          <span>{match.teamA?.name || 'Team 1'}</span>
                        </div>
                        {score?.teamAScore && (
                          <span className="font-mono text-xs sm:text-sm font-black text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]">
                            {score.teamAScore} {score.teamAOvers && <span className="text-[10px] text-slate-400 font-normal">({score.teamAOvers} ov)</span>}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-black text-white text-xs sm:text-sm">
                          <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-xs shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                            🏏
                          </div>
                          <span>{match.teamB?.name || 'Team 2'}</span>
                        </div>
                        {score?.teamBScore && (
                          <span className="font-mono text-xs sm:text-sm font-black text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]">
                            {score.teamBScore} {score.teamBOvers && <span className="text-[10px] text-slate-400 font-normal">({score.teamBOvers} ov)</span>}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Odds Bar with Neon Edge */}
                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10 text-center relative z-10">
                      <div className="bg-gradient-to-b from-[#132C62] to-[#0B1B3E] hover:border-cyan-300 border border-cyan-500/40 rounded-xl py-1 px-1 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:scale-105 active:scale-95">
                        <span className="text-[9px] text-slate-400 font-bold block">1</span>
                        <span className="text-xs font-black text-cyan-300">1.85</span>
                      </div>
                      <div className="bg-gradient-to-b from-[#132C62] to-[#0B1B3E] hover:border-amber-300 border border-amber-500/40 rounded-xl py-1 px-1 transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)] hover:scale-105 active:scale-95">
                        <span className="text-[9px] text-slate-400 font-bold block">DRAW</span>
                        <span className="text-xs font-black text-amber-300">3.40</span>
                      </div>
                      <div className="bg-gradient-to-b from-[#132C62] to-[#0B1B3E] hover:border-cyan-300 border border-cyan-500/40 rounded-xl py-1 px-1 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:scale-105 active:scale-95">
                        <span className="text-[9px] text-slate-400 font-bold block">2</span>
                        <span className="text-xs font-black text-cyan-300">1.95</span>
                      </div>
                    </div>
                  </Link>
                );
              })()
            ) : (
              /* Fallback Live Sports Card */
              <Link
                href="/sports"
                className="relative rounded-2xl p-4 bg-gradient-to-br from-[#0B1E48]/95 via-[#081735]/95 to-[#040B1D]/95 border-2 border-cyan-500/40 hover:border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.2)] transition-all block group overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-cyan-400/60 before:to-transparent"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    CRICAPI SPORTSBOOK
                  </span>
                  <span className="text-xs text-cyan-300 font-bold">22+ Live Matches</span>
                </div>
                <h4 className="text-sm font-black text-white mb-1 group-hover:text-cyan-300 transition-colors">
                  Live Cricket, Football &amp; Virtual Leagues
                </h4>
                <p className="text-xs text-slate-300 mb-3">
                  Place live bets on real-time cricket matches with instant odds updates.
                </p>
                <div className="inline-flex items-center gap-1 text-xs font-black text-cyan-400 group-hover:translate-x-1 transition-transform">
                  Open Sportsbook <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            )}

            {/* Card 2: Penalty Nations Cup Flagship Banner with Emerald Stadium Glow */}
            <a
              href="/play/penalty-shootout"
              onClick={(e) => handleGameCardClick(e, 'penalty-shootout')}
              className="relative group rounded-2xl p-4 bg-gradient-to-br from-[#062A1D]/95 via-[#093A27]/95 to-[#03150D]/95 border-2 border-emerald-400/60 hover:border-emerald-300 shadow-[0_0_35px_rgba(16,185,129,0.3)] hover:shadow-[0_0_45px_rgba(16,185,129,0.5)] transition-all cursor-pointer overflow-hidden block before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-emerald-400/70 before:to-transparent"
            >
              {/* Internal Floodlight Flare */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/25 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-2 relative z-10">
                <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                  FLAGSHIP SPORTS
                </span>
                <span className="text-xs font-black text-emerald-300 drop-shadow-[0_0_6px_rgba(74,222,128,0.5)]">Up to 604x Multipliers</span>
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/25 border border-emerald-300/60 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(74,222,128,0.45)]">
                  ⚽
                </div>
                <div>
                  <h4 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors drop-shadow-sm">
                    Penalty Nations Cup
                  </h4>
                  <p className="text-xs text-emerald-200/80 leading-snug">
                    Score penalty shootout goals past the goalkeeper in Brazil vs Argentina showdown!
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-emerald-500/30 relative z-10">
                <span className="text-[10px] font-extrabold text-emerald-300">Min Bet ₹10</span>
                <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 text-slate-950 flex items-center gap-1 group-hover:brightness-110 shadow-[0_0_16px_rgba(16,185,129,0.5)] active:scale-95 transition-all">
                  Play Shootout <Play className="w-2.5 h-2.5 fill-slate-950" />
                </span>
              </div>
            </a>
          </div>
        </div>
      )}

      {/* ── Category Games Grid (Mobile 2-Cols, Desktop 3-5 Cols) with Neon Lighting ── */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-[#A8B9DE] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {activeCategory === 'ALL'
                ? 'All Platform Games'
                : `${GAME_CATEGORIES.find((c) => c.id === activeCategory)?.label || 'Category'} Games`}
            </span>
          </span>
          <span className="text-xs text-[#7285AE] font-bold">
            Showing {filtered.length} {filtered.length === 1 ? 'game' : 'games'}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#101C3A] border border-white/10 flex items-center justify-center">
              <GameHubIcon name="gamepad" size={32} color="#7285AE" />
            </div>
            <p className="text-[#A8B9DE] font-bold">No games found in this category</p>
            <button
              onClick={() => setActiveCategory('ALL')}
              className="text-xs font-bold text-[#00D9FF] hover:underline cursor-pointer"
            >
              View all games
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
            {filtered.map((game: any, i: number) => {
              const meta = GAME_META[game.slug] ?? DEFAULT_GAME_META;
              const desc = GAME_DESC[game.slug] ?? game.description?.split('...')[0] ?? 'Classic Game';
              const isLaunching = launchingSlug === game.slug;

              // Resolve the individual SVG card from the Figma kit
              const svgSrc =
                GAMEHUB_ASSETS.gameCards.cards[meta.svgKey as CardKey] ??
                GAMEHUB_ASSETS.gameCards.cards['more-games'];

              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.35, ease: 'easeOut' }}
                >
                  <a
                    href={`/play/${game.slug}`}
                    onClick={(e) => handleGameCardClick(e, game.slug)}
                    className={`group relative flex flex-col rounded-[20px] bg-gradient-to-b ${meta.gradient} border-2 ${meta.border} shadow-xl hover:-translate-y-1 hover:shadow-2xl active:scale-95 transition-all duration-300 cursor-pointer overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/35 before:to-transparent ${
                      isLaunching ? 'pointer-events-none opacity-80' : ''
                    }`}
                    style={{
                      boxShadow: `0 4px 24px -2px ${meta.glowHex}38, 0 0 16px ${meta.glowHex}22`,
                    }}
                  >
                    {/* Loading overlay */}
                    {isLaunching && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-xs rounded-[20px]">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}

                    {/* Badge */}
                    {game.badge && (
                      <div className="absolute top-2.5 left-2.5 z-20">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full shadow-md ${meta.badgeStyle} flex items-center gap-1 drop-shadow-sm`}
                        >
                          {game.badge === 'HOT' && <Flame className="w-2.5 h-2.5" />}
                          {game.badge === 'NEW' && <Star className="w-2.5 h-2.5" />}
                          {game.badge === '50X' && <Zap className="w-2.5 h-2.5" />}
                          {game.badge}
                        </span>
                      </div>
                    )}

                    {/* Game illustration */}
                    <div className="relative h-28 sm:h-32 overflow-hidden rounded-t-[20px]">
                      {/* Accent glow behind the SVG art panel */}
                      <div
                        className="absolute inset-0 opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at 50% 30%, ${meta.glowHex}77 0%, transparent 75%)`,
                        }}
                      />
                      {/* Individual Figma SVG card */}
                      <Image
                        src={svgSrc}
                        alt={game.name}
                        fill
                        unoptimized
                        className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                      {/* Fade into card body */}
                      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#050B20] to-transparent pointer-events-none" />
                    </div>

                    {/* Card footer */}
                    <div className="px-2.5 sm:px-3 pb-3 pt-2 flex flex-col gap-1.5 sm:gap-2">
                      <div>
                        <h3 className="text-xs sm:text-sm font-black text-white truncate group-hover:text-[#00D9FF] transition-colors drop-shadow-sm">
                          {game.name}
                        </h3>
                        <p className="text-[10px] text-[#7285AE] truncate">{desc}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-white bg-white/12 border border-white/15 px-2 py-0.5 rounded-full shadow-inner">
                          Min ₹{game.minBet || 10}
                        </span>
                        <span
                          className={`text-[9px] sm:text-[10px] font-black px-2.5 sm:px-3 py-1 rounded-full ${meta.ctaStyle} flex items-center gap-1 group-hover:brightness-110 group-hover:shadow-[0_0_12px_${meta.glowHex}66] transition-all shadow-md shrink-0`}
                        >
                          {isLaunching ? (
                            <>
                              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Loading…
                            </>
                          ) : (
                            <>
                              Play <ArrowRight className="w-2.5 h-2.5 stroke-[3]" />
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </a>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
