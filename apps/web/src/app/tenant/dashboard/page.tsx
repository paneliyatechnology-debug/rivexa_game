'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/config';
import {
  Users,
  Shield,
  Gamepad2,
  Wallet,
  CreditCard,
  Plus,
  Menu,
  X,
  LogOut,
  RefreshCw,
  Search,
  Check,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  Building2,
  TrendingUp,
  Activity,
  UserCheck,
  Crown,
  Zap,
  User,
  ShieldCheck,
  DollarSign,
  FileText,
  AlertCircle,
  Play,
  Pause,
  Trash2,
  Layers,
  BarChart3,
  Edit3,
  Star,
  Award,
  PlusCircle,
  Sliders,
  Copy,
  Share2,
  Eye,
  EyeOff,
  MessageCircle,
  CheckCircle2,
  Minus,
  History,
  Clock
} from 'lucide-react';

// ─── TYPES & INTERFACES ─────────────────────────────────────────────────────

export interface TenantMember {
  id: string;
  tenantId: string;
  tenant: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    commissionRates: Record<string, number>;
    allowedGames: string[];
  };
  name: string;
  email: string;
  phone: string | null;
  role: 'SUPER_ADMIN' | 'SUB_ADMIN' | 'SUPER_AGENT' | 'AGENT' | string;
  status: string;
  creditBalance: number;
  commissionBalance: number;
  referralCode: string;
  parentId: string | null;
  _count?: {
    children?: number;
    players?: number;
  };
}

export interface CustomRole {
  id: string;
  code: string;
  label: string;
  icon: string;
  color: string;
  baseRank: 'SUPER_ADMIN' | 'SUB_ADMIN' | 'SUPER_AGENT' | 'AGENT';
  description: string;
  isBuiltIn?: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface DisplayGame {
  id: string;
  name: string;
  icon: string;
  badge: string;
  isEnabled: boolean;
}

// ─── CONFIGURABLE CONSTANTS & DICTIONARIES ─────────────────────────────────

export const CREDIT_PRESETS = [1000, 5000, 10000, 50000, 100000];

export const GAME_ICON_MAP: Record<string, string> = {
  mines: '💎',
  crash: '🚀',
  spin: '🎡',
  dice: '🎲',
  jet: '✈️',
  'andar-bahar': '♠️',
  pushparani: '🚚',
  'coin-flip': '🪙',
  sports: '🏆',
  cricket: '🏏',
  parity: '⚖️',
  casino: '🎰',
};

export const DEFAULT_SYSTEM_ROLES: CustomRole[] = [
  {
    id: 'role-super-admin',
    code: 'SUPER_ADMIN',
    label: 'Tenant Super Admin',
    icon: '👑',
    color: '#f59e0b',
    baseRank: 'SUPER_ADMIN',
    description: 'Senior tenant owner with full management rights',
    isBuiltIn: true,
    status: 'ACTIVE',
  },
  {
    id: 'role-super-master',
    code: 'SUPER_AGENT',
    label: 'Super Master',
    icon: '⚡',
    color: '#10b981',
    baseRank: 'SUPER_AGENT',
    description: 'Super Master distributor managing sub-masters & agents',
    isBuiltIn: true,
    status: 'ACTIVE',
  },
  {
    id: 'role-sub-master',
    code: 'SUB_ADMIN',
    label: 'Sub Master',
    icon: '🌟',
    color: '#8b5cf6',
    baseRank: 'SUB_ADMIN',
    description: 'Sub Master agent managing local master agents',
    isBuiltIn: true,
    status: 'ACTIVE',
  },
  {
    id: 'role-master-agent',
    code: 'AGENT',
    label: 'Master (Agent)',
    icon: '👤',
    color: '#06b6d4',
    baseRank: 'AGENT',
    description: 'Direct master agent serving end players',
    isBuiltIn: true,
    status: 'ACTIVE',
  },
];

export const EMOJI_ICONS = ['⚡', '🌟', '👤', '🛡️', '👑', '💎', '🚀', '🎯', '🏆', '🔥', '💎', '👑'];

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'members', label: 'Hierarchy Members', icon: Users },
  { id: 'roles', label: 'Role Management', icon: ShieldCheck },
  { id: 'games', label: 'Allowed Games', icon: Gamepad2 },
  { id: 'players', label: 'Player Roster', icon: UserCheck },
  { id: 'history', label: 'Playing History', icon: History },
  { id: 'credits', label: 'Credits Ledger', icon: Wallet },
  { id: 'audit', label: 'Audit Trail', icon: FileText },
];

// ─── UTILITY HELPERS ────────────────────────────────────────────────────────

export function resolveGameIcon(slug: string = ''): string {
  const cleanSlug = slug.toLowerCase().trim();
  if (GAME_ICON_MAP[cleanSlug]) return GAME_ICON_MAP[cleanSlug];
  for (const [key, icon] of Object.entries(GAME_ICON_MAP)) {
    if (cleanSlug.includes(key)) return icon;
  }
  return '⚡';
}

