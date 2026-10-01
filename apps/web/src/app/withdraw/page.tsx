'use client';

import React, { useState } from 'react';
import { getApiBaseUrl } from '@/lib/config';

export default function WithdrawPage() {
  const [amount, setAmount] = useState('500');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [message, setMessage] = useState('');

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const savedUser = localStorage.getItem('rivexa_user');
    const user = savedUser ? JSON.parse(savedUser) : { id: 'demo_user' };

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/wallet/withdraw/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: parseFloat(amount),
          upiId,
          accountNumber,
          ifscCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Withdrawal request failed');

      setMessage('✅ Withdrawal request submitted! Funds will be transferred to your account upon Admin approval.');
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-slate-400 hover:text-white transition-colors text-sm font-semibold">
          ← Back to Lobby
        </a>
        <h1 className="font-extrabold text-lg text-white">Withdrawal Cashout</h1>
        <span className="w-12" />
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto p-6 flex flex-col justify-center">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white">Request Payout</h2>
            <p className="text-xs text-slate-400">Withdraw winnings directly to your UPI ID or Bank</p>
          </div>

          {message && (
            <div className="p-4 rounded-xl text-xs font-bold bg-slate-950 border border-slate-800 text-emerald-400">
              {message}
            </div>
          )}

          <form onSubmit={handleWithdrawSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Withdrawal Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">UPI ID (Option A)</label>
              <input
                type="text"
                placeholder="yourname@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="border-t border-slate-800 pt-3">
              <span className="text-[10px] text-slate-500 uppercase font-mono block mb-2">OR Bank Transfer Details (Option B)</span>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Bank Account Number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="IFSC Code"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 text-base font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 rounded-2xl shadow-xl active:scale-95"
            >
              REQUEST CASHOUT 💰
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
