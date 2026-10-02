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
  Gift,
  Ticket,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  HelpCircle,
  Trophy,
  Shield,
  Coins,
  Gamepad2,
  Users,
  Check,
  Lock,
  Wallet,
  X,
  ListCheck,
  ChevronRight,
  AlertCircle,
  Award,
  Zap,
  History
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  rewardAmount: number;
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

// Fallback initial tasks matching reference
const DEFAULT_TASKS: Task[] = [
  {
    id: 'welcome_reg',
    title: 'Welcome Registration Bonus',
    description: 'Complete registration and verify your account',
    rewardAmount: 1000,
    progress: 1,
    maxProgress: 1,
    isCompleted: true,
    isClaimed: true,
  },
  {
    id: 'first_deposit',
    title: 'First Deposit Bonus',
    description: 'Make your first deposit of ₹100 or more',
    rewardAmount: 50,
    progress: 0,
    maxProgress: 1,
    isCompleted: false,
    isClaimed: false,
  },
  {
    id: 'play_10_games',
    title: 'Play 10 Games',
    description: 'Play any games at least 10 times (Mines, Parity, JetX, Spin, etc.)',
    rewardAmount: 20,
    progress: 0,
    maxProgress: 10,
    isCompleted: false,
    isClaimed: false,
  },
  {
    id: 'invite_friend',
    title: 'Invite Your First Friend',
    description: 'Share your referral code and invite 1 active player',
    rewardAmount: 50,
    progress: 0,
    maxProgress: 1,
    isCompleted: false,
    isClaimed: false,
  },
];

