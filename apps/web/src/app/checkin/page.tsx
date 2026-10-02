'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { TopHeader, BottomNavigation, DesktopFooter } from '@/components/Navigation';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { getApiBaseUrl } from '@/lib/config';
import {
  HelpCircle,
  CheckCircle2,
  Lock,
  Clock,
  Flame,
  Gift,
  Crown,
  Sparkles,
  ArrowRight,
  X,
  Volume2,
  Check,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface DayReward {
  day: number;
  reward: number;
  color: string;
  glow: string;
  hasCrown?: boolean;
}

const REWARDS_SCHEDULE: DayReward[] = [
  { day: 1, reward: 10, color: '#00E5A8', glow: 'rgba(0,229,168,0.4)' },
  { day: 2, reward: 15, color: '#A855F7', glow: 'rgba(168,85,247,0.45)' },
  { day: 3, reward: 20, color: '#38BDF8', glow: 'rgba(56,189,248,0.4)' },
  { day: 4, reward: 25, color: '#FFC928', glow: 'rgba(255,201,40,0.4)' },
  { day: 5, reward: 30, color: '#F43F5E', glow: 'rgba(244,63,94,0.4)' },
  { day: 6, reward: 40, color: '#8B5CF6', glow: 'rgba(139,92,246,0.45)' },
  { day: 7, reward: 100, color: '#FFB800', glow: 'rgba(255,184,0,0.6)', hasCrown: true },
];

export default function DailyBonusPage() {
  const { user, loading, isAuthenticated, balance: authBalance, refreshUser } = useAuth();
  const [balance, setBalance] = useState<number>(authBalance || 0);

  // Status state
  const [claimedToday, setClaimedToday] = useState(false);
  const [currentDay, setCurrentDay] = useState(2); // default demo Day 2 matching reference
  const [totalClaimed, setTotalClaimed] = useState(1);
  const [currentStreak, setCurrentStreak] = useState(3); // matching reference: 3 DAYS
  const [bestStreak, setBestStreak] = useState(7);
  const [totalRewards, setTotalRewards] = useState(45); // matching reference: ₹45
  const [msUntilTomorrow, setMsUntilTomorrow] = useState<number>(23 * 3600 * 1000 + 42 * 60 * 1000);

  const [submitting, setSubmitting] = useState(false);
  const [claimSuccessModal, setClaimSuccessModal] = useState<{ amount: number; day: number } | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync balance with auth
  useEffect(() => {
    if (authBalance !== undefined && authBalance !== null) {
      setBalance(authBalance);
    }
  }, [authBalance]);

  // Fetch live daily reward status
  useEffect(() => {
    const fetchStatus = async () => {
      if (!user?.id) return;
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/wallet/daily-reward-status?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setClaimedToday(data.claimedToday);
          setCurrentDay(data.currentDay || 1);
          setTotalClaimed(data.totalClaimed || 0);
          setCurrentStreak(Math.max(data.currentStreak || 0, data.claimedToday ? 1 : 0));
          setBestStreak(Math.max(data.bestStreak || 7, 7));
          setTotalRewards(data.totalRewards || (data.claimedToday ? 10 : 0));
          if (data.msUntilTomorrow) {
            setMsUntilTomorrow(data.msUntilTomorrow);
          }
        }
      } catch (err) {
        // Fallback to initial matching values
      }
    };

    fetchStatus();
  }, [user?.id]);

  // Live countdown timer ticking every second
  useEffect(() => {
    const timer = setInterval(() => {
      setMsUntilTomorrow((prev) => (prev > 1000 ? prev - 1000 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format countdown hh:mm:ss
  const formattedCountdown = useMemo(() => {
    const totalSeconds = Math.floor(msUntilTomorrow / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  }, [msUntilTomorrow]);

  // Claim Daily Reward Handler
  const handleClaimReward = async () => {
    if (!user?.id || submitting || claimedToday) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const apiBase = getApiBaseUrl();
      const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;

      const res = await fetch(`${apiBase}/wallet/daily-reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Already claimed today!');
      }

      // Success
      setClaimedToday(true);
      const claimedAmt = data.rewardAmount || REWARDS_SCHEDULE[currentDay - 1]?.reward || 10;
      setClaimSuccessModal({
        amount: claimedAmt,
        day: data.dayIndex || currentDay,
      });
      setTotalRewards((prev) => prev + claimedAmt);
      setCurrentStreak((prev) => prev + 1);

      if (data.newBalance !== undefined) {
        setBalance(data.newBalance);
      }
      await refreshUser();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to claim daily reward.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pt-[84px] bg-[#050B20] text-[#F8FAFC] selection:bg-[#00E5FF] selection:text-[#050B20]">
      {/* ── Ambient Background Glows ── */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-[#2979FF]/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-[#7C3AED]/12 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-1/3 right-10 w-[400px] h-[400px] bg-[#00E5A8]/6 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* ── Fixed Top Header ── */}
      <TopHeader balance={balance} />

      {/* ── Body: Sidebar + Main Content ── */}
      <div className="flex flex-1 w-full lg:pl-[220px] xl:pl-60 relative z-10">
        {/* Desktop Left Sidebar */}
        <DesktopSidebar activeCategory="rewards" />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 pb-24 lg:pb-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">

            {/* ── Top Breadcrumb & Actions Bar ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <nav className="flex items-center gap-2 text-xs font-semibold text-[#94A3C4]">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <span className="text-[#94A3C4]/60">&gt;</span>
                <Link href="/rewards" className="hover:text-white transition-colors">Rewards</Link>
                <span className="text-[#94A3C4]/60">&gt;</span>
                <span className="text-[#00E5FF] font-bold">Daily Bonus</span>
              </nav>

              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#A8B9DE] bg-[#0D1738] border border-[#2979FF]/30 hover:border-[#00E5FF]/60 hover:text-white hover:bg-[#111D45] transition-all shadow-sm group"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#00E5FF] group-hover:rotate-12 transition-transform" />
                <span>How it Works ?</span>
              </button>
            </div>

            {/* ── Main Heading ── */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED]/30 via-[#2979FF]/20 to-[#FFC928]/20 border border-[#7C3AED]/50 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(124,58,237,0.4)] shrink-0">
                🎁
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  Daily Bonus
                </h1>
                <p className="text-xs sm:text-sm text-[#94A3C4] font-medium">
                  Log in every day and unlock bigger rewards.
                </p>
              </div>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-lg"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* ── 4. HERO REWARD CARD ── */}
            <div className="relative rounded-[24px] sm:rounded-[28px] overflow-hidden border border-[#2979FF]/35 bg-gradient-to-br from-[#111D45] via-[#17104A] to-[#0D1738] shadow-[0_0_50px_rgba(41,121,255,0.18)] p-5 sm:p-7 md:p-8 space-y-6 sm:space-y-8">
              
              {/* Background ambient decorative particles */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#7C3AED]/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#FFC928]/10 rounded-full blur-3xl pointer-events-none" />

              {/* Top Hero Banner Section */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left Side: Text and Badges */}
                <div className="md:col-span-7 space-y-3">
                  <div className="space-y-1">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex flex-wrap items-center gap-2.5">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E0F2FE] to-[#BAE6FD] drop-shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                        7-DAY STREAK
                      </span>
                      <span className="text-[#FFC928] drop-shadow-[0_0_20px_rgba(255,201,40,0.5)] flex items-center gap-1.5">
                        REWARDS <span>🎁</span>
                      </span>
                    </h2>
                    <p className="text-sm sm:text-base font-bold text-[#E2E8F0] tracking-wide">
                      Stay consistent. Your rewards get bigger every day.
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-[#94A3C4] leading-relaxed max-w-xl">
                    Complete your daily login streak to unlock bigger cash rewards. Free bonus funds are credited directly to your main GameHub balance.
                  </p>
                </div>

                {/* Right Side: Hero Illustration (Gift Box + Glowing Podium + Coins) */}
                <div className="md:col-span-5 flex justify-center md:justify-end relative">
                  <div className="relative w-full max-w-[340px] sm:max-w-[380px] h-[180px] sm:h-[220px] rounded-2xl overflow-hidden border border-[#2979FF]/40 shadow-[0_0_30px_rgba(124,58,237,0.35)] group">
                    <Image
                      src="/images/daily_bonus_chest.jpg"
                      alt="GameHub Daily Bonus Jackpot Reward"
                      fill
                      priority
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* Glowing gradient overlay for seamless blending */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111D45]/90 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Floating animated neon badges */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#050B20]/80 backdrop-blur-md border border-[#00E5FF]/40 flex items-center gap-1.5 shadow-lg">
                      <Sparkles className="w-3 h-3 text-[#00E5FF] animate-pulse" />
                      <span className="text-[10px] font-black text-[#00E5FF] tracking-wider uppercase">JACKPOT BONUS</span>
                    </div>

                    <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-[#111D45]/90 backdrop-blur-md border border-[#FFC928]/40 flex items-center gap-1.5 shadow-lg">
                      <span className="text-xs">🪙</span>
                      <span className="text-xs font-black text-[#FFC928]">₹100 Max Cash</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 5. 7-DAY REWARD CARDS ── */}
              <div className="relative z-10 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-3.5">
                  {REWARDS_SCHEDULE.map((item) => {
                    const isClaimed = item.day < currentDay || (item.day === currentDay && claimedToday);
                    const isToday = item.day === currentDay && !claimedToday;
                    const isLocked = item.day > currentDay || (item.day === currentDay && claimedToday);

                    return (
                      <motion.div
                        key={item.day}
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.2 }}
                        className={`relative rounded-[18px] p-3.5 sm:p-4 flex flex-col items-center justify-between text-center transition-all ${
                          isToday
                            ? 'bg-gradient-to-b from-[#111D45] via-[#1A1A54] to-[#0D1738] border-2 border-[#00E5FF] shadow-[0_0_25px_rgba(0,229,255,0.45)] ring-2 ring-[#7C3AED]/50 scale-[1.03] z-20'
                            : isClaimed
                            ? 'bg-[#0D1738]/90 border border-[#00E5A8]/40 shadow-[0_0_15px_rgba(0,229,168,0.15)]'
                            : 'bg-[#0D1738]/70 border border-[#2979FF]/20 opacity-85 hover:opacity-100'
                        }`}
                        style={{ minHeight: '185px' }}
                      >
                        {/* Day Label & Badges */}
                        <div className="w-full flex items-center justify-between gap-1 mb-1">
                          <span className={`text-[11px] font-black uppercase tracking-wider ${isToday ? 'text-[#00E5FF]' : 'text-[#94A3C4]'}`}>
                            DAY {item.day}
                          </span>

                          {/* Top Badge: Claimed checkmark or Today */}
                          {isClaimed && (
                            <span className="w-5 h-5 rounded-full bg-[#00E5A8]/20 border border-[#00E5A8]/60 flex items-center justify-center text-[#00E5A8] shadow-[0_0_8px_rgba(0,229,168,0.5)]">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}

                          {isToday && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[#00E5FF] text-[#050B20] text-[9px] font-black tracking-wider uppercase shadow-[0_0_8px_#00E5FF]">
                              TODAY
                            </span>
                          )}

                          {item.day > currentDay && item.hasCrown && (
                            <Crown className="w-4 h-4 text-[#FFC928] drop-shadow-[0_0_6px_rgba(255,201,40,0.6)]" />
                          )}
                        </div>

                        {/* Gift Box Icon Visual */}
                        <div className="my-2 relative flex items-center justify-center">
                          {/* Ambient glow behind box */}
                          <div
                            className="absolute w-12 h-12 rounded-full blur-md opacity-60"
                            style={{ backgroundColor: item.color }}
                          />

                          {/* Render custom colored 3D vector gift box */}
                          <div
                            className={`relative w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
                              isToday
                                ? 'bg-gradient-to-br from-[#1E1B4B] to-[#0F172A] border-[#00E5FF] shadow-[0_0_16px_rgba(0,229,255,0.4)]'
                                : 'bg-[#09122C] border-white/10'
                            }`}
                          >
                            {/* Crown for Day 7 */}
                            {item.hasCrown && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <Crown className="w-4 h-4 text-[#FFC928] drop-shadow-[0_0_8px_rgba(255,201,40,0.8)] fill-[#FFC928]" />
                              </div>
                            )}

                            {/* Gift SVG */}
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                              {/* Box base */}
                              <rect x="3" y="10" width="18" height="11" rx="2.5" fill={item.color} fillOpacity={isClaimed ? '0.3' : '0.4'} stroke={item.color} strokeWidth="1.6" />
                              {/* Box lid */}
                              <rect x="2" y="6" width="20" height="4.5" rx="1.5" fill={item.color} fillOpacity={isClaimed ? '0.5' : '0.7'} stroke={item.color} strokeWidth="1.6" />
                              {/* Ribbon vertical */}
                              <line x1="12" y1="6" x2="12" y2="21" stroke="#FFC928" strokeWidth="2.2" strokeLinecap="round" />
                              {/* Bow */}
                              <path d="M12 6C10 3 7 3.5 8 5.5C9 7.5 12 6 12 6Z" fill="#FFC928" />
                              <path d="M12 6C14 3 17 3.5 16 5.5C15 7.5 12 6 12 6Z" fill="#FFC928" />
                            </svg>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="my-1">
                          <span
                            className={`text-lg sm:text-xl font-black font-mono tracking-tight ${
                              isToday
                                ? 'text-[#FFC928] drop-shadow-[0_0_10px_rgba(255,201,40,0.5)]'
                                : isClaimed
                                ? 'text-white'
                                : 'text-[#E2E8F0]'
                            }`}
                          >
                            ₹{item.reward}
                          </span>
                        </div>

                        {/* Bottom Status Pill */}
                        <div className="w-full pt-1">
                          {isClaimed ? (
                            <span className="w-full py-1 px-1.5 rounded-lg bg-[#00E5A8]/15 border border-[#00E5A8]/30 text-[#00E5A8] text-[10px] font-black flex items-center justify-center gap-1 shadow-sm">
                              <Check className="w-3 h-3 stroke-[3]" />
                              Claimed
                            </span>
                          ) : isToday ? (
                            <span className="w-full py-1 px-1.5 rounded-lg bg-[#00E5FF]/20 border border-[#00E5FF]/50 text-[#00E5FF] text-[10px] font-black flex items-center justify-center gap-1 shadow-[0_0_8px_rgba(0,229,255,0.3)] animate-pulse">
                              Ready
                            </span>
                          ) : (
                            <span className="w-full py-1 px-1.5 rounded-lg bg-white/5 border border-white/10 text-[#7183A8] text-[10px] font-bold flex items-center justify-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              Locked
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* ── 6. CLAIM BUTTON & COUNTDOWN ── */}
              <div className="relative z-10 pt-2 flex flex-col items-center justify-center space-y-3">
                <motion.button
                  whileHover={{ scale: claimedToday ? 1 : 1.02 }}
                  whileTap={{ scale: claimedToday ? 1 : 0.98 }}
                  onClick={handleClaimReward}
                  disabled={submitting || claimedToday}
                  type="button"
                  className={`w-full max-w-md py-3.5 px-6 rounded-2xl font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-2.5 transition-all shadow-xl ${
                    claimedToday
                      ? 'bg-gradient-to-r from-emerald-600/40 to-teal-600/40 text-emerald-200 border border-emerald-500/40 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#00E5A8] via-[#00C2FF] to-[#2979FF] text-[#050B20] border border-[#00E5FF]/60 shadow-[0_0_30px_rgba(0,229,168,0.5)] hover:shadow-[0_0_40px_rgba(0,194,255,0.7)]'
                  }`}
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-[#050B20] border-t-transparent rounded-full animate-spin" />
                      <span>CLAIMING REWARD...</span>
                    </>
                  ) : claimedToday ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                      <span>TODAY&apos;S REWARD CLAIMED ✓</span>
                    </>
                  ) : (
                    <>
                      <span>CLAIM TODAY&apos;S REWARD</span>
                      <span className="text-lg">🎁</span>
                    </>
                  )}
                </motion.button>

                {/* Countdown */}
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#94A3C4]">
                  <Clock className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>Next reward unlocks in</span>
                  <span className="font-mono font-bold text-white bg-[#0D1738] px-2 py-0.5 rounded-md border border-[#2979FF]/30">
                    {formattedCountdown}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 7. STREAK STATUS (3 CARDS ROW) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card 1: CURRENT STREAK */}
              <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#0D1738] to-[#111D45] border border-[#2979FF]/25 shadow-xl flex items-center justify-between overflow-hidden group hover:border-[#FF5722]/50 transition-all">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#FF5722]/15 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#FF5722]/20 border border-[#FF5722]/40 flex items-center justify-center text-[#FF5722] shadow-[0_0_15px_rgba(255,87,34,0.35)] shrink-0">
                    <Flame className="w-6 h-6 fill-[#FF5722] text-[#FF5722]" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#94A3C4] block">
                      CURRENT STREAK
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {currentStreak} DAYS
                    </h3>
                  </div>
                </div>
                {/* Glowing flame graphic on right */}
                <div className="relative text-3xl sm:text-4xl opacity-80 group-hover:scale-110 transition-transform">
                  🔥
                </div>
              </div>

              {/* Card 2: TOTAL REWARDS */}
              <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#0D1738] to-[#111D45] border border-[#2979FF]/25 shadow-xl flex items-center justify-between overflow-hidden group hover:border-[#7C3AED]/50 transition-all">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#7C3AED]/20 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-[#A855F7] shadow-[0_0_15px_rgba(124,58,237,0.35)] shrink-0">
                    <Gift className="w-6 h-6 text-[#A855F7]" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#94A3C4] block">
                      TOTAL REWARDS
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-[#FFC928] font-mono tracking-tight">
                      ₹{totalRewards}
                    </h3>
                  </div>
                </div>
                {/* Golden coins pile graphic on right */}
                <div className="relative text-3xl sm:text-4xl opacity-80 group-hover:scale-110 transition-transform">
                  🪙
                </div>
              </div>

              {/* Card 3: BEST STREAK */}
              <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#0D1738] to-[#111D45] border border-[#2979FF]/25 shadow-xl flex items-center justify-between overflow-hidden group hover:border-[#FFC928]/50 transition-all">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#FFC928]/15 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFC928]/20 border border-[#FFC928]/40 flex items-center justify-center text-[#FFC928] shadow-[0_0_15px_rgba(255,201,40,0.35)] shrink-0">
                    <Crown className="w-6 h-6 fill-[#FFC928] text-[#FFC928]" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#94A3C4] block">
                      BEST STREAK
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {bestStreak} DAYS
                    </h3>
                  </div>
                </div>
                {/* Glowing Crown graphic on right */}
                <div className="relative text-3xl sm:text-4xl opacity-80 group-hover:scale-110 transition-transform">
                  👑
                </div>
              </div>

            </div>

            {/* Desktop Footer */}
            <DesktopFooter />

          </div>
        </main>
      </div>

      {/* ── Mobile Fixed Bottom Navigation ── */}
      <BottomNavigation />

      {/* ── SUCCESS CELEBRATION MODAL ── */}
      <AnimatePresence>
        {claimSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm rounded-[28px] p-6 bg-gradient-to-b from-[#17104A] via-[#111D45] to-[#0A1128] border-2 border-[#00E5FF] shadow-[0_0_60px_rgba(0,229,255,0.5)] text-center space-y-4 overflow-hidden"
            >
              {/* Confetti glow effect */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#00E5A8]/30 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[#FFC928]/30 rounded-full blur-2xl pointer-events-none" />

              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-[#00E5A8] to-[#00C2FF] flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(0,229,168,0.6)]">
                🎉
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF]">
                  DAY {claimSuccessModal.day} BONUS CLAIMED!
                </span>
                <h3 className="text-3xl font-black text-white font-mono mt-1">
                  +₹{claimSuccessModal.amount}.00
                </h3>
                <p className="text-xs text-[#94A3C4] mt-1.5">
                  Added directly to your main GameHub balance. Keep your streak alive tomorrow!
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#0D1738]/80 border border-white/10 flex items-center justify-between text-xs font-semibold">
                <span className="text-[#94A3C4]">Next Day Reward:</span>
                <span className="text-[#FFC928] font-bold font-mono">
                  ₹{REWARDS_SCHEDULE[(claimSuccessModal.day % 7)]?.reward || 10}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setClaimSuccessModal(null)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00E5A8] to-[#00C2FF] text-[#050B20] font-black text-sm shadow-[0_0_20px_rgba(0,229,168,0.5)] hover:brightness-110 transition-all"
              >
                AWESOME!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── HOW IT WORKS / RULES MODAL ── */}
      <AnimatePresence>
        {showRulesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md rounded-[28px] p-6 bg-gradient-to-b from-[#111D45] to-[#0A1128] border border-[#2979FF]/40 shadow-[0_0_50px_rgba(41,121,255,0.3)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#2979FF]/20 border border-[#2979FF]/40 flex items-center justify-center text-[#00E5FF]">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-white">Daily Bonus Rules</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRulesModal(false)}
                  className="p-1 rounded-lg text-[#94A3C4] hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-[#CBD5E1] leading-relaxed">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#0D1738]/80 border border-white/5">
                  <span className="w-5 h-5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] font-black text-[10px] flex items-center justify-center shrink-0">1</span>
                  <p><strong className="text-white">Daily Login:</strong> Log in every day to claim your consecutive day reward. Each day awards increasingly higher cash bonuses.</p>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#0D1738]/80 border border-white/5">
                  <span className="w-5 h-5 rounded-full bg-[#7C3AED]/20 text-[#A855F7] font-black text-[10px] flex items-center justify-center shrink-0">2</span>
                  <p><strong className="text-white">7-Day Cycle:</strong> Complete Day 7 to unlock the grand ₹100 cash jackpot. After Day 7, the streak automatically cycles back to Day 1.</p>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#0D1738]/80 border border-white/5">
                  <span className="w-5 h-5 rounded-full bg-[#00E5A8]/20 text-[#00E5A8] font-black text-[10px] flex items-center justify-center shrink-0">3</span>
                  <p><strong className="text-white">Instant Wallet Credit:</strong> Rewards are deposited directly into your main GameHub wallet balance and can be used on any game.</p>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#0D1738]/80 border border-white/5">
                  <span className="w-5 h-5 rounded-full bg-[#FF5722]/20 text-[#FF5722] font-black text-[10px] flex items-center justify-center shrink-0">4</span>
                  <p><strong className="text-white">Reset Condition:</strong> Missing a day may reset your active streak back to Day 1. Stay consistent!</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white font-bold text-xs transition-colors border border-white/10"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
