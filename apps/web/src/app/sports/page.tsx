'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TopHeader, BottomNavigation, DesktopFooter } from '@/components/Navigation';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { SportsNavigation } from '@/components/sports/SportsNavigation';
import { LiveUpcomingTabs } from '@/components/sports/LiveUpcomingTabs';
import { SportsCategoryTabs } from '@/components/sports/SportsCategoryTabs';
import { CompetitionSection } from '@/components/sports/CompetitionSection';
import { useSportsSocket } from '@/hooks/useSportsSocket';
import { getApiBaseUrl } from '@/lib/config';
import { ISport, ICompetition, IMatch } from '@gaming-platform/types';
import { Trophy, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export default function SportsHomePage() {
  const [sports, setSports] = useState<ISport[]>([]);
  const [activeSportSlug, setActiveSportSlug] = useState<string>('cricket');
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming'>('all');
  const [competitions, setCompetitions] = useState<ICompetition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time WebSockets Hook
  const { isConnected, liveUpdate } = useSportsSocket();

  // Fetch Sports list
  const fetchSports = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/sports`).catch(() => null);
      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json && json.data && Array.isArray(json.data)) {
          setSports(json.data);
        }
      }
    } catch {
      // Graceful fallback for offline backend
    }
  }, []);

  // Fetch competition matches for active sport & tab
  const fetchMatches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = activeTab === 'all' ? 'all' : activeTab;
      const res = await fetch(`${getApiBaseUrl()}/sports/${activeSportSlug}/matches/${endpoint}`);

      if (res.ok) {
        const json = await res.json();
        setCompetitions(json.data || []);
      } else {
        // Fallback fetch all matches
        const fallbackRes = await fetch(`${getApiBaseUrl()}/sports/${activeSportSlug}/matches`);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const rawMatches = fallbackData.data || [];
          if (rawMatches.length > 0) {
            setCompetitions([
              {
                id: 'all-matches',
                name: 'All Cricket Matches',
                matches: rawMatches,
              } as ICompetition,
            ]);
          } else {
            setCompetitions([]);
          }
        } else {
          setCompetitions([]);
        }
      }
    } catch (err) {
      setError('Failed to connect to sports data service. Retrying...');
    } finally {
      setIsLoading(false);
    }
  }, [activeSportSlug, activeTab]);

  useEffect(() => {
    fetchSports();
  }, [fetchSports]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Handle real-time WebSocket live score updates smoothly
  useEffect(() => {
    if (!liveUpdate) return;
    const targetMatchId = liveUpdate.matchId || liveUpdate.score?.matchId;
    const newScore = liveUpdate.score || liveUpdate;

    if (!targetMatchId) return;

    setCompetitions((prevComps) =>
      prevComps.map((comp) => ({
        ...comp,
        matches: (comp.matches || []).map((m: IMatch) => {
          if (m.id === targetMatchId) {
            return {
              ...m,
              score: {
                ...m.score,
                ...newScore,
              },
            };
          }
          return m;
        }),
      }))
    );
  }, [liveUpdate]);

  // Calculate overall dynamic match counts from API
  const currentSport = sports.find((s) => s.slug === activeSportSlug);
  const liveCount = currentSport?.matchCount?.live ?? 0;
  const upcomingCount = currentSport?.matchCount?.upcoming ?? 0;

  return (
    <div className="w-full min-h-screen bg-[#050B20] text-[#F5F7FF] flex flex-col font-sans pt-[84px]">
      {/* Top Header */}
      <TopHeader />

      {/* Main Body */}
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto px-2 sm:px-4 py-4 gap-6 lg:pl-[220px] xl:pl-60">
        {/* Desktop Left Navigation Sidebar */}
        <DesktopSidebar activeCategory="sports" />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* Sports Navigation Bar */}
          <SportsNavigation
            activeSportSlug={activeSportSlug}
            sports={sports.map((s) => ({
              id: s.id,
              slug: s.slug,
              name: s.name,
              iconName: s.icon || 'trophy',
              matchCount: s.matchCount?.total,
            }))}
            onSelectSport={(slug) => {
              setActiveSportSlug(slug);
            }}
          />

          {/* Hero Banner */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#0C1F4D] via-[#0E2866] to-[#0A183D] border border-white/10 p-6 sm:p-8 shadow-2xl">
            <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-gradient-to-br from-[#00E5A0]/20 to-[#00D9FF]/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E5A0]/15 text-[#00E5A0] text-xs font-bold border border-[#00E5A0]/30">
                <Sparkles className="w-3.5 h-3.5" />
                Live Sports Center
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Cricket & Global Sports Hub
              </h1>
              <p className="text-xs sm:text-sm text-[#B8C7E6] leading-relaxed">
                Experience real-time match scores, ball-by-ball commentary, full scorecards, and statistical match insights for all international and domestic competitions.
              </p>
            </div>
          </div>

          {/* Game Category Shortcuts */}
          <SportsCategoryTabs
            sports={sports}
            activeSlug={activeSportSlug}
            onSelect={(slug) => setActiveSportSlug(slug)}
          />

          {/* Live & Upcoming Navigation Bar */}
          <LiveUpcomingTabs
            activeTab={activeTab}
            liveCount={liveCount}
            upcomingCount={upcomingCount}
            isConnected={isConnected}
            onTabChange={(tab) => setActiveTab(tab)}
          />

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="space-y-4 py-4">
              {[1, 2].map((n) => (
                <div key={n} className="bg-[#08132E] border border-white/10 rounded-2xl p-6 space-y-4 animate-pulse">
                  <div className="h-6 w-48 bg-white/10 rounded-lg"></div>
                  <div className="h-24 w-full bg-white/5 rounded-xl"></div>
                </div>
              ))}
            </div>
          )}

          {/* Error Banner */}
          {error && !isLoading && (
            <div className="bg-amber-500/15 border border-amber-500/30 p-4 rounded-2xl text-amber-200 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchMatches()}
                className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 hover:bg-amber-400 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* Competition Grouped Matches */}
          {!isLoading && competitions.length > 0 && (
            <div className="space-y-5 pb-8">
              {competitions.map((comp) => (
                <CompetitionSection key={comp.id} competition={comp} sportSlug={activeSportSlug} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && competitions.length === 0 && (
            <div className="bg-[#08132E]/80 border border-white/10 rounded-3xl p-12 text-center space-y-4 my-6">
              <div className="w-16 h-16 rounded-full bg-[#101C3A] text-[#00E5A0] flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">No matches scheduled for this category</h3>
              <p className="text-xs text-[#7183A8] max-w-md mx-auto">
                There are currently no active {activeTab} matches for {activeSportSlug}. Switch to another tab or select Cricket to view live score updates.
              </p>
              <button
                onClick={() => {
                  setActiveSportSlug('cricket');
                  setActiveTab('all');
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-[#397F32] to-[#579D43] text-white font-bold text-xs rounded-xl shadow-lg hover:brightness-110 transition-all cursor-pointer"
              >
                View Cricket Matches
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Desktop Footer & Mobile Navigation */}
      <DesktopFooter />
      <BottomNavigation />
    </div>
  );
}
