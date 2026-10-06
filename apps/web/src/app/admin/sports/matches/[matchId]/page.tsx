'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/config';
import {
  Trophy,
  RefreshCw,
  Sliders,
  Radio,
  Plus,
  CheckCircle,
  AlertTriangle,
  FileText,
  HelpCircle,
  Trash2,
  ChevronLeft,
  Zap,
  Sparkles,
  Ticket,
  Check,
  X,
  Edit3,
} from 'lucide-react';

function MatchDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [matchData, setMatchData] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'REVENUE' | 'QUESTIONS' | 'ODD_EVEN' | 'ODDS'>('REVENUE');

  // Match Odd/Even Form
  const [matchOddEvenForm, setMatchOddEvenForm] = useState<{ enabled: boolean; rate: number }>({
    enabled: true,
    rate: 1.90,
  });
  const [savingOddEven, setSavingOddEven] = useState<boolean>(false);

  // Auto Generating AI questions state
  const [generatingQuestions, setGeneratingQuestions] = useState<boolean>(false);
  const [settlingMarkets, setSettlingMarkets] = useState<boolean>(false);

  // Custom Question Form Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [creatingMarket, setCreatingMarket] = useState<boolean>(false);
  const [customForm, setCustomForm] = useState<{
    categorySlug: string;
    name: string;
    marketType: string;
    lineThreshold: string;
    selections: { name: string; backPrice: number }[];
  }>({
    categorySlug: 'session',
    name: '',
    marketType: 'SESSION_FANCY',
    lineThreshold: '48.5',
    selections: [
      { name: 'Yes (Over 48.5)', backPrice: 1.85 },
      { name: 'No (Under 48.5)', backPrice: 1.85 },
    ],
  });

  // Odds & Win % Configurator State
  const [oddsConfigForm, setOddsConfigForm] = useState({
    mode: 'AUTO' as 'AUTO' | 'MANUAL',
    winProbA: 50,
    winProbB: 50,
    oddsA: 1.75,
    oddsB: 2.15,
  });
  const [savingOddsConfig, setSavingOddsConfig] = useState(false);

  // Live Score Control State
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [updatingScore, setUpdatingScore] = useState(false);
  const [liveScoreForm, setLiveScoreForm] = useState({
    teamAScore: '',
    teamAOvers: '',
    teamBScore: '',
    teamBOvers: '',
    currentInnings: 1,
    targetRuns: '',
    status: 'LIVE',
    resultSummary: '',
  });

  // Fetch Match Analytics & Details
  const fetchMatchDetails = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/matches/${matchId}/analytics`);
      if (res.ok) {
        const json = await res.json();
        setMatchData(json.data);
        if (json.data?.oddEvenConfig) {
          setMatchOddEvenForm({
            enabled: json.data.oddEvenConfig.enabled,
            rate: json.data.oddEvenConfig.rate || 1.90,
          });
        }
      }

      // Fetch Odds Config
      const oddsRes = await fetch(`${getApiBaseUrl()}/cricket/admin/matches/${matchId}/odds`);
      if (oddsRes.ok) {
        const oddsJson = await oddsRes.json();
        if (oddsJson.data) {
          setOddsConfigForm({
            mode: oddsJson.data.mode || 'AUTO',
            winProbA: oddsJson.data.winProbA || 50,
            winProbB: oddsJson.data.winProbB || 50,
            oddsA: oddsJson.data.oddsA || 1.75,
            oddsB: oddsJson.data.oddsB || 2.15,
          });
        }
      }
    } catch (err: any) {
      console.error('Failed loading match details:', err);
      setMessage(`Error loading match details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMatchDetails();
  }, [fetchMatchDetails]);

  // AI Auto-Generate Team Wise Questions
  const handleAutoGenerateQuestions = async () => {
    setGeneratingQuestions(true);
    setMessage(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/matches/${matchId}/auto-generate-questions`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setMessage(`AI Auto-Generated dynamic team-wise questions for ${matchData?.match?.teamA} vs ${matchData?.match?.teamB}!`);
        fetchMatchDetails();
      } else {
        setMessage(`Error generating questions: ${json.message}`);
      }
    } catch (err: any) {
      setMessage(`Request failed: ${err.message}`);
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Auto-Settle Live Markets & Sessions
  const handleAutoSettleLiveMarkets = async () => {
    setSettlingMarkets(true);
    setMessage(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/matches/${matchId}/auto-settle`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setMessage(`⚡ ${json.message || 'Auto-settlement completed successfully!'}`);
        fetchMatchDetails();
      } else {
        setMessage(`Auto settlement error: ${json.message || 'Failed to complete auto-settlement'}`);
      }
    } catch (err: any) {
      setMessage(`Settlement request failed: ${err.message}`);
    } finally {
      setSettlingMarkets(false);
    }
  };

  // Create Custom Question Market
  const handleCreateCustomMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.name) {
      setMessage('Please enter question title');
      return;
    }
    setCreatingMarket(true);
    try {
      const payload = {
        matchId,
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
        setMessage(`Custom Question Market "${customForm.name}" created successfully!`);
        setShowCreateModal(false);
        setCustomForm({
          categorySlug: 'session',
          name: '',
          marketType: 'SESSION_FANCY',
          lineThreshold: '48.5',
          selections: [
            { name: 'Yes (Over 48.5)', backPrice: 1.85 },
            { name: 'No (Under 48.5)', backPrice: 1.85 },
          ],
        });
        fetchMatchDetails();
      }
    } catch (err: any) {
      setMessage(`Error creating market: ${err.message}`);
    } finally {
      setCreatingMarket(false);
    }
  };

  // Delete Question Market
  const handleDeleteMarket = async (marketId: string) => {
    if (!window.confirm('Are you sure you want to delete this question market?')) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/markets/${marketId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessage('Market question deleted successfully');
        fetchMatchDetails();
      }
    } catch (err: any) {
      setMessage(`Error deleting market: ${err.message}`);
    }
  };

  // Save Match Odd/Even Rates
  const handleSaveOddEven = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOddEven(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/matches/${matchId}/odd-even`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchOddEvenForm),
      });
      if (res.ok) {
        setMessage('Match Odd/Even rates updated successfully!');
        fetchMatchDetails();
      }
    } catch (err: any) {
      setMessage(`Failed saving odd/even rates: ${err.message}`);
    } finally {
      setSavingOddEven(false);
    }
  };

  // Save Match Odds Config
  const handleSaveOddsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOddsConfig(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/matches/${matchId}/odds`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oddsConfigForm),
      });
      if (res.ok) {
        setMessage('Match Win % and Multiplier (X) Odds saved!');
        fetchMatchDetails();
      }
    } catch (err: any) {
      setMessage(`Error saving odds: ${err.message}`);
    } finally {
      setSavingOddsConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-mono">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
          <span>Loading Match Analytics &amp; Control Hub...</span>
        </div>
      </div>
    );
  }

  const match = matchData?.match;
  const summary = matchData?.revenueSummary;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-100 font-sans text-slate-900">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shadow-md">
            R
          </div>
          <div>
            <h1 className="font-black text-slate-900 text-sm tracking-tight">Rivexa</h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">CONTROL CENTER</span>
          </div>
        </div>

        <div className="p-3 space-y-6 flex-1">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">MAIN</span>
            <nav className="space-y-1">
              <Link href="/admin" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">
                <span>📊</span> <span>Dashboard</span>
              </Link>
            </nav>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">SPORTS &amp; BETTING</span>
            <nav className="space-y-1">
              <Link href="/admin/sports?tab=matches" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
                <span>🏆</span> <span>Sports Live &amp; Matches</span>
              </Link>
              <Link href="/admin/sports?tab=bets" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">
                <span>🎟️</span> <span>Userwise Bet History</span>
              </Link>
              <Link href="/admin/sports?tab=markets" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">
                <span>⚙️</span> <span>Market &amp; Bet Settings</span>
              </Link>
              <Link href="/admin/sports?tab=provider" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">
                <span>🔌</span> <span>CricAPI Provider Engine</span>
              </Link>
            </nav>
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 text-center font-bold">
          Sports Engine v3.4 Active
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER BAR */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/sports?tab=matches"
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold transition-all flex items-center gap-1 text-xs"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Matches
            </Link>

            <div className="h-4 w-px bg-slate-200"></div>

            <span className="font-extrabold text-slate-900 text-base">
              {match?.teamA} vs {match?.teamB}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                match?.status === 'LIVE'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : match?.status === 'UPCOMING'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {match?.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoGenerateQuestions}
              disabled={generatingQuestions}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 text-amber-300 ${generatingQuestions ? 'animate-spin' : ''}`} />
              {generatingQuestions ? 'AI Generating Questions...' : '🤖 AI Auto-Generate All Questions'}
            </button>
            <button
              onClick={fetchMatchDetails}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* PAGE NOTIFICATION MESSAGE */}
        {message && (
          <div className="bg-blue-600 text-white px-6 py-2 text-xs font-bold flex items-center justify-between shadow-sm shrink-0">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="hover:opacity-75 font-extrabold text-sm">
              &times;
            </button>
          </div>
        )}

        {/* SCROLLABLE MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* MATCH DETAILS SUMMARY HEADER CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{match?.competition} • {match?.matchType}</span>
              <h2 className="text-xl font-black text-slate-900">{match?.teamA} <span className="text-slate-400 font-normal">vs</span> {match?.teamB}</h2>
              <p className="text-xs text-slate-500 font-medium">{match?.venue} • Start: {new Date(match?.startTime).toLocaleString()}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCustomForm((prev) => ({ ...prev, matchId: match.id }));
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" /> + Add Custom Question
              </button>
            </div>
          </div>

          {/* PAGE SUB-NAVIGATION TABS */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab('REVENUE')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'REVENUE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              📊 Platform Revenue &amp; Win/Loss Analytics
            </button>

            <button
              onClick={() => setActiveTab('QUESTIONS')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'QUESTIONS'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              🎯 Match Questions ({matchData?.matchMarkets?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('ODD_EVEN')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'ODD_EVEN'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              🎲 Match Odd/Even Rates
            </button>

            <button
              onClick={() => setActiveTab('ODDS')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'ODDS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              ⚙️ Win % &amp; Multiplier (X) Odds
            </button>
          </div>

          {/* TAB 1: PLATFORM REVENUE & WIN/LOSS ANALYTICS */}
          {activeTab === 'REVENUE' && (
            <div className="space-y-6">
              {/* SUMMARY KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Stake Turnover</span>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    ₹{(summary?.totalStake || 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400 block font-medium">
                    {summary?.totalBetsCount || 0} total bets placed
                  </span>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">User Winnings Paid Out</span>
                  <div className="text-2xl font-black text-red-600 font-mono">
                    ₹{(summary?.totalPayout || 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400 block font-medium">
                    {summary?.wonBetsCount || 0} winning tickets paid
                  </span>
                </div>

                <div
                  className={`p-5 rounded-2xl border shadow-sm space-y-1 ${
                    (summary?.netRevenue || 0) >= 0
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-red-500 text-white border-red-600'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider block opacity-90">Net Platform Revenue (GGR)</span>
                  <div className="text-3xl font-black font-mono">
                    ₹{(summary?.netRevenue || 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] font-extrabold block uppercase tracking-wider">
                    {(summary?.netRevenue || 0) >= 0 ? '🟢 Net Platform Profit' : '🔴 Net Platform Loss'}
                  </span>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">House Margin Win %</span>
                  <div className="text-2xl font-black text-indigo-600 font-mono">
                    {summary?.houseMarginPercent || 0}%
                  </div>
                  <span className="text-[11px] text-slate-400 block font-medium">Net platform retention</span>
                </div>
              </div>

              {/* BET CATEGORY BREAKDOWN TABLE */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-900 text-sm uppercase">Market Category Revenue Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50">
                        <th className="py-3 px-4">Market Name</th>
                        <th className="py-3 px-4">Bets Placed</th>
                        <th className="py-3 px-4">Stake Turnover</th>
                        <th className="py-3 px-4">User Payouts</th>
                        <th className="py-3 px-4 text-right">Net Revenue (GGR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {matchData?.marketBreakdown && matchData.marketBreakdown.length > 0 ? (
                        matchData.marketBreakdown.map((mb: any, i: number) => {
                          const net = mb.stake - mb.payout;
                          return (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-extrabold text-slate-900">{mb.name}</td>
                              <td className="py-3 px-4 font-mono text-slate-700">{mb.count}</td>
                              <td className="py-3 px-4 font-mono text-slate-900 font-bold">₹{mb.stake.toLocaleString()}</td>
                              <td className="py-3 px-4 font-mono text-red-600 font-bold">₹{mb.payout.toLocaleString()}</td>
                              <td className={`py-3 px-4 text-right font-mono font-black text-sm ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                ₹{net.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                            No bets placed on this match yet. Platform turnover will update here in real time.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MATCH QUESTIONS & FANCY BETS MANAGER */}
          {activeTab === 'QUESTIONS' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Match Questions &amp; Fancy Markets</h3>
                  <p className="text-xs text-slate-500">Manage all custom question bets created for {match?.teamA} vs {match?.teamB}.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAutoSettleLiveMarkets}
                    disabled={settlingMarkets}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className={`w-3.5 h-3.5 text-amber-300 ${settlingMarkets ? 'animate-spin' : ''}`} />
                    {settlingMarkets ? 'Settling...' : '⚡ Auto-Settle Live Sessions'}
                  </button>
                  <button
                    onClick={handleAutoGenerateQuestions}
                    disabled={generatingQuestions}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${generatingQuestions ? 'animate-spin' : ''}`} />
                    {generatingQuestions ? 'Generating...' : '🤖 AI Auto-Generate Questions'}
                  </button>
                  <button
                    onClick={() => {
                      setCustomForm((prev) => ({ ...prev, matchId: match.id }));
                      setShowCreateModal(true);
                    }}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> + Add Question
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50">
                      <th className="py-3 px-4">Question / Market Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Outcomes &amp; Decimal Odds</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {matchData?.matchMarkets && matchData.matchMarkets.length > 0 ? (
                      matchData.matchMarkets.map((m: any) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-extrabold text-slate-900">{m.name}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 font-mono text-[10px] font-bold rounded-full border border-teal-200">
                              {m.categorySlug || m.marketType}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 font-bold">
                            {m.selections?.map((s: any) => `${s.name} @ ${s.backPrice}`).join('  |  ') || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteMarket(m.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Question Market"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                          No custom question markets created for this match yet. Click "🤖 AI Auto-Generate Team Questions" to create them automatically!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ODD / EVEN RATE CONTROLS */}
          {activeTab === 'ODD_EVEN' && (
            <form onSubmit={handleSaveOddEven} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Match Specific Odd/Even Rates</h3>
                  <p className="text-xs text-slate-500">Configure global odd/even status and return multiplier specifically for {match?.teamA} vs {match?.teamB}.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMatchOddEvenForm({ ...matchOddEvenForm, enabled: !matchOddEvenForm.enabled })}
                  className={`px-4 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-xs cursor-pointer ${
                    matchOddEvenForm.enabled ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                  }`}
                >
                  {matchOddEvenForm.enabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Odd/Even Back Price Rate (Multiplier):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    max="10.0"
                    value={matchOddEvenForm.rate}
                    onChange={(e) => setMatchOddEvenForm({ ...matchOddEvenForm, rate: parseFloat(e.target.value) || 1.90 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-purple-600"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default multiplier for odd/even match runs (e.g. 1.90)</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingOddEven}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  {savingOddEven ? 'Saving Rates...' : 'Save Match Odd/Even Rates'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: WIN % & MULTIPLIER (X) ODDS OVERRIDE */}
          {activeTab === 'ODDS' && (
            <form onSubmit={handleSaveOddsConfig} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-extrabold text-slate-900 text-base">Win % &amp; Multiplier (X) Odds Control</h3>
                <p className="text-xs text-slate-500">Configure statistical probability model vs manual win multiplier odds override.</p>
              </div>

              <div className="space-y-3">
                <label className="font-bold text-slate-700 block text-xs">Odds Calculation Engine Mode:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOddsConfigForm({ ...oddsConfigForm, mode: 'AUTO' })}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      oddsConfigForm.mode === 'AUTO'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" /> Option 1: Automatic Live AI Model
                  </button>

                  <button
                    type="button"
                    onClick={() => setOddsConfigForm({ ...oddsConfigForm, mode: 'MANUAL' })}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      oddsConfigForm.mode === 'MANUAL'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Sliders className="w-4 h-4" /> Option 2: Admin Manual Odds Override
                  </button>
                </div>
              </div>

              {oddsConfigForm.mode === 'MANUAL' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-extrabold text-slate-900 text-xs block">{match?.teamA} Win % &amp; Odds:</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Win %:</label>
                        <input
                          type="number"
                          value={oddsConfigForm.winProbA}
                          onChange={(e) => {
                            const val = Math.min(99, Math.max(1, parseInt(e.target.value) || 50));
                            setOddsConfigForm({
                              ...oddsConfigForm,
                              winProbA: val,
                              winProbB: 100 - val,
                              oddsA: Number((100 / val).toFixed(2)),
                              oddsB: Number((100 / (100 - val)).toFixed(2)),
                            });
                          }}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Multiplier (X):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={oddsConfigForm.oddsA}
                          onChange={(e) => setOddsConfigForm({ ...oddsConfigForm, oddsA: parseFloat(e.target.value) || 1.75 })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-indigo-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-extrabold text-slate-900 text-xs block">{match?.teamB} Win % &amp; Odds:</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Win %:</label>
                        <input
                          type="number"
                          value={oddsConfigForm.winProbB}
                          onChange={(e) => {
                            const val = Math.min(99, Math.max(1, parseInt(e.target.value) || 50));
                            setOddsConfigForm({
                              ...oddsConfigForm,
                              winProbB: val,
                              winProbA: 100 - val,
                              oddsB: Number((100 / val).toFixed(2)),
                              oddsA: Number((100 / (100 - val)).toFixed(2)),
                            });
                          }}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Multiplier (X):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={oddsConfigForm.oddsB}
                          onChange={(e) => setOddsConfigForm({ ...oddsConfigForm, oddsB: parseFloat(e.target.value) || 2.15 })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingOddsConfig}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  {savingOddsConfig ? 'Saving Odds...' : 'Save Win % & Odds Config'}
                </button>
              </div>
            </form>
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
    </div>
  );
}

export default function MatchDetailsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-mono">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
            <span>Loading Match Control Center...</span>
          </div>
        </div>
      }
    >
      <MatchDetailsContent />
    </React.Suspense>
  );
}
