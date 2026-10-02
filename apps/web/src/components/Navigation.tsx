'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/lib/config';
import { GameHubIcon } from '@/components/gamehub/GameHubIcon';
import { GameHubButton } from '@/components/gamehub/GameHubButton';
import { GAMEHUB_ASSETS } from '@/config/gamehub-assets';
import { Search, Volume2, VolumeX, ChevronDown, Plus, Zap, ShieldCheck, Headphones, User, LogOut } from 'lucide-react';

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
  const router = useRouter();
  const { user: authUser, balance: contextBalance, logout } = useAuth();
  const displayBalance = balance !== undefined ? balance : contextBalance;

  // Initial state matches server HTML (false) to prevent Next.js hydration error
  const [muted, setMuted] = useState<boolean>(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

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

  const username = authUser?.name || authUser?.phone || 'Sharma ji';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#08152E]/95 backdrop-blur-2xl border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      {/* ── Top glass header bar ── */}
      <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* ── Left: Logo ── */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 group">
          {/* Gamepad icon from asset pack — neon blue circle container */}
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#1A3A8A] to-[#0D1E50] border border-[#287BFF]/50 flex items-center justify-center shadow-[0_0_14px_rgba(40,123,255,0.4)] group-hover:shadow-[0_0_20px_rgba(40,123,255,0.6)] transition-all">
            <GameHubIcon name="gamepad" size={16} isActive activeColor="#00D9FF" glow className="sm:hidden" />
            <GameHubIcon name="gamepad" size={20} isActive activeColor="#00D9FF" glow className="hidden sm:block" />
          </div>
          <div className="leading-none">
            <div className="text-lg sm:text-xl font-black tracking-tight">
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

        {/* ── Center: Search (Visible on md+) ── */}
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
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Sound toggle */}
          <button
            onClick={handleToggleSound}
            title={muted ? 'Unmute Sound' : 'Mute Sound'}
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-[#101C3A] border border-white/10 flex items-center justify-center shrink-0 hover:border-white/30 transition-all"
          >
            {muted ? (
              <VolumeX className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500" />
            ) : (
              <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 text-[#00D9FF]" />
            )}
          </button>

          {/* Notification bell */}
          <Link
            href="/notifications"
            className="relative w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-[#101C3A] border border-white/10 flex items-center justify-center shrink-0 hover:border-amber-400/40 transition-all"
          >
            <GameHubIcon name="bell" size={14} isActive activeColor="#FFC928" className="sm:hidden" />
            <GameHubIcon name="bell" size={16} isActive activeColor="#FFC928" className="hidden sm:block" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-600 text-[8px] font-black text-white flex items-center justify-center shadow-lg">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Wallet Balance + Integrated Deposit Pill (Responsive for all mobile screens) */}
          <div className="bg-[#0A1E14] border border-[#00E5A0]/40 rounded-full pl-2 sm:pl-3 pr-1 py-0.5 sm:py-1 flex items-center gap-1 sm:gap-2 shadow-[0_0_12px_rgba(0,229,160,0.15)] shrink-0">
            <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-[#00E5A0]/15 flex items-center justify-center shrink-0">
              <GameHubIcon name="wallet" size={10} isActive activeColor="#00E5A0" className="sm:hidden" />
              <GameHubIcon name="wallet" size={12} isActive activeColor="#00E5A0" className="hidden sm:block" />
            </div>
            <span className="text-[10px] sm:text-xs font-black font-mono text-[#00E5A0] tracking-tight">
              ₹{(displayBalance || 0).toFixed(2)}
            </span>
            {/* Integrated Deposit CTA button */}
            <Link
              href="/deposit"
              className="bg-gradient-to-r from-[#00E5A0] to-[#00C7A0] text-[#06152C] p-1 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_10px_rgba(0,229,160,0.3)] shrink-0"
              title="Deposit"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span className="hidden md:inline">Deposit</span>
            </Link>
          </div>

          {/* User Profile Avatar with Modern Dropdown */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 sm:gap-2 p-0.5 sm:pl-1 sm:pr-3 sm:py-1 rounded-full bg-[#101C3A] border border-white/10 hover:border-[#287BFF]/50 hover:bg-[#162752] transition-all shrink-0 cursor-pointer shadow-sm active:scale-95 group"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              id="profile-dropdown-button"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#873BFF] to-[#287BFF] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform shrink-0">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-bold text-[#F5F7FF] hidden md:block truncate max-w-[90px]">
                {username}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#7285AE] hidden md:block transition-transform duration-200 ${
                  dropdownOpen ? 'rotate-180 text-[#00D9FF]' : 'group-hover:text-white'
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-48 sm:w-56 rounded-2xl bg-[#091530]/95 backdrop-blur-2xl border border-[#287BFF]/40 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_25px_rgba(40,123,255,0.22)] p-2 z-[100] space-y-1"
                >
                  {/* Subtle top indicator/accent */}
                  <div className="absolute top-0 right-6 w-12 h-1 bg-gradient-to-r from-[#00D9FF] to-[#873BFF] rounded-full blur-[2px] opacity-80 pointer-events-none" />

                  {/* 1. My Profile */}
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      router.push('/profile');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#D2E2FF] hover:text-white hover:bg-gradient-to-r hover:from-[#287BFF]/25 hover:to-[#873BFF]/25 hover:border-[#287BFF]/40 border border-transparent transition-all group cursor-pointer text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#287BFF]/15 border border-[#287BFF]/30 flex items-center justify-center text-[#00D9FF] group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(0,217,255,0.4)] group-hover:text-white transition-all">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="flex-1 font-bold">My Profile</span>
                  </button>

                  {/* 2. Logout */}
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-rose-400 hover:text-rose-200 hover:bg-rose-500/15 hover:border-rose-500/30 border border-transparent transition-all group cursor-pointer text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(244,63,94,0.4)] group-hover:text-rose-300 transition-all">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <span className="flex-1 font-bold">Logout</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
