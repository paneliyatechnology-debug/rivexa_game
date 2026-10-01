'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { GAMEHUB_ASSETS } from '@/config/gamehub-assets';
import { GameHubButton } from '@/components/gamehub/GameHubButton';
import { GameHubIcon } from '@/components/gamehub/GameHubIcon';
import { ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * PromoCarousel — 4 banner slides built from the banner collection reference.
 *
 * The Promotional_banners_collection.png contains 4 banner strips vertically stacked:
 *   1. Hero banner  (PLAY BIG WIN BIG)            — row 0
 *   2. Welcome Bonus (100% WELCOME BONUS)          — row 1
 *   3. Daily Rewards                               — row 2
 *   4. Invite & Earn                               — row 3
 *
 * We use the collection image as a background via CSS object-position (for tablet+)
 * and recreate each banner as a real HTML component with real buttons + text.
 * This matches the requirement: "Do not place text inside the image if it needs to change dynamically."
 */

interface Banner {
  id: string;
  /** Row index in the collection image (0-3) — each row ≈ 25% of the image height */
  imageRow: number;
  badge: string;
  badgeStyle: string;
  headline: string[];
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  ctaVariant: 'primary' | 'claim' | 'invite' | 'deposit';
  bgGradient: string;
  borderColor: string;
  glowColor: string;
}

const BANNERS: Banner[] = [
  {
    id: 'hero',
    imageRow: 0,
    badge: 'FEATURED',
    badgeStyle: 'bg-[#00E5A0] text-[#06152C]',
    headline: ['PLAY BIG', 'WIN BIG'],
    subtitle: 'Your favorite games, exciting experiences and rewarding moments.',
    ctaLabel: 'Explore Games →',
    ctaHref: '#games',
    ctaVariant: 'primary',
    bgGradient: 'from-[#0C1A45] via-[#152B6A] to-[#1A0A40]',
    borderColor: 'border-[#287BFF]/30',
    glowColor: 'rgba(40,123,255,0.25)',
  },
  {
    id: 'welcome',
    imageRow: 1,
    badge: '🎁 LIMITED OFFER',
    badgeStyle: 'bg-[#FF3FA4] text-white',
    headline: ['100% WELCOME', 'BONUS'],
    subtitle: 'Double your wallet balance on your first deposit!',
    ctaLabel: 'Claim Now →',
    ctaHref: '/deposit',
    ctaVariant: 'claim',
    bgGradient: 'from-[#1B0D45] via-[#2D1580] to-[#1B0D45]',
    borderColor: 'border-[#873BFF]/40',
    glowColor: 'rgba(135,59,255,0.25)',
  },
  {
    id: 'daily',
    imageRow: 2,
    badge: '📅 EVERY DAY',
    badgeStyle: 'bg-[#00E5A0] text-[#06152C]',
    headline: ['DAILY', 'REWARDS'],
    subtitle: 'Login daily, get exciting rewards!',
    ctaLabel: 'Claim Now →',
    ctaHref: '/checkin',
    ctaVariant: 'claim',
    bgGradient: 'from-[#0A2818] via-[#0F3820] to-[#050B20]',
    borderColor: 'border-[#00E5A0]/30',
    glowColor: 'rgba(0,229,160,0.20)',
  },
  {
    id: 'invite',
    imageRow: 3,
    badge: '👥 EARN TOGETHER',
    badgeStyle: 'bg-[#287BFF] text-white',
    headline: ['INVITE FRIENDS', '& EARN'],
    subtitle: 'Invite your friends and earn up to 5% commission!',
    ctaLabel: 'Invite Now →',
    ctaHref: '/invite',
    ctaVariant: 'invite',
    bgGradient: 'from-[#090E2E] via-[#0D1540] to-[#050B20]',
    borderColor: 'border-[#287BFF]/30',
    glowColor: 'rgba(40,123,255,0.20)',
  },
];

export function PromoCarousel() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<'right' | 'left'>('right');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = (idx: number, dir: 'right' | 'left') => {
    setDirection(dir);
    setActive(idx);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const next = () => goTo((active + 1) % BANNERS.length, 'right');
  const prev = () => goTo((active - 1 + BANNERS.length) % BANNERS.length, 'left');

  useEffect(() => {
    timerRef.current = setTimeout(next, 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active]);

  const banner = BANNERS[active];

  return (
    <div className="relative rounded-[20px] overflow-hidden w-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          initial={{ opacity: 0, x: direction === 'right' ? 50 : -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction === 'right' ? -50 : 50 }}
          transition={{ duration: 0.38, ease: 'easeInOut' }}
          className={`relative w-full rounded-[20px] bg-gradient-to-br ${banner.bgGradient} border ${banner.borderColor} overflow-hidden`}
          style={{ boxShadow: `0 0 40px ${banner.glowColor}` }}
        >
          {/* Background image — the banner collection used as a bg visual, clipped to show correct row */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ overflow: 'hidden' }}
          >
            <Image
              src={GAMEHUB_ASSETS.banners.collection}
              alt=""
              fill
              className="object-cover"
              style={{
                objectPosition: `center ${banner.imageRow * 25}%`,
                transform: 'scale(1.3)',
              }}
              sizes="600px"
              priority={active === 0}
              aria-hidden
            />
          </div>

          {/* ── Foreground real content ── */}
          <div className="relative z-10 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-h-[120px]">
            {/* Icon + text */}
            <div className="flex items-center gap-4 flex-1">
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shadow-xl">
                <GameHubIcon
                  name={active === 0 ? 'gamepad' : active === 1 ? 'gift' : active === 2 ? 'trophy' : 'user'}
                  size={30}
                  isActive
                  activeColor={active === 0 ? '#00D9FF' : active === 1 ? '#FFC928' : active === 2 ? '#00E5A0' : '#287BFF'}
                  glow
                />
              </div>

              <div className="space-y-1.5">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${banner.badgeStyle}`}>
                  {banner.badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {banner.headline.map((line, i) => (
                    <span key={i} className={i === 1 ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#FFF099] via-[#FFC928] to-[#FF3FA4]' : ''}>
                      {line}{i < banner.headline.length - 1 && <br />}
                    </span>
                  ))}
                </h3>
                <p className="text-xs sm:text-sm text-[#A8B9DE] leading-relaxed max-w-xs">
                  {banner.subtitle}
                </p>
              </div>
            </div>

            {/* CTA */}
            <GameHubButton
              variant={banner.ctaVariant}
              size="sm"
              href={banner.ctaHref}
              className="shrink-0"
            >
              {banner.ctaLabel}
            </GameHubButton>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Prev/Next arrows */}
      <button
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <button
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
      >
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Pagination dots */}
      <div className="flex justify-center gap-1.5 mt-2.5">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > active ? 'right' : 'left')}
            className={`rounded-full transition-all duration-300 ${
              i === active ? 'w-6 h-2 bg-[#00E5A0]' : 'w-2 h-2 bg-white/25 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
