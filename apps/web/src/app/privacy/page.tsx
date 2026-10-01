'use client';

import React from 'react';
import { TopHeader, BottomNavigation } from '@/components/Navigation';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 font-sans">
      <TopHeader />
      <main className="p-4 space-y-4 max-w-[480px] mx-auto">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-blue-600 font-black text-lg border-b border-slate-100 pb-3">
            <i className="bi bi-shield-lock-fill text-xl" />
            <h1>Privacy Policy</h1>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            At GameHub, we are deeply committed to protecting your personal information and respecting your privacy. This Privacy Policy outlines how we collect, store, process, and safeguard your data when you access our platform.
          </p>
          <div className="space-y-2 text-xs text-slate-700">
            <h2 className="font-extrabold text-slate-900 text-sm">1. Data Collection</h2>
            <p className="leading-relaxed">
              We collect information you provide directly to us upon registration, deposit, withdrawal, or customer support communication (such as email address, phone number, and transaction records).
            </p>
            <h2 className="font-extrabold text-slate-900 text-sm">2. Security & Encryption</h2>
            <p className="leading-relaxed">
              All financial transactions and player data are encrypted using 256-bit SSL protocols. We store user data in secure database infrastructure with access restricted to authorized personnel.
            </p>
            <h2 className="font-extrabold text-slate-900 text-sm">3. Contact Us</h2>
            <p className="leading-relaxed">
              If you have any questions or concerns regarding your privacy, please contact our support team.
            </p>
          </div>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
