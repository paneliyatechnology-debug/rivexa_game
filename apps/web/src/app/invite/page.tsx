'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { GAMEHUB_ASSETS } from '@/config/gamehub-assets';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TopHeader, BottomNavigation, DesktopFooter } from '@/components/Navigation';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { getApiBaseUrl } from '@/lib/config';
import {
  Share2,
  Copy,
  Check,
  Sparkles,
  Users,
  Award,
  Wallet,
  ArrowRight,
  TrendingUp,
  HelpCircle,
  X,
  MessageCircle,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Gift,
  Coins
} from 'lucide-react';

interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalEarned: number;
  commissionBalance: number;
  level1Count: number;
  level2Count: number;
  level3Count: number;
  recentCommissions?: any[];
}

export default function InvitePage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, balance: authBalance, refreshUser } = useAuth();

  const [balance, setBalance] = useState<number>(authBalance || 0);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [fetching, setFetching] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [transferring, setTransferring] = useState<boolean>(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Interactive Calculator State
  const [calcInvites, setCalcInvites] = useState<number>(10);
  const [calcAvgBet, setCalcAvgBet] = useState<number>(500);

  // Sync auth balance
  useEffect(() => {
    if (authBalance !== undefined && authBalance !== null) {
      setBalance(authBalance);
    }
  }, [authBalance]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  const loadReferralStats = async () => {
    const token = localStorage.getItem('rivexa_token');
    if (!token) return;

    setFetching(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/referral`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setStats({
          referralCode: data.referralCode || user?.referralCode || 'PLAYER123',
          referralLink: data.referralLink || `${getOrigin()}/register?ref=${data.referralCode || user?.referralCode || ''}`,
          totalEarned: Number(data.totalCommission ?? 0),
          commissionBalance: Number(data.commissionBalance ?? data.totalCommission ?? 0),
          level1Count: Number(data.level1Count ?? 0),
          level2Count: Number(data.level2Count ?? 0),
          level3Count: Number(data.level3Count ?? 0),
          recentCommissions: data.recentCommissions || [],
        });
      }
    } catch (err) {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadReferralStats();
    }
  }, [isAuthenticated]);

  const getOrigin = () => (typeof window !== 'undefined' ? window.location.origin : '');

  const effectiveRefCode = stats?.referralCode || user?.referralCode || 'PLAYER123';
  const effectiveRefLink = stats?.referralLink || `${getOrigin()}/register?ref=${effectiveRefCode}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(effectiveRefLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(effectiveRefCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(
      `🎮 Join GameHub using my referral link and get exclusive deposit bonuses & instant cash! 🚀\n\nReferral Code: ${effectiveRefCode}\nLink: ${effectiveRefLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareToTelegram = () => {
    const text = encodeURIComponent(
      `🎮 Join GameHub using my referral code: ${effectiveRefCode} to claim instant cash & bonus! 🚀`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(effectiveRefLink)}&text=${text}`, '_blank');
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join GameHub & Play Big!',
        text: `Use my referral code ${effectiveRefCode} to get free bonuses and win big!`,
        url: effectiveRefLink,
      }).catch(() => {});
    } else {
      copyReferralLink();
    }
  };

  // Transfer Commission to Main Wallet
  const handleTransferCommission = async () => {
    if (!user?.id) return;
    const commAmt = stats?.commissionBalance ?? 0;
    if (commAmt <= 0) {
      setTransferError('No commission balance available to transfer.');
      setTimeout(() => setTransferError(null), 3000);
      return;
    }

    setTransferring(true);
    setTransferError(null);
    setTransferSuccess(null);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/wallet/transfer-commission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('rivexa_token') || ''}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to transfer commission');
      }

      setTransferSuccess(`Successfully transferred ₹${commAmt.toFixed(2)} to your Main Wallet! 🎉`);
      if (stats) {
        setStats({ ...stats, commissionBalance: 0 });
      }
      if (refreshUser) {
        await refreshUser();
      }
      setTimeout(() => setTransferSuccess(null), 4000);
    } catch (err: any) {
      setTransferError(err.message || 'Error transferring commission.');
      setTimeout(() => setTransferError(null), 3500);
    } finally {
      setTransferring(false);
    }
  };

  // Calculate estimated daily & monthly rewards
  const estimatedDaily = Math.round(calcInvites * calcAvgBet * 0.03);
  const estimatedMonthly = estimatedDaily * 30;

  if (loading || (isAuthenticated && fetching)) {
    return (
      <div className="min-h-screen bg-[#050B20] text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-4 border-[#00D9FF]/20 border-t-[#00D9FF] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-xs">🚀</div>
        </div>
        <p className="text-sm font-bold text-[#A8B9DE] mt-4 tracking-wide">Loading Referral Center...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const totalNetworkCount = (stats?.level1Count ?? 0) + (stats?.level2Count ?? 0) + (stats?.level3Count ?? 0);

  return (
    <div className="flex flex-col min-h-screen pt-[84px] bg-[#050B20] text-[#F8FAFC] selection:bg-[#00E5FF] selection:text-[#050B20] font-sans">
      {/* ── Ambient Background Glows ── */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-[#2979FF]/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-[#7C3AED]/12 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-1/3 right-10 w-[400px] h-[400px] bg-[#00E5A8]/8 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* ── Fixed Top Header ── */}
      <TopHeader balance={balance} />

      {/* ── Body: Sidebar + Main Content ── */}
      <div className="flex flex-1 w-full lg:pl-[220px] xl:pl-60 relative z-10">
        {/* Desktop Left Sidebar (Only visible on lg+) */}
        <DesktopSidebar activeCategory="invite" />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 pb-24 lg:pb-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">

            {/* ── Top Breadcrumb & How It Works Button ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <nav className="flex items-center gap-2 text-xs font-semibold text-[#94A3C4]">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <span className="text-[#94A3C4]/60">&gt;</span>
                <Link href="/rewards" className="hover:text-white transition-colors">Rewards</Link>
                <span className="text-[#94A3C4]/60">&gt;</span>
                <span className="text-[#00E5FF] font-bold">Invite &amp; Earn</span>
              </nav>

              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#A8B9DE] bg-[#0D1738] border border-[#2979FF]/30 hover:border-[#00E5FF]/60 hover:text-white hover:bg-[#111D45] transition-all shadow-[0_0_15px_rgba(41,121,255,0.15)] group"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#00E5FF] group-hover:rotate-12 transition-transform" />
                <span>Commission Rules &amp; FAQ</span>
              </button>
            </div>

            {/* ── Transfer Success / Error Alerts ── */}
            <AnimatePresence>
              {transferSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{transferSuccess}</span>
                  </div>
                  <button onClick={() => setTransferSuccess(null)} className="text-emerald-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {transferError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-sm font-semibold flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(244,63,94,0.25)]"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span>{transferError}</span>
                  </div>
                  <button onClick={() => setTransferError(null)} className="text-rose-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── 1. HERO SHOWCASE CARD (Lighting, Neon & The Exact Referral Image) ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="relative rounded-[24px] overflow-hidden bg-gradient-to-r from-[#090E2E] via-[#0F1E4C] to-[#08132C] border border-[#287BFF]/40 shadow-[0_0_35px_rgba(40,123,255,0.22)]"
            >
              {/* Internal neon ambient spots */}
              <div className="absolute -top-16 -left-16 w-64 h-64 bg-[#873BFF]/25 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#00E5A0]/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00D9FF]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 p-5 sm:p-7 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                  
                  {/* Left Column: Headlines & Tier Commission Badges */}
                  <div className="lg:col-span-7 flex flex-col justify-center space-y-4 text-left">
                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-[#00E5A0]/20 border border-[#00E5A0]/50 text-[#00E5A0] uppercase tracking-wider shadow-[0_0_12px_rgba(0,229,160,0.3)]">
                        <Sparkles className="w-3.5 h-3.5" />
                        3-Tier MLM Commission
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-[#873BFF]/20 border border-[#873BFF]/50 text-[#C49BFF] uppercase tracking-wider">
                        <Gift className="w-3.5 h-3.5 text-[#FFC928]" />
                        Lifetime Payouts
                      </span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight">
                      Invite Friends &amp; Earn{' '}
                      <span
                        className="text-transparent bg-clip-text"
                        style={{
                          backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #00E5A0 40%, #00D9FF 75%, #FFC928 100%)',
                          WebkitBackgroundClip: 'text',
                        }}
                      >
                        Lifetime Commission!
                      </span>
                    </h1>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-[#A8B9DE] leading-relaxed max-w-xl">
                      Share your unique referral link with your friends and gaming circle. Whenever they bet and play, you automatically earn real cash commission deposited directly to your balance!
                    </p>

                    {/* Tier Badges Row */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 py-1 max-w-lg">
                      {/* Level 1 */}
                      <div className="p-2.5 rounded-xl bg-[#0B1530]/80 border border-[#00E5A0]/40 backdrop-blur-md shadow-[0_0_15px_rgba(0,229,160,0.15)] flex flex-col items-center sm:items-start text-center sm:text-left">
                        <span className="text-[10px] font-extrabold text-[#7183A8] uppercase">Direct Friend</span>
                        <div className="text-base sm:text-lg font-black text-[#00E5A0] font-mono">3% Level 1</div>
                        <span className="text-[9px] text-[#A8B9DE]">On every bet</span>
                      </div>

                      {/* Level 2 */}
                      <div className="p-2.5 rounded-xl bg-[#0B1530]/80 border border-[#00D9FF]/40 backdrop-blur-md shadow-[0_0_15px_rgba(0,217,255,0.15)] flex flex-col items-center sm:items-start text-center sm:text-left">
                        <span className="text-[10px] font-extrabold text-[#7183A8] uppercase">Sub Friend</span>
                        <div className="text-base sm:text-lg font-black text-[#00D9FF] font-mono">2% Level 2</div>
                        <span className="text-[9px] text-[#A8B9DE]">2nd generation</span>
                      </div>

                      {/* Level 3 */}
                      <div className="p-2.5 rounded-xl bg-[#0B1530]/80 border border-[#873BFF]/40 backdrop-blur-md shadow-[0_0_15px_rgba(135,59,255,0.15)] flex flex-col items-center sm:items-start text-center sm:text-left">
                        <span className="text-[10px] font-extrabold text-[#7183A8] uppercase">Deep Friend</span>
                        <div className="text-base sm:text-lg font-black text-[#C49BFF] font-mono">1% Level 3</div>
                        <span className="text-[9px] text-[#A8B9DE]">3rd generation</span>
                      </div>
                    </div>

                    {/* Quick CTA Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={copyReferralLink}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00D9FF] via-[#287BFF] to-[#873BFF] hover:from-[#33E0FF] hover:to-[#9B55FF] text-white text-xs sm:text-sm font-black shadow-[0_0_20px_rgba(40,123,255,0.4)] active:scale-95 transition-all flex items-center gap-2 group"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-4 h-4 text-[#00E5A0]" />
                            <span>COPIED LINK! ✓</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-[#00D9FF] group-hover:scale-110 transition-transform" />
                            <span>COPY INVITE LINK</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={shareToWhatsApp}
                        className="px-4 py-2.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] text-xs sm:text-sm font-bold transition-all flex items-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(37,211,102,0.15)]"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={shareToTelegram}
                        className="px-4 py-2.5 rounded-xl bg-[#0088CC]/15 hover:bg-[#0088CC]/25 border border-[#0088CC]/40 text-[#0088CC] text-xs sm:text-sm font-bold transition-all flex items-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(0,136,204,0.15)]"
                      >
                        <Send className="w-4 h-4" />
                        <span>Telegram</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: The Exact Referral Image (Responsive & Lighting Showcase) */}
                  <div className="lg:col-span-5 flex justify-center">
                    <div className="relative w-full max-w-[420px] aspect-[4/3] sm:aspect-[16/11] rounded-2xl overflow-hidden border-2 border-[#287BFF]/50 shadow-[0_0_35px_rgba(40,123,255,0.35),0_0_15px_rgba(135,59,255,0.25)] group">
                      {/* The Exact Image Requested By User */}
                      <Image
                        src={GAMEHUB_ASSETS.banners.inviteFriendsBanner}
                        alt="GameHub Referral Illustration"
                        fill
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                        priority
                      />

                      {/* Ambient Gradient Vignette */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#050B20]/80 via-transparent to-transparent pointer-events-none" />

                      {/* Floating Badge on Image */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-2.5 rounded-xl bg-[#08132C]/85 backdrop-blur-md border border-white/15 text-white shadow-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#00E5A0]/20 border border-[#00E5A0]/50 flex items-center justify-center text-sm">
                            🎁
                          </div>
                          <div>
                            <div className="text-[11px] font-black text-white">3-Tier Multi-Level Bonus</div>
                            <div className="text-[9px] text-[#A8B9DE]">Earn on 3 generations of players</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#00E5A0] text-[#050B20] uppercase">
                          ACTIVE
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>

            {/* ── 2. REFERRAL DETAILS & SHARING HUB ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
              className="rounded-2xl p-5 sm:p-6 bg-[#0B1530]/85 border border-[#287BFF]/35 shadow-[0_0_25px_rgba(40,123,255,0.15)] backdrop-blur-md relative overflow-hidden"
            >
              {/* Subtle neon glow spot */}
              <div className="absolute top-0 right-0 w-52 h-52 bg-[#00D9FF]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-[#00D9FF]" />
                    <span>Your Exclusive Referral Details</span>
                  </h2>
                  <span className="text-xs font-bold text-[#A8B9DE] bg-[#070D1F] border border-[#287BFF]/30 px-3 py-1 rounded-full">
                    Total Network: <strong className="text-[#00E5A0] font-mono">{totalNetworkCount} Friends</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                  {/* Referral Code Box */}
                  <div className="md:col-span-4 p-4 rounded-xl bg-[#070D1F] border border-[#287BFF]/30 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-[#7183A8] uppercase tracking-wider">
                        Referral Code
                      </span>
                      <span className="text-[10px] font-bold text-[#00E5A0] bg-[#00E5A0]/10 px-2 py-0.5 rounded-full border border-[#00E5A0]/25">
                        Active
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0B1530] border border-[#00D9FF]/40 shadow-inner">
                      <span className="font-mono text-lg sm:text-xl font-black text-[#00D9FF] tracking-wider uppercase pl-2">
                        {effectiveRefCode}
                      </span>
                      <button
                        onClick={copyReferralCode}
                        className="px-3 py-1.5 rounded-lg bg-[#287BFF]/20 hover:bg-[#287BFF]/40 border border-[#287BFF]/50 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-[#00E5A0]" /> : <Copy className="w-3.5 h-3.5 text-[#00D9FF]" />}
                        <span>{copiedCode ? 'COPIED' : 'COPY'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Referral Link Box */}
                  <div className="md:col-span-8 p-4 rounded-xl bg-[#070D1F] border border-[#287BFF]/30 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-[#7183A8] uppercase tracking-wider">
                        Unique Referral Link
                      </span>
                      <span className="text-[10px] text-[#A8B9DE]">
                        Direct tracking attached
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          readOnly
                          value={effectiveRefLink}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1530] border border-[#287BFF]/40 text-xs sm:text-sm font-mono text-[#D2E2FF] font-medium truncate focus:outline-none focus:border-[#00D9FF] shadow-inner"
                        />
                      </div>
                      <button
                        onClick={copyReferralLink}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5A0] to-[#00D9FF] hover:from-[#17F5B0] hover:to-[#33E0FF] text-[#050B20] text-xs sm:text-sm font-black shadow-[0_0_15px_rgba(0,229,160,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-4 h-4 font-bold" />
                            <span>COPIED! ✓</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>COPY LINK</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Social Share Bar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/5">
                  <span className="text-xs font-bold text-[#A8B9DE] flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-[#00E5FF]" />
                    Share with one tap:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={shareToWhatsApp}
                      className="px-3.5 py-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={shareToTelegram}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0088CC]/15 hover:bg-[#0088CC]/30 border border-[#0088CC]/40 text-[#0088CC] text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Telegram</span>
                    </button>
                    <button
                      onClick={shareNative}
                      className="px-3.5 py-1.5 rounded-lg bg-[#873BFF]/15 hover:bg-[#873BFF]/30 border border-[#873BFF]/40 text-[#C49BFF] text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>More Apps</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── 3. 3-TIER MLM BREAKDOWN NETWORK CARDS ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00E5A0]" />
                  <span>3-Tier Commission Network Stats</span>
                </h3>
                <span className="text-[11px] font-bold text-[#A8B9DE]">Real-time downlines</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Level 1 Card */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="rounded-2xl p-4 bg-gradient-to-b from-[#00E5A0]/10 via-[#071F18]/90 to-[#0B1530] border border-[#00E5A0]/40 shadow-[0_0_20px_rgba(0,229,160,0.15)] flex flex-col justify-between space-y-3 group hover:border-[#00E5A0]/70 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-[#00E5A0] bg-[#00E5A0]/15 border border-[#00E5A0]/35 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Level 1 (3%)
                    </span>
                    <span className="text-xs text-[#7183A8] font-bold">Direct Tier</span>
                  </div>

                  <div className="space-y-0.5 text-center sm:text-left">
                    <div className="text-3xl font-black text-white font-mono tracking-tight group-hover:text-[#00E5A0] transition-colors">
                      {stats?.level1Count ?? 0}
                    </div>
                    <span className="text-xs text-[#A8B9DE] font-semibold block">Direct Friend Invites</span>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#7183A8]">
                    <span>Commission Rate:</span>
                    <strong className="text-[#00E5A0] font-mono">3.0% of Bet</strong>
                  </div>
                </motion.div>

                {/* Level 2 Card */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="rounded-2xl p-4 bg-gradient-to-b from-[#00D9FF]/10 via-[#071828]/90 to-[#0B1530] border border-[#00D9FF]/40 shadow-[0_0_20px_rgba(0,217,255,0.15)] flex flex-col justify-between space-y-3 group hover:border-[#00D9FF]/70 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-[#00D9FF] bg-[#00D9FF]/15 border border-[#00D9FF]/35 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Level 2 (2%)
                    </span>
                    <span className="text-xs text-[#7183A8] font-bold">Sub Tier</span>
                  </div>

                  <div className="space-y-0.5 text-center sm:text-left">
                    <div className="text-3xl font-black text-white font-mono tracking-tight group-hover:text-[#00D9FF] transition-colors">
                      {stats?.level2Count ?? 0}
                    </div>
                    <span className="text-xs text-[#A8B9DE] font-semibold block">Sub Invites (Friends of Friends)</span>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#7183A8]">
                    <span>Commission Rate:</span>
                    <strong className="text-[#00D9FF] font-mono">2.0% of Bet</strong>
                  </div>
                </motion.div>

                {/* Level 3 Card */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="rounded-2xl p-4 bg-gradient-to-b from-[#873BFF]/10 via-[#190C30]/90 to-[#0B1530] border border-[#873BFF]/40 shadow-[0_0_20px_rgba(135,59,255,0.15)] flex flex-col justify-between space-y-3 group hover:border-[#873BFF]/70 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-[#C49BFF] bg-[#873BFF]/15 border border-[#873BFF]/35 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Level 3 (1%)
                    </span>
                    <span className="text-xs text-[#7183A8] font-bold">Deep Tier</span>
                  </div>

                  <div className="space-y-0.5 text-center sm:text-left">
                    <div className="text-3xl font-black text-white font-mono tracking-tight group-hover:text-[#C49BFF] transition-colors">
                      {stats?.level3Count ?? 0}
                    </div>
                    <span className="text-xs text-[#A8B9DE] font-semibold block">Deep Extended Circle</span>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#7183A8]">
                    <span>Commission Rate:</span>
                    <strong className="text-[#C49BFF] font-mono">1.0% of Bet</strong>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* ── 4. COMMISSION WALLET & TRANSFER SECTION ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-[#171302]/95 via-[#0D1836]/95 to-[#05211B]/95 border border-[#FFC928]/40 shadow-[0_0_30px_rgba(255,201,40,0.15)] relative overflow-hidden"
            >
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                {/* Balance Showcase */}
                <div className="md:col-span-7 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-[#FFC928] bg-[#FFC928]/15 border border-[#FFC928]/35 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-[#FFC928]" />
                      Real Cash Commission Wallet
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-[#7183A8] uppercase tracking-wider block">
                      AVAILABLE COMMISSION TO TRANSFER
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-[#00E5A0] font-mono tracking-tight flex items-center gap-2">
                      <span>₹{(stats?.commissionBalance ?? stats?.totalEarned ?? 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#A8B9DE]">
                    Total Lifetime Commission Earned:{' '}
                    <strong className="text-[#FFC928] font-mono">
                      ₹{(stats?.totalEarned ?? 0).toFixed(2)}
                    </strong>
                  </p>
                </div>

                {/* Transfer Actions */}
                <div className="md:col-span-5 flex flex-col sm:flex-row md:flex-col gap-2.5 justify-end">
                  <button
                    onClick={handleTransferCommission}
                    disabled={transferring || (stats?.commissionBalance ?? 0) <= 0}
                    className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-[#00E5A0] via-[#00D9FF] to-[#287BFF] hover:from-[#17F5B0] hover:to-[#428CFF] text-[#050B20] text-xs sm:text-sm font-black shadow-[0_0_20px_rgba(0,229,160,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {transferring ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-[#050B20] border-t-transparent animate-spin" />
                        <span>TRANSFERRING...</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        <span>TRANSFER TO MAIN WALLET</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-[11px] text-[#7183A8] px-1">
                    <span>⚡ Instant wallet credit</span>
                    <Link href="/deposit" className="text-[#00D9FF] hover:underline flex items-center gap-1 font-bold">
                      View Wallet <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── 5. INTERACTIVE COMMISSION CALCULATOR (FANCY FEATURE) ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="rounded-2xl p-5 sm:p-6 bg-[#0B1530]/85 border border-[#287BFF]/35 shadow-[0_0_20px_rgba(40,123,255,0.12)] backdrop-blur-md"
            >
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#FFC928]" />
                    <span>Commission Earnings Calculator</span>
                  </h3>
                  <p className="text-xs text-[#A8B9DE]">
                    Estimate your passive income based on your friend network size and daily turnover!
                  </p>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#FFC928]/15 text-[#FFC928] border border-[#FFC928]/35 uppercase">
                  Estimate
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Sliders */}
                <div className="space-y-4">
                  {/* Slider 1: Active Friends */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#94A3C4]">Invited Friends Playing:</span>
                      <span className="text-[#00E5A0] font-mono font-black text-sm">{calcInvites} Players</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={calcInvites}
                      onChange={(e) => setCalcInvites(Number(e.target.value))}
                      className="w-full accent-[#00E5A0] bg-[#070D1F] h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#7183A8] font-mono">
                      <span>1</span>
                      <span>50</span>
                      <span>100+</span>
                    </div>
                  </div>

                  {/* Slider 2: Average Daily Bet */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#94A3C4]">Avg. Daily Bet Per Friend:</span>
                      <span className="text-[#00D9FF] font-mono font-black text-sm">₹{calcAvgBet}</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="5000"
                      step="100"
                      value={calcAvgBet}
                      onChange={(e) => setCalcAvgBet(Number(e.target.value))}
                      className="w-full accent-[#00D9FF] bg-[#070D1F] h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#7183A8] font-mono">
                      <span>₹100</span>
                      <span>₹2,500</span>
                      <span>₹5,000</span>
                    </div>
                  </div>
                </div>

                {/* Output Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[#070D1F] border border-[#00E5A0]/35 text-center space-y-1 shadow-[0_0_15px_rgba(0,229,160,0.1)]">
                    <span className="text-[10px] font-extrabold text-[#7183A8] uppercase tracking-wider block">
                      Daily Passive Income
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-[#00E5A0] font-mono">
                      ₹{estimatedDaily.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-[#A8B9DE]">Credited each day</span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#070D1F] border border-[#FFC928]/35 text-center space-y-1 shadow-[0_0_15px_rgba(255,201,40,0.1)]">
                    <span className="text-[10px] font-extrabold text-[#7183A8] uppercase tracking-wider block">
                      Monthly Potential
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-[#FFC928] font-mono">
                      ₹{estimatedMonthly.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-[#A8B9DE]">30 days turnover</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── 6. HOW DOES IT WORK (3 VISUAL STEPS) ── */}
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#00D9FF]" />
                <span>How Does Referral Program Work?</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                {/* Step 1 */}
                <div className="rounded-2xl p-4 sm:p-5 bg-[#0B1530]/80 border border-[#287BFF]/30 shadow-md space-y-2.5 relative">
                  <div className="w-10 h-10 rounded-xl bg-[#00D9FF]/15 border border-[#00D9FF]/40 text-[#00D9FF] flex items-center justify-center font-black text-lg">
                    1
                  </div>
                  <h4 className="text-sm font-black text-white">Share Your Link</h4>
                  <p className="text-xs text-[#A8B9DE] leading-relaxed">
                    Copy your unique link or code and send it to friends, Telegram channels, WhatsApp groups or social media.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="rounded-2xl p-4 sm:p-5 bg-[#0B1530]/80 border border-[#287BFF]/30 shadow-md space-y-2.5 relative">
                  <div className="w-10 h-10 rounded-xl bg-[#00E5A0]/15 border border-[#00E5A0]/40 text-[#00E5A0] flex items-center justify-center font-black text-lg">
                    2
                  </div>
                  <h4 className="text-sm font-black text-white">Friends Play &amp; Bet</h4>
                  <p className="text-xs text-[#A8B9DE] leading-relaxed">
                    When your referred friends sign up and wager on Fast Parity, Mines, Crash, Sports or any other game.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="rounded-2xl p-4 sm:p-5 bg-[#0B1530]/80 border border-[#287BFF]/30 shadow-md space-y-2.5 relative">
                  <div className="w-10 h-10 rounded-xl bg-[#FFC928]/15 border border-[#FFC928]/40 text-[#FFC928] flex items-center justify-center font-black text-lg">
                    3
                  </div>
                  <h4 className="text-sm font-black text-white">Earn Real Cash Instantly</h4>
                  <p className="text-xs text-[#A8B9DE] leading-relaxed">
                    Earn up to 3 tiers of lifetime commission. Transfer commission directly to your main wallet with 1 click!
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Footer */}
            <DesktopFooter />
          </div>
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <BottomNavigation />

      {/* ── 7. RULES & FAQ MODAL ── */}
      <AnimatePresence>
        {showRulesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-[#0B1530] border border-[#287BFF]/50 p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#00E5A0]" />
                  <h3 className="text-base font-black text-white">Referral Terms &amp; Commission Rules</h3>
                </div>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-[#A8B9DE] leading-relaxed">
                <div className="p-3 rounded-xl bg-[#070D1F] border border-white/5 space-y-1">
                  <strong className="text-white block font-bold">1. How is commission calculated?</strong>
                  <p>
                    Commission is generated on settled bets across all games:
                    <br />• <strong>Level 1 (Direct Invites):</strong> 3.0% of bet turnover.
                    <br />• <strong>Level 2 (Sub Invites):</strong> 2.0% of bet turnover.
                    <br />• <strong>Level 3 (Deep Invites):</strong> 1.0% of bet turnover.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#070D1F] border border-white/5 space-y-1">
                  <strong className="text-white block font-bold">2. When is commission credited?</strong>
                  <p>
                    Commissions are credited automatically in real time as soon as game rounds settle. You can transfer your commission balance to your main wallet at any time.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#070D1F] border border-white/5 space-y-1">
                  <strong className="text-white block font-bold">3. Fair Play &amp; Multi-Account Prohibition</strong>
                  <p>
                    Self-referral through multiple accounts on the same device or IP address is strictly prohibited. Violators may forfeit earned referral bonuses.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#287BFF] hover:bg-[#3B8BFF] text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                I Understand
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
