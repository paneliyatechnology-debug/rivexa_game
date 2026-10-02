'use client';

import React from 'react';
import Link from 'next/link';
import { LegalLayout, LegalSectionCard } from '@/components/legal/LegalLayout';
import {
  MapPin,
  Globe2,
  AlertCircle,
  FileCheck2,
  Scale,
  ShieldAlert,
  UserCheck,
  CheckCircle2
} from 'lucide-react';

export default function LegalAvailabilityPage() {
  return (
    <LegalLayout
      title="Legal Availability"
      description="Jurisdictional compliance, territorial eligibility, and statutory skill gaming legal frameworks across Indian states and territories."
      icon={<MapPin className="w-8 h-8 sm:w-9 sm:h-9 text-[#FFC928]" />}
      lastUpdated="October 2026"
      accentGlow="amber"
      currentPageName="Legal Availability"
      badge={{
        text: 'State & Central Compliance',
        icon: <Scale className="w-3.5 h-3.5" />,
        variant: 'amber',
      }}
      topHeroExtra={
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/35 shadow-[0_0_20px_rgba(255,201,40,0.12)] flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#FFC928] shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90 leading-relaxed">
            <strong className="text-white block font-bold mb-0.5">Territorial Restriction Notice:</strong>
            Real-money skill gaming operations are strictly prohibited for users residing or physically present in the states of <strong>Telangana, Odisha, Assam, Nagaland, Sikkim, and Andhra Pradesh</strong>.
          </div>
        </div>
      }
    >
      <LegalSectionCard number="01" title="Game of Skill Legal Doctrine" icon={<Scale className="w-4 h-4 text-[#FFC928]" />} accent="amber">
        <p>
          Games featured on GameHub are classified and operated as &quot;Games of Skill&quot; under legal definitions affirmed by the Supreme Court of India (State of Bombay v. R.M.D. Chamarbaugwala, AIR 1957 SC 699, and subsequent judicial precedents).
        </p>
        <p>
          A game of skill is one where success predominantly depends upon the superior knowledge, training, attention, experience, and adroitness of the player, distinguishing it legally from games of chance.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="02" title="Geographic & Regional Restrictions" icon={<Globe2 className="w-4 h-4 text-[#FFC928]" />} accent="amber">
        <p>
          While skill games are protected as legitimate trade and commerce under Article 19(1)(g) of the Constitution of India, specific state enactments impose prohibitions on real-money gaming activities.
        </p>
        <p>
          Consequently, residents of the following states are prohibited from creating real-money accounts, depositing funds, or participating in paid contests:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
          {['Andhra Pradesh', 'Assam', 'Nagaland', 'Odisha', 'Sikkim', 'Telangana'].map((st) => (
            <div key={st} className="p-2.5 rounded-xl bg-[#070D1F] border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{st}</span>
            </div>
          ))}
        </div>
      </LegalSectionCard>

      <LegalSectionCard number="03" title="Player Eligibility & Age Verification" icon={<UserCheck className="w-4 h-4 text-[#FFC928]" />} accent="amber">
        <p>
          To ensure strict adherence to all statutory requirements, players must satisfy the following criteria:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li>Must be an Indian citizen of at least 18 years of age.</li>
          <li>Must physically reside in an Indian state or union territory where skill gaming is legally unrestricted.</li>
          <li>Must complete mandatory Know-Your-Customer (KYC) identity and bank account verification prior to requesting withdrawals.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard number="04" title="Tax Compliance & TDS Deduction" icon={<FileCheck2 className="w-4 h-4 text-[#FFC928]" />} accent="amber">
        <p>
          In full accordance with Indian Income Tax Act regulations (Section 194BA), Tax Deducted at Source (TDS) at the applicable rate (currently 30%) is deducted automatically on net winnings upon withdrawal or at the end of each financial year.
        </p>
        <p>
          Annual TDS certificates (Form 16A) are issued to verified players for filing income tax returns.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="05" title="IP Geofencing & Proxy Prohibition" icon={<ShieldAlert className="w-4 h-4 text-[#FFC928]" />} accent="amber">
        <p>
          GameHub employs automated IP geofencing and device geolocation checks. Any attempt to circumvent geographic restrictions through Virtual Private Networks (VPNs), proxy servers, GPS spoofers, or anonymizers is a severe violation.
        </p>
        <p>
          Accounts detected using anonymizing tools from restricted regions will be permanently terminated and remaining balances frozen.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="06" title="User Warranty & Responsibility" icon={<CheckCircle2 className="w-4 h-4 text-[#FFC928]" />} accent="amber">
        <p>
          Each time you access GameHub, place a wager, or participate in games, you represent and warrant that you are legally competent, over 18 years old, and physically located in a jurisdiction that permits skill gaming.
        </p>
        <p>
          For regulatory inquiries or territorial eligibility queries, please contact <strong className="text-white font-mono">compliance@gamehub.io</strong>.
        </p>
      </LegalSectionCard>
    </LegalLayout>
  );
}
