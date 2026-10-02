'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { TopHeader, BottomNavigation, DesktopFooter } from '@/components/Navigation';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { getApiBaseUrl } from '@/lib/config';
import {
  User,
  Lock,
  ShieldCheck,
  Landmark,
  Plus,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  LogOut,
  FileText,
  HeartPulse,
  MapPin,
  Headphones,
  Check,
  CreditCard
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout, refreshUser, balance: authBalance } = useAuth();
  const [balance, setBalance] = useState<number>(authBalance || 0);

  // Add Bank Modal State
  const [showBankModal, setShowBankModal] = useState(false);
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankMsg, setBankMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingBank, setSubmittingBank] = useState(false);

  // Update Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingPwd, setSubmittingPwd] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B20] text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-4 border-[#00D9FF]/20 border-t-[#00D9FF] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-xs">👤</div>
        </div>
        <p className="text-sm font-bold text-[#A8B9DE] mt-4 tracking-wide">Loading Profile...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankMsg(null);
    setSubmittingBank(true);

    try {
      const token = localStorage.getItem('rivexa_token');
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/auth/add-bank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountHolder,
          bankName,
          accountNumber,
          ifscCode,
          upiId: upiId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add bank account.');

      setBankMsg({ type: 'success', text: data.message || 'Bank account added successfully!' });
      setAccountHolder('');
      setBankName('');
      setAccountNumber('');
      setIfscCode('');
      setUpiId('');
      setShowBankModal(false);
      await refreshUser();
    } catch (err: any) {
      setBankMsg({ type: 'error', text: err.message || 'Error submitting bank details.' });
    } finally {
      setSubmittingBank(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setSubmittingPwd(true);

    try {
      const token = localStorage.getItem('rivexa_token');
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/auth/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update password.');

      setPwdMsg({ type: 'success', text: data.message || 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.message || 'Error updating password.' });
    } finally {
      setSubmittingPwd(false);
    }
  };

  const displayName = user.name || 'Sharma ji';

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
        <DesktopSidebar activeCategory="profile" />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 pb-24 lg:pb-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">

            {/* ── Top Breadcrumb ── */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-[#94A3C4]">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span className="text-[#94A3C4]/60">&gt;</span>
              <span className="text-[#00E5FF] font-bold">My Profile</span>
            </nav>

            {/* ── 1. USER PROFILE INFORMATION CARD ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="rounded-[24px] p-5 sm:p-6 bg-[#091735]/90 border border-[#287BFF]/35 shadow-[0_0_30px_rgba(40,123,255,0.18)] backdrop-blur-xl relative overflow-hidden"
            >
              {/* Internal neon ambient glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#873BFF]/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
                {/* Avatar */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#873BFF] via-[#287BFF] to-[#00D9FF] p-0.5 shadow-[0_0_20px_rgba(40,123,255,0.35)] shrink-0">
                  <div className="w-full h-full rounded-[14px] bg-[#091735] flex items-center justify-center text-white">
                    <User className="w-8 h-8 sm:w-10 sm:h-10 text-[#00D9FF]" />
                  </div>
                </div>

                {/* Profile Details */}
                <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                      {displayName}
                    </h1>

                    {/* Status Badges matching Screenshot */}
                    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                        STATUS: {(user.status || 'ACTIVE').toUpperCase()}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black bg-blue-500/15 text-[#00D9FF] border border-[#287BFF]/40 uppercase tracking-wider shadow-[0_0_12px_rgba(40,123,255,0.2)]">
                        KYC: {(user.kycStatus || 'PENDING').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs text-[#94A3C4] font-medium pt-1">
                    <span className="flex items-center gap-1.5 bg-[#070D1F] px-2.5 py-1 rounded-lg border border-white/5">
                      <Phone className="w-3.5 h-3.5 text-[#00D9FF]" />
                      <span>{user.phone || '+91 98765 43210'}</span>
                    </span>
                    <span className="flex items-center gap-1.5 bg-[#070D1F] px-2.5 py-1 rounded-lg border border-white/5 truncate max-w-full">
                      <Mail className="w-3.5 h-3.5 text-[#873BFF]" />
                      <span className="truncate">{user.email}</span>
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── 2. BANK ACCOUNTS SECTION ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
              className="rounded-2xl p-5 sm:p-6 bg-[#0B1530]/85 border border-[#287BFF]/30 shadow-[0_0_20px_rgba(40,123,255,0.12)] backdrop-blur-md space-y-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2.5">
                  <Landmark className="w-4 h-4 text-[#00D9FF]" />
                  <span>Bank Accounts</span>
                </h2>
                <button
                  onClick={() => setShowBankModal(true)}
                  className="px-4 py-1.5 rounded-full text-xs font-black text-[#050B20] bg-gradient-to-r from-[#00D9FF] to-[#287BFF] hover:from-[#33E0FF] hover:to-[#428CFF] active:scale-95 transition-all shadow-[0_0_15px_rgba(0,217,255,0.3)] flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add Bank</span>
                </button>
              </div>

              {bankMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    bankMsg.type === 'success'
                      ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/35 text-rose-300'
                  }`}
                >
                  {bankMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{bankMsg.text}</span>
                </div>
              )}

              {user.bankAccounts && user.bankAccounts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {user.bankAccounts.map((bank: any) => {
                    const status = (bank.status || 'pending').toLowerCase();
                    return (
                      <div
                        key={bank.id}
                        className="p-4 bg-[#070D1F] border border-[#287BFF]/30 rounded-xl space-y-2 shadow-inner"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-black text-xs sm:text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-[#00D9FF]" />
                            {bank.bankName}
                          </span>
                          {status === 'approved' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/35">
                              APPROVED
                            </span>
                          ) : status === 'rejected' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/35">
                              REJECTED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/35">
                              PENDING VERIFICATION
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#A8B9DE] font-mono">
                          A/C: <strong className="text-white font-mono">{bank.accountNumber}</strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#7183A8] pt-1 border-t border-white/5">
                          <span>IFSC: <strong className="text-white font-mono">{bank.ifscCode}</strong></span>
                          <span>Holder: <strong className="text-[#00D9FF]">{bank.holderName}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-[#070D1F]/60 border border-white/5 text-center">
                  <p className="text-xs text-[#7285AE] font-medium">No bank accounts linked yet.</p>
                </div>
              )}
            </motion.div>

            {/* ── 3. UPDATE PASSWORD SECTION ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' }}
              className="rounded-2xl p-5 sm:p-6 bg-[#0B1530]/85 border border-[#287BFF]/30 shadow-[0_0_20px_rgba(40,123,255,0.12)] backdrop-blur-md space-y-4"
            >
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-[#00D9FF]" />
                <span>Update Password</span>
              </h2>

              {pwdMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    pwdMsg.type === 'success'
                      ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/35 text-rose-300'
                  }`}
                >
                  {pwdMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{pwdMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#7183A8] uppercase tracking-wider mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1F] border border-[#287BFF]/35 text-xs sm:text-sm text-white placeholder-[#5A6D96] font-medium focus:outline-none focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF]/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#7183A8] uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password (min. 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1F] border border-[#287BFF]/35 text-xs sm:text-sm text-white placeholder-[#5A6D96] font-medium focus:outline-none focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF]/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#7183A8] uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1F] border border-[#287BFF]/35 text-xs sm:text-sm text-white placeholder-[#5A6D96] font-medium focus:outline-none focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF]/40 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingPwd}
                  className="w-full py-3 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#287BFF] to-[#1A5ED8] hover:from-[#3B8BFF] hover:to-[#287BFF] active:scale-98 rounded-xl shadow-[0_0_15px_rgba(40,123,255,0.35)] transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submittingPwd ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>UPDATING...</span>
                    </>
                  ) : (
                    <span>UPDATE PASSWORD</span>
                  )}
                </button>
              </form>
            </motion.div>

            {/* ── 4. LEGAL, COMPLIANCE & SUPPORT SECTION ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
              className="rounded-2xl p-5 sm:p-6 bg-[#0B1530]/85 border border-[#287BFF]/30 shadow-[0_0_20px_rgba(40,123,255,0.12)] backdrop-blur-md space-y-4"
            >
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Legal, Compliance &amp; Support</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/privacy"
                  className="p-3.5 bg-[#070D1F] hover:bg-[#101F42] border border-[#287BFF]/25 hover:border-[#00D9FF]/50 rounded-xl flex items-center gap-3 text-white text-xs sm:text-sm font-bold transition-all group shadow-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#287BFF]/15 border border-[#287BFF]/35 flex items-center justify-center text-[#00D9FF] group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span>Privacy Policy</span>
                </Link>

                <Link
                  href="/terms"
                  className="p-3.5 bg-[#070D1F] hover:bg-[#101F42] border border-[#287BFF]/25 hover:border-[#00D9FF]/50 rounded-xl flex items-center gap-3 text-white text-xs sm:text-sm font-bold transition-all group shadow-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#287BFF]/15 border border-[#287BFF]/35 flex items-center justify-center text-[#00D9FF] group-hover:scale-110 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span>Terms &amp; Rules</span>
                </Link>

                <Link
                  href="/responsible-gaming"
                  className="p-3.5 bg-[#070D1F] hover:bg-[#101F42] border border-[#287BFF]/25 hover:border-[#00D9FF]/50 rounded-xl flex items-center gap-3 text-white text-xs sm:text-sm font-bold transition-all group shadow-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/35 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <span>Responsible Gaming</span>
                </Link>

                <Link
                  href="/legal-availability"
                  className="p-3.5 bg-[#070D1F] hover:bg-[#101F42] border border-[#287BFF]/25 hover:border-[#00D9FF]/50 rounded-xl flex items-center gap-3 text-white text-xs sm:text-sm font-bold transition-all group shadow-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-[#FFC928] group-hover:scale-110 transition-transform">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span>Legal Availability</span>
                </Link>

                <Link
                  href="/security"
                  className="p-3.5 bg-[#070D1F] hover:bg-[#101F42] border border-[#287BFF]/25 hover:border-[#00D9FF]/50 rounded-xl flex items-center gap-3 text-white text-xs sm:text-sm font-bold transition-all group shadow-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span>HTTPS Security</span>
                </Link>

                <Link
                  href="/contact"
                  className="p-3.5 bg-[#070D1F] hover:bg-[#101F42] border border-[#287BFF]/25 hover:border-[#00D9FF]/50 rounded-xl flex items-center gap-3 text-white text-xs sm:text-sm font-bold transition-all group shadow-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#873BFF]/15 border border-[#873BFF]/35 flex items-center justify-center text-[#C49BFF] group-hover:scale-110 transition-transform">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <span>Contact &amp; Support</span>
                </Link>
              </div>
            </motion.div>

            {/* ── 5. LOGOUT BUTTON ── */}
            <div className="pt-2">
              <button
                onClick={logout}
                className="w-full py-3.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all active:scale-98 shadow-[0_0_15px_rgba(244,63,94,0.15)] group"
              >
                <LogOut className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                <span>LOGOUT</span>
              </button>
            </div>

            {/* Desktop Footer */}
            <DesktopFooter />
          </div>
        </main>
      </div>

      {/* ── ADD BANK MODAL OVERLAY ── */}
      <AnimatePresence>
        {showBankModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0B1530] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#287BFF]/50 space-y-4 relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#00D9FF]" />
                  <span>Add Bank Details</span>
                </h3>
                <button
                  onClick={() => setShowBankModal(false)}
                  className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 text-xs transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddBank} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#7183A8] uppercase tracking-wider mb-1">
                    ACCOUNT HOLDER NAME
                  </label>
                  <input
                    type="text"
                    placeholder="Rahul Sharma"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1F] border border-[#287BFF]/35 text-xs font-semibold uppercase text-white focus:outline-none focus:border-[#00D9FF] placeholder-[#5A6D96]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#7183A8] uppercase tracking-wider mb-1">
                    BANK NAME
                  </label>
                  <input
                    type="text"
                    placeholder="HDFC BANK"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1F] border border-[#287BFF]/35 text-xs font-semibold uppercase text-white focus:outline-none focus:border-[#00D9FF] placeholder-[#5A6D96]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#7183A8] uppercase tracking-wider mb-1">
                    ACCOUNT NUMBER
                  </label>
                  <input
                    type="text"
                    placeholder="5010023456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1F] border border-[#287BFF]/35 text-xs font-mono font-semibold text-white focus:outline-none focus:border-[#00D9FF] placeholder-[#5A6D96]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#7183A8] uppercase tracking-wider mb-1">
                    IFSC CODE
                  </label>
                  <input
                    type="text"
                    placeholder="HDFC0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1F] border border-[#287BFF]/35 text-xs font-mono font-semibold uppercase text-white focus:outline-none focus:border-[#00D9FF] placeholder-[#5A6D96]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#7183A8] uppercase tracking-wider mb-1">
                    UPI ID (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    placeholder="user@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1F] border border-[#287BFF]/35 text-xs font-mono font-semibold text-white focus:outline-none focus:border-[#00D9FF] placeholder-[#5A6D96]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBankModal(false)}
                    className="w-1/2 py-2.5 rounded-xl border border-white/10 bg-white/5 text-[#A8B9DE] text-xs font-bold hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBank}
                    className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5A0] to-[#00D9FF] text-[#050B20] text-xs font-black shadow-[0_0_12px_rgba(0,229,160,0.3)] active:scale-95 transition-all"
                  >
                    {submittingBank ? 'SAVING...' : 'SAVE BANK'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
