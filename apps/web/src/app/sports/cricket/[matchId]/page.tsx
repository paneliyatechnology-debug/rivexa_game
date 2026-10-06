'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { TopHeader, BottomNavigation, DesktopFooter } from '@/components/Navigation';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { MatchDetailHeader } from '@/components/sports/MatchDetailHeader';
import { MatchDetailTabs, MatchTabType } from '@/components/sports/MatchDetailTabs';
import { MatchSummaryPanel } from '@/components/sports/MatchSummaryPanel';
import { ScorecardView } from '@/components/sports/Scorecard';
import { CommentaryTimeline } from '@/components/sports/CommentaryTimeline';
import { StatisticsPanel } from '@/components/sports/StatisticsPanel';
import { SquadsPanel } from '@/components/sports/SquadsPanel';
import { MarketCategoryTabs, IMarketCategory } from '@/components/sports/MarketCategoryTabs';
import { MarketCardView, ICricketMarketData, IMarketSelection } from '@/components/sports/MarketCardView';
import { BetSlip, IBetSlipItem } from '@/components/sports/BetSlip';
import { TestBetHistoryView } from '@/components/sports/TestBetHistoryView';
import { useSportsSocket } from '@/hooks/useSportsSocket';
import { getApiBaseUrl } from '@/lib/config';
import { IMatch } from '@gaming-platform/types';
import { RefreshCw, AlertCircle, History, Sparkles } from 'lucide-react';

import { getActiveMarkets } from '@/utils/marketLifecycleSelector';

