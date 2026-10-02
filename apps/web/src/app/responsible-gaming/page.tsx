'use client';

import React from 'react';
import Link from 'next/link';
import { LegalLayout, LegalSectionCard } from '@/components/legal/LegalLayout';
import {
  HeartPulse,
  AlertTriangle,
  Sliders,
  Shield,
  Clock,
  UserX,
  PhoneCall,
  CheckCircle2,
  LifeBuoy
} from 'lucide-react';

export default function ResponsibleGamingPage() {
  return (
    <LegalLayout
      title="Responsible Gaming"
      description="Gaming should always be exciting, healthy, and entertaining. We provide transparent safeguards, limit tools, and self-exclusion measures to keep you in control."
      icon={<HeartPulse className="w-8 h-8 sm:w-9 sm:h-9 text-[#F43F5E]" />}
      lastUpdated="October 2026"
      accentGlow="rose"
      currentPageName="Responsible Gaming"
      badge={{
        text: 'Player Protection & Well-being',
        icon: <Shield className="w-3.5 h-3.5" />,
        variant: 'rose',
      }}
      topHeroExtra={
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/35 shadow-[0_0_20px_rgba(244,63,94,0.15)] flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-200/90 leading-relaxed">
            <strong className="text-white block font-bold mb-0.5">Important Safety Advisory:</strong>
            Online real-money skill gaming carries inherent financial risk and can become habit-forming if not managed mindfully. Never bet funds essential for your living expenses.
          </div>
        </div>
      }
    >
      <LegalSectionCard number="01" title="Play Responsibly — Core Principles" icon={<HeartPulse className="w-4 h-4 text-rose-400" />} accent="rose">
        <p>
          At GameHub, player health and mental peace are our highest priorities. We believe real-money skill games are meant strictly for recreational leisure, not as a guaranteed investment vehicle, debt relief strategy, or substitute for employment.
        </p>
        <p>
          Always establish clear personal time and budget boundaries before entering any gaming lobby.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="02" title="Setting Personal Gaming Limits" icon={<Sliders className="w-4 h-4 text-rose-400" />} accent="rose">
        <p>
          Taking control of your finances is the most effective way to maintain healthy gaming habits:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li><strong>Deposit Limits:</strong> Establish daily, weekly, or monthly deposit caps that you strictly adhere to.</li>
          <li><strong>Session Time Management:</strong> Set an alarm or timer before you start playing and step away when your allotted time expires.</li>
          <li><strong>Loss Ceiling:</strong> Predetermine an acceptable loss threshold for the day. If reached, exit immediately.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard number="03" title="Self-Control & Emotional Discipline" icon={<Clock className="w-4 h-4 text-rose-400" />} accent="rose">
        <p>
          Follow these golden rules to avoid reckless play:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li><strong>Never Chase Losses:</strong> Increasing your wager size to recover previous losses is the most common cause of financial strain.</li>
          <li><strong>Stay Mindful:</strong> Never play when feeling depressed, anxious, stressed, or under the influence of alcohol or substances.</li>
          <li><strong>Keep Balance:</strong> Maintain diverse hobbies, spending time with family, work, and physical exercise alongside gaming.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard number="04" title="Warning Signs of Problem Gaming" icon={<AlertTriangle className="w-4 h-4 text-rose-400" />} accent="rose">
        <p>
          Ask yourself the following questions. If you answer &quot;Yes&quot; to multiple points, your gaming may be problematic:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li>Do you find yourself betting more money than you originally planned?</li>
          <li>Have you borrowed money, sold assets, or used bill money to gamble?</li>
          <li>Do you conceal or lie about the extent of your gaming to friends or family?</li>
          <li>Does gaming interfere with your professional career, education, or family life?</li>
          <li>Do you feel an irresistible urge to immediately gamble back money after losing?</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard number="05" title="Account Restrictions & Self-Exclusion" icon={<UserX className="w-4 h-4 text-rose-400" />} accent="rose">
        <p>
          If you believe you need time away from gaming, GameHub provides proactive account restrictions:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li><strong>Cool-Off Period (24h to 7 days):</strong> Temporary lockout where all login access is blocked.</li>
          <li><strong>Extended Break (1 month to 6 months):</strong> Account temporarily suspended with deposits disabled.</li>
          <li><strong>Permanent Self-Exclusion:</strong> Permanent irreversible closure of your account and refund of eligible remaining balances.</li>
        </ul>
        <p className="pt-1">
          To initiate a self-exclusion request, simply contact our dedicated support team via <Link href="/contact" className="text-[#00D9FF] hover:underline font-bold">Contact &amp; Support</Link>.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="06" title="Getting Professional Help & Resources" icon={<LifeBuoy className="w-4 h-4 text-rose-400" />} accent="rose">
        <p>
          Free, confidential assistance from independent counseling organizations is available 24/7:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-[#070D1F] border border-rose-500/25 space-y-1">
            <strong className="text-white font-bold block text-sm flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-rose-400" />
              National Support Helpline
            </strong>
            <p className="text-xs text-[#A8B9DE]">Toll-free 24/7 psychological assistance and counseling services.</p>
            <span className="text-xs font-mono font-bold text-rose-400 block pt-1">Call: 1800-599-0019</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#070D1F] border border-rose-500/25 space-y-1">
            <strong className="text-white font-bold block text-sm flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#00D9FF]" />
              Support &amp; Account Team
            </strong>
            <p className="text-xs text-[#A8B9DE]">Direct assistance for instant account cool-off and deposit limits.</p>
            <span className="text-xs font-mono font-bold text-[#00D9FF] block pt-1">care@gamehub.io</span>
          </div>
        </div>
      </LegalSectionCard>
    </LegalLayout>
  );
}
