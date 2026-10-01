'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/config';

export default function DepositCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const depositId = (params?.depositId as string) || '';

  const [deposit, setDeposit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [utrNumber, setUtrNumber] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [userRemarks, setUserRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(1800); // 30 mins in seconds

  const fetchDepositDetails = async () => {
    if (!depositId) return;
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/wallet/deposit-details/${depositId}`);
      if (!res.ok) throw new Error('Deposit request not found');
      const data = await res.json();
      setDeposit(data);
      if (data.utrNumber) setUtrNumber(data.utrNumber);

      if (data.expiresAt) {
        const diff = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
        setTimeLeft(diff);
      }
    } catch (e) {
      console.error('Failed to fetch deposit details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepositDetails();
    const interval = setInterval(() => {
      fetchDepositDetails();
    }, 10000); // Auto-poll every 10s for status updates
    return () => clearInterval(interval);
  }, [depositId]);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const savedUser = localStorage.getItem('rivexa_user');
    const user = savedUser ? JSON.parse(savedUser) : { id: '00000000-0000-0000-0000-000000000000' };

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/wallet/deposit/proof/${depositId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          utrNumber: utrNumber.trim(),
          proofUrl: proofUrl.trim() || undefined,
          userRemarks: userRemarks.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');

      setMessage({ text: '✅ Payment proof & UTR submitted successfully! Pending admin verification.', type: 'success' });
      fetchDepositDetails();
    } catch (err: any) {
      setMessage({ text: `❌ ${err.message}`, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <i className="bi bi-arrow-repeat spin text-4xl text-blue-400 block" />
          <p className="text-sm text-slate-400 font-bold">Loading Deposit Checkout...</p>
        </div>
      </div>
    );
  }

  const merchant = deposit?.merchantAccount || {
    name: 'Rivexa Official Collection Account',
    accountHolder: 'Rivexa Gaming Solutions',
    upiId: 'rivexa.pay@upi',
    qrImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=rivexa.pay@upi&pn=RivexaGames',
    bankName: 'HDFC Bank',
    accountNumber: '50200012345678',
    ifsc: 'HDFC0001234',
  };

  const isApproved = deposit?.status === 'APPROVED';
  const isRejected = deposit?.status === 'REJECTED';
  const isExpired = deposit?.isExpired || (timeLeft === 0 && deposit?.status === 'PENDING' && !deposit?.utrNumber);
  const isVerified = deposit?.status === 'VERIFIED' || !!deposit?.utrNumber;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3.5 flex items-center justify-between">
        <button
          onClick={() => router.push('/wallet')}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-xs font-bold bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700"
        >
          <i className="bi bi-arrow-left" /> Back to Wallet
        </button>
        <div className="text-center">
          <h1 className="font-black text-sm text-white tracking-wide">Deposit Checkout</h1>
          <span className="text-[10px] font-mono text-blue-400 block">#{depositId}</span>
        </div>
        <button
          onClick={fetchDepositDetails}
          className="text-xs text-slate-400 hover:text-white bg-slate-800/80 p-2 rounded-full border border-slate-700"
        >
          <i className="bi bi-arrow-clockwise" />
        </button>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Status Banner & Timer Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
              Deposit Status
            </span>
            {isApproved ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold">
                <i className="bi bi-check-circle-fill" /> APPROVED & CREDITED
              </span>
            ) : isRejected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-xs font-bold">
                <i className="bi bi-x-circle-fill" /> REJECTED
              </span>
            ) : isExpired ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold">
                <i className="bi bi-clock-history" /> EXPIRED
              </span>
            ) : isVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-xs font-bold">
                <i className="bi bi-hourglass-split" /> PENDING ADMIN VERIFICATION
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-xs font-bold">
                <i className="bi bi-info-circle-fill" /> AWAITING PAYMENT & UTR
              </span>
            )}
          </div>

          {!isApproved && !isRejected && !isExpired && (
            <div className="text-right">
              <span className="text-[9px] font-extrabold text-rose-400 uppercase tracking-widest block mb-0.5">
                Time Remaining
              </span>
              <span className="text-xl font-black font-mono text-rose-400 animate-pulse">
                {formatTimer(timeLeft)}
              </span>
            </div>
          )}
        </div>

        {/* Authorized Merchant Collection Details Banner (Fiewin Design) */}
        <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-extrabold uppercase tracking-wider">
              AUTHORIZED MERCHANT
            </span>
            <span className="text-2xl font-black font-mono text-amber-400">
              ₹{Number(deposit?.amount || 500).toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="col-span-2 space-y-1">
              <h3 className="text-base font-extrabold text-white">{merchant.name}</h3>
              <p className="text-xs text-slate-400">
                Account Holder: <strong className="text-slate-200">{merchant.accountHolder || merchant.name}</strong>
              </p>
            </div>

            {merchant.qrImage && (
              <div className="text-right">
                <img
                  src={merchant.qrImage}
                  alt="Merchant QR Code"
                  onClick={() => setShowQrModal(true)}
                  className="w-20 h-20 ml-auto rounded-2xl border-2 border-white/20 shadow-md cursor-pointer hover:scale-105 transition-all"
                />
                <span
                  onClick={() => setShowQrModal(true)}
                  className="text-[9px] font-bold text-amber-400 cursor-pointer block mt-1 hover:underline"
                >
                  Tap QR to Zoom 🔍
                </span>
              </div>
            )}
          </div>

          {/* UPI Copy Box */}
          {merchant.upiId && (
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-dashed border-blue-500/30 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">MERCHANT UPI ID</span>
                <span className="text-sm font-bold font-mono text-amber-400">{merchant.upiId}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(merchant.upiId)}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <i className="bi bi-copy" /> {copied ? 'COPIED!' : 'COPY'}
              </button>
            </div>
          )}

          {/* Bank Account Transfer Details */}
          {merchant.bankName && (
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">BANK TRANSFER DETAILS</span>
              <div className="flex justify-between">
                <span className="text-slate-400">Bank Name:</span>
                <span className="font-bold text-white">{merchant.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account Number:</span>
                <span className="font-mono font-bold text-amber-400">{merchant.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">IFSC Code:</span>
                <span className="font-mono font-bold text-white">{merchant.ifsc}</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment Proof / UTR Submission Form */}
        {!isApproved && !isRejected && !isExpired && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
              <i className="bi bi-upload text-blue-400" /> Submit UTR & Payment Proof
            </h4>

            <form onSubmit={handleProofSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  12-Digit UTR / Reference Transaction No. <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter 12-digit UTR from GPay / PhonePe / Paytm"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Payment Screenshot URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Paste Image URL / Proof Link"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  User Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Any note for Admin"
                  value={userRemarks}
                  onChange={(e) => setUserRemarks(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {message && (
                <div className={`p-3.5 rounded-xl text-xs font-bold ${
                  message.type === 'success'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                }`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 text-sm font-black text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 rounded-2xl shadow-xl shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <i className="bi bi-arrow-repeat spin text-lg" /> : <i className="bi bi-check-circle-fill text-lg" />}
                SUBMIT UTR FOR VERIFICATION 🚀
              </button>
            </form>
          </div>
        )}

        {/* Fiewin 4-Step Processing Timeline Stepper */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
            <i className="bi bi-list-check text-blue-400" /> Deposit Timeline & Settlement
          </h4>

          <div className="space-y-4 relative pl-3 before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-800">
            {/* Step 1 */}
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                ✓
              </div>
              <div>
                <h5 className="font-bold text-xs text-white">1. Request Generated</h5>
                <p className="text-[11px] text-slate-400">
                  Deposit #{depositId} created & assigned to {merchant.name}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4 relative z-10">
              <div className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                isVerified || isApproved
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-amber-500 text-slate-950 animate-pulse'
              }`}>
                {isVerified || isApproved ? '✓' : '2'}
              </div>
              <div>
                <h5 className="font-bold text-xs text-white">2. Payment & UTR Submission</h5>
                <p className="text-[11px] text-slate-400">
                  {deposit?.utrNumber
                    ? `UTR #${deposit.utrNumber} submitted successfully`
                    : `Transfer ₹${Number(deposit?.amount || 500).toFixed(2)} & enter 12-digit UTR`}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4 relative z-10">
              <div className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                isApproved
                  ? 'bg-emerald-500 text-slate-950'
                  : isRejected
                  ? 'bg-rose-500 text-white'
                  : isVerified
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {isApproved ? '✓' : isRejected ? '✕' : '3'}
              </div>
              <div>
                <h5 className="font-bold text-xs text-white">3. Admin Verification</h5>
                <p className="text-[11px] text-slate-400">
                  {isApproved
                    ? 'Verified & Approved by Admin'
                    : isRejected
                    ? `Rejected: ${deposit?.adminNotes || 'Invalid UTR'}`
                    : isVerified
                    ? 'Admin is auditing statement & UTR reference'
                    : 'Pending payment proof'}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-4 relative z-10">
              <div className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                isApproved
                  ? 'bg-emerald-500 text-slate-950'
                  : isRejected
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {isApproved ? '✓' : isRejected ? '✕' : '4'}
              </div>
              <div>
                <h5 className="font-bold text-xs text-white">4. Wallet Credit Settlement</h5>
                <p className="text-[11px] text-slate-400">
                  {isApproved
                    ? `₹${Number(deposit?.amount || 500).toFixed(2)} credited to main wallet balance!`
                    : isRejected
                    ? 'Deposit rejected. Contact support if needed.'
                    : 'Awaiting settlement completion'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* QR Zoom Modal */}
      {showQrModal && merchant.qrImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center">
            <h3 className="font-extrabold text-base text-white">Scan Merchant QR Code</h3>
            <img src={merchant.qrImage} alt="Zoomed QR" className="w-64 h-64 mx-auto rounded-2xl border-2 border-white/20" />
            <p className="text-xs font-mono text-amber-400">{merchant.upiId}</p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
