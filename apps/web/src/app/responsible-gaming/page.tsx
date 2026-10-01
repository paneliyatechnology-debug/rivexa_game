'use client';

import React from 'react';
import { TopHeader, BottomNavigation } from '@/components/Navigation';

export default function ResponsibleGamingPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 font-sans">
      <TopHeader />
      <main className="p-4 space-y-4 max-w-[480px] mx-auto">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-rose-600 font-black text-lg border-b border-slate-100 pb-3">
            <i className="bi bi-heart-pulse-fill text-xl" />
            <h1>Responsible Gaming</h1>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            GameHub encourages a healthy and responsible attitude towards online gaming. Gaming should be an enjoyable entertainment activity, not a source of financial stress.
          </p>
          <div className="space-y-2 text-xs text-slate-700">
            <h2 className="font-extrabold text-slate-900 text-sm">1. Set Limits</h2>
            <p className="leading-relaxed">
              Never gamble money you cannot afford to lose. Establish personal budgets and time limits before playing.
            </p>
            <h2 className="font-extrabold text-slate-900 text-sm">2. Self-Exclusion</h2>
            <p className="leading-relaxed">
              If you feel gaming is affecting your life negatively, you can request temporary or permanent self-exclusion by contacting support.
            </p>
          </div>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
