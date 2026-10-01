'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TopHeader, BottomNavigation } from '@/components/Navigation';
import { getApiBaseUrl } from '@/lib/config';

const REWARDS = [
  { day: 1, reward: 10 },
  { day: 2, reward: 15 },
  { day: 3, reward: 20 },
  { day: 4, reward: 25 },
  { day: 5, reward: 30 },
  { day: 6, reward: 40 },
  { day: 7, reward: 100 },
];

export default function DailyCheckinPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, refreshUser } = useAuth();

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
        <p className="text-sm font-bold text-slate-400">Loading daily check-in...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleClaim = async () => {
    setMessage(null);
    setSubmitting(true);

    try {
      const token = localStorage.getItem('rivexa_token');
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/wallet/daily-reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Already claimed today!');

      setMessage({
        type: 'success',
        text: `🎉 Claimed Day ${data.dayIndex} bonus of ₹${data.rewardAmount}! Added to main wallet balance.`,
      });
      await refreshUser();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to claim daily reward.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const balance = user.wallet?.mainBalance ? parseFloat(user.wallet.mainBalance) : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 font-sans">
      <TopHeader balance={balance} />

      <main className="p-4 space-y-4 max-w-[480px] mx-auto">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 text-3xl shadow-sm">
            <i className="bi bi-calendar-check-fill" />
          </div>

          <div>
            <h1 className="text-xl font-black text-slate-900">7-Day Streak Rewards 🎁</h1>
            <p className="text-xs text-slate-500 mt-1">
              Log in daily to unlock larger cash bonuses added directly to your wallet!
            </p>
          </div>

          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 py-2">
            {REWARDS.map((r) => (
              <div
                key={r.day}
                className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex flex-col items-center justify-center space-y-1 shadow-sm"
              >
                <span className="text-[9px] text-slate-500 font-bold uppercase">Day {r.day}</span>
                <span className="text-base font-black text-amber-600 font-mono">₹{r.reward}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleClaim}
            disabled={submitting}
            className="w-full py-3.5 text-xs font-extrabold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl shadow-md active:scale-95 transition-transform"
          >
            {submitting ? 'CLAIMING...' : "CLAIM TODAY'S REWARD 🎁"}
          </button>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
