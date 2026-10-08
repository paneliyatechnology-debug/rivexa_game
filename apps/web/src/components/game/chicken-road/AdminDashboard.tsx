'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LayoutDashboard, Users, TrendingUp, DollarSign, ShieldAlert, Settings, RefreshCw } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, roundsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/chicken-road/dashboard`),
        axios.get(`${API_BASE_URL}/admin/chicken-road/rounds?limit=15`),
      ]);
      setStats(statsRes.data.data);
      setRounds(roundsRes.data.data.items || []);
    } catch (err) {
      // Silently ignore fetch errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div className="min-h-screen bg-[#141414] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-amber-400" />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Chicken Road Admin Management</h1>
              <p className="text-xs text-zinc-400">Real-time statistics, difficulty controls, and audit logs</p>
            </div>
          </div>

          <button
            onClick={fetchAdminData}
            className="flex items-center gap-2 bg-[#282828] hover:bg-[#383838] border border-[#444] px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Stats Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1e1e1e] border border-[#333] p-5 rounded-2xl flex flex-col gap-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Total Rounds</span>
            <span className="text-3xl font-extrabold text-amber-400">{stats?.totalRounds || 0}</span>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333] p-5 rounded-2xl flex flex-col gap-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Total Wagered</span>
            <span className="text-3xl font-extrabold text-emerald-400">₹{(stats?.totalWagered || 0).toLocaleString()}</span>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333] p-5 rounded-2xl flex flex-col gap-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Total Payouts</span>
            <span className="text-3xl font-extrabold text-blue-400">₹{(stats?.totalPayout || 0).toLocaleString()}</span>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333] p-5 rounded-2xl flex flex-col gap-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Gross Profit</span>
            <span className="text-3xl font-extrabold text-purple-400">₹{(stats?.grossProfit || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Admin Rounds Table */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-zinc-200">Recent Game Rounds</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#333] text-zinc-400 uppercase">
                  <th className="p-3">Round ID</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Bet</th>
                  <th className="p-3">Difficulty</th>
                  <th className="p-3">Checkpoint</th>
                  <th className="p-3">Multiplier</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Payout</th>
                </tr>
              </thead>
              <tbody>
                {rounds.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-zinc-500 font-sans">
                      No game rounds recorded yet.
                    </td>
                  </tr>
                ) : (
                  rounds.map((r) => (
                    <tr key={r.id} className="border-b border-[#292929] hover:bg-[#252525]">
                      <td className="p-3 text-amber-400 font-bold">{r.publicId || r.id.substring(0, 8)}</td>
                      <td className="p-3 text-zinc-300">{r.user?.email || r.userId.substring(0, 8)}</td>
                      <td className="p-3 text-emerald-400 font-bold">₹{Number(r.betAmount)}</td>
                      <td className="p-3 text-zinc-400 uppercase">{r.difficultyId}</td>
                      <td className="p-3 text-zinc-300">{r.currentCheckpoint}</td>
                      <td className="p-3 text-amber-300">{Number(r.currentMultiplier).toFixed(2)}x</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold ${
                            r.status === 'CASHED_OUT'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : r.status === 'CRASHED'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-300'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 font-bold">
                        {r.gameResult ? `₹${Number(r.gameResult.grossPayout).toFixed(2)}` : '₹0.00'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
