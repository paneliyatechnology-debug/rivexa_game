'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TopHeader, BottomNavigation } from '@/components/Navigation';
import { getApiBaseUrl } from '@/lib/config';

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

export default function TasksPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, refreshUser } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [fetching, setFetching] = useState<boolean>(true);
  const [couponCode, setCouponCode] = useState<string>('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingTask, setSubmittingTask] = useState<string | null>(null);
  const [submittingCoupon, setSubmittingCoupon] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  const loadTasks = async () => {
    const token = localStorage.getItem('rivexa_token');
    if (!token) return;

    setFetching(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadTasks();
    }
  }, [isAuthenticated]);

  const handleClaimTask = async (taskId: string) => {
    const token = localStorage.getItem('rivexa_token');
    if (!token) return;

    setMsg(null);
    setSubmittingTask(taskId);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/tasks/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to claim task.');

      setMsg({ type: 'success', text: data.message });
      await loadTasks();
      await refreshUser();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error claiming task reward.' });
    } finally {
      setSubmittingTask(null);
    }
  };

  const handleRedeemCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('rivexa_token');
    if (!token || !couponCode.trim()) return;

    setMsg(null);
    setSubmittingCoupon(true);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/tasks/redeem-coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: couponCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to redeem coupon.');

      setMsg({ type: 'success', text: data.message });
      setCouponCode('');
      await refreshUser();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error redeeming coupon.' });
    } finally {
      setSubmittingCoupon(false);
    }
  };

  if (loading || (isAuthenticated && fetching)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
        <p className="text-sm font-bold text-slate-400">Loading task rewards...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const balance = user.wallet?.mainBalance ? parseFloat(user.wallet.mainBalance) : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 font-sans">
      <TopHeader balance={balance} />

      <main className="p-4 space-y-4 max-w-[480px] mx-auto">
        {/* Top Header Card */}
        <div className="rounded-2xl p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-amber-300 text-2xl flex-shrink-0">
            <i className="bi bi-award-fill" />
          </div>
          <div>
            <h1 className="text-base font-black text-white">Task Reward Center</h1>
            <p className="text-xs text-emerald-100 opacity-90">
              Complete beginner and daily tasks to earn bonus cash!
            </p>
          </div>
        </div>

        {msg && (
          <div
            className={`p-3.5 rounded-xl text-xs font-bold ${
              msg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border border-rose-200 text-rose-700'
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Coupon Redemption Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <i className="bi bi-ticket-perforated-fill text-amber-500 text-base" />
            Redeem Secret Coupon
          </h2>
          <form onSubmit={handleRedeemCoupon} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Coupon Code (e.g. BONUS100)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              required
              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={submittingCoupon}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold shadow-sm active:scale-95 transition-transform whitespace-nowrap"
            >
              {submittingCoupon ? 'REDEEMING...' : 'REDEEM'}
            </button>
          </form>
        </div>

        {/* Tasks List Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <i className="bi bi-[#3B82F6] bi-list-check text-blue-600 text-base" />
            Available Player Tasks
          </h2>

          <div className="space-y-3">
            {tasks.map((task) => {
              const pct = Math.min(100, Math.round((task.progress / task.maxProgress) * 100));

              return (
                <div
                  key={task.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-black text-slate-900">{task.title}</h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {task.description}
                      </p>
                    </div>
                    <span className="text-xs font-black text-emerald-600 font-mono bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">
                      +₹{task.rewardAmount}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Progress</span>
                      <span>
                        {task.progress} / {task.maxProgress}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-end pt-1">
                    {task.isClaimed ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-600">
                        ✓ CLAIMED
                      </span>
                    ) : task.isCompleted ? (
                      <button
                        onClick={() => handleClaimTask(task.id)}
                        disabled={submittingTask === task.id}
                        className="px-4 py-1.5 rounded-full text-[10px] font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm active:scale-95 transition-transform"
                      >
                        {submittingTask === task.id ? 'CLAIMING...' : 'CLAIM REWARD'}
                      </button>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        IN PROGRESS
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
