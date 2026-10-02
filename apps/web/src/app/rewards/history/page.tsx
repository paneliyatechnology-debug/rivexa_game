'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { TopHeader, BottomNavigation, DesktopFooter } from '@/components/Navigation';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { getApiBaseUrl } from '@/lib/config';
import {
  Trophy,
  ArrowLeft,
  Search,
  RotateCcw,
  Gift,
  Coins,
  Wallet,
  Gamepad2,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ListCheck,
  Sparkles,
  X,
  Tag,
  Check,
  Flame,
  Loader2,
  Zap,
} from 'lucide-react';

export type RewardType = 'Task Reward' | 'Daily Bonus' | 'Deposit Bonus' | 'Referral Bonus' | 'Promotional';
export type RewardStatus = 'Claimed' | 'Pending' | 'Expired' | 'Failed';

export interface RewardRecord {
  id: string;
  transactionId: string;
  name: string;
  description: string;
  type: RewardType;
  amount: number;
  status: RewardStatus;
  date: string;
  time: string;
  rawDate: string;
  iconType: 'gift' | 'wallet' | 'game' | 'referral' | 'trophy' | 'promo' | 'flame';
}

interface SummaryMetrics {
  totalEarned: number;
  taskRewards: number;
  bonusRewards: number;
  claimedCount: number;
}

