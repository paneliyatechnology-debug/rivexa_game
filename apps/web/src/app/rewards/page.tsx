'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { TopHeader, BottomNavigation, DesktopFooter } from '@/components/Navigation';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { GameHubButton } from '@/components/gamehub/GameHubButton';
import { GameHubIcon } from '@/components/gamehub/GameHubIcon';
import {
  Gift,
  Calendar,
  Award,
  Users,
  Share2,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Trophy,
  ChevronRight,
  Flame,
} from 'lucide-react';

export default function RewardsHubPage() {
  const { user } = useAuth();
  const balance = user?.wallet?.mainBalance ? parseFloat(user.wallet.mainBalance) : 0;

  const tasks = [
    {
      id: 'play-5',
      title: 'Play 5 Games',
      desc: 'Play any 5 rounds in Crash, Mines or Penalty',
      reward: '+100 Coins',
      icon: Award,
      color: '#00E5A0',
      badge: 'POPULAR',
      href: '/#games',
    },
    {
      id: 'profile',
      title: 'Complete Profile',
      desc: 'Verify phone number & set your username',
      reward: '+200 Coins',
      icon: Users,
      color: '#873BFF',
      badge: 'ONETIME',
      href: '/profile',
    },
    {
      id: 'share',
      title: 'Share on Social Media',
      desc: 'Share GameHub on WhatsApp or Telegram',
      reward: '+300 Coins',
      icon: Share2,
      color: '#FF3FA4',
      badge: 'EASY',
      href: '/invite',
    },
    {
      id: 'invite-5',
      title: 'Invite 5 Friends',
      desc: 'Get friends to register & start betting',
      reward: '+500 Coins',
      icon: Users,
      color: '#FFC928',
      badge: 'HIGH REWARD',
      href: '/invite',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen pt-[84px] bg-[#050B20] text-[#F8FAFC] relative overflow-x-hidden font-sans">
      {/* ── Ambient Background Neon Glows ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-24 left-1/4 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-gradient-to-br from-[#873BFF]/20 via-[#287BFF]/15 to-transparent rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '7s' }} />
        <div className="absolute top-[35%] -right-20 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-gradient-to-bl from-[#FF3FA4]/18 via-[#873BFF]/15 to-transparent rounded-full blur-[130px]" />
        <div className="absolute -bottom-20 left-10 w-[320px] sm:w-[550px] h-[320px] sm:h-[550px] bg-gradient-to-tr from-[#00E5A0]/16 via-[#00D9FF]/12 to-transparent rounded-full blur-[140px]" />
      </div>

      {/* ── Fixed Top Header ── */}
      <TopHeader balance={balance} />

      {/* ── Body: Sidebar + Main Content ── */}
      <div className="flex flex-1 w-full lg:pl-[220px] xl:pl-60 relative z-10">
        {/* Desktop Left Sidebar (Only visible on lg+) */}
        <DesktopSidebar activeCategory="rewards" />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 pb-24 lg:pb-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
            {/* ── Breadcrumb & Top Bar ── */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <nav className="flex items-center gap-2 text-xs font-semibold text-[#8EA3D0]">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <ChevronRight className="w-3.5 h-3.5 text-[#5A709E]" />
                <span className="text-white font-bold">Rewards &amp; Daily Tasks</span>
              </nav>

              <div className="flex items-center gap-2">
                <Link
                  href="/rewards/history"
                  className="text-xs font-bold text-[#00D9FF] hover:text-white transition-colors flex items-center gap-1 bg-[#102450]/60 border border-[#00D9FF]/30 px-3 py-1 rounded-full shadow-sm"
                >
                  <Trophy className="w-3.5 h-3.5 text-[#FFC928]" />
                  <span>Reward History</span>
                </Link>
              </div>
            </div>

            {/* ── Daily Check-In Hero Card with High-Voltage Glow ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative rounded-[24px] overflow-hidden p-5 sm:p-7 bg-gradient-to-r from-[#170B3B] via-[#241054] to-[#0E1A3D] border border-[#873BFF]/45 shadow-[0_0_35px_rgba(135,59,255,0.25)] before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-[#873BFF]/70 before:to-transparent before:z-10"
            >
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-[#FF3FA4]/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 left-1/3 w-40 h-40 bg-[#00D9FF]/15 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-[#873BFF]/30 border border-[#873BFF]/50 text-[#00D9FF] uppercase tracking-wider shadow-sm">
                      <Sparkles className="w-3 h-3 text-[#FFC928]" />
                      DAILY BONUS STREAK
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                      <Flame className="w-3 h-3 text-amber-400" /> Day 1 / 7
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow">
                    Daily Check-In &amp; Spin Rewards
                  </h1>
                  <p className="text-xs sm:text-sm text-[#B8C7E6] font-medium max-w-xl">
                    Claim free coins every day. Complete 7 consecutive days to unlock the mega jackpot mystery box!
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#873BFF]/25 border border-[#873BFF]/50 flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(135,59,255,0.45)] group">
                    <GameHubIcon name="gift" size={32} isActive activeColor="#FFC928" glow />
                  </div>
                  <GameHubButton variant="claim" size="lg" href="/checkin" className="text-xs sm:text-sm px-6 py-3 shadow-[0_0_20px_rgba(255,63,164,0.4)]">
                    Check In Now <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </GameHubButton>
                </div>
              </div>

              {/* 7-Day Mini Progression Pills */}
              <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-7 gap-1.5 sm:gap-2">
                {[
                  { day: 'D1', reward: '10', active: true },
                  { day: 'D2', reward: '20', active: false },
                  { day: 'D3', reward: '50', active: false },
                  { day: 'D4', reward: '100', active: false },
                  { day: 'D5', reward: '150', active: false },
                  { day: 'D6', reward: '250', active: false },
                  { day: 'D7', reward: '500 🎁', active: false },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl py-2 px-1 text-center transition-all border ${
                      item.active
                        ? 'bg-[#00E5A0]/20 border-[#00E5A0]/50 shadow-[0_0_12px_rgba(0,229,160,0.3)]'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-[#8EA3D0] block">{item.day}</span>
                    <span className={`text-[11px] sm:text-xs font-black ${item.active ? 'text-[#00E5A0]' : 'text-white'}`}>
                      {item.reward}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── Reward Tasks Section ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#00E5A0]/15 border border-[#00E5A0]/30 flex items-center justify-center">
                    <Award className="w-4 h-4 text-[#00E5A0]" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white">Reward Tasks</h2>
                    <p className="text-xs text-[#8EA3D0]">Complete simple platform activities to earn instant coins</p>
                  </div>
                </div>

                <Link
                  href="/tasks"
                  className="text-xs text-[#00D9FF] hover:text-white font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#102450]/50 border border-[#00D9FF]/30 transition-all hover:shadow-[0_0_12px_rgba(0,217,255,0.3)]"
                >
                  <span>View All Tasks</span>
                  <ArrowRight className="w-3 h-3 stroke-[3]" />
                </Link>
              </div>

              {/* Tasks Grid: 1 col on mobile, 2 cols on tablet/desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {tasks.map((task, i) => {
                  const IconComponent = task.icon;
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.35 }}
                      className="p-4 sm:p-5 rounded-[20px] bg-gradient-to-br from-[#0A1635] via-[#0D1D45] to-[#07122E] border border-[#287BFF]/30 hover:border-[#00D9FF]/60 flex items-center justify-between gap-4 shadow-lg hover:shadow-[0_0_24px_rgba(0,217,255,0.2)] transition-all group relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 shadow-md"
                          style={{
                            backgroundColor: `${task.color}18`,
                            borderColor: `${task.color}50`,
                            boxShadow: `0 0 16px ${task.color}30`,
                          }}
                        >
                          <IconComponent className="w-6 h-6" style={{ color: task.color }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-sm font-black text-white truncate">{task.title}</h3>
                            <span
                              className="text-[9px] font-black px-1.5 py-0.2 rounded uppercase shrink-0 border"
                              style={{
                                color: task.color,
                                backgroundColor: `${task.color}15`,
                                borderColor: `${task.color}35`,
                              }}
                            >
                              {task.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8EA3D0] truncate max-w-[200px] sm:max-w-xs">{task.desc}</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-[#00E5A0]" />
                            <span className="text-xs font-black text-[#00E5A0] drop-shadow-[0_0_6px_rgba(0,229,160,0.4)]">
                              {task.reward}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Link
                        href={task.href}
                        className="px-4 py-2 rounded-full text-xs font-black bg-gradient-to-r from-[#00E5A0] to-[#00C7A0] text-[#06152C] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(0,229,160,0.35)] shrink-0 flex items-center gap-1"
                      >
                        Go <ArrowRight className="w-3 h-3 stroke-[3]" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* ── Referral & Lifetime Commission Card ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="relative rounded-[22px] overflow-hidden p-5 sm:p-6 bg-gradient-to-r from-[#090E2E] via-[#0F1E4C] to-[#08132C] border border-[#287BFF]/40 shadow-[0_0_30px_rgba(40,123,255,0.2)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-[#00D9FF]/50 before:to-transparent"
            >
              <div className="space-y-1.5 max-w-xl">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black bg-[#00E5A0]/20 border border-[#00E5A0]/40 text-[#00E5A0] uppercase tracking-wider">
                  REFERRAL COMMISSION
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Earn Up to 5% Lifetime Commission on Friend Bets
                </h3>
                <p className="text-xs text-[#A8B9DE]">
                  Invite your gaming circle. Every time they place a bet or win, you get credited real balance automatically.
                </p>
              </div>

              <Link
                href="/invite"
                className="px-5 py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-[#287BFF] via-[#5244E0] to-[#873BFF] text-white hover:brightness-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(135,59,255,0.4)] shrink-0 flex items-center gap-2 border border-white/20"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Invite Friends</span>
                <ArrowRight className="w-3 h-3 stroke-[3]" />
              </Link>
            </motion.div>

            {/* Desktop Footer */}
            <DesktopFooter />
          </div>
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
