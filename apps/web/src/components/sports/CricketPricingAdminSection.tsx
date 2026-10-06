'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getApiBaseUrl } from '@/lib/config';
import {
  TrendingUp,
  History,
  ShieldAlert,
  Zap,
  RefreshCw,
  Search,
  Filter,
  Download,
  CheckCircle,
  AlertTriangle,
  X,
  Sliders,
  ChevronRight,
  Layers,
  Activity,
  User,
  Clock,
  Sparkles,
} from 'lucide-react';

export interface IOddsSnapshotItem {
  id: string;
  marketId: string;
  selectionId: string;
  oldOdds: number;
  newOdds: number;
  fairOdds: number;
  probability: number;
  margin: number;
  exposure: number;
  liability: number;
  reason: string;
  source: string;
  pricingVersion: string;
  createdAt: string;
  market?: {
    name: string;
    marketType: string;
    match?: {
      id: string;
      teamA?: { name: string; shortName?: string };
      teamB?: { name: string; shortName?: string };
    };
  };
  selection?: {
    name: string;
  };
}

export function CricketPricingAdminSection({
  matchList,
}: {
  matchList?: any[];
}) {
  const [activeSubTab, setActiveSubTab] = useState<'HISTORY' | 'OVERRIDE' | 'CONFIG' | 'CHART'>('HISTORY');

  // Ledger / History state
  const [historyItems, setHistoryItems] = useState<IOddsSnapshotItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Debug Breakdown Drawer State
  const [selectedDebugItem, setSelectedDebugItem] = useState<IOddsSnapshotItem | null>(null);

  // Manual Override Form State
  const [overrideMatchId, setOverrideMatchId] = useState<string>('');
  const [overrideMarkets, setOverrideMarkets] = useState<any[]>([]);
  const [overrideMarketId, setOverrideMarketId] = useState<string>('');
  const [overrideSelectionId, setOverrideSelectionId] = useState<string>('');
  const [overrideOdds, setOverrideOdds] = useState<string>('2.10');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideExpiry, setOverrideExpiry] = useState<string>('60');
  const [submittingOverride, setSubmittingOverride] = useState<boolean>(false);
  const [overrideFeedback, setOverrideFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Configuration Form State
  const [configForm, setConfigForm] = useState({
    defaultMargin: '0.04',
    minOdds: '1.01',
    maxOdds: '500.00',
    minStake: '10.00',
    maxStake: '100000.00',
    autoSuspendStaleSec: '60',
    maxLiabilityPerSelection: '500000.00',
    riskAdjustmentEnabled: true,
  });
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [configFeedback, setConfigFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch Odds History Ledger
  const fetchOddsHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (sourceFilter !== 'ALL') query.append('source', sourceFilter);
      if (reasonFilter !== 'ALL') query.append('reason', reasonFilter);
      query.append('page', page.toString());
      query.append('limit', '30');

      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/history/odds?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setHistoryItems(json.data || []);
        setTotalPages(json.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed fetching odds history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [search, sourceFilter, reasonFilter, page]);

  useEffect(() => {
    fetchOddsHistory();
  }, [fetchOddsHistory]);

  // Fetch Pricing Configuration
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/pricing/config`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setConfigForm({
            defaultMargin: (json.data.defaultMargin ?? 0.04).toString(),
            minOdds: (json.data.minOdds ?? 1.01).toString(),
            maxOdds: (json.data.maxOdds ?? 500.0).toString(),
            minStake: (json.data.minStake ?? 10.0).toString(),
            maxStake: (json.data.maxStake ?? 100000.0).toString(),
            autoSuspendStaleSec: (json.data.autoSuspendStaleSec ?? 60).toString(),
            maxLiabilityPerSelection: (json.data.maxLiabilityPerSelection ?? 500000.0).toString(),
            riskAdjustmentEnabled: json.data.riskAdjustmentEnabled ?? true,
          });
        }
      }
    } catch (err) {
      console.error('Failed loading pricing config:', err);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Fetch Markets when Override Match changes
  useEffect(() => {
    if (!overrideMatchId) {
      setOverrideMarkets([]);
      return;
    }
    const loadMarkets = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/cricket/matches/${overrideMatchId}/markets`);
        if (res.ok) {
          const json = await res.json();
          setOverrideMarkets(json.data?.markets || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadMarkets();
  }, [overrideMatchId]);

  // Handle Override Submit
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideMarketId || !overrideSelectionId || !overrideOdds) return;
    setSubmittingOverride(true);
    setOverrideFeedback(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/markets/${overrideMarketId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectionId: overrideSelectionId,
          newOdds: parseFloat(overrideOdds),
          reason: overrideReason || 'Admin Manual Strategic Adjustment',
          expiryMinutes: parseInt(overrideExpiry, 10) || 60,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setOverrideFeedback({ type: 'success', text: json.message || 'Override applied successfully!' });
        fetchOddsHistory();
        setTimeout(() => {
          setOverrideReason('');
          setOverrideFeedback(null);
        }, 2000);
      } else {
        setOverrideFeedback({ type: 'error', text: json.message || 'Failed applying override' });
      }
    } catch (err: any) {
      setOverrideFeedback({ type: 'error', text: err.message || 'Network error applying override' });
    } finally {
      setSubmittingOverride(false);
    }
  };

  // Handle Save Pricing Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigFeedback(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/admin/pricing/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultMargin: parseFloat(configForm.defaultMargin),
          minOdds: parseFloat(configForm.minOdds),
          maxOdds: parseFloat(configForm.maxOdds),
          minStake: parseFloat(configForm.minStake),
          maxStake: parseFloat(configForm.maxStake),
          autoSuspendStaleSec: parseInt(configForm.autoSuspendStaleSec, 10),
          maxLiabilityPerSelection: parseFloat(configForm.maxLiabilityPerSelection),
          riskAdjustmentEnabled: configForm.riskAdjustmentEnabled,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setConfigFeedback({ type: 'success', text: 'Pricing & Risk engine rules updated successfully!' });
        setTimeout(() => setConfigFeedback(null), 2500);
      } else {
        setConfigFeedback({ type: 'error', text: json.message || 'Failed saving config' });
      }
    } catch (err: any) {
      setConfigFeedback({ type: 'error', text: err.message || 'Error updating pricing config' });
    } finally {
      setSavingConfig(false);
    }
  };

  // CSV Export Generator
  const exportCsv = () => {
    if (historyItems.length === 0) return;
    const headers = ['Timestamp', 'Match', 'Market', 'Selection', 'Old Odds', 'New Odds', 'Fair Odds', 'Prob %', 'Margin %', 'Source', 'Reason', 'Version'];
    const rows = historyItems.map((item) => [
      new Date(item.createdAt).toISOString(),
      item.market?.match ? `${item.market.match.teamA?.name} vs ${item.market.match.teamB?.name}` : 'N/A',
      item.market?.name || 'N/A',
      item.selection?.name || 'N/A',
      item.oldOdds,
      item.newOdds,
      item.fairOdds,
      (Number(item.probability) * 100).toFixed(2),
      (Number(item.margin) * 100).toFixed(2),
      item.source,
      `"${(item.reason || '').replace(/"/g, '""')}"`,
      item.pricingVersion,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cricket_odds_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedMarketObj = useMemo(() => {
    return overrideMarkets.find((m) => m.id === overrideMarketId);
  }, [overrideMarkets, overrideMarketId]);

  return (
    <div className="space-y-6">
      {/* ── Sub Navigation Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0A1635] border border-cyan-500/20 p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center font-black shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <TrendingUp className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-wide">Cricket Pricing & Risk Engine</h2>
            <p className="text-xs text-slate-400">
              Deterministic Odds Pipeline, Margin Management, Exposure & Audit Trails
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-[#050D24] p-1 rounded-xl border border-cyan-500/20">
          <button
            onClick={() => setActiveSubTab('HISTORY')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'HISTORY'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Odds Movement Ledger</span>
          </button>

          <button
            onClick={() => setActiveSubTab('OVERRIDE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'OVERRIDE'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Manual Price Override</span>
          </button>

          <button
            onClick={() => setActiveSubTab('CONFIG')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'CONFIG'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Margin & Risk Config</span>
          </button>

          <button
            onClick={() => setActiveSubTab('CHART')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'CHART'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Odds Movement Graph</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: ODDS MOVEMENT LEDGER (HISTORICAL DATA) ── */}
      {activeSubTab === 'HISTORY' && (
        <div className="bg-gradient-to-br from-[#081538] to-[#040A1F] border border-cyan-500/20 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050D24] p-3 rounded-xl border border-cyan-500/20 text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reason, market, selection..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#09173D] border border-cyan-500/30 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Source Dropdown */}
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-[#09173D] border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-bold focus:outline-none"
              >
                <option value="ALL">All Sources</option>
                <option value="SYSTEM_RECALCULATION">System Engine</option>
                <option value="ADMIN_OVERRIDE">Admin Manual Override</option>
                <option value="SCORE_UPDATE">Score / Event Update</option>
                <option value="EXPOSURE_UPDATE">Exposure Skew</option>
                <option value="MARKET_CONFIG_UPDATE">Config Change</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchOddsHistory}
                className="px-3 py-1.5 bg-[#0D2254] hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={exportCsv}
                disabled={historyItems.length === 0}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-cyan-500/20">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-[#0D1F4B] text-slate-300 uppercase tracking-wider font-extrabold text-[10px] border-b border-cyan-500/20">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Match</th>
                  <th className="py-3 px-3">Market / Selection</th>
                  <th className="py-3 px-3 text-right">Previous</th>
                  <th className="py-3 px-3 text-right">New Odds</th>
                  <th className="py-3 px-3 text-right">Fair Odds</th>
                  <th className="py-3 px-3 text-right">Prob %</th>
                  <th className="py-3 px-3">Source / Reason</th>
                  <th className="py-3 px-3 text-center">Version</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#061230]">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                      Loading odds movement snapshots...
                    </td>
                  </tr>
                ) : historyItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No price snapshots recorded matching criteria.
                    </td>
                  </tr>
                ) : (
                  historyItems.map((item) => {
                    const matchName = item.market?.match
                      ? `${item.market.match.teamA?.shortName || item.market.match.teamA?.name} vs ${item.market.match.teamB?.shortName || item.market.match.teamB?.name}`
                      : 'Cricket Match';

                    const isUp = Number(item.newOdds) > Number(item.oldOdds);
                    const isOverride = item.source === 'ADMIN_OVERRIDE';

                    return (
                      <tr key={item.id} className="hover:bg-[#0C2152]/60 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-bold text-white max-w-[140px] truncate">
                          {matchName}
                        </td>
                        <td className="py-2.5 px-3 max-w-[180px] truncate">
                          <div className="font-sans font-extrabold text-cyan-300">{item.market?.name}</div>
                          <div className="font-sans text-[11px] text-slate-300 font-bold">{item.selection?.name}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">@{Number(item.oldOdds).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-black">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              isUp
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}
                          >
                            @{Number(item.newOdds).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300 font-bold">
                          @{Number(item.fairOdds).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-cyan-400 font-extrabold">
                          {(Number(item.probability) * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px]">
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                isOverride
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {item.source}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.reason}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center text-[10px] text-slate-400 font-bold">
                          {item.pricingVersion}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => setSelectedDebugItem(item)}
                            className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[10px] font-sans font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Debug</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-[#0D2254] hover:bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-[#0D2254] hover:bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MANUAL PRICE OVERRIDE ── */}
      {activeSubTab === 'OVERRIDE' && (
        <div className="bg-gradient-to-br from-[#081538] to-[#040A1F] border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
          <div className="flex items-center gap-3 border-b border-amber-500/20 pb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Zap className="w-5 h-5 fill-amber-400/20" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white tracking-wide">Manual Odds Override Control</h3>
              <p className="text-xs text-slate-400">
                Directly override market selection odds. All manual overrides create audit logs and emit live WebSocket updates.
              </p>
            </div>
          </div>

          {overrideFeedback && (
            <div
              className={`p-3.5 rounded-xl text-xs font-extrabold flex items-center gap-2 ${
                overrideFeedback.type === 'success'
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-red-500/20 border border-red-500/40 text-red-300'
              }`}
            >
              {overrideFeedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
              <span>{overrideFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleOverrideSubmit} className="space-y-4 max-w-2xl">
            {/* Match Selection */}
            <div>
              <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                1. Select Match
              </label>
              <select
                value={overrideMatchId}
                onChange={(e) => {
                  setOverrideMatchId(e.target.value);
                  setOverrideMarketId('');
                  setOverrideSelectionId('');
                }}
                className="w-full bg-[#050D24] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-400"
              >
                <option value="">-- Select Cricket Match --</option>
                {(matchList || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.teamA?.name} vs {m.teamB?.name} ({m.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Market & Selection */}
            {overrideMarkets.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                    2. Select Market
                  </label>
                  <select
                    value={overrideMarketId}
                    onChange={(e) => {
                      setOverrideMarketId(e.target.value);
                      setOverrideSelectionId('');
                    }}
                    className="w-full bg-[#050D24] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">-- Select Market --</option>
                    {overrideMarkets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.status})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMarketObj && (
                  <div>
                    <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                      3. Select Outcome / Selection
                    </label>
                    <select
                      value={overrideSelectionId}
                      onChange={(e) => setOverrideSelectionId(e.target.value)}
                      className="w-full bg-[#050D24] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-400"
                    >
                      <option value="">-- Select Selection --</option>
                      {selectedMarketObj.selections.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Current: @{Number(s.backPrice).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Override Price & Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                  4. New Override Odds (@)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  max="500"
                  value={overrideOdds}
                  onChange={(e) => setOverrideOdds(e.target.value)}
                  placeholder="e.g. 2.15"
                  className="w-full bg-[#050D24] border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                  5. Expiry Duration (Minutes)
                </label>
                <input
                  type="number"
                  value={overrideExpiry}
                  onChange={(e) => setOverrideExpiry(e.target.value)}
                  placeholder="60"
                  className="w-full bg-[#050D24] border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                6. Strategic Reason (Mandatory Audit Reason)
              </label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Injury report / pitch condition adjustment / manual risk dampening"
                required
                className="w-full bg-[#050D24] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-white text-xs font-medium focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={submittingOverride || !overrideSelectionId || !overrideOdds}
              className="py-3 px-6 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_25px_rgba(245,158,11,0.7)] transition-all cursor-pointer disabled:opacity-40"
            >
              {submittingOverride ? 'Applying Override...' : 'Apply Manual Override'}
            </button>
          </form>
        </div>
      )}

      {/* ── TAB 3: MARGIN & RISK CONFIGURATION ── */}
      {activeSubTab === 'CONFIG' && (
        <div className="bg-gradient-to-br from-[#081538] to-[#040A1F] border border-purple-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
          <div className="flex items-center gap-3 border-b border-purple-500/20 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white tracking-wide">Pricing Engine & Margin Rules</h3>
              <p className="text-xs text-slate-400">
                Configure bookmaker overround margins, stake limits, max liability caps, and stale data protection thresholds.
              </p>
            </div>
          </div>

          {configFeedback && (
            <div
              className={`p-3.5 rounded-xl text-xs font-extrabold flex items-center gap-2 ${
                configFeedback.type === 'success'
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-red-500/20 border border-red-500/40 text-red-300'
              }`}
            >
              {configFeedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
              <span>{configFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
            <div>
              <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                Default Bookmaker Margin (e.g. 0.04 = 4%)
              </label>
              <input
                type="number"
                step="0.005"
                min="0.01"
                max="0.25"
                value={configForm.defaultMargin}
                onChange={(e) => setConfigForm({ ...configForm, defaultMargin: e.target.value })}
                className="w-full bg-[#050D24] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                Max Liability Cap Per Selection (₹)
              </label>
              <input
                type="number"
                value={configForm.maxLiabilityPerSelection}
                onChange={(e) => setConfigForm({ ...configForm, maxLiabilityPerSelection: e.target.value })}
                className="w-full bg-[#050D24] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                Minimum Stake (₹)
              </label>
              <input
                type="number"
                value={configForm.minStake}
                onChange={(e) => setConfigForm({ ...configForm, minStake: e.target.value })}
                className="w-full bg-[#050D24] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                Maximum Stake Limit (₹)
              </label>
              <input
                type="number"
                value={configForm.maxStake}
                onChange={(e) => setConfigForm({ ...configForm, maxStake: e.target.value })}
                className="w-full bg-[#050D24] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                Auto-Suspend Stale Provider Data Threshold (Sec)
              </label>
              <input
                type="number"
                value={configForm.autoSuspendStaleSec}
                onChange={(e) => setConfigForm({ ...configForm, autoSuspendStaleSec: e.target.value })}
                className="w-full bg-[#050D24] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="riskToggle"
                checked={configForm.riskAdjustmentEnabled}
                onChange={(e) => setConfigForm({ ...configForm, riskAdjustmentEnabled: e.target.checked })}
                className="w-4 h-4 accent-purple-500 cursor-pointer"
              />
              <label htmlFor="riskToggle" className="text-xs font-extrabold text-white cursor-pointer select-none">
                Enable Exposure Skew Risk Adjustments
              </label>
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="py-3 px-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.7)] transition-all cursor-pointer disabled:opacity-40"
              >
                {savingConfig ? 'Saving Engine Settings...' : 'Save Pricing Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 4: ODDS MOVEMENT DYNAMIC SVG CHART ── */}
      {activeSubTab === 'CHART' && (
        <div className="bg-gradient-to-br from-[#081538] to-[#040A1F] border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h3 className="font-black text-base text-white">Odds Movement Time Series Chart</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Live Stored History Stream ({historyItems.length} data points)
            </span>
          </div>

          {historyItems.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 space-y-2">
              <Activity className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No stored odds history snapshots available yet for graphing.</p>
            </div>
          ) : (
            <div className="bg-[#050D24] p-4 rounded-xl border border-cyan-500/20 space-y-3">
              <div className="h-64 w-full flex items-end justify-between gap-1 pt-6 pb-2 px-2 border-b border-cyan-500/20 relative">
                {/* Y-Axis Grid Lines */}
                <div className="absolute left-0 top-0 text-[9px] font-mono text-slate-500">Max @5.00</div>
                <div className="absolute left-0 bottom-2 text-[9px] font-mono text-slate-500">Min @1.01</div>

                {historyItems.slice(0, 30).reverse().map((it, idx) => {
                  const val = Number(it.newOdds);
                  const heightPct = Math.min(100, Math.max(10, (val / 5.0) * 100));

                  return (
                    <div key={it.id || idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-[#0B1D4A] border border-cyan-400 text-[10px] p-2 rounded-lg text-white font-mono z-30 shadow-xl whitespace-nowrap">
                        <span className="font-bold text-cyan-300">{it.selection?.name}</span>
                        <span>Odds: @{val.toFixed(2)}</span>
                        <span>Prob: {(Number(it.probability) * 100).toFixed(1)}%</span>
                        <span className="text-slate-400 text-[9px]">{new Date(it.createdAt).toLocaleTimeString()}</span>
                      </div>

                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full bg-gradient-to-t from-cyan-600 via-emerald-500 to-cyan-300 rounded-t group-hover:brightness-125 transition-all shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                      />
                      <span className="text-[9px] font-mono text-slate-400 rotate-45 origin-left truncate max-w-[24px]">
                        @{val.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DEBUG BREAKDOWN DRAWER MODAL ── */}
      {selectedDebugItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#071333] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-4 font-sans relative">
            <button
              onClick={() => setSelectedDebugItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 pb-3 border-b border-cyan-500/20">
              <Layers className="w-5 h-5 text-cyan-400" />
              <h3 className="font-black text-base text-white">Market Pricing Pipeline Calculation Detail</h3>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="bg-[#040A1E] p-3 rounded-xl border border-white/5 space-y-1">
                <div className="text-cyan-300 font-bold">
                  {selectedDebugItem.market?.name} &bull; {selectedDebugItem.selection?.name}
                </div>
                <div className="text-slate-400 text-[11px]">Snapshot ID: {selectedDebugItem.id}</div>
              </div>

              {/* 7-Stage Pipeline Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-[#091842] p-2.5 rounded-lg border border-white/5">
                  <span className="text-slate-400 font-bold">1. Model Win Probability:</span>
                  <span className="text-cyan-300 font-black">{(Number(selectedDebugItem.probability) * 100).toFixed(2)}%</span>
                </div>

                <div className="flex justify-between items-center bg-[#091842] p-2.5 rounded-lg border border-white/5">
                  <span className="text-slate-400 font-bold">2. Fair Odds (1 / P):</span>
                  <span className="text-white font-black">@{Number(selectedDebugItem.fairOdds).toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center bg-[#091842] p-2.5 rounded-lg border border-white/5">
                  <span className="text-slate-400 font-bold">3. Configured Margin:</span>
                  <span className="text-purple-300 font-black">{(Number(selectedDebugItem.margin) * 100).toFixed(2)}%</span>
                </div>

                <div className="flex justify-between items-center bg-[#091842] p-2.5 rounded-lg border border-white/5">
                  <span className="text-slate-400 font-bold">4. Selection Exposure Stake:</span>
                  <span className="text-amber-300 font-black">₹{Number(selectedDebugItem.exposure).toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center bg-[#091842] p-2.5 rounded-lg border border-white/5">
                  <span className="text-slate-400 font-bold">5. Net Potential Liability:</span>
                  <span className="text-red-400 font-black">₹{Number(selectedDebugItem.liability).toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center bg-[#091842] p-2.5 rounded-lg border border-white/5">
                  <span className="text-slate-400 font-bold">6. Pricing Version:</span>
                  <span className="text-slate-300 font-black">{selectedDebugItem.pricingVersion}</span>
                </div>

                <div className="flex justify-between items-center bg-gradient-to-r from-emerald-500/20 to-teal-500/20 p-3 rounded-xl border border-emerald-500/40">
                  <span className="text-white font-black">7. Final Displayed Odds:</span>
                  <span className="text-emerald-400 font-black text-sm">@{Number(selectedDebugItem.newOdds).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-2 border-t border-white/10">
                <strong>Movement Reason:</strong> {selectedDebugItem.reason}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
