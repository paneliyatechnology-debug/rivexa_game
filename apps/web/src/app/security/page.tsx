'use client';

import React from 'react';
import { TopHeader, BottomNavigation } from '@/components/Navigation';

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 font-sans">
      <TopHeader />
      <main className="p-4 space-y-4 max-w-[480px] mx-auto">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 font-black text-lg border-b border-slate-100 pb-3">
            <i className="bi bi-lock-fill text-xl" />
            <h1>HTTPS Security</h1>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your connection to GameHub is secured using end-to-end Transport Layer Security (TLS/SSL encryption).
          </p>
          <div className="space-y-2 text-xs text-slate-700">
            <h2 className="font-extrabold text-slate-900 text-sm">1. Payment Security</h2>
            <p className="leading-relaxed">
              Deposits and withdrawals are processed via secure UPI payment gateways using strict checksum verification and UTR reconciliation.
            </p>
          </div>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
