'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { TopHeader, BottomNavigation } from '@/components/Navigation';
import { GameHubButton } from '@/components/gamehub/GameHubButton';
import { GameHubIcon } from '@/components/gamehub/GameHubIcon';
import { Gift, Calendar, Award, Users, Share2, ArrowRight } from 'lucide-react';

export default function RewardsHubPage() {
  const { user } = useAuth();
  const balance = user?.wallet?.mainBalance ? parseFloat(user.wallet.mainBalance) : 0;

  const tasks = [
    {
      id: 'play-5',
      title: 'Play 5 Games',
      reward: '+100 Coins',
      icon: Award,
      color: '#00E5A0',
      href: '/#games',
    },
    {
      id: 'profile',
      title: 'Complete Profile',
      reward: '+200 Coins',
      icon: Users,
      color: '#873BFF',
      href: '/profile',
    },
    {
      id: 'share',
      title: 'Share on Social Media',
      reward: '+300 Coins',
      icon: Share2,
      color: '#FF3FA4',
      href: '/invite',
    },
    {
      id: 'invite-5',
      title: 'Invite 5 Friends',
      reward: '+500 Coins',
      icon: Users,
      color: '#FFC928',
      href: '/invite',
    },
  ];

  return (
    <div className="min-h-screen bg-[#050B20] text-white pb-24 font-sans">
      <TopHeader balance={balance} />

      <main className="p-4 space-y-4 max-w-[480px] mx-auto">
        {/* ── Top Daily Check-in Banner (3rd screen in reference image) ── */}
        <div className="relative rounded-[24px] overflow-hidden p-5 bg-gradient-to-r from-[#1B0D45] via-[#26105A] to-[#101C3E] border border-[#873BFF]/40 shadow-2xl space-y-3">
          <div className="absolute -top-6 -right-6 w-28 h-28 bg-[#873BFF]/25 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black bg-[#873BFF]/20 border border-[#873BFF]/40 text-[#00D9FF] uppercase tracking-wider">
                DAILY BONUS STREAK
              </span>
              <h1 className="text-xl font-black text-white leading-tight">Daily Check-In</h1>
              <p className="text-xs text-[#B8C7E6] font-medium">Get up to 500 coins every day!</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#873BFF]/25 border border-[#873BFF]/50 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(135,59,255,0.4)]">
              <GameHubIcon name="gift" size={26} isActive activeColor="#FFC928" glow />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-white/10">
            <span className="text-xs font-bold text-[#FFC928] flex items-center gap-1">
              ⚡ Consecutive Day 1/7
            </span>
            <GameHubButton variant="claim" size="sm" href="/checkin" className="text-xs px-4 py-1.5">
              Check In <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </GameHubButton>
          </div>
        </div>

        {/* ── Reward Tasks List ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-[#00E5A0]" /> Reward Tasks
            </h2>
            <span className="text-xs text-[#7183A8] font-bold">Earn Free Coins</span>
          </div>

          <div className="space-y-2.5">
            {tasks.map((task) => {
              const IconComponent = task.icon;
              return (
                <div
                  key={task.id}
                  className="p-3.5 rounded-[18px] bg-[#091735] border border-[#287BFF]/30 flex items-center justify-between shadow-md hover:border-[#00D9FF]/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
                      style={{
                        backgroundColor: `${task.color}15`,
                        borderColor: `${task.color}40`,
                      }}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: task.color }} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white">{task.title}</h3>
                      <span className="text-[10px] font-bold text-[#00E5A0]">{task.reward}</span>
                    </div>
                  </div>

                  <Link
                    href={task.href}
                    className="px-3.5 py-1.5 rounded-full text-xs font-black bg-[#00E5A0] text-[#04101F] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_10px_rgba(0,229,160,0.3)]"
                  >
                    Go
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Bottom Referral Rewards Banner ── */}
        <div className="relative rounded-[20px] p-4 bg-gradient-to-r from-[#090E2E] via-[#0F1E4C] to-[#08132C] border border-[#287BFF]/35 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-white">Referral Rewards</h3>
            <p className="text-[11px] text-[#B8C7E6]">You get 5% commission on friends bets</p>
          </div>
          <Link
            href="/invite"
            className="px-3.5 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-[#287BFF] to-[#873BFF] text-white hover:brightness-110 transition-all shadow-md shrink-0"
          >
            Invite Now
          </Link>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
