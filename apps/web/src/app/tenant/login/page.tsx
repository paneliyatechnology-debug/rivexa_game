'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/config';
import { Building2, Mail, Lock, ArrowRight, ShieldCheck, Sparkles, KeyRound } from 'lucide-react';

export default function TenantLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ tenantSlug: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${getApiBaseUrl()}/tenant/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed. Check tenant slug and credentials.');
      localStorage.setItem('tenant_token', data.accessToken);
      localStorage.setItem('tenant_member', JSON.stringify(data.member));
      router.push('/tenant/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B20] text-slate-100 flex flex-col items-center justify-center p-4 font-sans relative selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* 🌌 Ambient Background Glowing Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.18)_0%,transparent_70%)] pointer-events-none blur-3xl z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.15)_0%,transparent_70%)] pointer-events-none blur-3xl z-0" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#091535]/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_25px_60px_rgba(0,0,0,0.5)] relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-indigo-600 items-center justify-center text-white shadow-lg shadow-indigo-500/30 border border-white/20">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Tenant Portal</h1>
            <p className="text-xs text-slate-400 mt-1">Sign in to your white-label management console</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-3.5 text-xs text-rose-300 flex items-center gap-2 shadow-inner">
            <span className="text-sm">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Tenant Slug
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="tenant-slug"
                type="text"
                placeholder="e.g. royal-casino"
                value={form.tenantSlug}
                onChange={(e) => setForm({ ...form, tenantSlug: e.target.value })}
                required
                className="w-full bg-[#101C3A] border border-white/15 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Member Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="tenant-email"
                type="email"
                placeholder="admin@royal.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full bg-[#101C3A] border border-white/15 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="tenant-password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="w-full bg-[#101C3A] border border-white/15 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          <button
            id="tenant-login-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:brightness-110 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span>🔄 Signing in...</span>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-4 border-t border-white/10 text-center space-y-2">
          <p className="text-[11px] text-slate-500 font-medium">
            Tenant member portal • Rivexa Gaming Platform
          </p>
          <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-400">
            <Link href="/" className="hover:text-indigo-400 transition-colors">
              Frontend App
            </Link>
            <span>•</span>
            <Link href="/admin/login" className="hover:text-indigo-400 transition-colors">
              Platform Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
