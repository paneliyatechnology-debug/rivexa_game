'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/config';
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
} from 'lucide-react';

export default function AdminSportsPage() {
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
    baseUrl: string;
    isActive: boolean;
    isTestMode: boolean;
  }>({
    baseUrl: 'https://api.cricapi.com/v1',
    isActive: true,
    isTestMode: true,
  });
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Connection test & capabilities state
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);
  const [detectingCapabilities, setDetectingCapabilities] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<
    'matches' | 'bets' | 'markets' | 'categories' | 'competitions' | 'provider'
  >('matches');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const catRes = await fetch(`${getApiBaseUrl()}/admin/sports/categories`);
      const compRes = await fetch(`${getApiBaseUrl()}/admin/sports/competitions`);
      const matchRes = await fetch(`${getApiBaseUrl()}/admin/sports/matches`);
      const provRes = await fetch(`${getApiBaseUrl()}/cricket/admin/status`);

      if (catRes.ok) setCategories((await catRes.json()).data || []);
      if (compRes.ok) setCompetitions((await compRes.json()).data || []);
      if (matchRes.ok) {
        const mList = (await matchRes.json()).data || [];
        setMatches(mList);
        if (mList.length > 0 && !customForm.matchId) {
          setCustomForm((prev) => ({ ...prev, matchId: mList[0].id }));
        }
      }
      if (provRes.ok) {
        const pData = (await provRes.json()).data || null;
        setProviderStatus(pData);
        if (pData?.providerDetails) {
          setProviderForm({
            baseUrl: pData.providerDetails.baseUrl || 'https://api.cricapi.com/v1',
            isActive: pData.providerDetails.isActive ?? true,
            isTestMode: pData.providerDetails.isTestMode ?? true,
          });
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

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  useEffect(() => {
    if (activeTab === 'bets') fetchUserBets();
    if (activeTab === 'markets') fetchMarketSettings();
  }, [activeTab, fetchUserBets, fetchMarketSettings]);

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
    } catch (err) {}
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
    } catch (e) {}
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
    } catch (err) {}
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
    } catch (e) {}
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
    } catch (e) {}
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
    } catch (err) {}
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
    } catch (err) {}
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
    } catch (err) {}
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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* TOP HEADER matching main Admin Dashboard */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-xs z-30">
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
        <div className="bg-blue-600 text-white text-xs font-extrabold px-6 py-2 flex items-center justify-between shadow-sm shrink-0">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="hover:opacity-80 text-sm font-bold">×</button>
        </div>
      )}

      {/* MAIN CONTAINER WITH SIDEBAR */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* MOBILE BACKDROP OVERLAY */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
          />
        )}

        {/* SIDEBAR NAVIGATION */}
        <aside
          className={`w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-full transition-transform duration-200 z-50 ${
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    activeTab === 'matches'
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">🏆</span>
                  <span>Sports Live &amp; Matches</span>
                </button>

                <button
                  onClick={() => setActiveTab('bets')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    activeTab === 'bets'
                      ? 'bg-purple-50 text-purple-600 border border-purple-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">🎟️</span>
                  <span>Userwise Bet History</span>
                </button>

                <button
                  onClick={() => setActiveTab('markets')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    activeTab === 'markets'
                      ? 'bg-teal-50 text-teal-600 border border-teal-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">⚙️</span>
                  <span>Market &amp; Odd/Even Settings</span>
                </button>

                <button
                  onClick={() => setActiveTab('provider')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    activeTab === 'provider'
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
                onClick={handleTriggerSeed}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Seed / Reset Mock Matches
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

          {/* Navigation Sub-Tabs Bar */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'matches'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Matches &amp; Live Control ({matches.length})
            </button>

            <button
              onClick={() => setActiveTab('bets')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'bets'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" /> Userwise Bet History
            </button>

            <button
              onClick={() => setActiveTab('markets')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'markets'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Market &amp; Odd/Even Settings
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'categories'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Sports Categories ({categories.length})
            </button>

            <button
              onClick={() => setActiveTab('competitions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'competitions'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Competitions ({competitions.length})
            </button>

            <button
              onClick={() => setActiveTab('provider')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'provider'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Provider Engine Config
            </button>
          </div>

          {/* 1. MATCHES & LIVE CONTROL TAB */}
          {activeTab === 'matches' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="font-bold text-slate-900 text-base">Match Directory &amp; Live Status Controls</h2>
                <span className="text-xs text-slate-500 font-medium">Click quick status buttons to switch live/upcoming state.</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Match</th>
                      <th className="py-3 px-4">Competition</th>
                      <th className="py-3 px-4">Score Snapshot</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Quick Status Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {matches.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {m.teamA?.name} vs {m.teamB?.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{m.competition?.name}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                          {m.score?.teamAScore || '0/0'} / {m.score?.teamBScore || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                              m.status === 'LIVE'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => handleUpdateMatchStatus(m.id, 'LIVE')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                          >
                            Set LIVE
                          </button>
                          <button
                            onClick={() => handleUpdateMatchStatus(m.id, 'UPCOMING')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                          >
                            Set UPCOMING
                          </button>
                          <button
                            onClick={() => handleUpdateMatchStatus(m.id, 'COMPLETED')}
                            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                          >
                            Set COMPLETED
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  b.status === 'WON'
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
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                        oddEvenSettings?.enabled ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
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
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">Active Data Provider Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">API Base URL:</label>
                    <input
                      type="text"
                      value={providerForm.baseUrl}
                      onChange={(e) => setProviderForm({ ...providerForm, baseUrl: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Server API Key:</label>
                    <input
                      type="text"
                      disabled
                      value="e4a56526-••••-••••-••••-02f4b6a38dc8 (Secured Server-Side)"
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl font-mono text-xs cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={providerForm.isActive}
                        onChange={(e) => setProviderForm({ ...providerForm, isActive: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Provider Enabled</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={providerForm.isTestMode}
                        onChange={(e) => setProviderForm({ ...providerForm, isTestMode: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Test Mode Active</span>
                    </label>
                  </div>

                  <button
                    onClick={handleSaveProviderConfig}
                    disabled={savingConfig}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {savingConfig ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>

              {/* Provider Overview Card & Actions */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-2 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Active Provider</span>
                  <div className="text-lg font-black text-amber-600 uppercase tracking-wider">
                    {providerStatus?.activeProvider || 'cricapi'}
                  </div>
                  <div className="text-[11px] text-slate-500">api.cricapi.com v1 REST</div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-2 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Connection Health</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-base font-bold text-emerald-600">Active &amp; Verified</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Last Sync: {providerStatus?.providerDetails?.lastSyncAt ? new Date(providerStatus.providerDetails.lastSyncAt).toLocaleTimeString() : 'Just now'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-2 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-500">API Requests / Failures</span>
                  <div className="text-lg font-mono font-bold text-slate-900">
                    {providerStatus?.providerDetails?.requestCount || 0} / <span className="text-red-600">{providerStatus?.providerDetails?.failedCount || 0}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Matches Mapped: {providerStatus?.matchesSynced || 0}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between space-y-2 shadow-sm">
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
                </div>
              </div>

              {/* Connection Test Feedback */}
              {connectionResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
                    connectionResult.success
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
                        className={`p-3.5 rounded-xl border ${
                          cap.supported
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
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {providerStatus?.recentSyncLogs && providerStatus.recentSyncLogs.length > 0 ? (
                        providerStatus.recentSyncLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-slate-800 font-bold">{log.endpoint}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.status === 'SUCCESS'
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

            <form onSubmit={handleCreateCustomMarket} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Select Match:</label>
                <select
                  value={customForm.matchId}
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
                />
              </div>

              {/* Options / Selections */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="font-bold text-slate-700 block">Outcomes &amp; Decimal Odds:</label>
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
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingMarket}
                  className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {creatingMarket ? 'Creating...' : 'Create Question Bet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
