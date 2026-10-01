'use client';

import React, { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    activeGames: 0,
  });
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  // Tenant management state
  const [tenants, setTenants] = useState<any[]>([]);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    slug: '', name: '', domain: '', primaryColor: '#6366f1',
    superAdminName: '', superAdminEmail: '', superAdminPassword: '',
    maxAgentCount: 50, maxPlayerCount: 5000,
  });
  const [tenantLoading, setTenantLoading] = useState(false);
  const [tenantMessage, setTenantMessage] = useState('');

  const API = 'http://localhost:4000/api/v1';

  useEffect(() => {
    fetchAdminData();
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await fetch(`${API}/platform/tenants`);
      if (res.ok) setTenants(await res.json());
    } catch {}
  };


  const fetchAdminData = async () => {
    try {
      const [sRes, dRes, wRes, gRes] = await Promise.all([
        fetch('http://localhost:4000/api/v1/admin/stats'),
        fetch('http://localhost:4000/api/v1/admin/deposits'),
        fetch('http://localhost:4000/api/v1/admin/withdrawals'),
        fetch('http://localhost:4000/api/v1/admin/games'),
      ]);

      if (sRes.ok) setStats(await sRes.json());
      if (dRes.ok) setDeposits(await dRes.json());
      if (wRes.ok) setWithdrawals(await wRes.json());
      if (gRes.ok) setGames(await gRes.json());
    } catch (err: any) {
      // offline fallback
    }
  };

  const handleApproveDeposit = async (id: string) => {
    setMessage('');
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/deposits/${id}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');

      setMessage('✅ Deposit approved! User wallet credited.');
      fetchAdminData();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleRejectDeposit = async (id: string) => {
    setMessage('');
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/deposits/${id}/reject`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Rejection failed');

      setMessage('Deposit rejected.');
      fetchAdminData();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    setMessage('');
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/withdrawals/${id}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');

      setMessage('✅ Withdrawal approved.');
      fetchAdminData();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleUpdateRtp = async (gameId: string, rtp: number) => {
    try {
      await fetch(`http://localhost:4000/api/v1/admin/games/${gameId}/rtp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rtpPercentage: rtp }),
      });
      setMessage('✅ Game RTP updated.');
      fetchAdminData();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  // ── Tenant handlers ──────────────────────────────────────────────────────
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setTenantLoading(true); setTenantMessage('');
    try {
      const res = await fetch(`${API}/platform/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantForm),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to create tenant');
      setTenantMessage(`✅ Tenant "${tenantForm.name}" created!`);
      setTenantForm({ slug: '', name: '', domain: '', primaryColor: '#6366f1', superAdminName: '', superAdminEmail: '', superAdminPassword: '', maxAgentCount: 50, maxPlayerCount: 5000 });
      setShowCreateTenant(false);
      fetchTenants();
    } catch (err: any) {
      setTenantMessage(`❌ ${err.message}`);
    } finally { setTenantLoading(false); }
  };

  const handleToggleTenantStatus = async (id: string, current: string) => {
    const newStatus = current === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await fetch(`${API}/platform/tenants/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchTenants();
  };

  const handleDeleteTenant = async (id: string) => {
    if (!confirm('Delete this tenant permanently? This will cascade to all members and players.')) return;
    await fetch(`${API}/platform/tenants/${id}`, { method: 'DELETE' });
    fetchTenants();
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-rose-600 flex items-center justify-center font-bold text-white text-sm">
            ADM
          </div>
          <h1 className="font-extrabold text-lg text-white">RIVEXA Admin Operations Control</h1>
        </div>
      </header>

      {message && (
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 text-center text-sm font-bold text-emerald-300">
          {message}
        </div>
      )}

      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Realtime Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <span className="text-xs text-slate-400 block uppercase">Total Registered Players</span>
            <span className="text-3xl font-bold font-mono text-emerald-400 mt-1 block">{stats.totalUsers}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <span className="text-xs text-slate-400 block uppercase">Pending Deposits</span>
            <span className="text-3xl font-bold font-mono text-amber-400 mt-1 block">{stats.pendingDeposits}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <span className="text-xs text-slate-400 block uppercase">Pending Withdrawals</span>
            <span className="text-3xl font-bold font-mono text-rose-400 mt-1 block">{stats.pendingWithdrawals}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <span className="text-xs text-slate-400 block uppercase">Active Games</span>
            <span className="text-3xl font-bold font-mono text-white mt-1 block">{stats.activeGames}</span>
          </div>
        </div>

        {/* Manual Deposit Verification Center */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Manual Deposit Verification Center</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-3">Deposit ID</th>
                  <th className="p-3">User Email</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">UTR Reference</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {deposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-800/50">
                    <td className="p-3 font-mono font-bold text-white text-xs">{dep.id.substring(0, 8)}...</td>
                    <td className="p-3">{dep.user?.email || dep.userId}</td>
                    <td className="p-3 font-bold text-emerald-400 font-mono">₹{Number(dep.amount).toFixed(2)}</td>
                    <td className="p-3 font-mono text-slate-400">{dep.utrNumber}</td>
                    <td className="p-3 font-bold text-xs uppercase">{dep.status}</td>
                    <td className="p-3 text-right space-x-2">
                      {dep.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApproveDeposit(dep.id)}
                            className="px-3 py-1 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectDeposit(dep.id)}
                            className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {deposits.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-500 text-xs">
                      No pending deposits to verify.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Withdrawal Requests Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Pending Withdrawal Cashouts</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-3">Withdrawal ID</th>
                  <th className="p-3">User Email</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Payout Details</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-800/50">
                    <td className="p-3 font-mono font-bold text-white text-xs">{w.id.substring(0, 8)}...</td>
                    <td className="p-3">{w.user?.email || w.userId}</td>
                    <td className="p-3 font-bold text-amber-400 font-mono">₹{Number(w.amount).toFixed(2)}</td>
                    <td className="p-3 font-mono text-xs">{w.bankAccount?.upiId || w.bankAccount?.accountNumber || 'UPI'}</td>
                    <td className="p-3 font-bold text-xs uppercase">{w.status}</td>
                    <td className="p-3 text-right space-x-2">
                      {w.status === 'PENDING' && (
                        <button
                          onClick={() => handleApproveWithdrawal(w.id)}
                          className="px-3 py-1 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg"
                        >
                          Approve Cashout
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {withdrawals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-500 text-xs">
                      No withdrawal requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── TENANTS MANAGEMENT ──────────────────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-white">🏢 White-Label Tenant Management</h2>
              <p className="text-xs text-slate-400 mt-1">{tenants.length} tenant(s) registered on this platform</p>
            </div>
            <button
              onClick={() => { setShowCreateTenant(true); setTenantMessage(''); }}
              className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl"
            >
              ➕ New Tenant
            </button>
          </div>

          {tenantMessage && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold ${tenantMessage.startsWith('✅') ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/30' : 'bg-rose-900/30 text-rose-300 border border-rose-700/30'}`}>
              {tenantMessage}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-3">Tenant</th>
                  <th className="p-3">Slug</th>
                  <th className="p-3">Domain</th>
                  <th className="p-3">Members</th>
                  <th className="p-3">Players</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tenants.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-800/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs" style={{ background: t.primaryColor ?? '#6366f1' }}>
                          🏢
                        </div>
                        <span className="font-bold text-white">{t.name}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-indigo-300">{t.slug}</td>
                    <td className="p-3 text-slate-400">{t.domain || '—'}</td>
                    <td className="p-3 font-mono">{t._count?.members ?? 0}</td>
                    <td className="p-3 font-mono">{t._count?.players ?? 0}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.status === 'ACTIVE' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-rose-900/30 text-rose-300'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleToggleTenantStatus(t.id, t.status)}
                        className="px-3 py-1 text-xs font-bold text-white bg-slate-700 hover:bg-slate-600 rounded-lg"
                      >
                        {t.status === 'ACTIVE' ? '⏸ Suspend' : '▶ Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteTenant(t.id)}
                        className="px-3 py-1 text-xs font-bold text-white bg-rose-700 hover:bg-rose-600 rounded-lg"
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                      No tenants yet. Click ➕ New Tenant to create your first white-label operator.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Create Tenant Modal ─────────────────────────────────────────────── */}
      {showCreateTenant && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowCreateTenant(false); }}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-7 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">🏢 Create New Tenant</h3>
              <button onClick={() => setShowCreateTenant(false)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            {tenantMessage && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold ${tenantMessage.startsWith('✅') ? 'bg-emerald-900/30 text-emerald-300' : 'bg-rose-900/30 text-rose-300'}`}>
                {tenantMessage}
              </div>
            )}

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Tenant Name *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" placeholder="Rivexa India" value={tenantForm.name} onChange={e => setTenantForm({...tenantForm, name: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Slug (URL key) *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-mono" placeholder="rivexa-india" value={tenantForm.slug} onChange={e => setTenantForm({...tenantForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} required />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Custom Domain (optional)</label>
                <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" placeholder="play.example.com" value={tenantForm.domain} onChange={e => setTenantForm({...tenantForm, domain: e.target.value})} />
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-sm font-bold text-slate-300 mb-3">🔑 Super Admin Account</h4>
                <div className="space-y-3">
                  <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" placeholder="Super Admin Full Name *" value={tenantForm.superAdminName} onChange={e => setTenantForm({...tenantForm, superAdminName: e.target.value})} required />
                  <input type="email" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" placeholder="admin@email.com *" value={tenantForm.superAdminEmail} onChange={e => setTenantForm({...tenantForm, superAdminEmail: e.target.value})} required />
                  <input type="password" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" placeholder="Initial password *" value={tenantForm.superAdminPassword} onChange={e => setTenantForm({...tenantForm, superAdminPassword: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Max Agents</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" value={tenantForm.maxAgentCount} onChange={e => setTenantForm({...tenantForm, maxAgentCount: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Max Players</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" value={tenantForm.maxPlayerCount} onChange={e => setTenantForm({...tenantForm, maxPlayerCount: Number(e.target.value)})} />
                </div>
              </div>

              <button type="submit" disabled={tenantLoading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-white font-bold text-sm">
                {tenantLoading ? '🔄 Creating...' : '✅ Create Tenant + Super Admin'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
