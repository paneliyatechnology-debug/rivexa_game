'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { TopHeader, BottomNavigation, DesktopFooter } from '@/components/Navigation';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { HeroSection } from '@/components/home/HeroSection';
import { SideWidgets } from '@/components/home/SideWidgets';
import { QuickActions } from '@/components/home/QuickActions';
import { FeaturedGames } from '@/components/home/FeaturedGames';
import { ReferralBanner } from '@/components/home/ReferralBanner';
import { RecentActivity } from '@/components/home/RecentActivity';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/lib/config';

const GAMES_FALLBACK = [
  { id: 'fast-parity', name: 'Fast Parity', slug: 'fast-parity', minBet: 10, description: 'Predict Red, Green, Violet or number 0-9...', badge: 'HOT' },
  { id: 'parity', name: 'Parity', slug: 'parity', minBet: 10, description: 'Predict Red, Green, Violet or number 0-9 (1 Min)...', badge: '1MIN' },
  { id: 'mines', name: 'Mines', slug: 'mines', minBet: 20, description: 'Uncover tiles on a 5x5 grid without mines...', badge: 'NEW' },
  { id: 'crash', name: 'Crash', slug: 'crash', minBet: 10, description: 'Watch the multiplier climb high...', badge: 'HOT' },
  { id: 'jet', name: 'JetX Flight', slug: 'jet', minBet: 50, description: 'High-altitude Jet rocket multiplier game...', badge: 'HOT' },
  { id: 'spin', name: 'Spin Wheel', slug: 'spin', minBet: 10, description: 'Spin for instant multiplier rewards...', badge: '50X' },
  { id: 'dice', name: 'Over/Under Dice', slug: 'dice', minBet: 10, description: 'Custom win-chance slider with instant rolls...', badge: '99X' },
  { id: 'andar-bahar', name: 'Andar Bahar', slug: 'andar-bahar', minBet: 10, description: 'Predict matching joker card landing side...', badge: 'HOT' },
  { id: 'pushparani', name: 'Pushparani', slug: 'pushparani', minBet: 10, description: 'Pushpa Truck Crash - Cash out before obstacle hit!', badge: 'NEW' },
  { id: 'coin-flip', name: 'Coin Flip', slug: 'coin-flip', minBet: 10, description: 'Flip coin - heads or tails. Win 1.96x!', badge: '1.96X' },
];

export default function HomePage() {
  const { user: authUser, balance: authBalance } = useAuth();
  const [balance, setBalance] = useState<number>(authBalance || 0);
  const [gamesList, setGamesList] = useState<any[]>(GAMES_FALLBACK);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (authBalance !== undefined && authBalance !== null) {
      setBalance(authBalance);
    }
  }, [authBalance]);

  useEffect(() => {
    const targetUserId =
      authUser?.id ||
      (typeof window !== 'undefined' && localStorage.getItem('rivexa_user')
        ? JSON.parse(localStorage.getItem('rivexa_user')!).id
        : null);
    if (targetUserId) {
      fetchBalance(targetUserId);
    }
    fetchDynamicGames();
  }, [authUser?.id]);

  const fetchDynamicGames = async () => {
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/public-games`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const activeOnly = data.filter((g: any) => g.isActive !== false);
          setGamesList(activeOnly);
        }
      }
    } catch (e) {}
  };

  const fetchBalance = async (userId: string) => {
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/wallet/balance?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        const mainBal = Number(data.mainBalance);
        if (!isNaN(mainBal)) setBalance(mainBal);
      }
    } catch (e) {}
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return (
    <div className="flex flex-col min-h-screen pt-[84px]">
      {/* Fixed Top Header */}
      <TopHeader balance={balance} onSearch={handleSearch} />

      {/* Body: Sidebar + Main Content */}
      <div className="flex flex-1 w-full lg:pl-[220px] xl:pl-60">
        {/* Desktop Left Sidebar (only lg+) */}
        <DesktopSidebar />

        {/* Main Scrollable Content */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 py-5 space-y-6">
            {/* ─── HERO + RIGHT PANEL ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Hero Section (full width on mobile, 2/3 on desktop) */}
              <motion.div
                className="lg:col-span-2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: pageLoaded ? 1 : 0, y: pageLoaded ? 0 : 16 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <HeroSection />
              </motion.div>

              {/* Right Panel: Wallet + Promo (1/3 on desktop, below hero on mobile) */}
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: pageLoaded ? 1 : 0, x: pageLoaded ? 0 : 16 }}
                transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
              >
                <SideWidgets balance={balance} />
              </motion.div>
            </div>

            {/* ─── QUICK ACTIONS ─── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: pageLoaded ? 1 : 0, y: pageLoaded ? 0 : 16 }}
              transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            >
              <QuickActions />
            </motion.div>

            {/* ─── FEATURED GAMES ─── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: pageLoaded ? 1 : 0, y: pageLoaded ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 0.28, ease: 'easeOut' }}
            >
              <FeaturedGames games={gamesList} searchQuery={searchQuery} />
            </motion.div>

            {/* ─── RECENT ACTIVITY + TOP WINNERS ─── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: pageLoaded ? 1 : 0, y: pageLoaded ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 0.36, ease: 'easeOut' }}
            >
              <RecentActivity />
            </motion.div>

            {/* ─── REFERRAL BANNER ─── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: pageLoaded ? 1 : 0, y: pageLoaded ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 0.42, ease: 'easeOut' }}
            >
              <ReferralBanner />
            </motion.div>

            {/* Desktop Footer */}
            <DesktopFooter />
          </div>
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
