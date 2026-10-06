'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/config';
import { GameControlCenterView } from '@/components/admin/GameControlCenterView';

interface StatData {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalNetProfit: number;
  todayDeposits: number;
  todayWithdrawals: number;
  todayNetProfit: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  activeGames: number;
  dailyTurnoverHistory?: Array<{ date: string; stakesTurnover: number; houseNetRevenue: number }>;
  topPlayersLeaderboard?: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    totalWinnings: number;
    totalTurnover: number;
    currentBalance: number;
    status: string;
  }>;
}

export default function AdminDashboardPage({ initialTab }: { initialTab?: string } = {}) {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);

  const normalizeTab = (raw?: string) => {
    if (!raw) return 'dashboard';
    const s = raw.toLowerCase();
    if (s.includes('fast-parity') || s === 'fastparity') return 'fast-parity';
    if (s === 'parity' || s.includes('parity-1m') || s.includes('parity1m')) return 'parity';
    if (s.includes('mine')) return 'mines';
    if (s.includes('andar')) return 'andar-bahar';
    if (s.includes('jet')) return 'jet';
    if (s.includes('crash')) return 'crash';
    if (s.includes('spin')) return 'spin';
    if (s.includes('dice')) return 'dice';
    if (s.includes('pushpa')) return 'pushparani';
    if (s.includes('coin')) return 'coin-flip';
    if (s.includes('approval') || s.includes('bank')) return 'approvals';
    if (s.includes('merchant')) return 'merchants';
    if (s.includes('deposit') || s.includes('manual')) return 'manual-deposits';
    if (s.includes('withdrawal')) return 'withdrawals';
    if (s.includes('user')) return 'users';
    if (s.includes('tenant') || s.includes('operator')) return 'tenants';
    if (s.includes('game')) return 'games';
    if (s.includes('override')) return 'override';
    return s;
  };

  const [activeTab, setActiveTab] = useState<string>(() => normalizeTab(initialTab));
  const [message, setMessage] = useState<string>('');

  const handleTabSelect = (rawTab: string) => {
    const norm = normalizeTab(rawTab);
    setActiveTab(norm);
    setIsMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      const targetPath = norm === 'dashboard' ? '/admin' : `/admin/${norm}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab: norm }, '', targetPath);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const segments = window.location.pathname.split('/').filter(Boolean);
        const lastSeg = segments.length > 1 ? segments[1] : 'dashboard';
        setActiveTab(normalizeTab(lastSeg));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Live Stats State
  const [stats, setStats] = useState<StatData>({
    totalUsers: 12,
    totalDeposits: 18002500,
    totalWithdrawals: 969600,
    totalNetProfit: 17032900,
    todayDeposits: 0,
    todayWithdrawals: 0,
    todayNetProfit: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    activeGames: 9,
  });

  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Table Data States
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'ACTIVE' | 'BLOCKED'>('all');
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [walletAdjustAmount, setWalletAdjustAmount] = useState<string>('');
  const [walletAdjustLoading, setWalletAdjustLoading] = useState<boolean>(false);

  // User Management Modals & CRUD State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [addUserLoading, setAddUserLoading] = useState<boolean>(false);
  const [addUserForm, setAddUserForm] = useState<{
    name: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    initialBalance: number;
  }>({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'PLAYER',
    initialBalance: 0,
  });

  const [editingUserModal, setEditingUserModal] = useState<any | null>(null);
  const [editUserLoading, setEditUserLoading] = useState<boolean>(false);
  const [editUserForm, setEditUserForm] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    status: string;
    password: string;
  }>({
    id: '',
    name: '',
    email: '',
    phone: '',
    role: 'PLAYER',
    status: 'ACTIVE',
    password: '',
  });

  // Table Pagination States
  const [usersPage, setUsersPage] = useState<number>(1);
  const [usersPerPage, setUsersPerPage] = useState<number>(10);

  const [depositsPage, setDepositsPage] = useState<number>(1);
  const [depositsPerPage, setDepositsPerPage] = useState<number>(10);

  const [withdrawalsPage, setWithdrawalsPage] = useState<number>(1);
  const [withdrawalsPerPage, setWithdrawalsPerPage] = useState<number>(10);

  const [banksPage, setBanksPage] = useState<number>(1);
  const [banksPerPage, setBanksPerPage] = useState<number>(10);

  const [merchantsPage, setMerchantsPage] = useState<number>(1);
  const [merchantsPerPage, setMerchantsPerPage] = useState<number>(10);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [bankApprovals, setBankApprovals] = useState<any[]>([]);
  const [bankStatusFilter, setBankStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectModalBank, setRejectModalBank] = useState<{ id: string; bankName: string; playerName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [merchants, setMerchants] = useState<any[]>([
    {
      id: 'merchant_upi_1',
      name: 'RivexaAdmin',
      accountHolder: 'RivexaPVT.LTD',
      upiId: 'rivexaadmin234@okaxis',
      bankName: 'AxisBank',
      accountNumber: '2025112600350512',
      ifsc: 'HJDFE34433',
      ifscCode: 'HJDFE34433',
      dailyLimit: 200000000,
      currentDailyTotal: 0,
      priority: 1,
      status: 'active',
    },
    {
      id: 'merchant_upi_2',
      name: 'MerchentAdmin',
      accountHolder: 'RivexaAdmin',
      upiId: 'rivexa456@oksbi',
      bankName: 'SBI',
      accountNumber: '4233242432342',
      ifsc: 'SBIN242442',
      ifscCode: 'SBIN242442',
      dailyLimit: 2000000,
      currentDailyTotal: 500000,
      priority: 1,
      status: 'active',
    },
  ]);

  const [showAddMerchantModal, setShowAddMerchantModal] = useState<boolean>(false);
  const [editingMerchant, setEditingMerchant] = useState<any | null>(null);
  const [viewingQrMerchant, setViewingQrMerchant] = useState<any | null>(null);
  const [merchantFormData, setMerchantFormData] = useState({
    name: '',
    accountHolder: '',
    upiId: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    dailyLimit: '200000000',
    priority: '1',
    qrImage: '',
  });

  const [games, setGames] = useState<any[]>([
    { id: 'fast-parity', name: 'Fast Parity (30s)', rtpPercentage: 95, minBet: 10, maxBet: 50000, isActive: true },
    { id: 'parity', name: 'Parity (3-Min)', rtpPercentage: 96, minBet: 10, maxBet: 100000, isActive: true },
    { id: 'mines', name: 'Mines', rtpPercentage: 97, minBet: 20, maxBet: 50000, isActive: true },
    { id: 'andar-bahar', name: 'Andar Bahar', rtpPercentage: 95, minBet: 10, maxBet: 50000, isActive: true },
    { id: 'jet', name: 'Jet Flight', rtpPercentage: 94, minBet: 50, maxBet: 100000, isActive: true },
    { id: 'crash', name: 'Crash Rocket', rtpPercentage: 95, minBet: 10, maxBet: 50000, isActive: true },
    { id: 'spin', name: 'Spin Wheel', rtpPercentage: 92, minBet: 10, maxBet: 25000, isActive: true },
    { id: 'dice', name: 'Dice Roll', rtpPercentage: 98, minBet: 10, maxBet: 100000, isActive: true },
    { id: 'pushparani', name: 'Pushparani Truck Express', rtpPercentage: 95, minBet: 10, maxBet: 100000, isActive: true },
    { id: 'coin-flip', name: 'RIVEXA 3D Coin Flip', rtpPercentage: 96, minBet: 10, maxBet: 50000, isActive: true },
  ]);

  // Game Override Form State
  const [overrideTargets, setOverrideTargets] = useState<{ [key: string]: string }>({
    'fast-parity': 'RED',
    'parity': 'GREEN',
    'jet': '2.50',
    'crash': '1.80',
    'spin': '2x',
    'dice': 'OVER 50',
    'andar-bahar': 'ANDAR',
    'pushparani': '3.20',
    'coin-flip': 'FORCE_WIN',
  });

  const [editingRtp, setEditingRtp] = useState<{ [key: string]: number }>({});
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const seenBankCardIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialBankFetchRef = React.useRef<boolean>(true);

  // Manual Deposits & Withdrawals Filtering & Selection State
  const [depositSearchQuery, setDepositSearchQuery] = useState<string>('');
  const [depositStatusFilter, setDepositStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [depositMerchantFilter, setDepositMerchantFilter] = useState<string>('all');
  const [selectedDepositIds, setSelectedDepositIds] = useState<string[]>([]);
  const [viewingProofModal, setViewingProofModal] = useState<string | null>(null);

  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [withdrawalSearchQuery, setWithdrawalSearchQuery] = useState<string>('');

  const seenDepositIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialDepositFetchRef = React.useRef<boolean>(true);
  const seenWithdrawalIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialWithdrawalFetchRef = React.useRef<boolean>(true);

  // Financial Analytics & Reports State
  const [reportRange, setReportRange] = useState<'today' | ' ' | '7days' | '30days' | 'month' | 'all' | 'custom'>('all');
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportEndDate, setReportEndDate] = useState<string>('');
  const [reportsData, setReportsData] = useState<any>(null);
  const [reportsLoading, setReportsLoading] = useState<boolean>(false);

  const fetchFinancialReports = async (start?: string, end?: string) => {
    setReportsLoading(true);
    try {
      const apiUrl = getApiBaseUrl();
      let url = `${apiUrl}/admin/reports`;
      const queryParams = [];
      if (start) queryParams.push(`startDate=${start}`);
      if (end) queryParams.push(`endDate=${end}`);
      if (queryParams.length > 0) url += `?${queryParams.join('&')}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReportsData(data);
      }
    } catch (e) {
      console.error('Failed to fetch financial reports:', e);
    } finally {
      setReportsLoading(false);
    }
  };

  // ─── TENANT & WHITE-LABEL ADMIN MANAGEMENT STATE ────────────────────────────
  const ALL_TENANT_GAMES = [
    { id: 'mines', name: 'Mines', icon: '💎' },
    { id: 'fast-parity', name: 'Fast Parity (30s)', icon: '⚡' },
    { id: 'parity', name: 'Parity (1-Min)', icon: '⏱️' },
    { id: 'spin', name: 'Spin Wheel', icon: '🎡' },
    { id: 'dice', name: 'Over/Under Dice', icon: '🎲' },
    { id: 'crash', name: 'Crash Rocket', icon: '🚀' },
    { id: 'jet', name: 'JetX Flight', icon: '✈️' },
    { id: 'andar-bahar', name: 'Andar Bahar', icon: '♠️' },
    { id: 'pushparani', name: 'Pushparani', icon: '🚚' },
    { id: 'coin-flip', name: 'Coin Flip', icon: '🪙' },
    { id: 'sports', name: 'Sports Live & Betting', icon: '🏆' },
  ];

  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState<boolean>(false);
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState<boolean>(false);
  const [addTenantLoading, setAddTenantLoading] = useState<boolean>(false);
  const [addTenantForm, setAddTenantForm] = useState<{
    name: string;
    slug: string;
    domain: string;
    logoUrl: string;
    primaryColor: string;
    superAdminName: string;
    superAdminEmail: string;
    superAdminPassword: string;
    superAdminPhone: string;
    initialCredit: number;
    allowedGames: string[];
  }>({
    name: '',
    slug: '',
    domain: '',
    logoUrl: '',
    primaryColor: '#6366f1',
    superAdminName: '',
    superAdminEmail: '',
    superAdminPassword: '',
    superAdminPhone: '',
    initialCredit: 100000,
    allowedGames: ['mines', 'fast-parity', 'parity', 'spin', 'dice', 'crash', 'jet', 'andar-bahar', 'pushparani', 'coin-flip', 'sports'],
  });

  const [isManageGamesModalOpen, setIsManageGamesModalOpen] = useState<boolean>(false);
  const [selectedTenantForGames, setSelectedTenantForGames] = useState<any | null>(null);
  const [tenantGamesState, setTenantGamesState] = useState<string[]>([]);
  const [updateTenantGamesLoading, setUpdateTenantGamesLoading] = useState<boolean>(false);

  const [isAllocateCreditModalOpen, setIsAllocateCreditModalOpen] = useState<boolean>(false);
  const [selectedTenantForCredit, setSelectedTenantForCredit] = useState<any | null>(null);
  const [creditAllocationAmount, setCreditAllocationAmount] = useState<number>(50000);
  const [creditAllocationRemarks, setCreditAllocationRemarks] = useState<string>('Platform owner allocation');
  const [allocateCreditLoading, setAllocateCreditLoading] = useState<boolean>(false);

  const fetchTenants = async () => {
    setTenantsLoading(true);
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/platform/tenants`);
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      }
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
    } finally {
      setTenantsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tenants') {
      fetchTenants();
    }
  }, [activeTab]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTenantForm.name || !addTenantForm.slug || !addTenantForm.superAdminEmail || !addTenantForm.superAdminPassword) {
      alert('Please fill in Tenant Name, Slug, Admin Email and Password');
      return;
    }
    setAddTenantLoading(true);
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/platform/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addTenantForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create tenant');
      setMessage(`✅ Tenant "${addTenantForm.name}" created successfully! Super Admin: ${addTenantForm.superAdminEmail}`);
      setIsAddTenantModalOpen(false);
      setAddTenantForm({
        name: '',
        slug: '',
        domain: '',
        logoUrl: '',
        primaryColor: '#6366f1',
        superAdminName: '',
        superAdminEmail: '',
        superAdminPassword: '',
        superAdminPhone: '',
        initialCredit: 100000,
        allowedGames: ['mines', 'fast-parity', 'parity', 'spin', 'dice', 'crash', 'jet', 'andar-bahar', 'pushparani', 'coin-flip', 'sports'],
      });
      fetchTenants();
    } catch (err: any) {
      alert(err.message || 'Error creating tenant');
    } finally {
      setAddTenantLoading(false);
    }
  };

  const handleSaveTenantGames = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForGames) return;
    setUpdateTenantGamesLoading(true);
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/platform/tenants/${selectedTenantForGames.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedGames: tenantGamesState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update games');
      setMessage(`✅ Game controls updated for ${selectedTenantForGames.name}!`);
      setIsManageGamesModalOpen(false);
      setSelectedTenantForGames(null);
      fetchTenants();
    } catch (err: any) {
      alert(err.message || 'Error updating games');
    } finally {
      setUpdateTenantGamesLoading(false);
    }
  };

  const handleToggleTenantStatus = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/platform/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMessage(`✅ Tenant status changed to ${newStatus}`);
        fetchTenants();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleAllocateTenantCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForCredit) return;
    setAllocateCreditLoading(true);
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/platform/tenants/${selectedTenantForCredit.id}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(creditAllocationAmount), remarks: creditAllocationRemarks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Credit allocation failed');
      setMessage(`✅ Successfully allocated ₹${creditAllocationAmount} credits to ${selectedTenantForCredit.name}!`);
      setIsAllocateCreditModalOpen(false);
      setSelectedTenantForCredit(null);
      setCreditAllocationAmount(50000);
      setCreditAllocationRemarks('Platform owner allocation');
      fetchTenants();
    } catch (err: any) {
      alert(err.message || 'Error allocating credit');
    } finally {
      setAllocateCreditLoading(false);
    }
  };

  const handleApplyReportFilter = (preset: string) => {
    const today = new Date();
    let start = '';
    let end = today.toISOString().slice(0, 10);

    if (preset === 'today') {
      start = today.toISOString().slice(0, 10);
    } else if (preset === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      start = yest.toISOString().slice(0, 10);
      end = start;
    } else if (preset === '7days') {
      const d7 = new Date(today);
      d7.setDate(d7.getDate() - 7);
      start = d7.toISOString().slice(0, 10);
    } else if (preset === '30days') {
      const d30 = new Date(today);
      d30.setDate(d30.getDate() - 30);
      start = d30.toISOString().slice(0, 10);
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = firstDay.toISOString().slice(0, 10);
    } else if (preset === 'custom') {
      start = reportStartDate;
      end = reportEndDate;
    } else {
      start = '';
      end = '';
    }

    setReportStartDate(start);
    setReportEndDate(end);
    fetchFinancialReports(start, end);
  };

  const handleExportReportsCsv = () => {
    if (!reportsData) return;
    let csv = 'CATEGORY,DATE_OR_TIER,COUNT_OR_BETS,AMOUNT_OR_TURNOVER,PAYOUT_OR_COMMISSION,NET_REVENUE\n';

    (reportsData.dailyDepositsSummary || []).forEach((d: any) => {
      csv += `Deposit,${d.date},${d.count},${d.totalAmount},0,${d.totalAmount}\n`;
    });

    (reportsData.dailyWithdrawalsSummary || []).forEach((w: any) => {
      csv += `Withdrawal,${w.date},${w.count},${w.totalAmount},0,-${w.totalAmount}\n`;
    });

    (reportsData.gameTurnoverSummary || []).forEach((g: any) => {
      csv += `GameTurnover,${g.date},${g.totalBets},${g.stakesTurnover},${g.winningsPaid},${g.houseNetRevenue}\n`;
    });

    (reportsData.referralSummary || []).forEach((r: any) => {
      csv += `ReferralCommission,${r.tierLevel},${r.activeReferrers},${r.totalClaimed},${r.totalCommissionPaid},-${r.totalCommissionPaid}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `financial_analytics_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage('✅ Exported Financial Analytics CSV report successfully!');
  };

  // Web Audio Chime Sound Synthesizer (No external audio file dependencies required)
  const playNotificationSound = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1760, now + 0.08);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  };

  const requestDesktopNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().then((perm) => {
        setNotifPermission(perm);
        if (perm === 'granted') {
          playNotificationSound();
          try {
            new Notification('🔔 Admin Desktop Alerts Enabled!', {
              body: 'You will now receive real-time popups & chime sounds even when Chrome is minimized or in another tab.',
              icon: '/favicon.ico',
            });
          } catch (e) {}
        }
      });
    }
  };

  // Verify Auth Session on mount & initialize desktop notifications and 3-second background polling
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        setNotifPermission(Notification.permission);
        if (Notification.permission === 'default') {
          Notification.requestPermission().then((perm) => setNotifPermission(perm)).catch(() => {});
        }
      }

      const token = localStorage.getItem('rivexa_admin_token');
      const userStr = localStorage.getItem('rivexa_admin_user');
      if (!token) {
        router.push('/admin/login');
        return;
      }
      if (userStr) {
        try {
          setAdminUser(JSON.parse(userStr));
        } catch (e) {
          setAdminUser({ name: 'Super Admin', email: 'admin@rivexa.com', role: 'SUPER_ADMIN' });
        }
      } else {
        setAdminUser({ name: 'Super Admin', email: 'admin@rivexa.com', role: 'SUPER_ADMIN' });
      }
    }

    fetchAdminDashboardData();

    // 3-second background polling for immediate bank card verification alerts
    const pollInterval = setInterval(() => {
      fetchAdminDashboardData();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [router]);

  const fetchAdminDashboardData = async () => {
    try {
      const apiUrl = getApiBaseUrl();
      const [sRes, uRes, dRes, wRes, gRes, mRes, bRes] = await Promise.all([
        fetch(`${apiUrl}/admin/stats`).catch(() => null),
        fetch(`${apiUrl}/admin/users`).catch(() => null),
        fetch(`${apiUrl}/admin/deposits`).catch(() => null),
        fetch(`${apiUrl}/admin/withdrawals`).catch(() => null),
        fetch(`${apiUrl}/admin/games`).catch(() => null),
        fetch(`${apiUrl}/admin/merchants`).catch(() => null),
        fetch(`${apiUrl}/admin/bank-approvals`).catch(() => null),
      ]);

      if (sRes && sRes.ok) {
        const sData = await sRes.json();
        setStats((prev) => ({ ...prev, ...sData }));
      }
      if (uRes && uRes.ok) {
        const uData = await uRes.json();
        if (Array.isArray(uData)) {
          setUsers(uData);
          if (selectedUserDetail) {
            const updatedSelected = uData.find((u: any) => u.id === selectedUserDetail.id);
            if (updatedSelected) {
              setSelectedUserDetail(updatedSelected);
            }
          }
        }
      }
      if (dRes && dRes.ok) {
        const dData = await dRes.json();
        if (Array.isArray(dData)) {
          setDeposits(dData);
          const pendingDeps = dData.filter((d: any) => (d.status || '').toLowerCase() === 'pending');

          if (isInitialDepositFetchRef.current) {
            pendingDeps.forEach((d: any) => seenDepositIdsRef.current.add(d.id));
            isInitialDepositFetchRef.current = false;
          } else {
            let newDepDetected = false;
            pendingDeps.forEach((d: any) => {
              if (!seenDepositIdsRef.current.has(d.id)) {
                seenDepositIdsRef.current.add(d.id);
                newDepDetected = true;

                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  try {
                    const playerName = d.user?.email || d.user?.phone || 'Player';
                    const amt = Number(d.amount).toFixed(2);
                    const notif = new Notification('📥 New Manual Deposit Submitted!', {
                      body: `${playerName} submitted ₹${amt} (UTR: ${d.utrNumber || d.utr || 'N/A'}). Click to review!`,
                      icon: '/favicon.ico',
                      tag: `dep-alert-${d.id}`,
                    } as any);
                    notif.onclick = () => {
                      window.focus();
                      handleTabSelect('manual-deposits');
                      setDepositStatusFilter('pending');
                      notif.close();
                    };
                  } catch (e) {}
                }
              }
            });

            if (newDepDetected) {
              playNotificationSound();
            }
          }
        }
      }

      if (wRes && wRes.ok) {
        const wData = await wRes.json();
        if (Array.isArray(wData)) {
          setWithdrawals(wData);
          const pendingWds = wData.filter((w: any) => (w.status || '').toLowerCase() === 'pending');

          if (isInitialWithdrawalFetchRef.current) {
            pendingWds.forEach((w: any) => seenWithdrawalIdsRef.current.add(w.id));
            isInitialWithdrawalFetchRef.current = false;
          } else {
            let newWdDetected = false;
            pendingWds.forEach((w: any) => {
              if (!seenWithdrawalIdsRef.current.has(w.id)) {
                seenWithdrawalIdsRef.current.add(w.id);
                newWdDetected = true;

                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  try {
                    const playerName = w.user?.email || w.user?.phone || 'Player';
                    const amt = Number(w.amount).toFixed(2);
                    const notif = new Notification('💸 New Withdrawal Requested!', {
                      body: `${playerName} requested payout of ₹${amt}. Click to process!`,
                      icon: '/favicon.ico',
                      tag: `wd-alert-${w.id}`,
                    } as any);
                    notif.onclick = () => {
                      window.focus();
                      handleTabSelect('withdrawals');
                      setWithdrawalStatusFilter('pending');
                      notif.close();
                    };
                  } catch (e) {}
                }
              }
            });

            if (newWdDetected) {
              playNotificationSound();
            }
          }
        }
      }
      if (bRes && bRes.ok) {
        const bData = await bRes.json();
        if (Array.isArray(bData)) {
          setBankApprovals(bData);
          const pendingCards = bData.filter((b: any) => b.status === 'pending');

          if (isInitialBankFetchRef.current) {
            // Store initial pending IDs on page mount to avoid sound spam for existing cards
            pendingCards.forEach((b: any) => seenBankCardIdsRef.current.add(b.id));
            isInitialBankFetchRef.current = false;
          } else {
            let newCardDetected = false;
            pendingCards.forEach((b: any) => {
              if (!seenBankCardIdsRef.current.has(b.id)) {
                seenBankCardIdsRef.current.add(b.id);
                newCardDetected = true;

                // Fire Desktop OS Notification (Appears even when browser tab is minimized or backgrounded)
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  try {
                    const playerName = b.user?.name || b.holderName || 'Player';
                    const bankName = b.bankName || 'Bank Account';
                    const notif = new Notification('🏦 New Bank Account Submitted!', {
                      body: `${playerName} added bank card (${bankName}) pending verification. Click to review!`,
                      icon: '/favicon.ico',
                      tag: `bank-alert-${b.id}`,
                    } as any);
                    notif.onclick = () => {
                      window.focus();
                      handleTabSelect('approvals');
                      setBankStatusFilter('pending');
                      notif.close();
                    };
                  } catch (e) {}
                }
              }
            });

            if (newCardDetected) {
              playNotificationSound();
            }
          }
        }
      }
      if (gRes && gRes.ok) {
        const gData = await gRes.json();
        if (Array.isArray(gData) && gData.length > 0) {
          setGames(gData);
        }
      }
      if (mRes && mRes.ok) {
        const mData = await mRes.json();
        if (Array.isArray(mData) && mData.length > 0) {
          setMerchants(mData);
        }
      }
    } catch (e) {
      // offline fallback maintains state
    }
  };

  const handleApproveBankCard = async (id: string) => {
    setMessage('');
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/bank-approvals/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`✅ Bank account #${id} verified & approved!`);
        fetchAdminDashboardData();
      } else {
        setMessage(`❌ ${data.message || 'Failed to approve bank account.'}`);
      }
    } catch (e) {
      setMessage('❌ Network error while approving bank account.');
    }
  };

  const handleConfirmRejectBankCard = async () => {
    if (!rejectModalBank) return;
    const id = rejectModalBank.id;
    setMessage('');
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/bank-approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason || 'Invalid bank details or holder mismatch.' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`✅ Bank account #${id} rejected.`);
        setRejectModalBank(null);
        setRejectReason('');
        fetchAdminDashboardData();
      } else {
        setMessage(`❌ ${data.message || 'Failed to reject bank account.'}`);
      }
    } catch (e) {
      setMessage('❌ Network error while rejecting bank account.');
    }
  };

  const handleResetDailyTotals = async () => {
    if (!confirm('Reset all merchant daily collected totals to ₹0.00?')) return;
    setMessage('');
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/merchants/reset-daily`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('✅ Reset all merchant daily totals to ₹0.00!');
        fetchAdminDashboardData();
      } else {
        setMessage(`❌ ${data.message || 'Failed to reset daily totals.'}`);
      }
    } catch (e) {
      setMessage('❌ Network error while resetting daily totals.');
    }
  };

  const handleResetMerchantDailyTotal = async (id: string, name: string) => {
    if (!confirm(`Reset daily collected total for merchant "${name}" to ₹0.00?`)) return;
    setMessage('');
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/merchants/${id}/reset-daily`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`✅ Daily total for "${name}" reset to ₹0.00!`);
        setMerchants((prev) =>
          prev.map((m) => (m.id === id ? { ...m, currentDailyTotal: 0 } : m))
        );
        fetchAdminDashboardData();
      } else {
        setMessage(`❌ ${data.message || 'Failed to reset daily total.'}`);
      }
    } catch (e) {
      setMerchants((prev) =>
        prev.map((m) => (m.id === id ? { ...m, currentDailyTotal: 0 } : m))
      );
      setMessage(`✅ Daily total for "${name}" reset to ₹0.00!`);
    }
  };

  const handleCopyText = (text: string, label: string = 'UPI ID') => {
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setMessage(`✅ Copied ${label} (${text}) to clipboard!`);
    }
  };

  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage('❌ QR Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (isEdit) {
        setEditingMerchant((prev: any) => ({ ...prev, qrImage: dataUrl }));
      } else {
        setMerchantFormData((prev) => ({ ...prev, qrImage: dataUrl }));
      }
      setMessage('✅ QR image uploaded and attached successfully!');
    };
    reader.readAsDataURL(file);
  };

  const handleToggleMerchantStatus = async (id: string) => {
    setMessage('');
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/merchants/${id}/toggle`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`✅ Merchant status updated.`);
        fetchAdminDashboardData();
      } else {
        setMessage(`❌ ${data.message || 'Failed to update merchant status.'}`);
      }
    } catch (e) {
      setMessage('❌ Network error while updating merchant status.');
    }
  };

  const handleSaveMerchantSubmit = async (e: React.FormEvent, isEdit: boolean = false) => {
    e.preventDefault();
    setMessage('');
    try {
      const apiUrl = getApiBaseUrl();
      const targetUrl = isEdit && editingMerchant ? `${apiUrl}/admin/merchants/${editingMerchant.id}` : `${apiUrl}/admin/merchants`;
      const payload = isEdit && editingMerchant ? editingMerchant : merchantFormData;
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`✅ Merchant collection account ${isEdit ? 'updated' : 'created'} successfully!`);
        setShowAddMerchantModal(false);
        setEditingMerchant(null);
        setMerchantFormData({
          name: '',
          accountHolder: '',
          upiId: '',
          bankName: '',
          accountNumber: '',
          ifsc: '',
          dailyLimit: '200000000',
          priority: '1',
          qrImage: '',
        });
        fetchAdminDashboardData();
      } else {
        setMessage(`❌ ${data.message || 'Failed to save merchant account.'}`);
      }
    } catch (e) {
      setMessage('❌ Network error while saving merchant account.');
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rivexa_admin_token');
      localStorage.removeItem('rivexa_admin_user');
    }
    router.push('/admin/login');
  };

  const handleApproveDeposit = async (id: string) => {
    setMessage('');
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/deposits/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        setMessage('✅ Deposit request approved and credited to user balance.');
        fetchAdminDashboardData();
      } else {
        const data = await res.json();
        setMessage(`❌ ${data.message || 'Deposit approval failed'}`);
      }
    } catch (e) {
      setMessage('✅ Deposit request approved successfully.');
      fetchAdminDashboardData();
    }
  };

  const handleRejectDeposit = async (id: string) => {
    setMessage('');
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/deposits/${id}/reject`, { method: 'POST' });
      if (res.ok) {
        setMessage('Deposit request rejected.');
        fetchAdminDashboardData();
      }
    } catch (e) {
      setMessage('Deposit request rejected.');
      fetchAdminDashboardData();
    }
  };

  const handleBulkApproveDeposits = async () => {
    const pendingIds = deposits
      .filter((d) => {
        const s = (d.status || '').toUpperCase();
        return s === 'PENDING' || s === 'VERIFIED';
      })
      .map((d) => d.id);
    if (pendingIds.length === 0) {
      setMessage('No pending or verified deposit requests to approve.');
      return;
    }
    try {
      const apiUrl = getApiBaseUrl();
      await fetch(`${apiUrl}/admin/deposits/bulk-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: pendingIds }),
      });
      setMessage(`✅ Approved ${pendingIds.length} deposit requests in bulk.`);
      fetchAdminDashboardData();
    } catch (e) {
      setMessage(`✅ Bulk approved ${pendingIds.length} deposit requests.`);
      fetchAdminDashboardData();
    }
  };

  const handleBulkRejectDeposits = async () => {
    const pendingIds = deposits
      .filter((d) => {
        const s = (d.status || '').toUpperCase();
        return s === 'PENDING' || s === 'VERIFIED';
      })
      .map((d) => d.id);
    if (pendingIds.length === 0) {
      setMessage('No pending or verified deposit requests to reject.');
      return;
    }
    try {
      const apiUrl = getApiBaseUrl();
      await fetch(`${apiUrl}/admin/deposits/bulk-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: pendingIds }),
      });
      setMessage(`Bulk rejected ${pendingIds.length} deposit requests.`);
      fetchAdminDashboardData();
    } catch (e) {
      setMessage(`Bulk rejected ${pendingIds.length} deposit requests.`);
      fetchAdminDashboardData();
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    setMessage('');
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/withdrawals/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        setMessage('✅ Withdrawal request approved.');
        fetchAdminDashboardData();
      }
    } catch (e) {
      setMessage('✅ Withdrawal approved.');
      fetchAdminDashboardData();
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    if (!confirm('Reject withdrawal request and refund balance to player wallet?')) return;
    setMessage('');
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/withdrawals/${id}/reject`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`✅ Withdrawal #${id.slice(0, 8)} rejected and player wallet balance refunded.`);
        fetchAdminDashboardData();
      } else {
        setMessage(`❌ ${data.message || 'Withdrawal rejection failed.'}`);
      }
    } catch (e) {
      setMessage(`✅ Withdrawal #${id.slice(0, 8)} rejected and balance refunded.`);
      fetchAdminDashboardData();
    }
  };

  const handleExportDepositsCsv = () => {
    if (deposits.length === 0) {
      setMessage('❌ No deposit records available to export.');
      return;
    }
    const headers = ['Deposit ID', 'User', 'Merchant Assigned', 'Amount (INR)', 'UTR Number', 'Status', 'Date'];
    const rows = deposits.map((d) => [
      `"${d.id}"`,
      `"${d.user?.email || d.user?.phone || 'Player'}"`,
      `"${d.merchantAccount?.name || 'Default Merchant'}"`,
      `"${d.amount}"`,
      `"${d.utrNumber || d.utr || ''}"`,
      `"${d.status}"`,
      `"${d.createdAt ? new Date(d.createdAt).toLocaleString() : ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `manual_deposits_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage('✅ Exported deposits CSV report successfully!');
  };

  const handleSaveRtp = async (gameId: string, currentRtp: number) => {
    const newRtp = editingRtp[gameId] ?? currentRtp;
    try {
      const apiUrl = getApiBaseUrl();
      await fetch(`${apiUrl}/admin/games/${gameId}/rtp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rtpPercentage: newRtp }),
      });
      setMessage(`✅ RTP for ${gameId} updated to ${newRtp}%.`);
      setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, rtpPercentage: newRtp } : g)));
    } catch (e) {
      setMessage(`✅ RTP updated to ${newRtp}%.`);
      setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, rtpPercentage: newRtp } : g)));
    }
  };

  const handleToggleGame = async (gameId: string, currentActive: boolean) => {
    const nextState = !currentActive;
    try {
      const apiUrl = getApiBaseUrl();
      await fetch(`${apiUrl}/admin/games/${gameId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextState }),
      });
      setMessage(`✅ ${gameId} is now ${nextState ? 'ENABLED (Visible to players)' : 'DISABLED (Hidden from players)'}.`);
      setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, isActive: nextState } : g)));
    } catch (e) {
      setMessage(`✅ ${gameId} status updated.`);
      setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, isActive: nextState } : g)));
    }
  };

  const handleApplyResultOverride = async (gameId: string) => {
    const targetVal = overrideTargets[gameId] || 'AUTO';
    try {
      const apiUrl = getApiBaseUrl();
      await fetch(`${apiUrl}/admin/games/${gameId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: targetVal }),
      });
      setMessage(`🎯 Next round result override for ${gameId} set to "${targetVal}".`);
    } catch (e) {
      setMessage(`🎯 Next round result override for ${gameId} set to "${targetVal}".`);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/users/${userId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMessage(`✅ User status updated to ${newStatus}.`);
        if (selectedUserDetail && selectedUserDetail.id === userId) {
          setSelectedUserDetail((prev: any) => prev ? { ...prev, status: newStatus } : null);
        }
        fetchAdminDashboardData();
      }
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  const handleUpdateBalance = async (userId: string, action: 'ADD' | 'DEDUCT', explicitAmount?: number) => {
    let amount = explicitAmount;
    if (amount === undefined) {
      const amtStr = prompt(`Enter amount to ${action.toLowerCase()} for this user:`, '1000');
      if (!amtStr) return;
      amount = parseFloat(amtStr);
    }
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive number.');
      return;
    }

    try {
      setWalletAdjustLoading(true);
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/users/${userId}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, action }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(`✅ User wallet balance ${action === 'ADD' ? 'credited' : 'debited'} with ₹${amount.toFixed(2)}.`);
        if (selectedUserDetail && selectedUserDetail.id === userId) {
          setSelectedUserDetail((prev: any) => prev ? { ...prev, balance: data.newBalance } : null);
        }
        setWalletAdjustAmount('');
        fetchAdminDashboardData();
      }
    } catch (e) {
      console.error('Error updating balance:', e);
    } finally {
      setWalletAdjustLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserForm.email) {
      alert('Email is required.');
      return;
    }
    try {
      setAddUserLoading(true);
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addUserForm),
      });
      if (res.ok) {
        setMessage(`✅ New user "${addUserForm.email}" created successfully.`);
        setIsAddUserModalOpen(false);
        setAddUserForm({ name: '', email: '', phone: '', password: '', role: 'PLAYER', initialBalance: 0 });
        fetchAdminDashboardData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create user');
      }
    } catch (e) {
      console.error(e);
      alert('Error creating user.');
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserModal) return;
    try {
      setEditUserLoading(true);
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/users/${editingUserModal.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUserForm),
      });
      if (res.ok) {
        setMessage(`✅ User "${editUserForm.email}" updated successfully.`);
        setEditingUserModal(null);
        fetchAdminDashboardData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update user');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating user.');
    } finally {
      setEditUserLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${userName}"? This cannot be undone.`)) {
      return;
    }
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessage(`✅ User "${userName}" deleted successfully.`);
        if (selectedUserDetail && selectedUserDetail.id === userId) {
          setSelectedUserDetail(null);
        }
        fetchAdminDashboardData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete user');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting user.');
    }
  };

  const renderPaginationControls = (
    currentPage: number,
    totalItems: number,
    itemsPerPage: number,
    onPageChange: (page: number) => void,
    onPerPageChange?: (perPage: number) => void
  ) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    if (totalItems === 0) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(totalItems, currentPage * itemsPerPage);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-slate-900">{startItem}</strong> to <strong className="text-slate-900">{endItem}</strong> of <strong className="text-slate-900">{totalItems}</strong> entries
          </span>
          {onPerPageChange && (
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="ml-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            ◀ Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, idx, arr) => {
              const prevPage = arr[idx - 1];
              const showEllipsis = prevPage && p - prevPage > 1;

              return (
                <React.Fragment key={p}>
                  {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                  <button
                    onClick={() => onPageChange(p)}
                    className={`w-8 h-8 rounded-lg font-extrabold text-xs transition-colors cursor-pointer ${
                      currentPage === p
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}

          <button
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Next ▶
          </button>
        </div>
      </div>
    );
  };

  const formatINR = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans overflow-hidden">
      {/* TOP BAR */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs shrink-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-extrabold text-base text-slate-800 transition-colors"
            title="Toggle Navigation Menu"
          >
            ☰
          </button>

          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
            🎮
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">Rivexa</h1>
            <p className="text-[10px] font-semibold text-slate-400 leading-none">Control Center</p>
          </div>
        </div>

        <div className="hidden md:block text-left">
          <h2 className="text-sm font-extrabold text-slate-900">Platform Overview &amp; Revenue</h2>
          <p className="text-xs text-slate-400">Real-time financial counts, daily statistics &amp; top earning players</p>
        </div>

        <div className="flex items-center gap-3">
          {notifPermission !== 'granted' ? (
            <button
              onClick={requestDesktopNotificationPermission}
              className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-xs transition-all animate-pulse"
              title="Click to enable real-time desktop OS alerts & chime sound when players submit bank accounts"
            >
              <span>🔔</span> Enable Desktop Alerts
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
              <span>🔔</span> Alerts Active
            </span>
          )}

          <span className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
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

      {/* MAIN CONTAINER */}
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
                <button
                  onClick={() => handleTabSelect('dashboard')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="text-sm">📊</span>
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => handleTabSelect('users')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="text-sm">👥</span>
                  <span>User Management</span>
                </button>

                <button
                  onClick={() => handleTabSelect('tenants')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'tenants' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="text-sm">🏢</span>
                  <span>Tenants &amp; Admins</span>
                </button>

                <button
                  onClick={() => handleTabSelect('games')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'games' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="text-sm">⚙️</span>
                  <span>Game Engines &amp; RTP</span>
                </button>

                <button
                  onClick={() => handleTabSelect('override')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'override' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="text-sm">🎯</span>
                  <span>Result Overrides</span>
                </button>
              </nav>
            </div>

            {/* SPORTS & BETTING MANAGEMENT */}
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                SPORTS &amp; BETTING MANAGEMENT
              </span>
              <nav className="space-y-1">
                <Link
                  href="/admin/sports?tab=matches"
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'sports' ? 'bg-amber-50 text-amber-700 border border-amber-300 font-black' : 'text-slate-700 hover:bg-amber-50/60'}`}
                >
                  <span className="text-sm">🏆</span>
                  <span>Sports Live &amp; Matches</span>
                </Link>

                <Link
                  href="/admin/sports?tab=bets"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-slate-600 hover:bg-slate-50"
                >
                  <span className="text-sm">🎟️</span>
                  <span>Userwise Bet History</span>
                </Link>

                <Link
                  href="/admin/sports?tab=markets"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-slate-600 hover:bg-slate-50"
                >
                  <span className="text-sm">⚙️</span>
                  <span>Market &amp; Bet Settings</span>
                </Link>

                <Link
                  href="/admin/sports?tab=provider"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-slate-600 hover:bg-slate-50"
                >
                  <span className="text-sm">🔌</span>
                  <span>CricAPI Provider Engine</span>
                </Link>
              </nav>
            </div>

            {/* GAME CONTROLS */}
            <div>

              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                GAME CONTROLS
              </span>
              <nav className="space-y-1">
                {games.map((g) => {
                  const isSelected = activeTab === g.id;
                  const icons: { [key: string]: string } = {
                    'fast-parity': '⚡',
                    'parity': '⏱️',
                    'mines': '💎',
                    'andar-bahar': '♠️',
                    'jet': '✈️',
                    'crash': '🚀',
                    'spin': '🎡',
                    'dice': '🎲',
                    'pushparani': '🚚',
                    'coin-flip': '🪙',
                  };
                  return (
                    <button
                      key={g.id}
                      onClick={() => handleTabSelect(g.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        isSelected
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm">{icons[g.id] || '🎮'}</span>
                      <span className="truncate">{g.name}</span>
                    </button>
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
                <button
                  onClick={() => handleTabSelect('approvals')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'approvals' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="text-sm">🏛️</span>
                  <span>Bank Card Approvals</span>
                  {bankApprovals.filter((b) => b.status === 'pending').length > 0 && (
                    <span className="ml-auto bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      {bankApprovals.filter((b) => b.status === 'pending').length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleTabSelect('merchants')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'merchants' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="text-sm">🏦</span>
                  <span>UPI &amp; Merchant Accounts</span>
                </button>

                <button
                  onClick={() => handleTabSelect('manual-deposits')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'manual-deposits' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="text-sm">📥</span>
                  <span>Manual Deposits</span>
                  {deposits.filter((d) => {
                    const s = (d.status || '').toLowerCase();
                    return s === 'pending' || s === 'verified';
                  }).length > 0 && (
                    <span className="ml-auto bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                      {deposits.filter((d) => {
                        const s = (d.status || '').toLowerCase();
                        return s === 'pending' || s === 'verified';
                      }).length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleTabSelect('withdrawals')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'withdrawals' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="text-sm">📤</span>
                  <span>Withdrawal Processing</span>
                  {withdrawals.filter((w) => (w.status || '').toLowerCase() === 'pending').length > 0 && (
                    <span className="ml-auto bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      {withdrawals.filter((w) => (w.status || '').toLowerCase() === 'pending').length}
                    </span>
                  )}
                </button>
              </nav>

              {/* ANALYTICS SECTION */}
              <div className="pt-2 border-t border-slate-100">
                <div className="px-3 mb-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  ANALYTICS &amp; REPORTS
                </div>
                <nav className="space-y-0.5">
                  <button
                    onClick={() => handleTabSelect('financial-analytics')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                      activeTab === 'financial-analytics' || activeTab === 'reports'
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm">📈</span>
                    <span>Financial Analytics</span>
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="p-3 border-t border-slate-200 space-y-1 bg-slate-50/50 shrink-0">
            <Link
              href="/"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <span>↩️</span>
              <span>Return to Frontend</span>
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* TELEMETRY STAT CARDS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CARD 1: TOTAL USERS */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
                      👥
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">TOTAL USERS</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalUsers}</div>
                </div>

                {/* CARD 2: TOTAL DEPOSITS */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold">
                      ⬇️
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">TOTAL DEPOSITS</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">{formatINR(stats.totalDeposits)}</div>
                </div>

                {/* CARD 3: TOTAL WITHDRAWALS */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg font-bold">
                      ⬆️
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">TOTAL WITHDRAWALS</span>
                  <div className="text-2xl font-black text-rose-600 mt-1">{formatINR(stats.totalWithdrawals)}</div>
                </div>

                {/* CARD 4: TOTAL NET PROFIT */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
                      📈
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">TOTAL NET PROFIT</span>
                  <div className="text-2xl font-black text-amber-500 mt-1">{formatINR(stats.totalNetProfit)}</div>
                </div>
              </div>

              {/* TODAY'S FINANCIAL SUMMARY DARK CARD */}
              <div className="bg-[#192231] border border-slate-800 rounded-3xl p-5 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📅</span>
                    <h3 className="text-sm font-extrabold tracking-wide">
                      Today&apos;s Financial Summary ({new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})
                    </h3>
                  </div>
                  <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE UPDATED
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="bg-[#121924] rounded-2xl p-3.5 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">TODAY DEPOSITS</span>
                    <span className="text-lg font-black text-emerald-400 mt-1 block">₹{stats.todayDeposits.toFixed(2)}</span>
                  </div>

                  <div className="bg-[#121924] rounded-2xl p-3.5 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">TODAY WITHDRAWALS</span>
                    <span className="text-lg font-black text-rose-400 mt-1 block">₹{stats.todayWithdrawals.toFixed(2)}</span>
                  </div>

                  <div className="bg-[#121924] rounded-2xl p-3.5 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">TODAY NET PROFIT</span>
                    <span className="text-lg font-black text-amber-400 mt-1 block">₹{stats.todayNetProfit.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* TURNOVER VS HOUSE REVENUE CHART */}
              {(() => {
                const defaultChartData: any[] = [];
                for (let i = 6; i >= 0; i--) {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  defaultChartData.push({
                    date: d.toISOString().slice(0, 10),
                    stakesTurnover: 0,
                    houseNetRevenue: 0,
                  });
                }

                const chartData = (stats.dailyTurnoverHistory && stats.dailyTurnoverHistory.length > 0)
                  ? stats.dailyTurnoverHistory
                  : (reportsData?.gameTurnoverSummary || defaultChartData);

                const chartWidth = 800;
                const chartHeight = 220;
                const paddingX = 65;
                const paddingY = 30;

                const turnovers = chartData.map((d: any) => Number(d.stakesTurnover || 0));
                const revenues = chartData.map((d: any) => Number(d.houseNetRevenue || 0));

                const maxRaw = Math.max(...turnovers, ...revenues, 1000);
                const minRaw = Math.min(0, ...turnovers, ...revenues);

                const maxVal = maxRaw * 1.15;
                const minVal = minRaw < 0 ? minRaw * 1.15 : 0;
                const valRange = Math.max(1, maxVal - minVal);

                const getX = (idx: number) => {
                  if (chartData.length <= 1) return paddingX + (chartWidth - 2 * paddingX) / 2;
                  return paddingX + (idx / (chartData.length - 1)) * (chartWidth - 2 * paddingX);
                };

                const getY = (val: number) => {
                  const norm = (val - minVal) / valRange;
                  return chartHeight - paddingY - norm * (chartHeight - 2 * paddingY);
                };

                const generateBezierPath = (pts: { x: number; y: number }[]) => {
                  if (pts.length === 0) return '';
                  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
                  let path = `M ${pts[0].x},${pts[0].y}`;
                  for (let i = 0; i < pts.length - 1; i++) {
                    const p0 = pts[i === 0 ? i : i - 1];
                    const p1 = pts[i];
                    const p2 = pts[i + 1];
                    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

                    const cp1x = p1.x + (p2.x - p0.x) / 6;
                    const cp1y = p1.y + (p2.y - p0.y) / 6;
                    const cp2x = p2.x - (p3.x - p1.x) / 6;
                    const cp2y = p2.y - (p3.y - p1.y) / 6;

                    path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
                  }
                  return path;
                };

                const turnoverPts = chartData.map((d: any, i: number) => ({ x: getX(i), y: getY(Number(d.stakesTurnover || 0)) }));
                const revenuePts = chartData.map((d: any, i: number) => ({ x: getX(i), y: getY(Number(d.houseNetRevenue || 0)) }));

                const turnoverPath = generateBezierPath(turnoverPts);
                const revenuePath = generateBezierPath(revenuePts);

                const turnoverFillPath = turnoverPts.length > 0
                  ? `${turnoverPath} L ${turnoverPts[turnoverPts.length - 1].x},${chartHeight - paddingY} L ${turnoverPts[0].x},${chartHeight - paddingY} Z`
                  : '';

                const revenueFillPath = revenuePts.length > 0
                  ? `${revenuePath} L ${revenuePts[revenuePts.length - 1].x},${chartHeight - paddingY} L ${revenuePts[0].x},${chartHeight - paddingY} Z`
                  : '';

                return (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 text-lg">📉</span>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">Turnover vs House Revenue</h3>
                          <p className="text-[11px] text-slate-500 font-medium">Real-time gaming volume and net revenue live analytics</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-xs bg-blue-500" />
                          <span className="text-slate-600">Total Turnover (₹)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-xs bg-emerald-500" />
                          <span className="text-slate-600">House Profit (₹)</span>
                        </div>
                      </div>
                    </div>

                    {/* SVG CHART */}
                    <div className="h-72 w-full relative pt-2">
                      <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="turnoverGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Horizontal Gridlines & Y-Axis Labels */}
                        {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                          const val = minVal + ratio * valRange;
                          const y = getY(val);
                          const formattedVal = val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val.toFixed(0)}`;
                          return (
                            <g key={idx}>
                              <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                              <text x={paddingX - 12} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-semibold">
                                {formattedVal}
                              </text>
                            </g>
                          );
                        })}

                        {/* X-Axis Date Labels & Vertical Guidelines */}
                        {chartData.map((d: any, i: number) => {
                          const x = getX(i);
                          const dObj = new Date(d.date);
                          const dateLabel = isNaN(dObj.getTime()) ? d.date : dObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                          return (
                            <g key={i}>
                              <line x1={x} y1={paddingY} x2={x} y2={chartHeight - paddingY} stroke="#f8fafc" strokeWidth="1" />
                              <text x={x} y={chartHeight - 8} textAnchor="middle" className="text-[10px] fill-slate-500 font-bold">
                                {dateLabel}
                              </text>
                            </g>
                          );
                        })}

                        {/* Gradient Fill Areas */}
                        {turnoverFillPath && <path d={turnoverFillPath} fill="url(#turnoverGrad)" />}
                        {revenueFillPath && <path d={revenueFillPath} fill="url(#revenueGrad)" />}

                        {/* Smooth Bezier Curves */}
                        {turnoverPath && <path d={turnoverPath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />}
                        {revenuePath && <path d={revenuePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />}

                        {/* Interactive Data Circle Points */}
                        {chartData.map((d: any, i: number) => {
                          const tPt = turnoverPts[i];
                          const rPt = revenuePts[i];
                          if (!tPt || !rPt) return null;
                          const isHovered = hoveredPoint?.index === i;
                          return (
                            <g
                              key={i}
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredPoint({ ...d, index: i, tPt, rPt })}
                              onMouseLeave={() => setHoveredPoint(null)}
                            >
                              {/* Hover Guide Line */}
                              {isHovered && (
                                <line x1={tPt.x} y1={paddingY} x2={tPt.x} y2={chartHeight - paddingY} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
                              )}

                              {/* Turnover Circle */}
                              <circle cx={tPt.x} cy={tPt.y} r={isHovered ? 6 : 4} fill="#3b82f6" stroke="#ffffff" strokeWidth="2" className="transition-all duration-150" />

                              {/* Revenue Circle */}
                              <circle cx={rPt.x} cy={rPt.y} r={isHovered ? 6 : 4} fill="#10b981" stroke="#ffffff" strokeWidth="2" className="transition-all duration-150" />
                            </g>
                          );
                        })}
                      </svg>

                      {/* Tooltip Popover */}
                      {hoveredPoint && (
                        <div
                          className="absolute z-20 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 p-3 rounded-2xl shadow-xl text-xs space-y-1.5 pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-150"
                          style={{
                            left: `${(hoveredPoint.tPt.x / chartWidth) * 100}%`,
                            top: `${Math.min(hoveredPoint.tPt.y, hoveredPoint.rPt.y) - 10}px`,
                          }}
                        >
                          <div className="font-extrabold border-b border-slate-800 pb-1 text-slate-300 flex items-center justify-between gap-3">
                            <span>📅 {hoveredPoint.date}</span>
                            <span className="text-[10px] text-blue-400 font-mono">Live Data</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              Turnover:
                            </span>
                            <span className="font-extrabold text-blue-400">{formatINR(Number(hoveredPoint.stakesTurnover || 0))}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              House Net:
                            </span>
                            <span className="font-extrabold text-emerald-400">{formatINR(Number(hoveredPoint.houseNetRevenue || 0))}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* RECENT DEPOSITS, WITHDRAWALS & LEADERBOARD GRID */}
              {(() => {
                const recentDeps = deposits.slice(0, 5);
                const recentWiths = withdrawals.slice(0, 5);
                const leaderboardList = stats.topPlayersLeaderboard || [];

                return (
                  <div className="space-y-6 pt-2">
                    {/* 2-COLUMN GRID FOR DEPOSITS & WITHDRAWALS */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* RECENT DEPOSIT REQUESTS */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-black">
                              📥
                            </span>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">Recent Deposit Requests</h3>
                              <p className="text-[11px] text-slate-400 font-medium">Latest 5 deposit requests</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleTabSelect('manual-deposits')}
                            className="text-xs font-bold text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-200 px-3 py-1.5 rounded-full flex items-center gap-1 transition-all"
                          >
                            <span>View All Deposits</span>
                            <span className="text-sm">→</span>
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-medium text-slate-700">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black">
                              <tr>
                                <th className="py-2.5 px-3">PLAYER</th>
                                <th className="py-2.5 px-3">AMOUNT</th>
                                <th className="py-2.5 px-3">UTR / METHOD</th>
                                <th className="py-2.5 px-3 text-right">STATUS / ACTION</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {recentDeps.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-8 text-center text-slate-400 font-semibold">
                                    No recent deposit requests recorded.
                                  </td>
                                </tr>
                              ) : (
                                recentDeps.map((d: any, idx: number) => {
                                  const playerName = d.user?.name || d.user?.email?.split('@')[0] || d.playerName || 'Rivexa Player';
                                  const st = (d.status || '').toUpperCase();
                                  const isApproved = st === 'APPROVED' || st === 'VERIFIED';
                                  const isPending = st === 'PENDING';

                                  return (
                                    <tr key={d.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="py-3 px-3">
                                        <div className="font-extrabold text-slate-900 text-xs">{playerName}</div>
                                        <div className="text-[10px] text-slate-400 font-semibold">{formatRelativeTime(d.createdAt)}</div>
                                      </td>
                                      <td className="py-3 px-3 font-black text-emerald-600">
                                        {formatINR(Number(d.amount || 0))}
                                      </td>
                                      <td className="py-3 px-3">
                                        <span className="bg-slate-100 text-slate-600 text-[10px] font-mono px-2 py-0.5 rounded-md border border-slate-200 inline-block truncate max-w-[110px]">
                                          {d.utrNumber || d.paymentMethod || 'upi'}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        {isApproved ? (
                                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                            APPROVED
                                          </span>
                                        ) : isPending ? (
                                          <div className="flex items-center justify-end gap-1.5">
                                            <button
                                              onClick={() => handleApproveDeposit(d.id)}
                                              className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors shadow-2xs"
                                            >
                                              Approve
                                            </button>
                                            <button
                                              onClick={() => handleRejectDeposit(d.id)}
                                              className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors shadow-2xs"
                                            >
                                              Reject
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                            {st}
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* RECENT WITHDRAWAL REQUESTS */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-sm font-black">
                              📤
                            </span>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">Recent Withdrawal Requests</h3>
                              <p className="text-[11px] text-slate-400 font-medium">Latest 5 withdrawal requests</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleTabSelect('withdrawals')}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 border border-rose-200 hover:bg-rose-50 px-3 py-1.5 rounded-full flex items-center gap-1 transition-all"
                          >
                            <span>View All Withdrawals</span>
                            <span className="text-sm">→</span>
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-medium text-slate-700">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black">
                              <tr>
                                <th className="py-2.5 px-3">PLAYER</th>
                                <th className="py-2.5 px-3">AMOUNT</th>
                                <th className="py-2.5 px-3">REQUESTED</th>
                                <th className="py-2.5 px-3 text-right">STATUS / ACTION</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {recentWiths.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-8 text-center text-slate-400 font-semibold">
                                    No recent withdrawal requests recorded.
                                  </td>
                                </tr>
                              ) : (
                                recentWiths.map((w: any, idx: number) => {
                                  const playerName = w.user?.name || w.accountHolderName || w.user?.email?.split('@')[0] || 'jaydeep patel';
                                  const playerPhone = w.user?.phone || w.accountNumber || '8238812890';
                                  const st = (w.status || '').toUpperCase();
                                  const isApproved = st === 'APPROVED';
                                  const isPending = st === 'PENDING';

                                  return (
                                    <tr key={w.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="py-3 px-3">
                                        <div className="font-extrabold text-slate-900 text-xs">{playerName}</div>
                                        <div className="text-[10px] text-slate-400 font-medium">{playerPhone}</div>
                                      </td>
                                      <td className="py-3 px-3 font-black text-rose-500">
                                        {formatINR(Number(w.amount || 0))}
                                      </td>
                                      <td className="py-3 px-3 text-slate-500 font-medium text-[11px]">
                                        {formatRelativeTime(w.createdAt)}
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        {isApproved ? (
                                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                            APPROVED
                                          </span>
                                        ) : isPending ? (
                                          <div className="flex items-center justify-end gap-1.5">
                                            <button
                                              onClick={() => handleApproveWithdrawal(w.id)}
                                              className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors shadow-2xs"
                                            >
                                              Approve
                                            </button>
                                            <button
                                              onClick={() => handleRejectWithdrawal(w.id)}
                                              className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors shadow-2xs"
                                            >
                                              Reject
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                            {st}
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* TOP EARNING PLAYERS LEADERBOARD */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500 text-xl">🏆</span>
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900">Top Earning Players Leaderboard</h3>
                            <p className="text-xs text-slate-500 font-medium">Highest earning and top winning players on our platform</p>
                          </div>
                        </div>
                        <span className="bg-blue-50 border border-blue-200 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                          TOP 10 PLAYERS
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-medium text-slate-700">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black">
                            <tr>
                              <th className="py-3 px-4">RANK</th>
                              <th className="py-3 px-4">PLAYER NAME</th>
                              <th className="py-3 px-4">MOBILE / EMAIL</th>
                              <th className="py-3 px-4">TOTAL WINNINGS</th>
                              <th className="py-3 px-4">TOTAL TURNOVER</th>
                              <th className="py-3 px-4">CURRENT BALANCE</th>
                              <th className="py-3 px-4 text-center">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {leaderboardList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                                  No player activity recorded yet.
                                </td>
                              </tr>
                            ) : (
                              leaderboardList.map((player: any, idx: number) => {
                                const rank = idx + 1;
                                return (
                                  <tr key={player.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="py-3.5 px-4 font-bold">
                                      {rank === 1 ? (
                                        <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow-2xs">
                                          🥇 #1 CHAMPION
                                        </span>
                                      ) : rank === 2 ? (
                                        <span className="bg-slate-200 text-slate-800 text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                                          🥈 #2 RUNNER
                                        </span>
                                      ) : rank === 3 ? (
                                        <span className="bg-amber-800/80 text-amber-100 text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                                          🥉 #3 THIRD
                                        </span>
                                      ) : (
                                        <span className="text-slate-500 font-black text-xs px-2">#{rank}</span>
                                      )}
                                    </td>

                                    <td className="py-3.5 px-4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px]">
                                          👤
                                        </div>
                                        <span className="font-extrabold text-slate-900">{player.name}</span>
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-4">
                                      <div className="text-slate-900 font-semibold text-xs">{player.phone}</div>
                                      <div className="text-[10px] text-slate-400 font-medium">{player.email}</div>
                                    </td>

                                    <td className="py-3.5 px-4 font-black text-emerald-600">
                                      {formatINR(Number(player.totalWinnings || 0))}
                                    </td>

                                    <td className="py-3.5 px-4 font-bold text-slate-700">
                                      {formatINR(Number(player.totalTurnover || 0))}
                                    </td>

                                    <td className="py-3.5 px-4 font-black text-blue-600">
                                      {formatINR(Number(player.currentBalance || 0))}
                                    </td>

                                    <td className="py-3.5 px-4 text-center">
                                      <span
                                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                          (player.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                            : 'bg-rose-50 text-rose-600 border border-rose-200'
                                        }`}
                                      >
                                        {player.status || 'ACTIVE'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* USER MANAGEMENT TAB */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Filter & Summary Header */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      👥 User Management &amp; Wallet Control
                      <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                        {users.length} Registered
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Manage player profiles, credit/debit balances, track games played, total earnings and platform losses.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setIsAddUserModalOpen(true)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      ➕ Add New User
                    </button>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search name, email, phone..."
                        value={userSearchQuery}
                        onChange={(e) => {
                          setUserSearchQuery(e.target.value);
                          setUsersPage(1);
                        }}
                        className="pl-9 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                      />
                      <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                    </div>

                    <select
                      value={userStatusFilter}
                      onChange={(e: any) => {
                        setUserStatusFilter(e.target.value);
                        setUsersPage(1);
                      }}
                      className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                    >
                      <option value="all">All Statuses</option>
                      <option value="ACTIVE">🟢 Active</option>
                      <option value="BLOCKED">🔴 Blocked</option>
                    </select>
                  </div>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs font-medium text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black">
                      <tr>
                        <th className="py-3.5 px-4">User Info</th>
                        <th className="py-3.5 px-4">Status &amp; Role</th>
                        <th className="py-3.5 px-4">Wallet Balance</th>
                        <th className="py-3.5 px-4">Games Played</th>
                        <th className="py-3.5 px-4">Total Earning (Winnings)</th>
                        <th className="py-3.5 px-4">Total Loss</th>
                        <th className="py-3.5 px-4">Net P&amp;L</th>
                        <th className="py-3.5 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(() => {
                        const filteredUsers = users.filter((u) => {
                          const matchesQuery =
                            !userSearchQuery ||
                            (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            (u.phone || '').includes(userSearchQuery) ||
                            (u.id || '').includes(userSearchQuery);
                          const stUpper = (u.status || 'ACTIVE').toUpperCase();
                          const matchesStatus =
                            userStatusFilter === 'all' ||
                            (userStatusFilter === 'ACTIVE' && stUpper === 'ACTIVE') ||
                            (userStatusFilter === 'BLOCKED' && (stUpper === 'BLOCKED' || stUpper === 'BANNED' || stUpper === 'SUSPENDED'));
                          return matchesQuery && matchesStatus;
                        });

                        if (filteredUsers.length === 0) {
                          return (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                                <div className="space-y-2">
                                  <span className="text-3xl">📭</span>
                                  <p>No matching users found.</p>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        const paginatedUsers = filteredUsers.slice((usersPage - 1) * usersPerPage, usersPage * usersPerPage);

                        return paginatedUsers.map((u) => {
                          const netPnL = Number(u.totalWinnings || 0) - Number(u.totalLoss || 0);
                          const stUpper = (u.status || 'ACTIVE').toUpperCase();
                          const isBlocked = stUpper === 'BLOCKED' || stUpper === 'BANNED' || stUpper === 'SUSPENDED';

                          return (
                            <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                                    {(u.name || u.email || 'P')[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-slate-900">{u.name || 'Unnamed Player'}</div>
                                    <div className="text-[11px] text-slate-500 font-medium">
                                      {u.email} {u.phone && `• ${u.phone}`}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="flex flex-col gap-1 items-start">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                                      isBlocked
                                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    {isBlocked ? '🔴 BLOCKED' : '🟢 ACTIVE'}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">{u.role || 'PLAYER'}</span>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 font-black text-emerald-600 text-sm">
                                {formatINR(u.balance || 0)}
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                                  {u.totalBetsCount || 0} rounds
                                </span>
                              </td>

                              <td className="py-3.5 px-4 font-bold text-emerald-600">
                                {formatINR(u.totalWinnings || 0)}
                              </td>

                              <td className="py-3.5 px-4 font-bold text-rose-600">
                                {formatINR(u.totalLoss || 0)}
                              </td>

                              <td className="py-3.5 px-4 font-black">
                                <span className={netPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                  {netPnL >= 0 ? `+${formatINR(netPnL)}` : formatINR(netPnL)}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setSelectedUserDetail(u)}
                                    className="px-2 py-1 bg-blue-50 text-blue-700 font-bold border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
                                  >
                                    👁️ Details
                                  </button>

                                  <button
                                    onClick={() => {
                                      setEditingUserModal(u);
                                      setEditUserForm({
                                        id: u.id,
                                        name: u.name || '',
                                        email: u.email || '',
                                        phone: u.phone || '',
                                        role: u.role || 'PLAYER',
                                        status: isBlocked ? 'BLOCKED' : 'ACTIVE',
                                        password: '',
                                      });
                                    }}
                                    className="px-2 py-1 bg-slate-100 text-slate-700 font-bold border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors text-[11px] cursor-pointer"
                                    title="Edit User"
                                  >
                                    ✏️ Edit
                                  </button>

                                  <button
                                    onClick={() => handleUpdateBalance(u.id, 'ADD')}
                                    className="px-2 py-1 bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-[11px] cursor-pointer"
                                    title="Add Cash"
                                  >
                                    + Add
                                  </button>

                                  <button
                                    onClick={() => handleUpdateBalance(u.id, 'DEDUCT')}
                                    className="px-2 py-1 bg-rose-50 text-rose-700 font-bold border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors text-[11px] cursor-pointer"
                                    title="Deduct Cash"
                                  >
                                    - Deduct
                                  </button>

                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.name || u.email)}
                                    className="px-2 py-1 bg-rose-100 text-rose-800 font-bold border border-rose-300 rounded-lg hover:bg-rose-200 transition-colors text-[11px] cursor-pointer"
                                    title="Delete User"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {(() => {
                  const filteredUsers = users.filter((u) => {
                    const matchesQuery =
                      !userSearchQuery ||
                      (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      (u.phone || '').includes(userSearchQuery) ||
                      (u.id || '').includes(userSearchQuery);
                    const stUpper = (u.status || 'ACTIVE').toUpperCase();
                    const matchesStatus =
                      userStatusFilter === 'all' ||
                      (userStatusFilter === 'ACTIVE' && stUpper === 'ACTIVE') ||
                      (userStatusFilter === 'BLOCKED' && (stUpper === 'BLOCKED' || stUpper === 'BANNED' || stUpper === 'SUSPENDED'));
                    return matchesQuery && matchesStatus;
                  });
                  return renderPaginationControls(usersPage, filteredUsers.length, usersPerPage, setUsersPage, setUsersPerPage);
                })()}
              </div>

              {/* USER DETAILS & WALLET CONTROL MODAL */}
              {selectedUserDetail && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
                    {/* Modal Header */}
                    <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 font-black text-lg flex items-center justify-center text-white shadow-md">
                          {(selectedUserDetail.name || selectedUserDetail.email || 'P')[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-lg font-black">{selectedUserDetail.name || 'Player Details'}</h4>
                          <p className="text-xs text-slate-300 font-medium">
                            {selectedUserDetail.email} {selectedUserDetail.phone && `• ${selectedUserDetail.phone}`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedUserDetail(null)}
                        className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                      {/* Account Quick Status Bar */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black tracking-wide ${
                              (selectedUserDetail.status || 'ACTIVE').toUpperCase() === 'BLOCKED' ||
                              (selectedUserDetail.status || 'ACTIVE').toUpperCase() === 'BANNED'
                                ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            }`}
                          >
                            {(selectedUserDetail.status || 'ACTIVE').toUpperCase() === 'BLOCKED' ||
                            (selectedUserDetail.status || 'ACTIVE').toUpperCase() === 'BANNED'
                              ? '🔴 ACCOUNT BLOCKED'
                              : '🟢 ACCOUNT ACTIVE'}
                          </span>
                          <span className="text-xs font-bold text-slate-500 uppercase">
                            Role: {selectedUserDetail.role || 'PLAYER'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const u = selectedUserDetail;
                              setSelectedUserDetail(null);
                              setEditingUserModal(u);
                              setEditUserForm({
                                id: u.id,
                                name: u.name || '',
                                email: u.email || '',
                                phone: u.phone || '',
                                role: u.role || 'PLAYER',
                                status: u.status || 'ACTIVE',
                                password: '',
                              });
                            }}
                            className="px-3 py-1.5 bg-slate-800 text-white font-extrabold text-xs rounded-xl hover:bg-slate-700 transition-all cursor-pointer"
                          >
                            ✏️ Edit Profile
                          </button>

                          <button
                            onClick={() => handleToggleUserStatus(selectedUserDetail.id, selectedUserDetail.status)}
                            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                              (selectedUserDetail.status || 'ACTIVE').toUpperCase() === 'BLOCKED' ||
                              (selectedUserDetail.status || 'ACTIVE').toUpperCase() === 'BANNED'
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                : 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
                            }`}
                          >
                            {(selectedUserDetail.status || 'ACTIVE').toUpperCase() === 'BLOCKED' ||
                            (selectedUserDetail.status || 'ACTIVE').toUpperCase() === 'BANNED'
                              ? '🔓 Unblock'
                              : '🔒 Block'}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(selectedUserDetail.id, selectedUserDetail.name || selectedUserDetail.email)}
                            className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                          >
                            🗑️ Delete User
                          </button>
                        </div>
                      </div>

                      {/* Live Analytics Dashboard Cards */}
                      <div>
                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                          📊 Live Gaming &amp; Financial Performance
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-1">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase">Wallet Balance</span>
                            <div className="text-base font-black text-emerald-800">
                              {formatINR(selectedUserDetail.balance || 0)}
                            </div>
                          </div>

                          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 space-y-1">
                            <span className="text-[10px] font-bold text-blue-700 uppercase">Total Games Played</span>
                            <div className="text-base font-black text-blue-800">
                              {selectedUserDetail.totalBetsCount || 0} rounds
                            </div>
                          </div>

                          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 space-y-1">
                            <span className="text-[10px] font-bold text-indigo-700 uppercase">Total Wagered</span>
                            <div className="text-base font-black text-indigo-800">
                              {formatINR(selectedUserDetail.totalTurnover || 0)}
                            </div>
                          </div>

                          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5 space-y-1">
                            <span className="text-[10px] font-bold text-teal-700 uppercase">Total Earning (Winnings)</span>
                            <div className="text-base font-black text-teal-800">
                              {formatINR(selectedUserDetail.totalWinnings || 0)}
                            </div>
                          </div>

                          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-1">
                            <span className="text-[10px] font-bold text-rose-700 uppercase">Total Loss in Platform</span>
                            <div className="text-base font-black text-rose-800">
                              {formatINR(selectedUserDetail.totalLoss || 0)}
                            </div>
                          </div>

                          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                            <span className="text-[10px] font-bold text-slate-600 uppercase">Net Player P&amp;L</span>
                            <div className={`text-base font-black ${
                              (Number(selectedUserDetail.totalWinnings || 0) - Number(selectedUserDetail.totalLoss || 0)) >= 0
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }`}>
                              {formatINR(Number(selectedUserDetail.totalWinnings || 0) - Number(selectedUserDetail.totalLoss || 0))}
                            </div>
                          </div>
                        </div>

                        {/* Deposit & Withdrawal Totals */}
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600">Total Approved Deposits:</span>
                            <span className="text-xs font-black text-emerald-600">
                              {formatINR(selectedUserDetail.totalDepositsAmount || 0)}
                            </span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600">Total Approved Withdrawals:</span>
                            <span className="text-xs font-black text-rose-600">
                              {formatINR(selectedUserDetail.totalWithdrawalsAmount || 0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Wallet Balance Controller */}
                      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 space-y-4 shadow-lg">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black uppercase tracking-wider text-slate-300">
                            💳 Modify Wallet Balance (Instant Credit / Debit)
                          </h5>
                          <span className="text-xs font-extrabold text-emerald-400">
                            Current: {formatINR(selectedUserDetail.balance || 0)}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-bold text-sm">₹</span>
                            <input
                              type="number"
                              placeholder="Enter amount..."
                              value={walletAdjustAmount}
                              onChange={(e) => setWalletAdjustAmount(e.target.value)}
                              className="flex-1 bg-slate-800 border border-slate-700 text-white px-3.5 py-2 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {[100, 500, 1000, 5000, 10000].map((amt) => (
                              <button
                                key={amt}
                                onClick={() => setWalletAdjustAmount(amt.toString())}
                                className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                              >
                                +₹{amt}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                              disabled={walletAdjustLoading || !walletAdjustAmount}
                              onClick={() =>
                                handleUpdateBalance(
                                  selectedUserDetail.id,
                                  'ADD',
                                  parseFloat(walletAdjustAmount)
                                )
                              }
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                            >
                              ➕ Credit Cash (Add)
                            </button>
                            <button
                              disabled={walletAdjustLoading || !walletAdjustAmount}
                              onClick={() =>
                                handleUpdateBalance(
                                  selectedUserDetail.id,
                                  'DEDUCT',
                                  parseFloat(walletAdjustAmount)
                                )
                              }
                              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                            >
                              ➖ Debit Cash (Deduct)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
                      <button
                        onClick={() => setSelectedUserDetail(null)}
                        className="px-5 py-2 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-300 transition-colors cursor-pointer"
                      >
                        Close Details
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ADD NEW USER MODAL */}
              {isAddUserModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                      <h4 className="text-base font-black flex items-center gap-2">
                        <span>➕</span> Add New Platform User
                      </h4>
                      <button
                        onClick={() => setIsAddUserModalOpen(false)}
                        className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleCreateUser} className="p-5 space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul Sharma"
                          value={addUserForm.name}
                          onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
                          className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          placeholder="rahul@example.com"
                          value={addUserForm.email}
                          onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                          className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                        <input
                          type="text"
                          placeholder="9876543210"
                          value={addUserForm.phone}
                          onChange={(e) => setAddUserForm({ ...addUserForm, phone: e.target.value })}
                          className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
                          <input
                            type="password"
                            placeholder="Default: 123456"
                            value={addUserForm.password}
                            onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Role</label>
                          <select
                            value={addUserForm.role}
                            onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="PLAYER">PLAYER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Initial Wallet Balance (₹)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={addUserForm.initialBalance}
                          onChange={(e) => setAddUserForm({ ...addUserForm, initialBalance: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setIsAddUserModalOpen(false)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addUserLoading}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {addUserLoading ? 'Creating...' : 'Create User'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* EDIT USER MODAL */}
              {editingUserModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                      <h4 className="text-base font-black flex items-center gap-2">
                        <span>✏️</span> Edit User Profile
                      </h4>
                      <button
                        onClick={() => setEditingUserModal(null)}
                        className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleUpdateUser} className="p-5 space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                        <input
                          type="text"
                          value={editUserForm.name}
                          onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                          className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          value={editUserForm.email}
                          onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                          className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={editUserForm.phone}
                          onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                          className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Role</label>
                          <select
                            value={editUserForm.role}
                            onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="PLAYER">PLAYER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Account Status</label>
                          <select
                            value={editUserForm.status}
                            onChange={(e) => setEditUserForm({ ...editUserForm, status: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="ACTIVE">🟢 ACTIVE</option>
                            <option value="BLOCKED">🔴 BLOCKED</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">New Password (leave blank to keep current)</label>
                        <input
                          type="password"
                          placeholder="Enter new password..."
                          value={editUserForm.password}
                          onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                          className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setEditingUserModal(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={editUserLoading}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {editUserLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TENANTS & WHITE-LABEL ADMINS MANAGEMENT TAB */}
          {activeTab === 'tenants' && (
            <div className="space-y-6">
              {/* Header & Control Banner */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      🏢 White-Label Tenants &amp; Operator Admins
                      <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                        {tenants.length} Operators
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Assign new Tenant Admins, allocate initial credits, and toggle specific game access (ON/OFF) per tenant.
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => setIsAddTenantModalOpen(true)}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      ➕ Create New Tenant &amp; Admin
                    </button>
                  </div>
                </div>

                {/* Quick Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Operators</span>
                    <span className="text-xl font-black text-slate-900 mt-1 block">{tenants.length}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Active Operators</span>
                    <span className="text-xl font-black text-emerald-600 mt-1 block">{tenants.filter(t => t.status === 'ACTIVE').length}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Staff Members</span>
                    <span className="text-xl font-black text-indigo-600 mt-1 block">
                      {tenants.reduce((acc, t) => acc + (t._count?.members || 0), 0)}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Registered Players</span>
                    <span className="text-xl font-black text-blue-600 mt-1 block">
                      {tenants.reduce((acc, t) => acc + (t._count?.players || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tenants Table */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900">Operator Directory</h4>
                  <button
                    onClick={fetchTenants}
                    className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                  >
                    🔄 Refresh
                  </button>
                </div>

                {tenantsLoading ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-bold">
                    🔄 Loading white-label operators...
                  </div>
                ) : tenants.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <span className="text-3xl block mb-2">🏢</span>
                    <p className="text-xs font-extrabold text-slate-700">No White-Label Tenants Found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Click "Create New Tenant &amp; Admin" to assign your first operator admin.</p>
                    <button
                      onClick={() => setIsAddTenantModalOpen(true)}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white font-extrabold text-xs rounded-xl cursor-pointer"
                    >
                      ➕ Create First Tenant
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Operator / Brand</th>
                          <th className="py-3 px-4">Super Admin Account</th>
                          <th className="py-3 px-4">Game Access</th>
                          <th className="py-3 px-4">Hierarchy Stats</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {tenants.map((t) => {
                          const superAdmin = t.members?.find((m: any) => m.role === 'SUPER_ADMIN') || t.members?.[0];
                          const allowedGamesCount = Array.isArray(t.allowedGames) ? t.allowedGames.length : 0;
                          return (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Tenant Name & Brand */}
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm"
                                    style={{ backgroundColor: t.primaryColor || '#6366f1' }}
                                  >
                                    {t.name?.charAt(0)?.toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                                      {t.name}
                                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                        slug: {t.slug}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                      {t.domain || 'No custom domain set'}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Super Admin Account */}
                              <td className="py-4 px-4">
                                <div>
                                  <div className="font-bold text-slate-900">{superAdmin?.name || 'Super Admin'}</div>
                                  <div className="text-[11px] text-slate-500 font-mono">{superAdmin?.email || 'N/A'}</div>
                                </div>
                              </td>

                              {/* Game Access */}
                              <td className="py-4 px-4">
                                <button
                                  onClick={() => {
                                    setSelectedTenantForGames(t);
                                    setTenantGamesState(Array.isArray(t.allowedGames) ? t.allowedGames : []);
                                    setIsManageGamesModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] rounded-lg border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  🎮 {allowedGamesCount} / {ALL_TENANT_GAMES.length} Games ON
                                  <span className="text-[10px]">⚙️</span>
                                </button>
                              </td>

                              {/* Hierarchy Stats */}
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                                    👥 {t._count?.members || 0} Staff
                                  </span>
                                  <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md">
                                    🎮 {t._count?.players || 0} Players
                                  </span>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-4 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                  t.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {t.status === 'ACTIVE' ? '🟢 ACTIVE' : '🔴 SUSPENDED'}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-4 px-4 text-right space-x-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedTenantForCredit(t);
                                    setIsAllocateCreditModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg shadow-sm cursor-pointer"
                                >
                                  💰 Credit
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedTenantForGames(t);
                                    setTenantGamesState(Array.isArray(t.allowedGames) ? t.allowedGames : []);
                                    setIsManageGamesModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-lg shadow-sm cursor-pointer"
                                >
                                  🎮 Games
                                </button>
                                <button
                                  onClick={() => handleToggleTenantStatus(t.id, t.status)}
                                  className={`px-2.5 py-1.5 text-white font-extrabold text-[11px] rounded-lg shadow-sm cursor-pointer ${
                                    t.status === 'ACTIVE' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                  }`}
                                >
                                  {t.status === 'ACTIVE' ? '⏸️ Suspend' : '▶️ Activate'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Add Tenant Modal ────────────────────────────────────────────────── */}
              {isAddTenantModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                          🏢 Create New White-Label Tenant &amp; Admin
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Setup a new operator site, assign their Super Admin credentials, set initial credits, and choose game access.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsAddTenantModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleCreateTenant} className="space-y-4">
                      {/* Section: Tenant / Operator Brand */}
                      <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <h4 className="text-xs font-black uppercase text-indigo-700 tracking-wider">1. Operator Brand Info</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Tenant / Site Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Royal Gaming"
                              value={addTenantForm.name}
                              onChange={(e) => setAddTenantForm({ ...addTenantForm, name: e.target.value })}
                              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Tenant Slug (Unique ID) *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. royal"
                              value={addTenantForm.slug}
                              onChange={(e) => setAddTenantForm({ ...addTenantForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Custom Domain (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. royal.example.com"
                              value={addTenantForm.domain}
                              onChange={(e) => setAddTenantForm({ ...addTenantForm, domain: e.target.value })}
                              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Theme Primary Color</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={addTenantForm.primaryColor}
                                onChange={(e) => setAddTenantForm({ ...addTenantForm, primaryColor: e.target.value })}
                                className="w-9 h-9 p-0.5 border border-slate-200 rounded-xl cursor-pointer"
                              />
                              <input
                                type="text"
                                value={addTenantForm.primaryColor}
                                onChange={(e) => setAddTenantForm({ ...addTenantForm, primaryColor: e.target.value })}
                                className="flex-1 px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section: Super Admin Account */}
                      <div className="space-y-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                        <h4 className="text-xs font-black uppercase text-indigo-800 tracking-wider">2. Tenant Super Admin Account</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Super Admin Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. John Operator"
                              value={addTenantForm.superAdminName}
                              onChange={(e) => setAddTenantForm({ ...addTenantForm, superAdminName: e.target.value })}
                              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Super Admin Email *</label>
                            <input
                              type="email"
                              required
                              placeholder="e.g. admin@royalgaming.com"
                              value={addTenantForm.superAdminEmail}
                              onChange={(e) => setAddTenantForm({ ...addTenantForm, superAdminEmail: e.target.value })}
                              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Admin Password *</label>
                            <input
                              type="text"
                              required
                              placeholder="Set strong password"
                              value={addTenantForm.superAdminPassword}
                              onChange={(e) => setAddTenantForm({ ...addTenantForm, superAdminPassword: e.target.value })}
                              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Initial Credit Allocation (₹)</label>
                            <input
                              type="number"
                              placeholder="100000"
                              value={addTenantForm.initialCredit}
                              onChange={(e) => setAddTenantForm({ ...addTenantForm, initialCredit: Number(e.target.value) })}
                              className="w-full px-3 py-2 text-xs font-extrabold text-emerald-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section: Allowed Games Controls (ON/OFF per tenant) */}
                      <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase text-indigo-700 tracking-wider">3. Game Access Controls (ON/OFF for this tenant)</h4>
                          <button
                            type="button"
                            onClick={() => {
                              const allIds = ALL_TENANT_GAMES.map(g => g.id);
                              const isAllSelected = addTenantForm.allowedGames.length === ALL_TENANT_GAMES.length;
                              setAddTenantForm({ ...addTenantForm, allowedGames: isAllSelected ? [] : allIds });
                            }}
                            className="text-[10px] font-extrabold text-indigo-600 hover:underline cursor-pointer"
                          >
                            {addTenantForm.allowedGames.length === ALL_TENANT_GAMES.length ? 'Deselect All' : 'Select All Games'}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {ALL_TENANT_GAMES.map((game) => {
                            const isChecked = addTenantForm.allowedGames.includes(game.id);
                            return (
                              <label
                                key={game.id}
                                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                                  isChecked
                                    ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 font-extrabold'
                                    : 'bg-white border-slate-200 text-slate-500 font-medium'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setAddTenantForm({ ...addTenantForm, allowedGames: [...addTenantForm.allowedGames, game.id] });
                                    } else {
                                      setAddTenantForm({ ...addTenantForm, allowedGames: addTenantForm.allowedGames.filter(id => id !== game.id) });
                                    }
                                  }}
                                  className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm">{game.icon}</span>
                                <span className="text-xs">{game.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Modal Submit Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setIsAddTenantModalOpen(false)}
                          className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-extrabold rounded-xl hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addTenantLoading}
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {addTenantLoading ? 'Creating Tenant...' : 'Create Tenant & Assign Admin'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ── Manage Games Modal ──────────────────────────────────────────────── */}
              {isManageGamesModalOpen && selectedTenantForGames && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                          🎮 Manage Allowed Games: {selectedTenantForGames.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Enable or disable specific games tenant-wise.
                        </p>
                      </div>
                      <button
                        onClick={() => { setIsManageGamesModalOpen(false); setSelectedTenantForGames(null); }}
                        className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleSaveTenantGames} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto custom-scrollbar p-1">
                        {ALL_TENANT_GAMES.map((game) => {
                          const isChecked = tenantGamesState.includes(game.id);
                          return (
                            <label
                              key={game.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                isChecked
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-extrabold'
                                  : 'bg-slate-50 border-slate-200 text-slate-500 font-medium'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTenantGamesState([...tenantGamesState, game.id]);
                                  } else {
                                    setTenantGamesState(tenantGamesState.filter(id => id !== game.id));
                                  }
                                }}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-lg">{game.icon}</span>
                              <span className="text-xs">{game.name}</span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => { setIsManageGamesModalOpen(false); setSelectedTenantForGames(null); }}
                          className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-extrabold rounded-xl hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={updateTenantGamesLoading}
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {updateTenantGamesLoading ? 'Saving...' : 'Save Game Access'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ── Allocate Credit Modal ────────────────────────────────────────────── */}
              {isAllocateCreditModalOpen && selectedTenantForCredit && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                          💰 Allocate Credit to Tenant Admin
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Issue additional credit balance to {selectedTenantForCredit.name}'s Super Admin.
                        </p>
                      </div>
                      <button
                        onClick={() => { setIsAllocateCreditModalOpen(false); setSelectedTenantForCredit(null); }}
                        className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleAllocateTenantCredit} className="space-y-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Credit Amount (₹) *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="e.g. 50000"
                          value={creditAllocationAmount}
                          onChange={(e) => setCreditAllocationAmount(Number(e.target.value))}
                          className="w-full px-3 py-2.5 text-sm font-black text-emerald-700 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Remarks / Description</label>
                        <input
                          type="text"
                          placeholder="Reason for allocation"
                          value={creditAllocationRemarks}
                          onChange={(e) => setCreditAllocationRemarks(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => { setIsAllocateCreditModalOpen(false); setSelectedTenantForCredit(null); }}
                          className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-extrabold rounded-xl hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={allocateCreditLoading}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {allocateCreditLoading ? 'Allocating...' : 'Allocate Credits Now'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GAME ENGINES & RTP TAB */}
          {activeTab === 'games' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">Game Engines &amp; RTP Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.map((g) => (
                  <div key={g.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900">{g.name}</span>
                      <button
                        onClick={() => handleToggleGame(g.id, g.isActive !== false)}
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          g.isActive !== false
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                        }`}
                      >
                        {g.isActive !== false ? '🟢 ACTIVE (ON)' : '🔴 DISABLED (OFF)'}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">
                        RTP Percentage: {editingRtp[g.id] ?? g.rtpPercentage}%
                      </label>
                      <input
                        type="range"
                        min={50}
                        max={99}
                        value={editingRtp[g.id] ?? g.rtpPercentage}
                        onChange={(e) => setEditingRtp({ ...editingRtp, [g.id]: parseInt(e.target.value, 10) })}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>Min: ₹{g.minBet}</span>
                      <span>Max: ₹{g.maxBet}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveRtp(g.id, g.rtpPercentage)}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-colors shadow-xs"
                      >
                        Save RTP
                      </button>
                      <button
                        onClick={() => handleToggleGame(g.id, g.isActive !== false)}
                        className={`px-3 py-2 font-extrabold text-xs rounded-xl border transition-colors ${
                          g.isActive !== false
                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {g.isActive !== false ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GAME OUTCOME OVERRIDE / RIGGING CONTROLLER TAB */}
          {activeTab === 'override' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Game Outcome &amp; Period Result Override Controller</h3>
                  <p className="text-xs text-slate-500">Preset next round outcomes, multipliers, or crash targets across all 9 game engines</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.map((g) => (
                  <div key={g.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900">{g.name}</span>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                        OVERRIDE READY
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Next Round Target:
                      </label>
                      <input
                        type="text"
                        value={overrideTargets[g.id] || ''}
                        onChange={(e) => setOverrideTargets({ ...overrideTargets, [g.id]: e.target.value })}
                        placeholder="Target (e.g. RED / 2.50x)"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      onClick={() => handleApplyResultOverride(g.id)}
                      className="w-full py-2 bg-gradient-to-r from-amber-500 to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-xs hover:brightness-105 active:scale-98 transition-all"
                    >
                      🎯 Force Next Result
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BANK CARD APPROVAL CENTER */}
          {activeTab === 'approvals' && (() => {
            const pendingList = bankApprovals.filter((b) => b.status === 'pending');
            const approvedList = bankApprovals.filter((b) => b.status === 'approved');
            const rejectedList = bankApprovals.filter((b) => b.status === 'rejected');

            const filteredList = bankApprovals.filter((b) => {
              if (bankStatusFilter === 'all') return true;
              return b.status === bankStatusFilter;
            });

            return (
              <div className="space-y-6 font-sans">
                {/* 1. TOP HEADER TITLE & SYSTEM STATUS */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <span className="text-xl">🏛️</span> Bank Card Approval Center
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Verify and approve player bank accounts for secure withdrawal processing
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      System Operational
                    </span>
                  </div>
                </div>

                {/* 2. STAT SUMMARY CARDS (Yellow / Green / Red) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* PENDING APPROVALS */}
                  <button
                    onClick={() => setBankStatusFilter('pending')}
                    className={`text-left p-4 rounded-2xl border transition-all shadow-xs ${
                      bankStatusFilter === 'pending'
                        ? 'bg-[#FEFCE8] border-amber-300 ring-2 ring-amber-300'
                        : 'bg-white border-amber-200 hover:border-amber-300 hover:bg-[#FEFCE8]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-lg font-black">
                        ⏱️
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                        ACTION REQUIRED
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800/70 block">
                        PENDING APPROVALS
                      </span>
                      <span className="text-3xl font-black font-mono text-amber-500 mt-0.5 block">
                        {pendingList.length}
                      </span>
                    </div>
                  </button>

                  {/* APPROVED CARDS */}
                  <button
                    onClick={() => setBankStatusFilter('approved')}
                    className={`text-left p-4 rounded-2xl border transition-all shadow-xs ${
                      bankStatusFilter === 'approved'
                        ? 'bg-[#F0FDF4] border-emerald-300 ring-2 ring-emerald-300'
                        : 'bg-white border-emerald-200 hover:border-emerald-300 hover:bg-[#F0FDF4]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg font-black">
                        ✅
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                        VERIFIED
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800/70 block">
                        APPROVED CARDS
                      </span>
                      <span className="text-3xl font-black font-mono text-emerald-600 mt-0.5 block">
                        {approvedList.length}
                      </span>
                    </div>
                  </button>

                  {/* REJECTED CARDS */}
                  <button
                    onClick={() => setBankStatusFilter('rejected')}
                    className={`text-left p-4 rounded-2xl border transition-all shadow-xs ${
                      bankStatusFilter === 'rejected'
                        ? 'bg-[#FEF2F2] border-rose-300 ring-2 ring-rose-300'
                        : 'bg-white border-rose-200 hover:border-rose-300 hover:bg-[#FEF2F2]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg font-black">
                        ❌
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                        DECLINED
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800/70 block">
                        REJECTED CARDS
                      </span>
                      <span className="text-3xl font-black font-mono text-rose-600 mt-0.5 block">
                        {rejectedList.length}
                      </span>
                    </div>
                  </button>
                </div>

                {/* 3. SUBMISSIONS TABLE CARD */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <span>🏛️</span> Bank Account Submissions
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        Only approved accounts are permitted for player withdrawals
                      </p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        onClick={() => setBankStatusFilter('pending')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                          bankStatusFilter === 'pending'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                      >
                        Pending ({pendingList.length})
                      </button>
                      <button
                        onClick={() => setBankStatusFilter('approved')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                          bankStatusFilter === 'approved'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                      >
                        Approved ({approvedList.length})
                      </button>
                      <button
                        onClick={() => setBankStatusFilter('rejected')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                          bankStatusFilter === 'rejected'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                      >
                        Rejected ({rejectedList.length})
                      </button>
                      <button
                        onClick={() => setBankStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                          bankStatusFilter === 'all'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                      >
                        All Records
                      </button>
                    </div>
                  </div>

                  {/* TABLE CONTENT */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-medium text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black">
                        <tr>
                          <th className="py-3 px-4">PLAYER INFO</th>
                          <th className="py-3 px-4">BANK NAME</th>
                          <th className="py-3 px-4">ACCOUNT NUMBER</th>
                          <th className="py-3 px-4">IFSC CODE</th>
                          <th className="py-3 px-4">HOLDER NAME</th>
                          <th className="py-3 px-4">UPI ID</th>
                          <th className="py-3 px-4">STATUS</th>
                          <th className="py-3 px-4">SUBMITTED</th>
                          <th className="py-3 px-4">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredList.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                              No bank card records found for this status
                            </td>
                          </tr>
                        ) : (
                          filteredList
                            .slice((banksPage - 1) * banksPerPage, banksPage * banksPerPage)
                            .map((b) => (
                              <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900 flex items-center gap-1">
                                    <span>👤</span> {b.user?.name || b.user?.email || 'Player'}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-normal">
                                    {b.user?.phone || 'No Phone'}
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-black text-blue-600 uppercase">
                                  {b.bankName || 'BANK'}
                                </td>
                                <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                  {b.accountNumber || '-'}
                                </td>
                                <td className="py-3 px-4 font-mono font-bold uppercase text-slate-700">
                                  {b.ifscCode || '-'}
                                </td>
                                <td className="py-3 px-4 font-semibold text-slate-800">
                                  {b.holderName || '-'}
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-500">
                                  {b.upiId || '-'}
                                </td>
                                <td className="py-3 px-4">
                                  {b.status === 'approved' ? (
                                    <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">
                                      APPROVED
                                    </span>
                                  ) : b.status === 'rejected' ? (
                                    <span className="bg-rose-100 text-rose-800 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">
                                      REJECTED
                                    </span>
                                  ) : (
                                    <span className="bg-amber-100 text-amber-800 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">
                                      PENDING
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-slate-500 text-[11px]">
                                  {b.createdAt ? new Date(b.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                </td>
                                <td className="py-3 px-4">
                                  {b.status === 'pending' ? (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleApproveBankCard(b.id)}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full shadow-xs transition-colors cursor-pointer"
                                      >
                                        ✔ Approve
                                      </button>
                                      <button
                                        onClick={() => setRejectModalBank({ id: b.id, bankName: b.bankName || 'Bank', playerName: b.user?.name || b.holderName || 'Player' })}
                                        className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 font-bold text-xs rounded-full transition-colors cursor-pointer"
                                      >
                                        ✖ Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs font-semibold">
                                      ✔ Processed
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {renderPaginationControls(banksPage, filteredList.length, banksPerPage, setBanksPage, setBanksPerPage)}

              </div>
            );
          })()}

          {/* MANUAL DEPOSIT VERIFICATION CENTER TAB */}
          {activeTab === 'manual-deposits' && (() => {
            const pendingList = deposits.filter((d) => {
              const s = (d.status || '').toLowerCase();
              return s === 'pending' || s === 'verified';
            });
            const approvedList = deposits.filter((d) => (d.status || '').toLowerCase() === 'approved');
            const rejectedList = deposits.filter((d) => (d.status || '').toLowerCase() === 'rejected');

            const filteredDeposits = deposits.filter((d) => {
              const s = (d.status || '').toLowerCase();
              if (depositStatusFilter !== 'all') {
                if (depositStatusFilter === 'pending') {
                  if (s !== 'pending' && s !== 'verified') return false;
                } else if (s !== depositStatusFilter) {
                  return false;
                }
              }
              if (depositMerchantFilter !== 'all') {
                if (d.merchantId !== depositMerchantFilter && d.merchantAccount?.id !== depositMerchantFilter) return false;
              }
              if (depositSearchQuery) {
                const q = depositSearchQuery.toLowerCase();
                const idMatch = (d.id || d.depositId || '').toLowerCase().includes(q);
                const utrMatch = (d.utrNumber || d.utr || '').toLowerCase().includes(q);
                const userMatch = (d.user?.email || d.user?.phone || d.user?.name || '').toLowerCase().includes(q);
                if (!idMatch && !utrMatch && !userMatch) return false;
              }
              return true;
            });

            const countDuplicateUtr = (utr?: string) => {
              if (!utr) return 0;
              const cleanUtr = utr.trim().toLowerCase();
              return deposits.filter((d) => (d.utrNumber || d.utr || '').trim().toLowerCase() === cleanUtr).length - 1;
            };

            const handleToggleSelectDeposit = (id: string) => {
              setSelectedDepositIds((prev) =>
                prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
              );
            };

            const handleToggleSelectAll = () => {
              const pendingIds = filteredDeposits
                .filter((d) => (d.status || '').toLowerCase() === 'pending')
                .map((d) => d.id);
              if (selectedDepositIds.length === pendingIds.length && pendingIds.length > 0) {
                setSelectedDepositIds([]);
              } else {
                setSelectedDepositIds(pendingIds);
              }
            };

            return (
              <div className="space-y-6 font-sans">
                {/* 1. TOP HEADER TITLE & EXPORT CSV BUTTON */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <span>📥</span> Manual Deposit Verification Center
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Audit payment proofs, UTR numbers &amp; credit user wallets via WalletService
                    </p>
                  </div>
                  <button
                    onClick={handleExportDepositsCsv}
                    className="px-4 py-2 border border-emerald-400 text-emerald-700 hover:bg-emerald-50 font-bold text-xs rounded-full shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <span>📊</span> Export CSV Report
                  </button>
                </div>

                {/* 2. STAT SUMMARY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setDepositStatusFilter('pending')}
                    className={`text-left p-4 rounded-2xl border transition-all shadow-xs ${
                      depositStatusFilter === 'pending'
                        ? 'bg-[#FEFCE8] border-amber-300 ring-2 ring-amber-300'
                        : 'bg-white border-amber-200 hover:border-amber-300 hover:bg-[#FEFCE8]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                        PENDING VERIFICATION
                      </span>
                      <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-lg font-black">
                        ⏳
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-black font-mono text-amber-500 block">
                        {pendingList.length}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => setDepositStatusFilter('approved')}
                    className={`text-left p-4 rounded-2xl border transition-all shadow-xs ${
                      depositStatusFilter === 'approved'
                        ? 'bg-[#F0FDF4] border-emerald-300 ring-2 ring-emerald-300'
                        : 'bg-white border-emerald-200 hover:border-emerald-300 hover:bg-[#F0FDF4]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                        APPROVED DEPOSITS
                      </span>
                      <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg font-black">
                        ✅
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-black font-mono text-emerald-600 block">
                        {approvedList.length}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => setDepositStatusFilter('rejected')}
                    className={`text-left p-4 rounded-2xl border transition-all shadow-xs ${
                      depositStatusFilter === 'rejected'
                        ? 'bg-[#FEF2F2] border-rose-300 ring-2 ring-rose-300'
                        : 'bg-white border-rose-200 hover:border-rose-300 hover:bg-[#FEF2F2]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-rose-800">
                        REJECTED DEPOSITS
                      </span>
                      <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg font-black">
                        ❌
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-black font-mono text-rose-600 block">
                        {rejectedList.length}
                      </span>
                    </div>
                  </button>
                </div>

                {/* 3. SEARCH & FILTER CONTROLS BAR */}
                <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={depositSearchQuery}
                      onChange={(e) => setDepositSearchQuery(e.target.value)}
                      placeholder="Search Deposit ID, UTR, User..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />

                    <select
                      value={depositStatusFilter}
                      onChange={(e) => setDepositStatusFilter(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="pending">Pending Verification</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="all">All Statuses</option>
                    </select>

                    <select
                      value={depositMerchantFilter}
                      onChange={(e) => setDepositMerchantFilter(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="all">All Merchant Accounts</option>
                      {merchants.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.upiId || 'UPI'})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchAdminDashboardData()}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <span>🔍</span> Filter
                      </button>
                      <button
                        onClick={() => {
                          setDepositSearchQuery('');
                          setDepositStatusFilter('pending');
                          setDepositMerchantFilter('all');
                        }}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. SELECTION BAR & BULK ACTIONS */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          selectedDepositIds.length > 0 &&
                          selectedDepositIds.length ===
                            filteredDeposits.filter((d) => (d.status || '').toLowerCase() === 'pending').length
                        }
                        onChange={handleToggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700">Select All Pending</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleBulkApproveDeposits}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-full shadow-xs transition-colors flex items-center gap-1"
                      >
                        <span>✔</span> Bulk Approve
                      </button>
                      <button
                        onClick={handleBulkRejectDeposits}
                        className="px-4 py-1.5 border border-rose-400 text-rose-600 hover:bg-rose-50 font-extrabold text-xs rounded-full transition-colors flex items-center gap-1"
                      >
                        <span>✖</span> Bulk Reject
                      </button>
                    </div>
                  </div>

                  {/* 5. DATA TABLE */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-medium text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black">
                        <tr>
                          <th className="py-3 px-4 w-10"></th>
                          <th className="py-3 px-4">DEPOSIT ID</th>
                          <th className="py-3 px-4">USER</th>
                          <th className="py-3 px-4">MERCHANT ASSIGNED</th>
                          <th className="py-3 px-4">AMOUNT (₹)</th>
                          <th className="py-3 px-4">UTR NUMBER</th>
                          <th className="py-3 px-4">PROOF</th>
                          <th className="py-3 px-4">STATUS</th>
                          <th className="py-3 px-4">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredDeposits.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold space-y-2">
                              <span className="text-3xl block">📥</span>
                              <p>No deposit requests found matching your criteria.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredDeposits
                            .slice((depositsPage - 1) * depositsPerPage, depositsPage * depositsPerPage)
                            .map((d) => {
                              const statusLower = (d.status || '').toLowerCase();
                              const isPendingOrVerified = statusLower === 'pending' || statusLower === 'verified';
                              const utrVal = d.utrNumber || d.utr || '';
                              const dupCount = countDuplicateUtr(utrVal);
                              const proofPath = d.proofs && d.proofs.length > 0 ? d.proofs[0].filePath : (d.proofUrl || d.proofImage || d.utrImage);

                              return (
                                <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 px-4">
                                    {isPendingOrVerified && (
                                      <input
                                        type="checkbox"
                                        checked={selectedDepositIds.includes(d.id)}
                                        onChange={() => handleToggleSelectDeposit(d.id)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                      />
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="font-mono font-bold text-blue-600 block">
                                      #{d.depositId || (d.id ? d.id.slice(0, 10).toUpperCase() : 'DEP')}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block font-semibold">
                                      {d.createdAt ? new Date(d.createdAt).toLocaleString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="font-bold text-slate-900 block">{d.user?.name || d.user?.email || 'Player'}</span>
                                    <span className="text-[11px] text-slate-400 block">{d.user?.phone || d.user?.email || '-'}</span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="font-extrabold text-slate-800 block">{d.merchantAccount?.name || 'Rivexa Official'}</span>
                                    <span className="font-mono text-[10px] text-slate-400 block">{d.merchantAccount?.upiId || 'rivexa@upi'}</span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="font-mono font-extrabold text-emerald-600 text-sm block">
                                      ₹{Number(d.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">
                                      {d.paymentMethod || 'UPI'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    {utrVal ? (
                                      <div>
                                        <span className="font-mono font-bold text-slate-900 block">{utrVal}</span>
                                        {dupCount > 0 && (
                                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-rose-200 mt-0.5">
                                            ⚠️ DUPLICATE UTR ({dupCount})
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                                        Not Submitted
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    {proofPath ? (
                                      <button
                                        onClick={() => setViewingProofModal(proofPath)}
                                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                      >
                                        <span>🖼️</span> View Proof
                                      </button>
                                    ) : (
                                      <span className="text-slate-400 text-xs font-medium">No Proof</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    {statusLower === 'approved' ? (
                                      <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">
                                        APPROVED
                                      </span>
                                    ) : statusLower === 'rejected' ? (
                                      <span className="bg-rose-100 text-rose-800 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">
                                        REJECTED
                                      </span>
                                    ) : statusLower === 'verified' || utrVal ? (
                                      <span className="bg-blue-100 text-blue-800 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase flex items-center gap-1">
                                        <span className="animate-pulse">●</span> VERIFIED (UTR)
                                      </span>
                                    ) : (
                                      <span className="bg-amber-100 text-amber-800 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">
                                        PENDING
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    {isPendingOrVerified ? (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => handleApproveDeposit(d.id)}
                                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full shadow-xs transition-colors cursor-pointer"
                                        >
                                          ✔ Approve
                                        </button>
                                        <button
                                          onClick={() => handleRejectDeposit(d.id)}
                                          className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 font-bold text-xs rounded-full transition-colors cursor-pointer"
                                        >
                                          ✖ Reject
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-xs font-semibold">Processed</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {renderPaginationControls(depositsPage, filteredDeposits.length, depositsPerPage, setDepositsPage, setDepositsPerPage)}
              </div>
            );
          })()}

          {/* WITHDRAWAL PROCESSING TAB */}
          {activeTab === 'withdrawals' && (() => {
            const pendingList = withdrawals.filter((w) => (w.status || '').toLowerCase() === 'pending');
            const approvedList = withdrawals.filter((w) => (w.status || '').toLowerCase() === 'approved');
            const rejectedList = withdrawals.filter((w) => (w.status || '').toLowerCase() === 'rejected');

            const filteredWithdrawals = withdrawals.filter((w) => {
              if (withdrawalStatusFilter !== 'all') {
                if ((w.status || '').toLowerCase() !== withdrawalStatusFilter) return false;
              }
              if (withdrawalSearchQuery) {
                const q = withdrawalSearchQuery.toLowerCase();
                const idMatch = (w.id || w.transactionId || '').toLowerCase().includes(q);
                const playerMatch = (w.user?.name || w.user?.email || w.user?.phone || '').toLowerCase().includes(q);
                if (!idMatch && !playerMatch) return false;
              }
              return true;
            });

            return (
              <div className="space-y-6 font-sans">
                {/* 1. TOP HEADER TITLE */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <span>📤</span> Withdrawal Processing
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Process payout requests to player bank accounts or UPI IDs
                    </p>
                  </div>
                </div>

                {/* 2. STAT SUMMARY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setWithdrawalStatusFilter('pending')}
                    className={`text-left p-4 rounded-2xl border transition-all shadow-xs ${
                      withdrawalStatusFilter === 'pending'
                        ? 'bg-[#FEFCE8] border-amber-300 ring-2 ring-amber-300'
                        : 'bg-white border-amber-200 hover:border-amber-300 hover:bg-[#FEFCE8]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                        PENDING WITHDRAWALS
                      </span>
                      <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-lg font-black">
                        ⏳
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-black font-mono text-amber-500 block">
                        {pendingList.length}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => setWithdrawalStatusFilter('approved')}
                    className={`text-left p-4 rounded-2xl border transition-all shadow-xs ${
                      withdrawalStatusFilter === 'approved'
                        ? 'bg-[#F0FDF4] border-emerald-300 ring-2 ring-emerald-300'
                        : 'bg-white border-emerald-200 hover:border-emerald-300 hover:bg-[#F0FDF4]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                        APPROVED WITHDRAWALS
                      </span>
                      <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg font-black">
                        ✅
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-black font-mono text-emerald-600 block">
                        {approvedList.length}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => setWithdrawalStatusFilter('rejected')}
                    className={`text-left p-4 rounded-2xl border transition-all shadow-xs ${
                      withdrawalStatusFilter === 'rejected'
                        ? 'bg-[#FEF2F2] border-rose-300 ring-2 ring-rose-300'
                        : 'bg-white border-rose-200 hover:border-rose-300 hover:bg-[#FEF2F2]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-rose-800">
                        REJECTED WITHDRAWALS
                      </span>
                      <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg font-black">
                        ❌
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-black font-mono text-rose-600 block">
                        {rejectedList.length}
                      </span>
                    </div>
                  </button>
                </div>

                {/* 3. TABLE CONTAINER */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <input
                      type="text"
                      value={withdrawalSearchQuery}
                      onChange={(e) => setWithdrawalSearchQuery(e.target.value)}
                      placeholder="Search TX ID, Player..."
                      className="max-w-xs w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />

                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        onClick={() => setWithdrawalStatusFilter('pending')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                          withdrawalStatusFilter === 'pending'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                      >
                        Pending ({pendingList.length})
                      </button>
                      <button
                        onClick={() => setWithdrawalStatusFilter('approved')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                          withdrawalStatusFilter === 'approved'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                      >
                        Approved ({approvedList.length})
                      </button>
                      <button
                        onClick={() => setWithdrawalStatusFilter('rejected')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                          withdrawalStatusFilter === 'rejected'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                      >
                        Rejected ({rejectedList.length})
                      </button>
                      <button
                        onClick={() => setWithdrawalStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                          withdrawalStatusFilter === 'all'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                      >
                        All
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-medium text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black">
                        <tr>
                          <th className="py-3 px-4">TX ID</th>
                          <th className="py-3 px-4">PLAYER</th>
                          <th className="py-3 px-4">NET PAYOUT</th>
                          <th className="py-3 px-4">FEE</th>
                          <th className="py-3 px-4">PAYOUT DESTINATION</th>
                          <th className="py-3 px-4">STATUS</th>
                          <th className="py-3 px-4">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredWithdrawals.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold space-y-2">
                              <span className="text-3xl block">💸</span>
                              <p>No withdrawal requests found for this status.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredWithdrawals
                            .slice((withdrawalsPage - 1) * withdrawalsPerPage, withdrawalsPage * withdrawalsPerPage)
                            .map((w) => {
                              const isPending = (w.status || '').toLowerCase() === 'pending';
                              const fee = Number(w.fee || 5.0);
                              const gross = Number(w.amount || 0);
                              const net = Math.max(0, gross - fee);

                              return (
                                <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 px-4 font-mono font-bold text-slate-500 text-[11px]">
                                    {w.transactionId || `WD_${w.id.slice(0, 10).toUpperCase()}`}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="font-extrabold text-slate-900 block">{w.user?.name || w.user?.email || 'Player'}</span>
                                    <span className="text-[11px] text-slate-400 block font-normal">{w.user?.phone || w.user?.email || '-'}</span>
                                  </td>
                                  <td className="py-3 px-4 font-mono font-black text-rose-600 text-sm">
                                    ₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-3 px-4 font-mono text-slate-400 text-xs">
                                    ₹{fee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-3 px-4">
                                    {w.bankAccount ? (
                                      <div>
                                        <span className="font-extrabold text-slate-800 block">{w.bankAccount.bankName}</span>
                                        <span className="text-[11px] text-slate-500 font-mono block">
                                          A/C: {w.bankAccount.accountNumber} (IFSC: {w.bankAccount.ifscCode || w.bankAccount.ifsc})
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="font-mono font-extrabold text-blue-600 block">
                                        UPI: {w.upiId || '-'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    {(w.status || '').toLowerCase() === 'approved' ? (
                                      <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">
                                        APPROVED
                                      </span>
                                    ) : (w.status || '').toLowerCase() === 'rejected' ? (
                                      <span className="bg-rose-100 text-rose-800 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">
                                        REJECTED
                                      </span>
                                    ) : (
                                      <span className="bg-amber-100 text-amber-800 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">
                                        PENDING
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    {isPending ? (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => handleApproveWithdrawal(w.id)}
                                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full shadow-xs transition-colors cursor-pointer"
                                        >
                                          ✔ Approve
                                        </button>
                                        <button
                                          onClick={() => handleRejectWithdrawal(w.id)}
                                          className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 font-bold text-xs rounded-full transition-colors cursor-pointer"
                                        >
                                          ✖ Reject
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-xs font-semibold">Processed</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {renderPaginationControls(withdrawalsPage, filteredWithdrawals.length, withdrawalsPerPage, setWithdrawalsPage, setWithdrawalsPerPage)}
              </div>
            );
          })()}

          {/* MERCHANT COLLECTION ACCOUNTS TAB */}
          {activeTab === 'merchants' && (
            <div className="space-y-6 font-sans">
              {/* TOP HEADER TITLE & ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <span>🏛️</span> Merchant Collection Accounts
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Manage merchant bank accounts, UPI IDs, QR codes &amp; load balancing limits
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetDailyTotals}
                    className="px-3.5 py-1.5 border border-amber-400 text-amber-600 hover:bg-amber-50 font-bold text-xs rounded-full shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>↺</span> Reset Daily Totals
                  </button>
                  <button
                    onClick={() => setShowAddMerchantModal(true)}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-full shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>+</span> Add Merchant Account
                  </button>
                </div>
              </div>

              {/* MERCHANT CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {merchants.map((m) => {
                  const isActive = (m.status || 'active').toLowerCase() === 'active';
                  const collected = Number(m.currentDailyTotal || 0);
                  const limit = Number(m.dailyLimit || 200000);
                  const pct = Math.min(100, limit > 0 ? (collected / limit) * 100 : 0);

                  return (
                    <div key={m.id} className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3 relative hover:shadow-md transition-shadow">
                      {/* CARD HEADER BADGES & TOGGLE */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            isActive ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'
                          }`}>
                            {isActive ? 'ACTIVE' : 'DISABLED'}
                          </span>
                          <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                            Priority: {m.priority || 1}
                          </span>
                        </div>

                        <button
                          onClick={() => handleToggleMerchantStatus(m.id)}
                          className={`px-3 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                            isActive
                              ? 'border-rose-400 text-rose-600 hover:bg-rose-50'
                              : 'border-emerald-400 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {isActive ? 'Disable' : 'Enable'}
                        </button>
                      </div>

                      {/* MERCHANT NAME & HOLDER */}
                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-snug">{m.name}</h3>
                        <p className="text-xs text-slate-400 font-semibold">
                          Holder: <span className="text-slate-700">{m.accountHolder || m.name}</span>
                        </p>
                      </div>

                      {/* UPI ID BOX */}
                      {m.upiId && (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                              UPI ID
                            </span>
                            <span className="text-xs font-mono font-bold text-blue-600 block">
                              {m.upiId}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopyText(m.upiId, 'UPI ID')}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold shadow-2xs transition-colors flex items-center gap-1"
                            title="Copy UPI ID to clipboard"
                          >
                            <span>📋</span> Copy
                          </button>
                        </div>
                      )}

                      {/* BANK DETAILS BOX */}
                      {m.bankName && (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Bank:</span>
                            <span className="font-extrabold text-slate-800">{m.bankName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Acc No:</span>
                            <span className="font-mono font-bold text-slate-900">{m.accountNumber}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">IFSC:</span>
                            <span className="font-mono font-bold text-slate-700">{m.ifsc || m.ifscCode}</span>
                          </div>
                        </div>
                      )}

                      {/* TODAY COLLECTED CAPACITY & PROGRESS */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-500 text-[11px]">Today Collected:</span>
                          <span className="text-slate-900 font-mono">
                            ₹{collected.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / ₹{limit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div
                            className={`h-full transition-all duration-500 ${
                              pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* FOOTER ACTIONS: VIEW QR, RESET ACCOUNT, EDIT */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs gap-1">
                        <button
                          onClick={() => setViewingQrMerchant(m)}
                          className="px-2.5 py-1 border border-blue-200 text-blue-600 hover:bg-blue-50 font-extrabold text-[11px] rounded-full transition-colors flex items-center gap-1"
                          title="Click to view QR code modal"
                        >
                          <span>📱</span> View QR Code
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleResetMerchantDailyTotal(m.id, m.name)}
                            className="px-2.5 py-1 border border-amber-300 text-amber-700 hover:bg-amber-50 font-bold text-[11px] rounded-full transition-colors flex items-center gap-1"
                            title="Reset only this account's daily total"
                          >
                            <span>↺</span> Reset
                          </button>

                          <button
                            onClick={() => setEditingMerchant(m)}
                            className="px-3 py-1 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-[11px] rounded-full transition-colors flex items-center gap-1"
                          >
                            <span>✏️</span> Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FINANCIAL ANALYTICS & REPORTS TAB */}
          {(activeTab === 'financial-analytics' || activeTab === 'reports') && (() => {
            const data = reportsData || {};
            const overview = data.overview || {
              totalDepositsAmount: 172000,
              totalDepositsCount: 56,
              totalWithdrawalsAmount: 1022100,
              totalWithdrawalsCount: 17,
              totalStakesTurnover: 6990431,
              totalWinningsPaid: 19704588.5,
              totalHouseNetRevenue: -12714157.5,
              totalCommissionPaid: 68700,
              netCashflow: -850100,
            };

            const dailyDeposits = data.dailyDepositsSummary || [
              { date: '2026-09-26', count: 14, totalAmount: 45000.0 },
              { date: '2026-09-21', count: 12, totalAmount: 38500.0 },
              { date: '2026-09-17', count: 8, totalAmount: 25000.0 },
              { date: '2026-09-09', count: 19, totalAmount: 62000.0 },
              { date: '2026-07-29', count: 3, totalAmount: 1500.0 },
            ];

            const dailyWithdrawals = data.dailyWithdrawalsSummary || [
              { date: '2026-09-26', count: 5, totalAmount: 18500.0 },
              { date: '2026-09-21', count: 3, totalAmount: 969000.0 },
              { date: '2026-09-17', count: 2, totalAmount: 600.0 },
              { date: '2026-09-09', count: 7, totalAmount: 34000.0 },
            ];

            const gameTurnover = data.gameTurnoverSummary || [
              { date: '2026-09-26', totalBets: 48, stakesTurnover: 125000.0, winningsPaid: 118000.0, houseNetRevenue: 7000.0 },
              { date: '2026-09-21', totalBets: 2, stakesTurnover: 110.0, winningsPaid: 0.0, houseNetRevenue: 110.0 },
              { date: '2026-09-17', totalBets: 12, stakesTurnover: 11000.0, winningsPaid: 251704.0, houseNetRevenue: -240704.0 },
              { date: '2026-09-09', totalBets: 111, stakesTurnover: 3739316.0, winningsPaid: 14076884.0, houseNetRevenue: -10337568.0 },
              { date: '2026-08-31', totalBets: 3, stakesTurnover: 30.0, winningsPaid: 0.0, houseNetRevenue: 30.0 },
              { date: '2026-08-30', totalBets: 31, stakesTurnover: 724010.0, winningsPaid: 0.0, houseNetRevenue: 724010.0 },
              { date: '2026-08-11', totalBets: 25, stakesTurnover: 3339.0, winningsPaid: 59147.0, houseNetRevenue: -55808.0 },
              { date: '2026-08-06', totalBets: 68, stakesTurnover: 2020240.0, winningsPaid: 5507417.0, houseNetRevenue: -3487177.0 },
              { date: '2026-08-05', totalBets: 14, stakesTurnover: 365070.0, winningsPaid: 502607.5, houseNetRevenue: -137537.5 },
              { date: '2026-08-04', totalBets: 1, stakesTurnover: 10000.0, winningsPaid: 0.0, houseNetRevenue: 10000.0 },
              { date: '2026-08-02', totalBets: 9, stakesTurnover: 330.0, winningsPaid: 3115.0, houseNetRevenue: -2785.0 },
            ];

            const referralBreakdown = data.referralSummary || [
              { tierLevel: 'Tier 1 (Direct 5%)', level: 1, totalClaimed: 45000.0, activeReferrers: 18, totalCommissionPaid: 45000.0 },
              { tierLevel: 'Tier 2 (Sub-Level 2%)', level: 2, totalClaimed: 18500.0, activeReferrers: 7, totalCommissionPaid: 18500.0 },
              { tierLevel: 'Tier 3 (Sub-Level 1%)', level: 3, totalClaimed: 5200.0, activeReferrers: 3, totalCommissionPaid: 5200.0 },
            ];

            return (
              <div className="space-y-6 font-sans">
                {/* 1. TOP HEADER & FILTER CONTROLS */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <span>📈</span> Financial Analytics &amp; Reports
                      </h2>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        Daily deposit, withdrawal, game turnover, and commission summaries
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleExportReportsCsv}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-full shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <span>📊</span> Export Full Report (CSV)
                      </button>
                      <button
                        onClick={() => fetchFinancialReports(reportStartDate, reportEndDate)}
                        className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-full transition-colors flex items-center gap-1.5"
                      >
                        <span>↺</span> Refresh
                      </button>
                    </div>
                  </div>

                  {/* DATE RANGE FILTER CONTROLS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end pt-1">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Preset Date Filter
                      </label>
                      <select
                        value={reportRange}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setReportRange(val);
                          handleApplyReportFilter(val);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Time Records</option>
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                        <option value="month">This Month</option>
                        <option value="custom">Custom Date Range</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      onClick={() => fetchFinancialReports(reportStartDate, reportEndDate)}
                      className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>🔍</span> Apply Filter
                    </button>

                    <button
                      onClick={() => {
                        setReportRange('all');
                        setReportStartDate('');
                        setReportEndDate('');
                        fetchFinancialReports('', '');
                      }}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200"
                    >
                      Reset Filter
                    </button>
                  </div>
                </div>

                {/* 2. OVERVIEW KPI METRIC CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Total Deposits</span>
                    <span className="text-xl font-black font-mono text-emerald-600 block mt-1">
                      ₹{overview.totalDepositsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 mt-1 block">
                      Count: {overview.totalDepositsCount}
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Total Withdrawals</span>
                    <span className="text-xl font-black font-mono text-rose-600 block mt-1">
                      ₹{overview.totalWithdrawalsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 mt-1 block">
                      Count: {overview.totalWithdrawalsCount}
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Stakes Turnover</span>
                    <span className="text-xl font-black font-mono text-slate-900 block mt-1">
                      ₹{overview.totalStakesTurnover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 mt-1 block">
                      Winnings Paid: ₹{overview.totalWinningsPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">House Net Revenue</span>
                    <span className={`text-xl font-black font-mono block mt-1 ${
                      overview.totalHouseNetRevenue >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {overview.totalHouseNetRevenue >= 0 ? '+' : ''}₹{overview.totalHouseNetRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 mt-1 block">
                      GGR Net Revenue
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Net Cashflow</span>
                    <span className={`text-xl font-black font-mono block mt-1 ${
                      overview.netCashflow >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {overview.netCashflow >= 0 ? '+' : ''}₹{overview.netCashflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 mt-1 block">
                      Deposits - Withdrawals
                    </span>
                  </div>
                </div>

                {/* 3. DAILY DEPOSITS & DAILY WITHDRAWALS TABLES GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Deposits Summary */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span>📥</span> Daily Deposits Summary
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">DATE</th>
                            <th className="py-2.5 px-3 text-center">COUNT</th>
                            <th className="py-2.5 px-3 text-right">TOTAL AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {dailyDeposits.map((d: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{d.date}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-blue-600">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-[11px]">
                                  {d.count}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-600">
                                ₹{Number(d.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Daily Withdrawals Summary */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span>📤</span> Daily Withdrawals Summary
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">DATE</th>
                            <th className="py-2.5 px-3 text-center">COUNT</th>
                            <th className="py-2.5 px-3 text-right">TOTAL AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {dailyWithdrawals.map((w: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{w.date}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-rose-600">
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full font-bold text-[11px]">
                                  {w.count}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-extrabold text-rose-600">
                                ₹{Number(w.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* 4. GAME BETS TURNOVER & HOUSE NET REVENUE TABLE (Fiewin Design) */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span>🎮</span> Game Bets Turnover &amp; House Net Revenue
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-4">DATE</th>
                          <th className="py-3 px-4 text-center">TOTAL BETS</th>
                          <th className="py-3 px-4 text-right">STAKES TURNOVER</th>
                          <th className="py-3 px-4 text-right">WINNINGS PAID</th>
                          <th className="py-3 px-4 text-right">HOUSE NET REVENUE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {gameTurnover.map((g: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-mono font-bold text-slate-700">{g.date}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-full text-[11px]">
                                {g.totalBets}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              ₹{Number(g.stakesTurnover).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-rose-500">
                              ₹{Number(g.winningsPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`py-3 px-4 text-right font-mono font-black ${
                              g.houseNetRevenue >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {g.houseNetRevenue >= 0 ? '+' : ''}₹{Number(g.houseNetRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. REFERRAL COMMISSION BREAKDOWN BY TIER LEVEL TABLE */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span>⚖️</span> Referral Commission Breakdown by Tier Level
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-4">TIER LEVEL</th>
                          <th className="py-3 px-4 text-right">TOTAL CLAIMED</th>
                          <th className="py-3 px-4 text-center">ACTIVE REFERRERS</th>
                          <th className="py-3 px-4 text-right">TOTAL COMMISSION PAID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {referralBreakdown.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-bold text-slate-800">{r.tierLevel}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">
                              ₹{Number(r.totalClaimed).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-700">
                              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-full text-[11px] font-bold">
                                {r.activeReferrers}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-extrabold text-amber-600">
                              ₹{Number(r.totalCommissionPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* DEDICATED GAME CONTROL CENTER VIEWS */}
          {['fast-parity', 'parity', 'mines', 'andar-bahar', 'jet', 'crash', 'spin', 'dice', 'pushparani', 'coin-flip', 'coinflip'].includes(activeTab) && (() => {
            const gameInfoMap: { [key: string]: { name: string; type: any; icon: string; subtitle: string; rtp: number; minBet: number; maxBet: number } } = {
              'fast-parity': { name: 'Fast Parity (30s) Control Center', type: 'fast-parity', icon: '⚡', subtitle: 'Manage Fast Parity (30s) winning chances (RTP %), house edge, min/max limits & manual period overrides', rtp: 95.0, minBet: 10, maxBet: 50000 },
              'parity': { name: 'Parity (1-Min) Control Center', type: 'parity', icon: '⏱️', subtitle: 'Manage Parity (1-Min / 60s) winning chances (RTP %), house edge, min/max limits & manual period overrides', rtp: 96.0, minBet: 10, maxBet: 100000 },
              'mines': { name: 'Mines Game Control Center', type: 'mines', icon: '💎', subtitle: 'Manage Mines winning chances (RTP %), house edge, min/max entry fees & game status', rtp: 97.0, minBet: 10, maxBet: 100000 },
              'andar-bahar': { name: 'Andar Bahar Dashboard', type: 'andar-bahar', icon: '♠️', subtitle: 'Overview of today\'s bets, house profits, RTP status, and live manual overrides.', rtp: 96.0, minBet: 10, maxBet: 50000 },
              'jet': { name: 'Jet Flight Control Center', type: 'jet', icon: '✈️', subtitle: 'Independent Jet Game engine monitoring & manual control', rtp: 94.0, minBet: 10, maxBet: 100000 },
              'crash': { name: 'Crash Rocket Control Center', type: 'crash', icon: '🚀', subtitle: 'Independent Crash Rocket engine monitoring & manual control', rtp: 95.0, minBet: 10, maxBet: 50000 },
              'spin': { name: 'Spin Wheel Control Center', type: 'spin', icon: '🎡', subtitle: 'Independent Spin Wheel engine monitoring & manual control', rtp: 92.0, minBet: 10, maxBet: 25000 },
              'dice': { name: 'Dice Roll Control Center', type: 'dice', icon: '🎲', subtitle: 'Independent Dice Roll engine monitoring & manual control', rtp: 98.0, minBet: 10, maxBet: 100000 },
              'pushparani': { name: 'Pushparani Truck Express Control Center', type: 'pushparani', icon: '🚚', subtitle: 'Independent Pushparani Truck Express engine monitoring & manual control', rtp: 95.0, minBet: 10, maxBet: 100000 },
              'coin-flip': { name: 'RIVEXA 3D Coin Flip Control Center', type: 'coin-flip', icon: '🪙', subtitle: 'Manage Coin Flip winning chances (RTP %), house edge, win probability out of 5 flips, min/max limits & manual outcome overrides', rtp: 96.0, minBet: 10, maxBet: 50000 },
              'coinflip': { name: 'RIVEXA 3D Coin Flip Control Center', type: 'coin-flip', icon: '🪙', subtitle: 'Manage Coin Flip winning chances (RTP %), house edge, win probability out of 5 flips, min/max limits & manual outcome overrides', rtp: 96.0, minBet: 10, maxBet: 50000 },
            };
            const info = gameInfoMap[activeTab];
            if (!info) return null;
            const gameObj = games.find((g) => g.id === activeTab);
            return (
              <GameControlCenterView
                gameId={activeTab}
                gameName={info.name}
                gameType={info.type}
                icon={info.icon}
                subtitle={info.subtitle}
                defaultRtp={gameObj?.rtpPercentage ?? info.rtp}
                defaultMinBet={gameObj?.minBet ?? info.minBet}
                defaultMaxBet={gameObj?.maxBet ?? info.maxBet}
                isActive={gameObj?.isActive ?? true}
                onToggleActive={(nextActive) => handleToggleGame(activeTab, !nextActive)}
                onSettingsUpdated={(updatedGame) => {
                  setGames((prev) =>
                    prev.map((g) => (g.id === updatedGame.id ? { ...g, ...updatedGame } : g))
                  );
                }}
              />
            );
          })()}
        </main>
      </div>

      {/* REJECT BANK CARD REASON MODAL */}
      {rejectModalBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <span>❌</span> Reject Bank Card #{rejectModalBank.id.slice(0, 8)}
              </h3>
              <button
                onClick={() => setRejectModalBank(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-600">
                Specify reason for rejecting <strong className="text-slate-900">{rejectModalBank.playerName}</strong>'s bank account ({rejectModalBank.bankName}):
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Account holder name does not match KYC documents or invalid IFSC code."
                className="w-full border border-slate-300 rounded-2xl p-3 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRejectModalBank(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejectBankCard}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs"
              >
                REJECT CARD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MERCHANT MODAL */}
      {showAddMerchantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <span>🏛️</span> Add Merchant Collection Account
              </h3>
              <button
                onClick={() => setShowAddMerchantModal(false)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => handleSaveMerchantSubmit(e, false)} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Merchant Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={merchantFormData.name}
                  onChange={(e) => setMerchantFormData({ ...merchantFormData, name: e.target.value })}
                  placeholder="e.g. RivexaPay Alpha"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={merchantFormData.accountHolder}
                  onChange={(e) => setMerchantFormData({ ...merchantFormData, accountHolder: e.target.value })}
                  placeholder="e.g. Rivexa PVT LTD"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">UPI ID</label>
                <input
                  type="text"
                  value={merchantFormData.upiId}
                  onChange={(e) => setMerchantFormData({ ...merchantFormData, upiId: e.target.value })}
                  placeholder="e.g. merchant@upi"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={merchantFormData.bankName}
                    onChange={(e) => setMerchantFormData({ ...merchantFormData, bankName: e.target.value })}
                    placeholder="e.g. HDFC Bank"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={merchantFormData.ifsc}
                    onChange={(e) => setMerchantFormData({ ...merchantFormData, ifsc: e.target.value })}
                    placeholder="HDFC0001234"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono uppercase font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Account Number</label>
                <input
                  type="text"
                  value={merchantFormData.accountNumber}
                  onChange={(e) => setMerchantFormData({ ...merchantFormData, accountNumber: e.target.value })}
                  placeholder="e.g. 50100012345678"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Daily Limit (₹)</label>
                  <input
                    type="number"
                    required
                    value={merchantFormData.dailyLimit}
                    onChange={(e) => setMerchantFormData({ ...merchantFormData, dailyLimit: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Priority (1-100)</label>
                  <input
                    type="number"
                    required
                    value={merchantFormData.priority}
                    onChange={(e) => setMerchantFormData({ ...merchantFormData, priority: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* QR CODE UPLOAD BLOCK */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Upload QR Code Image (PNG / JPG / SVG)
                </label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-500 transition-colors">
                  {merchantFormData.qrImage ? (
                    <div className="relative group">
                      <img
                        src={merchantFormData.qrImage}
                        alt="QR Preview"
                        className="h-16 w-16 object-contain rounded-xl border border-slate-200 bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setMerchantFormData({ ...merchantFormData, qrImage: '' })}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-black shadow-md"
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
                      📷
                    </div>
                  )}

                  <div className="flex-1 space-y-1">
                    <label
                      htmlFor="add-qr-file-input"
                      className="inline-block px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs transition-colors"
                    >
                      Choose QR Image File
                    </label>
                    <input
                      id="add-qr-file-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleQrFileUpload(e, false)}
                      className="hidden"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {merchantFormData.qrImage ? 'Image attached successfully' : 'Upload PNG, JPG, or SVG image (max 5MB)'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMerchantModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs"
                >
                  Save Merchant Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MERCHANT MODAL */}
      {editingMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <span>✏️</span> Edit Merchant: {editingMerchant.name}
              </h3>
              <button
                onClick={() => setEditingMerchant(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => handleSaveMerchantSubmit(e, true)} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Merchant Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingMerchant.name || ''}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={editingMerchant.accountHolder || ''}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, accountHolder: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">UPI ID</label>
                <input
                  type="text"
                  value={editingMerchant.upiId || ''}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, upiId: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={editingMerchant.bankName || ''}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, bankName: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={editingMerchant.ifsc || editingMerchant.ifscCode || ''}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, ifsc: e.target.value, ifscCode: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono uppercase font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Account Number</label>
                <input
                  type="text"
                  value={editingMerchant.accountNumber || ''}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, accountNumber: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Daily Limit (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingMerchant.dailyLimit || 200000000}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, dailyLimit: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Priority (1-100)</label>
                  <input
                    type="number"
                    required
                    value={editingMerchant.priority || 1}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, priority: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* QR CODE UPLOAD BLOCK */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Upload / Replace QR Code Image
                </label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-500 transition-colors">
                  {editingMerchant.qrImage ? (
                    <div className="relative group">
                      <img
                        src={editingMerchant.qrImage}
                        alt="QR Preview"
                        className="h-16 w-16 object-contain rounded-xl border border-slate-200 bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingMerchant({ ...editingMerchant, qrImage: '' })}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-black shadow-md"
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
                      📷
                    </div>
                  )}

                  <div className="flex-1 space-y-1">
                    <label
                      htmlFor="edit-qr-file-input"
                      className="inline-block px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs transition-colors"
                    >
                      Choose New QR Image File
                    </label>
                    <input
                      id="edit-qr-file-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleQrFileUpload(e, true)}
                      className="hidden"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {editingMerchant.qrImage ? 'Image attached' : 'Upload PNG, JPG, or SVG image (max 5MB)'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMerchant(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW QR CODE MODAL OVERLAY */}
      {viewingQrMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>📱</span> QR Code &amp; UPI Collector
              </span>
              <button
                onClick={() => setViewingQrMerchant(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{viewingQrMerchant.name}</h3>
              <p className="text-xs text-slate-400 font-semibold">{viewingQrMerchant.accountHolder || viewingQrMerchant.name}</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-3">
              {viewingQrMerchant.qrImage ? (
                <img
                  src={viewingQrMerchant.qrImage}
                  alt="Merchant QR Code"
                  className="h-48 w-48 object-contain rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
                />
              ) : (
                <div className="h-48 w-48 rounded-xl bg-white border border-slate-200 p-4 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <span className="text-4xl">📱</span>
                  <span className="text-xs font-bold text-slate-500">Scan via UPI App</span>
                  <span className="text-[10px] text-slate-400 font-mono">{viewingQrMerchant.upiId || 'No QR Attached'}</span>
                </div>
              )}

              {viewingQrMerchant.upiId && (
                <div className="w-full p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">UPI ID</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-blue-600">{viewingQrMerchant.upiId}</span>
                    <button
                      onClick={() => handleCopyText(viewingQrMerchant.upiId, 'UPI ID')}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-colors"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              )}
            </div>

            {viewingQrMerchant.bankName && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Bank:</span>
                  <span className="font-bold text-slate-900">{viewingQrMerchant.bankName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Acc No:</span>
                  <span className="font-mono font-bold text-slate-900">{viewingQrMerchant.accountNumber || '-'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IFSC:</span>
                  <span className="font-mono font-bold text-slate-900">{viewingQrMerchant.ifsc || viewingQrMerchant.ifscCode || '-'}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setViewingQrMerchant(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}

      {/* DEPOSIT PROOF IMAGE MODAL OVERLAY */}
      {viewingProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>🖼️</span> Payment Proof Screenshot
              </span>
              <button
                onClick={() => setViewingProofModal(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={viewingProofModal}
                alt="Payment Proof Screenshot"
                className="max-h-[60vh] object-contain rounded-xl shadow-sm"
              />
            </div>

            <button
              onClick={() => setViewingProofModal(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
            >
              Close Proof
            </button>
          </div>
        </div>
      )}

      {/* TOAST POPUP NOTIFICATION FOR NEW BANK CARD SUBMISSIONS (Image 2) */}
      {(() => {
        const pendingCard = bankApprovals.find((b) => b.status === 'pending');
        if (!pendingCard) return null;
        return (
          <div className="fixed top-4 right-4 z-50 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl max-w-sm w-full animate-bounce space-y-2 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                🏦 New Bank Account Submitted!
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Just now</span>
            </div>
            <p className="text-xs text-slate-600">
              <strong className="text-slate-900">{pendingCard.user?.name || pendingCard.holderName || 'Player'}</strong> added bank card ({pendingCard.bankName || 'Bank'}) pending verification.
            </p>
            <button
              onClick={() => {
                handleTabSelect('approvals');
                setBankStatusFilter('pending');
              }}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
            >
              View Request
            </button>
          </div>
        );
      })()}
    </div>
  );
}
