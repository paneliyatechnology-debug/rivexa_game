'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/lib/config';
import { GameHubIcon } from '@/components/gamehub/GameHubIcon';
import { GameHubButton } from '@/components/gamehub/GameHubButton';
import { GAMEHUB_ASSETS } from '@/config/gamehub-assets';
import { Search, Volume2, VolumeX, ChevronDown, Plus, Zap, ShieldCheck, Headphones } from 'lucide-react';

// ─────────────────────────────────────────────
// TOP HEADER
// ─────────────────────────────────────────────
export function TopHeader({
  balance,
  onSearch,
}: {
  balance?: number;
  onSearch?: (q: string) => void;
}) {
  const { user: authUser, balance: contextBalance } = useAuth();
  const displayBalance = balance !== undefined ? balance : contextBalance;

  // Initial state matches server HTML (false) to prevent Next.js hydration error
  const [muted, setMuted] = useState<boolean>(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync with storage and custom sound events after initial hydration
  useEffect(() => {
    const syncMuted = () => {
      try {
        const saved =
          localStorage.getItem('rivexa_sound_enabled') ??
          localStorage.getItem('game_sound_enabled');
        if (saved !== null) setMuted(saved === 'false');
      } catch {}
    };

    syncMuted();

    const handleStorage = () => syncMuted();
    const handleSoundChange = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom?.detail?.enabled !== undefined) {
        setMuted(!custom.detail.enabled);
      } else {
        syncMuted();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sound_preference_changed', handleSoundChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sound_preference_changed', handleSoundChange);
    };
  }, []);

  // Explicit handler when user clicks top header sound button
  const handleToggleSound = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    try {
      const enabled = String(!nextMuted);
      localStorage.setItem('rivexa_sound_enabled', enabled);
      localStorage.setItem('game_sound_enabled', enabled);
      localStorage.setItem('pushparani_sound_enabled', enabled);
      localStorage.setItem('coinflip_sound_enabled', enabled);
      localStorage.setItem('spin_sound_enabled', enabled);
      localStorage.setItem('jetx_sound_enabled', enabled);
      localStorage.setItem('fastparity_sound_enabled', enabled);
      localStorage.setItem('aviator_sound_muted', String(nextMuted));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(
        new CustomEvent('sound_preference_changed', { detail: { enabled: !nextMuted } })
      );
    } catch {}
  };

  // Fetch unread notifications
  useEffect(() => {
    const fetchUnread = async () => {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
      if (!token) return;
      try {
        const res = await fetch(`${getApiBaseUrl()}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.unreadCount === 'number') setUnreadCount(data.unreadCount);
        }
      } catch {}
    };
    fetchUnread();
  }, []);

  const username = authUser?.name || authUser?.phone || 'Player99';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#08152E]/95 backdrop-blur-2xl border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      {/* ── Top glass header bar ── */}
      <div className="px-4 py-2 flex items-center justify-between gap-3">
        {/* ── Left: Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          {/* Gamepad icon from asset pack — neon blue circle container */}
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#1A3A8A] to-[#0D1E50] border border-[#287BFF]/50 flex items-center justify-center shadow-[0_0_14px_rgba(40,123,255,0.4)] group-hover:shadow-[0_0_20px_rgba(40,123,255,0.6)] transition-all">
            <GameHubIcon name="gamepad" size={20} isActive activeColor="#00D9FF" glow />
          </div>
          <div className="leading-none">
            <div className="text-xl font-black tracking-tight">
              <span className="text-white">Game</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5A0] to-[#00D9FF]">
                Hub
              </span>
            </div>
            <p className="text-[10px] text-[#7285AE] font-medium hidden sm:block mt-0.5">
              Play • Win • Repeat
            </p>
          </div>
        </Link>

        {/* ── Center: Search ── */}
        <div className="hidden md:flex flex-1 max-w-sm relative mx-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7285AE] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onSearch?.(e.target.value);
            }}
            placeholder="Search games, categories..."
            className="w-full pl-10 pr-4 py-1.5 rounded-full bg-[#101C3A] border border-white/10 text-sm text-[#F5F7FF] placeholder-[#7285AE] focus:outline-none focus:border-[#287BFF]/60 focus:ring-1 focus:ring-[#287BFF]/40 transition-all"
          />
        </div>

        {/* ── Right: Controls ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Sound toggle */}
          <button
            onClick={handleToggleSound}
            title={muted ? 'Unmute Sound' : 'Mute Sound'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#101C3A] border border-white/10 flex items-center justify-center shrink-0 hover:border-white/30 transition-all"
          >
            {muted ? (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00D9FF]" />
            )}
          </button>

          {/* Notification bell */}
          <Link
            href="/notifications"
            className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#101C3A] border border-white/10 flex items-center justify-center shrink-0 hover:border-amber-400/40 transition-all"
          >
            <GameHubIcon name="bell" size={16} isActive activeColor="#FFC928" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-[8px] font-black text-white flex items-center justify-center shadow-lg">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Wallet Balance + Integrated Deposit Pill (Responsive for all screens) */}
          <div className="bg-[#0A1E14] border border-[#00E5A0]/40 rounded-full pl-2.5 sm:pl-3 pr-1 py-1 flex items-center gap-1.5 sm:gap-2 shadow-[0_0_12px_rgba(0,229,160,0.15)] shrink-0">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#00E5A0]/15 flex items-center justify-center shrink-0">
              <GameHubIcon name="wallet" size={12} isActive activeColor="#00E5A0" />
            </div>
            <span className="text-[11px] sm:text-xs font-black font-mono text-[#00E5A0] tracking-tight">
              ₹{(displayBalance || 0).toFixed(2)}
            </span>
            {/* Integrated Deposit CTA button */}
            <Link
              href="/deposit"
              className="bg-gradient-to-r from-[#00E5A0] to-[#00C7A0] text-[#06152C] px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-black flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_10px_rgba(0,229,160,0.3)] ml-0.5 shrink-0"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span className="hidden xs:inline">Deposit</span>
            </Link>
          </div>

          {/* User Profile Avatar */}
          <Link
            href="/profile"
            className="flex items-center gap-2 p-0.5 sm:pl-1 sm:pr-3 sm:py-1 rounded-full bg-[#101C3A] border border-white/10 hover:border-[#287BFF]/40 transition-all shrink-0"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#873BFF] to-[#287BFF] flex items-center justify-center shadow-inner">
              <GameHubIcon name="user" size={14} color="#FFFFFF" />
            </div>
            <span className="text-xs font-bold text-[#F5F7FF] hidden md:block truncate max-w-[80px]">
              {username}
            </span>
            <ChevronDown className="w-3 h-3 text-[#7285AE] hidden md:block" />
          </Link>
        </div>
      </div>

      {/* ── Announcement marquee bar ── */}
      <div className="bg-[#050B20]/90 border-t border-white/5 px-4 py-1.5 flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-1 text-[#FFC928] font-black shrink-0 bg-[#FFC928]/10 px-2 py-0.5 rounded-full border border-[#FFC928]/20 text-[10px]">
          🔥 LIVE
        </div>
        <div className="overflow-hidden whitespace-nowrap flex-1">
          <div className="inline-block animate-marquee text-[11px] text-[#A8B9DE] font-medium">
            🎉&nbsp;Player***41 won ₹3,450 on Mines!&nbsp;&nbsp;🚀&nbsp;Rocket hit 52.4x on JetX Flight!&nbsp;&nbsp;🎁&nbsp;Deposit now & get 100% Welcome Bonus!&nbsp;&nbsp;👑&nbsp;Player***99 cashed out ₹12,450!&nbsp;&nbsp;
          </div>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────
// MOBILE BOTTOM NAVIGATION
// ─────────────────────────────────────────────
export function BottomNavigation() {
  const pathname = usePathname();

  const navItems: { label: string; icon: 'home' | 'gamepad' | 'wallet' | 'gift' | 'user'; href: string }[] = [
    { label: 'Home', icon: 'home', href: '/' },
    { label: 'Games', icon: 'gamepad', href: '/#games' },
    { label: 'Wallet', icon: 'wallet', href: '/deposit' },
    { label: 'Rewards', icon: 'gift', href: '/rewards' },
    { label: 'Profile', icon: 'user', href: '/profile' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#08152E]/98 backdrop-blur-2xl border-t border-white/10 h-[66px] flex items-center justify-around z-50 shadow-[0_-8px_32px_rgba(0,0,0,0.6)]">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/' && item.href !== '/#games' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3 text-[10px] font-bold transition-all ${
              isActive ? 'scale-105' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-[#00E5A0]/12 border border-[#00E5A0]/30 shadow-[0_0_10px_rgba(0,229,160,0.25)]'
                  : ''
              }`}
            >
              <GameHubIcon
                name={item.icon}
                size={20}
                isActive={isActive}
                activeColor="#00E5A0"
                color="#7285AE"
                glow
              />
            </div>
            <span className={isActive ? 'text-[#00E5A0]' : 'text-[#7285AE]'}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─────────────────────────────────────────────
// DESKTOP FOOTER
// ─────────────────────────────────────────────
export function DesktopFooter() {
  return (
    <footer className="hidden lg:flex items-center justify-between py-5 px-6 border-t border-white/10 bg-[#08152E]/40 text-xs text-[#7285AE] mt-8 rounded-t-2xl">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#287BFF] to-[#00D9FF] flex items-center justify-center">
          <GameHubIcon name="gamepad" size={16} color="#FFFFFF" />
        </div>
        <div>
          <span className="font-black text-white">GameHub</span>
          <span className="ml-1 opacity-60">© 2026 All rights reserved.</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5 text-[#00D68F]">
          <ShieldCheck className="w-4 h-4" />
          <span>Safe & Secure</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#00D9FF]">
          <Headphones className="w-4 h-4" />
          <span>24/7 Support</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#FFC928]">
          <Zap className="w-4 h-4" />
          <span>Instant Withdrawal</span>
        </div>
      </div>
    </footer>
  );
}
