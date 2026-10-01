'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/config';

export default function WalletHistoryPage() {
  const router = useRouter();
  const [historyTab, setHistoryTab] = useState<'withdrawals' | 'deposits' | 'ledger'>('withdrawals');
  const [historyDeposits, setHistoryDeposits] = useState<any[]>([]);
  const [historyWithdrawals, setHistoryWithdrawals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    const savedUser = localStorage.getItem('rivexa_user');
    const u = savedUser ? JSON.parse(savedUser) : { id: '00000000-0000-0000-0000-000000000000' };

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/wallet/history?userId=${u.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryDeposits(data.deposits || []);
        setHistoryWithdrawals(data.withdrawals || []);
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      {/* Header Banner */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3.5 flex items-center justify-between">
        <button
          onClick={() => router.push('/wallet')}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-xs font-bold bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700"
        >
          <i className="bi bi-arrow-left" /> Back to Wallet
        </button>
        <h1 className="font-black text-sm text-white tracking-wide">Live Transaction Records</h1>
        <button
          onClick={fetchHistory}
          className="text-xs text-slate-400 hover:text-white bg-slate-800/80 p-2 rounded-full border border-slate-700"
        >
          <i className="bi bi-arrow-clockwise" />
        </button>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Header Hero Banner */}
        <div className="rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-1">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <i className="bi bi-clock-history text-blue-400" /> Transaction & Settlement Records
          </h2>
          <p className="text-xs text-slate-400">
            Track all your deposits, withdrawals, and live settlement stages transparently.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-4">
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1 text-xs font-bold">
            <button
              onClick={() => setHistoryTab('withdrawals')}
              className={`flex-1 py-2.5 rounded-xl transition-all ${
                historyTab === 'withdrawals' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              Withdrawals Tracking
            </button>
            <button
              onClick={() => setHistoryTab('deposits')}
              className={`flex-1 py-2.5 rounded-xl transition-all ${
                historyTab === 'deposits' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              Recharge & Deposits
            </button>
            <button
              onClick={() => setHistoryTab('ledger')}
              className={`flex-1 py-2.5 rounded-xl transition-all ${
                historyTab === 'ledger' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              Wallet Ledger
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <i className="bi bi-arrow-repeat spin text-2xl text-blue-400 block mb-2" />
              Loading records...
            </div>
          ) : (
            <>
              {/* Withdrawals Tracking Tab */}
              {historyTab === 'withdrawals' && (
                <div className="space-y-3">
                  {historyWithdrawals.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      No withdrawal requests submitted yet.
                    </div>
                  ) : (
                    historyWithdrawals.map((w: any) => {
                      const isApproved = w.status === 'APPROVED';
                      const isRejected = w.status === 'REJECTED';
                      const isPending = w.status === 'PENDING';

                      return (
                        <div key={w.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                            <div>
                              <span className="font-mono text-xs text-blue-400 font-bold block">
                                #{w.id.slice(0, 8)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(w.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-black text-sm text-white block">
                                ₹{Number(w.amount).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Fee: ₹{Number(w.fee || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* 3-Step Stepper Progress Bar */}
                          <div className="grid grid-cols-3 gap-2 text-center py-1">
                            <div className="flex flex-col items-center">
                              <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-center mb-1">
                                ✓
                              </div>
                              <span className="text-[9px] font-bold text-emerald-400 uppercase">1. Submitted</span>
                            </div>

                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mb-1 ${
                                isPending
                                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                                  : 'bg-emerald-500 text-slate-950'
                              }`}>
                                {isPending ? '⏳' : '✓'}
                              </div>
                              <span className={`text-[9px] font-bold uppercase ${isPending ? 'text-amber-400' : 'text-emerald-400'}`}>
                                2. Admin Review
                              </span>
                            </div>

                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mb-1 ${
                                isApproved
                                  ? 'bg-emerald-500 text-slate-950'
                                  : isRejected
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-slate-800 text-slate-500'
                              }`}>
                                {isApproved ? '✓' : isRejected ? '✕' : '3'}
                              </div>
                              <span className={`text-[9px] font-bold uppercase ${
                                isApproved ? 'text-emerald-400' : isRejected ? 'text-rose-400' : 'text-slate-500'
                              }`}>
                                {isApproved ? '3. Transferred' : isRejected ? '3. Rejected' : '3. Settlement'}
                              </span>
                            </div>
                          </div>

                          <div className="bg-slate-900/60 p-2.5 rounded-xl flex justify-between items-center text-xs">
                            <span className="text-slate-400 truncate">
                              Target: <strong className="text-white">{w.bankAccount?.bankName || w.upiId || 'Bank Account'}</strong>
                            </span>
                            <span className={`font-bold text-[10px] px-2.5 py-0.5 rounded-full border ${
                              isApproved
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : isRejected
                                ? 'bg-rose-950 text-rose-400 border-rose-800'
                                : 'bg-amber-950 text-amber-400 border-amber-800'
                            }`}>
                              {w.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Recharge & Deposits Tab */}
              {historyTab === 'deposits' && (
                <div className="space-y-2">
                  {historyDeposits.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      No deposit records found.
                    </div>
                  ) : (
                    historyDeposits.map((d: any) => (
                      <div key={d.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-400">#{d.depositId}</span>
                            <button
                              onClick={() => router.push(`/deposit/checkout/${d.depositId}`)}
                              className="text-[10px] text-blue-400 underline font-semibold hover:text-blue-300"
                            >
                              View Checkout
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(d.createdAt).toLocaleString()} {d.utrNumber ? `(UTR: ${d.utrNumber})` : ''}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-emerald-400 block text-sm">
                            +₹{Number(d.amount).toFixed(2)}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            d.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400' :
                            d.status === 'REJECTED' ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Wallet Ledger Tab */}
              {historyTab === 'ledger' && (
                <div className="space-y-2">
                  {transactions.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      No transaction statements.
                    </div>
                  ) : (
                    transactions.map((t: any) => (
                      <div key={t.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-white uppercase text-[11px] block">
                            {t.type ? t.type.replace('_', ' ') : 'TRANSACTION'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(t.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-black text-sm block ${
                            Number(t.amount) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {Number(t.amount) >= 0 ? '+' : ''}₹{Number(t.amount).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Bal: ₹{Number(t.balanceAfter || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
