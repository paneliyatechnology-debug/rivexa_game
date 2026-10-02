'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { TopHeader, BottomNavigation } from '@/components/Navigation';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { GameHubIcon } from '@/components/gamehub/GameHubIcon';
import {
  ShieldCheck,
  Headphones,
  Lock,
  FileText,
  HeartPulse,
  MapPin,
  ChevronRight,
  Shield,
  Zap,
  Sparkles
} from 'lucide-react';

interface LegalLayoutProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  lastUpdated?: string;
  badge?: {
    text: string;
    icon?: React.ReactNode;
    variant?: 'cyan' | 'purple' | 'emerald' | 'amber' | 'rose' | 'blue';
  };
  accentGlow?: 'cyan' | 'blue' | 'purple' | 'rose' | 'amber' | 'emerald';
  currentPageName: string;
  topHeroExtra?: React.ReactNode;
  children: React.ReactNode;
}

export const LEGAL_PAGES_NAV = [
  { name: 'Privacy Policy', href: '/privacy', icon: ShieldCheck, color: '#00D9FF' },
  { name: 'Terms & Rules', href: '/terms', icon: FileText, color: '#287BFF' },
  { name: 'Responsible Gaming', href: '/responsible-gaming', icon: HeartPulse, color: '#F43F5E' },
  { name: 'Legal Availability', href: '/legal-availability', icon: MapPin, color: '#FFC928' },
  { name: 'HTTPS Security', href: '/security', icon: Lock, color: '#00E5A0' },
  { name: 'Contact & Support', href: '/contact', icon: Headphones, color: '#873BFF' },
];