export default function TaskRewardsPage() {
  const { user, loading, isAuthenticated, balance: authBalance, refreshUser } = useAuth();
  const [balance, setBalance] = useState<number>(authBalance || 0);

  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [fetching, setFetching] = useState<boolean>(true);
  const [couponCode, setCouponCode] = useState<string>('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingTask, setSubmittingTask] = useState<string | null>(null);
  const [submittingCoupon, setSubmittingCoupon] = useState<boolean>(false);

  // Modals
  const [successCelebration, setSuccessCelebration] = useState<{ title: string; amount: number } | null>(null);

  // Sync balance
  useEffect(() => {
    if (authBalance !== undefined && authBalance !== null) {
      setBalance(authBalance);
    }
  }, [authBalance]);

  // Load tasks from backend
  const loadTasks = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
    if (!token && !user?.id) {
      setFetching(false);
      return;
    }

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/tasks`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tasks) && data.tasks.length > 0) {
          setTasks(data.tasks);
        }
      }
    } catch {
      // Keep default tasks
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user?.id]);

  // Task claim handler
  const handleClaimTask = async (taskId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    setMsg(null);
    setSubmittingTask(taskId);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/tasks/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ taskId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to claim task.');

      setSuccessCelebration({
        title: targetTask.title,
        amount: targetTask.rewardAmount,
      });

      setMsg({ type: 'success', text: data.message || `🎉 Claimed ₹${targetTask.rewardAmount} reward!` });
      await loadTasks();
      await refreshUser();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error claiming task reward.' });
    } finally {
      setSubmittingTask(null);
    }
  };

  // Coupon redemption handler
  const handleRedeemCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
    if (!couponCode.trim()) return;

    setMsg(null);
    setSubmittingCoupon(true);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/tasks/redeem-coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: couponCode.trim().toUpperCase() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid or expired coupon code.');

      const rewardAmount = data.rewardAmount || 100;
      setSuccessCelebration({
        title: `Coupon: ${couponCode.trim().toUpperCase()}`,
        amount: rewardAmount,
      });

      setMsg({ type: 'success', text: data.message || `🎟️ Coupon applied! Added ₹${rewardAmount} to your wallet.` });
      setCouponCode('');
      await refreshUser();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to redeem coupon code.' });
    } finally {
      setSubmittingCoupon(false);
    }
  };

  // Calculated Stats
  const completedCount = useMemo(() => tasks.filter((t) => t.isClaimed || t.isCompleted).length, [tasks]);
  const totalTasks = tasks.length || 4;
  const totalEarned = useMemo(() => {
    return tasks
      .filter((t) => t.isClaimed)
      .reduce((sum, t) => sum + t.rewardAmount, 0) || 1000;
  }, [tasks]);

  return (
    <div className="flex flex-col min-h-screen pt-[84px] bg-[#050B24] text-[#F8FAFC] selection:bg-[#00E5FF] selection:text-[#050B20]">
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">

            {/* ── Top Breadcrumb ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <nav className="flex items-center gap-2 text-xs font-semibold text-[#94A3C4]">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <span className="text-[#94A3C4]/60">&gt;</span>
                <Link href="/rewards" className="hover:text-white transition-colors">Rewards</Link>
                <span className="text-[#94A3C4]/60">&gt;</span>
                <span className="text-[#00E5FF] font-bold">Task Rewards</span>
              </nav>

              <Link
                href="/checkin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#A8B9DE] bg-[#0D1738] border border-[#2979FF]/30 hover:border-[#00E5FF]/60 hover:text-white transition-all shadow-sm group"
              >
                <Gift className="w-3.5 h-3.5 text-[#FFC928] group-hover:rotate-12 transition-transform" />
                <span>Daily Bonus Streak ➔</span>
              </Link>
            </div>

            {/* ── Page Heading with Subtle Gaming Decorative Elements ── */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED]/30 via-[#2979FF]/20 to-[#FFC928]/20 border border-[#7C3AED]/50 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(124,58,237,0.4)] shrink-0">
                  🎁
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                    Task Rewards
                  </h1>
                  <p className="text-xs sm:text-sm text-[#94A3C4] font-medium">
                    Complete tasks, earn rewards, and level up your wallet.
                  </p>
                </div>
              </div>

              {/* Decorative Subtle Header Badges */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#0D1738]/80 border border-[#2979FF]/25 text-xs font-bold text-[#CBD5E1]">
                  <Gamepad2 className="w-4 h-4 text-[#00E5FF]" />
                  <span>Real Cash Tasks</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#0D1738]/80 border border-[#FFC928]/25 text-xs font-bold text-[#FFC928]">
                  <Coins className="w-4 h-4 text-[#FFC928]" />
                  <span>Instant Wallet Credit</span>
                </div>
              </div>
            </div>

            {/* Notifications Alert Banner */}
            {msg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-lg ${
                  msg.type === 'success'
                    ? 'bg-[#00E5A8]/15 border-[#00E5A8]/40 text-[#00E5A8]'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {msg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00E5A8] shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{msg.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMsg(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* ── 4. SECRET COUPON SECTION ── */}
            <div className="relative rounded-[20px] overflow-hidden p-4 sm:p-5 bg-gradient-to-r from-[#101B3D] via-[#11104A] to-[#0D1738] border border-[#2979FF]/35 shadow-[0_0_30px_rgba(41,121,255,0.15)] group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#7C3AED]/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#00E5FF]/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Coupon Info */}
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED]/30 to-[#00E5FF]/20 border border-[#00E5FF]/40 flex items-center justify-center text-xl text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.3)] shrink-0 font-black">
                    %
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                      <span>Redeem Secret Coupon</span>
                    </h2>
                    <p className="text-xs text-[#94A3C4] font-medium">
                      Enter your coupon code and unlock instant rewards.
                    </p>
                  </div>
                </div>

                {/* Form Input + Button */}
                <form onSubmit={handleRedeemCoupon} className="flex flex-col sm:flex-row items-stretch gap-2.5 w-full lg:w-auto lg:min-w-[460px]">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3C4]">
                      <Ticket className="w-4 h-4 text-[#00E5FF]" />
                    </div>
                    <input
                      type="text"
                      placeholder="ENTER COUPON CODE (E.G. BONUS100)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#08112F]/90 border border-[#2979FF]/30 text-xs sm:text-sm font-mono font-bold tracking-wider uppercase text-white placeholder-[#7183A8] focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] shadow-inner transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingCoupon}
                    className="py-3 px-6 rounded-xl bg-gradient-to-r from-[#00E5A8] to-[#00C2FF] text-[#050B20] text-xs sm:text-sm font-black tracking-wide flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,168,0.45)] hover:shadow-[0_0_25px_rgba(0,194,255,0.65)] hover:brightness-105 active:scale-95 transition-all shrink-0 disabled:opacity-50"
                  >
                    {submittingCoupon ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#050B20] border-t-transparent rounded-full animate-spin" />
                        <span>REDEEMING...</span>
                      </>
                    ) : (
                      <>
                        <span>REDEEM</span>
                        <span className="text-base">🎁</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* ── TWO-COLUMN MAIN CONTENT (Tasks Left, Summary Right) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* ── LEFT COLUMN: AVAILABLE PLAYER TASKS (col-span-8) ── */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* Section Header */}
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                      Available Player Tasks
                    </h2>
                  </div>
                  <span className="text-xs text-[#94A3C4] font-medium hidden sm:inline-block">
                    Complete these tasks to earn exciting rewards!
                  </span>
                </div>

                {/* Task Cards List */}
                <div className="space-y-3.5">
                  {tasks.map((task) => {
                    const pct = Math.min(100, Math.round((task.progress / task.maxProgress) * 100));

                    // Match task specific colors & artwork based on ID
                    const isWelcome = task.id === 'welcome_reg';
                    const isDeposit = task.id === 'first_deposit';
                    const isGames = task.id === 'play_10_games';
                    const isInvite = task.id === 'invite_friend';

                    const accentColor = isWelcome
                      ? '#00E5A8'
                      : isDeposit
                      ? '#FFC928'
                      : isGames
                      ? '#00E5FF'
                      : '#EC4899';

                    const borderClass = isWelcome
                      ? 'border-[#00E5A8]/35 hover:border-[#00E5A8]/60'
                      : isDeposit
                      ? 'border-[#FFC928]/35 hover:border-[#FFC928]/60'
                      : isGames
                      ? 'border-[#00E5FF]/35 hover:border-[#00E5FF]/60'
                      : 'border-[#EC4899]/35 hover:border-[#EC4899]/60';

                    return (
                      <motion.div
                        key={task.id}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.2 }}
                        className={`relative rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-[#0D1738] via-[#101B3D] to-[#0A132C] border ${borderClass} shadow-lg transition-all space-y-3.5 group`}
                      >
                        {/* Top row: Illustration + Details + Reward Amount */}
                        <div className="flex items-start justify-between gap-3.5 flex-wrap sm:flex-nowrap">
                          <div className="flex items-start gap-3.5 min-w-0">
                            
                            {/* Task Icon / Illustration */}
                            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 border overflow-hidden shadow-md bg-[#08112F]">
                              {isWelcome && (
                                <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#7C3AED]/40 to-[#00E5A8]/30 border-[#00E5A8]/40">
                                  <Gift className="w-6 h-6 text-[#00E5A8] drop-shadow-[0_0_8px_rgba(0,229,168,0.6)]" />
                                  <span className="absolute bottom-1 text-[8px] font-black text-[#FFC928] bg-black/60 px-1 rounded uppercase tracking-tighter">
                                    WELCOME
                                  </span>
                                </div>
                              )}

                              {isDeposit && (
                                <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1E1B4B] to-[#3B1A00] border-[#FFC928]/40">
                                  <Wallet className="w-6 h-6 text-[#FFC928] drop-shadow-[0_0_8px_rgba(255,201,40,0.6)]" />
                                  <Coins className="w-3.5 h-3.5 text-[#FFC928] absolute top-1 right-1" />
                                </div>
                              )}

                              {isGames && (
                                <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0C2A4D] to-[#1E1B4B] border-[#00E5FF]/40">
                                  <Gamepad2 className="w-6 h-6 text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
                                </div>
                              )}

                              {isInvite && (
                                <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#3B0764] to-[#1E1B4B] border-[#EC4899]/40">
                                  <Users className="w-6 h-6 text-[#EC4899] drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
                                </div>
                              )}
                            </div>

                            {/* Title & Description */}
                            <div className="space-y-1 min-w-0">
                              <h3 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
                                <span>{task.title}</span>
                              </h3>
                              <p className="text-xs text-[#94A3C4] font-medium leading-relaxed">
                                {task.description}
                              </p>
                            </div>
                          </div>

                          {/* Reward Amount Pill */}
                          <div className="shrink-0">
                            <span
                              className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-black font-mono tracking-tight flex items-center gap-1 shadow-sm ${
                                isWelcome
                                  ? 'bg-[#00E5A8]/15 border border-[#00E5A8]/50 text-[#00E5A8]'
                                  : isDeposit
                                  ? 'bg-[#FFC928]/15 border border-[#FFC928]/50 text-[#FFC928]'
                                  : isGames
                                  ? 'bg-[#00E5FF]/15 border border-[#00E5FF]/50 text-[#00E5FF]'
                                  : 'bg-[#EC4899]/15 border border-[#EC4899]/50 text-[#EC4899]'
                              }`}
                            >
                              +₹{task.rewardAmount}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar & Status Action Row */}
                        <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/5">
                          {/* Progress Meter */}
                          <div className="flex-1 space-y-1.5 min-w-[200px]">
                            <div className="flex justify-between items-center text-[11px] font-bold text-[#94A3C4]">
                              <span className="uppercase tracking-wider text-[10px]">Progress</span>
                              <span className="font-mono font-black text-white">
                                {task.progress} / {task.maxProgress}
                              </span>
                            </div>
                            <div className="w-full bg-[#08112F] rounded-full h-2 overflow-hidden border border-white/5">
                              <div
                                className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                                  task.isClaimed || task.isCompleted
                                    ? 'bg-gradient-to-r from-[#00E5A8] to-[#00C2FF]'
                                    : 'bg-gradient-to-r from-[#2979FF] to-[#00E5FF]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          {/* Status Button */}
                          <div className="shrink-0 flex justify-end">
                            {task.isClaimed ? (
                              <span className="px-4 py-1.5 rounded-xl text-xs font-black bg-[#08112F] border border-white/10 text-[#94A3C4] flex items-center gap-1.5 shadow-inner">
                                <Check className="w-3.5 h-3.5 text-[#00E5A8] stroke-[3]" />
                                CLAIMED
                              </span>
                            ) : task.isCompleted ? (
                              <button
                                type="button"
                                onClick={() => handleClaimTask(task.id)}
                                disabled={submittingTask === task.id}
                                className="px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#00E5A8] to-[#00C2FF] text-[#050B20] shadow-[0_0_15px_rgba(0,229,168,0.5)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 animate-pulse"
                              >
                                {submittingTask === task.id ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-[#050B20] border-t-transparent rounded-full animate-spin" />
                                    <span>CLAIMING...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>CLAIM REWARD</span>
                                    <span>🎁</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-[#FFC928]/10 border border-[#FFC928]/35 text-[#FFC928] flex items-center gap-1.5 shadow-sm">
                                <Clock className="w-3 h-3" />
                                IN PROGRESS
                              </span>
                            )}
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </div>

              </div>

              {/* ── RIGHT COLUMN: REWARD SUMMARY & HOW IT WORKS (col-span-4) ── */}
              <div className="lg:col-span-4 space-y-4">

                {/* 6. YOUR REWARDS CARD */}
                <div className="relative rounded-2xl p-5 bg-gradient-to-br from-[#101B3D] via-[#111D45] to-[#0D1738] border border-[#2979FF]/30 shadow-xl overflow-hidden group">
                  <div className="absolute -top-6 -right-6 w-28 h-28 bg-[#FFC928]/15 rounded-full blur-2xl pointer-events-none" />

                  {/* Header */}
                  <div className="relative z-10 flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-[#FFC928]" />
                    <h3 className="text-base font-black text-white tracking-tight">Your Rewards</h3>
                  </div>

                  {/* Total Earned + Coin Graphic */}
                  <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
                    <div>
                      <span className="text-[11px] uppercase font-black tracking-wider text-[#94A3C4] block">
                        Total Earned
                      </span>
                      <h4 className="text-3xl font-black text-white font-mono tracking-tight mt-0.5">
                        ₹{totalEarned.toLocaleString('en-IN')}
                      </h4>
                    </div>

                    {/* 3D Gold Coins Graphic */}
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-[#FFC928]/30 shadow-[0_0_15px_rgba(255,201,40,0.3)] shrink-0">
                      <Image
                        src="/images/gold_coins_stack.jpg"
                        alt="Gold Coins"
                        fill
                        className="object-cover object-center group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Mini Stat Pills */}
                  <div className="relative z-10 grid grid-cols-2 gap-2.5 mb-4">
                    <div className="p-2.5 rounded-xl bg-[#08112F]/90 border border-white/10 flex items-center gap-2">
                      <ListCheck className="w-4 h-4 text-[#00E5FF] shrink-0" />
                      <div>
                        <span className="text-[9px] font-black uppercase text-[#94A3C4] block leading-none">
                          Tasks Completed
                        </span>
                        <span className="text-xs font-black text-white font-mono mt-0.5 block">
                          {completedCount} / {totalTasks}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#08112F]/90 border border-white/10 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#FFC928] shrink-0" />
                      <div>
                        <span className="text-[9px] font-black uppercase text-[#94A3C4] block leading-none">
                          Current Level
                        </span>
                        <span className="text-xs font-black text-[#FFC928] mt-0.5 block">
                          Bronze
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Button */}
                  <Link
                    href="/rewards/history"
                    className="relative z-10 w-full py-2.5 px-4 rounded-xl bg-[#2979FF]/20 hover:bg-[#2979FF]/30 border border-[#2979FF]/40 text-xs font-bold text-[#E0F2FE] hover:text-white flex items-center justify-center gap-2 transition-all group-hover:border-[#00E5FF]/60"
                  >
                    <span>View Reward History</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#00E5FF] group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* 7. HOW IT WORKS CARD */}
                <div className="relative rounded-2xl p-5 bg-gradient-to-br from-[#0D1738] to-[#101B3D] border border-[#2979FF]/25 shadow-xl space-y-3.5">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#00E5FF]" />
                    <h3 className="text-base font-black text-white tracking-tight">How It Works?</h3>
                  </div>

                  <div className="space-y-3">
                    {/* Step 1 */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#00E5FF]/20 border border-[#00E5FF]/50 text-[#00E5FF] font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_8px_rgba(0,229,255,0.4)]">
                        1
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">Complete the tasks</h4>
                        <p className="text-[11px] text-[#94A3C4] leading-relaxed">
                          Follow the given tasks and complete them.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/50 text-[#A855F7] font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_8px_rgba(124,58,237,0.4)]">
                        2
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">Earn rewards</h4>
                        <p className="text-[11px] text-[#94A3C4] leading-relaxed">
                          Get instant rewards after completing each task.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#EC4899]/20 border border-[#EC4899]/50 text-[#EC4899] font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_8px_rgba(236,72,153,0.4)]">
                        3
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">Use in wallet</h4>
                        <p className="text-[11px] text-[#94A3C4] leading-relaxed">
                          Rewards will be added to your wallet balance instantly.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 8. BOTTOM PROMOTIONAL CARD */}
                <div className="relative rounded-2xl p-4 bg-gradient-to-r from-[#17104A] via-[#101B3D] to-[#0D1738] border border-[#7C3AED]/35 shadow-lg overflow-hidden flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FFC928]/15 border border-[#FFC928]/40 flex items-center justify-center text-[#FFC928] text-lg shrink-0">
                      🏆
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white leading-tight">
                        More Rewards Coming Soon!
                      </h4>
                      <p className="text-[10px] text-[#94A3C4] mt-0.5">
                        Play more, complete more tasks, and earn bigger rewards.
                      </p>
                    </div>
                  </div>
                  <Gamepad2 className="w-6 h-6 text-[#7C3AED] opacity-60 group-hover:scale-110 transition-transform shrink-0" />
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
        {successCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm rounded-[28px] p-6 bg-gradient-to-b from-[#17104A] via-[#111D45] to-[#0A1128] border-2 border-[#00E5FF] shadow-[0_0_60px_rgba(0,229,255,0.5)] text-center space-y-4 overflow-hidden"
            >
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-[#00E5A8] to-[#00C2FF] flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(0,229,168,0.6)]">
                🎉
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF]">
                  REWARD CLAIMED!
                </span>
                <h3 className="text-3xl font-black text-white font-mono mt-1">
                  +₹{successCelebration.amount}.00
                </h3>
                <p className="text-xs text-[#94A3C4] mt-1.5">
                  {successCelebration.title} — credited directly to your GameHub wallet balance.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSuccessCelebration(null)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00E5A8] to-[#00C2FF] text-[#050B20] font-black text-sm shadow-[0_0_20px_rgba(0,229,168,0.5)] hover:brightness-110 transition-all"
              >
                COLLECT REWARD
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
