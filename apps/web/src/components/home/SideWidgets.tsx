'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { WalletCard } from './WalletCard';
import { GameHubButton } from '@/components/gamehub/GameHubButton';
import { GameHubIcon } from '@/components/gamehub/GameHubIcon';
import { Gift, Users, ArrowRight, Sparkles } from 'lucide-react';

interface SideWidgetsProps {
  balance: number;
}

/**
 * SideWidgets — handles side cards for Desktop (Wallet + Daily Bonus + Refer & Earn)
 * and Mobile (Wallet + Welcome Bonus Card).
 */
export function SideWidgets({ balance }: SideWidgetsProps) {
  return (
    <div className="space-y-4">
      {/* 1. Total Balance Card (Mobile & Desktop) */}
      <WalletCard balance={balance} />

      {/* 2. Welcome Bonus Card (Mobile View < lg) */}
      <div className="block lg:hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-[20px] overflow-hidden p-4 bg-gradient-to-r from-[#1B0D45] via-[#2D1580] to-[#1B0D45] border border-[#FF3FA4]/40 shadow-[0_0_24px_rgba(255,63,164,0.25)] before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-[#FF3FA4]/60 before:to-transparent before:z-10"
        >
          <div className="absolute -top-6 -right-6 w-28 h-28 bg-[#FF3FA4]/25 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#FF3FA4]/25 border border-[#FF3FA4]/50 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(255,63,164,0.45)]">
                <GameHubIcon name="gift" size={24} isActive activeColor="#FFC928" glow />
              </div>
              <div>
                <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-[#FF3FA4] to-[#873BFF] text-white uppercase tracking-wider mb-0.5 shadow-sm shadow-[#FF3FA4]/30">
                  100% WELCOME BONUS
                </span>
                <h4 className="text-xs font-black text-white leading-tight drop-shadow">
                  Double your wallet balance on your first deposit!
                </h4>
              </div>
            </div>
            <GameHubButton variant="claim" size="sm" href="/deposit" className="shrink-0 text-xs px-3 py-2 shadow-[0_0_14px_rgba(255,63,164,0.35)]">
              Claim Now <ArrowRight className="w-3 h-3 stroke-[3]" />
            </GameHubButton>
          </div>
        </motion.div>
      </div>

      {/* 3. Daily Bonus & Refer Cards (Desktop View >= lg) */}
      <div className="hidden lg:block space-y-4">
        {/* Daily Bonus */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative rounded-[20px] overflow-hidden p-4 bg-gradient-to-r from-[#1B0D45] via-[#26105A] to-[#101C3E] border border-[#873BFF]/45 shadow-[0_0_24px_rgba(135,59,255,0.22)] before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-[#873BFF]/60 before:to-transparent before:z-10 group"
        >
          <div className="absolute -top-6 -right-6 w-28 h-28 bg-[#873BFF]/25 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#873BFF]/25 border border-[#873BFF]/50 flex items-center justify-center shadow-[0_0_14px_rgba(135,59,255,0.45)]">
                <GameHubIcon name="gift" size={24} isActive activeColor="#FFC928" glow />
              </div>
              <div>
                <h4 className="text-sm font-black text-white leading-tight">Daily Bonus</h4>
                <p className="text-[11px] text-[#A8B9DE] font-medium">Claim your free daily spins</p>
              </div>
            </div>
            <GameHubButton variant="claim" size="sm" href="/checkin" className="shrink-0 text-xs shadow-[0_0_14px_rgba(255,63,164,0.35)]">
              Claim Now <ArrowRight className="w-3 h-3 stroke-[3]" />
            </GameHubButton>
          </div>
        </motion.div>

        {/* Refer & Earn */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="relative rounded-[20px] overflow-hidden p-4 bg-gradient-to-r from-[#0B1735] via-[#0F2450] to-[#101C3E] border border-[#287BFF]/40 shadow-[0_0_24px_rgba(40,123,255,0.22)] before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-[#00D9FF]/50 before:to-transparent before:z-10 group"
        >
          <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-[#00D9FF]/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#287BFF]/25 border border-[#287BFF]/50 flex items-center justify-center shadow-[0_0_14px_rgba(40,123,255,0.45)]">
                <Users className="w-5 h-5 text-[#00D9FF]" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h4 className="text-sm font-black text-white leading-tight">Refer &amp; Earn</h4>
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#00E5A0]/20 text-[#00E5A0] border border-[#00E5A0]/40 shadow-[0_0_8px_rgba(0,229,160,0.3)]">
                    5%
                  </span>
                </div>
                <p className="text-[11px] text-[#A8B9DE] font-medium">Get 5% Commission on bets!</p>
              </div>
            </div>
            <GameHubButton variant="primary" size="sm" href="/invite" className="shrink-0 text-xs shadow-[0_0_14px_rgba(0,217,255,0.35)]">
              Invite <ArrowRight className="w-3 h-3 stroke-[3]" />
            </GameHubButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
