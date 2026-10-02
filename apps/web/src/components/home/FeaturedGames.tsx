'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { GAMEHUB_ASSETS } from '@/config/gamehub-assets';
import { GameHubButton } from '@/components/gamehub/GameHubButton';
import { GameHubIcon } from '@/components/gamehub/GameHubIcon';
import { ArrowRight, Flame, Star, Zap } from 'lucide-react';

/**
 * Maps each game slug to its Figma SVG card key + accent styling.
 * SVG card files: public/assets/gamehub/game-cards/*.svg (from the Figma editable vector kit)
 */

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

const EXTERNAL_GAMES = new Set(['crash', 'jet', 'pushparani', 'coin-flip', 'flipcoin']);

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
};

interface FeaturedGamesProps {
  games: any[];
  searchQuery?: string;
}

export function FeaturedGames({ games, searchQuery = '' }: FeaturedGamesProps) {
  const filtered = searchQuery
    ? games.filter(
        (g) =>
          g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.slug?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : games;

  return (
    <div id="games" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#287BFF]/15 border border-[#287BFF]/30 flex items-center justify-center">
            <Flame className="w-5 h-5 text-[#FF3FA4]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white">Featured Games</h2>
            <p className="text-xs text-[#7285AE]">Discover your next favorite game</p>
          </div>
        </div>
        <Link
          href="/#games"
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#101C3A] border border-white/10 text-xs font-bold text-[#00D9FF] hover:border-[#00D9FF]/40 transition-all"
        >
          View All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Games grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#101C3A] border border-white/10 flex items-center justify-center">
            <GameHubIcon name="gamepad" size={32} color="#7285AE" />
          </div>
          <p className="text-[#A8B9DE] font-bold">No games found</p>
          <p className="text-sm text-[#7285AE]">Try a different search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((game: any, i: number) => {
            const meta = GAME_META[game.slug] ?? DEFAULT_GAME_META;
            const isExternal = EXTERNAL_GAMES.has(game.slug);
            const desc = GAME_DESC[game.slug] ?? game.description?.split('...')[0] ?? 'Classic Game';

            // Resolve the individual SVG card from the Figma kit
            const svgSrc =
              GAMEHUB_ASSETS.gameCards.cards[meta.svgKey as CardKey] ??
              GAMEHUB_ASSETS.gameCards.cards['more-games'];

            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.055, 0.4), duration: 0.4, ease: 'easeOut' }}
              >
                <Link
                  href={`/play/${game.slug}`}
                  onClick={(e) => {
                    if (isExternal && typeof window !== 'undefined' && window.innerWidth >= 768) {
                      e.preventDefault();
                      window.open(`/play/${game.slug}`, '_blank');
                    }
                  }}
                  className={`group relative flex flex-col rounded-[20px] bg-gradient-to-b ${meta.gradient} border ${meta.border} shadow-lg ${meta.shadow} overflow-hidden hover:-translate-y-1.5 hover:shadow-xl active:scale-95 transition-all duration-300 cursor-pointer`}
                  style={{ boxShadow: `0 4px 20px -4px ${meta.glowHex}22` }}
                >
                  {/* Badge */}
                  {game.badge && (
                    <div className="absolute top-2.5 left-2.5 z-20">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shadow-md ${meta.badgeStyle} flex items-center gap-1`}>
                        {game.badge === 'HOT' && <Flame className="w-2.5 h-2.5" />}
                        {game.badge === 'NEW' && <Star className="w-2.5 h-2.5" />}
                        {game.badge === '50X' && <Zap className="w-2.5 h-2.5" />}
                        {game.badge}
                      </span>
                    </div>
                  )}

                  {/* Game illustration — individual SVG from the Figma editable vector kit */}
                  <div className="relative h-28 sm:h-32 overflow-hidden rounded-t-[20px]">
                    {/* Accent glow behind the SVG art panel */}
                    <div
                      className="absolute inset-0 opacity-40 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at 50% 40%, ${meta.glowHex}55 0%, transparent 70%)`,
                      }}
                    />
                    {/* Individual Figma SVG card — objectTop shows the art panel */}
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
                  <div className="px-3 pb-3 pt-2 flex flex-col gap-2">
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-white truncate group-hover:text-[#00D9FF] transition-colors">
                        {game.name}
                      </h3>
                      <p className="text-[10px] text-[#7285AE]">{desc}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-white bg-white/10 border border-white/10 px-2 py-0.5 rounded-full">
                        Min ₹{game.minBet || 10}
                      </span>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full ${meta.ctaStyle} flex items-center gap-1 group-hover:brightness-110 transition-all shadow-md`}>
                        Play Now <ArrowRight className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
