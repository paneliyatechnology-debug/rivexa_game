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
  Minus
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
  }, [member, fetchMembers, fetchPlayers, fetchCreditLogs, fetchStats, fetchAuditLogs]);

  // Guard active tab based on member role permissions
  useEffect(() => {
    if (!member) return;
    if ((activeTab === 'roles' || activeTab === 'audit') && member.role !== 'SUPER_ADMIN') {
      setActiveTab('overview');
    } else if (activeTab === 'members' && member.role === 'AGENT') {
      setActiveTab('overview');
    }
  }, [member, activeTab]);

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

  // Filter members by search & role
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
      <div className="min-h-screen bg-[#050B20] text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3 bg-[#0A1435] border border-indigo-500/30 p-8 rounded-3xl shadow-2xl animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6 text-white animate-spin" />
          </div>
          <span className="text-sm font-bold text-indigo-300">Loading Tenant Management Console...</span>
        </div>
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="min-h-screen bg-[#050B20] text-[#F5F7FF] font-sans flex flex-col lg:flex-row relative selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* 🌌 Ambient Background Glow Orbs */}
      <div className="fixed top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,rgba(5,11,32,0)_70%)] pointer-events-none blur-3xl z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.10)_0%,rgba(5,11,32,0)_70%)] pointer-events-none blur-3xl z-0" />

      {/* ── MOBILE NAVBAR ── */}
      <div className="lg:hidden bg-[#091535]/95 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)` }}
          >
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white">{member.tenant?.name || 'Tenant Operator'}</div>
            <div className="text-[10px] text-slate-400 font-mono">{member.tenant?.slug}</div>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ── SIDEBAR NAVIGATION ── */}
      <aside
        className={`fixed lg:sticky top-0 left-0 bottom-0 z-50 w-64 bg-[#08132E]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col justify-between p-4 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } h-screen overflow-y-auto custom-scrollbar shrink-0`}
      >
        <div className="space-y-6">
          {/* Tenant Brand Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/10 pt-2">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shrink-0 border border-white/20"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)` }}
            >
              <Building2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black tracking-tight text-white truncate">
                {member.tenant?.name || 'Tenant Operator'}
              </h2>
              <span className="text-[11px] font-mono text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30">
                {member.tenant?.slug}
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 pb-2">
              Hierarchy Console
            </div>
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-sm transition-all ${isActive
                      ? 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white border border-[#818CF8]/40 shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 text-white/80" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Member Profile & Logout */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="p-3 rounded-2xl bg-[#0E1C44] border border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-lg text-white shadow-sm shrink-0">
              {myRoleMeta.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{member.name}</div>
              <div className="text-[10px] font-semibold text-amber-400 truncate">{myRoleMeta.label}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Portal</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 relative z-10">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#091535]/80 backdrop-blur-xl border border-white/10 p-4 sm:p-5 rounded-3xl shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {visibleNavItems.find((n) => n.id === activeTab)?.label || 'Console'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-mono text-indigo-300">
                {member.tenant?.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Logged in as <span className="text-amber-400 font-semibold">{member.name}</span> ({myRoleMeta.label})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Credit Balance Badge */}
            <div className="bg-[#071F15] border border-[#00E5A0]/40 px-4 py-2 rounded-2xl flex items-center gap-2.5 shadow-[0_0_15px_rgba(0,229,160,0.15)]">
              <div className="w-7 h-7 rounded-xl bg-[#00E5A0]/20 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-[#00E5A0]" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-[#00E5A0]/80 block">
                  Credit Balance
                </span>
                <span className="text-base font-black font-mono text-[#00E5A0]">
                  {formatINR(member.creditBalance || 0)}
                </span>
              </div>
            </div>

            {/* Quick Action CTAs */}
            <button
              onClick={openCreateMemberModal}
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:brightness-110 active:scale-95 text-white text-xs font-black px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all"
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
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 active:scale-95 text-slate-950 text-xs font-black px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all"
            >
              <CreditCard className="w-4 h-4 stroke-[3]" />
              <span>Transfer Credits</span>
            </button>
          </div>
        </div>

        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0A163B]/90 border border-indigo-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-indigo-500/60 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Hierarchy Members
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white font-mono">{members.length}</div>
                <p className="text-[11px] text-indigo-300 mt-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Super Masters, Sub Masters & Agents
                </p>
              </div>

              <div className="bg-[#0A163B]/90 border border-emerald-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/60 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Configured Roles
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white font-mono">{roles.length} Roles</div>
                <p className="text-[11px] text-emerald-300 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Super Master, Sub Master, Master & Custom
                </p>
              </div>

              <div className="bg-[#0A163B]/90 border border-amber-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-amber-500/60 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Your Credit Balance
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono">
                  {formatINR(member.creditBalance || 0)}
                </div>
                <p className="text-[11px] text-amber-300 mt-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Ready for allocation
                </p>
              </div>

              <div className="bg-[#0A163B]/90 border border-cyan-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-cyan-500/60 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Total Players
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white font-mono">{players.length}</div>
                <p className="text-[11px] text-cyan-300 mt-1 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Active on tenant site
                </p>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-[#091535]/80 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span>Quick Role Breakdown</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {roles.map((r) => {
                  const count = members.filter((m) => m.role === r.code || m.role === r.baseRank).length;
                  return (
                    <div key={r.id} className="bg-[#0E1C44] border border-white/10 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{r.icon}</span>
                        <span className="text-[10px] font-mono text-indigo-300 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                          {r.code}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-white">{r.label}</div>
                      <div className="text-xs text-slate-400">{count} Active Members</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: HIERARCHY MEMBERS ── */}
        {activeTab === 'members' && (
          <div className="bg-[#091535]/90 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white">Hierarchy Members ({filteredMembers.length})</h3>
                <p className="text-xs text-slate-400">Manage Super Masters, Sub Masters, and Master Agents</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Role Filter Selector */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-[#0E1C44] text-white border border-white/10 rounded-2xl px-3 py-2 text-xs font-bold outline-none"
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
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search member..."
                    className="w-full bg-[#0E1C44] border border-white/10 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500/60"
                  />
                </div>

                <button
                  onClick={openCreateMemberModal}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 text-white text-xs font-black px-4 py-2 rounded-2xl flex items-center gap-1.5 shadow-md shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Create Member</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs font-medium border-collapse">
                <thead>
                  <tr className="bg-[#0E1C44] text-slate-400 border-b border-white/10 uppercase tracking-wider text-[10px] font-black">
                    <th className="p-3.5">Member Name</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Hierarchy Role</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Credit Balance</th>
                    <th className="p-3.5">Players</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMembers.map((m) => {
                    const rMeta = getRoleMeta(m.role);
                    return (
                      <tr key={m.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-sm shadow-sm">
                              {rMeta.icon}
                            </div>
                            <span className="font-bold text-white text-xs">{m.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-400 font-mono text-[11px]">{m.email}</td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border-indigo-500/30">
                            <span>{rMeta.icon}</span>
                            <span>{rMeta.label}</span>
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${m.status === 'ACTIVE'
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                              }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-black text-[#00E5A0]">
                          {formatINR(m.creditBalance || 0)}
                        </td>
                        <td className="p-3.5 font-bold text-slate-300">{m._count?.players ?? 0}</td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setCreditForm({ receiverId: m.id, amount: '', description: '', action: 'ADD' });
                                setShowTransferCredit(true);
                                setFormError('');
                                setFormSuccess('');
                              }}
                              className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                              title="Transfer/Add credit to staff member"
                            >
                              <Plus className="w-3 h-3 text-emerald-400" />
                              <span>Add</span>
                            </button>
                            <button
                              onClick={() => {
                                setCreditForm({ receiverId: m.id, amount: '', description: '', action: 'DEDUCT' });
                                setShowTransferCredit(true);
                                setFormError('');
                                setFormSuccess('');
                              }}
                              className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                              title="Deduct/Reclaim credit from staff member"
                            >
                              <Minus className="w-3 h-3 text-rose-400" />
                              <span>Deduct</span>
                            </button>
                            <button
                              onClick={() => handleOpenShareModal({ id: m.id, name: m.name, email: m.email, role: m.role })}
                              className="px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                            >
                              <Share2 className="w-3 h-3 text-purple-400" />
                              <span>Creds</span>
                            </button>
                            <button
                              onClick={() => handleToggleStatus(m.id)}
                              className="px-2.5 py-1 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold transition-all"
                            >
                              {m.status === 'ACTIVE' ? '⏸' : '▶'}
                            </button>
                            {m.role !== 'SUPER_ADMIN' && (
                              <button
                                onClick={() => handleDeleteMember(m.id)}
                                className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-200 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
                <div className="p-8 text-center text-slate-400 text-xs">No hierarchy members found</div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: DYNAMIC ROLE MANAGEMENT ── */}
        {activeTab === 'roles' && (
          <div className="bg-[#091535]/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <span>Dynamic Role Management & Custom Hierarchy</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
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
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:brightness-110 text-white font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg shrink-0"
              >
                <PlusCircle className="w-4 h-4 stroke-[3]" />
                <span>Add Custom Role</span>
              </button>
            </div>

            {/* Roles Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs font-medium border-collapse">
                <thead>
                  <tr className="bg-[#0E1C44] text-slate-400 border-b border-white/10 uppercase tracking-wider text-[10px] font-black">
                    <th className="p-3.5">Icon & Role Name</th>
                    <th className="p-3.5">Role Code</th>
                    <th className="p-3.5">Base Rank</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {roles.map((r) => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{r.icon}</span>
                          <div>
                            <div className="font-bold text-white text-xs">{r.label}</div>
                            {r.isBuiltIn && (
                              <span className="text-[9px] font-mono text-amber-400 uppercase">System Default</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-indigo-300 font-bold">{r.code}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                          {r.baseRank}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 text-xs max-w-xs">{r.description}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${r.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                            }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
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
                            className="px-2.5 py-1 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleToggleRoleStatus(r.id)}
                            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-bold transition-all"
                          >
                            {r.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                          </button>

                          {!r.isBuiltIn && (
                            <button
                              onClick={() => handleDeleteRole(r.id)}
                              className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-200 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: ALLOWED GAMES (100% DYNAMIC) ── */}
        {activeTab === 'games' && (
          <div className="bg-[#091535]/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-indigo-400" />
                <span>Tenant Game Access & Activation</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Games configured and enabled by Platform Owner for your tenant site.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayGamesList.map((game) => (
                <div
                  key={game.id}
                  className={`rounded-2xl p-4 border transition-all ${game.isEnabled
                      ? 'bg-gradient-to-br from-emerald-950/40 via-[#0A1B28] to-[#07132B] border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                      : 'bg-[#0E1C44]/50 border-white/10 opacity-70'
                    }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-3xl">{game.icon}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                      {game.badge}
                    </span>
                  </div>

                  <div className="font-bold text-sm text-white">{game.name}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${game.isEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
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
          <div className="bg-[#091535]/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-black text-white">Registered Players ({players.length})</h3>
              <p className="text-xs text-slate-400">Players assigned to your agent hierarchy</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs font-medium border-collapse">
                <thead>
                  <tr className="bg-[#0E1C44] text-slate-400 border-b border-white/10 uppercase tracking-wider text-[10px] font-black">
                    <th className="p-3.5">Player Name</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Main Wallet</th>
                    <th className="p-3.5">Agent</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Joined Date</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {players.map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3.5 font-bold text-white">{p.user?.name || 'Player'}</td>
                      <td className="p-3.5 text-slate-400 font-mono text-[11px]">{p.user?.email}</td>
                      <td className="p-3.5 font-mono font-black text-[#00E5A0]">
                        {formatINR(p.user?.wallet?.mainBalance ?? 0)}
                      </td>
                      <td className="p-3.5 font-bold text-indigo-400">{p.agent?.name || '—'}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${p.user?.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                            }`}
                        >
                          {p.user?.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setCreditForm({ receiverId: p.id, amount: '', description: '', action: 'ADD' });
                              setShowTransferCredit(true);
                              setFormError('');
                              setFormSuccess('');
                            }}
                            className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                            title="Deposit money into player wallet from master"
                          >
                            <Plus className="w-3 h-3 text-emerald-400" />
                            <span>Add Bal</span>
                          </button>
                          <button
                            onClick={() => {
                              setCreditForm({ receiverId: p.id, amount: '', description: '', action: 'DEDUCT' });
                              setShowTransferCredit(true);
                              setFormError('');
                              setFormSuccess('');
                            }}
                            className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                            title="Deduct/Withdraw money from player wallet to master"
                          >
                            <Minus className="w-3 h-3 text-rose-400" />
                            <span>Deduct Bal</span>
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
                            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold inline-flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Share2 className="w-3 h-3 text-indigo-400" />
                            <span>Creds</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {players.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">No players assigned to your hierarchy yet</div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 6: CREDITS LEDGER ── */}
        {activeTab === 'credits' && (
          <div className="bg-[#091535]/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">Credits Transfer History</h3>
                <p className="text-xs text-slate-400">Complete ledger of credit allocations</p>
              </div>

              <button
                onClick={() => {
                  setShowTransferCredit(true);
                  setFormError('');
                  setFormSuccess('');
                }}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-slate-950 font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-md"
              >
                <CreditCard className="w-4 h-4 stroke-[3]" />
                <span>Transfer Credits</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs font-medium border-collapse">
                <thead>
                  <tr className="bg-[#0E1C44] text-slate-400 border-b border-white/10 uppercase tracking-wider text-[10px] font-black">
                    <th className="p-3.5">Giver / From</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Balance After</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {creditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3.5 font-bold text-white">{log.giver?.name || 'Platform Admin'}</td>
                      <td className="p-3.5 font-mono font-black text-[#00E5A0]">
                        {formatINR(log.amount)}
                      </td>
                      <td className="p-3.5 font-bold text-indigo-400">{log.type}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-300">
                        {formatINR(log.balanceAfter || 0)}
                      </td>
                      <td className="p-3.5 text-slate-400 text-xs">{log.description || '—'}</td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {creditLogs.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">No credit transactions recorded yet</div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 7: AUDIT TRAIL ── */}
        {activeTab === 'audit' && (
          <div className="bg-[#091535]/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-black text-white">System Audit Trail</h3>
              <p className="text-xs text-slate-400">Activity trail of tenant operations</p>
            </div>

            {member.role !== 'SUPER_ADMIN' ? (
              <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Audit logs are restricted to Tenant Super Admins only.</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs font-medium border-collapse">
                  <thead>
                    <tr className="bg-[#0E1C44] text-slate-400 border-b border-white/10 uppercase tracking-wider text-[10px] font-black">
                      <th className="p-3.5">Actor</th>
                      <th className="p-3.5">Action</th>
                      <th className="p-3.5">Entity</th>
                      <th className="p-3.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 font-bold text-white">{log.member?.name || 'System'}</td>
                        <td className="p-3.5 font-mono font-bold text-amber-400">{log.action}</td>
                        <td className="p-3.5 font-bold text-indigo-400">{log.entityType}</td>
                        <td className="p-3.5 text-slate-400 text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {auditLogs.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">No audit logs recorded yet</div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── MODAL: CREATE MEMBER ── */}
      {showCreateMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0C173B] border border-indigo-500/40 rounded-3xl w-full max-w-md p-6 shadow-[0_0_50px_rgba(99,102,241,0.3)] space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-white">
                  {createForm.role === 'PLAYER' ? '🎮 Create New Player Account' : '👥 Create Hierarchy Member'}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateMember(false)}
                className="p-1 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
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

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Smith"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                  className="w-full bg-[#101C3A] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                  className="w-full bg-[#101C3A] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="w-full bg-[#101C3A] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Hierarchy Role
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full bg-[#101C3A] text-white border border-white/15 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500"
                >
                  {activeRolesForCreation.map((r) => (
                    <option key={r.id} value={r.code} className="bg-[#0D152D] text-white py-2">
                      {r.icon} {r.label} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                  className="w-full bg-[#101C3A] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:brightness-110 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-95 transition-all"
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
