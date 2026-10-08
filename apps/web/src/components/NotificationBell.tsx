'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { GameHubIcon } from '@/components/gamehub/GameHubIcon';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import { CheckCheck, ExternalLink, Bell, ArrowRight } from 'lucide-react';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function getNotificationIconClass(type: string = ''): string {
  const t = type.toLowerCase();
  if (t.includes('deposit')) return 'bi-arrow-down-circle-fill text-emerald-400';
  if (t.includes('withdrawal') && t.includes('reject')) return 'bi-x-circle-fill text-rose-500';
  if (t.includes('withdrawal')) return 'bi-check-circle-fill text-emerald-400';
  if (t.includes('bank') && t.includes('reject')) return 'bi-exclamation-triangle-fill text-rose-500';
  if (t.includes('bank')) return 'bi-patch-check-fill text-emerald-400';
  if (t.includes('promo') || t.includes('offer') || t.includes('bonus')) return 'bi-gift-fill text-amber-400';
  if (t.includes('game') || t.includes('hilo')) return 'bi-controller text-[#00D9FF]';
  return 'bi-bell-fill text-[#287BFF]';
}

export function NotificationBell({ className = '' }: { className?: string }) {
  const { isAuthenticated } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<React.CSSProperties>({});

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // When opening, fetch fresh notifications and compute responsive positioning
  useEffect(() => {
    if (isOpen) {
      if (isAuthenticated) {
        fetchNotifications();
      }

      if (containerRef.current && typeof window !== 'undefined') {
        const rect = containerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const panelWidth = Math.min(380, Math.max(280, viewportWidth - 20));

        // When right-aligned, the panel's left edge is rect.right - panelWidth.
        // If that's less than 10px from the left edge of screen, shift panel rightwards.
        const leftEdge = rect.right - panelWidth;
        if (leftEdge < 10) {
          const shiftRight = 10 - leftEdge;
          setDropdownPos({
            right: `-${shiftRight}px`,
            width: `${panelWidth}px`,
          });
        } else {
          setDropdownPos({
            right: '0px',
            width: `${panelWidth}px`,
          });
        }
      }
    }
  }, [isOpen, isAuthenticated, fetchNotifications]);

  return (
    <div className={`relative shrink-0 ${className}`} ref={containerRef}>
      {/* ─── Notification Button (Strict match with Home page) ─── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Notifications"
        title="Notifications"
        className="relative w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-[#101C3A] border border-white/10 flex items-center justify-center shrink-0 hover:border-amber-400/40 transition-all cursor-pointer active:scale-95"
      >
        <GameHubIcon name="bell" size={14} isActive activeColor="#FFC928" className="sm:hidden" />
        <GameHubIcon name="bell" size={16} isActive activeColor="#FFC928" className="hidden sm:block" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-600 text-[8px] font-black text-white flex items-center justify-center shadow-lg pointer-events-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ─── Global Notification Dropdown / Panel ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            style={dropdownPos}
            className="absolute top-full mt-2 rounded-2xl bg-[#091530]/95 backdrop-blur-2xl border border-[#287BFF]/40 shadow-[0_16px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(40,123,255,0.22)] z-[100] overflow-hidden flex flex-col"
          >
            {/* Top glowing accent banner */}
            <div className="h-0.5 w-full bg-gradient-to-r from-[#FFC928] via-[#00D9FF] to-[#873BFF]" />

            {/* Header */}
            <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between gap-2 bg-[#061024]/70 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#FFC928]/15 border border-[#FFC928]/30 flex items-center justify-center text-[#FFC928]">
                  <GameHubIcon name="bell" size={13} isActive activeColor="#FFC928" />
                </div>
                <span className="text-xs sm:text-sm font-black text-white tracking-wide">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-600 text-white leading-tight">
                    {unreadCount}
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead()}
                  className="text-[11px] font-bold text-[#00D9FF] hover:text-white hover:underline transition-colors cursor-pointer flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* Body: Feed */}
            <div className="max-h-[340px] sm:max-h-[380px] overflow-y-auto p-2 space-y-1.5 text-left">
              {!isAuthenticated ? (
                <div className="py-8 px-4 text-center space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                    <GameHubIcon name="bell" size={20} color="#7285AE" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Sign In to View Alerts</p>
                    <p className="text-[11px] text-[#7285AE] mt-0.5">
                      Your bonuses, deposit updates & messages will appear here.
                    </p>
                  </div>
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-[#00D9FF] to-[#287BFF] text-[#050B20] text-xs font-black shadow-md hover:brightness-110 transition-all"
                  >
                    Log In
                  </Link>
                </div>
              ) : loading ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-6 h-6 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold text-slate-400">Loading notifications...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 px-4 text-center space-y-1.5">
                  <div className="w-10 h-10 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                    <GameHubIcon name="bell" size={20} color="#7285AE" />
                  </div>
                  <p className="text-xs font-bold text-slate-200">No Notifications</p>
                  <p className="text-[11px] text-[#7285AE]">
                    You&apos;re all caught up! Game updates and bonuses will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isUnread = !notif.isRead;
                  const iconClass = getNotificationIconClass(notif.type);

                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (isUnread) markAsRead(notif.id);
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                        isUnread
                          ? 'bg-[#10224A]/70 border-[#287BFF]/40 hover:bg-[#142857]'
                          : 'bg-[#0a142c]/40 border-white/5 hover:bg-[#0e1c3e]/60'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <i className={`bi ${iconClass} text-xs`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white truncate">
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-[#7285AE] shrink-0 font-medium">
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#A8B9DE] leading-snug mt-0.5 break-words line-clamp-2">
                          {notif.message}
                        </p>
                      </div>

                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[#00D9FF] shrink-0 mt-2 shadow-[0_0_6px_#00D9FF]" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-white/10 bg-[#061024]/75 flex items-center justify-center shrink-0">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-[#A8B9DE] hover:text-white flex items-center gap-1.5 transition-colors py-1 px-3 rounded-lg hover:bg-white/5"
              >
                <span>View All Notifications</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;
