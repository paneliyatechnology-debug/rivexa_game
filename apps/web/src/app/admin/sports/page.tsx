'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/config';
import { useSportsSocket } from '@/hooks/useSportsSocket';
import { CricketPricingAdminSection } from '@/components/sports/CricketPricingAdminSection';
import {
  Trophy,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  Activity,
  Plus,
  CheckCircle,
  AlertTriangle,
  Search,
  Ticket,
  Sliders,
  Radio,
  Wifi,
  Check,
  X,
  FileText,
  HelpCircle,
  Trash2,
  ExternalLink,
  ChevronRight,
  Menu,
  Bell,
  Zap,
  Edit3,
  Clock,
  Sparkles,
} from 'lucide-react';

function SportsAdminContent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [providerStatus, setProviderStatus] = useState<any>(null);

  // Userwise Bet History state
  const [testBets, setTestBets] = useState<any[]>([]);
  const [betSearch, setBetSearch] = useState<string>('');
  const [betStatusFilter, setBetStatusFilter] = useState<string>('ALL');
  const [loadingBets, setLoadingBets] = useState<boolean>(false);

  // Market & Odd/Even settings state
  const [marketCategories, setMarketCategories] = useState<any[]>([]);
  const [oddEvenSettings, setOddEvenSettings] = useState<any>(null);

  // Custom Question Bet Creator State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [creatingMarket, setCreatingMarket] = useState<boolean>(false);
  const [customForm, setCustomForm] = useState<{
    matchId: string;
    categorySlug: string;
    name: string;
    marketType: string;
    lineThreshold: string;
    selections: { name: string; backPrice: number }[];
  }>({
    matchId: '',
    categorySlug: 'session',
    name: '',
    marketType: 'SESSION_FANCY',
    lineThreshold: '48.5',
    selections: [
      { name: 'Yes (Over 48.5)', backPrice: 1.85 },
      { name: 'No (Under 48.5)', backPrice: 1.85 },
    ],
  });

  // Provider Configuration Edit Form
  const [providerForm, setProviderForm] = useState<{
    providerName: string;
    baseUrl: string;
    apiKey: string;
    authParamName: string;
    isActive: boolean;
    isTestMode: boolean;
  }>({
    providerName: '',
    baseUrl: '',
    apiKey: '',
    authParamName: '',
    isActive: true,
    isTestMode: true,
  });
  const [isCustomProviderName, setIsCustomProviderName] = useState<boolean>(false);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Connection test & capabilities state
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);
  const [detectingCapabilities, setDetectingCapabilities] = useState<boolean>(false);
  const [autoSyncActive, setAutoSyncActive] = useState<boolean>(true);
  const [triggeringBall, setTriggeringBall] = useState<boolean>(false);

  // Add Match Modal State
  const [showAddMatchModal, setShowAddMatchModal] = useState<boolean>(false);
  const [submittingMatch, setSubmittingMatch] = useState<boolean>(false);
  const [addMatchForm, setAddMatchForm] = useState({
    sportSlug: 'cricket',
    competitionId: '',
    competitionName: '',
    teamAName: '',
    teamAShort: '',
    teamBName: '',
    teamBShort: '',
    matchType: 'T20',
    venue: '',
    startTime: '',
    status: 'UPCOMING',
    teamAScore: '',
    teamBScore: '',
    teamAOvers: '',
    teamBOvers: '',
    statusText: '',
  });

  // Live Control Modal State
  const [showLiveControlModal, setShowLiveControlModal] = useState<boolean>(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [updatingLiveScore, setUpdatingLiveScore] = useState<boolean>(false);
  const [liveScoreForm, setLiveScoreForm] = useState({
    teamAScore: '',
    teamBScore: '',
    teamAOvers: '',
    teamBOvers: '',
    currentInnings: 1,
    statusText: '',
    activeBatsman: '',
    activeBowler: '',
    recentOvers: '',
    resultSummary: '',
    status: 'LIVE',
    winner: 'teamA',
  });

  // Edit Match Details Modal State
  const [showEditMatchModal, setShowEditMatchModal] = useState<boolean>(false);
  const [editMatchForm, setEditMatchForm] = useState({
    id: '',
    teamAName: '',
    teamAShort: '',
    teamBName: '',
    teamBShort: '',
    matchType: 'T20',
    venue: '',
    startTime: '',
    status: 'UPCOMING',
    resultSummary: '',
  });

  // Bet Settings state
  const [betSettings, setBetSettings] = useState<{
    minStake: number;
    maxStake: number;
    maxProfitCap: number;
    bookmakerMargin: number;
    autoSettle: boolean;
    autoRefundVoid: boolean;
    userCancelWindowSec: number;
    oddEvenEnabled: boolean;
    oddEvenDefaultOdds: number;
    maxBetsPerUserPerMatch: number;
    liveBetDelaySec: number;
    betNotice: string;
  }>({
    minStake: 10,
    maxStake: 50000,
    maxProfitCap: 200000,
    bookmakerMargin: 4.5,
    autoSettle: true,
    autoRefundVoid: true,
    userCancelWindowSec: 10,
    oddEvenEnabled: true,
    oddEvenDefaultOdds: 1.90,
    maxBetsPerUserPerMatch: 20,
    liveBetDelaySec: 2,
    betNotice: 'Bet responsibly. Odds fluctuate in real time during live sports matches.',
  });
  const [loadingBetSettings, setLoadingBetSettings] = useState<boolean>(false);
  const [savingBetSettings, setSavingBetSettings] = useState<boolean>(false);

  // Odds & Win % Configurator State
  const [showOddsConfigModal, setShowOddsConfigModal] = useState(false);
  const [selectedOddsMatch, setSelectedOddsMatch] = useState<any>(null);
  const [oddsConfigForm, setOddsConfigForm] = useState({
    matchId: '',
    mode: 'AUTO' as 'AUTO' | 'MANUAL',
    winProbA: 50,
    winProbB: 50,
    oddsA: 2.00,
    oddsB: 2.00,
  });
  const [savingOddsConfig, setSavingOddsConfig] = useState(false);

  const handleOpenOddsConfigModal = async (match: any) => {
    setSelectedOddsMatch(match);
    const initialProbA = match.statsSummary?.winProbabilityTeamA || 50;
    const initialProbB = match.statsSummary?.winProbabilityTeamB || (100 - initialProbA);
    const initialOddsA = match.statsSummary?.oddsA || Number((100 / Math.max(1, initialProbA)).toFixed(2));
    const initialOddsB = match.statsSummary?.oddsB || Number((100 / Math.max(1, initialProbB)).toFixed(2));

    setOddsConfigForm({
      matchId: match.id,
      mode: match.statsSummary?.isManual ? 'MANUAL' : 'AUTO',
      winProbA: initialProbA,
      winProbB: initialProbB,
      oddsA: initialOddsA,
      oddsB: initialOddsB,
    });
    setShowOddsConfigModal(true);

    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/matches/${match.id}/odds`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setOddsConfigForm({
            matchId: match.id,
            mode: json.data.mode || 'AUTO',
            winProbA: json.data.winProbA || initialProbA,
            winProbB: json.data.winProbB || initialProbB,
            oddsA: json.data.oddsA || initialOddsA,
            oddsB: json.data.oddsB || initialOddsB,
          });
        }
      }
    } catch (err) {}
  };

  const handleSaveOddsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oddsConfigForm.matchId) return;
    setSavingOddsConfig(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/matches/${oddsConfigForm.matchId}/odds`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: oddsConfigForm.mode,
          winProbA: Number(oddsConfigForm.winProbA),
          winProbB: Number(oddsConfigForm.winProbB),
          oddsA: Number(oddsConfigForm.oddsA),
          oddsB: Number(oddsConfigForm.oddsB),
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setMessage(`Match Odds & Win % Configured (${json.data.mode} Mode)!`);
        setShowOddsConfigModal(false);
        fetchAdminData();
      } else {
        setMessage('Failed to save odds config');
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSavingOddsConfig(false);
    }
  };

  // Match Analytics & Question Management Modal State
  const [showMatchAnalyticsModal, setShowMatchAnalyticsModal] = useState<boolean>(false);
  const [selectedAnalyticsMatch, setSelectedAnalyticsMatch] = useState<any>(null);
  const [matchAnalyticsData, setMatchAnalyticsData] = useState<any>(null);
  const [loadingMatchAnalytics, setLoadingMatchAnalytics] = useState<boolean>(false);
  const [analyticsTab, setAnalyticsTab] = useState<'REVENUE' | 'QUESTIONS' | 'ODD_EVEN'>('REVENUE');
  const [matchOddEvenForm, setMatchOddEvenForm] = useState<{ enabled: boolean; rate: number }>({
    enabled: true,
    rate: 1.90,
  });
  const [savingMatchOddEven, setSavingMatchOddEven] = useState<boolean>(false);

  const handleOpenMatchAnalytics = async (match: any) => {
    setSelectedAnalyticsMatch(match);
    setShowMatchAnalyticsModal(true);
    setLoadingMatchAnalytics(true);
    setAnalyticsTab('REVENUE');
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/matches/${match.id}/analytics`);
      if (res.ok) {
        const json = await res.json();
        setMatchAnalyticsData(json.data);
        if (json.data?.oddEvenConfig) {
          setMatchOddEvenForm({
            enabled: json.data.oddEvenConfig.enabled,
            rate: json.data.oddEvenConfig.rate || 1.90,
          });
        }
      }
    } catch (err: any) {
      console.error('Failed loading match analytics:', err);
    } finally {
      setLoadingMatchAnalytics(false);
    }
  };

  const handleSaveMatchOddEven = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnalyticsMatch?.id) return;
    setSavingMatchOddEven(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/matches/${selectedAnalyticsMatch.id}/odd-even`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchOddEvenForm),
      });
      if (res.ok) {
        const json = await res.json();
        setMatchAnalyticsData(json.data);
        setMessage(`Match Odd/Even settings updated for ${selectedAnalyticsMatch.teamA?.name} vs ${selectedAnalyticsMatch.teamB?.name}`);
      }
    } catch (err: any) {
      setMessage(`Failed updating match odd/even rate: ${err.message}`);
    } finally {
      setSavingMatchOddEven(false);
    }
  };

  const handleDeleteMatchMarket = async (marketId: string) => {
    if (!window.confirm('Are you sure you want to delete this market/question?')) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/markets/${marketId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessage('Market deleted successfully');
        if (selectedAnalyticsMatch?.id) {
          handleOpenMatchAnalytics(selectedAnalyticsMatch);
        }
      }
    } catch (err: any) {
      setMessage(`Error deleting market: ${err.message}`);
    }
  };

  const searchParams = useSearchParams();
  const router = useRouter();

  type TabType =
    | 'matches'
    | 'bets'
    | 'markets'
    | 'categories'
    | 'competitions'
    | 'provider'
    | 'bet_settings'
    | 'pricing_engine';

  const validTabs = useMemo<TabType[]>(
    () => ['matches', 'bets', 'markets', 'categories', 'competitions', 'provider', 'bet_settings', 'pricing_engine'],
    []
  );

  const tabQuery = searchParams.get('tab') as TabType | null;

  const [activeTab, setActiveTabState] = useState<TabType>(() => {
    if (tabQuery && validTabs.includes(tabQuery)) {
      return tabQuery;
    }
    return 'matches';
  });

  useEffect(() => {
    if (tabQuery && validTabs.includes(tabQuery) && tabQuery !== activeTab) {
      setActiveTabState(tabQuery);
    }
  }, [tabQuery, validTabs, activeTab]);

  const setActiveTab = useCallback(
    (tab: TabType) => {
      setActiveTabState(tab);
      router.push(`/admin/sports?tab=${tab}`, { scroll: false });
    },
    [router]
  );
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Match Directory DataTable State & Filtering
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [matchStatusFilter, setMatchStatusFilter] = useState('ALL');
  const [matchCompetitionFilter, setMatchCompetitionFilter] = useState('ALL');
  const [matchFormatFilter, setMatchFormatFilter] = useState('ALL');
  const [matchCurrentPage, setMatchCurrentPage] = useState(1);
  const [matchPageSize, setMatchPageSize] = useState(10);

  // Filtered Matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // 1. Search Query Filter
      if (matchSearchQuery.trim()) {
        const q = matchSearchQuery.toLowerCase().trim();
        const teamA = (m.teamA?.name || '').toLowerCase();
        const teamB = (m.teamB?.name || '').toLowerCase();
        const comp = (m.competition?.name || '').toLowerCase();
        const venue = (m.venue || '').toLowerCase();
        const matchType = (m.matchType || '').toLowerCase();
        const status = (m.status || '').toLowerCase();
        if (
          !teamA.includes(q) &&
          !teamB.includes(q) &&
          !comp.includes(q) &&
          !venue.includes(q) &&
          !matchType.includes(q) &&
          !status.includes(q)
        ) {
          return false;
        }
      }

      // 2. Status Filter
      if (matchStatusFilter !== 'ALL' && m.status !== matchStatusFilter) {
        return false;
      }

      // 3. Competition Filter
      if (matchCompetitionFilter !== 'ALL' && m.competitionId !== matchCompetitionFilter) {
        return false;
      }

      // 4. Format Filter
      if (matchFormatFilter !== 'ALL' && (m.matchType || '').toUpperCase() !== matchFormatFilter) {
        return false;
      }

      return true;
    });
  }, [matches, matchSearchQuery, matchStatusFilter, matchCompetitionFilter, matchFormatFilter]);

  const totalMatchPages = Math.ceil(filteredMatches.length / matchPageSize) || 1;

  const paginatedMatches = useMemo(() => {
    const start = (matchCurrentPage - 1) * matchPageSize;
    return filteredMatches.slice(start, start + matchPageSize);
  }, [filteredMatches, matchCurrentPage, matchPageSize]);

  // Reset to page 1 when filter parameters change
  useEffect(() => {
    setMatchCurrentPage(1);
  }, [matchSearchQuery, matchStatusFilter, matchCompetitionFilter, matchFormatFilter, matchPageSize]);

  const fetchBetSettings = useCallback(async () => {
    setLoadingBetSettings(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/sports/bet-settings`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) setBetSettings(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBetSettings(false);
    }
  }, []);

  const handleSaveBetSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBetSettings(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/sports/bet-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betSettings),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage('Bet settings saved & updated successfully!');
        if (json.data) setBetSettings(json.data);
      } else {
        setMessage(`Failed to save bet settings: ${json.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      setMessage(`Error saving bet settings: ${err.message}`);
    } finally {
      setSavingBetSettings(false);
    }
  };

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, compRes, matchRes, provRes] = await Promise.all([
        fetch(`${getApiBaseUrl()}/admin/sports/categories`).catch(() => null),
        fetch(`${getApiBaseUrl()}/admin/sports/competitions`).catch(() => null),
        fetch(`${getApiBaseUrl()}/admin/sports/matches`).catch(() => null),
        fetch(`${getApiBaseUrl()}/cricket/admin/status`).catch(() => null),
      ]);

      if (catRes?.ok) setCategories((await catRes.json()).data || []);
      if (compRes?.ok) setCompetitions((await compRes.json()).data || []);
      if (matchRes?.ok) {
        const mList = (await matchRes.json()).data || [];
        setMatches(mList);
        if (mList.length > 0 && !customForm.matchId) {
          setCustomForm((prev) => ({ ...prev, matchId: mList[0].id }));
        }
      }
      if (provRes?.ok) {
        const pData = (await provRes.json()).data || null;
        setProviderStatus(pData);
        if (pData?.providerDetails) {
          const name = pData.activeProvider || pData.providerDetails.name || '';
          setProviderForm({
            providerName: name,
            baseUrl: pData.providerDetails.baseUrl || '',
            apiKey: pData.providerDetails.apiKey || '',
            authParamName: pData.providerDetails.authParamName || '',
            isActive: pData.providerDetails.isActive ?? true,
            isTestMode: pData.providerDetails.isTestMode ?? true,
          });
          const knownProviders = ['cricapi', 'entitysport', 'sportmonks', 'generic_rest', 'custom_rest'];
          if (name && !knownProviders.includes(name)) {
            setIsCustomProviderName(true);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [customForm.matchId]);

  const fetchUserBets = useCallback(async () => {
    setLoadingBets(true);
    try {
      const query = new URLSearchParams();
      if (betSearch) query.append('search', betSearch);
      if (betStatusFilter !== 'ALL') query.append('status', betStatusFilter);

      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/test-bets?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTestBets(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBets(false);
    }
  }, [betSearch, betStatusFilter]);

  const fetchMarketSettings = useCallback(async () => {
    try {
      const catRes = await fetch(`${getApiBaseUrl()}/cricket/markets/categories`);
      const oeRes = await fetch(`${getApiBaseUrl()}/cricket/admin/odd-even/settings`);

      if (catRes.ok) setMarketCategories((await catRes.json()).data || []);
      if (oeRes.ok) setOddEvenSettings((await oeRes.json()).data || null);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Real-time WebSockets Hook for Admin Control Panel
  const { isConnected: isSocketConnected, liveUpdate: adminLiveUpdate, matchCompletedEvent: adminMatchCompleted } = useSportsSocket();

  // Listen to live score updates from backend WebSocket & update table matches list
  useEffect(() => {
    if (!adminLiveUpdate) return;
    const targetMatchId = adminLiveUpdate.matchId || adminLiveUpdate.score?.matchId;
    const newScore = adminLiveUpdate.score || adminLiveUpdate;

    if (!targetMatchId) return;

    setMatches((prevMatches) =>
      prevMatches.map((m) => {
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
      })
    );
  }, [adminLiveUpdate]);

  useEffect(() => {
    if (!adminMatchCompleted) return;
    const targetMatchId = adminMatchCompleted.matchId || adminMatchCompleted.match?.id;
    if (!targetMatchId) return;

    setMatches((prevMatches) =>
      prevMatches.map((m) => {
        if (m.id === targetMatchId) {
          return {
            ...m,
            status: 'COMPLETED',
            resultSummary: adminMatchCompleted.match?.resultSummary || m.resultSummary,
          };
        }
        return m;
      })
    );
  }, [adminMatchCompleted]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  useEffect(() => {
    if (activeTab === 'bets') fetchUserBets();
    if (activeTab === 'markets') fetchMarketSettings();
    if (activeTab === 'bet_settings') fetchBetSettings();
  }, [activeTab, fetchUserBets, fetchMarketSettings, fetchBetSettings]);

  const handleManualSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/sync`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setMessage(`Manual CricAPI sync completed: ${json.message}`);
      } else {
        setMessage(`Sync error: ${json.message}`);
      }
      fetchAdminData();
    } catch (err: any) {
      setMessage(`Sync request failed: ${err.message || String(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  const handlePurgeStaleMatches = async () => {
    if (!window.confirm('Are you sure you want to purge all dummy/stale matches and re-sync from active API provider?')) {
      return;
    }
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/purge-matches`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setMessage(json.message || 'Purged stale matches successfully!');
      } else {
        setMessage(`Purge failed: ${json.message || 'Unknown error'}`);
      }
      fetchAdminData();
    } catch (err: any) {
      setMessage(`Purge request failed: ${err.message || String(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/test-connection`, {
        method: 'POST',
      });
      const json = await res.json();
      setConnectionResult(json.data);
    } catch (err: any) {
      setConnectionResult({
        success: false,
        statusText: `Request failed: ${err.message || String(err)}`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleDetectCapabilities = async () => {
    setDetectingCapabilities(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/detect-capabilities`, {
        method: 'POST',
      });
      if (res.ok) {
        setMessage('Provider capabilities re-detected & verified successfully');
        fetchAdminData();
      }
    } catch (err) { }
    setDetectingCapabilities(false);
  };

  const handleSaveProviderConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/provider/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerForm),
      });
      if (res.ok) {
        setMessage('Provider settings saved successfully!');
        fetchAdminData();
      }
    } catch (e) { }
    setSavingConfig(false);
  };

  const handleCreateCustomMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.matchId || !customForm.name) {
      setMessage('Please select a match and enter question name');
      return;
    }
    setCreatingMarket(true);
    try {
      const payload = {
        matchId: customForm.matchId,
        categorySlug: customForm.categorySlug,
        name: customForm.name,
        marketType: customForm.marketType,
        lineThreshold: parseFloat(customForm.lineThreshold) || undefined,
        selections: customForm.selections,
      };

      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/markets/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage(`Custom Question Market "${customForm.name}" Created Successfully!`);
        setShowCreateModal(false);
        setCustomForm((prev) => ({
          ...prev,
          name: '',
          selections: [
            { name: 'Yes (Over 48.5)', backPrice: 1.85 },
            { name: 'No (Under 48.5)', backPrice: 1.85 },
          ],
        }));
        fetchMarketSettings();
      }
    } catch (err: any) {
      setMessage(`Error creating market: ${err.message}`);
    } finally {
      setCreatingMarket(false);
    }
  };

  const handleSettleBet = async (betId: string, status: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/test-bets/${betId}/settle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, summary: `Admin manually set status to ${status}` }),
      });
      if (res.ok) {
        setMessage(`Bet ${betId} settled as ${status}`);
        fetchUserBets();
      }
    } catch (err) { }
  };

  const handleToggleMarketCategory = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        setMessage('Market category updated');
        fetchMarketSettings();
      }
    } catch (e) { }
  };

  const handleToggleOddEven = async (enabled: boolean) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/odd-even/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        setMessage(`Odd/Even markets ${enabled ? 'Enabled' : 'Disabled'}`);
        fetchMarketSettings();
      }
    } catch (e) { }
  };

  const handleToggleCategory = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/sports/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        setMessage('Category visibility updated successfully');
        fetchAdminData();
      }
    } catch (err) { }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/sports/provider/auto-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        setAutoSyncActive(enabled);
        setMessage(`Live 3rd-Party WebSocket feed ${enabled ? 'ENABLED (Auto ball updates every 4s)' : 'PAUSED'}`);
      }
    } catch (e) { }
  };

  const handleTriggerInstantBall = async () => {
    setTriggeringBall(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/sports/provider/trigger-ball`, {
        method: 'POST',
      });
      if (res.ok) {
        setMessage('⚡ Instant live ball event generated & broadcasted via WebSockets!');
        fetchAdminData();
      }
    } catch (e) { }
    setTriggeringBall(false);
  };

  const handleUpdateMatchStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/sports/matches/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setMessage(`Match status updated to ${status}`);
        fetchAdminData();
      }
    } catch (err) { }
  };

  const handleOpenLiveControl = (m: any) => {
    setSelectedMatch(m);
    setLiveScoreForm({
      teamAScore: m.score?.teamAScore || '0/0',
      teamBScore: m.score?.teamBScore || 'N/A',
      teamAOvers: m.score?.teamAOvers || '0.0',
      teamBOvers: m.score?.teamBOvers || '0.0',
      currentInnings: m.score?.currentInnings || 1,
      statusText: m.score?.statusText || m.resultSummary || '',
      activeBatsman: m.score?.activeBatsman || '',
      activeBowler: m.score?.activeBowler || '',
      recentOvers: m.score?.recentOvers || '',
      resultSummary: m.resultSummary || '',
      status: m.status || 'LIVE',
      winner: m.teamAId || 'teamA',
    });
    setShowLiveControlModal(true);
  };

  const handleOpenEditMatch = (m: any) => {
    setEditMatchForm({
      id: m.id,
      teamAName: m.teamA?.name || '',
      teamAShort: m.teamA?.shortName || '',
      teamBName: m.teamB?.name || '',
      teamBShort: m.teamB?.shortName || '',
      matchType: m.matchType || 'T20',
      venue: m.venue || '',
      startTime: m.startTime ? new Date(m.startTime).toISOString().slice(0, 16) : '',
      status: m.status || 'UPCOMING',
      resultSummary: m.resultSummary || '',
    });
    setShowEditMatchModal(true);
  };

  const handleCreateMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMatchForm.teamAName || !addMatchForm.teamBName) {
      setMessage('Please enter Team A and Team B names');
      return;
    }
    setSubmittingMatch(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/sports/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addMatchForm),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage(`Match "${addMatchForm.teamAName} vs ${addMatchForm.teamBName}" created successfully!`);
        setShowAddMatchModal(false);
        setAddMatchForm({
          sportSlug: 'cricket',
          competitionId: '',
          competitionName: '',
          teamAName: '',
          teamAShort: '',
          teamBName: '',
          teamBShort: '',
          matchType: 'T20',
          venue: '',
          startTime: '',
          status: 'UPCOMING',
          teamAScore: '',
          teamBScore: '',
          teamAOvers: '',
          teamBOvers: '',
          statusText: '',
        });
        fetchAdminData();
      } else {
        setMessage(`Failed to create match: ${json.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      setMessage(`Error creating match: ${err.message || String(err)}`);
    } finally {
      setSubmittingMatch(false);
    }
  };

  const handleSaveLiveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;
    setUpdatingLiveScore(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/sports/matches/${selectedMatch.id}/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(liveScoreForm),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage(`Live match score updated & broadcasted successfully!`);
        fetchAdminData();
      } else {
        setMessage(`Score update failed: ${json.message}`);
      }
    } catch (err: any) {
      setMessage(`Error updating score: ${err.message}`);
    } finally {
      setUpdatingLiveScore(false);
    }
  };

  const handleDeclareWinner = async (winnerSelection: 'teamA' | 'teamB' | 'draw') => {
    if (!selectedMatch) return;
    try {
      const winnerName = winnerSelection === 'teamA' ? selectedMatch.teamA?.name : selectedMatch.teamB?.name;
      const defaultSummary = winnerSelection === 'draw' ? 'Match Draw / Tie' : `${winnerName} won the match!`;
      const res = await fetch(`${getApiBaseUrl()}/admin/sports/matches/${selectedMatch.id}/declare-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner: winnerSelection,
          resultSummary: liveScoreForm.resultSummary || defaultSummary,
        }),
      });
      if (res.ok) {
        setMessage(`Result declared: ${defaultSummary}`);
        setShowLiveControlModal(false);
        fetchAdminData();
      }
    } catch (err: any) {
      setMessage(`Error declaring result: ${err.message}`);
    }
  };

  const handleEditMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/sports/matches/${editMatchForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editMatchForm),
      });
      if (res.ok) {
        setMessage('Match updated successfully');
        setShowEditMatchModal(false);
        fetchAdminData();
      }
    } catch (e: any) {
      setMessage(`Edit error: ${e.message}`);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/sports/matches/${matchId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessage('Match deleted successfully');
        fetchAdminData();
      }
    } catch (e: any) {
      setMessage(`Delete error: ${e.message}`);
    }
  };

  const handleQuickBallAction = async (type: '1' | '2' | '3' | '4' | '6' | 'W' | 'DOT' | 'WD' | 'NB') => {
    if (!selectedMatch) return;

    const isInnings1 = (liveScoreForm.currentInnings || 1) === 1;
    const currentScoreStr = isInnings1 ? (liveScoreForm.teamAScore || '0/0') : (liveScoreForm.teamBScore || '0/0');
    const currentOversStr = isInnings1 ? (liveScoreForm.teamAOvers || '0.0') : (liveScoreForm.teamBOvers || '0.0');

    // Parse runs and wickets
    const parts = currentScoreStr.split('/');
    let runs = parseInt(parts[0]) || 0;
    let wickets = parseInt(parts[1]) || 0;

    // Parse overs
    const overParts = currentOversStr.split('.');
    let wholeOvers = parseInt(overParts[0]) || 0;
    let balls = parseInt(overParts[1]) || 0;

    let recent = liveScoreForm.recentOvers ? liveScoreForm.recentOvers.split(' ').filter(Boolean) : [];

    if (type === '1') { runs += 1; balls += 1; recent.push('1'); }
    else if (type === '2') { runs += 2; balls += 1; recent.push('2'); }
    else if (type === '3') { runs += 3; balls += 1; recent.push('3'); }
    else if (type === '4') { runs += 4; balls += 1; recent.push('4'); }
    else if (type === '6') { runs += 6; balls += 1; recent.push('6'); }
    else if (type === 'W') { wickets += 1; balls += 1; recent.push('W'); }
    else if (type === 'DOT') { balls += 1; recent.push('•'); }
    else if (type === 'WD') { runs += 1; recent.push('WD'); }
    else if (type === 'NB') { runs += 1; recent.push('NB'); }

    if (balls >= 6) {
      wholeOvers += 1;
      balls = 0;
    }

    if (recent.length > 6) recent = recent.slice(-6);

    const newScoreStr = `${runs}/${wickets}`;
    const newOversStr = `${wholeOvers}.${balls}`;
    const recentOversStr = recent.join(' ');

    const updatedForm = {
      ...liveScoreForm,
      ...(isInnings1 ? { teamAScore: newScoreStr, teamAOvers: newOversStr } : { teamBScore: newScoreStr, teamBOvers: newOversStr }),
      recentOvers: recentOversStr,
    };

    setLiveScoreForm(updatedForm);

    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/sports/matches/${selectedMatch.id}/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedForm),
      });
      if (res.ok) {
        setMessage(`Ball updated: ${type === 'DOT' ? 'Dot' : type}! Score: ${newScoreStr} (${newOversStr} ov)`);
        fetchAdminData();
      }
    } catch (err: any) {
      console.error('Failed to update ball:', err);
    }
  };

  const handleTriggerSeed = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/sports/seed`, {
        method: 'POST',
      });
      if (res.ok) {
        setMessage('Sports database seeded successfully');
        fetchAdminData();
      }
    } catch (err) { }
  };

  const games = [
    { id: 'fast-parity', name: 'Fast Parity (30s)' },
    { id: 'parity', name: 'Parity (1-Min)' },
    { id: 'mines', name: 'Mines' },
    { id: 'crash', name: 'Crash' },
    { id: 'jet', name: 'JetX Flight' },
    { id: 'spin', name: 'Spin Wheel' },
    { id: 'dice', name: 'Over/Under Dice' },
    { id: 'andar-bahar', name: 'Andar Bahar' },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      {/* TOP HEADER matching main Admin Dashboard */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-xs z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
            R
          </div>
          <div>
            <h1 className="font-black text-slate-900 text-base leading-tight">Rivexa</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
              Control Center
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="text-right pr-3 border-r border-slate-200">
            <span className="text-xs font-black text-slate-900 block leading-tight">
              Sports &amp; Live Data Engine
            </span>
            <span className="text-[10px] text-slate-500 font-semibold block leading-none">
              Real-time match data, user bets &amp; odd/even controls
            </span>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Operational
          </span>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              S
            </div>
            <div className="hidden sm:block text-right">
              <span className="text-xs font-black text-slate-900 block leading-tight">Super Admin</span>
              <span className="text-[10px] text-slate-400 font-semibold block leading-none">Administrator</span>
            </div>
          </div>
        </div>
      </header>

      {/* ALERT BANNER */}
      {message && (
        <div className="bg-blue-600 text-white text-xs font-extrabold px-6 py-2 flex items-center justify-between shadow-sm shrink-0 z-30">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="hover:opacity-80 text-sm font-bold">×</button>
        </div>
      )}

      {/* MAIN CONTAINER WITH SIDEBAR */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* MOBILE BACKDROP OVERLAY */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
          />
        )}

        {/* SIDEBAR NAVIGATION */}
        <aside
          className={`w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-full transition-transform duration-200 z-30 ${
            isMobileMenuOpen
              ? 'fixed inset-y-0 left-0 shadow-2xl translate-x-0 h-full z-50'
              : 'hidden md:flex'
          }`}
        >
          <div className="p-3 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            {/* MAIN SECTION */}
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                MAIN
              </span>
              <nav className="space-y-1">
                <Link
                  href="/admin"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-slate-600 hover:bg-slate-50"
                >
                  <span className="text-sm">📊</span>
                  <span>Dashboard</span>
                </Link>

                <Link
                  href="/admin/users"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-slate-600 hover:bg-slate-50"
                >
                  <span className="text-sm">👥</span>
                  <span>User Management</span>
                </Link>

                <Link
                  href="/admin/games"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-slate-600 hover:bg-slate-50"
                >
                  <span className="text-sm">⚙️</span>
                  <span>Game Engines &amp; RTP</span>
                </Link>

                <Link
                  href="/admin/override"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-slate-600 hover:bg-slate-50"
                >
                  <span className="text-sm">🎯</span>
                  <span>Result Overrides</span>
                </Link>
              </nav>
            </div>

            {/* SPORTS & BETTING MANAGEMENT */}
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                SPORTS &amp; BETTING MANAGEMENT
              </span>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('matches')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'matches'
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <span className="text-sm">🏆</span>
                  <span>Sports Live &amp; Matches</span>
                </button>

                <button
                  onClick={() => setActiveTab('bets')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'bets'
                      ? 'bg-purple-50 text-purple-600 border border-purple-200'
                      : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <span className="text-sm">🎟️</span>
                  <span>Userwise Bet History</span>
                </button>

                <button
                  onClick={() => setActiveTab('markets')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'markets' || activeTab === 'bet_settings'
                      ? 'bg-teal-50 text-teal-700 border border-teal-200 font-extrabold'
                      : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <span className="text-sm">⚙️</span>
                  <span>Market &amp; Bet Settings</span>
                </button>

                <button
                  onClick={() => setActiveTab('provider')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'provider'
                      ? 'bg-amber-50 text-amber-600 border border-amber-200'
                      : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <span className="text-sm">🔌</span>
                  <span>CricAPI Provider Engine</span>
                </button>
              </nav>
            </div>

            {/* GAME CONTROLS */}
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                GAME CONTROLS
              </span>
              <nav className="space-y-1">
                {games.map((g) => {
                  const icons: { [key: string]: string } = {
                    'fast-parity': '⚡',
                    'parity': '⏱️',
                    'mines': '💎',
                    'andar-bahar': '♠️',
                    'jet': '✈️',
                    'crash': '🚀',
                    'spin': '🎡',
                    'dice': '🎲',
                  };
                  return (
                    <Link
                      key={g.id}
                      href={`/admin/${g.id}`}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors text-slate-600 hover:bg-slate-50"
                    >
                      <span className="text-sm">{icons[g.id] || '🎮'}</span>
                      <span className="truncate">{g.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* PAYMENTS & VERIFICATION */}
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                PAYMENTS &amp; VERIFICATION
              </span>
              <nav className="space-y-1">
                <Link
                  href="/admin/approvals"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-slate-600 hover:bg-slate-50"
                >
                  <span className="text-sm">🏛️</span>
                  <span>Bank Card Approvals</span>
                </Link>

                <Link
                  href="/admin/merchants"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-slate-600 hover:bg-slate-50"
                >
                  <span className="text-sm">🏦</span>
                  <span>UPI &amp; Merchant Accounts</span>
                </Link>

                <Link
                  href="/admin/manual-deposits"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-slate-600 hover:bg-slate-50"
                >
                  <span className="text-sm">📥</span>
                  <span>Manual Deposit Requests</span>
                </Link>

                <Link
                  href="/admin/withdrawals"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-slate-600 hover:bg-slate-50"
                >
                  <span className="text-sm">💸</span>
                  <span>Withdrawal Requests</span>
                </Link>
              </nav>
            </div>
          </div>

          <div className="p-3 border-t border-slate-200">
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-colors"
            >
              <span>Return to Frontend</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </aside>

        {/* CENTER MAIN CONTENT DISPLAY */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">
                <Shield className="w-4 h-4" /> Live Sports Engine Management
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Sports &amp; Cricket Control Center</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddMatchModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Match
              </button>
              <Link
                href="/sports"
                target="_blank"
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                View Live Frontend <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* AUTOMATED 3RD-PARTY LIVE WEBSOCKET PROVIDER BANNER */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 rounded-2xl border border-blue-500/20 shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                <Radio className={`w-5 h-5 ${autoSyncActive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-extrabold text-sm text-white">Automated 3rd-Party WebSocket Stream</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${autoSyncActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                    {autoSyncActive ? '🟢 Live Auto-Sync Active (Every 4s)' : '🟡 Stream Paused'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Live scores &amp; ball-by-ball commentary update automatically via 3rd-party WebSocket feed. Admin does not need to enter balls manually!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTriggerInstantBall}
                disabled={triggeringBall}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" /> {triggeringBall ? 'Simulating Ball...' : 'Trigger Instant Ball'}
              </button>
              <button
                type="button"
                onClick={() => handleToggleAutoSync(!autoSyncActive)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs ${autoSyncActive
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
              >
                {autoSyncActive ? 'Pause Auto-Stream' : 'Resume Auto-Stream'}
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs Bar */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${activeTab === 'matches'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
            >
              Matches &amp; Live Control ({matches.length})
            </button>

            <button
              onClick={() => setActiveTab('bets')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${activeTab === 'bets'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
            >
              <Ticket className="w-3.5 h-3.5" /> Userwise Bet History
            </button>

            <button
              onClick={() => setActiveTab('markets')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${activeTab === 'markets' || activeTab === 'bet_settings'
                  ? 'bg-teal-600 text-white shadow-sm font-extrabold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Market &amp; Bet Settings
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${activeTab === 'categories'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
            >
              Sports Categories ({categories.length})
            </button>

            <button
              onClick={() => setActiveTab('competitions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${activeTab === 'competitions'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
            >
              Competitions ({competitions.length})
            </button>

            <button
              onClick={() => setActiveTab('provider')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${activeTab === 'provider'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
            >
              <Activity className="w-3.5 h-3.5" /> Provider Engine Config
            </button>

            <button
              onClick={() => setActiveTab('pricing_engine')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${activeTab === 'pricing_engine'
                  ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Pricing &amp; Risk Engine
            </button>
          </div>

          {/* 1. MATCHES & LIVE CONTROL TAB */}
          {activeTab === 'matches' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Match Directory &amp; Live Status Controls</h2>
                  <p className="text-xs text-slate-500 font-medium">Search, filter, manage live scores in real-time, configure odds and declare match winners.</p>
                </div>
                <button
                  onClick={() => setShowAddMatchModal(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Match
                </button>
              </div>

              {/* DATATABLE SEARCH, FILTERS & CONTROLS BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                {/* SEARCH INPUT */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search team, competition, venue, status..."
                    value={matchSearchQuery}
                    onChange={(e) => setMatchSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {matchSearchQuery && (
                    <button
                      onClick={() => setMatchSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* FILTER DROPDOWNS */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* STATUS FILTER */}
                  <select
                    value={matchStatusFilter}
                    onChange={(e) => setMatchStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses ({matches.length})</option>
                    <option value="LIVE">LIVE ({matches.filter((m) => m.status === 'LIVE').length})</option>
                    <option value="UPCOMING">UPCOMING ({matches.filter((m) => m.status === 'UPCOMING').length})</option>
                    <option value="COMPLETED">COMPLETED ({matches.filter((m) => m.status === 'COMPLETED').length})</option>
                  </select>

                  {/* COMPETITION FILTER */}
                  <select
                    value={matchCompetitionFilter}
                    onChange={(e) => setMatchCompetitionFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer max-w-[180px] truncate"
                  >
                    <option value="ALL">All Competitions</option>
                    {competitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {/* FORMAT FILTER */}
                  <select
                    value={matchFormatFilter}
                    onChange={(e) => setMatchFormatFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Formats</option>
                    <option value="T20">T20</option>
                    <option value="ODI">ODI</option>
                    <option value="TEST">TEST</option>
                  </select>

                  {/* PAGE SIZE SELECTOR */}
                  <select
                    value={matchPageSize}
                    onChange={(e) => setMatchPageSize(Number(e.target.value))}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                  </select>

                  {(matchSearchQuery || matchStatusFilter !== 'ALL' || matchCompetitionFilter !== 'ALL' || matchFormatFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setMatchSearchQuery('');
                        setMatchStatusFilter('ALL');
                        setMatchCompetitionFilter('ALL');
                        setMatchFormatFilter('ALL');
                      }}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* DATATABLE CONTENTS */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Match</th>
                      <th className="py-3 px-4">Competition</th>
                      <th className="py-3 px-4">Score Snapshot</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Quick &amp; Live Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paginatedMatches.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          <div className="space-y-2">
                            <Search className="w-8 h-8 text-slate-300 mx-auto" />
                            <div className="font-bold text-slate-600 text-sm">No matches found matching your filters</div>
                            <button
                              onClick={() => {
                                setMatchSearchQuery('');
                                setMatchStatusFilter('ALL');
                                setMatchCompetitionFilter('ALL');
                                setMatchFormatFilter('ALL');
                              }}
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                              Clear Search &amp; Reset Filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedMatches.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{m.teamA?.name} vs {m.teamB?.name}</span>
                              {m.matchType && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                                  {m.matchType}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{m.competition?.name}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                            {m.score?.teamAScore || '0/0'} ({m.score?.teamAOvers || '0.0'}) / {m.score?.teamBScore || 'N/A'} ({m.score?.teamBOvers || '0.0'})
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1 w-max ${
                                m.status === 'LIVE'
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  : m.status === 'UPCOMING'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {m.status === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                              {m.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            <button
                              onClick={() => handleOpenLiveControl(m)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-xs inline-flex items-center gap-1"
                              title="Manage Live Match Scores & Declare Winner"
                            >
                              <Zap className="w-3 h-3" /> Manage Live
                            </button>
                            <button
                              onClick={() => handleOpenOddsConfigModal(m)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-xs inline-flex items-center gap-1"
                              title="Configure Win % & Multiplier (X) Odds"
                            >
                              <Sliders className="w-3 h-3" /> Win % &amp; Odds
                            </button>
                            <Link
                              href={`/admin/sports/matches/${m.id}`}
                              className="px-2.5 py-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg text-[11px] font-extrabold cursor-pointer transition-all shadow-xs inline-flex items-center gap-1"
                              title="View Dedicated Match Control, Questions & Revenue Page"
                            >
                              <FileText className="w-3 h-3" /> Revenue &amp; Questions
                            </Link>
                            <button
                              onClick={() => handleOpenEditMatch(m)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors border border-slate-300 inline-flex items-center gap-1"
                              title="Edit Match Details"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => handleUpdateMatchStatus(m.id, 'LIVE')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                m.status === 'LIVE' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              Set LIVE
                            </button>
                            <button
                              onClick={() => handleUpdateMatchStatus(m.id, 'UPCOMING')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                m.status === 'UPCOMING' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                              }`}
                            >
                              Set UPCOMING
                            </button>
                            <button
                              onClick={() => handleUpdateMatchStatus(m.id, 'COMPLETED')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                m.status === 'COMPLETED' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              Set COMPLETED
                            </button>
                            <button
                              onClick={() => handleDeleteMatch(m.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-block align-middle"
                              title="Delete Match"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* DATATABLE PAGINATION FOOTER */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs text-slate-500 font-medium">
                <div>
                  Showing{' '}
                  <span className="font-bold text-slate-900">
                    {filteredMatches.length === 0 ? 0 : (matchCurrentPage - 1) * matchPageSize + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-bold text-slate-900">
                    {Math.min(matchCurrentPage * matchPageSize, filteredMatches.length)}
                  </span>{' '}
                  of <span className="font-bold text-slate-900">{filteredMatches.length}</span> matches
                  {filteredMatches.length !== matches.length && (
                    <span className="text-slate-400 font-normal"> (filtered from {matches.length} total)</span>
                  )}
                </div>

                {totalMatchPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setMatchCurrentPage(1)}
                      disabled={matchCurrentPage === 1}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setMatchCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={matchCurrentPage === 1}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                    >
                      ‹ Prev
                    </button>

                    {Array.from({ length: totalMatchPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalMatchPages || Math.abs(p - matchCurrentPage) <= 1)
                      .map((page, idx, array) => (
                        <React.Fragment key={page}>
                          {idx > 0 && array[idx - 1] !== page - 1 && (
                            <span className="px-1 text-slate-400">...</span>
                          )}
                          <button
                            onClick={() => setMatchCurrentPage(page)}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                              matchCurrentPage === page
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}

                    <button
                      onClick={() => setMatchCurrentPage((p) => Math.min(totalMatchPages, p + 1))}
                      disabled={matchCurrentPage === totalMatchPages}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                    >
                      Next ›
                    </button>
                    <button
                      onClick={() => setMatchCurrentPage(totalMatchPages)}
                      disabled={matchCurrentPage === totalMatchPages}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                    >
                      »
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. USERWISE BET HISTORY TAB */}
          {activeTab === 'bets' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-purple-600" />
                  <h2 className="font-bold text-slate-900 text-base">Userwise Sports Test Bet Ledger</h2>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search ref, email, name..."
                      value={betSearch}
                      onChange={(e) => setBetSearch(e.target.value)}
                      className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <select
                    value={betStatusFilter}
                    onChange={(e) => setBetStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="OPEN">OPEN</option>
                    <option value="WON">WON</option>
                    <option value="LOST">LOST</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>

                  <button
                    onClick={fetchUserBets}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingBets ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>
              </div>

              {loadingBets ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading test bet records...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Ref Number</th>
                        <th className="py-3 px-4">Player / User</th>
                        <th className="py-3 px-4">Match</th>
                        <th className="py-3 px-4">Selections</th>
                        <th className="py-3 px-4">Total Stake</th>
                        <th className="py-3 px-4">Pot. Return</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Settlement Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {testBets.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                            No test bets found in record.
                          </td>
                        </tr>
                      ) : (
                        testBets.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50">
                            <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{b.betReference}</td>
                            <td className="py-3.5 px-4 text-slate-900 font-bold">
                              {b.user?.name || b.user?.email || 'Anonymous Player'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {b.match ? `${b.match.teamA?.shortName || b.match.teamA?.name} vs ${b.match.teamB?.shortName || b.match.teamB?.name}` : 'N/A'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {b.selections?.map((s: any) => (
                                <div key={s.id} className="text-[11px]">
                                  {s.marketName}: <span className="font-bold text-slate-900">{s.selectionName}</span> (@{Number(s.oddsAtPlacement).toFixed(2)})
                                </div>
                              ))}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-900 font-bold">₹{Number(b.totalStake).toFixed(2)}</td>
                            <td className="py-3.5 px-4 font-mono text-emerald-600 font-bold">₹{Number(b.potentialReturn).toFixed(2)}</td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.status === 'WON'
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    : b.status === 'LOST'
                                      ? 'bg-red-100 text-red-700 border border-red-200'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                              >
                                {b.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1">
                              {b.status === 'OPEN' && (
                                <>
                                  <button
                                    onClick={() => handleSettleBet(b.id, 'WON')}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                                  >
                                    Settle WON
                                  </button>
                                  <button
                                    onClick={() => handleSettleBet(b.id, 'LOST')}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                                  >
                                    Settle LOST
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. MARKET & ODD/EVEN SETTINGS TAB (Includes Custom Question Bet Creator!) */}
          {activeTab === 'markets' && (
            <div className="space-y-6">
              {/* Custom Market / Question Creator Button & Modal trigger */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Custom Fancy Questions &amp; Market Creator</h3>
                  <p className="text-xs text-slate-500">Create custom question markets (e.g. Session lines, Odd/Even lines, Over/Under, Player questions) for any match.</p>
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Custom Question Bet
                </button>
              </div>

              {/* Odd/Even Specific Control Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-purple-600" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm uppercase">Odd / Even Cricket Markets Control</h3>
                      <p className="text-xs text-slate-500">Configure global activation and default price odds for Odd/Even match runs.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700">Status:</span>
                    <button
                      onClick={() => handleToggleOddEven(!oddEvenSettings?.enabled)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${oddEvenSettings?.enabled ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                        }`}
                    >
                      {oddEvenSettings?.enabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                    <span className="text-slate-500 text-[11px]">Category Slug:</span>
                    <div className="font-mono text-purple-700 font-bold">odd_even</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                    <span className="text-slate-500 text-[11px]">Active Odd/Even Markets:</span>
                    <div className="font-mono text-slate-900 font-bold">{oddEvenSettings?.activeMarketCount || 0} Markets</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                    <span className="text-slate-500 text-[11px]">Default Outcome Odds:</span>
                    <div className="font-mono text-emerald-600 font-bold">1.90 Decimal Odds</div>
                  </div>
                </div>
              </div>

              {/* Category Ordering & Enablement List */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm uppercase">Market Category Display Settings</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Category Name</th>
                        <th className="py-2.5 px-3">Slug</th>
                        <th className="py-2.5 px-3">Sort Order</th>
                        <th className="py-2.5 px-3">Display Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {marketCategories.map((cat) => (
                        <tr key={cat.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{cat.name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{cat.slug}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{cat.sortOrder}</td>
                          <td className="py-2.5 px-3">
                            {cat.isActive !== false ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                                DISABLED
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleToggleMarketCategory(cat.id, cat.isActive !== false)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold cursor-pointer transition-colors"
                            >
                              {cat.isActive !== false ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. SPORTS CATEGORIES TAB */}
          {activeTab === 'categories' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Sport Name</th>
                      <th className="py-3 px-4">Slug</th>
                      <th className="py-3 px-4">Sort Order</th>
                      <th className="py-3 px-4">Competitions</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{cat.name}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{cat.slug}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">{cat.sortOrder}</td>
                        <td className="py-3.5 px-4 text-slate-600">{cat._count?.competitions || 0}</td>
                        <td className="py-3.5 px-4">
                          {cat.isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px]">
                              Disabled
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleToggleCategory(cat.id, cat.isActive)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            {cat.isActive ? 'Hide' : 'Show'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. COMPETITIONS TAB */}
          {activeTab === 'competitions' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Competition</th>
                      <th className="py-3 px-4">Sport</th>
                      <th className="py-3 px-4">Country</th>
                      <th className="py-3 px-4">Matches</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {competitions.map((comp) => (
                      <tr key={comp.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{comp.name}</td>
                        <td className="py-3.5 px-4 text-blue-600 font-bold">{comp.sport?.name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{comp.country || 'Global'}</td>
                        <td className="py-3.5 px-4 text-slate-600">{comp._count?.matches || 0}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. PROVIDER ENGINE CONFIG TAB */}
          {activeTab === 'provider' && (
            <div className="space-y-6">
              {/* Test Mode Warning Banner */}
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-start gap-3 text-amber-800 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-900 uppercase tracking-wider">
                    Provider Integration Settings (Server-Side Key Protection)
                  </div>
                  <p className="text-amber-800/90 leading-relaxed">
                    Provider API credentials (`CRICAPI_API_KEY`) are encrypted server-side and never exposed to public browser bundles. All matches, scorecards, and squads are fetched autonomously.
                  </p>
                </div>
              </div>

              {/* Provider Configuration Form */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base">Active Data Provider Configuration</h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Active Engine: <strong className="uppercase">{providerForm.providerName}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800">Select Provider Engine:</label>
                    <select
                      value={isCustomProviderName ? 'custom' : providerForm.providerName}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomProviderName(true);
                          setProviderForm({ ...providerForm, providerName: '' });
                        } else {
                          setIsCustomProviderName(false);
                          setProviderForm({ ...providerForm, providerName: e.target.value });
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 rounded-xl font-sans text-xs font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 antialiased shadow-xs cursor-pointer"
                    >
                      <option value="cricapi">CricAPI (Rest Engine)</option>
                      <option value="entitysport">EntitySport API</option>
                      <option value="sportmonks">Sportmonks API</option>
                      <option value="generic_rest">Generic REST Provider</option>
                      <option value="custom_rest">Custom REST Proxy</option>
                      <option value="custom">✍️ Other / Custom Provider Name</option>
                    </select>

                    {isCustomProviderName && (
                      <input
                        type="text"
                        value={providerForm.providerName}
                        onChange={(e) => setProviderForm({ ...providerForm, providerName: e.target.value })}
                        placeholder="Enter custom engine name e.g. my_custom_api"
                        className="w-full mt-1.5 p-2 bg-slate-50 border border-blue-300 text-blue-900 rounded-lg text-xs font-bold focus:outline-none"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800">API Base URL:</label>
                    <input
                      type="text"
                      value={providerForm.baseUrl}
                      onChange={(e) => setProviderForm({ ...providerForm, baseUrl: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 rounded-xl font-sans text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 antialiased shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800">Server API Key:</label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={providerForm.apiKey}
                        onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })}
                        placeholder="Enter API Key (e.g. 3c1bcbb6-8e21-4d49-a1e1-3d4a13730a5f)"
                        className="w-full p-2.5 pr-10 bg-white border border-slate-300 text-slate-900 rounded-xl font-sans text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 antialiased shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 text-sm px-1.5 py-0.5 rounded focus:outline-none cursor-pointer"
                        title={showApiKey ? "Hide API Key" : "Show API Key"}
                      >
                        <i className={`bi bi-eye${showApiKey ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans pt-1">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800">Auth Param Name:</label>
                    <input
                      type="text"
                      value={providerForm.authParamName}
                      onChange={(e) => setProviderForm({ ...providerForm, authParamName: e.target.value })}
                      placeholder="Param name e.g. apikey, token, access_token"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 rounded-xl font-sans text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 antialiased shadow-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-6">
                    <div className="flex items-center gap-6 text-xs font-sans">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={providerForm.isActive}
                          onChange={(e) => setProviderForm({ ...providerForm, isActive: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-slate-900 font-bold text-xs">Provider Enabled</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={providerForm.isTestMode}
                          onChange={(e) => setProviderForm({ ...providerForm, isTestMode: e.target.checked })}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className="text-slate-900 font-bold text-xs">Test Mode Active</span>
                      </label>
                    </div>

                    <button
                      onClick={handleSaveProviderConfig}
                      disabled={savingConfig}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {savingConfig ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Provider Overview Cards & API Call Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 font-sans text-slate-900">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1.5 shadow-sm">
                  <span className="text-[11px] uppercase font-extrabold text-blue-600 tracking-wider">Today's API Calls</span>
                  <div className="text-2xl font-black text-slate-900 font-sans tracking-tight">
                    {providerStatus?.todayCalls ?? providerStatus?.budget?.hitsToday ?? 0}
                    <span className="text-xs text-slate-500 font-medium"> / 90 limit</span>
                  </div>
                  <div className="text-xs text-slate-600 font-semibold">Budget Left: <span className="font-extrabold text-emerald-600">{providerStatus?.budget?.budgetRemaining ?? 90} hits</span></div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1.5 shadow-sm">
                  <span className="text-[11px] uppercase font-extrabold text-indigo-600 tracking-wider">This Month's API Calls</span>
                  <div className="text-2xl font-black text-slate-900 font-sans tracking-tight">
                    {providerStatus?.monthlyBreakdown?.[0]?.count ?? providerStatus?.todayCalls ?? 0}
                  </div>
                  <div className="text-xs text-slate-600 font-semibold">Month: <span className="font-extrabold text-indigo-600">{providerStatus?.monthlyBreakdown?.[0]?.month || 'Current'}</span></div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1.5 shadow-sm">
                  <span className="text-[11px] uppercase font-extrabold text-slate-600 tracking-wider">Overall Total API Calls</span>
                  <div className="text-2xl font-black text-slate-900 font-sans tracking-tight">
                    {providerStatus?.overallTotalCalls ?? providerStatus?.providerDetails?.requestCount ?? 0}
                  </div>
                  <div className="text-xs text-slate-600 font-semibold">Failures: <span className="font-extrabold text-rose-600">{providerStatus?.providerDetails?.failedCount || 0}</span></div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1.5 shadow-sm">
                  <span className="text-[11px] uppercase font-extrabold text-slate-600 tracking-wider">Connection Health</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-sm font-black text-emerald-600">Active &amp; Verified</span>
                  </div>
                  <div className="text-xs text-slate-600 font-semibold">Matches Mapped: <span className="font-extrabold text-slate-900">{providerStatus?.matchesSynced || 0}</span></div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-center space-y-2 shadow-sm">
                  <button
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Wifi className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                    {testingConnection ? 'Testing...' : 'Test Connection'}
                  </button>

                  <button
                    onClick={handleManualSync}
                    disabled={syncing}
                    className="w-full py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Trigger Manual Sync'}
                  </button>

                  <button
                    onClick={handlePurgeStaleMatches}
                    disabled={syncing}
                    className="w-full py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Purge Stale & Dummy Matches
                  </button>
                </div>
              </div>

              {/* Month-Wise API Call Breakdown Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 font-sans text-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" /> Month-Wise CricAPI Call History
                  </h2>
                  <span className="text-xs font-sans font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    Limit: 90 hits/day (CricAPI Free Plan)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider bg-slate-50/80">
                        <th className="py-3 px-3.5">Month</th>
                        <th className="py-3 px-3.5">Total API Calls</th>
                        <th className="py-3 px-3.5">Successful Calls</th>
                        <th className="py-3 px-3.5">Failed Calls</th>
                        <th className="py-3 px-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-xs text-slate-900">
                      {providerStatus?.monthlyBreakdown && providerStatus.monthlyBreakdown.length > 0 ? (
                        providerStatus.monthlyBreakdown.map((item: any) => (
                          <tr key={item.month} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3.5 font-bold text-slate-900">{item.month}</td>
                            <td className="py-3 px-3.5 font-extrabold text-indigo-600">{item.count} calls</td>
                            <td className="py-3 px-3.5 text-emerald-600 font-extrabold">{item.success}</td>
                            <td className="py-3 px-3.5 text-rose-600 font-extrabold">{item.failed}</td>
                            <td className="py-3 px-3.5">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                RECORDED
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                            No monthly sync logs recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Connection Test Feedback */}
              {connectionResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${connectionResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {connectionResult.success ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-red-600" />}
                    <span>Connection Result: {connectionResult.statusText} ({connectionResult.latencyMs}ms)</span>
                  </div>
                  <button onClick={() => setConnectionResult(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
                </div>
              )}

              {/* Provider Capability Registry */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" /> Provider Capability Matrix
                  </h2>
                  <button
                    onClick={handleDetectCapabilities}
                    disabled={detectingCapabilities}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    {detectingCapabilities ? 'Detecting...' : 'Re-Detect Capabilities'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {providerStatus?.capabilities &&
                    Object.entries(providerStatus.capabilities).map(([key, cap]: [string, any]) => (
                      <div
                        key={key}
                        className={`p-3.5 rounded-xl border ${cap.supported
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-slate-50 border-slate-200'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-800 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          {cap.supported ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                              SUPPORTED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                              UNSUPPORTED
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">{cap.notes}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Recent Sync Logs */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent CricAPI Sync Logs</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Endpoint</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Records</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-xs text-slate-800">
                      {providerStatus?.recentSyncLogs && providerStatus.recentSyncLogs.length > 0 ? (
                        providerStatus.recentSyncLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-slate-800 font-bold">{log.endpoint}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'SUCCESS'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-700'
                                  }`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{log.recordCount}</td>
                            <td className="py-2.5 px-3 text-slate-500">{log.durationMs}ms</td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                            No sync logs recorded yet. Click "Trigger Manual Sync" to run initial sync.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 7. BET SETTINGS CONTROL PANEL TAB */}
          {activeTab === 'bet_settings' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-bold text-slate-900 text-lg">Sports &amp; Bet Settings Control Engine</h2>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Configure stake limits, maximum profit caps, margin percentage, auto-settlement, and sports betting parameters.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchBetSettings}
                    disabled={loadingBetSettings}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingBetSettings ? 'animate-spin' : ''}`} /> Refresh Settings
                  </button>
                  <button
                    type="submit"
                    form="bet-settings-form"
                    disabled={savingBetSettings}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" /> {savingBetSettings ? 'Saving Changes...' : 'Save Bet Settings'}
                  </button>
                </div>
              </div>

              <form id="bet-settings-form" onSubmit={handleSaveBetSettings} className="space-y-6">
                {/* CARD 1: STAKE & PROFIT LIMITS */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                    <span className="text-base">💰</span>
                    <h3 className="font-bold text-slate-900 text-sm">Betting Stake &amp; Profit Risk Limits</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div> 
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Minimum Stake per Bet (₹)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={betSettings.minStake}
                        onChange={(e) => setBetSettings({ ...betSettings, minStake: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Minimum stake allowed on any sports slip</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Maximum Stake per Bet (₹)
                      </label>
                      <input
                        type="number"
                        min="10"
                        step="100"
                        value={betSettings.maxStake}
                        onChange={(e) => setBetSettings({ ...betSettings, maxStake: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Maximum single ticket stake ceiling</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Max Winning Profit Cap per Bet (₹)
                      </label>
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        value={betSettings.maxProfitCap}
                        onChange={(e) => setBetSettings({ ...betSettings, maxProfitCap: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Limit potential return payout on high odds</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Bookmaker Profit Margin (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        value={betSettings.bookmakerMargin}
                        onChange={(e) => setBetSettings({ ...betSettings, bookmakerMargin: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Default overround calculated into live odds</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Max Open Bets per Match / User
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={betSettings.maxBetsPerUserPerMatch}
                        onChange={(e) => setBetSettings({ ...betSettings, maxBetsPerUserPerMatch: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Prevents bet spamming on a single match</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Live In-Play Bet Delay (Seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={betSettings.liveBetDelaySec}
                        onChange={(e) => setBetSettings({ ...betSettings, liveBetDelaySec: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Court-siding protection delay before acceptance</p>
                    </div>
                  </div>
                </div>

                {/* CARD 2: AUTOMATION & SETTLEMENT ENGINE */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                    <span className="text-base">⚡</span>
                    <h3 className="font-bold text-slate-900 text-sm">Betting Engine Automation &amp; Settlement</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Auto-Settle Winning Bets</span>
                        <span className="text-[10px] text-slate-500 block">Credit user wallet automatically on match end</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={betSettings.autoSettle}
                        onChange={(e) => setBetSettings({ ...betSettings, autoSettle: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Auto-Refund Void / Cancelled</span>
                        <span className="text-[10px] text-slate-500 block">Return stake instantly on abandoned markets</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={betSettings.autoRefundVoid}
                        onChange={(e) => setBetSettings({ ...betSettings, autoRefundVoid: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        User Bet Cancellation Window (Sec)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={betSettings.userCancelWindowSec}
                        onChange={(e) => setBetSettings({ ...betSettings, userCancelWindowSec: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Time allowed for user to cashout / cancel after placement</p>
                    </div>
                  </div>
                </div>

                {/* CARD 3: ODD / EVEN MARKET RULES */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                    <span className="text-base">🎲</span>
                    <h3 className="font-bold text-slate-900 text-sm">Odd/Even Market Specific Controls</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Enable Odd/Even Betting Markets</span>
                        <span className="text-[10px] text-slate-500 block">Allow users to place bets on odd/even ball/over outcomes</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={betSettings.oddEvenEnabled}
                        onChange={(e) => setBetSettings({ ...betSettings, oddEvenEnabled: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Default Odd/Even Back Odds
                      </label>
                      <input
                        type="number"
                        min="1.01"
                        max="10.0"
                        step="0.01"
                        value={betSettings.oddEvenDefaultOdds}
                        onChange={(e) => setBetSettings({ ...betSettings, oddEvenDefaultOdds: parseFloat(e.target.value) || 1.90 })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Default return multiplier for odd/even market selections</p>
                    </div>
                  </div>
                </div>

                {/* CARD 4: NOTICE BANNER & DISCLAIMER */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                    <span className="text-base">📢</span>
                    <h3 className="font-bold text-slate-900 text-sm">Bet Slip Notice Banner for Players</h3>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Global Bet Disclaimer Notice
                    </label>
                    <textarea
                      rows={2}
                      value={betSettings.betNotice}
                      onChange={(e) => setBetSettings({ ...betSettings, betNotice: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
                      placeholder="Notice shown at the bottom of player bet slips..."
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Displayed in user's Bet Slip dialog when placing live bets.</p>
                  </div>
                </div>

                {/* ACTION BAR */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setBetSettings({
                        minStake: 10,
                        maxStake: 50000,
                        maxProfitCap: 200000,
                        bookmakerMargin: 4.5,
                        autoSettle: true,
                        autoRefundVoid: true,
                        userCancelWindowSec: 10,
                        oddEvenEnabled: true,
                        oddEvenDefaultOdds: 1.90,
                        maxBetsPerUserPerMatch: 20,
                        liveBetDelaySec: 2,
                        betNotice: 'Bet responsibly. Odds fluctuate in real time during live sports matches.',
                      });
                      setMessage('Bet settings reset to production defaults. Click Save to apply.');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                  <button
                    type="submit"
                    disabled={savingBetSettings}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" /> {savingBetSettings ? 'Saving Settings...' : 'Save Bet Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 8. PRICING & RISK ENGINE SECTION */}
          {(activeTab === 'pricing_engine' || activeTab === 'markets' || activeTab === 'bet_settings') && (
            <div className="pt-4">
              <CricketPricingAdminSection matchList={matches} />
            </div>
          )}
        </main>
      </div>

      {/* CREATE CUSTOM QUESTION BET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-teal-600" /> Create Custom Question Bet
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                &times;
              </button>
            </div>

            {/* QUICK PRESET TEMPLATES */}
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 text-[11px] block">Quick Template Presets:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const firstMatch = matches[0];
                    setCustomForm({
                      matchId: customForm.matchId || (firstMatch ? firstMatch.id : ''),
                      categorySlug: 'session',
                      marketType: 'SESSION_FANCY',
                      name: '6 Overs Session Line Over/Under 48.5',
                      lineThreshold: '48.5',
                      selections: [
                        { name: 'Yes (Over 48.5)', backPrice: 1.85 },
                        { name: 'No (Under 48.5)', backPrice: 1.85 },
                      ],
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer transition-all"
                >
                  ⚡ 6-Over Session
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstMatch = matches[0];
                    setCustomForm({
                      matchId: customForm.matchId || (firstMatch ? firstMatch.id : ''),
                      categorySlug: 'odd_even',
                      marketType: 'ODD_EVEN',
                      name: 'Match Total Runs Odd or Even',
                      lineThreshold: '',
                      selections: [
                        { name: 'Odd Runs', backPrice: 1.90 },
                        { name: 'Even Runs', backPrice: 1.90 },
                      ],
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer transition-all"
                >
                  🎲 Odd / Even Runs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstMatch = matches[0];
                    setCustomForm({
                      matchId: customForm.matchId || (firstMatch ? firstMatch.id : ''),
                      categorySlug: 'players',
                      marketType: 'PLAYER_RUNS',
                      name: 'Will Key Batsman score 50+ Runs?',
                      lineThreshold: '50',
                      selections: [
                        { name: 'Yes (50+ Runs)', backPrice: 2.10 },
                        { name: 'No (Under 50 Runs)', backPrice: 1.70 },
                      ],
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer transition-all"
                >
                  🏏 Player 50+ Fancy
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateCustomMarket} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Select Target Match:</label>
                <select
                  value={customForm.matchId || (matches[0] ? matches[0].id : '')}
                  onChange={(e) => setCustomForm({ ...customForm, matchId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600"
                >
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.teamA?.name} vs {m.teamB?.name} ({m.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category:</label>
                  <select
                    value={customForm.categorySlug}
                    onChange={(e) => setCustomForm({ ...customForm, categorySlug: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="session">Session / Fancy</option>
                    <option value="overs">Overs</option>
                    <option value="players">Players</option>
                    <option value="odd_even">Odd / Even</option>
                    <option value="quick">Quick</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Market Type:</label>
                  <select
                    value={customForm.marketType}
                    onChange={(e) => setCustomForm({ ...customForm, marketType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="SESSION_FANCY">SESSION_FANCY</option>
                    <option value="OVER_RUNS">OVER_RUNS</option>
                    <option value="PLAYER_RUNS">PLAYER_RUNS</option>
                    <option value="ODD_EVEN">ODD_EVEN</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Question / Market Title:</label>
                <input
                  type="text"
                  placeholder="e.g. 6 Overs Session Line Over/Under 48.5"
                  value={customForm.name}
                  onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                  required
                />
              </div>

              {/* Options / Selections */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 block">Outcomes &amp; Decimal Odds:</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomForm({
                        ...customForm,
                        selections: [
                          ...customForm.selections,
                          { name: `Option ${customForm.selections.length + 1}`, backPrice: 1.85 },
                        ],
                      });
                    }}
                    className="text-[11px] font-bold text-teal-600 hover:text-teal-800 cursor-pointer"
                  >
                    + Add Outcome Option
                  </button>
                </div>

                {customForm.selections.map((sel, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Outcome Name (e.g. Yes / Over)"
                      value={sel.name}
                      onChange={(e) => {
                        const updated = [...customForm.selections];
                        updated[idx].name = e.target.value;
                        setCustomForm({ ...customForm, selections: updated });
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                      required
                    />
                    <input
                      type="number"
                      step="0.05"
                      placeholder="Odds (e.g. 1.85)"
                      value={sel.backPrice || ''}
                      onChange={(e) => {
                        const updated = [...customForm.selections];
                        updated[idx].backPrice = parseFloat(e.target.value) || 1.0;
                        setCustomForm({ ...customForm, selections: updated });
                      }}
                      className="w-24 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-700 text-right"
                      required
                    />
                    {customForm.selections.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = customForm.selections.filter((_, i) => i !== idx);
                          setCustomForm({ ...customForm, selections: updated });
                        }}
                        className="p-1 text-red-400 hover:text-red-600 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingMarket}
                  className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {creatingMarket ? 'Creating Question Bet...' : 'Create Question Bet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. CREATE NEW MATCH MODAL */}
      {showAddMatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" /> Add New Sports Match
              </h3>
              <button onClick={() => setShowAddMatchModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateMatchSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sport Category:</label>
                  <select
                    value={addMatchForm.sportSlug}
                    onChange={(e) => setAddMatchForm({ ...addMatchForm, sportSlug: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="cricket">🏏 Cricket</option>
                    <option value="football">⚽ Football</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Match Format / Type:</label>
                  <select
                    value={addMatchForm.matchType}
                    onChange={(e) => setAddMatchForm({ ...addMatchForm, matchType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="T20">T20 (20 Overs)</option>
                    <option value="ODI">ODI (50 Overs)</option>
                    <option value="TEST">Test Match</option>
                    <option value="FOOTBALL">Football (90 Min)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Competition / Tournament Name:</label>
                <input
                  type="text"
                  placeholder="e.g. International T20 Trophy / T20 Premier League 2026"
                  value={addMatchForm.competitionName}
                  onChange={(e) => setAddMatchForm({ ...addMatchForm, competitionName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <label className="font-bold text-blue-700 block mb-1">Team A (Home):</label>
                  <input
                    type="text"
                    placeholder="e.g. India"
                    value={addMatchForm.teamAName}
                    onChange={(e) => setAddMatchForm({ ...addMatchForm, teamAName: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 mb-1.5 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Short Code (e.g. IND)"
                    value={addMatchForm.teamAShort}
                    onChange={(e) => setAddMatchForm({ ...addMatchForm, teamAShort: e.target.value })}
                    className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs uppercase font-mono text-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-emerald-700 block mb-1">Team B (Away):</label>
                  <input
                    type="text"
                    placeholder="e.g. Australia"
                    value={addMatchForm.teamBName}
                    onChange={(e) => setAddMatchForm({ ...addMatchForm, teamBName: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 mb-1.5 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Short Code (e.g. AUS)"
                    value={addMatchForm.teamBShort}
                    onChange={(e) => setAddMatchForm({ ...addMatchForm, teamBShort: e.target.value })}
                    className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs uppercase font-mono text-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Venue / Stadium:</label>
                  <input
                    type="text"
                    placeholder="e.g. Wankhede Stadium, Mumbai"
                    value={addMatchForm.venue}
                    onChange={(e) => setAddMatchForm({ ...addMatchForm, venue: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Initial Match Status:</label>
                  <select
                    value={addMatchForm.status}
                    onChange={(e) => setAddMatchForm({ ...addMatchForm, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="LIVE">🟢 LIVE NOW</option>
                    <option value="UPCOMING">📅 UPCOMING</option>
                  </select>
                </div>
              </div>

              {addMatchForm.status === 'LIVE' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <span className="font-extrabold text-emerald-800 text-[11px] block uppercase tracking-wider">Initial Live Score Settings:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-emerald-700 block mb-0.5">Team A Score / Overs:</label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="145/3"
                          value={addMatchForm.teamAScore}
                          onChange={(e) => setAddMatchForm({ ...addMatchForm, teamAScore: e.target.value })}
                          className="w-1/2 p-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold"
                        />
                        <input
                          type="text"
                          placeholder="15.2 ov"
                          value={addMatchForm.teamAOvers}
                          onChange={(e) => setAddMatchForm({ ...addMatchForm, teamAOvers: e.target.value })}
                          className="w-1/2 p-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-emerald-700 block mb-0.5">Team B Score / Overs:</label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="148/4"
                          value={addMatchForm.teamBScore}
                          onChange={(e) => setAddMatchForm({ ...addMatchForm, teamBScore: e.target.value })}
                          className="w-1/2 p-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold"
                        />
                        <input
                          type="text"
                          placeholder="18.4 ov"
                          value={addMatchForm.teamBOvers}
                          onChange={(e) => setAddMatchForm({ ...addMatchForm, teamBOvers: e.target.value })}
                          className="w-1/2 p-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMatchModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMatch}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submittingMatch ? 'Creating Match...' : 'Create Match & Generate Markets'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MANAGE LIVE MATCH CONTROL & SCORE MODAL */}
      {showLiveControlModal && selectedMatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                    LIVE ENGINE CONTROL
                  </span>
                  <span className="text-xs text-slate-500 font-bold">{selectedMatch.competition?.name}</span>
                </div>
                <h3 className="font-black text-slate-900 text-lg">
                  {selectedMatch.teamA?.name} vs {selectedMatch.teamB?.name}
                </h3>
              </div>
              <button onClick={() => setShowLiveControlModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
                &times;
              </button>
            </div>

            {/* QUICK REAL-TIME BALL INCREMENT PANEL */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Quick Real-time Ball Controls
                </span>
                <span className="text-[10px] text-slate-300 font-mono font-bold bg-slate-800 px-2 py-0.5 rounded-md">
                  Batting: {liveScoreForm.currentInnings === 1 ? selectedMatch.teamA?.name : selectedMatch.teamB?.name}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickBallAction('1')}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs border border-slate-700 transition-all active:scale-95 cursor-pointer"
                >
                  +1 Run
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickBallAction('2')}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs border border-slate-700 transition-all active:scale-95 cursor-pointer"
                >
                  +2 Runs
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickBallAction('4')}
                  className="py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
                >
                  +4 Four!
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickBallAction('6')}
                  className="py-2 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
                >
                  +6 Six!
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickBallAction('W')}
                  className="py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
                >
                  W Wicket!
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickBallAction('DOT')}
                  className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs border border-slate-700 cursor-pointer"
                >
                  • Dot Ball
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickBallAction('WD')}
                  className="py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs border border-slate-700 cursor-pointer"
                >
                  WD Wide
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickBallAction('NB')}
                  className="py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs border border-slate-700 cursor-pointer"
                >
                  NB No Ball
                </button>
                <div className="py-1.5 bg-slate-800 px-2 rounded-xl text-[11px] font-mono text-emerald-400 flex items-center justify-center border border-slate-700 truncate">
                  {liveScoreForm.recentOvers || 'Over log empty'}
                </div>
              </div>
            </div>

            {/* DETAILED SCORE EDIT FORM */}
            <form onSubmit={handleSaveLiveScore} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                  <span className="font-extrabold text-blue-700 text-xs block">
                    {selectedMatch.teamA?.name} (Team A)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Score (Runs/Wkts):</label>
                      <input
                        type="text"
                        value={liveScoreForm.teamAScore}
                        onChange={(e) => setLiveScoreForm({ ...liveScoreForm, teamAScore: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Overs:</label>
                      <input
                        type="text"
                        value={liveScoreForm.teamAOvers}
                        onChange={(e) => setLiveScoreForm({ ...liveScoreForm, teamAOvers: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                  <span className="font-extrabold text-emerald-700 text-xs block">
                    {selectedMatch.teamB?.name} (Team B)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Score (Runs/Wkts):</label>
                      <input
                        type="text"
                        value={liveScoreForm.teamBScore}
                        onChange={(e) => setLiveScoreForm({ ...liveScoreForm, teamBScore: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Overs:</label>
                      <input
                        type="text"
                        value={liveScoreForm.teamBOvers}
                        onChange={(e) => setLiveScoreForm({ ...liveScoreForm, teamBOvers: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Batting Innings:</label>
                  <select
                    value={liveScoreForm.currentInnings}
                    onChange={(e) => setLiveScoreForm({ ...liveScoreForm, currentInnings: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value={1}>1st Innings ({selectedMatch.teamA?.name} Batting)</option>
                    <option value={2}>2nd Innings ({selectedMatch.teamB?.name} Batting)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Live Status Banner / Commentary:</label>
                  <input
                    type="text"
                    placeholder="e.g. South Africa need 31 runs in 28 balls"
                    value={liveScoreForm.statusText}
                    onChange={(e) => setLiveScoreForm({ ...liveScoreForm, statusText: e.target.value, resultSummary: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Active Batsmen:</label>
                  <input
                    type="text"
                    placeholder="e.g. V. Kohli 78* (45), R. Sharma 52 (30)"
                    value={liveScoreForm.activeBatsman}
                    onChange={(e) => setLiveScoreForm({ ...liveScoreForm, activeBatsman: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Active Bowler:</label>
                  <input
                    type="text"
                    placeholder="e.g. M. Starc 2/34 (3.4)"
                    value={liveScoreForm.activeBowler}
                    onChange={(e) => setLiveScoreForm({ ...liveScoreForm, activeBowler: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeclareWinner('teamA')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Declare {selectedMatch.teamA?.name} Winner
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeclareWinner('teamB')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Declare {selectedMatch.teamB?.name} Winner
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLiveControlModal(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={updatingLiveScore}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {updatingLiveScore ? 'Saving...' : 'Save Live Score'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. EDIT MATCH DETAILS MODAL */}
      {showEditMatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-slate-700" /> Edit Match Details
              </h3>
              <button onClick={() => setShowEditMatchModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleEditMatchSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Team A Name:</label>
                  <input
                    type="text"
                    value={editMatchForm.teamAName}
                    onChange={(e) => setEditMatchForm({ ...editMatchForm, teamAName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Team B Name:</label>
                  <input
                    type="text"
                    value={editMatchForm.teamBName}
                    onChange={(e) => setEditMatchForm({ ...editMatchForm, teamBName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Format:</label>
                  <select
                    value={editMatchForm.matchType}
                    onChange={(e) => setEditMatchForm({ ...editMatchForm, matchType: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="T20">T20</option>
                    <option value="ODI">ODI</option>
                    <option value="TEST">TEST</option>
                    <option value="FOOTBALL">FOOTBALL</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status:</label>
                  <select
                    value={editMatchForm.status}
                    onChange={(e) => setEditMatchForm({ ...editMatchForm, status: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="LIVE">LIVE</option>
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Venue / Stadium:</label>
                <input
                  type="text"
                  value={editMatchForm.venue}
                  onChange={(e) => setEditMatchForm({ ...editMatchForm, venue: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Result / Live Note:</label>
                <input
                  type="text"
                  value={editMatchForm.resultSummary}
                  onChange={(e) => setEditMatchForm({ ...editMatchForm, resultSummary: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditMatchModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. LIVE MATCH ODDS & WIN % CONFIGURATOR MODAL */}
      {showOddsConfigModal && selectedOddsMatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-600" /> Live Match Odds &amp; Win % Configurator
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedOddsMatch.teamA?.name} vs {selectedOddsMatch.teamB?.name}
                </p>
              </div>
              <button onClick={() => setShowOddsConfigModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveOddsConfig} className="space-y-4 text-xs">
              {/* Mode Selection: Option 1 (AUTO) vs Option 2 (MANUAL) */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800 block uppercase text-[10px] tracking-wider">
                  Odds &amp; Win Probability Calculation Mode:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOddsConfigForm({ ...oddsConfigForm, mode: 'AUTO' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      oddsConfigForm.mode === 'AUTO'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Option 1: Auto Live Win %
                  </button>

                  <button
                    type="button"
                    onClick={() => setOddsConfigForm({ ...oddsConfigForm, mode: 'MANUAL' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      oddsConfigForm.mode === 'MANUAL'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Option 2: Admin Manual Odds
                  </button>
                </div>
              </div>

              {oddsConfigForm.mode === 'AUTO' ? (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-indigo-900 space-y-1 leading-relaxed">
                  <span className="font-bold flex items-center gap-1 text-indigo-700">
                    <CheckCircle className="w-4 h-4" /> Automatic Statistical Model Active
                  </span>
                  <p className="text-[11px] text-indigo-700/90">
                    Win percentage &amp; odds multipliers (X) are automatically calculated in real-time based on live match scores (Current Run Rate, Required Run Rate, Wickets lost &amp; Target).
                  </p>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-amber-50/50 border border-amber-200 rounded-2xl">
                  <div className="font-bold text-amber-900 text-xs">
                    Admin Custom Odds &amp; Win Percentage Controls:
                  </div>

                  {/* Team A Custom Config */}
                  <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-amber-200">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 truncate">
                        {selectedOddsMatch.teamA?.name} Win %:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={oddsConfigForm.winProbA}
                        onChange={(e) => {
                          const val = Math.min(99, Math.max(1, parseInt(e.target.value) || 50));
                          const probB = 100 - val;
                          setOddsConfigForm({
                            ...oddsConfigForm,
                            winProbA: val,
                            winProbB: probB,
                            oddsA: Number((100 / val).toFixed(2)),
                            oddsB: Number((100 / probB).toFixed(2)),
                          });
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 truncate">
                        Multiplier (X Win):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="1.01"
                        max="100"
                        value={oddsConfigForm.oddsA}
                        onChange={(e) => setOddsConfigForm({ ...oddsConfigForm, oddsA: parseFloat(e.target.value) || 1.75 })}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Team B Custom Config */}
                  <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-amber-200">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 truncate">
                        {selectedOddsMatch.teamB?.name} Win %:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={oddsConfigForm.winProbB}
                        onChange={(e) => {
                          const val = Math.min(99, Math.max(1, parseInt(e.target.value) || 50));
                          const probA = 100 - val;
                          setOddsConfigForm({
                            ...oddsConfigForm,
                            winProbB: val,
                            winProbA: probA,
                            oddsB: Number((100 / val).toFixed(2)),
                            oddsA: Number((100 / probA).toFixed(2)),
                          });
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 truncate">
                        Multiplier (X Win):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="1.01"
                        max="100"
                        value={oddsConfigForm.oddsB}
                        onChange={(e) => setOddsConfigForm({ ...oddsConfigForm, oddsB: parseFloat(e.target.value) || 2.15 })}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOddsConfigModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOddsConfig}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingOddsConfig ? 'Saving...' : 'Save Odds & Win % Config'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MATCH REVENUE & QUESTIONS ANALYTICS MODAL */}
      {showMatchAnalyticsModal && selectedAnalyticsMatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {selectedAnalyticsMatch.teamA?.name} vs {selectedAnalyticsMatch.teamB?.name}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      selectedAnalyticsMatch.status === 'LIVE'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : selectedAnalyticsMatch.status === 'UPCOMING'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedAnalyticsMatch.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {selectedAnalyticsMatch.competition?.name || 'Cricket Series'} • {selectedAnalyticsMatch.matchType || 'T20'} • {selectedAnalyticsMatch.venue || 'Stadium'}
                </p>
              </div>

              <button
                onClick={() => setShowMatchAnalyticsModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl px-2"
              >
                &times;
              </button>
            </div>

            {/* SUB-TABS */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setAnalyticsTab('REVENUE')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  analyticsTab === 'REVENUE'
                    ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                📊 Platform Revenue &amp; Win/Loss
              </button>

              <button
                type="button"
                onClick={() => setAnalyticsTab('QUESTIONS')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  analyticsTab === 'QUESTIONS'
                    ? 'bg-teal-600 text-white shadow-xs font-extrabold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🎯 Match Questions ({matchAnalyticsData?.matchMarkets?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setAnalyticsTab('ODD_EVEN')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  analyticsTab === 'ODD_EVEN'
                    ? 'bg-purple-600 text-white shadow-xs font-extrabold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🎲 Match Odd/Even Rates
              </button>
            </div>

            {loadingMatchAnalytics ? (
              <div className="py-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                Loading Match Revenue Analytics &amp; Betting Statistics...
              </div>
            ) : (
              <div>
                {/* TAB 1: REVENUE & WIN/LOSS ANALYTICS */}
                {analyticsTab === 'REVENUE' && (
                  <div className="space-y-5">
                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 block">Total Bet Turnover</span>
                        <div className="text-base font-extrabold text-slate-900 font-mono">
                          ₹{(matchAnalyticsData?.revenueSummary?.totalStake || 0).toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {matchAnalyticsData?.revenueSummary?.totalBetsCount || 0} total bets placed
                        </span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 block">User Winnings Paid Out</span>
                        <div className="text-base font-extrabold text-red-600 font-mono">
                          ₹{(matchAnalyticsData?.revenueSummary?.totalPayout || 0).toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {matchAnalyticsData?.revenueSummary?.wonBetsCount || 0} winning tickets paid
                        </span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl border space-y-1 ${
                          (matchAnalyticsData?.revenueSummary?.netRevenue || 0) >= 0
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                            : 'bg-red-50 border-red-200 text-red-950'
                        }`}
                      >
                        <span className="text-[11px] font-extrabold block">Net Platform Revenue (GGR)</span>
                        <div className="text-lg font-black font-mono">
                          ₹{(matchAnalyticsData?.revenueSummary?.netRevenue || 0).toLocaleString()}
                        </div>
                        <span className="text-[10px] font-bold block">
                          {(matchAnalyticsData?.revenueSummary?.netRevenue || 0) >= 0
                            ? '🟢 Platform Profit'
                            : '🔴 Platform Loss'}
                        </span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 block">House Margin Win %</span>
                        <div className="text-base font-extrabold text-indigo-600 font-mono">
                          {matchAnalyticsData?.revenueSummary?.houseMarginPercent || 0}%
                        </div>
                        <span className="text-[10px] text-slate-400 block">Net retention rate</span>
                      </div>
                    </div>

                    {/* BET TYPE BREAKDOWN TABLE */}
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-slate-900 text-xs uppercase">Market Category Revenue Breakdown</h4>
                      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                              <th className="py-2.5 px-3">Market Name</th>
                              <th className="py-2.5 px-3">Bets Placed</th>
                              <th className="py-2.5 px-3">Stake Turnover</th>
                              <th className="py-2.5 px-3">User Payouts</th>
                              <th className="py-2.5 px-3 text-right">Net Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {matchAnalyticsData?.marketBreakdown && matchAnalyticsData.marketBreakdown.length > 0 ? (
                              matchAnalyticsData.marketBreakdown.map((mb: any, i: number) => {
                                const net = mb.stake - mb.payout;
                                return (
                                  <tr key={i} className="hover:bg-slate-50">
                                    <td className="py-2.5 px-3 font-bold text-slate-900">{mb.name}</td>
                                    <td className="py-2.5 px-3 font-mono text-slate-700">{mb.count}</td>
                                    <td className="py-2.5 px-3 font-mono text-slate-900 font-bold">₹{mb.stake.toLocaleString()}</td>
                                    <td className="py-2.5 px-3 font-mono text-red-600 font-bold">₹{mb.payout.toLocaleString()}</td>
                                    <td className={`py-2.5 px-3 text-right font-mono font-extrabold ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                      ₹{net.toLocaleString()}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                                  No bets placed on this match yet. Platform turnover will appear here in real time.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: MATCH QUESTIONS & FANCY BETS */}
                {analyticsTab === 'QUESTIONS' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        Manage custom fancy questions, session lines, and player bets for this specific match.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomForm((prev) => ({ ...prev, matchId: selectedAnalyticsMatch.id }));
                          setShowCreateModal(true);
                        }}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Add Question For This Match
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                            <th className="py-2.5 px-3">Question / Market Title</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Outcomes &amp; Odds</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {matchAnalyticsData?.matchMarkets && matchAnalyticsData.matchMarkets.length > 0 ? (
                            matchAnalyticsData.matchMarkets.map((m: any) => (
                              <tr key={m.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-bold text-slate-900">{m.name}</td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 bg-teal-50 text-teal-700 font-mono text-[10px] font-bold rounded border border-teal-200">
                                    {m.categorySlug || m.marketType}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono">
                                  {m.selections?.map((s: any) => `${s.name} @ ${s.backPrice}`).join(' | ') || 'N/A'}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => handleDeleteMatchMarket(m.id)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Market Question"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                                No custom question bets created for this match yet. Click "+ Add Question For This Match" to add one!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 3: ODD / EVEN RATE CONTROLS FOR THIS MATCH */}
                {analyticsTab === 'ODD_EVEN' && (
                  <form onSubmit={handleSaveMatchOddEven} className="space-y-4">
                    <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-purple-950 text-sm block">Match Specific Odd/Even Rates</span>
                          <span className="text-slate-500 text-[11px] block">Override default odd/even back multiplier specifically for this match.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMatchOddEvenForm({ ...matchOddEvenForm, enabled: !matchOddEvenForm.enabled })}
                          className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer ${
                            matchOddEvenForm.enabled ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                          }`}
                        >
                          {matchOddEvenForm.enabled ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-purple-100">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Odd/Even Back Price Rate (Multiplier):</label>
                          <input
                            type="number"
                            step="0.01"
                            min="1.01"
                            max="10.0"
                            value={matchOddEvenForm.rate}
                            onChange={(e) => setMatchOddEvenForm({ ...matchOddEvenForm, rate: parseFloat(e.target.value) || 1.90 })}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-purple-600"
                            required
                          />
                          <p className="text-[10px] text-slate-400 mt-1">Default return multiplier for odd/even outcomes in this match (e.g. 1.90, 1.95)</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={savingMatchOddEven}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {savingMatchOddEven ? 'Saving Rates...' : 'Save Match Odd/Even Rates'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSportsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-mono">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading Sports &amp; Betting Control Center...</span>
          </div>
        </div>
      }
    >
      <SportsAdminContent />
    </React.Suspense>
  );
}
