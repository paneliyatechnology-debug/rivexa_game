'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  fetchNotifications: async () => {},
  fetchUnreadCount: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchUnreadCount = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('rivexa_token');
    if (!token) {
      setUnreadCount(0);
      return;
    }

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
          try {
            localStorage.setItem('rivexa_unread_notifications', String(data.unreadCount));
          } catch {}
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('rivexa_token');
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/notifications?limit=25`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.notifications) ? data.notifications : [];
        setNotifications(list);
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        } else {
          const unread = list.filter((n: NotificationItem) => !n.isRead).length;
          setUnreadCount(unread);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('rivexa_token');
    if (!token) return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => {
      const next = Math.max(0, prev - 1);
      try {
        localStorage.setItem('rivexa_unread_notifications', String(next));
      } catch {}
      window.dispatchEvent(
        new CustomEvent('notifications_sync', { detail: { unreadCount: next } })
      );
      return next;
    });

    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('rivexa_token');
    if (!token) return;

    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      localStorage.setItem('rivexa_unread_notifications', '0');
    } catch {}
    window.dispatchEvent(
      new CustomEvent('notifications_sync', { detail: { unreadCount: 0 } })
    );

    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  }, []);

  // Fetch initial unread count on mount or auth change
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount, isAuthenticated]);

  // Synchronize across tabs and custom events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSync = (e: Event) => {
      const custom = e as CustomEvent;
      if (typeof custom?.detail?.unreadCount === 'number') {
        setUnreadCount(custom.detail.unreadCount);
      } else {
        fetchUnreadCount();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'rivexa_unread_notifications' && e.newValue !== null) {
        setUnreadCount(parseInt(e.newValue, 10) || 0);
      } else if (e.key === 'rivexa_token') {
        fetchUnreadCount();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    };

    window.addEventListener('notifications_sync', handleSync);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', fetchUnreadCount);

    return () => {
      window.removeEventListener('notifications_sync', handleSync);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', fetchUnreadCount);
    };
  }, [fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
