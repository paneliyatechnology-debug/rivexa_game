'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { GameHubButton } from '@/components/gamehub/GameHubButton';
import { GameHubIcon } from '@/components/gamehub/GameHubIcon';
import { GAMEHUB_ASSETS } from '@/config/gamehub-assets';
import { Sparkles, ArrowRight, Users, Gift } from 'lucide-react';

/**
 * ReferralBanner — Fully responsive Invite Friends & Earn section.
 *
 * Uses the custom high-res 3D illustration asset:
 *   public/assets/gamehub/banners/invite_friends_banner.jpg
 *
 * Responsive across Mobile, Tablet, Laptop, and Desktop viewports:
 * - Mobile (< md): Clean vertical card layout featuring 3D artwork banner preview + text + CTA.
 * - Desktop (>= md): 2-column grid layout with left text & right 3D illustration showcase.
 */
export function ReferralBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full"
    >
      <div className="relative w-full rounded-[24px] overflow-hidden bg-gradient-to-r from-[#090E2E] via-[#0F1E4C] to-[#08132C] border border-[#287BFF]/40 shadow-[0_0_35px_rgba(40,123,255,0.22)] before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-[#00D9FF]/60 before:to-transparent before:z-20">
        {/* Ambient Glows */}
        <div className="absolute -top-16 -left-16 w-72 h-72 bg-[#873BFF]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 right-0 w-72 h-72 bg-[#00E5A0]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* ── Left Content (Text & CTA) ── */}
            <div className="md:col-span-7 flex flex-col justify-center space-y-3.5 text-left">
              {/* Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-[#00E5A0]/20 border border-[#00E5A0]/50 text-[#00E5A0] uppercase tracking-wider shadow-[0_0_12px_rgba(0,229,160,0.25)]">
                  <Sparkles className="w-3 h-3 drop-shadow-[0_0_6px_#00E5A0]" />
                  3-Tier Referral Commission
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 border border-white/20 text-white shadow-sm">
                  <Gift className="w-3 h-3 text-[#FFC928] drop-shadow-[0_0_6px_#FFC928]" />
                  Instant Rewards
                </span>
              </div>

              {/* Headline */}
              <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                Invite Friends &amp; Earn{' '}
                <span
                  className="text-transparent bg-clip-text drop-shadow-[0_0_18px_rgba(0,217,255,0.4)]"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, #00E5A0 0%, #00D9FF 50%, #FFC928 100%)',
                    WebkitBackgroundClip: 'text',
                  }}
                >
                  Lifetime Commission!
                </span>
              </h3>

              {/* Description & Tier Breakdown */}
              <p className="text-xs sm:text-sm text-[#A8B9DE] leading-relaxed max-w-xl">
                Share your referral link with friends and get paid on every bet placed:
              </p>

              {/* Tier Badges Row */}
              <div className="grid grid-cols-3 gap-2 py-1 max-w-md">
                <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-[#00E5A0]/40 text-center shadow-[0_0_12px_rgba(0,229,160,0.15)] hover:border-[#00E5A0]/60 transition-colors">
                  <p className="text-[10px] text-[#7285AE] font-bold uppercase">Level 1</p>
                  <p className="text-sm sm:text-base font-black text-[#00E5A0] drop-shadow-[0_0_8px_rgba(0,229,160,0.4)]">3% Bonus</p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-[#00D9FF]/40 text-center shadow-[0_0_12px_rgba(0,217,255,0.15)] hover:border-[#00D9FF]/60 transition-colors">
                  <p className="text-[10px] text-[#7285AE] font-bold uppercase">Level 2</p>
                  <p className="text-sm sm:text-base font-black text-[#00D9FF] drop-shadow-[0_0_8px_rgba(0,217,255,0.4)]">2% Bonus</p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-[#287BFF]/40 text-center shadow-[0_0_12px_rgba(40,123,255,0.15)] hover:border-[#287BFF]/60 transition-colors">
                  <p className="text-[10px] text-[#7285AE] font-bold uppercase">Level 3</p>
                  <p className="text-sm sm:text-base font-black text-[#287BFF] drop-shadow-[0_0_8px_rgba(40,123,255,0.4)]">1% Bonus</p>
                </div>
              </div>

              {/* Action CTA */}
              <div className="pt-2 flex items-center gap-3">
                <GameHubButton variant="invite" size="lg" href="/invite" className="shadow-xl">
                  <Users className="w-4 h-4 stroke-[2.5]" />
                  Invite Now <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </GameHubButton>
              </div>
            </div>

            {/* ── Right Column: 3D Referral Illustration Showcase ── */}
            <div className="md:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full h-48 sm:h-56 md:h-64 rounded-2xl overflow-hidden border border-[#287BFF]/40 shadow-[0_0_30px_rgba(40,123,255,0.25)] group">
                <Image
                  src={GAMEHUB_ASSETS.banners.inviteFriendsBanner}
                  alt="GameHub Invite Friends 3D Illustration"
                  fill
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 40vw"
                  priority
                />
                {/* Subtle vignette border gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#090E2E]/60 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