export default function CricketMatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.matchId;

  const [match, setMatch] = useState<IMatch | null>(null);
  const [activeTab, setActiveTab] = useState<MatchTabType>('summary');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Markets & Odds state
  const [categories, setCategories] = useState<IMarketCategory[]>([]);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>('all');
  const [markets, setMarkets] = useState<ICricketMarketData[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState<boolean>(false);
  const [marketsError, setMarketsError] = useState<string | null>(null);

  // Bet Slip state
  const [betSlipItems, setBetSlipItems] = useState<IBetSlipItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // WebSocket for Real-Time Match Events
  const {
    isConnected,
    liveUpdate,
    ballEvent,
    oddsUpdate,
    matchCompletedEvent,
    marketClosedEvent,
    marketSettledEvent,
    marketUpdatedEvent,
    matchMarketsClosedEvent,
    connectionVersion,
  } = useSportsSocket(matchId);

  // Handle market closed / settled realtime events
  useEffect(() => {
    const closedEvent = marketClosedEvent || marketSettledEvent;
    if (closedEvent && closedEvent.marketId) {
      const targetMarketId = closedEvent.marketId;
      setMarkets((prev) => prev.filter((m) => m.id !== targetMarketId));
      setBetSlipItems((prev) => prev.filter((it) => it.marketId !== targetMarketId));
    }
  }, [marketClosedEvent, marketSettledEvent]);

  // Handle match completed / all markets closed realtime events
  useEffect(() => {
    const completedEvt = matchCompletedEvent || matchMarketsClosedEvent;
    if (completedEvt) {
      setMarkets([]);
      setBetSlipItems([]);
    }
  }, [matchCompletedEvent, matchMarketsClosedEvent]);

  // Update market odds dynamically on Socket.IO oddsUpdate event
  useEffect(() => {
    if (oddsUpdate && oddsUpdate.marketId && oddsUpdate.selectionId) {
      const targetOdds = oddsUpdate.newOdds || oddsUpdate.finalOdds;
      if (!targetOdds) return;
      setMarkets((prevMarkets) => {
        const targetMarket = prevMarkets.find((m) => m.id === oddsUpdate.marketId);
        if (targetMarket && (targetMarket.status === 'CLOSED' || targetMarket.status === 'SETTLED')) {
          // Stale Odds Protection: DO NOT reopen closed/settled markets
          return prevMarkets;
        }
        return prevMarkets.map((m) => {
          if (m.id !== oddsUpdate.marketId) return m;
          return {
            ...m,
            selections: m.selections.map((sel) => {
              if (sel.id !== oddsUpdate.selectionId) return sel;
              return {
                ...sel,
                backPrice: targetOdds,
              };
            }),
          };
        });
      });
    }
  }, [oddsUpdate]);

  // Fetch full match detail from NestJS API
  const fetchMatchDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/matches/${matchId}`);
      if (!res.ok) throw new Error('Match not found');
      const json = await res.json();
      if (json.data) {
        setMatch(json.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed loading match details');
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  // Fetch active markets & categories for current match
  const fetchMarkets = useCallback(async (catSlug: string, showSpinner = true) => {
    if (showSpinner) setIsLoadingMarkets(true);
    setMarketsError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/matches/${matchId}/markets/active?category=${catSlug}`);
      if (!res.ok) throw new Error('Failed loading markets');
      const json = await res.json();
      if (json.data) {
        setMarkets(json.data.markets || []);
      }
    } catch (err: any) {
      setMarketsError(err.message || 'Failed loading markets data');
    } finally {
      if (showSpinner) setIsLoadingMarkets(false);
    }
  }, [matchId]);

  // Handle market updated / newly created rolling markets realtime events with deduplication
  const lastHandledMarketUpdateRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (marketUpdatedEvent && activeTab === 'markets') {
      const eventKey = `${marketUpdatedEvent.marketId || ''}:${marketUpdatedEvent.timestamp || ''}`;
      if (lastHandledMarketUpdateRef.current !== eventKey) {
        lastHandledMarketUpdateRef.current = eventKey;
        void fetchMarkets(activeCategorySlug, false);
      }
    }
  }, [marketUpdatedEvent, activeTab, activeCategorySlug, fetchMarkets]);

  // Fetch categories once
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/markets/categories`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setCategories(json.data);
        }
      }
    } catch {
      // Categories are database-managed; do not substitute production data in the client.
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    fetchMatchDetail();
    fetchCategories();
  }, [fetchMatchDetail, fetchCategories]);

  // A reconnect can have missed notifications: recover from the API/DB once.
  useEffect(() => {
    if (connectionVersion > 1) void fetchMatchDetail();
  }, [connectionVersion, fetchMatchDetail]);

  useEffect(() => {
    if (activeTab === 'markets') {
      fetchMarkets(activeCategorySlug, true);
    }
  }, [activeTab, activeCategorySlug, fetchMarkets]);

  // Handle selection toggling on Market Cards
  const handleSelectOdds = (
    selection: IMarketSelection,
    market: ICricketMarketData,
    customStake?: number
  ) => {
    const existingIndex = betSlipItems.findIndex((it) => it.selectionId === selection.id);
    const initialStake = customStake && customStake > 0 ? customStake : 100;

    if (existingIndex >= 0) {
      if (customStake !== undefined && customStake > 0) {
        // Update stake for selection already in slip if customStake passed
        setBetSlipItems((prev) =>
          prev.map((it) => (it.selectionId === selection.id ? { ...it, stake: initialStake } : it))
        );
      } else {
        // Toggle off
        setBetSlipItems((prev) => prev.filter((it) => it.selectionId !== selection.id));
      }
    } else {
      // Add selection with custom stake or default 100
      const matchName = match ? `${match.teamA?.name} vs ${match.teamB?.name}` : 'Cricket Match';
      const newItem: IBetSlipItem = {
        matchId,
        matchName,
        marketId: market.id,
        marketName: market.name,
        selectionId: selection.id,
        selectionName: selection.name,
        odds: Number(selection.backPrice),
        stake: initialStake,
      };
      // Replace single selection per market or append
      setBetSlipItems((prev) => [...prev.filter((it) => it.marketId !== market.id), newItem]);
    }
  };

  const handleRemoveBetItem = (selectionId: string) => {
    setBetSlipItems((prev) => prev.filter((it) => it.selectionId !== selectionId));
  };

  const handleClearAllBets = () => {
    setBetSlipItems([]);
  };

  const handleStakeChange = (selectionId: string, stake: number) => {
    setBetSlipItems((prev) =>
      prev.map((it) => (it.selectionId === selectionId ? { ...it, stake } : it))
    );
  };

  // Handle WebSocket score updates in real-time with instant local state mutation
  useEffect(() => {
    if (!liveUpdate) return;
    const targetMatchId = liveUpdate.matchId || liveUpdate.score?.matchId;
    if (targetMatchId && targetMatchId !== matchId) return;

    const incomingScore = liveUpdate.score || (liveUpdate.teamAScore ? liveUpdate : null);
    if (incomingScore) {
      setMatch((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          score: {
            ...prev.score,
            ...incomingScore,
            teamAScore: incomingScore.teamAScore ?? prev.score?.teamAScore,
            teamBScore: incomingScore.teamBScore ?? prev.score?.teamBScore,
            teamAOvers: incomingScore.teamAOvers ?? prev.score?.teamAOvers,
            teamBOvers: incomingScore.teamBOvers ?? prev.score?.teamBOvers,
            statusText: incomingScore.statusText ?? prev.score?.statusText,
            recentOvers: incomingScore.recentOvers ?? prev.score?.recentOvers,
            activeBatsman: incomingScore.activeBatsman ?? prev.score?.activeBatsman,
            activeBowler: incomingScore.activeBowler ?? prev.score?.activeBowler,
          },
          status: incomingScore.status ? incomingScore.status.toUpperCase() : prev.status,
          resultSummary: incomingScore.resultSummary ?? prev.resultSummary,
        };
      });
    }
  }, [liveUpdate, matchId]);

  // Commentary & ball events follow the same real-time update path
  useEffect(() => {
    if (!ballEvent) return;
    const targetMatchId = ballEvent.matchId || ballEvent.ball?.matchId;
    if (targetMatchId && targetMatchId !== matchId) return;

    const incomingScore = ballEvent.score || ballEvent.ball?.score || (ballEvent.teamAScore ? ballEvent : null);
    if (incomingScore) {
      setMatch((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          score: {
            ...prev.score,
            ...incomingScore,
            teamAScore: incomingScore.teamAScore ?? prev.score?.teamAScore,
            teamBScore: incomingScore.teamBScore ?? prev.score?.teamBScore,
            teamAOvers: incomingScore.teamAOvers ?? prev.score?.teamAOvers,
            teamBOvers: incomingScore.teamBOvers ?? prev.score?.teamBOvers,
            statusText: incomingScore.statusText ?? prev.score?.statusText,
            recentOvers: incomingScore.recentOvers ?? prev.score?.recentOvers,
          },
        };
      });
    }
  }, [ballEvent, matchId]);

  return (
    <div className="w-full h-screen bg-gradient-to-b from-[#0F1C45] via-[#0A1433] to-[#070E24] text-[#F5F7FF] flex flex-col font-sans pt-[78px] sm:pt-[84px] overflow-hidden">
      <TopHeader />

      <div className="flex-1 flex w-full max-w-[1600px] mx-auto px-1.5 sm:px-4 py-1 sm:py-3 gap-3 lg:gap-6 lg:pl-[220px] xl:pl-60 overflow-hidden h-[calc(100vh-78px)] sm:h-[calc(100vh-84px)]">
        {/* Left Sidebar */}
        <DesktopSidebar activeCategory="sports" />

        {/* Center Main Column */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar space-y-3 sm:space-y-4 pr-1 sm:pr-2 pb-28 sm:pb-24">
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4 py-8">
              <div className="h-48 w-full bg-[#132554] border border-white/10 rounded-2xl animate-pulse"></div>
              <div className="h-64 w-full bg-[#132554] border border-white/10 rounded-2xl animate-pulse"></div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-amber-500/15 border border-amber-500/30 p-6 rounded-2xl text-amber-200 text-sm flex items-center justify-between my-8">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchMatchDetail()}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-amber-400 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          )}

          {/* Match Content */}
          {!isLoading && match && (
            <>
              {/* 1. COMPACT MATCH STADIUM HEADER (Scrolls out naturally when scrolling down) */}
              <MatchDetailHeader match={match} isConnected={isConnected} />

              {/* 2. STICKY SUB-TABS BAR (Sticks to top when scrolled!) */}
              <div className="sticky top-0 z-30 bg-[#0F1F4D]/95 backdrop-blur-md border-y border-cyan-500/30 shadow-md py-1 rounded-xl">
                <MatchDetailTabs activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
              </div>

              {/* 3. INNER TAB CONTENT (Scrolls smoothly under the sticky tabs bar) */}
              <div className="pt-1 space-y-4">
                {activeTab === 'summary' && <MatchSummaryPanel match={match} />}

                {/* MARKETS & ODDS TAB */}
                {activeTab === 'markets' && (
                  <div className="space-y-4">
                    {/* Header bar with My Bet History toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#132657] border border-cyan-500/30 p-3 sm:p-4 rounded-2xl shadow-md">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-black text-white text-sm tracking-wide">Cricket Betting Markets</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-extrabold text-[10px] border border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                          Live Odds
                        </span>
                      </div>

                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          showHistory
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                            : 'bg-[#18316E] hover:bg-[#1F3D8A] text-[#C2D4F8] hover:text-white border border-white/10'
                        }`}
                      >
                        <History className="w-4 h-4" />
                        {showHistory ? 'Hide Bet History' : 'My Bet History'}
                      </button>
                    </div>

                    {/* Show Test Bet History panel if open */}
                    {showHistory && <TestBetHistoryView onClose={() => setShowHistory(false)} />}

                    {/* Market Category Tabs */}
                    {categories.length > 0 && (
                      <MarketCategoryTabs
                        categories={categories}
                        activeSlug={activeCategorySlug}
                        onSelectCategory={(slug) => setActiveCategorySlug(slug)}
                      />
                    )}

                    {/* Non-monetary Exchange Disclaimer */}
                    {/* <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/50 to-blue-900/40 border border-blue-400/30 rounded-xl p-3 text-xs text-blue-200 flex items-center gap-2 shadow-sm">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Odds displayed are derived from live CricAPI scoring data & statistical probability models. Back odds are active for real test placement.
                      </span>
                    </div> */}

                    {/* Loading Markets */}
                    {isLoadingMarkets && (
                      <div className="py-12 text-center text-xs text-slate-300 space-y-2">
                        <div className="w-6 h-6 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p>Loading market categories & odds...</p>
                      </div>
                    )}

                    {/* Markets Error */}
                    {marketsError && !isLoadingMarkets && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center justify-between">
                        <span>{marketsError}</span>
                        <button
                          onClick={() => fetchMarkets(activeCategorySlug)}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg text-[11px] font-bold"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {/* Market Cards List */}
                    {!isLoadingMarkets && !marketsError && (
                      <div className="space-y-4">
                        {(() => {
                          const visibleMarkets = getActiveMarkets(markets);
                          if (visibleMarkets.length === 0) {
                            const isMatchEnded = (match?.status as string) === 'COMPLETED' || (match?.status as string) === 'FINISHED';
                            return (
                              <div className="py-12 bg-[#132657] border border-white/10 rounded-2xl text-center text-xs text-slate-300">
                                {isMatchEnded
                                  ? 'Match completed — betting markets are closed.'
                                  : 'No active betting markets available in this category currently.'}
                              </div>
                            );
                          }
                          return visibleMarkets.map((m) => {
                            const selectedInThisMarket = betSlipItems.find((it) => it.marketId === m.id);
                            return (
                              <MarketCardView
                                key={m.id}
                                market={m}
                                onSelectOdds={handleSelectOdds}
                                selectedSelectionId={selectedInThisMarket?.selectionId}
                                matchId={matchId}
                              />
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'scorecard' && <ScorecardView scorecard={match.scorecard} />}
                {activeTab === 'commentary' && <CommentaryTimeline commentaries={match.commentaries || []} />}
                {activeTab === 'statistics' && <StatisticsPanel match={match} />}
                {activeTab === 'squads' && <SquadsPanel match={match} />}
              </div>
            </>
          )}
        </main>

        {/* Right Sticky Bet Slip */}
        <BetSlip
          items={betSlipItems}
          currentMatchId={matchId}
          onRemoveItem={handleRemoveBetItem}
          onClearAll={handleClearAllBets}
          onStakeChange={handleStakeChange}
        />

      </div>

      <DesktopFooter />
      <BottomNavigation />
    </div>
  );
}