export function LegalLayout({
  title,
  description,
  icon,
  lastUpdated = 'October 2026',
  badge,
  accentGlow = 'blue',
  currentPageName,
  topHeroExtra,
  children,
}: LegalLayoutProps) {
  const pathname = usePathname();
  const { balance: authBalance } = useAuth();
  const balance = authBalance || 0;

  const glowColors: Record<string, { bg: string; border: string; text: string }> = {
    cyan: { bg: 'from-[#00D9FF]/20 via-[#287BFF]/15 to-[#08152E]', border: 'border-[#00D9FF]/40', text: 'text-[#00D9FF]' },
    blue: { bg: 'from-[#287BFF]/20 via-[#0D1E50]/40 to-[#08152E]', border: 'border-[#287BFF]/40', text: 'text-[#287BFF]' },
    purple: { bg: 'from-[#873BFF]/20 via-[#1C0E38]/40 to-[#08152E]', border: 'border-[#873BFF]/40', text: 'text-[#C49BFF]' },
    emerald: { bg: 'from-[#00E5A0]/20 via-[#062016]/40 to-[#08152E]', border: 'border-[#00E5A0]/40', text: 'text-[#00E5A0]' },
    amber: { bg: 'from-[#FFC928]/20 via-[#2A1800]/40 to-[#08152E]', border: 'border-[#FFC928]/40', text: 'text-[#FFC928]' },
    rose: { bg: 'from-[#F43F5E]/20 via-[#300815]/40 to-[#08152E]', border: 'border-[#F43F5E]/40', text: 'text-[#F43F5E]' },
  };

  const currentGlow = glowColors[accentGlow] || glowColors.blue;

  const badgeStyles: Record<string, string> = {
    cyan: 'bg-[#00D9FF]/15 text-[#00D9FF] border-[#00D9FF]/35',
    blue: 'bg-[#287BFF]/15 text-[#6BA5FF] border-[#287BFF]/35',
    purple: 'bg-[#873BFF]/15 text-[#C49BFF] border-[#873BFF]/35',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35',
    amber: 'bg-amber-500/15 text-[#FFC928] border-amber-500/35',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
  };

  return (
    <div className="flex flex-col min-h-screen pt-[84px] bg-[#050B20] text-[#F8FAFC] selection:bg-[#00E5FF] selection:text-[#050B20] font-sans">
      {/* ── Ambient Background Glows ── */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-[#2979FF]/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-[#7C3AED]/12 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-1/3 right-10 w-[400px] h-[400px] bg-[#00E5A8]/7 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* ── Fixed Top Header ── */}
      <TopHeader balance={balance} />

      {/* ── Body: Sidebar + Main Content ── */}
      <div className="flex flex-1 w-full lg:pl-[220px] xl:pl-60 relative z-10">
        {/* Desktop Left Sidebar */}
        <DesktopSidebar activeCategory="profile" />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 pb-24 lg:pb-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">

            {/* ── Top Breadcrumbs ── */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-[#94A3C4] flex-wrap">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span className="text-[#94A3C4]/60">&gt;</span>
              <Link href="/profile" className="hover:text-white transition-colors">Legal &amp; Compliance</Link>
              <span className="text-[#94A3C4]/60">&gt;</span>
              <span className="text-[#00E5FF] font-bold">{currentPageName}</span>
            </nav>

            {/* ── Premium Hero Header Card ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className={`rounded-[24px] p-6 sm:p-8 bg-gradient-to-br ${currentGlow.bg} border ${currentGlow.border} shadow-[0_0_35px_rgba(40,123,255,0.18)] backdrop-blur-xl relative overflow-hidden`}
            >
              {/* Internal neon ambient spot */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-[#287BFF]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-4">
                {/* Top Badge & Last Updated */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    {badge ? (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-sm ${badgeStyles[badge.variant || 'cyan']}`}>
                        {badge.icon}
                        <span>{badge.text}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/35">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Official Compliance</span>
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-[#94A3C4] font-medium bg-[#070D1F]/70 px-3 py-1 rounded-full border border-white/5">
                    Last updated: <strong className="text-white">{lastUpdated}</strong>
                  </span>
                </div>

                {/* Title & Icon Header */}
                <div className="flex items-start gap-4 sm:gap-5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#1A3A8A] to-[#091735] border border-white/15 flex items-center justify-center text-white shrink-0 shadow-[0_0_20px_rgba(40,123,255,0.35)]">
                    {icon}
                  </div>
                  <div className="space-y-1.5">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                      {title}
                    </h1>
                    <p className="text-xs sm:text-sm text-[#A8B9DE] leading-relaxed max-w-2xl font-medium">
                      {description}
                    </p>
                  </div>
                </div>

                {/* Optional Hero Extra (e.g. Security status badge or contact strip) */}
                {topHeroExtra && <div className="pt-2">{topHeroExtra}</div>}
              </div>
            </motion.div>

            {/* ── Content Sections ── */}
            <div className="space-y-4">
              {children}
            </div>

            {/* ── Quick Legal Navigation Tabs Bar ── */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#091735]/80 border border-[#287BFF]/25 shadow-lg backdrop-blur-md space-y-3">
              <span className="text-[11px] font-extrabold text-[#7183A8] uppercase tracking-wider block">
                Explore Legal &amp; Compliance Center
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LEGAL_PAGES_NAV.map((page) => {
                  const isActive = pathname === page.href;
                  const Icon = page.icon;
                  return (
                    <Link
                      key={page.name}
                      href={page.href}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all group ${
                        isActive
                          ? 'bg-[#102454] border-[#00D9FF]/50 text-[#00D9FF] shadow-[0_0_12px_rgba(0,217,255,0.25)]'
                          : 'bg-[#070D1F] border-white/5 text-[#A8B9DE] hover:text-white hover:border-[#287BFF]/35 hover:bg-[#0D1C44]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" style={{ color: page.color }} />
                      <span className="truncate">{page.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>



          </div>
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

interface LegalSectionCardProps {
  number: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  accent?: 'cyan' | 'blue' | 'purple' | 'rose' | 'amber' | 'emerald';
}

export function LegalSectionCard({
  number,
  title,
  icon,
  children,
  accent = 'blue',
}: LegalSectionCardProps) {
  const accentClasses: Record<string, { numBg: string; text: string; border: string }> = {
    cyan: { numBg: 'bg-[#00D9FF]/15 border-[#00D9FF]/35 text-[#00D9FF]', text: 'group-hover:text-[#00D9FF]', border: 'hover:border-[#00D9FF]/50' },
    blue: { numBg: 'bg-[#287BFF]/15 border-[#287BFF]/35 text-[#287BFF]', text: 'group-hover:text-[#00D9FF]', border: 'hover:border-[#287BFF]/50' },
    purple: { numBg: 'bg-[#873BFF]/15 border-[#873BFF]/35 text-[#C49BFF]', text: 'group-hover:text-[#C49BFF]', border: 'hover:border-[#873BFF]/50' },
    emerald: { numBg: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400', text: 'group-hover:text-emerald-400', border: 'hover:border-emerald-500/50' },
    amber: { numBg: 'bg-amber-500/15 border-amber-500/35 text-[#FFC928]', text: 'group-hover:text-[#FFC928]', border: 'hover:border-amber-500/50' },
    rose: { numBg: 'bg-rose-500/15 border-rose-500/35 text-rose-300', text: 'group-hover:text-rose-300', border: 'hover:border-rose-500/50' },
  };

  const style = accentClasses[accent] || accentClasses.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`rounded-2xl p-5 sm:p-6 bg-[#0B1530]/85 border border-[#287BFF]/30 shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur-md space-y-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(40,123,255,0.18)] ${style.border} group`}
    >
      <div className="flex items-center gap-3">
        <div className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono border ${style.numBg} shadow-sm shrink-0`}>
          {number}
        </div>
        <h2 className={`text-base sm:text-lg font-black text-white tracking-tight transition-colors ${style.text} flex items-center gap-2`}>
          {icon}
          <span>{title}</span>
        </h2>
      </div>

      <div className="text-xs sm:text-sm text-[#A8B9DE] leading-relaxed space-y-2.5 font-normal pl-0 sm:pl-10">
        {children}
      </div>
    </motion.div>
  );
}
