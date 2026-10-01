'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Clock, TrendingUp, ArrowRight, Activity, Trophy } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/config';

interface ActivityRecord {
  id: string;
  gameName: string;
  userId: string;
  betAmount: number;
  result: 'won' | 'lost';
  winAmount: number;
  createdAt: string;
}

interface TopWinner {
  username: string;
  amount: number;
}

const GAME_ICONS: Record<string, string> = {
  'fast-parity': '⚡',
  parity: '🕐',
  mines: '💣',
  crash: '🚀',
  jet: '✈️',
  spin: '🎡',
  dice: '🎲',
  'andar-bahar': '🃏',
  'coin-flip': '🪙',
  pushparani: '🎮',
};

function maskUserId(userId: string): string {
  if (!userId) return '#Unknown';
  const str = userId.toString();
  if (str.length <= 4) return `#${str}`;
  return `#${str.slice(0, 2)}***${str.slice(-3)}`;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

const MOCK_ACTIVITIES: ActivityRecord[] = [
  { id: '1', gameName: 'Fast Parity', userId: 'EB98CFD', betAmount: 100, result: 'won', winAmount: 180, createdAt: new Date(Date.now() - 120000).toISOString() },
  { id: '2', gameName: 'Crash', userId: 'A41D6941', betAmount: 50, result: 'lost', winAmount: 0, createdAt: new Date(Date.now() - 300000).toISOString() },
  { id: '3', gameName: 'Mines', userId: 'D09FA1FA', betAmount: 100, result: 'won', winAmount: 160, createdAt: new Date(Date.now() - 480000).toISOString() },
  { id: '4', gameName: 'JetX Flight', userId: 'FFA3CB02', betAmount: 50, result: 'won', winAmount: 120, createdAt: new Date(Date.now() - 720000).toISOString() },
];

const MOCK_TOP_WINNERS: TopWinner[] = [
  { username: 'Rohit***', amount: 12450 },
  { username: 'Lucky***', amount: 8760 },
  { username: 'Game***', amount: 6320 },
];

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityRecord[]>(MOCK_ACTIVITIES);
  const [topWinners, setTopWinners] = useState<TopWinner[]>(MOCK_TOP_WINNERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = getApiBaseUrl();
        const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
        if (!token) return;

        const [actRes, winnersRes] = await Promise.all([
          fetch(`${apiUrl}/bets/recent?limit=5`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
          fetch(`${apiUrl}/bets/top-winners?limit=3`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        ]);

        if (actRes?.ok) {
          const data = await actRes.json();
          if (Array.isArray(data) && data.length > 0) setActivities(data);
        }
        if (winnersRes?.ok) {
          const data = await winnersRes.json();
          if (Array.isArray(data) && data.length > 0) setTopWinners(data);
        }
      } catch (e) {
        // Keep mock data if API fails
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-[#08132C] border border-white/10 p-5 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/10 rounded w-2/3" />
              <div className="h-2 bg-white/5 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Recent Activity List */}
      <div className="lg:col-span-2 rounded-2xl bg-[#08132C] border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-black text-white">Recent Activity</h3>
          </div>
          <Link href="/profile" className="flex items-center gap-1 text-xs font-bold text-cyan-400 hover:underline">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="divide-y divide-white/5">
          {activities.map((act, i) => (
            <motion.div
              key={act.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors"
            >
              <div className="w-9 h-9 shrink-0 rounded-full bg-[#101C3A] border border-white/10 flex items-center justify-center text-base">
                {GAME_ICONS[act.gameName?.toLowerCase().replace(/\s/g, '-')] || '🎮'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">{act.gameName}</span>
                </div>
                <p className="text-[10px] text-[#7285AE]">
                  {maskUserId(act.userId)} • ₹{act.betAmount}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-xs font-black ${act.result === 'won' ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {act.result === 'won' ? `Won +₹${act.winAmount}` : `Lost -₹${act.betAmount}`}
                </div>
                <p className="text-[10px] text-[#7285AE] flex items-center justify-end gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {timeAgo(act.createdAt)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Top Winners Panel */}
      <div className="rounded-2xl bg-[#08132C] border border-white/10 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-black text-white">Top Winners</h3>
        </div>

        <div className="p-4 space-y-3">
          {topWinners.map((winner, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border shrink-0 ${
                i === 0 ? 'bg-amber-500/20 border-amber-400/40 text-amber-400' :
                i === 1 ? 'bg-slate-500/20 border-slate-400/40 text-slate-400' :
                'bg-amber-800/20 border-amber-700/40 text-amber-700'
              }`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{winner.username}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] font-black text-emerald-400">₹{winner.amount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
