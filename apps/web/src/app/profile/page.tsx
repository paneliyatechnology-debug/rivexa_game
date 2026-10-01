'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TopHeader, BottomNavigation } from '@/components/Navigation';
import { getApiBaseUrl } from '@/lib/config';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout, refreshUser } = useAuth();

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

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
        <p className="text-sm font-bold text-slate-400">Loading profile...</p>
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

  const balance = user.wallet?.mainBalance ? parseFloat(user.wallet.mainBalance) : 0;

  return (
    <div className="min-h-screen bg-[#050B20] text-white pb-24 font-sans">
      <TopHeader balance={balance} />

      <main className="p-4 space-y-4 max-w-[480px] mx-auto">
        {/* User Profile Header Card */}
        <div className="bg-[#091735] rounded-[24px] p-5 shadow-2xl border border-[#287BFF]/35 text-white">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-2xl flex-shrink-0">
              <i className="bi bi-person-fill" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-lg font-black text-white truncate">
                {user.name || user.email.split('@')[0]}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                <span>
                  <i className="bi bi-phone me-1" />
                  {user.phone || 'N/A'}
                </span>
                <span>|</span>
                <span className="truncate">
                  <i className="bi bi-envelope me-1" />
                  {user.email}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  STATUS: {(user.status || 'ACTIVE').toUpperCase()}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                  KYC: {(user.kycStatus || 'NOT_SUBMITTED').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Bank Accounts Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <i className="bi bi-bank text-blue-600" />
              Bank Accounts
            </h2>
            <button
              onClick={() => setShowBankModal(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
            >
              + Add Bank
            </button>
          </div>

          {bankMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-bold mb-3 ${
                bankMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {bankMsg.text}
            </div>
          )}

          {user.bankAccounts && user.bankAccounts.length > 0 ? (
            <div className="space-y-2">
              {user.bankAccounts.map((bank: any) => {
                const status = (bank.status || 'pending').toLowerCase();
                return (
                  <div key={bank.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="font-extrabold text-xs text-slate-800 uppercase">
                        {bank.bankName}
                      </span>
                      {status === 'approved' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700 border border-emerald-300">
                          <i className="bi bi-patch-check-fill me-1" />
                          APPROVED
                        </span>
                      ) : status === 'rejected' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-300">
                          <i className="bi bi-x-circle-fill me-1" />
                          REJECTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                          <i className="bi bi-clock-history me-1" />
                          PENDING VERIFICATION
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 font-mono">
                      A/C: <strong className="text-slate-900">{bank.accountNumber}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>IFSC: <strong className="text-slate-800">{bank.ifscCode}</strong></span>
                      <span>Holder: <strong className="text-blue-600">{bank.holderName}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-medium">No bank accounts linked yet.</p>
          )}
        </div>

        {/* Security & Password Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <h2 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <i className="bi bi-lock-fill text-blue-600" />
            Update Password
          </h2>

          {pwdMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-bold mb-3 ${
                pwdMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {pwdMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div>
              <input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={submittingPwd}
              className="w-full py-2.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-sm transition-transform"
            >
              {submittingPwd ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>
          </form>
        </div>

        {/* Legal, Compliance & Support Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <h2 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <i className="bi bi-shield-check text-emerald-600" />
            Legal, Compliance & Support
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="/privacy"
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-slate-800 text-xs font-bold transition-colors"
            >
              <i className="bi bi-shield-lock-fill text-blue-600 text-base" />
              <span>Privacy Policy</span>
            </a>
            <a
              href="/terms"
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-slate-800 text-xs font-bold transition-colors"
            >
              <i className="bi bi-file-earmark-text-fill text-blue-600 text-base" />
              <span>Terms & Rules</span>
            </a>
            <a
              href="/responsible-gaming"
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-slate-800 text-xs font-bold transition-colors"
            >
              <i className="bi bi-heart-pulse-fill text-rose-500 text-base" />
              <span>Responsible Gaming</span>
            </a>
            <a
              href="/legal-availability"
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-slate-800 text-xs font-bold transition-colors"
            >
              <i className="bi bi-geo-alt-fill text-amber-500 text-base" />
              <span>Legal Availability</span>
            </a>
            <a
              href="/security"
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-slate-800 text-xs font-bold transition-colors"
            >
              <i className="bi bi-lock-fill text-emerald-600 text-base" />
              <span>HTTPS Security</span>
            </a>
            <a
              href="/contact"
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-slate-800 text-xs font-bold transition-colors"
            >
              <i className="bi bi-headset text-indigo-600 text-base" />
              <span>Contact & Support</span>
            </a>
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-2">
          <button
            onClick={logout}
            className="w-full py-3 rounded-2xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs flex items-center justify-center gap-2 transition-colors active:scale-95"
          >
            <i className="bi bi-box-arrow-right text-base" />
            LOGOUT
          </button>
        </div>
      </main>

      {/* Add Bank Modal Overlay */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Add Bank Details</h3>
              <button
                onClick={() => setShowBankModal(false)}
                className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBank} className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                  ACCOUNT HOLDER NAME
                </label>
                <input
                  type="text"
                  placeholder="Rahul Sharma"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold uppercase text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                  BANK NAME
                </label>
                <input
                  type="text"
                  placeholder="HDFC BANK"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold uppercase text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                  ACCOUNT NUMBER
                </label>
                <input
                  type="text"
                  placeholder="5010023456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                  IFSC CODE
                </label>
                <input
                  type="text"
                  placeholder="HDFC0001234"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-semibold uppercase text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                  UPI ID (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="user@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBank}
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold shadow-sm active:scale-95"
                >
                  {submittingBank ? 'SAVING...' : 'SAVE BANK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}
