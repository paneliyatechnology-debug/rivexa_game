'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/config';

export default function WalletPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'transfer' | 'history'>('deposit');
  
  // Wallet Balances
  const [balances, setBalances] = useState({
    mainBalance: 0,
    bonusBalance: 0,
    commissionBalance: 0,
    currency: 'INR',
  });
  const [user, setUser] = useState<any>(null);

  // Deposit State
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [depositAmount, setDepositAmount] = useState('500');
  const [depositUtr, setDepositUtr] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMessage, setDepositMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Withdraw State
  const [withdrawAmount, setWithdrawAmount] = useState('500');
  const [withdrawUpiId, setWithdrawUpiId] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Transfer State
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMessage, setTransferMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // History State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [historyDeposits, setHistoryDeposits] = useState<any[]>([]);
  const [historyWithdrawals, setHistoryWithdrawals] = useState<any[]>([]);
  const [historyTab, setHistoryTab] = useState<'withdrawals' | 'deposits' | 'ledger'>('withdrawals');

  const fetchWalletData = async (userId: string) => {
    try {
      const apiBase = getApiBaseUrl();
      const [balRes, histRes] = await Promise.all([
        fetch(`${apiBase}/wallet/balance?userId=${userId}`).then(r => r.json()).catch(() => null),
        fetch(`${apiBase}/wallet/history?userId=${userId}`).then(r => r.json()).catch(() => null),
      ]);

      if (balRes) {
        setBalances({
          mainBalance: Number(balRes.mainBalance || 0),
          bonusBalance: Number(balRes.bonusBalance || 0),
          commissionBalance: Number(balRes.commissionBalance || 0),
          currency: balRes.currency || 'INR',
        });
      }

      if (histRes) {
        setHistoryDeposits(histRes.deposits || []);
        setHistoryWithdrawals(histRes.withdrawals || []);
        setTransactions(histRes.transactions || []);
      }
    } catch (e) {
      console.error('Failed to load wallet data:', e);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('rivexa_user');
    const u = savedUser ? JSON.parse(savedUser) : { id: '00000000-0000-0000-0000-000000000000' };
    setUser(u);
    fetchWalletData(u.id);
  }, []);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositMessage(null);
    setDepositLoading(true);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/wallet/deposit/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || '00000000-0000-0000-0000-000000000000',
          amount: parseFloat(depositAmount),
          utrNumber: depositUtr,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Deposit request failed');

      setDepositMessage({ text: '✅ Deposit request generated! Redirecting to checkout...', type: 'success' });

      // Navigate to checkout if depositId exists
      if (data.depositId) {
        setTimeout(() => {
          router.push(`/deposit/checkout/${data.depositId}`);
        }, 1000);
      } else {
        fetchWalletData(user.id);
      }
    } catch (err: any) {
      setDepositMessage({ text: `❌ ${err.message}`, type: 'error' });
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawMessage(null);
    setWithdrawLoading(true);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/wallet/withdraw/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || '00000000-0000-0000-0000-000000000000',
          amount: parseFloat(withdrawAmount),
          upiId: withdrawUpiId,
          bankName,
          accountNumber,
          ifscCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Withdrawal request failed');

      setWithdrawMessage({ text: '✅ Withdrawal request submitted! Admin will verify and transfer funds shortly.', type: 'success' });
      fetchWalletData(user.id);
    } catch (err: any) {
      setWithdrawMessage({ text: `❌ ${err.message}`, type: 'error' });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferMessage(null);
    setTransferLoading(true);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/wallet/transfer-commission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || '00000000-0000-0000-0000-000000000000',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Transfer failed');

      setTransferMessage({ text: `✅ Transferred ₹${data.transferredAmount} commission balance to Main Wallet!`, type: 'success' });
      fetchWalletData(user.id);
    } catch (err: any) {
      setTransferMessage({ text: `❌ ${err.message}`, type: 'error' });
    } finally {
      setTransferLoading(false);
    }
  };

  const totalBalance = balances.mainBalance + balances.bonusBalance + balances.commissionBalance;

  return (
    <div className="min-h-screen bg-[#050B20] text-white font-sans pb-16">
      {/* Top Navigation Header */}
      <header className="border-b border-white/10 bg-[#08152E]/95 backdrop-blur-2xl sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-xs font-bold bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
          <i className="bi bi-arrow-left" /> Back to Games
        </a>
        <h1 className="font-black text-sm text-white tracking-wide flex items-center gap-2">
          <i className="bi bi-wallet2 text-blue-400" /> FIEWIN WALLET & RECHARGE
        </h1>
        <button
          onClick={() => user && fetchWalletData(user.id)}
          className="text-xs text-slate-400 hover:text-white bg-slate-800/80 p-2 rounded-full border border-slate-700"
          title="Refresh Balance"
        >
          <i className="bi bi-arrow-clockwise" />
        </button>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Wallet Summary Banner Card (Fiewin Design) */}
        <div className="relative overflow-hidden rounded-[24px] p-6 bg-gradient-to-br from-[#091735] via-[#101C3A] to-[#050B20] text-white shadow-2xl border border-[#287BFF]/40">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200/80 block">TOTAL WALLET BALANCE</span>
              <h2 className="text-3xl font-black font-mono tracking-tight text-white mt-1">
                ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold text-white shadow-sm">
              <i className="bi bi-shield-lock-fill text-emerald-400" /> SECURE
            </span>
          </div>

          {/* 3 Sub-balances grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/15">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10">
              <span className="text-[9px] font-bold text-blue-200/90 block uppercase truncate">MAIN BALANCE</span>
              <span className="text-sm font-bold font-mono text-white mt-0.5 block truncate">
                ₹{balances.mainBalance.toFixed(2)}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10">
              <span className="text-[9px] font-bold text-blue-200/90 block uppercase truncate">BONUS WALLET</span>
              <span className="text-sm font-bold font-mono text-emerald-300 mt-0.5 block truncate">
                ₹{balances.bonusBalance.toFixed(2)}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10">
              <span className="text-[9px] font-bold text-blue-200/90 block uppercase truncate">COMMISSION</span>
              <span className="text-sm font-bold font-mono text-amber-300 mt-0.5 block truncate">
                ₹{balances.commissionBalance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Tabs Navigation (Fiewin Segmented Pills) */}
        <div className="bg-[#091735] border border-[#287BFF]/35 rounded-[24px] p-5 shadow-2xl space-y-4">
          <div className="flex bg-[#101C3A] p-1.5 rounded-2xl border border-white/10 gap-1">
            <button
              onClick={() => setActiveTab('deposit')}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'deposit'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="bi bi-plus-circle-fill" /> Deposit
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'withdraw'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="bi bi-dash-circle-fill" /> Withdraw
            </button>
            <button
              onClick={() => setActiveTab('transfer')}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'transfer'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="bi bi-arrow-left-right" /> Transfer
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="bi bi-clock-history" /> History
            </button>
          </div>

          {/* TAB 1: DEPOSIT / RECHARGE */}
          {activeTab === 'deposit' && (
            <form onSubmit={handleDepositSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      paymentMethod === 'upi'
                        ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <i className="bi bi-qr-code-scan text-2xl text-blue-400" />
                      <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        +5% Extra
                      </span>
                    </div>
                    <span className="font-bold text-xs text-white">Instant UPI QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      paymentMethod === 'bank_transfer'
                        ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <i className="bi bi-bank text-2xl text-indigo-400" />
                      <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        +5% Extra
                      </span>
                    </div>
                    <span className="font-bold text-xs text-white">Direct Bank Transfer</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Deposit Amount (₹)
                </label>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {['200', '500', '1000', '2000', '5000'].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setDepositAmount(amt)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        depositAmount === amt
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 font-bold font-mono">₹</span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min="100"
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-base focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  12-Digit UTR / Reference No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 329871239812 (Or enter on checkout)"
                  value={depositUtr}
                  onChange={(e) => setDepositUtr(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  You can also submit UTR and view assigned QR details on the next checkout screen.
                </p>
              </div>

              {depositMessage && (
                <div className={`p-3.5 rounded-xl text-xs font-bold ${
                  depositMessage.type === 'success'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                }`}>
                  {depositMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={depositLoading}
                className="w-full py-4 text-sm font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 rounded-2xl shadow-xl shadow-blue-600/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {depositLoading ? <i className="bi bi-arrow-repeat spin text-lg" /> : <i className="bi bi-wallet2 text-lg" />}
                PROCEED TO RECHARGE 🚀
              </button>
            </form>
          )}

          {/* TAB 2: WITHDRAW */}
          {activeTab === 'withdraw' && (
            <form onSubmit={handleWithdrawSubmit} className="space-y-4 pt-1">
              <div className="bg-amber-950/30 border border-amber-800/40 rounded-2xl p-3.5 text-xs text-amber-200">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-400">
                  <i className="bi bi-exclamation-triangle-fill text-amber-400" /> Fast Settlement Guarantee
                </div>
                Withdrawals are audited & processed directly into your registered Bank / UPI account within 10-30 minutes.
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Withdrawal Amount (₹)
                </label>
                <div className="relative mb-1">
                  <span className="absolute left-4 top-3 text-slate-400 font-bold font-mono">₹</span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min="100"
                    placeholder="Min ₹100"
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-base focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between font-mono">
                  <span>Available Balance:</span>
                  <span className="font-bold text-emerald-400">₹{balances.mainBalance.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Target UPI ID (Option A)
                </label>
                <input
                  type="text"
                  placeholder="e.g. username@upi"
                  value={withdrawUpiId}
                  onChange={(e) => setWithdrawUpiId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  OR Bank Transfer Details (Option B)
                </span>
                <input
                  type="text"
                  placeholder="Bank Name (e.g. HDFC Bank)"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Account Number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="IFSC Code"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {withdrawMessage && (
                <div className={`p-3.5 rounded-xl text-xs font-bold ${
                  withdrawMessage.type === 'success'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                }`}>
                  {withdrawMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={withdrawLoading}
                className="w-full py-4 text-sm font-black text-slate-950 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {withdrawLoading ? <i className="bi bi-arrow-repeat spin text-lg" /> : <i className="bi bi-arrow-up-circle-fill text-lg" />}
                SUBMIT WITHDRAWAL REQUEST 💸
              </button>
            </form>
          )}

          {/* TAB 3: TRANSFER */}
          {activeTab === 'transfer' && (
            <form onSubmit={handleTransferSubmit} className="space-y-4 pt-1">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Available Commission Balance</span>
                <span className="text-2xl font-black font-mono text-amber-400 block">
                  ₹{balances.commissionBalance.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Transfer Amount to Main Wallet (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 font-bold font-mono">₹</span>
                  <input
                    type="number"
                    value={transferAmount || balances.commissionBalance}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    max={balances.commissionBalance}
                    min="1"
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-base focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {transferMessage && (
                <div className={`p-3.5 rounded-xl text-xs font-bold ${
                  transferMessage.type === 'success'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                }`}>
                  {transferMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={transferLoading || balances.commissionBalance <= 0}
                className="w-full py-4 text-sm font-black text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transferLoading ? <i className="bi bi-arrow-repeat spin text-lg" /> : <i className="bi bi-arrow-left-right text-lg" />}
                TRANSFER TO MAIN BALANCE 🔄
              </button>
            </form>
          )}

          {/* TAB 4: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4 pt-1">
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs font-bold">
                <button
                  onClick={() => setHistoryTab('withdrawals')}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    historyTab === 'withdrawals' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Withdrawals Tracking
                </button>
                <button
                  onClick={() => setHistoryTab('deposits')}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    historyTab === 'deposits' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Deposits
                </button>
                <button
                  onClick={() => setHistoryTab('ledger')}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    historyTab === 'ledger' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ledger
                </button>
              </div>

              {/* Sub-tab 1: Withdrawals Live Stepper */}
              {historyTab === 'withdrawals' && (
                <div className="space-y-3">
                  {historyWithdrawals.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs font-medium">
                      No withdrawal requests found.
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
                                Net: ₹{Number(w.netAmount || w.amount).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Fiewin 3-Step Stepper Progress Bar */}
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
                            <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full border ${
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

              {/* Sub-tab 2: Deposits */}
              {historyTab === 'deposits' && (
                <div className="space-y-2">
                  {historyDeposits.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs font-medium">
                      No deposit records found.
                    </div>
                  ) : (
                    historyDeposits.map((d: any) => (
                      <div key={d.id} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex justify-between items-center text-xs">
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

              {/* Sub-tab 3: Ledger */}
              {historyTab === 'ledger' && (
                <div className="space-y-2">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs font-medium">
                      No transaction statements.
                    </div>
                  ) : (
                    transactions.map((t: any) => (
                      <div key={t.id} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex justify-between items-center text-xs">
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
