'use client';

import React from 'react';
import { TopHeader, BottomNavigation } from '@/components/Navigation';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 font-sans">
      <TopHeader />
      <main className="p-4 space-y-4 max-w-[480px] mx-auto">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-blue-600 font-black text-lg border-b border-slate-100 pb-3">
            <i className="bi bi-file-earmark-text-fill text-xl" />
            <h1>Terms & Rules</h1>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            By creating an account or accessing GameHub, you agree to comply with and be bound by the following terms and conditions of use.
          </p>
          <div className="space-y-2 text-xs text-slate-700">
            <h2 className="font-extrabold text-slate-900 text-sm">1. Player Eligibility</h2>
            <p className="leading-relaxed">
              You must be at least 18 years of age or the age of legal majority in your jurisdiction to register and participate in games.
            </p>
            <h2 className="font-extrabold text-slate-900 text-sm">2. Account Responsibility</h2>
            <p className="leading-relaxed">
              Players are responsible for maintaining the confidentiality of their account credentials. Multiple accounts or automated bot usage are strictly prohibited.
            </p>
            <h2 className="font-extrabold text-slate-900 text-sm">3. Fair Play</h2>
            <p className="leading-relaxed">
              All game outcomes are determined by verifiable random seed engines. Any attempt to exploit system bugs will result in account suspension.
            </p>
          </div>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
