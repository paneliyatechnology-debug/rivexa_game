'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TopHeader, BottomNavigation } from '@/components/Navigation';
import { getApiBaseUrl } from '@/lib/config';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [fetching, setFetching] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  const loadNotifications = async () => {
    const token = localStorage.getItem('rivexa_token');
    if (!token) return;

    setFetching(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
    }
  }, [isAuthenticated]);

  const handleMarkAsRead = async (id: string) => {
    const token = localStorage.getItem('rivexa_token');
    if (!token) return;

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem('rivexa_token');
    if (!token) return;

    setActionLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/notifications/read-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || (isAuthenticated && fetching)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
        <p className="text-sm font-bold text-slate-400">Loading notifications...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const balance = user.wallet?.mainBalance ? parseFloat(user.wallet.mainBalance) : 0;

  const getNotificationIcon = (type = '') => {
    const t = type.toLowerCase();
    if (t.includes('deposit')) return 'bi-arrow-down-circle-fill text-emerald-500';
    if (t.includes('withdrawal') && t.includes('reject')) return 'bi-x-circle-fill text-rose-500';
    if (t.includes('withdrawal')) return 'bi-check-circle-fill text-emerald-500';
    if (t.includes('bank') && t.includes('reject')) return 'bi-exclamation-triangle-fill text-rose-500';
    if (t.includes('bank')) return 'bi-patch-check-fill text-emerald-500';
    if (t.includes('promo') || t.includes('offer')) return 'bi-gift-fill text-amber-500';
    return 'bi-bell-fill text-blue-500';
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 font-sans">
      <TopHeader balance={balance} />

      <main className="p-4 space-y-4 max-w-[480px] mx-auto">
        {/* Top Header Card */}
        <div className="rounded-2xl p-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-amber-300 text-xl">
                <i className="bi bi-bell-fill" />
              </div>
              <div>
                <h1 className="text-base font-black text-white leading-tight">Notifications Center</h1>
                <p className="text-xs text-blue-100 opacity-90">
                  Track deposit, withdrawal & promo updates
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={actionLoading}
                className="text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-full shadow-sm transition-colors"
              >
                <i className="bi bi-check2-all me-1" />
                Mark All Read ({unreadCount})
              </button>
            )}
          </div>
        </div>

        {/* Notifications List Feed Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <i className="bi bi-inbox-fill text-blue-600" />
              Recent System Alerts
            </h2>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Total: {totalCount}
            </span>
          </div>

          {notifications.length > 0 ? (
            <div className="space-y-2.5">
              {notifications.map((notif) => {
                const iconClass = getNotificationIcon(notif.type);
                const isUnunread = !notif.isRead;

                return (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isUnunread
                        ? 'bg-blue-50/70 border-blue-200 shadow-sm'
                        : 'bg-white border-slate-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xl flex-shrink-0 mt-0.5 shadow-sm">
                        <i className={`bi ${iconClass}`} />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black text-slate-900 truncate">
                              {notif.title}
                            </h3>
                            {isUnunread && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-rose-500 text-white">
                                NEW
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            <i className="bi bi-clock me-1" />
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed break-words">
                          {notif.message}
                        </p>

                        {isUnunread && (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-100/60 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors"
                            >
                              Mark Read
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <i className="bi bi-bell-slash text-4xl text-slate-300 block" />
              <h3 className="text-sm font-bold text-slate-700">No Notifications Found</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                You're all caught up! Deposit, withdrawal and promo alerts will appear here.
              </p>
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