export function formatINR(amount: number | string = 0): string {
  const numeric = typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0;
  return `₹${numeric.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function resolveRoleMeta(roleCode: string, customRoles: CustomRole[] = []): CustomRole {
  const found = customRoles.find((r) => r.code === roleCode || r.label === roleCode || r.id === roleCode);
  if (found) return found;

  const defaultMatch = DEFAULT_SYSTEM_ROLES.find((r) => r.code === roleCode);
  if (defaultMatch) return defaultMatch;

  return {
    id: `role-${roleCode}`,
    code: roleCode,
    label: roleCode.replace(/_/g, ' '),
    icon: '👤',
    color: '#06b6d4',
    baseRank: 'AGENT',
    description: 'Hierarchy member',
    isBuiltIn: false,
    status: 'ACTIVE',
  };
}

// ─── REUSABLE DATATABLE PAGINATION COMPONENT ────────────────────────────────

export function DataTablePagination({
  currentPage,
  totalPages,
  totalEntries,
  limit,
  onPageChange,
  onLimitChange,
}: {
  currentPage: number;
  totalPages: number;
  totalEntries: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}) {
  const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endEntry = Math.min(currentPage * limit, totalEntries);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t-2 border-[#38BDF8]/30 mt-4">
      {/* Left: Entries Counter & Rows Per Page Selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-200">
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <span className="text-cyan-300 font-bold">Show</span>
            <select
              value={limit}
              onChange={(e) => {
                onLimitChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-[#0A163B] text-white border-2 border-[#38BDF8]/60 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-cyan-300 transition-all cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-cyan-300 font-bold">entries</span>
          </div>
        )}
        <span className="text-slate-200 font-mono">
          Showing <strong className="text-white font-black">{startEntry}</strong> to <strong className="text-white font-black">{endEntry}</strong> of{' '}
          <strong className="text-cyan-300 font-black">{totalEntries}</strong> entries
        </span>
      </div>

      {/* Right: Page Navigation Buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            className="px-2.5 py-1.5 rounded-xl bg-[#0A163B] hover:bg-[#1E3A8A] disabled:opacity-30 text-cyan-300 text-xs font-black border border-[#38BDF8]/40 transition-all cursor-pointer shadow-sm"
            title="First Page"
          >
            « First
          </button>
          <button
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="px-3 py-1.5 rounded-xl bg-[#0A163B] hover:bg-[#1E3A8A] disabled:opacity-30 text-white text-xs font-black border border-[#38BDF8]/40 transition-all cursor-pointer shadow-sm"
          >
            ‹ Prev
          </button>

          {getPageNumbers().map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                p === currentPage
                  ? 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white border-2 border-[#38BDF8] shadow-[0_0_15px_rgba(56,189,248,0.5)] scale-105'
                  : 'bg-[#0A163B] hover:bg-[#1E3A8A] text-slate-200 border border-[#38BDF8]/30'
              }`}
            >
              {p}
            </button>
          ))}

          <button
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="px-3 py-1.5 rounded-xl bg-[#0A163B] hover:bg-[#1E3A8A] disabled:opacity-30 text-white text-xs font-black border border-[#38BDF8]/40 transition-all cursor-pointer shadow-sm"
          >
            Next ›
          </button>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            className="px-2.5 py-1.5 rounded-xl bg-[#0A163B] hover:bg-[#1E3A8A] disabled:opacity-30 text-cyan-300 text-xs font-black border border-[#38BDF8]/40 transition-all cursor-pointer shadow-sm"
            title="Last Page"
          >
            Last »
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function TenantDashboardPage() {
  const router = useRouter();
  const [member, setMember] = useState<TenantMember | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [creditLogs, setCreditLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [publicGames, setPublicGames] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Tab routing sync helper
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tabId === 'overview') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tabId);
      }
      window.history.pushState({}, '', url.toString());
    }
  }, []);

  // Dynamic Roles Management State
  const [roles, setRoles] = useState<CustomRole[]>(DEFAULT_SYSTEM_ROLES);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleForm, setRoleForm] = useState({
    label: '',
    code: '',
    icon: '⚡',
    color: '#10b981',
    baseRank: 'SUPER_AGENT' as 'SUPER_ADMIN' | 'SUB_ADMIN' | 'SUPER_AGENT' | 'AGENT',
    description: '',
  });

  // Member Modals & Forms State
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [showTransferCredit, setShowTransferCredit] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'SUPER_AGENT', phone: '' });
  const [creditForm, setCreditForm] = useState({ receiverId: '', amount: '', description: '', action: 'ADD' as 'ADD' | 'DEDUCT' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Share Credentials Modal State
  const [showShareCredsModal, setShowShareCredsModal] = useState(false);
  const [shareCredsData, setShareCredsData] = useState<{
    id?: string;
    name: string;
    email: string;
    password?: string;
    role: string;
    loginUrl: string;
    siteName: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  // Player Playing History State (Server-Side Datatable)
  const [playerHistory, setPlayerHistory] = useState<any[]>([]);
  const [historySummary, setHistorySummary] = useState({ totalBets: 0, totalBetAmount: 0, totalWinAmount: 0, netGGR: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(15);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalBets, setHistoryTotalBets] = useState(0);
  const [historyFilterUser, setHistoryFilterUser] = useState('ALL');
  const [historyFilterGame, setHistoryFilterGame] = useState('ALL');
  const [historyFilterStatus, setHistoryFilterStatus] = useState('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyModalPlayer, setHistoryModalPlayer] = useState<any | null>(null);

  // DataTable Pagination & Search States
  // 1. Members
  const [membersPage, setMembersPage] = useState(1);
  const [membersLimit, setMembersLimit] = useState(10);

  // 2. Roles
  const [rolesPage, setRolesPage] = useState(1);
  const [rolesLimit, setRolesLimit] = useState(10);

  // 3. Players
  const [playersSearchQuery, setPlayersSearchQuery] = useState('');
  const [playersPage, setPlayersPage] = useState(1);
  const [playersLimit, setPlayersLimit] = useState(10);

  // 4. Credit Logs
  const [creditLogsSearchQuery, setCreditLogsSearchQuery] = useState('');
  const [creditLogsPage, setCreditLogsPage] = useState(1);
  const [creditLogsLimit, setCreditLogsLimit] = useState(10);

  // 5. Audit Logs
  const [auditLogsSearchQuery, setAuditLogsSearchQuery] = useState('');
  const [auditLogsPage, setAuditLogsPage] = useState(1);
  const [auditLogsLimit, setAuditLogsLimit] = useState(10);

  const handleCopyText = (text: string, fieldName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const handleOpenShareModal = (data: { id?: string; name: string; email: string; password?: string; role: string }) => {
    const loginUrl = typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}${data.role === 'PLAYER' ? '/login' : '/tenant/login'}`
      : '/tenant/login';
    setShareCredsData({
      id: data.id,
      name: data.name,
      email: data.email,
      password: data.password || '••••••••',
      role: data.role,
      loginUrl,
      siteName: member?.tenant?.name || 'Gaming Platform',
    });
    setNewPasswordInput('');
    setResetMsg('');
    setShowPassword(true);
    setCopiedField(null);
    setShowShareCredsModal(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.length < 4 || !shareCredsData?.id) return;
    setResetLoading(true);
    setResetMsg('');
    try {
      const res = await fetch(`${getApiBaseUrl()}/tenant/members/${shareCredsData.id}/reset-password`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ password: newPasswordInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update password');
      setShareCredsData((prev) => (prev ? { ...prev, password: newPasswordInput } : null));
      setShowPassword(true);
      setNewPasswordInput('');
      setResetMsg('✅ Password updated successfully!');
    } catch (err: any) {
      setResetMsg(`❌ ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('tenant_token') : null);
  const authHeader = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

  // Load persisted custom roles from LocalStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('tenant_custom_roles');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRoles(parsed);
          }
        }
      }
    } catch { }
  }, []);

  const saveRolesToStorage = (updatedRoles: CustomRole[]) => {
    setRoles(updatedRoles);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('tenant_custom_roles', JSON.stringify(updatedRoles));
      }
    } catch { }
  };

  const fetchMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/tenant/login');
      return;
    }
    try {
      const res = await fetch(`${getApiBaseUrl()}/tenant/auth/me`, { headers: authHeader() });
      if (!res.ok) {
        router.push('/tenant/login');
        return;
      }
      const data = await res.json();
      setMember(data);
    } catch {
      router.push('/tenant/login');
    }
  }, [router]);

  const fetchStats = useCallback(async (tenantId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/platform/tenants/${tenantId}/stats`, { headers: authHeader() });
      if (res.ok) setStats(await res.json());
    } catch { }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/tenant/members`, { headers: authHeader() });
      if (res.ok) setMembers(await res.json());
    } catch { }
  }, []);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/tenant/members/players`, { headers: authHeader() });
      if (res.ok) {
        const d = await res.json();
        setPlayers(d.players ?? []);
      }
    } catch { }
  }, []);

  const fetchCreditLogs = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/tenant/members/credit-logs`, { headers: authHeader() });
      if (res.ok) {
        const d = await res.json();
        setCreditLogs(d.logs ?? []);
      }
    } catch { }
  }, []);

  const fetchAuditLogs = useCallback(async (tenantId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/platform/tenants/${tenantId}/audit-logs`, { headers: authHeader() });
      if (res.ok) {
        const d = await res.json();
        setAuditLogs(d.logs ?? []);
      }
    } catch { }
  }, []);

  const fetchPlayerHistory = useCallback(async (
    targetUserId?: string,
    gameType?: string,
    status?: string,
    page = 1,
    limit = 15
  ) => {
    try {
      setHistoryLoading(true);
      const params = new URLSearchParams();
      if (targetUserId && targetUserId !== 'ALL') params.set('userId', targetUserId);
      if (gameType && gameType !== 'ALL') params.set('gameType', gameType);
      if (status && status !== 'ALL') params.set('status', status);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`${getApiBaseUrl()}/tenant/members/player-history?${params.toString()}`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setPlayerHistory(data.bets ?? []);
        setHistoryTotalPages(data.totalPages ?? 1);
        setHistoryPage(data.page ?? 1);
        setHistoryTotalBets(data.total ?? data.summary?.totalBets ?? 0);
        if (data.summary) setHistorySummary(data.summary);
      }
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Dynamically fetch public games from API
  const fetchPublicGames = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/public-games`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPublicGames(data);
        }
      }
    } catch { }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMe().finally(() => setLoading(false));
    fetchPublicGames();
  }, [fetchMe, fetchPublicGames]);

  useEffect(() => {
    if (!member) return;
    fetchMembers();
    fetchPlayers();
    fetchCreditLogs();
    fetchStats(member.tenantId);
    if (member.role === 'SUPER_ADMIN') fetchAuditLogs(member.tenantId);
    fetchPlayerHistory(historyFilterUser, historyFilterGame, historyFilterStatus, historyPage, historyLimit);
  }, [member, fetchMembers, fetchPlayers, fetchCreditLogs, fetchStats, fetchAuditLogs, fetchPlayerHistory, historyFilterUser, historyFilterGame, historyFilterStatus, historyPage, historyLimit]);

  // Parse initial tab from URL query params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabFromUrl = params.get('tab');
      const VALID_TABS = ['overview', 'members', 'roles', 'games', 'players', 'history', 'credits', 'audit'];
      if (tabFromUrl && VALID_TABS.includes(tabFromUrl)) {
        setActiveTab(tabFromUrl);
      }
    }
  }, []);

  // Sync tab state on browser Back/Forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab') || 'overview';
        const VALID_TABS = ['overview', 'members', 'roles', 'games', 'players', 'history', 'credits', 'audit'];
        if (VALID_TABS.includes(tab)) {
          setActiveTab(tab);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Securely guard active tab based on member role permissions
  useEffect(() => {
    if (!member) return;
    const currentRole = member.role;
    let isAllowed = true;
    if (activeTab === 'roles' || activeTab === 'audit') {
      if (currentRole !== 'SUPER_ADMIN') isAllowed = false;
    } else if (activeTab === 'members') {
      if (currentRole === 'AGENT') isAllowed = false;
    }

    if (!isAllowed) {
      handleTabChange('overview');
    }
  }, [member, activeTab, handleTabChange]);

  // Handle Dynamic Role Save / Edit
  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.label.trim()) return;

    if (editingRole) {
      const updated = roles.map((r) =>
        r.id === editingRole.id
          ? {
            ...r,
            label: roleForm.label,
            icon: roleForm.icon,
            color: roleForm.color,
            baseRank: roleForm.baseRank,
            description: roleForm.description,
          }
          : r
      );
      saveRolesToStorage(updated);
      setFormSuccess(`✅ Role "${roleForm.label}" updated!`);
    } else {
      const newRoleCode = roleForm.code.trim()
        ? roleForm.code.toUpperCase().replace(/\s+/g, '_')
        : roleForm.baseRank;

      const newRole: CustomRole = {
        id: `role-${Date.now()}`,
        code: newRoleCode,
        label: roleForm.label.trim(),
        icon: roleForm.icon || '⚡',
        color: roleForm.color || '#10b981',
        baseRank: roleForm.baseRank,
        description: roleForm.description || 'Custom dynamic hierarchy role',
        isBuiltIn: false,
        status: 'ACTIVE',
      };

      const updated = [...roles, newRole];
      saveRolesToStorage(updated);
      setFormSuccess(`✅ Dynamic Role "${newRole.label}" added successfully!`);
    }

    setShowRoleModal(false);
    setEditingRole(null);
    setRoleForm({ label: '', code: '', icon: '⚡', color: '#10b981', baseRank: 'SUPER_AGENT', description: '' });
  };

  const handleToggleRoleStatus = (roleId: string) => {
    const updated = roles.map((r) =>
      r.id === roleId ? { ...r, status: r.status === 'ACTIVE' ? ('INACTIVE' as const) : ('ACTIVE' as const) } : r
    );
    saveRolesToStorage(updated);
  };

  const handleDeleteRole = (roleId: string) => {
    const target = roles.find((r) => r.id === roleId);
    if (target?.isBuiltIn) {
      alert('Built-in system roles cannot be deleted.');
      return;
    }
    if (confirm(`Are you sure you want to delete role "${target?.label}"?`)) {
      const updated = roles.filter((r) => r.id !== roleId);
      saveRolesToStorage(updated);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    const selectedRole =
      activeRolesForCreation.find((r) => r.code === createForm.role || r.id === createForm.role) ||
      roles.find((r) => r.code === createForm.role || r.id === createForm.role);

    const targetApiRole = createForm.role === 'PLAYER' ? 'PLAYER' : (selectedRole?.baseRank || createForm.role);

    try {
      const res = await fetch(`${getApiBaseUrl()}/tenant/members`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          phone: createForm.phone,
          role: targetApiRole,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to create member');
      const loginUrl = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.host}${targetApiRole === 'PLAYER' ? '/login' : '/tenant/login'}`
        : '/tenant/login';

      setShareCredsData({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: targetApiRole,
        loginUrl,
        siteName: member?.tenant?.name || 'Gaming Platform',
      });
      setShowPassword(true);
      setShowCreateMember(false);
      setShowShareCredsModal(true);

      const nextDefaultRole = activeRolesForCreation[0]?.code || 'PLAYER';
      setCreateForm({ name: '', email: '', password: '', role: nextDefaultRole, phone: '' });
      fetchMembers();
      fetchPlayers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleTransferCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');
    try {
      const res = await fetch(`${getApiBaseUrl()}/tenant/members/transfer-credits`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({
          receiverId: creditForm.receiverId,
          amount: Number(creditForm.amount),
          description: creditForm.description,
          action: creditForm.action,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Credit operation failed');
      setFormSuccess(`✅ ${d.message || 'Transaction completed successfully!'}`);
      setCreditForm({ receiverId: '', amount: '', description: '', action: 'ADD' });
      fetchMe();
      fetchCreditLogs();
      fetchMembers();
      fetchPlayers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (targetId: string) => {
    try {
      await fetch(`${getApiBaseUrl()}/tenant/members/${targetId}/toggle-status`, {
        method: 'POST',
        headers: authHeader(),
      });
      fetchMembers();
    } catch { }
  };

  const handleDeleteMember = async (targetId: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return;
    try {
      await fetch(`${getApiBaseUrl()}/tenant/members/${targetId}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      fetchMembers();
    } catch { }
  };

  const handleLogout = () => {
    localStorage.removeItem('tenant_token');
    localStorage.removeItem('tenant_member');
    router.push('/tenant/login');
  };

  // Helper to resolve role metadata dynamically using state roles
  const getRoleMeta = useCallback(
    (roleCode: string) => resolveRoleMeta(roleCode, roles),
    [roles]
  );

  const myRoleMeta = useMemo(() => {
    return member ? getRoleMeta(member.role) : DEFAULT_SYSTEM_ROLES[0];
  }, [member, getRoleMeta]);

  const primaryColor = member?.tenant?.primaryColor ?? '#6366f1';

  // Role-filtered navigation items
  const visibleNavItems = useMemo(() => {
    if (!member) return [];
    return NAV_ITEMS.filter((item) => {
      if (item.id === 'roles' || item.id === 'audit') {
        return member.role === 'SUPER_ADMIN';
      }
      if (item.id === 'members') {
        return member.role === 'SUPER_ADMIN' || member.role === 'SUPER_AGENT' || member.role === 'SUB_ADMIN';
      }
      return true;
    });
  }, [member]);

  // Hierarchy-conscious Active Roles for selection dropdown
  const activeRolesForCreation = useMemo(() => {
    if (!member) return [];
    const ROLE_HIERARCHY = ['SUPER_ADMIN', 'SUPER_AGENT', 'SUB_ADMIN', 'AGENT', 'PLAYER'];
    const actorIdx = ROLE_HIERARCHY.indexOf(member.role);
    if (actorIdx === -1) return [];

    const result: CustomRole[] = [];

    // Allow creating player account if member can create players
    if (['SUPER_ADMIN', 'SUPER_AGENT', 'SUB_ADMIN', 'AGENT'].includes(member.role)) {
      result.push({
        id: 'role-player',
        code: 'PLAYER',
        label: 'End Player Account',
        icon: '🎮',
        color: '#ec4899',
        baseRank: 'PLAYER' as any,
        description: 'End player who plays games on the tenant platform',
        isBuiltIn: true,
        status: 'ACTIVE',
      });
    }

    roles.forEach((r) => {
      if (r.status !== 'ACTIVE') return;
      const rIdx = ROLE_HIERARCHY.indexOf(r.baseRank);
      if (rIdx > actorIdx && r.code !== 'SUPER_ADMIN') {
        result.push(r);
      }
    });

    return result;
  }, [member, roles]);

  const openCreateMemberModal = useCallback(() => {
    const initialRole = activeRolesForCreation[0]?.code || 'PLAYER';
    setCreateForm({ name: '', email: '', password: '', role: initialRole, phone: '' });
    setFormError('');
    setFormSuccess('');
    setShowCreateMember(true);
  }, [activeRolesForCreation]);

  // Synchronize createForm.role with allowed roles when modal opens or active roles change
  useEffect(() => {
    if (showCreateMember && activeRolesForCreation.length > 0) {
      const isCurrentValid = activeRolesForCreation.some((r) => r.code === createForm.role);
      if (!isCurrentValid) {
        setCreateForm((prev) => ({ ...prev, role: activeRolesForCreation[0].code }));
      }
    }
  }, [showCreateMember, activeRolesForCreation, createForm.role]);

  // ── DATATABLE PAGINATION & SEARCH MEMOS ──
  // 1. Members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.role?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, roleFilter]);

  const paginatedMembers = useMemo(() => {
    const start = (membersPage - 1) * membersLimit;
    return filteredMembers.slice(start, start + membersLimit);
  }, [filteredMembers, membersPage, membersLimit]);

  const membersTotalPages = useMemo(() => Math.ceil(filteredMembers.length / membersLimit) || 1, [filteredMembers.length, membersLimit]);

  useEffect(() => { setMembersPage(1); }, [searchQuery, roleFilter, membersLimit]);

  // 2. Roles
  const paginatedRoles = useMemo(() => {
    const start = (rolesPage - 1) * rolesLimit;
    return roles.slice(start, start + rolesLimit);
  }, [roles, rolesPage, rolesLimit]);

  const rolesTotalPages = useMemo(() => Math.ceil(roles.length / rolesLimit) || 1, [roles.length, rolesLimit]);

  // 3. Players
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const name = p.user?.name || '';
      const email = p.user?.email || '';
      const agent = p.agent?.name || '';
      const q = playersSearchQuery.toLowerCase();
      return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || agent.toLowerCase().includes(q);
    });
  }, [players, playersSearchQuery]);

  const paginatedPlayers = useMemo(() => {
    const start = (playersPage - 1) * playersLimit;
    return filteredPlayers.slice(start, start + playersLimit);
  }, [filteredPlayers, playersPage, playersLimit]);

  const playersTotalPages = useMemo(() => Math.ceil(filteredPlayers.length / playersLimit) || 1, [filteredPlayers.length, playersLimit]);

  useEffect(() => { setPlayersPage(1); }, [playersSearchQuery, playersLimit]);

  // 4. Credit Logs
  const filteredCreditLogs = useMemo(() => {
    return creditLogs.filter((log) => {
      const giver = log.giver?.name || '';
      const desc = log.description || '';
      const type = log.type || '';
      const q = creditLogsSearchQuery.toLowerCase();
      return giver.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || type.toLowerCase().includes(q);
    });
  }, [creditLogs, creditLogsSearchQuery]);

  const paginatedCreditLogs = useMemo(() => {
    const start = (creditLogsPage - 1) * creditLogsLimit;
    return filteredCreditLogs.slice(start, start + creditLogsLimit);
  }, [filteredCreditLogs, creditLogsPage, creditLogsLimit]);

  const creditLogsTotalPages = useMemo(() => Math.ceil(filteredCreditLogs.length / creditLogsLimit) || 1, [filteredCreditLogs.length, creditLogsLimit]);

  useEffect(() => { setCreditLogsPage(1); }, [creditLogsSearchQuery, creditLogsLimit]);

  // 5. Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const actor = log.member?.name || '';
      const action = log.action || '';
      const entity = log.entityType || '';
      const q = auditLogsSearchQuery.toLowerCase();
      return actor.toLowerCase().includes(q) || action.toLowerCase().includes(q) || entity.toLowerCase().includes(q);
    });
  }, [auditLogs, auditLogsSearchQuery]);

  const paginatedAuditLogs = useMemo(() => {
    const start = (auditLogsPage - 1) * auditLogsLimit;
    return filteredAuditLogs.slice(start, start + auditLogsLimit);
  }, [filteredAuditLogs, auditLogsPage, auditLogsLimit]);

  const auditLogsTotalPages = useMemo(() => Math.ceil(filteredAuditLogs.length / auditLogsLimit) || 1, [filteredAuditLogs.length, auditLogsLimit]);

  useEffect(() => { setAuditLogsPage(1); }, [auditLogsSearchQuery, auditLogsLimit]);

  // 6. Player History Search Filter
  const filteredPlayerHistory = useMemo(() => {
    if (!historySearchQuery.trim()) return playerHistory;
    const q = historySearchQuery.toLowerCase();
    return playerHistory.filter((bet: any) => {
      return (
        bet.playerName?.toLowerCase().includes(q) ||
        bet.playerEmail?.toLowerCase().includes(q) ||
        bet.gameType?.toLowerCase().includes(q) ||
        bet.details?.toLowerCase().includes(q) ||
        bet.status?.toLowerCase().includes(q)
      );
    });
  }, [playerHistory, historySearchQuery]);

  // Dynamic Allowed Games List
  const allowedGamesList: string[] = useMemo(() => {
    return Array.isArray(member?.tenant?.allowedGames) ? member!.tenant.allowedGames : [];
  }, [member]);

  // Build display games array dynamically from public API data or allowed games list
  const displayGamesList: DisplayGame[] = useMemo(() => {
    if (publicGames.length > 0) {
      return publicGames.map((g) => ({
        id: g.slug || g.id,
        name: g.name,
        icon: resolveGameIcon(g.slug || g.id),
        badge: g.badge || (g.minBet ? `Min ₹${g.minBet}` : 'Instant'),
        isEnabled: allowedGamesList.includes(g.slug || g.id) || g.isActive !== false,
      }));
    }
    return allowedGamesList.map((slug: string) => ({
      id: slug,
      name: slug.replace(/-/g, ' ').toUpperCase(),
      icon: resolveGameIcon(slug),
      badge: 'Active Game',
      isEnabled: true,
    }));
  }, [publicGames, allowedGamesList]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center font-sans relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="flex flex-col items-center gap-4 bg-gradient-to-b from-[#132A6B] to-[#0A163B] border-2 border-[#38BDF8] p-8 rounded-3xl shadow-[0_0_50px_rgba(56,189,248,0.4)] animate-pulse relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.6)]">
            <Building2 className="w-7 h-7 text-white animate-spin" />
          </div>
          <span className="text-base font-black text-cyan-200 tracking-wide">Loading Tenant Console...</span>
        </div>
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans flex flex-col lg:flex-row relative selection:bg-cyan-500 selection:text-black overflow-x-hidden">
      {/* 🌌 High-Intensity Neon Background Glow Orbs */}
      <div className="fixed top-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.25)_0%,rgba(3,7,18,0)_70%)] pointer-events-none blur-3xl z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.25)_0%,rgba(3,7,18,0)_70%)] pointer-events-none blur-3xl z-0" />
      <div className="fixed top-[40%] right-[20%] w-[35vw] h-[35vw] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.18)_0%,rgba(3,7,18,0)_70%)] pointer-events-none blur-3xl z-0" />

      {/* ── MOBILE NAVBAR ── */}
      <div className="lg:hidden bg-[#0A163B]/95 backdrop-blur-2xl border-b-2 border-[#38BDF8]/40 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white shadow-[0_0_15px_rgba(56,189,248,0.5)] border border-white/30"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)` }}
          >
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              {member.tenant?.name || 'Tenant Operator'}
            </div>
            <div className="text-[10px] text-cyan-300 font-mono font-bold">{member.tenant?.slug}</div>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-white/10 border border-cyan-400/30 text-cyan-200 hover:text-white"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ── SIDEBAR NAVIGATION ── */}
      <aside
        className={`fixed lg:sticky top-0 left-0 bottom-0 z-50 w-64 bg-[#0A163B]/95 backdrop-blur-2xl border-r-2 border-[#38BDF8]/40 flex flex-col justify-between p-4 transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } h-screen overflow-y-auto custom-scrollbar shrink-0 shadow-[10px_0_40px_rgba(56,189,248,0.18)]`}
      >
        <div className="space-y-6">
          {/* Tenant Brand Header */}
          <div className="flex items-center gap-3 pb-4 border-b-2 border-[#38BDF8]/30 pt-2">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black shadow-[0_0_20px_rgba(56,189,248,0.5)] shrink-0 border-2 border-white/40"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)` }}
            >
              <Building2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black tracking-tight text-white truncate drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                {member.tenant?.name || 'Tenant Operator'}
              </h2>
              <span className="text-[11px] font-mono font-bold text-cyan-300 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)] inline-block mt-0.5">
                {member.tenant?.slug}
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-cyan-300/80 px-3 pb-1.5">
              Hierarchy Console
            </div>
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] text-white border-2 border-[#38BDF8] shadow-[0_0_25px_rgba(56,189,248,0.5)] scale-[1.02]'
                      : 'text-slate-200 hover:text-white hover:bg-white/10 hover:border-[#38BDF8]/40 border border-transparent font-bold'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-cyan-300'}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 text-white" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Member Profile & Logout */}
        <div className="pt-4 border-t-2 border-[#38BDF8]/30 space-y-3">
          <div className="p-3 rounded-2xl bg-[#132A6B] border-2 border-[#38BDF8]/40 flex items-center gap-3 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center font-black text-lg text-black shadow-[0_0_12px_rgba(251,191,36,0.5)] shrink-0">
              {myRoleMeta.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-white truncate drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">{member.name}</div>
              <div className="text-[10px] font-extrabold text-amber-300 truncate">{myRoleMeta.label}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/35 border-2 border-rose-400 text-rose-200 hover:text-white text-xs font-black flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-300" />
            <span>Sign Out Portal</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 relative z-10">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#132A6B] via-[#0D1D4A] to-[#1E144D] backdrop-blur-2xl border-2 border-[#38BDF8]/50 p-4 sm:p-5 rounded-3xl shadow-[0_0_35px_rgba(56,189,248,0.25)]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]">
                {visibleNavItems.find((n) => n.id === activeTab)?.label || 'Console'}
              </h1>
              <span className="px-3.5 py-1 rounded-full bg-[#00D9FF]/20 border-2 border-[#00D9FF] text-[11px] font-black text-[#00D9FF] shadow-[0_0_15px_rgba(0,217,255,0.4)]">
                {member.tenant?.name}
              </span>
            </div>
            <p className="text-xs text-slate-200 font-bold mt-1">
              Logged in as <span className="text-[#FFB800] font-black drop-shadow-[0_0_8px_rgba(255,184,0,0.5)]">{member.name}</span> ({myRoleMeta.label})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Credit Balance Badge */}
            <div className="bg-gradient-to-r from-[#06382B] to-[#0A523F] border-2 border-[#00E5A0] px-4 py-2 rounded-2xl flex items-center gap-3 shadow-[0_0_25px_rgba(0,229,160,0.4)]">
              <div className="w-8 h-8 rounded-xl bg-[#00E5A0]/30 border border-[#00E5A0] flex items-center justify-center shadow-[0_0_10px_rgba(0,229,160,0.5)]">
                <Wallet className="w-4 h-4 text-[#00E5A0]" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-[#A7F3D0] block">
                  Credit Balance
                </span>
                <span className="text-base font-black font-mono text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]">
                  {formatINR(member.creditBalance || 0)}
                </span>
              </div>
            </div>

            {/* Quick Action CTAs */}
            <button
              onClick={openCreateMemberModal}
              className="bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:brightness-125 active:scale-95 text-white text-xs font-black px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-[0_0_25px_rgba(37,99,235,0.5)] border-2 border-[#38BDF8] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Account</span>
            </button>

            <button
              onClick={() => {
                setShowTransferCredit(true);
                setFormError('');
                setFormSuccess('');
              }}
              className="bg-gradient-to-r from-[#00E5A0] via-[#10B981] to-[#059669] hover:brightness-125 active:scale-95 text-[#030712] font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-[0_0_25px_rgba(0,229,160,0.5)] border-2 border-white transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4 stroke-[3]" />
              <span>Transfer Credits</span>
            </button>
          </div>
        </div>

        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards Grid with High Glow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {/* Hierarchy Members */}
              <div className="bg-gradient-to-br from-[#1E3A8A] via-[#11245A] to-[#0B1536] border-2 border-[#3B82F6] shadow-[0_0_30px_rgba(59,130,246,0.35)] hover:shadow-[0_0_45px_rgba(59,130,246,0.6)] hover:border-[#60A5FA] rounded-3xl p-5 sm:p-6 transition-all space-y-2 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#93C5FD]">
                    Hierarchy Members
                  </span>
                  <div className="w-11 h-11 rounded-2xl bg-[#3B82F6]/30 border-2 border-[#60A5FA] text-[#60A5FA] flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                    <Users className="w-6 h-6 stroke-[2.5]" />
                  </div>
                </div>
                <div className="text-4xl font-black text-white font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]">{members.length}</div>
                <p className="text-xs font-extrabold text-[#BFDBFE] flex items-center gap-1.5 pt-1">
                  <Activity className="w-4 h-4 text-[#60A5FA]" /> Super Masters, Sub Masters & Agents
                </p>
              </div>

              {/* Configured Roles */}
              <div className="bg-gradient-to-br from-[#065F46] via-[#06382B] to-[#0B1536] border-2 border-[#10B981] shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:shadow-[0_0_45px_rgba(16,185,129,0.6)] hover:border-[#34D399] rounded-3xl p-5 sm:p-6 transition-all space-y-2 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#A7F3D0]">
                    Configured Roles
                  </span>
                  <div className="w-11 h-11 rounded-2xl bg-[#10B981]/30 border-2 border-[#34D399] text-[#34D399] flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                    <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
                  </div>
                </div>
                <div className="text-4xl font-black text-white font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]">{roles.length} Roles</div>
                <p className="text-xs font-extrabold text-[#6EE7B7] flex items-center gap-1.5 pt-1">
                  <Check className="w-4 h-4 text-[#34D399]" /> Super Master, Sub Master, Master & Custom
                </p>
              </div>

              {/* Your Credit Balance */}
              <div className="bg-gradient-to-br from-[#854D0E] via-[#451A03] to-[#0B1536] border-2 border-[#F59E0B] shadow-[0_0_30px_rgba(245,158,11,0.35)] hover:shadow-[0_0_45px_rgba(245,158,11,0.6)] hover:border-[#FBBF24] rounded-3xl p-5 sm:p-6 transition-all space-y-2 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#FDE68A]">
                    Your Credit Balance
                  </span>
                  <div className="w-11 h-11 rounded-2xl bg-[#F59E0B]/30 border-2 border-[#FBBF24] text-[#FBBF24] flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                    <Wallet className="w-6 h-6 stroke-[2.5]" />
                  </div>
                </div>
                <div className="text-4xl font-black text-[#FBBF24] font-mono drop-shadow-[0_0_18px_rgba(251,191,36,0.8)]">
                  {formatINR(member.creditBalance || 0)}
                </div>
                <p className="text-xs font-extrabold text-[#FCD34D] flex items-center gap-1.5 pt-1">
                  <Zap className="w-4 h-4 text-[#FBBF24]" /> Ready for allocation
                </p>
              </div>

              {/* Total Players */}
              <div className="bg-gradient-to-br from-[#164E63] via-[#083344] to-[#0B1536] border-2 border-[#06B6D4] shadow-[0_0_30px_rgba(6,182,212,0.35)] hover:shadow-[0_0_45px_rgba(6,182,212,0.6)] hover:border-[#22D3EE] rounded-3xl p-5 sm:p-6 transition-all space-y-2 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#A5F3FC]">
                    Total Players
                  </span>
                  <div className="w-11 h-11 rounded-2xl bg-[#06B6D4]/30 border-2 border-[#22D3EE] text-[#22D3EE] flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                    <UserCheck className="w-6 h-6 stroke-[2.5]" />
                  </div>
                </div>
                <div className="text-4xl font-black text-white font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]">{players.length}</div>
                <p className="text-xs font-extrabold text-[#67E8F9] flex items-center gap-1.5 pt-1">
                  <UserCheck className="w-4 h-4 text-[#22D3EE]" /> Active on tenant site
                </p>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-gradient-to-b from-[#132A6B] via-[#0D1D4A] to-[#08112C] border-2 border-[#38BDF8]/40 rounded-3xl p-6 shadow-[0_0_40px_rgba(56,189,248,0.22)] space-y-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                <Sparkles className="w-5 h-5 text-[#00D9FF]" />
                <span>Quick Role Breakdown</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {roles.map((r) => {
                  const count = members.filter((m) => m.role === r.code || m.role === r.baseRank).length;
                  return (
                    <div
                      key={r.id}
                      className="bg-gradient-to-br from-[#1B367D] via-[#102456] to-[#0A163B] border-2 border-[#38BDF8]/50 hover:border-cyan-300 rounded-2xl p-5 space-y-3 transition-all shadow-[0_0_20px_rgba(56,189,248,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.45)] hover:-translate-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-3xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{r.icon}</span>
                        <span className="text-xs font-mono font-black text-[#00D9FF] px-3 py-1 rounded-full bg-[#287BFF]/30 border-2 border-[#00D9FF] shadow-[0_0_12px_rgba(0,217,255,0.4)]">
                          {r.code}
                        </span>
                      </div>
                      <div className="font-black text-base text-white tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{r.label}</div>
                      <div className="text-xs font-black text-[#80C6FF] flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-cyan-300" />
                        <span>{count} Active Members</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: HIERARCHY MEMBERS ── */}
        {activeTab === 'members' && (
          <div className="bg-gradient-to-b from-[#132A6B] via-[#0D1D4A] to-[#08112C] border-2 border-[#38BDF8]/40 rounded-[28px] p-5 sm:p-7 shadow-[0_0_45px_rgba(56,189,248,0.22)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#38BDF8]/30 pb-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                  <Users className="w-6 h-6 text-[#00D9FF]" />
                  <span>Hierarchy Members ({filteredMembers.length})</span>
                </h3>
                <p className="text-xs text-slate-200 font-bold mt-1">Manage Super Masters, Sub Masters, and Master Agents</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Role Filter Selector */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-[#0A163B] text-white border-2 border-[#38BDF8]/60 rounded-2xl px-4 py-2 text-xs font-bold outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
                >
                  <option value="ALL" className="bg-[#0D152D] text-white">
                    Filter: All Roles
                  </option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.code} className="bg-[#0D152D] text-white">
                      {r.icon} {r.label}
                    </option>
                  ))}
                </select>

                <div className="relative flex-1 sm:w-56">
                  <Search className="w-4 h-4 text-cyan-300 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search member..."
                    className="w-full bg-[#0A163B] border-2 border-[#38BDF8]/60 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 font-bold focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                  />
                </div>

                <button
                  onClick={openCreateMemberModal}
                  className="bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:brightness-125 active:scale-95 text-white text-xs font-black px-4 py-2 rounded-2xl flex items-center gap-1.5 shadow-[0_0_20px_rgba(37,99,235,0.5)] border-2 border-[#38BDF8] shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Create Member</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border-2 border-[#38BDF8]/40 bg-[#0A163B] shadow-2xl">
              <table className="w-full text-left text-xs font-medium border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#1E3A8A] via-[#1B367D] to-[#1E3A8A] text-cyan-200 border-b-2 border-[#38BDF8]/50 uppercase tracking-wider text-[11px] font-black">
                    <th className="p-4">Member Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Hierarchy Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Credit Balance</th>
                    <th className="p-4">Players</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#38BDF8]/20">
                  {paginatedMembers.map((m) => {
                    const rMeta = getRoleMeta(m.role);
                    return (
                      <tr key={m.id} className="hover:bg-[#1E3A8A]/50 transition-all">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white font-black text-base shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-white/30">
                              {rMeta.icon}
                            </div>
                            <span className="font-black text-white text-sm drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">{m.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-cyan-300 font-mono font-bold text-xs">{m.email}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 text-[11px] font-black bg-[#287BFF]/30 text-[#00D9FF] border-[#00D9FF] shadow-[0_0_12px_rgba(0,217,255,0.3)]">
                            <span>{rMeta.icon}</span>
                            <span>{rMeta.label}</span>
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black border-2 ${
                              m.status === 'ACTIVE'
                                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                : 'bg-rose-500/25 border-rose-400 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-black text-emerald-400 text-base drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                          {formatINR(m.creditBalance || 0)}
                        </td>
                        <td className="p-4 font-black text-white text-sm">{m._count?.players ?? 0}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setCreditForm({ receiverId: m.id, amount: '', description: '', action: 'ADD' });
                                setShowTransferCredit(true);
                                setFormError('');
                                setFormSuccess('');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/50 border border-emerald-400 text-emerald-200 text-xs font-black flex items-center gap-1 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer"
                              title="Transfer/Add credit to staff member"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-300 stroke-[3]" />
                              <span>Add</span>
                            </button>
                            <button
                              onClick={() => {
                                setCreditForm({ receiverId: m.id, amount: '', description: '', action: 'DEDUCT' });
                                setShowTransferCredit(true);
                                setFormError('');
                                setFormSuccess('');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/30 hover:bg-rose-500/50 border border-rose-400 text-rose-200 text-xs font-black flex items-center gap-1 transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)] cursor-pointer"
                              title="Deduct/Reclaim credit from staff member"
                            >
                              <Minus className="w-3.5 h-3.5 text-rose-300 stroke-[3]" />
                              <span>Deduct</span>
                            </button>
                            <button
                              onClick={() => handleOpenShareModal({ id: m.id, name: m.name, email: m.email, role: m.role })}
                              className="px-3 py-1.5 rounded-xl bg-purple-500/30 hover:bg-purple-500/50 border border-purple-400 text-purple-200 text-xs font-black flex items-center gap-1 transition-all shadow-[0_0_12px_rgba(168,85,247,0.3)] cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5 text-purple-300" />
                              <span>Creds</span>
                            </button>
                            <button
                              onClick={() => handleToggleStatus(m.id)}
                              className="px-3 py-1.5 rounded-xl bg-cyan-500/30 hover:bg-cyan-500/50 border border-cyan-400 text-cyan-200 text-xs font-black transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
                            >
                              {m.status === 'ACTIVE' ? '⏸' : '▶'}
                            </button>
                            {m.role !== 'SUPER_ADMIN' && (
                              <button
                                onClick={() => handleDeleteMember(m.id)}
                                className="p-2 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 border border-rose-400 text-rose-300 hover:text-white transition-all shadow-sm cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredMembers.length === 0 && (
                <div className="p-8 text-center text-cyan-200 font-bold text-xs">No hierarchy members found</div>
              )}
            </div>

            <DataTablePagination
              currentPage={membersPage}
              totalPages={membersTotalPages}
              totalEntries={filteredMembers.length}
              limit={membersLimit}
              onPageChange={setMembersPage}
              onLimitChange={setMembersLimit}
            />
          </div>
        )}

        {/* ── TAB 3: DYNAMIC ROLE MANAGEMENT ── */}
        {activeTab === 'roles' && (
          <div className="bg-gradient-to-b from-[#132A6B] via-[#0D1D4A] to-[#08112C] border-2 border-[#38BDF8]/40 rounded-[28px] p-6 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                  <ShieldCheck className="w-6 h-6 text-cyan-400" />
                  <span>Dynamic Role Management & Custom Hierarchy</span>
                </h3>
                <p className="text-xs text-slate-200 font-bold mt-1">
                  Configure, add, edit, or toggle custom roles for your tenant master hierarchy.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingRole(null);
                  setRoleForm({
                    label: '',
                    code: '',
                    icon: '⚡',
                    color: '#10b981',
                    baseRank: 'SUPER_AGENT',
                    description: '',
                  });
                  setShowRoleModal(true);
                }}
                className="bg-gradient-to-r from-purple-500 via-indigo-600 to-blue-600 hover:brightness-125 text-white font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-[0_0_25px_rgba(168,85,247,0.5)] border-2 border-purple-300 shrink-0 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 stroke-[3]" />
                <span>Add Custom Role</span>
              </button>
            </div>

            {/* Roles Table */}
            <div className="overflow-x-auto rounded-2xl border-2 border-[#38BDF8]/40 bg-[#0A163B]">
              <table className="w-full text-left text-xs font-medium border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#1E3A8A] via-[#1B367D] to-[#1E3A8A] text-cyan-200 border-b-2 border-[#38BDF8]/50 uppercase tracking-wider text-[11px] font-black">
                    <th className="p-4">Icon & Role Name</th>
                    <th className="p-4">Role Code</th>
                    <th className="p-4">Base Rank</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#38BDF8]/20">
                  {paginatedRoles.map((r) => (
                    <tr key={r.id} className="hover:bg-[#1E3A8A]/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">{r.icon}</span>
                          <div>
                            <div className="font-black text-white text-sm drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">{r.label}</div>
                            {r.isBuiltIn && (
                              <span className="text-[10px] font-mono text-amber-300 font-extrabold uppercase">System Default</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-cyan-300 font-black text-xs">{r.code}</td>
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400 text-[11px] font-mono text-cyan-200 font-black">
                          {r.baseRank}
                        </span>
                      </td>
                      <td className="p-4 text-slate-200 font-bold text-xs max-w-xs">{r.description}</td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black border-2 ${
                            r.status === 'ACTIVE'
                              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                              : 'bg-rose-500/25 border-rose-400 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingRole(r);
                              setRoleForm({
                                label: r.label,
                                code: r.code,
                                icon: r.icon,
                                color: r.color,
                                baseRank: r.baseRank,
                                description: r.description,
                              });
                              setShowRoleModal(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/30 hover:bg-cyan-500/50 border border-cyan-400 text-cyan-200 text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-cyan-300" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleToggleRoleStatus(r.id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-700/50 hover:bg-slate-700/80 border border-slate-400 text-slate-200 text-xs font-black transition-all cursor-pointer"
                          >
                            {r.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                          </button>

                          {!r.isBuiltIn && (
                            <button
                              onClick={() => handleDeleteRole(r.id)}
                              className="p-2 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 border border-rose-400 text-rose-300 hover:text-white transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DataTablePagination
              currentPage={rolesPage}
              totalPages={rolesTotalPages}
              totalEntries={roles.length}
              limit={rolesLimit}
              onPageChange={setRolesPage}
              onLimitChange={setRolesLimit}
            />
          </div>
        )}

        {/* ── TAB 4: ALLOWED GAMES (100% DYNAMIC) ── */}
        {activeTab === 'games' && (
          <div className="bg-gradient-to-b from-[#132A6B] via-[#0D1D4A] to-[#08112C] border-2 border-[#38BDF8]/40 rounded-[28px] p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                <Gamepad2 className="w-6 h-6 text-cyan-400" />
                <span>Tenant Game Access & Activation</span>
              </h3>
              <p className="text-xs text-slate-200 font-bold mt-1">
                Games configured and enabled by Platform Owner for your tenant site.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayGamesList.map((game) => (
                <div
                  key={game.id}
                  className={`rounded-3xl p-5 border-2 transition-all ${
                    game.isEnabled
                      ? 'bg-gradient-to-br from-[#064E3B] via-[#022C22] to-[#0A163B] border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] hover:-translate-y-1'
                      : 'bg-[#0A163B]/80 border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-4xl drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">{game.icon}</span>
                    <span className="px-3 py-1 rounded-full bg-black/40 border border-white/20 text-[11px] font-mono font-black text-cyan-300">
                      {game.badge}
                    </span>
                  </div>

                  <div className="font-black text-base text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">{game.name}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border-2 ${
                        game.isEnabled
                          ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                          : 'bg-rose-500/30 text-rose-200 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                      }`}
                    >
                      {game.isEnabled ? '🟢 ACTIVE FOR PLAYERS' : '🔴 DISABLED BY OWNER'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 5: PLAYERS ROSTER ── */}
        {activeTab === 'players' && (
          <div className="bg-gradient-to-b from-[#132A6B] via-[#0D1D4A] to-[#08112C] border-2 border-[#38BDF8]/40 rounded-[28px] p-6 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                  <UserCheck className="w-6 h-6 text-cyan-400" />
                  <span>Registered Players ({filteredPlayers.length})</span>
                </h3>
                <p className="text-xs text-slate-200 font-bold mt-1">Players assigned to your agent hierarchy</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-cyan-300 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={playersSearchQuery}
                    onChange={(e) => setPlayersSearchQuery(e.target.value)}
                    placeholder="Search player, email, agent..."
                    className="w-full bg-[#0A163B] border-2 border-[#38BDF8]/60 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 font-bold focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                  />
                </div>

                <button
                  onClick={openCreateMemberModal}
                  className="bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:brightness-125 text-white font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.5)] border-2 border-[#38BDF8] shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Create Player</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border-2 border-[#38BDF8]/40 bg-[#0A163B] shadow-2xl">
              <table className="w-full text-left text-xs font-medium border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#1E3A8A] via-[#1B367D] to-[#1E3A8A] text-cyan-200 border-b-2 border-[#38BDF8]/50 uppercase tracking-wider text-[11px] font-black">
                    <th className="p-4">Player Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Main Wallet</th>
                    <th className="p-4">Agent</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Joined Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#38BDF8]/20">
                  {paginatedPlayers.map((p: any) => (
                    <tr key={p.id} className="hover:bg-[#1E3A8A]/50 transition-colors">
                      <td className="p-4 font-black text-white text-sm drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">{p.user?.name || 'Player'}</td>
                      <td className="p-4 text-cyan-300 font-mono font-bold text-xs">{p.user?.email}</td>
                      <td className="p-4 font-mono font-black text-emerald-400 text-base drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                        {formatINR(p.user?.wallet?.mainBalance ?? 0)}
                      </td>
                      <td className="p-4 font-black text-cyan-300">{p.agent?.name || '—'}</td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black border-2 ${
                            p.user?.status === 'ACTIVE'
                              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                              : 'bg-rose-500/25 border-rose-400 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                          }`}
                        >
                          {p.user?.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-200 font-mono font-bold text-xs">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setCreditForm({ receiverId: p.id, amount: '', description: '', action: 'ADD' });
                              setShowTransferCredit(true);
                              setFormError('');
                              setFormSuccess('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/50 border border-emerald-400 text-emerald-200 text-xs font-black flex items-center gap-1 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer"
                            title="Deposit money into player wallet from master"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-300 stroke-[3]" />
                            <span>Add Bal</span>
                          </button>
                          <button
                            onClick={() => {
                              setCreditForm({ receiverId: p.id, amount: '', description: '', action: 'DEDUCT' });
                              setShowTransferCredit(true);
                              setFormError('');
                              setFormSuccess('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/30 hover:bg-rose-500/50 border border-rose-400 text-rose-200 text-xs font-black flex items-center gap-1 transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)] cursor-pointer"
                            title="Deduct/Withdraw money from player wallet to master"
                          >
                            <Minus className="w-3.5 h-3.5 text-rose-300 stroke-[3]" />
                            <span>Deduct Bal</span>
                          </button>
                          <button
                            onClick={() => {
                              const targetUid = p.userId || p.user?.id;
                              setHistoryFilterUser(targetUid);
                              setHistoryPage(1);
                              handleTabChange('history');
                              fetchPlayerHistory(targetUid, historyFilterGame, historyFilterStatus, 1);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/30 hover:bg-cyan-500/50 border border-cyan-400 text-cyan-200 text-xs font-black flex items-center gap-1 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
                            title="View player game betting history in full page"
                          >
                            <History className="w-4 h-4 text-cyan-300" />
                            <span>History</span>
                          </button>
                          <button
                            onClick={() =>
                              handleOpenShareModal({
                                id: p.id,
                                name: p.user?.name || 'Player',
                                email: p.user?.email || '',
                                role: 'PLAYER',
                              })
                            }
                            className="px-3 py-1.5 rounded-xl bg-purple-500/30 hover:bg-purple-500/50 border border-purple-400 text-purple-200 text-xs font-black flex items-center gap-1 transition-all shadow-[0_0_12px_rgba(168,85,247,0.3)] cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5 text-purple-300" />
                            <span>Creds</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPlayers.length === 0 && (
                <div className="p-8 text-center text-cyan-200 font-bold text-xs">No players assigned to your hierarchy yet</div>
              )}
            </div>

            <DataTablePagination
              currentPage={playersPage}
              totalPages={playersTotalPages}
              totalEntries={filteredPlayers.length}
              limit={playersLimit}
              onPageChange={setPlayersPage}
              onLimitChange={setPlayersLimit}
            />
          </div>
        )}

        {/* ── TAB: UNDER-USERS PLAYING HISTORY ── */}
        {activeTab === 'history' && (
          <div className="bg-gradient-to-b from-[#132A6B] via-[#0D1D4A] to-[#08112C] border-2 border-[#38BDF8]/40 rounded-[28px] p-5 sm:p-7 shadow-[0_0_45px_rgba(56,189,248,0.22)] space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#38BDF8]/30 pb-5">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#00D9FF] text-white shadow-[0_0_20px_rgba(0,217,255,0.5)]">
                    <History className="w-6 h-6" />
                  </div>
                  <span className="tracking-tight">Under-Users Playing History</span>
                </h3>
                <p className="text-xs text-slate-200 font-bold mt-1">
                  Real-time game play logs and betting records for all players under your hierarchy
                </p>
              </div>

              <button
                onClick={() => fetchPlayerHistory(historyFilterUser, historyFilterGame, historyFilterStatus, historyPage)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:brightness-125 border-2 border-[#38BDF8] text-white text-xs font-black flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.5)] self-start md:self-auto cursor-pointer active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
                <span>Refresh History</span>
              </button>
            </div>

            {/* Active Player Filter Banner */}
            {historyFilterUser !== 'ALL' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#2563EB]/30 via-[#7C3AED]/30 to-[#0A163B] border-2 border-[#00D9FF] text-[#00D9FF] text-xs shadow-[0_0_25px_rgba(0,217,255,0.35)]">
                <div className="flex items-center gap-2.5 font-bold">
                  <UserCheck className="w-5 h-5 text-[#00D9FF] shrink-0" />
                  <span className="text-slate-200">
                    Viewing History for Player:{' '}
                    <strong className="text-white text-base font-black">
                      {players.find((p) => (p.userId || p.user?.id) === historyFilterUser)?.user?.name || 'Selected Player'}
                    </strong>{' '}
                    <span className="text-cyan-300 font-mono font-bold">
                      ({players.find((p) => (p.userId || p.user?.id) === historyFilterUser)?.user?.email})
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => {
                    setHistoryFilterUser('ALL');
                    setHistoryPage(1);
                    fetchPlayerHistory('ALL', historyFilterGame, historyFilterStatus, 1);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#2563EB]/40 hover:bg-[#2563EB]/70 border-2 border-[#00D9FF] text-white text-xs font-black transition-all shrink-0 self-start sm:self-auto shadow-md cursor-pointer"
                >
                  Show All Players
                </button>
              </div>
            )}

            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1E3A8A] to-[#0B1536] border-2 border-[#3B82F6] shadow-[0_0_25px_rgba(59,130,246,0.3)] hover:border-[#60A5FA] transition-all space-y-1">
                <div className="text-xs font-black text-[#93C5FD] uppercase tracking-wider">Total Bets Placed</div>
                <div className="text-3xl font-black text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]">{historySummary.totalBets}</div>
                <div className="text-xs font-bold text-cyan-300">Across all game modes</div>
              </div>
              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#065F46] to-[#0B1536] border-2 border-[#10B981] shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:border-[#34D399] transition-all space-y-1">
                <div className="text-xs font-black text-[#A7F3D0] uppercase tracking-wider">Total Turnover</div>
                <div className="text-3xl font-black text-[#34D399] drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]">{formatINR(historySummary.totalBetAmount)}</div>
                <div className="text-xs font-bold text-emerald-300">Total wagered volume</div>
              </div>
              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#854D0E] to-[#0B1536] border-2 border-[#F59E0B] shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:border-[#FBBF24] transition-all space-y-1">
                <div className="text-xs font-black text-[#FDE68A] uppercase tracking-wider">Player Winnings</div>
                <div className="text-3xl font-black text-[#FBBF24] drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]">{formatINR(historySummary.totalWinAmount)}</div>
                <div className="text-xs font-bold text-amber-300">Total payouts returned</div>
              </div>
              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#581C87] to-[#0B1536] border-2 border-[#A855F7] shadow-[0_0_25px_rgba(168,85,247,0.3)] hover:border-[#C084FC] transition-all space-y-1">
                <div className="text-xs font-black text-[#E9D5FF] uppercase tracking-wider">Merchant Net GGR</div>
                <div className={`text-3xl font-black ${historySummary.netGGR >= 0 ? 'text-[#34D399] drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]' : 'text-[#FB7185] drop-shadow-[0_0_15px_rgba(251,113,133,0.6)]'}`}>
                  {formatINR(historySummary.netGGR)}
                </div>
                <div className="text-xs font-bold text-purple-300">Gross Gaming Revenue</div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#0A163B] border-2 border-[#38BDF8]/40 shadow-xl">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-300 mb-1.5">
                  Filter Player
                </label>
                <select
                  value={historyFilterUser}
                  onChange={(e) => {
                    setHistoryFilterUser(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#132A6B] border-2 border-[#38BDF8]/60 text-white text-xs font-bold focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
                >
                  <option value="ALL">All Under-Users ({players.length})</option>
                  {players.map((p: any) => (
                    <option key={p.id} value={p.userId || p.user?.id}>
                      {p.user?.name || 'Player'} ({p.user?.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-300 mb-1.5">
                  Game Category
                </label>
                <select
                  value={historyFilterGame}
                  onChange={(e) => {
                    setHistoryFilterGame(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#132A6B] border-2 border-[#38BDF8]/60 text-white text-xs font-bold focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
                >
                  <option value="ALL">All Games</option>
                  <option value="PARITY">Fast Parity / Parity</option>
                  <option value="MINES">Mines</option>
                  <option value="JET">JetX Flight / Aviator</option>
                  <option value="CRASH">Crash Game</option>
                  <option value="ANDAR">Andar Bahar</option>
                  <option value="SPIN">Spin Wheel</option>
                  <option value="DICE">Dice Roll</option>
                  <option value="PUSHPA">Pushparani</option>
                  <option value="COIN">Coin Flip</option>
                  <option value="SPORTS">Sports & Casino</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-300 mb-1.5">
                  Bet Outcome
                </label>
                <select
                  value={historyFilterStatus}
                  onChange={(e) => {
                    setHistoryFilterStatus(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#132A6B] border-2 border-[#38BDF8]/60 text-white text-xs font-bold focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
                >
                  <option value="ALL">All Outcomes</option>
                  <option value="WON">WON / CASHED OUT</option>
                  <option value="LOST">LOST</option>
                  <option value="PENDING">PENDING / IN PROGRESS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-300 mb-1.5">
                  Search History
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-cyan-300 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Search player, email, move..."
                    className="w-full bg-[#132A6B] border-2 border-[#38BDF8]/60 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 font-bold focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* History Table */}
            <div className="overflow-x-auto rounded-2xl border-2 border-[#38BDF8]/40 bg-[#0A163B] shadow-2xl">
              <table className="w-full text-left text-xs font-medium border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#1E3A8A] via-[#1B367D] to-[#1E3A8A] text-cyan-200 border-b-2 border-[#38BDF8]/50 uppercase tracking-wider text-[11px] font-black">
                    <th className="p-4">Player Details</th>
                    <th className="p-4">Game</th>
                    <th className="p-4">Bet Amount</th>
                    <th className="p-4">Payout</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Game Info / Move</th>
                    <th className="p-4">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#38BDF8]/20">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-cyan-200 text-sm font-black">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-400" />
                        Loading player game history...
                      </td>
                    </tr>
                  ) : filteredPlayerHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-cyan-200 text-sm font-bold">
                        No playing history found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPlayerHistory.map((bet: any) => {
                      const isWon = bet.status === 'WON' || bet.status === 'CASHED_OUT';
                      const isLost = bet.status === 'LOST' || bet.status === 'BUSTED';
                      return (
                        <tr key={bet.id} className="hover:bg-[#1E3A8A]/50 transition-all">
                          <td className="p-4">
                            <div className="font-black text-white text-sm drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">{bet.playerName}</div>
                            <div className="text-xs text-cyan-300 font-mono font-bold mt-0.5">{bet.playerEmail}</div>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-black text-xs shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                              <span>{resolveGameIcon(bet.gameSlug)}</span>
                              <span>{bet.gameType}</span>
                            </span>
                          </td>
                          <td className="p-4 font-mono font-black text-white text-sm">
                            {formatINR(bet.betAmount)}
                          </td>
                          <td className="p-4 font-mono font-black text-sm">
                            <span className={isWon ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]' : isLost ? 'text-slate-400' : 'text-amber-300'}>
                              {formatINR(bet.winAmount)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-black border-2 ${
                                isWon
                                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                  : isLost
                                  ? 'bg-rose-500/25 border-rose-400 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                                  : 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                              }`}
                            >
                              {bet.status}
                            </span>
                          </td>
                          <td className="p-4 text-cyan-200 font-mono text-xs font-bold">
                            {bet.details || '—'}
                          </td>
                          <td className="p-4 text-slate-300 font-mono text-xs font-bold">
                            {new Date(bet.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <DataTablePagination
              currentPage={historyPage}
              totalPages={historyTotalPages}
              totalEntries={historyTotalBets}
              limit={historyLimit}
              onPageChange={(p) => {
                setHistoryPage(p);
                fetchPlayerHistory(historyFilterUser, historyFilterGame, historyFilterStatus, p, historyLimit);
              }}
              onLimitChange={(l) => {
                setHistoryLimit(l);
                setHistoryPage(1);
                fetchPlayerHistory(historyFilterUser, historyFilterGame, historyFilterStatus, 1, l);
              }}
            />
          </div>
        )}

        {/* ── TAB 6: CREDITS LEDGER ── */}
        {activeTab === 'credits' && (
          <div className="bg-gradient-to-b from-[#132A6B] via-[#0D1D4A] to-[#08112C] border-2 border-[#38BDF8]/40 rounded-[28px] p-6 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                  <Wallet className="w-6 h-6 text-cyan-400" />
                  <span>Credits Transfer History</span>
                </h3>
                <p className="text-xs text-slate-200 font-bold mt-1">Complete ledger of credit allocations</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-cyan-300 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={creditLogsSearchQuery}
                    onChange={(e) => setCreditLogsSearchQuery(e.target.value)}
                    placeholder="Search giver, type, description..."
                    className="w-full bg-[#0A163B] border-2 border-[#38BDF8]/60 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 font-bold focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                  />
                </div>

                <button
                  onClick={() => {
                    setShowTransferCredit(true);
                    setFormError('');
                    setFormSuccess('');
                  }}
                  className="bg-gradient-to-r from-[#00E5A0] to-[#10B981] hover:brightness-125 text-[#030712] font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-[0_0_20px_rgba(0,229,160,0.5)] border-2 border-white shrink-0 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 stroke-[3]" />
                  <span>Transfer Credits</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border-2 border-[#38BDF8]/40 bg-[#0A163B]">
              <table className="w-full text-left text-xs font-medium border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#1E3A8A] via-[#1B367D] to-[#1E3A8A] text-cyan-200 border-b-2 border-[#38BDF8]/50 uppercase tracking-wider text-[11px] font-black">
                    <th className="p-4">Giver / From</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Balance After</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#38BDF8]/20">
                  {paginatedCreditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-[#1E3A8A]/50 transition-colors">
                      <td className="p-4 font-black text-white text-sm drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">{log.giver?.name || 'Platform Admin'}</td>
                      <td className="p-4 font-mono font-black text-emerald-400 text-base drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                        {formatINR(log.amount)}
                      </td>
                      <td className="p-4 font-black text-cyan-300">{log.type}</td>
                      <td className="p-4 font-mono font-bold text-slate-200 text-xs">
                        {formatINR(log.balanceAfter || 0)}
                      </td>
                      <td className="p-4 text-slate-300 font-bold text-xs">{log.description || '—'}</td>
                      <td className="p-4 text-slate-300 font-mono font-bold text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCreditLogs.length === 0 && (
                <div className="p-8 text-center text-cyan-200 font-bold text-xs">No credit transactions recorded yet</div>
              )}
            </div>

            <DataTablePagination
              currentPage={creditLogsPage}
              totalPages={creditLogsTotalPages}
              totalEntries={filteredCreditLogs.length}
              limit={creditLogsLimit}
              onPageChange={setCreditLogsPage}
              onLimitChange={setCreditLogsLimit}
            />
          </div>
        )}

        {/* ── TAB 7: AUDIT TRAIL ── */}
        {activeTab === 'audit' && (
          <div className="bg-gradient-to-b from-[#132A6B] via-[#0D1D4A] to-[#08112C] border-2 border-[#38BDF8]/40 rounded-[28px] p-6 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                  <FileText className="w-6 h-6 text-cyan-400" />
                  <span>System Audit Trail</span>
                </h3>
                <p className="text-xs text-slate-200 font-bold mt-1">Activity trail of tenant operations</p>
              </div>

              {member.role === 'SUPER_ADMIN' && (
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-cyan-300 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={auditLogsSearchQuery}
                    onChange={(e) => setAuditLogsSearchQuery(e.target.value)}
                    placeholder="Search actor, action, entity..."
                    className="w-full bg-[#0A163B] border-2 border-[#38BDF8]/60 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 font-bold focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                  />
                </div>
              )}
            </div>

            {member.role !== 'SUPER_ADMIN' ? (
              <div className="p-6 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-200 text-xs font-black flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-300" />
                <span>Audit logs are restricted to Tenant Super Admins only.</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-2xl border-2 border-[#38BDF8]/40 bg-[#0A163B]">
                  <table className="w-full text-left text-xs font-medium border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-[#1E3A8A] via-[#1B367D] to-[#1E3A8A] text-cyan-200 border-b-2 border-[#38BDF8]/50 uppercase tracking-wider text-[11px] font-black">
                        <th className="p-4">Actor</th>
                        <th className="p-4">Action</th>
                        <th className="p-4">Entity</th>
                        <th className="p-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#38BDF8]/20">
                      {paginatedAuditLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-[#1E3A8A]/50 transition-colors">
                          <td className="p-4 font-black text-white text-sm drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">{log.member?.name || 'System'}</td>
                          <td className="p-4 font-mono font-bold text-amber-300 text-xs">{log.action}</td>
                          <td className="p-4 font-black text-cyan-300 text-xs">{log.entityType}</td>
                          <td className="p-4 text-slate-300 font-mono font-bold text-xs">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredAuditLogs.length === 0 && (
                    <div className="p-8 text-center text-cyan-200 font-bold text-xs">No audit logs recorded yet</div>
                  )}
                </div>

                <DataTablePagination
                  currentPage={auditLogsPage}
                  totalPages={auditLogsTotalPages}
                  totalEntries={filteredAuditLogs.length}
                  limit={auditLogsLimit}
                  onPageChange={setAuditLogsPage}
                  onLimitChange={setAuditLogsLimit}
                />
              </>
            )}
          </div>
        )}
      </main>

      {/* ── MODAL: CREATE MEMBER ── */}
      {showCreateMember && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#132A6B] via-[#0D1D4A] to-[#0A163B] border-2 border-[#38BDF8] rounded-3xl w-full max-w-md p-6 shadow-[0_0_60px_rgba(56,189,248,0.4)] space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#38BDF8]/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#2563EB] via-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white font-black shadow-[0_0_18px_rgba(37,99,235,0.6)]">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                  {createForm.role === 'PLAYER' ? '🎮 Create New Player Account' : '👥 Create Hierarchy Member'}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateMember(false)}
                className="p-2 rounded-xl bg-white/10 border border-cyan-400/40 text-cyan-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/25 border-2 border-rose-400 text-rose-200 text-xs font-black flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/25 border-2 border-emerald-400 text-emerald-200 text-xs font-black flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Check className="w-4 h-4 shrink-0 text-emerald-300" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Smith"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                  className="w-full bg-[#0A163B] border-2 border-[#38BDF8]/60 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-400 font-bold focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_18px_rgba(6,182,212,0.4)] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                  className="w-full bg-[#0A163B] border-2 border-[#38BDF8]/60 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-400 font-bold focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_18px_rgba(6,182,212,0.4)] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-300 mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="w-full bg-[#0A163B] border-2 border-[#38BDF8]/60 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-400 font-bold focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_18px_rgba(6,182,212,0.4)] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-300 mb-1">
                  Hierarchy Role
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full bg-[#0A163B] text-white border-2 border-[#38BDF8]/60 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-cyan-300 focus:shadow-[0_0_18px_rgba(6,182,212,0.4)] transition-all"
                >
                  {activeRolesForCreation.map((r) => (
                    <option key={r.id} value={r.code} className="bg-[#0D152D] text-white py-2">
                      {r.icon} {r.label} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-300 mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                  className="w-full bg-[#0A163B] border-2 border-[#38BDF8]/60 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-400 font-bold focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_18px_rgba(6,182,212,0.4)] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3.5 bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:brightness-125 text-white font-black text-xs rounded-2xl shadow-[0_0_25px_rgba(37,99,235,0.6)] border-2 border-[#38BDF8] active:scale-95 transition-all cursor-pointer"
              >
                {formLoading
                  ? '🔄 Creating...'
                  : createForm.role === 'PLAYER'
                  ? '✅ Create Player Account'
                  : '✅ Create Member'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT ROLE ── */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0C173B] border border-purple-500/40 rounded-3xl w-full max-w-md p-6 shadow-[0_0_50px_rgba(168,85,247,0.3)] space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-white">
                  {editingRole ? '✏️ Edit Role Definition' : '➕ Add Custom Hierarchy Role'}
                </h3>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-1 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Role Title / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sub Master, Senior Distributor"
                  value={roleForm.label}
                  onChange={(e) => setRoleForm({ ...roleForm, label: e.target.value })}
                  required
                  className="w-full bg-[#101C3A] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80"
                />
              </div>

              {!editingRole && (
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Role Code / Key (Uppercase)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SUB_MASTER, DISTRIBUTOR"
                    value={roleForm.code}
                    onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })}
                    className="w-full bg-[#101C3A] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500/80"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Icon / Emoji Badge
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={roleForm.icon}
                    onChange={(e) => setRoleForm({ ...roleForm, icon: e.target.value })}
                    className="w-16 bg-[#101C3A] border border-white/15 rounded-2xl text-center py-2 text-xl text-white font-bold"
                  />
                  <div className="flex flex-wrap gap-1">
                    {EMOJI_ICONS.slice(0, 8).map((em, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRoleForm({ ...roleForm, icon: em })}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-sm"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Base System Rank Mapping
                </label>
                <select
                  value={roleForm.baseRank}
                  onChange={(e) =>
                    setRoleForm({
                      ...roleForm,
                      baseRank: e.target.value as 'SUPER_ADMIN' | 'SUB_ADMIN' | 'SUPER_AGENT' | 'AGENT',
                    })
                  }
                  className="w-full bg-[#101C3A] text-white border border-white/15 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-purple-500"
                >
                  <option value="SUPER_AGENT" className="bg-[#0D152D] text-white">
                    ⚡ Super Master Level (Distributor)
                  </option>
                  <option value="SUB_ADMIN" className="bg-[#0D152D] text-white">
                    🌟 Sub Master / Sub Admin Level
                  </option>
                  <option value="AGENT" className="bg-[#0D152D] text-white">
                    👤 Master Agent Level
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Role responsibilities and hierarchy permissions..."
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full bg-[#101C3A] border border-white/15 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 hover:brightness-110 text-white font-black text-xs rounded-2xl shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
              >
                {editingRole ? '✅ Update Role Definition' : '➕ Add Custom Role'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TRANSFER / DEDUCT CREDIT ── */}
      {showTransferCredit && (() => {
        const selMember = members.find((m) => m.id === creditForm.receiverId);
        const selPlayer = players.find((p: any) => p.id === creditForm.receiverId || p.userId === creditForm.receiverId);
        const recBal = selMember ? Number(selMember.creditBalance || 0) : selPlayer ? Number(selPlayer.user?.wallet?.mainBalance || 0) : 0;
        const recName = selMember ? selMember.name : selPlayer ? (selPlayer.user?.name || selPlayer.user?.email || 'Player') : null;
        const isEndUserPlayer = !!selPlayer;
        const amt = Number(creditForm.amount || 0);
        const masterBal = Number(member?.creditBalance || 0);

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0C173B] border border-emerald-500/40 rounded-3xl w-full max-w-md p-6 shadow-[0_0_50px_rgba(16,185,129,0.3)] space-y-4 relative">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${
                      creditForm.action === 'ADD' ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-red-600'
                    } flex items-center justify-center text-white font-bold shadow-md`}
                  >
                    <CreditCard className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {creditForm.action === 'ADD' ? 'Add Balance to Member / Player' : 'Deduct Balance from Member / Player'}
                    </h3>
                    <p className="text-[10px] text-slate-400">Master Account balance transfer engine</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTransferCredit(false)}
                  className="p-1 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Master Balance Overview */}
              <div className="bg-[#071F15] border border-emerald-500/40 p-3.5 rounded-2xl text-center space-y-0.5">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Master Available Balance</div>
                <div className="text-2xl font-black font-mono text-[#00E5A0]">
                  {formatINR(masterBal)}
                </div>
              </div>

              {/* Action Segmented Toggle: ADD vs DEDUCT */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#07132B] border border-white/10 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setCreditForm({ ...creditForm, action: 'ADD' })}
                  className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                    creditForm.action === 'ADD'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>➕ Add / Deposit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreditForm({ ...creditForm, action: 'DEDUCT' })}
                  className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                    creditForm.action === 'DEDUCT'
                      ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>➖ Deduct / Reclaim</span>
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleTransferCredit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Select Account (Enduser Player or Staff Member)
                  </label>
                  <select
                    value={creditForm.receiverId}
                    onChange={(e) => setCreditForm({ ...creditForm, receiverId: e.target.value })}
                    required
                    className="w-full bg-[#101C3A] text-white border border-white/15 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-emerald-500"
                  >
                    <option value="" className="bg-[#0D152D] text-slate-400">
                      -- Select End Player or Hierarchy Member --
                    </option>
                    {players.length > 0 && (
                      <optgroup label="🎮 Registered End Players (Users)" className="bg-[#0D152D] text-emerald-300 font-bold">
                        {players.map((p: any) => (
                          <option key={p.id} value={p.id} className="bg-[#0D152D] text-white py-1">
                            🎮 {p.user?.name || 'Player'} ({p.user?.email}) — Bal: {formatINR(p.user?.wallet?.mainBalance ?? 0)}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {members.length > 0 && (
                      <optgroup label="👥 Hierarchy Staff Members" className="bg-[#0D152D] text-indigo-300 font-bold">
                        {members.map((m) => (
                          <option key={m.id} value={m.id} className="bg-[#0D152D] text-white py-1">
                            👥 {m.name} ({getRoleMeta(m.role).label}) — Bal: {formatINR(m.creditBalance || 0)}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Selected Recipient Live Preview */}
                {recName && (
                  <div className="bg-[#081330] border border-indigo-500/30 rounded-2xl p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        {isEndUserPlayer ? '🎮 Enduser Player:' : '👥 Staff Member:'}
                        <span className="text-white font-black">{recName}</span>
                      </span>
                      <span className="text-emerald-400 font-mono">Current: {formatINR(recBal)}</span>
                    </div>

                    {amt > 0 && (
                      <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-white/5 rounded-xl p-2 border border-white/5 space-y-0.5">
                          <span className="text-slate-400 block text-[9px] uppercase">Master Balance After</span>
                          <span className="font-mono font-bold text-cyan-300">
                            {formatINR(creditForm.action === 'ADD' ? masterBal - amt : masterBal + amt)}
                          </span>
                        </div>
                        <div className="bg-white/5 rounded-xl p-2 border border-white/5 space-y-0.5">
                          <span className="text-slate-400 block text-[9px] uppercase">Recipient Bal After</span>
                          <span className="font-mono font-bold text-amber-300">
                            {formatINR(creditForm.action === 'ADD' ? recBal + amt : Math.max(0, recBal - amt))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 5000"
                    value={creditForm.amount}
                    onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
                    required
                    className="w-full bg-[#101C3A] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 font-mono font-bold"
                  />

                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {CREDIT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCreditForm({ ...creditForm, amount: String(preset) })}
                        className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-bold transition-all"
                      >
                        +{formatINR(preset)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Credit transaction note..."
                    value={creditForm.description}
                    onChange={(e) => setCreditForm({ ...creditForm, description: e.target.value })}
                    className="w-full bg-[#101C3A] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/80"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className={`w-full py-3 ${
                    creditForm.action === 'ADD'
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 shadow-emerald-500/25'
                      : 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 text-white shadow-rose-500/25'
                  } font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all`}
                >
                  {formLoading
                    ? '🔄 Processing...'
                    : creditForm.action === 'ADD'
                    ? '💸 Add / Transfer Balance Now'
                    : '🔥 Deduct Balance Now'}
                </button>
              </form>
            </div>
          </div>
        );
      })()}
      {/* ── MODAL: SHARE CREDENTIALS ── */}
      {showShareCredsModal && shareCredsData && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0C173B] border border-indigo-500/40 rounded-3xl w-full max-w-md p-6 shadow-[0_0_50px_rgba(99,102,241,0.35)] space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 font-black shadow-md">
                  <Share2 className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Share Account Credentials</h3>
                  <p className="text-[10px] text-slate-400">Copy or send login details directly to player</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareCredsModal(false)}
                className="p-1 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Details Box */}
            <div className="bg-[#07132B] border border-white/10 rounded-2xl p-4 space-y-3">
              {/* Name */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                <span className="text-slate-400 font-medium">Account Name</span>
                <span className="font-bold text-white">{shareCredsData.name}</span>
              </div>

              {/* Role */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                <span className="text-slate-400 font-medium">Role</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-bold text-indigo-300">
                  {shareCredsData.role}
                </span>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Login Email / Phone
                </span>
                <div className="flex items-center justify-between bg-[#0E1C44] border border-white/10 rounded-xl px-3 py-2">
                  <span className="text-xs font-mono text-white truncate">{shareCredsData.email}</span>
                  <button
                    onClick={() => handleCopyText(shareCredsData.email, 'email')}
                    className="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1 shrink-0 ml-2"
                  >
                    {copiedField === 'email' ? (
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Copied</span>
                    ) : (
                      <span className="flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copy</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Password
                  </span>
                  {resetMsg && (
                    <span className="text-[10px] font-bold text-emerald-400 animate-pulse">{resetMsg}</span>
                  )}
                </div>

                <div className="flex items-center justify-between bg-[#0E1C44] border border-white/10 rounded-xl px-3 py-2">
                  <span className="text-xs font-mono text-amber-400 font-bold tracking-wider">
                    {showPassword
                      ? (shareCredsData.password === '••••••••'
                          ? '•••••••• (Enter new password below)'
                          : shareCredsData.password)
                      : '••••••••'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-white text-xs p-1 rounded-lg hover:bg-white/10 transition-all"
                      title={showPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                    {shareCredsData.password && (
                      <button
                        onClick={() => handleCopyText(shareCredsData.password!, 'password')}
                        className="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1"
                      >
                        {copiedField === 'password' ? (
                          <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Copied</span>
                        ) : (
                          <span className="flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copy</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Reset / Set New Password option */}
                {shareCredsData.id && (
                  <form onSubmit={handleResetPasswordSubmit} className="pt-1.5 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Set new password (e.g. 12345678)..."
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="flex-1 bg-[#0E1C44] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500/60"
                    />
                    <button
                      type="submit"
                      disabled={resetLoading || !newPasswordInput}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold shrink-0 disabled:opacity-50 transition-all"
                    >
                      {resetLoading ? 'Saving...' : '🔑 Set & Update'}
                    </button>
                  </form>
                )}
              </div>

              {/* Login Link */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Portal Login Link
                </span>
                <div className="flex items-center justify-between bg-[#0E1C44] border border-white/10 rounded-xl px-3 py-2">
                  <span className="text-[11px] font-mono text-cyan-300 truncate">{shareCredsData.loginUrl}</span>
                  <button
                    onClick={() => handleCopyText(shareCredsData.loginUrl, 'loginUrl')}
                    className="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1 shrink-0 ml-2"
                  >
                    {copiedField === 'loginUrl' ? (
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Copied</span>
                    ) : (
                      <span className="flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copy</span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  const passToCopy = shareCredsData.password && shareCredsData.password !== '••••••••'
                    ? shareCredsData.password
                    : '(Password set by agent)';
                  const formatted = `🎮 Welcome to ${shareCredsData.siteName}!\nHere are your account credentials:\n👤 Name: ${shareCredsData.name}\n📧 Email: ${shareCredsData.email}\n🔑 Password: ${passToCopy}\n🌐 Login Link: ${shareCredsData.loginUrl}`;
                  handleCopyText(formatted, 'all');
                }}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              >
                {copiedField === 'all' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>All Credentials Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>📋 Copy Complete Credentials Block</span>
                  </>
                )}
              </button>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `🎮 Welcome to ${shareCredsData.siteName}!\nHere are your login credentials:\n👤 Name: ${shareCredsData.name}\n📧 Email: ${shareCredsData.email}\n🔑 Password: ${
                    shareCredsData.password && shareCredsData.password !== '••••••••'
                      ? shareCredsData.password
                      : '(Password set by agent)'
                  }\n🌐 Login Link: ${shareCredsData.loginUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all text-center"
              >
                <MessageCircle className="w-4 h-4 stroke-[2.5]" />
                <span>💬 Share via WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
