'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LegalLayout, LegalSectionCard } from '@/components/legal/LegalLayout';
import {
  Headphones,
  MessageSquare,
  Mail,
  HelpCircle,
  Shield,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('deposit');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }, 600);
  };

  return (
    <LegalLayout
      title="Contact &amp; Support"
      description="Need assistance with a deposit, withdrawal, game rules, or account verification? Our support champions are active 24/7 to help you."
      icon={<Headphones className="w-8 h-8 sm:w-9 sm:h-9 text-[#873BFF]" />}
      lastUpdated="October 2026"
      accentGlow="purple"
      currentPageName="Contact & Support"
      badge={{
        text: '24/7 Player Helpdesk Active',
        icon: <Sparkles className="w-3.5 h-3.5" />,
        variant: 'purple',
      }}
    >
      {/* ── 4 Interactive Support Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
        {/* 1. Live Support */}
        <div className="rounded-2xl p-5 bg-[#0B1530]/85 border border-[#287BFF]/30 hover:border-[#00D9FF]/60 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,217,255,0.18)] flex flex-col justify-between space-y-3 group">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#00D9FF]/15 border border-[#00D9FF]/35 flex items-center justify-center text-[#00D9FF] group-hover:scale-110 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-[#00E5A0] bg-emerald-500/15 border border-emerald-500/35 px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] animate-pulse" />
              Online 24/7
            </span>
          </div>
          <div>
            <h3 className="text-base font-black text-white group-hover:text-[#00D9FF] transition-colors">
              Live Chat Support
            </h3>
            <p className="text-xs text-[#A8B9DE] leading-relaxed mt-1">
              Connect with our live gaming agent in seconds for instant balance queries and quick game troubleshooting.
            </p>
          </div>
          <button
            onClick={() => alert('Live chat agent is connecting...')}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#287BFF] hover:from-[#33E0FF] hover:to-[#428CFF] text-[#050B20] text-xs font-black transition-all shadow-[0_0_12px_rgba(0,217,255,0.25)] active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>Start Live Chat</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2. Email Support */}
        <div className="rounded-2xl p-5 bg-[#0B1530]/85 border border-[#287BFF]/30 hover:border-[#873BFF]/60 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(135,59,255,0.18)] flex flex-col justify-between space-y-3 group">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#873BFF]/15 border border-[#873BFF]/35 flex items-center justify-center text-[#C49BFF] group-hover:scale-110 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-[#C49BFF] bg-[#873BFF]/15 border border-[#873BFF]/35 px-2.5 py-0.5 rounded-full uppercase">
              Average 15m reply
            </span>
          </div>
          <div>
            <h3 className="text-base font-black text-white group-hover:text-[#C49BFF] transition-colors">
              Official Email Support
            </h3>
            <p className="text-xs text-[#A8B9DE] leading-relaxed mt-1">
              Send screenshots, transaction UTR receipts, or detailed audit requests directly to our compliance desk.
            </p>
          </div>
          <a
            href="mailto:support@gamehub.io"
            className="w-full py-2.5 rounded-xl bg-[#070D1F] hover:bg-[#101C42] border border-[#873BFF]/40 text-[#C49BFF] text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>support@gamehub.io</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 3. Help Center */}
        <div className="rounded-2xl p-5 bg-[#0B1530]/85 border border-[#287BFF]/30 hover:border-[#FFC928]/60 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(255,201,40,0.18)] flex flex-col justify-between space-y-3 group">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#FFC928]/15 border border-[#FFC928]/35 flex items-center justify-center text-[#FFC928] group-hover:scale-110 transition-transform">
              <HelpCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-[#FFC928] bg-amber-500/15 border border-amber-500/35 px-2.5 py-0.5 rounded-full uppercase">
              Self-Service
            </span>
          </div>
          <div>
            <h3 className="text-base font-black text-white group-hover:text-[#FFC928] transition-colors">
              Help Center &amp; Guides
            </h3>
            <p className="text-xs text-[#A8B9DE] leading-relaxed mt-1">
              Browse step-by-step guides on Fast Parity, Mines multipliers, referral commission payouts, and withdrawals.
            </p>
          </div>
          <Link
            href="/terms"
            className="w-full py-2.5 rounded-xl bg-[#070D1F] hover:bg-[#101C42] border border-[#FFC928]/40 text-[#FFC928] text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>Browse Game Rules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 4. Account & Security */}
        <div className="rounded-2xl p-5 bg-[#0B1530]/85 border border-[#287BFF]/30 hover:border-emerald-500/60 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(16,185,129,0.18)] flex flex-col justify-between space-y-3 group">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/35 px-2.5 py-0.5 rounded-full uppercase">
              Security Desk
            </span>
          </div>
          <div>
            <h3 className="text-base font-black text-white group-hover:text-emerald-400 transition-colors">
              Account &amp; Security Desk
            </h3>
            <p className="text-xs text-[#A8B9DE] leading-relaxed mt-1">
              Priority line for password resets, 2FA authorization issues, KYC approval delays, and fraud investigations.
            </p>
          </div>
          <Link
            href="/profile"
            className="w-full py-2.5 rounded-xl bg-[#070D1F] hover:bg-[#101C42] border border-emerald-500/40 text-emerald-400 text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>Manage My Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Interactive Support Ticket Submission Form ── */}
      <div className="rounded-2xl p-5 sm:p-7 bg-[#0B1530]/85 border border-[#287BFF]/35 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#287BFF]/20 border border-[#287BFF]/40 flex items-center justify-center text-[#00D9FF]">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Submit a Support Ticket</h2>
              <p className="text-xs text-[#A8B9DE]">We typically respond within 15–30 minutes.</p>
            </div>
          </div>
          <span className="text-xs font-mono text-[#00E5A0] bg-[#00E5A0]/10 border border-[#00E5A0]/25 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>24/7 Monitored</span>
          </span>
        </div>

        {submitted && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>✓ Support Ticket submitted successfully! Our representative will respond to your email shortly.</span>
            </div>
            <button onClick={() => setSubmitted(false)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-extrabold text-[#7183A8] uppercase tracking-wider mb-1">
                Your Name / User ID
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul / User ID"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1F] border border-[#287BFF]/35 text-xs sm:text-sm text-white placeholder-[#5A6D96] font-medium focus:outline-none focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF]/40 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-[#7183A8] uppercase tracking-wider mb-1">
                Registered Email / Mobile
              </label>
              <input
                type="text"
                placeholder="e.g. user@email.com or +91 98..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1F] border border-[#287BFF]/35 text-xs sm:text-sm text-white placeholder-[#5A6D96] font-medium focus:outline-none focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF]/40 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-extrabold text-[#7183A8] uppercase tracking-wider mb-1">
                Inquiry Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1F] border border-[#287BFF]/35 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF]/40 transition-all"
              >
                <option value="deposit">Deposit &amp; Payment Verification</option>
                <option value="withdraw">Withdrawal Status &amp; Bank Transfer</option>
                <option value="kyc">KYC &amp; Identity Verification</option>
                <option value="game">Gameplay &amp; Round Settlement</option>
                <option value="referral">Referral Commission &amp; Bonus</option>
                <option value="security">Account Security &amp; Login</option>
                <option value="other">Other Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-[#7183A8] uppercase tracking-wider mb-1">
                Subject
              </label>
              <input
                type="text"
                placeholder="Brief summary of your question"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1F] border border-[#287BFF]/35 text-xs sm:text-sm text-white placeholder-[#5A6D96] font-medium focus:outline-none focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF]/40 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-[#7183A8] uppercase tracking-wider mb-1">
              Detailed Message &amp; Transaction Details (if any)
            </label>
            <textarea
              rows={4}
              placeholder="Please provide full details, including UTR transaction number or game ID if applicable..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1F] border border-[#287BFF]/35 text-xs sm:text-sm text-white placeholder-[#5A6D96] font-medium focus:outline-none focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF]/40 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#873BFF] via-[#287BFF] to-[#00D9FF] hover:from-[#9B55FF] hover:to-[#33E0FF] text-white text-xs sm:text-sm font-black shadow-[0_0_20px_rgba(40,123,255,0.35)] active:scale-98 transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>SUBMITTING TICKET...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>SUBMIT SUPPORT TICKET</span>
              </>
            )}
          </button>
        </form>
      </div>
    </LegalLayout>
  );
}
