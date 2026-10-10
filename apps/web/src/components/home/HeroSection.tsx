'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { GAMEHUB_ASSETS } from '@/config/gamehub-assets';
import { GameHubButton } from '@/components/gamehub/GameHubButton';
import { ArrowRight, Trophy } from 'lucide-react';

/**
 * HeroSection — Fully responsive gaming hero banner.
 *
 * MOBILE REQUIREMENTS (390px - 767px):
 * - Banner height: 260px fixed
 * - Mobile artwork: dedicated mobile_hero_banner.png (character on right, clean dark background on left)
 * - HTML Text on Left: "PLAY BIG WIN BIG", 30px heading (white + gold gradient), 12px description
 * - Compact responsive buttons (Explore Games + Online Players)
 * - Zero overlap with character image or floating elements
 *
 * DESKTOP REQUIREMENTS (>= 768px):
 * - Desktop artwork: heroDesktop (1920x720 composition)
 * - Full grid layout with animated floating badges
 */
export function HeroSection() {
  return (
    <div className="relative w-full h-[260px] md:h-auto rounded-[20px] overflow-hidden border border-[#00D9FF]/25 shadow-[0_0_35px_rgba(0,217,255,0.18)] bg-[#081535] before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-cyan-400/60 before:to-transparent before:z-20">
      {/* ── Internal Ambient Lighting Flares ── */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-gradient-to-br from-[#00D9FF]/18 to-transparent rounded-full blur-3xl pointer-events-none z-10" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-tl from-[#FF3FA4]/14 via-[#873BFF]/12 to-transparent rounded-full blur-3xl pointer-events-none z-10" />

      {/* ── Background Artwork Layers ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Mobile Dedicated Artwork Image (shown below md) */}
        <div className="block md:hidden relative w-full h-full">
          <Image
            src={GAMEHUB_ASSETS.banners.heroMobileArtwork}
            alt="GameHub Mobile Banner Character Artwork"
            fill
            className="object-cover object-[center_right]"
            priority
          />
          {/* Dark gradient overlay on left to ensure 100% text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#081535] via-[#081535]/90 to-transparent w-[68%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#081535]/95 via-transparent to-black/40" />
        </div>

        {/* Desktop Artwork Image (shown at md and above) */}
        <div className="hidden md:block relative w-full h-full">
          <Image
            src={GAMEHUB_ASSETS.banners.heroDesktop}
            alt="GameHub Desktop Banner Background"
            fill
            className="object-cover object-center opacity-85"
            priority
          />
          {/* Ambient desktop gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#081535]/95 via-[#081535]/75 to-transparent md:w-3/4" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050B20] via-transparent to-black/30" />
        </div>
      </div>

      {/* ── MOBILE CONTENT (< md) — Fixed 260px height ── */}
      <div className="block md:hidden relative z-10 h-full p-4.5 sm:p-5 flex flex-col justify-between">
        {/* Headline & Description */}
        <div className="space-y-1.5 my-auto">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="text-[28px] sm:text-[30px] font-black tracking-tight leading-[0.95] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
          >
            PLAY BIG
            <br />
            <span
              className="text-transparent bg-clip-text drop-shadow-[0_0_18px_rgba(255,201,40,0.45)]"
              style={{
                backgroundImage: 'linear-gradient(90deg, #FFFFFF 0%, #FFF099 45%, #FFC928 100%)',
                WebkitBackgroundClip: 'text',
              }}
            >
              WIN BIG
            </span>
          </motion.h1>
        </div>

        {/* Compact CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22 }}
          className="flex items-center gap-2 pt-0.5"
        >
          <GameHubButton variant="primary" size="sm" href="#games" className="text-xs px-3.5 py-2 shadow-[0_0_18px_rgba(0,217,255,0.4)] border border-cyan-300/40">
            Explore Games <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </GameHubButton>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/60 border border-emerald-400/40 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(0,229,160,0.25)] backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#00E5A0] shadow-[0_0_8px_#00E5A0] animate-pulse" />
            10,000+ Online
          </div>
        </motion.div>
      </div>

      {/* ── DESKTOP CONTENT (>= md) ── */}
      <div className="hidden md:grid relative z-10 grid-cols-12 min-h-[320px] lg:min-h-[340px] p-8 lg:p-10">
        {/* Left Column */}
        <div className="col-span-7 flex flex-col justify-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter leading-[1.05] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]">
              PLAY BIG
              <br />
              <span
                className="text-transparent bg-clip-text drop-shadow-[0_0_24px_rgba(255,201,40,0.5)]"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, #FFF099 0%, #FFC928 50%, #FF3FA4 100%)',
                  WebkitBackgroundClip: 'text',
                }}
              >
                WIN BIG
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base text-[#D0E0FF] max-w-md leading-relaxed font-medium drop-shadow"
          >
            Your favorite games, exciting instant-win experiences and rewarding prize pools.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center gap-3.5 pt-2"
          >
            <GameHubButton variant="primary" size="lg" href="#games" className="shadow-[0_0_22px_rgba(0,217,255,0.45)] border border-cyan-300/40">
              Explore Games <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </GameHubButton>

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/50 border border-emerald-400/40 backdrop-blur-md text-xs font-bold text-white shadow-[0_0_14px_rgba(0,229,160,0.25)]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00E5A0] shadow-[0_0_8px_#00E5A0] animate-pulse" />
              10,000+ Online Players
            </div>
          </motion.div>
        </div>

        {/* Right Floating Dynamic Column */}
        <div className="col-span-5 relative flex items-center justify-end">
          <motion.div
            animate={{ y: [8, -8, 8], rotate: [3, -3, 3] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-6 right-4 z-20 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#873BFF] to-[#00D9FF] text-white font-black text-xs shadow-[0_0_20px_rgba(135,59,255,0.45)] flex items-center gap-1.5 border border-white/40 backdrop-blur-md"
          >
            <span className="text-sm">💎</span> 100% Verified Fair
          </motion.div>
        </div>
      </div>
    </div>
  );
}