export default function RewardHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated, balance: authBalance } = useAuth();
  const [balance, setBalance] = useState<number>(authBalance || 0);

  // Live dynamic rewards list from backend (NO static dummy data)
  const [allRewards, setAllRewards] = useState<RewardRecord[]>([]);
  const [fetching, setFetching] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Summary Metrics
  const [summaryData, setSummaryData] = useState<SummaryMetrics>({
    totalEarned: 0,
    taskRewards: 0,
    bonusRewards: 0,
    claimedCount: 0,
  });

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('All');
  const [customDate, setCustomDate] = useState<string>('');

  // Pagination state (10 per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Selected Detail Modal
  const [selectedReward, setSelectedReward] = useState<RewardRecord | null>(null);

  // Sync balance
  useEffect(() => {
    if (authBalance !== undefined && authBalance !== null) {
      setBalance(authBalance);
    }
  }, [authBalance]);

  // Fetch 100% LIVE, user-specific rewards history from the API
  useEffect(() => {
    const fetchLiveUserRewards = async () => {
      if (authLoading) return;

      const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
      const targetUserId = user?.id || (token ? 'me' : null);

      if (!targetUserId) {
        setFetching(false);
        setAllRewards([]);
        return;
      }

      setFetching(true);
      setErrorMsg(null);

      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/wallet/rewards-history?userId=${user?.id || ''}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.records)) {
            setAllRewards(data.records);

            if (data.summary) {
              setSummaryData(data.summary);
            } else {
              const claimed = data.records.filter((r: RewardRecord) => r.status === 'Claimed');
              setSummaryData({
                totalEarned: claimed.reduce((sum: number, r: RewardRecord) => sum + r.amount, 0),
                taskRewards: claimed
                  .filter((r: RewardRecord) => r.type === 'Task Reward')
                  .reduce((sum: number, r: RewardRecord) => sum + r.amount, 0),
                bonusRewards: claimed
                  .filter((r: RewardRecord) => r.type === 'Daily Bonus' || r.type === 'Deposit Bonus' || r.type === 'Promotional')
                  .reduce((sum: number, r: RewardRecord) => sum + r.amount, 0),
                claimedCount: claimed.length,
              });
            }
          } else {
            setAllRewards([]);
          }
        } else {
          setErrorMsg('Failed to load user rewards history.');
          setAllRewards([]);
        }
      } catch (err: any) {
        setErrorMsg('Network error while connecting to rewards service.');
        setAllRewards([]);
      } finally {
        setFetching(false);
      }
    };

    fetchLiveUserRewards();
  }, [user?.id, authLoading]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('All');
    setStatusFilter('All');
    setDateFilter('All');
    setCustomDate('');
    setCurrentPage(1);
  };

  // Filtered live rewards
  const filteredRewards = useMemo(() => {
    return allRewards.filter((item) => {
      // Search query (name, description, transactionId, type)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.transactionId.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Type filter
      if (typeFilter !== 'All' && item.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'All' && item.status !== statusFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'All') {
        const now = new Date();
        const itemDate = new Date(item.rawDate);
        if (dateFilter === 'Today') {
          if (itemDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'This Week') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          if (itemDate < oneWeekAgo) return false;
        } else if (dateFilter === 'This Month') {
          if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (dateFilter === 'Custom Date' && customDate) {
          const itemDateStr = itemDate.toISOString().split('T')[0];
          if (itemDateStr !== customDate) return false;
        }
      }

      return true;
    });
  }, [allRewards, searchQuery, typeFilter, statusFilter, dateFilter, customDate]);

  // Live Summary Metrics
  const summaryMetrics = useMemo(() => {
    if (summaryData.totalEarned > 0 || allRewards.length > 0) {
      const claimed = allRewards.filter((r) => r.status === 'Claimed');
      return {
        totalEarned: claimed.reduce((sum, r) => sum + r.amount, 0),
        taskRewards: claimed
          .filter((r) => r.type === 'Task Reward')
          .reduce((sum, r) => sum + r.amount, 0),
        bonusRewards: claimed
          .filter((r) => r.type === 'Daily Bonus' || r.type === 'Deposit Bonus' || r.type === 'Promotional')
          .reduce((sum, r) => sum + r.amount, 0),
        claimedCount: claimed.length,
      };
    }
    return summaryData;
  }, [allRewards, summaryData]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRewards.length / itemsPerPage) || 1;
  const paginatedRewards = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRewards.slice(start, start + itemsPerPage);
  }, [filteredRewards, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Helper icon renderer with individual neon drop-shadows
  const renderRewardIcon = (iconType: string) => {
    switch (iconType) {
      case 'wallet':
        return <Wallet className="w-5 h-5 text-[#FFC928] drop-shadow-[0_0_8px_rgba(255,201,40,0.65)]" />;
      case 'game':
        return <Gamepad2 className="w-5 h-5 text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.7)]" />;
      case 'referral':
        return <Users className="w-5 h-5 text-[#EC4899] drop-shadow-[0_0_8px_rgba(236,72,153,0.7)]" />;
      case 'trophy':
        return <Trophy className="w-5 h-5 text-[#FFC928] drop-shadow-[0_0_8px_rgba(255,201,40,0.65)]" />;
      case 'promo':
        return <Tag className="w-5 h-5 text-[#A855F7] drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]" />;
      case 'flame':
        return <Flame className="w-5 h-5 text-[#FF7A00] drop-shadow-[0_0_8px_rgba(255,122,0,0.75)]" />;
      default:
        return <Gift className="w-5 h-5 text-[#00E5A8] drop-shadow-[0_0_8px_rgba(0,229,168,0.7)]" />;
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen pt-[84px] bg-[#050B24] text-[#F8FAFC] selection:bg-[#00E5FF] selection:text-[#050B20] overflow-x-hidden">
      
      {/* ── 🌟 DYNAMIC MULTI-LAYER LIGHTING & CYBER GLOW SYSTEM ── */}
      
      {/* 1. Top Radiant Overhead Spotlight */}
      <div className="fixed top-0 left-0 right-0 h-[480px] bg-[radial-gradient(ellipse_100%_65%_at_50%_-15%,rgba(0,229,255,0.22),rgba(124,58,237,0.18),transparent)] pointer-events-none z-0" />

      {/* 2. Top-Left Electric Cyan Light Flare */}
      <div className="fixed top-12 left-1/4 -translate-x-1/2 w-[650px] h-[550px] bg-[#00E5FF]/18 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* 3. Deep Cyber Purple Shimmer behind Main Content */}
      <div className="fixed top-36 right-16 w-[700px] h-[650px] bg-[#7C3AED]/20 rounded-full blur-[160px] pointer-events-none z-0" />

      {/* 4. Golden Treasure Warmth behind Summary Cards */}
      <div className="absolute top-28 left-1/3 w-[550px] h-[350px] bg-[#FFC928]/12 rounded-full blur-[130px] pointer-events-none z-0" />

      {/* 5. Emerald Green Bottom Accent Glow */}
      <div className="fixed bottom-10 left-1/3 w-[500px] h-[500px] bg-[#00E5A8]/12 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* 6. Subtle Cyber Space Grid Pattern with Radial Falloff */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(41,121,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(41,121,255,0.06)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_15%,#000_65%,transparent_100%)] pointer-events-none z-0" />

      {/* ── Fixed Top Header ── */}
      <TopHeader balance={balance} />

      {/* ── Body: Sidebar + Main Content ── */}
      <div className="flex flex-1 w-full lg:pl-[220px] xl:pl-60 relative z-10">
        {/* Desktop Left Sidebar */}
        <DesktopSidebar activeCategory="rewards" />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 pb-24 lg:pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">

            {/* ── PAGE HEADER: Breadcrumb & Back Navigation ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Breadcrumb: Home / Rewards / Reward History */}
              <nav className="flex items-center gap-2 text-xs font-semibold text-[#94A3C4]">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <span className="text-[#94A3C4]/60">/</span>
                <Link href="/tasks" className="hover:text-white transition-colors">Rewards</Link>
                <span className="text-[#94A3C4]/60">/</span>
                <span className="text-[#00E5FF] font-bold drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]">
                  Reward History
                </span>
              </nav>

              {/* Back to Task Rewards button with cyan glow */}
              <Link
                href="/tasks"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#E0F2FE] bg-gradient-to-r from-[#0D1738] to-[#12214E] border border-[#00E5FF]/45 hover:border-[#00E5FF] hover:text-white shadow-[0_0_15px_rgba(0,229,255,0.2)] hover:shadow-[0_0_25px_rgba(0,229,255,0.45)] transition-all group"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#00E5FF] group-hover:-translate-x-0.5 transition-transform drop-shadow-[0_0_6px_rgba(0,229,255,0.8)]" />
                <span>Back to Task Rewards</span>
              </Link>
            </div>

            {/* ── Glowing Title & Subtitle ── */}
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFC928]/40 via-[#7C3AED]/30 to-[#00E5FF]/20 border-2 border-[#FFC928]/70 flex items-center justify-center text-2xl shadow-[0_0_35px_rgba(255,201,40,0.5),inset_0_0_15px_rgba(255,201,40,0.3)] shrink-0 animate-pulse">
                🏆
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight flex items-center gap-2 bg-gradient-to-r from-white via-[#E0F2FE] to-[#00E5FF] bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(0,229,255,0.35)]">
                  Reward History
                </h1>
                <p className="text-xs sm:text-sm text-[#A8B9DE] font-medium mt-0.5">
                  Track all your earned bonuses, task rewards and promotional rewards.
                </p>
              </div>
            </div>

            {/* ── SUMMARY CARDS (4 Compact Radiant Glowing Cards Row) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              
              {/* Card 1: TOTAL EARNED (Gold Radiant Glow) */}
              <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#1A1A40] via-[#12193D] to-[#0B122E] border border-[#FFC928]/50 shadow-[0_0_30px_rgba(255,201,40,0.22),inset_0_1px_1px_rgba(255,201,40,0.3)] hover:shadow-[0_0_42px_rgba(255,201,40,0.38)] hover:border-[#FFC928] transition-all overflow-hidden group">
                {/* Top laser beam flare */}
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFC928] to-transparent shadow-[0_0_12px_#FFC928]" />
                {/* Corner ambient glow orb */}
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#FFC928]/25 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
                
                <div className="relative z-10 flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#FFD700] drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]">
                    TOTAL EARNED
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#FFC928]/20 border border-[#FFC928]/60 flex items-center justify-center text-[#FFC928] shadow-[0_0_16px_rgba(255,201,40,0.45)]">
                    <Coins className="w-4 h-4 drop-shadow-[0_0_6px_rgba(255,201,40,0.8)]" />
                  </div>
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_14px_rgba(255,201,40,0.5)]">
                    ₹{summaryMetrics.totalEarned.toLocaleString('en-IN')}
                  </h3>
                  <span className="text-[10px] text-[#00E5A8] font-bold mt-0.5 flex items-center gap-1 drop-shadow-[0_0_6px_rgba(0,229,168,0.7)]">
                    <Sparkles className="w-2.5 h-2.5" /> Credited to wallet
                  </span>
                </div>
              </div>

              {/* Card 2: TASK REWARDS (Cyan Radiant Glow) */}
              <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#0B2545] via-[#101D42] to-[#081230] border border-[#00E5FF]/50 shadow-[0_0_30px_rgba(0,229,255,0.22),inset_0_1px_1px_rgba(0,229,255,0.3)] hover:shadow-[0_0_42px_rgba(0,229,255,0.38)] hover:border-[#00E5FF] transition-all overflow-hidden group">
                {/* Top laser beam flare */}
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent shadow-[0_0_12px_#00E5FF]" />
                {/* Corner ambient glow orb */}
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#00E5FF]/25 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
                
                <div className="relative z-10 flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#00E5FF] drop-shadow-[0_0_6px_rgba(0,229,255,0.5)]">
                    TASK REWARDS
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/60 flex items-center justify-center text-[#00E5FF] shadow-[0_0_16px_rgba(0,229,255,0.45)]">
                    <ListCheck className="w-4 h-4 drop-shadow-[0_0_6px_rgba(0,229,255,0.8)]" />
                  </div>
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#00E5FF] font-mono tracking-tight drop-shadow-[0_0_16px_rgba(0,229,255,0.7)]">
                    ₹{summaryMetrics.taskRewards.toLocaleString('en-IN')}
                  </h3>
                  <span className="text-[10px] text-[#A8B9DE] font-medium mt-0.5 block">
                    Completed player missions
                  </span>
                </div>
              </div>

              {/* Card 3: BONUS REWARDS (Purple/Magenta Radiant Glow) */}
              <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#271042] via-[#14153E] to-[#0A0F2C] border border-[#A855F7]/50 shadow-[0_0_30px_rgba(168,85,247,0.25),inset_0_1px_1px_rgba(168,85,247,0.3)] hover:shadow-[0_0_42px_rgba(168,85,247,0.42)] hover:border-[#A855F7] transition-all overflow-hidden group">
                {/* Top laser beam flare */}
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#A855F7] to-transparent shadow-[0_0_12px_#A855F7]" />
                {/* Corner ambient glow orb */}
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#A855F7]/25 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
                
                <div className="relative z-10 flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#C084FC] drop-shadow-[0_0_6px_rgba(192,132,252,0.5)]">
                    BONUS REWARDS
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#A855F7]/20 border border-[#A855F7]/60 flex items-center justify-center text-[#C084FC] shadow-[0_0_16px_rgba(168,85,247,0.45)]">
                    <Gift className="w-4 h-4 drop-shadow-[0_0_6px_rgba(192,132,252,0.8)]" />
                  </div>
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#C084FC] font-mono tracking-tight drop-shadow-[0_0_16px_rgba(192,132,252,0.7)]">
                    ₹{summaryMetrics.bonusRewards.toLocaleString('en-IN')}
                  </h3>
                  <span className="text-[10px] text-[#A8B9DE] font-medium mt-0.5 block">
                    Daily check-in & deposit perks
                  </span>
                </div>
              </div>

              {/* Card 4: REWARDS CLAIMED (Emerald Green Radiant Glow) */}
              <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#0B352E] via-[#0E203E] to-[#071128] border border-[#00E5A8]/50 shadow-[0_0_30px_rgba(0,229,168,0.22),inset_0_1px_1px_rgba(0,229,168,0.3)] hover:shadow-[0_0_42px_rgba(0,229,168,0.38)] hover:border-[#00E5A8] transition-all overflow-hidden group">
                {/* Top laser beam flare */}
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00E5A8] to-transparent shadow-[0_0_12px_#00E5A8]" />
                {/* Corner ambient glow orb */}
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#00E5A8]/25 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
                
                <div className="relative z-10 flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#00E5A8] drop-shadow-[0_0_6px_rgba(0,229,168,0.5)]">
                    REWARDS CLAIMED
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#00E5A8]/20 border border-[#00E5A8]/60 flex items-center justify-center text-[#00E5A8] shadow-[0_0_16px_rgba(0,229,168,0.45)]">
                    <CheckCircle2 className="w-4 h-4 drop-shadow-[0_0_6px_rgba(0,229,168,0.8)]" />
                  </div>
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#00E5A8] font-mono tracking-tight drop-shadow-[0_0_16px_rgba(0,229,168,0.7)]">
                    {summaryMetrics.claimedCount}
                  </h3>
                  <span className="text-[10px] text-[#A8B9DE] font-medium mt-0.5 block">
                    Settled reward items
                  </span>
                </div>
              </div>

            </div>

            {/* ── FILTER / SEARCH SECTION (Glowing Toolbar) ── */}
            <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-[#0D1944]/90 via-[#101F4E]/90 to-[#0A1435]/90 backdrop-blur-md border border-[#2979FF]/45 shadow-[0_0_35px_rgba(41,121,255,0.22)] overflow-hidden space-y-3">
              {/* Top cyber light laser strip */}
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent shadow-[0_0_14px_#00E5FF]" />

              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[220px]">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3C4]">
                    <Search className="w-4 h-4 text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search rewards..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-[#070E28] border border-[#2979FF]/40 text-xs sm:text-sm font-medium text-white placeholder-[#7183A8] focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_20px_rgba(0,229,255,0.35)] shadow-inner transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Toolbars */}
                <div className="flex items-center flex-wrap gap-2.5">
                  {/* Filter by: Type */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-[#A8B9DE] hidden sm:inline">Type:</span>
                    <select
                      value={typeFilter}
                      onChange={(e) => {
                        setTypeFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 rounded-xl bg-[#070E28] border border-[#2979FF]/40 text-xs font-bold text-[#E2E8F0] focus:outline-none focus:border-[#00E5FF] hover:border-[#00E5FF]/70 hover:shadow-[0_0_12px_rgba(0,229,255,0.25)] cursor-pointer transition-all"
                    >
                      <option value="All">All Types</option>
                      <option value="Task Reward">Task Rewards</option>
                      <option value="Daily Bonus">Daily Bonus</option>
                      <option value="Deposit Bonus">Deposit Bonus</option>
                      <option value="Referral Bonus">Referral Bonus</option>
                      <option value="Promotional">Promotional</option>
                    </select>
                  </div>

                  {/* Filter by: Status */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-[#A8B9DE] hidden sm:inline">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 rounded-xl bg-[#070E28] border border-[#2979FF]/40 text-xs font-bold text-[#E2E8F0] focus:outline-none focus:border-[#00E5FF] hover:border-[#00E5FF]/70 hover:shadow-[0_0_12px_rgba(0,229,255,0.25)] cursor-pointer transition-all"
                    >
                      <option value="All">All Status</option>
                      <option value="Claimed">Claimed</option>
                      <option value="Pending">Pending</option>
                      <option value="Expired">Expired</option>
                    </select>
                  </div>

                  {/* Filter by: Date */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-[#A8B9DE] hidden sm:inline">Date:</span>
                    <select
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 rounded-xl bg-[#070E28] border border-[#2979FF]/40 text-xs font-bold text-[#E2E8F0] focus:outline-none focus:border-[#00E5FF] hover:border-[#00E5FF]/70 hover:shadow-[0_0_12px_rgba(0,229,255,0.25)] cursor-pointer transition-all"
                    >
                      <option value="All">All Dates</option>
                      <option value="Today">Today</option>
                      <option value="This Week">This Week</option>
                      <option value="This Month">This Month</option>
                      <option value="Custom Date">Custom Date</option>
                    </select>
                  </div>

                  {/* Inline Date Picker when Custom Date is selected */}
                  {dateFilter === 'Custom Date' && (
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => {
                        setCustomDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#070E28] border border-[#00E5FF]/60 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.3)] cursor-pointer"
                    />
                  )}

                  {/* Reset Filters button */}
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3.5 py-2 rounded-xl bg-[#1E293B] hover:bg-[#253248] border border-white/10 hover:border-[#00E5FF]/50 text-xs font-bold text-[#94A3C4] hover:text-white hover:shadow-[0_0_14px_rgba(0,229,255,0.3)] flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#00E5FF] drop-shadow-[0_0_6px_rgba(0,229,255,0.7)]" />
                    <span>Reset Filters</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── HISTORY TABLE CONTAINER (Radiant Glassmorphic Cyber Container) ── */}
            <div className="relative rounded-[20px] overflow-hidden border border-[#2979FF]/45 bg-gradient-to-b from-[#0D183E]/95 to-[#070F28]/95 backdrop-blur-md shadow-[0_0_55px_rgba(0,229,255,0.16),0_0_35px_rgba(41,121,255,0.22)]">
              
              {/* Top Cyber Laser Line Flare */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00E5FF] via-[#7C3AED] to-transparent shadow-[0_0_20px_#00E5FF]" />

              {fetching ? (
                /* ── LOADING SKELETON STATE ── */
                <div className="py-20 px-6 text-center space-y-4">
                  <Loader2 className="w-10 h-10 mx-auto text-[#00E5FF] animate-spin drop-shadow-[0_0_12px_#00E5FF]" />
                  <p className="text-sm font-bold text-[#A8B9DE]">Loading your live reward history...</p>
                </div>
              ) : filteredRewards.length === 0 ? (
                /* ── EMPTY STATE ── */
                <div className="py-16 px-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-[#101B3D] border border-[#00E5FF]/40 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(0,229,255,0.35)]">
                    🎁
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-black text-white tracking-tight">No Rewards Found</h3>
                    <p className="text-xs sm:text-sm text-[#94A3C4] max-w-md mx-auto leading-relaxed">
                      Your reward history will appear here after you earn or claim a reward.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    {searchQuery || typeFilter !== 'All' || statusFilter !== 'All' || dateFilter !== 'All' ? (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-xs font-bold text-[#94A3C4] hover:text-white border border-white/10 transition-all"
                      >
                        Reset Filters
                      </button>
                    ) : null}
                    <Link
                      href="/tasks"
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00E5A8] to-[#00C2FF] text-[#050B20] text-xs font-black shadow-[0_0_20px_rgba(0,229,168,0.55)] hover:brightness-110 transition-all"
                    >
                      Back to Rewards
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* ── DESKTOP & TABLET TABLE (Hidden on mobile) ── */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-gradient-to-r from-[#081236]/95 via-[#0D1B46]/95 to-[#081236]/95 text-[11px] font-black uppercase tracking-wider text-[#A8B9DE]">
                          <th className="py-4 px-5">REWARD</th>
                          <th className="py-4 px-4">TYPE</th>
                          <th className="py-4 px-4">AMOUNT</th>
                          <th className="py-4 px-4">STATUS</th>
                          <th className="py-4 px-4">DATE & TIME</th>
                          <th className="py-4 px-5 text-right">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {paginatedRewards.map((reward) => (
                          <tr
                            key={reward.id}
                            className="hover:bg-gradient-to-r hover:from-[#112356]/80 hover:via-[#162D6E]/80 hover:to-[#112356]/80 hover:shadow-[inset_0_0_25px_rgba(0,229,255,0.08)] transition-all group cursor-default"
                          >
                            {/* REWARD */}
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-[#081230] border border-white/15 flex items-center justify-center shrink-0 shadow-sm group-hover:border-[#00E5FF]/60 group-hover:shadow-[0_0_14px_rgba(0,229,255,0.35)] transition-all">
                                  {renderRewardIcon(reward.iconType)}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-black text-white tracking-tight truncate group-hover:text-[#00E5FF] group-hover:drop-shadow-[0_0_8px_rgba(0,229,255,0.65)] transition-all">
                                    {reward.name}
                                  </h4>
                                  <p className="text-[11px] text-[#94A3C4] truncate max-w-xs mt-0.5">
                                    {reward.description}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* TYPE */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase bg-[#111D45] border border-[#2979FF]/30 text-[#E0F2FE] shadow-sm">
                                {reward.type}
                              </span>
                            </td>

                            {/* AMOUNT (Green positive reward amount with neon glow) */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="text-sm font-black font-mono text-[#00E5A8] tracking-tight drop-shadow-[0_0_12px_rgba(0,229,168,0.65)]">
                                +₹{reward.amount}
                              </span>
                            </td>

                            {/* STATUS (Vibrant glowing badges) */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              {reward.status === 'Claimed' ? (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#00E5A8]/20 border border-[#00E5A8]/65 text-[#00E5A8] flex items-center gap-1.5 w-fit shadow-[0_0_14px_rgba(0,229,168,0.45)] drop-shadow-[0_0_6px_rgba(0,229,168,0.7)]">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  CLAIMED
                                </span>
                              ) : reward.status === 'Pending' ? (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFC928]/20 border border-[#FFC928]/65 text-[#FFC928] flex items-center gap-1.5 w-fit shadow-[0_0_14px_rgba(255,201,40,0.45)] drop-shadow-[0_0_6px_rgba(255,201,40,0.7)]">
                                  <Clock className="w-3.5 h-3.5" />
                                  PENDING
                                </span>
                              ) : reward.status === 'Expired' ? (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#EC4899]/20 border border-[#EC4899]/65 text-[#EC4899] flex items-center gap-1.5 w-fit shadow-[0_0_14px_rgba(236,72,153,0.45)]">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  EXPIRED
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#EF4444]/20 border border-[#EF4444]/65 text-[#EF4444] flex items-center gap-1.5 w-fit">
                                  <XCircle className="w-3.5 h-3.5" />
                                  FAILED
                                </span>
                              )}
                            </td>

                            {/* DATE & TIME */}
                            <td className="py-4 px-4 whitespace-nowrap text-[#94A3C4] font-medium text-[11px]">
                              <span>{reward.date}</span>
                              <span className="text-slate-500 mx-1.5">•</span>
                              <span className="text-slate-300 font-mono">{reward.time}</span>
                            </td>

                            {/* ACTION (Glowing View Details button) */}
                            <td className="py-4 px-5 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedReward(reward)}
                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#2979FF]/20 to-[#00E5FF]/20 hover:from-[#2979FF]/40 hover:to-[#00E5FF]/40 border border-[#00E5FF]/50 hover:border-[#00E5FF] text-xs font-bold text-white shadow-[0_0_15px_rgba(0,229,255,0.25)] hover:shadow-[0_0_24px_rgba(0,229,255,0.55)] transition-all flex items-center gap-1.5 ml-auto group/btn"
                              >
                                <span>View Details</span>
                                <span className="text-[#00E5FF] group-hover/btn:translate-x-0.5 transition-transform drop-shadow-[0_0_6px_#00E5FF]">
                                  →
                                </span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ── MOBILE VERTICAL REWARD CARDS (Visible on mobile screens) ── */}
                  <div className="md:hidden divide-y divide-white/5 p-3 space-y-3">
                    {paginatedRewards.map((reward) => (
                      <div
                        key={reward.id}
                        className="p-4 rounded-2xl bg-gradient-to-b from-[#0C173E] to-[#070F28] border border-[#2979FF]/35 shadow-[0_0_20px_rgba(0,229,255,0.12)] space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#070E28] border border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                              {renderRewardIcon(reward.iconType)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                                {reward.name}
                              </h4>
                              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#111D45] text-[#94A3C4]">
                                {reward.type}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm font-black font-mono text-[#00E5A8] drop-shadow-[0_0_10px_rgba(0,229,168,0.65)] shrink-0">
                            +₹{reward.amount}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#94A3C4] leading-relaxed">
                          {reward.description}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                          <div className="flex items-center gap-2">
                            {reward.status === 'Claimed' ? (
                              <span className="text-[10px] font-black text-[#00E5A8] flex items-center gap-1 drop-shadow-[0_0_6px_rgba(0,229,168,0.7)]">
                                <Check className="w-3 h-3 stroke-[3]" /> CLAIMED
                              </span>
                            ) : reward.status === 'Pending' ? (
                              <span className="text-[10px] font-black text-[#FFC928] flex items-center gap-1 drop-shadow-[0_0_6px_rgba(255,201,40,0.7)]">
                                <Clock className="w-3 h-3" /> PENDING
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-[#EC4899] flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {reward.status.toUpperCase()}
                              </span>
                            )}
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 text-[10px]">{reward.date}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedReward(reward)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#2979FF]/20 to-[#00E5FF]/20 border border-[#00E5FF]/50 text-xs font-bold text-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.3)] hover:brightness-125 transition-all flex items-center gap-1"
                          >
                            <span>View Details</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── PAGINATION BAR ── */}
                  <div className="p-4 sm:p-5 border-t border-white/10 bg-[#070F28]/90 flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Showing text */}
                    <span className="text-xs font-medium text-[#94A3C4]">
                      Showing{' '}
                      <strong className="text-white font-mono font-bold">
                        {(currentPage - 1) * itemsPerPage + 1}
                      </strong>
                      –
                      <strong className="text-white font-mono font-bold">
                        {Math.min(currentPage * itemsPerPage, filteredRewards.length)}
                      </strong>{' '}
                      of <strong className="text-white font-mono font-bold">{filteredRewards.length}</strong> rewards
                    </span>

                    {/* Pagination Nav */}
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 rounded-xl bg-[#08112F] border border-white/10 hover:border-[#00E5FF]/50 text-xs font-bold text-[#E2E8F0] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 hover:shadow-[0_0_12px_rgba(0,229,255,0.25)] transition-all"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Previous</span>
                        </button>

                        {Array.from({ length: totalPages }).map((_, i) => {
                          const pageNum = i + 1;
                          if (
                            pageNum === 1 ||
                            pageNum === totalPages ||
                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={pageNum}
                                type="button"
                                onClick={() => handlePageChange(pageNum)}
                                className={`w-8 h-8 rounded-xl text-xs font-bold font-mono transition-all ${
                                  currentPage === pageNum
                                    ? 'bg-gradient-to-r from-[#00E5A8] to-[#00C2FF] text-[#050B20] font-black shadow-[0_0_18px_rgba(0,229,168,0.65)]'
                                    : 'bg-[#08112F] border border-white/10 hover:border-white/30 text-[#94A3C4] hover:text-white'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          } else if (
                            (pageNum === 2 && currentPage > 3) ||
                            (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                          ) {
                            return (
                              <span key={pageNum} className="text-xs text-[#94A3C4] px-1 font-mono">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}

                        <button
                          type="button"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 rounded-xl bg-[#08112F] border border-white/10 hover:border-[#00E5FF]/50 text-xs font-bold text-[#E2E8F0] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 hover:shadow-[0_0_12px_rgba(0,229,255,0.25)] transition-all"
                        >
                          <span>Next</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>

            {/* Desktop Footer */}
            <DesktopFooter />

          </div>
        </main>
      </div>

      {/* ── Mobile Fixed Bottom Navigation ── */}
      <BottomNavigation />

      {/* ── SMALL PREMIUM DETAIL MODAL (VIEW DETAILS) WITH VIBRANT LIGHTING ── */}
      <AnimatePresence>
        {selectedReward && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setSelectedReward(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-[24px] p-6 bg-gradient-to-b from-[#111E48] via-[#0E173C] to-[#070D24] border-2 border-[#00E5FF]/50 shadow-[0_0_60px_rgba(0,229,255,0.35),0_0_30px_rgba(124,58,237,0.3)] space-y-4 overflow-hidden"
            >
              {/* Modal Top Laser Line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent shadow-[0_0_15px_#00E5FF]" />

              {/* Modal Header: 🎁 Reward Details */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#2979FF]/25 border border-[#00E5FF]/50 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(0,229,255,0.35)]">
                    🎁
                  </div>
                  <h3 className="text-base font-black text-white tracking-tight bg-gradient-to-r from-white to-[#00E5FF] bg-clip-text text-transparent">
                    Reward Details
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReward(null)}
                  className="p-1.5 rounded-lg text-[#94A3C4] hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Exact Fields according to prompt */}
              <div className="space-y-2.5 text-xs">
                
                {/* Reward Name */}
                <div className="p-3 rounded-xl bg-[#070D24]/90 border border-white/10 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#A8B9DE] tracking-wider block">
                    Reward:
                  </span>
                  <span className="text-sm font-black text-white block">
                    {selectedReward.name}
                  </span>
                </div>

                {/* 2-col info: Type & Amount */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#070D24]/90 border border-white/10 space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#A8B9DE] tracking-wider block">
                      Type:
                    </span>
                    <span className="text-xs font-black text-white block">
                      {selectedReward.type}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#070D24]/90 border border-white/10 space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#A8B9DE] tracking-wider block">
                      Amount:
                    </span>
                    <span className="text-sm font-black font-mono text-[#00E5A8] drop-shadow-[0_0_10px_rgba(0,229,168,0.7)] block">
                      +₹{selectedReward.amount}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="p-2.5 rounded-xl bg-[#070D24]/90 border border-white/10 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#A8B9DE] tracking-wider">
                    Status:
                  </span>
                  {selectedReward.status === 'Claimed' ? (
                    <span className="text-xs font-black text-[#00E5A8] flex items-center gap-1 drop-shadow-[0_0_8px_rgba(0,229,168,0.8)]">
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Claimed
                    </span>
                  ) : selectedReward.status === 'Pending' ? (
                    <span className="text-xs font-black text-[#FFC928] flex items-center gap-1 drop-shadow-[0_0_8px_rgba(255,201,40,0.8)]">
                      <Clock className="w-3.5 h-3.5" /> Pending
                    </span>
                  ) : (
                    <span className="text-xs font-black text-[#EC4899] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {selectedReward.status}
                    </span>
                  )}
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#070D24]/90 border border-white/10 space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#A8B9DE] tracking-wider block">
                      Date:
                    </span>
                    <span className="text-xs font-black text-white block">
                      {selectedReward.date}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#070D24]/90 border border-white/10 space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#A8B9DE] tracking-wider block">
                      Time:
                    </span>
                    <span className="text-xs font-black font-mono text-white block">
                      {selectedReward.time}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="p-2.5 rounded-xl bg-[#070D24]/90 border border-white/10 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#A8B9DE] tracking-wider block">
                    Description:
                  </span>
                  <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                    &ldquo;{selectedReward.description}&rdquo;
                  </p>
                </div>

                {/* Transaction ID */}
                <div className="p-2.5 rounded-xl bg-[#070D24] border border-[#00E5FF]/30 flex items-center justify-between text-[11px] shadow-[inset_0_0_12px_rgba(0,229,255,0.1)]">
                  <span className="text-[#A8B9DE] font-medium">Transaction ID:</span>
                  <span className="font-mono font-bold text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.7)]">
                    {selectedReward.transactionId}
                  </span>
                </div>

              </div>

              {/* Close Button with cyan glow */}
              <button
                type="button"
                onClick={() => setSelectedReward(null)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#1E293B] to-[#25334E] hover:from-[#25334E] hover:to-[#2F4166] text-white font-bold text-xs transition-all border border-white/15 hover:border-[#00E5FF]/60 hover:shadow-[0_0_18px_rgba(0,229,255,0.35)] shadow-sm"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
