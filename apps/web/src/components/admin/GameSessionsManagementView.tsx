'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '@/lib/config';
import {
  Shield,
  Search,
  RefreshCw,
  AlertOctagon,
  CheckCircle2,
  Filter,
  Eye,
  Ban,
  ChevronLeft,
  ChevronRight,
  Layers,
  Activity,
  Users,
  Clock,
  X,
} from 'lucide-react';

interface GameSessionItem {
  id: string;
  user?: { id: string; name: string; email: string };
  game?: { id: string; name: string; slug: string };
  provider: string;
  providerSessionId?: string;
  status: 'CREATED' | 'ACTIVE' | 'CLOSED' | 'EXPIRED' | 'REVOKED' | 'FAILED';
  mode: string;
  currency: string;
  createdAt: string;
  expiresAt: string;
  lastActivityAt?: string | null;
  closedAt?: string | null;
  revokedAt?: string | null;
  revocationReason?: string | null;
}

export function GameSessionsManagementView() {
  const [sessions, setSessions] = useState<GameSessionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pagination state
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Summary Metrics
  const [activeCount, setActiveCount] = useState<number>(0);
  const [createdCount, setCreatedCount] = useState<number>(0);
  const [revokedCount, setRevokedCount] = useState<number>(0);
  const [closedCount, setClosedCount] = useState<number>(0);

  // Modals state
  const [selectedSession, setSelectedSession] = useState<GameSessionItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showRevokeModal, setShowRevokeModal] = useState<boolean>(false);
  const [revokeReason, setRevokeReason] = useState<string>('');
  const [revoking, setRevoking] = useState<boolean>(false);
  const [revokeSuccessMsg, setRevokeSuccessMsg] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
      const apiBase = getApiBaseUrl();

      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '15');
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const res = await fetch(`${apiBase}/admin/game-sessions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch game sessions.`);
      }

      const data = await res.json();
      const list: GameSessionItem[] = data.data || [];
      setSessions(list);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);

      // Compute summary counts from list
      setActiveCount(list.filter((s) => s.status === 'ACTIVE').length);
      setCreatedCount(list.filter((s) => s.status === 'CREATED').length);
      setRevokedCount(list.filter((s) => s.status === 'REVOKED').length);
      setClosedCount(list.filter((s) => s.status === 'CLOSED' || s.status === 'EXPIRED').length);
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = async () => {
    if (!selectedSession) return;
    setRevoking(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
      const apiBase = getApiBaseUrl();

      const res = await fetch(`${apiBase}/admin/game-sessions/${selectedSession.id}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: revokeReason || 'Administratively revoked by admin' }),
      });

      if (!res.ok) {
        throw new Error('Failed to revoke session.');
      }

      setRevokeSuccessMsg(`Session ${selectedSession.id.substring(0, 8)}... successfully revoked.`);
      setShowRevokeModal(false);
      setRevokeReason('');
      fetchSessions();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke session.');
    } finally {
      setRevoking(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-black rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            🟢 ACTIVE
          </span>
        );
      case 'CREATED':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-black rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300">
            ⚡ CREATED
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-300">
            CLOSED
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            EXPIRED
          </span>
        );
      case 'REVOKED':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-black rounded-full bg-rose-100 text-rose-800 border border-rose-300">
            🚫 REVOKED
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-red-100 text-red-800 border border-red-300">
            FAILED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER BANNER ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Game Session Security &amp; Control Center
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-black bg-indigo-100 text-indigo-700 rounded-md border border-indigo-200">
                REAL-TIME SECURITY
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Inspect active bearer tokens, manage session lifecycles, and force close sessions across all game engines.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchSessions()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Live Sessions
        </button>
      </div>

      {/* ── METRICS SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Sessions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              ACTIVE SESSIONS
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
              🟢
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{activeCount}</div>
          <p className="text-[10px] font-medium text-slate-500 mt-1">Real-time active player games</p>
        </div>

        {/* Created Sessions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              CREATED SESSIONS
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center text-xs font-bold">
              ⚡
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-600">{createdCount}</div>
          <p className="text-[10px] font-medium text-slate-500 mt-1">Pending first player action</p>
        </div>

        {/* Revoked Sessions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              REVOKED BY ADMIN
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-xs font-bold">
              🚫
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">{revokedCount}</div>
          <p className="text-[10px] font-medium text-slate-500 mt-1">Terminated security sessions</p>
        </div>

        {/* Total Listed */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              TOTAL RECORDED
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
              📊
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
          <p className="text-[10px] font-medium text-slate-500 mt-1">Sessions in audit registry</p>
        </div>
      </div>

      {/* ── NOTIFICATIONS & ERRORS ── */}
      {revokeSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {revokeSuccessMsg}
          </span>
          <button
            onClick={() => setRevokeSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-extrabold"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      {/* ── CONTROL BAR: SEARCH & STATUS FILTERS ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Session ID, User, Email, Game..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block mr-1" />
          {['ALL', 'ACTIVE', 'CREATED', 'EXPIRED', 'CLOSED', 'REVOKED', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ── SESSIONS TABLE CARD ── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-slate-700">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 font-black border-b border-slate-200">
              <tr>
                <th className="p-4">Session ID</th>
                <th className="p-4">Player</th>
                <th className="p-4">Game</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Status</th>
                <th className="p-4">Mode / Currency</th>
                <th className="p-4">Created At</th>
                <th className="p-4">Last Activity</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 font-semibold">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      Loading live game sessions...
                    </div>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 font-semibold">
                    No game sessions found matching your criteria.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono text-[11px] text-indigo-600 font-bold">
                      {sess.id.substring(0, 8)}...
                    </td>
                    <td className="p-4">
                      <div className="font-extrabold text-slate-900">{sess.user?.name || 'Unknown'}</div>
                      <div className="text-[10px] text-slate-400">{sess.user?.email || sess.user?.id}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{sess.game?.name || sess.game?.slug}</div>
                      <div className="text-[10px] text-slate-400">{sess.game?.slug}</div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        <Layers className="w-3 h-3 text-indigo-500" />
                        {sess.provider}
                      </span>
                    </td>
                    <td className="p-4">{getStatusBadge(sess.status)}</td>
                    <td className="p-4 text-[11px] text-slate-600">
                      <span className="font-bold text-slate-900">{sess.mode}</span> / {sess.currency}
                    </td>
                    <td className="p-4 text-[11px] text-slate-500">
                      {new Date(sess.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-[11px] text-slate-500">
                      {sess.lastActivityAt ? new Date(sess.lastActivityAt).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSession(sess);
                            setShowDetailModal(true);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {(sess.status === 'ACTIVE' || sess.status === 'CREATED') && (
                          <button
                            onClick={() => {
                              setSelectedSession(sess);
                              setShowRevokeModal(true);
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                            title="Force Close / Revoke Session"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>
              Page {page} of {totalPages} ({totalCount} total sessions)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white font-bold transition-all cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white font-bold transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL ── */}
      {showDetailModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Session Security Inspection</h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase">SESSION ID</span>
                <p className="font-mono font-bold text-indigo-700 break-all">{selectedSession.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">PLAYER NAME</span>
                  <p className="font-bold text-slate-900">{selectedSession.user?.name || 'N/A'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{selectedSession.user?.email}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">GAME ENGINE</span>
                  <p className="font-bold text-slate-900">{selectedSession.game?.name || 'N/A'}</p>
                  <p className="text-[10px] text-slate-400">{selectedSession.game?.slug}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">STATUS</span>
                  <div className="mt-1">{getStatusBadge(selectedSession.status)}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">MODE / CURRENCY</span>
                  <p className="font-extrabold text-slate-900 mt-1">
                    {selectedSession.mode} / {selectedSession.currency}
                  </p>
                </div>
              </div>

              <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase">TIMESTAMPS</span>
                <p>Created: <span className="font-bold">{new Date(selectedSession.createdAt).toLocaleString()}</span></p>
                <p>Expires: <span className="font-bold">{new Date(selectedSession.expiresAt).toLocaleString()}</span></p>
                {selectedSession.lastActivityAt && (
                  <p>Last Activity: <span className="font-bold">{new Date(selectedSession.lastActivityAt).toLocaleString()}</span></p>
                )}
                {selectedSession.closedAt && (
                  <p>Closed At: <span className="font-bold">{new Date(selectedSession.closedAt).toLocaleString()}</span></p>
                )}
                {selectedSession.revokedAt && (
                  <p className="text-rose-600 font-bold">
                    Revoked At: {new Date(selectedSession.revokedAt).toLocaleString()} ({selectedSession.revocationReason})
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REVOKE MODAL ── */}
      {showRevokeModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Force Revoke Game Session?</h3>
                <p className="text-xs text-slate-500 font-medium">
                  This will immediately terminate the player's active session and block game access.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase block">
                Revocation Reason (Optional):
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Suspicious betting activity / Security check"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRevokeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={revoking}
                onClick={handleRevokeSession}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {revoking ? 'Revoking...' : 'Confirm Force Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
