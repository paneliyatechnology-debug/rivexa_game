'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GameHubIcon } from '@/components/gamehub/GameHubIcon';
import { GameHubButton } from '@/components/gamehub/GameHubButton';
import { ArrowRight, Sparkles, Settings, Bell } from 'lucide-react';

/**
 * DesktopSidebar — matches the Navigation_and_menu_components.png reference.
 * Shows active Home with gradient highlight, icon + label for each nav item.
 * Bottom: GameHub brand mark.
 */
export function DesktopSidebar({ activeCategory }: { activeCategory?: string }) {
  const pathname = usePathname();

  const navItems: {
    label: string;
    icon: 'home' | 'gamepad' | 'wallet' | 'gift' | 'user';
    href: string;
    badge?: number;
  }[] = [
    { label: 'Home', icon: 'home', href: '/' },
    { label: 'Sports', icon: 'gamepad', href: '/sports' },
    { label: 'Games', icon: 'gamepad', href: '/#games' },
    { label: 'Wallet', icon: 'wallet', href: '/deposit' },
    { label: 'Rewards', icon: 'gift', href: '/rewards' },
    { label: 'Invite & Earn', icon: 'user', href: '/invite' },
    { label: 'Profile', icon: 'user', href: '/profile' },
  ];

  const bottomItems = [
    { label: 'Notifications', href: '/notifications', icon: <Bell className="w-5 h-5" /> },
    { label: 'Settings', href: '/profile', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[220px] xl:w-60 shrink-0 fixed top-[84px] left-0 bottom-0 border-r border-[#287BFF]/25 bg-gradient-to-b from-[#091735] to-[#050B20] backdrop-blur-xl justify-between z-40 overflow-y-auto custom-scrollbar">
      {/* ── Main navigation items ── */}
      <div className="p-3 space-y-1 flex-1 min-h-0">
        <span className="text-[9px] uppercase font-black tracking-widest text-[#7183A8] px-3 block pt-1 pb-1">
          Navigation
        </span>

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' &&
              item.href !== '/#games' &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-sm transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-[#287BFF] via-[#873BFF] to-[#FF3FA4] text-white border border-[#00D9FF]/45 shadow-[0_0_15px_rgba(40,123,255,0.35),0_0_25px_rgba(135,59,255,0.20)]'
                  : 'text-[#B8C7E6] hover:text-white hover:bg-white/5 hover:border-white/10 border border-transparent'
              }`}
            >
              <GameHubIcon
                name={item.icon}
                size={18}
                isActive={isActive}
                activeColor="#FFFFFF"
                color="#7285AE"
                glow={isActive}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <span className="w-2 h-2 rounded-full bg-[#00E5A0] shadow-[0_0_6px_#00E5A0] animate-pulse" />
              )}
              {item.badge && (
                <span className="min-w-[20px] h-5 px-1 rounded-full bg-rose-600 text-[9px] font-black text-white flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-2 border-t border-white/8" />

        {/* Bottom nav items */}
        {bottomItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 px-3.5 py-2 rounded-2xl font-bold text-sm text-[#A8B9DE] hover:text-white hover:bg-white/5 transition-all"
          >
            <span className="text-[#7285AE]">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      {/* ── Promo widget — matches reference "Play More Earn More" widget ── */}
      <div className="p-3 pb-4 shrink-0">
        <div className="relative rounded-2xl p-3.5 bg-gradient-to-br from-[#1B0D45] via-[#0D1B3A] to-[#0A1E14] border border-[#873BFF]/30 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#873BFF]/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-[#00E5A0]/15 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF3FA4]" />
              <span className="text-[10px] font-black text-[#FF3FA4] uppercase tracking-wider">
                Earn More
              </span>
            </div>
            <h4 className="text-sm font-black text-white leading-snug mb-1">
              Play More<br />Earn More
            </h4>
            <p className="text-[10px] text-[#A8B9DE] leading-relaxed mb-2.5">
              Invite friends &amp; get up to 5% commission!
            </p>
            <GameHubButton variant="invite" size="sm" href="/invite" fullWidth>
              Invite Now <ArrowRight className="w-3 h-3 stroke-[3]" />
            </GameHubButton>
          </div>
        </div>

        {/* Brand footer */}
        <div className="flex items-center justify-between mt-3 px-1 border-t border-white/10 pt-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#287BFF] to-[#00D9FF] flex items-center justify-center">
              <GameHubIcon name="gamepad" size={14} color="#FFFFFF" />
            </div>
            <span className="text-xs font-black text-white">GameHub</span>
          </div>
          <span className="text-[9px] text-[#7285AE]">Play • Win • Repeat</span>
        </div>
      </div>
    </aside>
  );
}
