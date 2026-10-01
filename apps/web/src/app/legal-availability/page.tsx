'use client';

import React from 'react';
import { TopHeader, BottomNavigation } from '@/components/Navigation';

export default function LegalAvailabilityPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 font-sans">
      <TopHeader />
      <main className="p-4 space-y-4 max-w-[480px] mx-auto">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-amber-600 font-black text-lg border-b border-slate-100 pb-3">
            <i className="bi bi-geo-alt-fill text-xl" />
            <h1>Legal Availability</h1>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Real-money skill games are regulated by jurisdictional laws. Players are responsible for verifying local legal status before depositing funds.
          </p>
          <div className="space-y-2 text-xs text-slate-700">
            <h2 className="font-extrabold text-slate-900 text-sm">1. Regional Restrictions</h2>
            <p className="leading-relaxed">
              Users residing in regions where real-money skill games are legally restricted (e.g. Telangana, Odisha, Assam, Nagaland, Sikkim, Andhra Pradesh) are not permitted to deposit or wager funds.
            </p>
          </div>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
