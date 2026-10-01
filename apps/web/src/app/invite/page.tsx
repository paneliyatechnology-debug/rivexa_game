'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { GAMEHUB_ASSETS } from '@/config/gamehub-assets';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TopHeader, BottomNavigation } from '@/components/Navigation';
import { getApiBaseUrl } from '@/lib/config';

interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalEarned: number;
  level1Count: number;
  level2Count: number;
  level3Count: number;
  recentCommissions: any[];
}

export default function InvitePage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [fetching, setFetching] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

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
        setStats(data);
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

  const copyReferralLink = () => {
    const link = stats?.referralLink || `${getOrigin()}/register?ref=${user?.referralCode || ''}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || (isAuthenticated && fetching)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
        <p className="text-sm font-bold text-slate-400">Loading referral center...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const balance = user.wallet?.mainBalance ? parseFloat(user.wallet.mainBalance) : 0;
  const refCode = user.referralCode || 'PLAYER123';
  const refLink = stats?.referralLink || `${getOrigin()}/register?ref=${refCode}`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 font-sans">
      <TopHeader balance={balance} />

      <main className="p-4 space-y-4 max-w-[480px] mx-auto">
        {/* Banner Card */}
        <div className="relative rounded-2xl overflow-hidden p-4 bg-gradient-to-r from-[#090E2E] via-[#0F1E4C] to-[#08132C] border border-[#287BFF]/35 text-white shadow-xl space-y-3">
          <div className="relative z-10 space-y-2">
            <span className="text-[9px] font-black bg-[#00E5A0]/20 border border-[#00E5A0]/40 text-[#00E5A0] px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
              3-Tier MLM Commission
            </span>
            <h1 className="text-lg sm:text-xl font-black text-white leading-tight">Invite Friends &amp; Earn Lifetime</h1>
            <p className="text-xs text-[#A8B9DE] leading-relaxed">
              Earn <strong className="text-[#00E5A0]">3% Level 1</strong>, <strong className="text-[#00D9FF]">2% Level 2</strong>, and <strong className="text-[#287BFF]">1% Level 3</strong> lifetime commission on every bet!
            </p>
          </div>
          <div className="relative w-full h-40 sm:h-48 rounded-xl overflow-hidden border border-white/10 shadow-lg">
            <Image
              src={GAMEHUB_ASSETS.banners.inviteFriendsBanner}
              alt="Invite Friends Illustration"
              fill
              className="object-cover object-center"
              priority
            />
          </div>
        </div>

        {/* Share Referral Link Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <i className="bi bi-share-fill text-blue-600" />
            Your Referral Details
          </h2>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">Your Referral Code:</span>
              <strong className="font-mono text-sm font-black text-blue-600 uppercase bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                {refCode}
              </strong>
            </div>

            <div className="space-y-1 pt-1">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase">
                Unique Referral Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={refLink}
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-700 font-medium truncate"
                />
                <button
                  onClick={copyReferralLink}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm active:scale-95 transition-transform"
                >
                  {copied ? 'COPIED! ✓' : 'COPY LINK'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Tier MLM Breakdown Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm space-y-1">
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
              Level 1 (3%)
            </span>
            <div className="text-xl font-black text-slate-900 font-mono">
              {stats?.level1Count ?? 0}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold block">Direct Invites</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm space-y-1">
            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
              Level 2 (2%)
            </span>
            <div className="text-xl font-black text-slate-900 font-mono">
              {stats?.level2Count ?? 0}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold block">Sub Invites</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm space-y-1">
            <span className="text-[10px] font-extrabold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full inline-block">
              Level 3 (1%)
            </span>
            <div className="text-xl font-black text-slate-900 font-mono">
              {stats?.level3Count ?? 0}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold block">Deep Invites</span>
          </div>
        </div>

        {/* Total Commission Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              TOTAL COMMISSION EARNED
            </span>
            <div className="text-xl font-black text-emerald-600 font-mono">
              ₹{(stats?.totalEarned ?? 0).toFixed(2)}
            </div>
          </div>
          <button
            onClick={() => router.push('/deposit')}
            className="px-3.5 py-1.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition-colors"
          >
            Transfer to Main
          </button>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
