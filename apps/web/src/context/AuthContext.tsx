'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface BankAccount {
  id: string;
  holderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
  status: string;
  isPrimary: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  kycStatus: string;
  referralCode: string;
  wallet?: any;
  bankAccounts?: BankAccount[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  balance: number;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  balance: 0,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
  refreshBalance: async () => {},
});

import { getApiBaseUrl, getWsBaseUrl } from '@/lib/config';
import { io } from 'socket.io-client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const fetchBalance = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/wallet/balance?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        const mainBal = Number(data.mainBalance);
        if (!isNaN(mainBal)) {
          setBalance(mainBal);
          if (typeof window !== 'undefined') {
            localStorage.setItem('rivexa_wallet_balance', String(mainBal));
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;

    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setBalance(0);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setIsAuthenticated(true);

        const bal = userData.wallet?.mainBalance != null ? Number(userData.wallet.mainBalance) : 0;
        setBalance(isNaN(bal) ? 0 : bal);

        if (typeof window !== 'undefined') {
          localStorage.setItem('rivexa_user', JSON.stringify(userData));
          if (!isNaN(bal)) {
            localStorage.setItem('rivexa_wallet_balance', String(bal));
          }
        }

        if (userData?.id) {
          fetchBalance(userData.id);
        }
      } else if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('rivexa_token');
          localStorage.removeItem('rivexa_user');
          localStorage.removeItem('rivexa_wallet_balance');
        }
        setUser(null);
        setIsAuthenticated(false);
        setBalance(0);
      } else {
        const cachedUserStr = typeof window !== 'undefined' ? localStorage.getItem('rivexa_user') : null;
        if (cachedUserStr) {
          try {
            const cachedUser = JSON.parse(cachedUserStr);
            setUser(cachedUser);
            setIsAuthenticated(true);
            const bal = cachedUser.wallet?.mainBalance != null ? Number(cachedUser.wallet.mainBalance) : 0;
            setBalance(isNaN(bal) ? 0 : bal);
            if (cachedUser?.id) fetchBalance(cachedUser.id);
          } catch (e) {
            setUser(null);
            setIsAuthenticated(false);
            setBalance(0);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setBalance(0);
        }
      }
    } catch (err) {
      const cachedUserStr = typeof window !== 'undefined' ? localStorage.getItem('rivexa_user') : null;
      if (cachedUserStr) {
        try {
          const cachedUser = JSON.parse(cachedUserStr);
          setUser(cachedUser);
          setIsAuthenticated(true);
          const bal = cachedUser.wallet?.mainBalance != null ? Number(cachedUser.wallet.mainBalance) : 0;
          setBalance(isNaN(bal) ? 0 : bal);
          if (cachedUser?.id) fetchBalance(cachedUser.id);
        } catch (e) {
          setUser(null);
          setIsAuthenticated(false);
          setBalance(0);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setBalance(0);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchBalance]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Real-time Custom Event Wallet Balance Synchronization
  useEffect(() => {
    const handleCustomWalletUpdate = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom?.detail?.balance !== undefined) {
        const bal = Number(custom.detail.balance);
        if (!isNaN(bal)) {
          setBalance(bal);
          if (typeof window !== 'undefined') {
            localStorage.setItem('rivexa_wallet_balance', String(bal));
            const cachedUserStr = localStorage.getItem('rivexa_user');
            if (cachedUserStr) {
              try {
                const u = JSON.parse(cachedUserStr);
                if (!u.wallet) u.wallet = {};
                u.wallet.mainBalance = bal;
                localStorage.setItem('rivexa_user', JSON.stringify(u));
              } catch (err) {}
            }
          }
        }
      }
    };

    window.addEventListener('wallet:updated', handleCustomWalletUpdate);
    return () => {
      window.removeEventListener('wallet:updated', handleCustomWalletUpdate);
    };
  }, []);

  // Real-time WebSocket Wallet Balance Synchronization
  useEffect(() => {
    if (!user?.id) return;
    try {
      const wsUrl = getWsBaseUrl();
      const socket = io(wsUrl, { transports: ['websocket', 'polling'] });

      socket.on('connect', () => {
        socket.emit('join:user', { userId: user.id });
      });

      socket.on('wallet:update', (data: { mainBalance: number }) => {
        if (data && data.mainBalance !== undefined) {
          const bal = Number(data.mainBalance);
          if (!isNaN(bal)) {
            setBalance(bal);
          }
        }
      });

      return () => {
        socket.disconnect();
      };
    } catch (e) {}
  }, [user?.id]);

  const refreshBalance = useCallback(async () => {
    if (user?.id) {
      await fetchBalance(user.id);
    }
  }, [user?.id, fetchBalance]);

  const login = (token: string, userData: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rivexa_token', token);
      localStorage.setItem('rivexa_user', JSON.stringify(userData));
    }
    setUser(userData);
    setIsAuthenticated(true);
    const bal = userData.wallet?.mainBalance != null ? Number(userData.wallet.mainBalance) : 0;
    setBalance(isNaN(bal) ? 0 : bal);
    setLoading(false);
    if (userData?.id) {
      fetchBalance(userData.id);
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rivexa_token');
      localStorage.removeItem('rivexa_user');
    }
    setUser(null);
    setIsAuthenticated(false);
    setBalance(0);
    setLoading(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        balance,
        login,
        logout,
        refreshUser: fetchUser,
        refreshBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
