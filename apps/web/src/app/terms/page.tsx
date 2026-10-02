'use client';

import React from 'react';
import Link from 'next/link';
import { LegalLayout, LegalSectionCard } from '@/components/legal/LegalLayout';
import {
  FileText,
  UserCheck,
  Gamepad2,
  Wallet,
  AlertTriangle,
  Ban,
  ShieldAlert,
  RefreshCw,
  Mail,
  Scale
} from 'lucide-react';

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms & Rules"
      description="The official platform terms of service, participation agreement, fair gaming regulations, and contractual conditions governing GameHub."
      icon={<FileText className="w-8 h-8 sm:w-9 sm:h-9 text-[#287BFF]" />}
      lastUpdated="October 2026"
      accentGlow="blue"
      currentPageName="Terms & Rules"
      badge={{
        text: 'User Agreement & Game Rules',
        icon: <Scale className="w-3.5 h-3.5" />,
        variant: 'blue',
      }}
    >
      <LegalSectionCard number="01" title="Acceptance of Terms" icon={<FileText className="w-4 h-4 text-[#00D9FF]" />} accent="blue">
        <p>
          By creating an account, accessing the GameHub website or mobile interface, placing a wager, or initiating a financial transaction, you acknowledge that you have read, understood, and agreed to be legally bound by these Terms &amp; Rules.
        </p>
        <p>
          If you do not agree to these terms in their entirety, you must immediately cease accessing the platform and refrain from depositing funds or placing bets.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="02" title="Player Eligibility & Age Verification" icon={<UserCheck className="w-4 h-4 text-[#00D9FF]" />} accent="blue">
        <p>
          Participation on GameHub is strictly restricted to individuals who meet the following criteria:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li>You must be at least 18 years of age or the legal age of majority in your jurisdiction.</li>
          <li>You must be a resident of a territory where skill gaming is legally permitted under local statutory laws.</li>
          <li>You must possess a valid government identity proof and a bank account in your own legal name.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard number="03" title="Account Rules & Single-Account Policy" icon={<UserCheck className="w-4 h-4 text-[#00D9FF]" />} accent="blue">
        <p>
          Each player is entitled to register and maintain only ONE (1) GameHub account. Creating duplicate accounts, registering under false credentials, or sharing access credentials with third parties is strictly prohibited.
        </p>
        <p>
          You are solely responsible for maintaining the confidentiality of your credentials and all activities occurring under your account.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="04" title="Gaming Rules & RNG Engine" icon={<Gamepad2 className="w-4 h-4 text-[#00D9FF]" />} accent="blue">
        <p>
          All game outcomes across Fast Parity, Mines, Crash, JetX Flight, Spin Wheel, Dice, and Card games are calculated by verifiable, cryptographically secure Random Number Generation (RNG) engines.
        </p>
        <p>
          Wagers once placed and confirmed cannot be cancelled, amended, or reversed. Bets are settled automatically in real time upon completion of each round.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="05" title="Deposits, Bonus & Withdrawals" icon={<Wallet className="w-4 h-4 text-[#00D9FF]" />} accent="blue">
        <p>
          All deposits and withdrawals must be conducted through approved banking channels and registered UPI handles. Players agree that:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li>Deposit funds must originate from a bank account or payment instrument registered in the player&apos;s own name.</li>
          <li>Withdrawal requests are subject to mandatory KYC verification and security audit checks prior to disbursement.</li>
          <li>Promotional bonuses are non-withdrawable directly and must be wagered in accordance with applicable turnover requirements.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard number="06" title="Prohibited Activities & Fraud Policy" icon={<Ban className="w-4 h-4 text-[#00D9FF]" />} accent="blue">
        <p>
          GameHub maintains zero tolerance for illicit conduct, including but not limited to:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li>Use of automated betting scripts, bots, artificial intelligence predictors, or third-party assist software.</li>
          <li>Syndicate play, collusion between players, or simultaneous betting to arbitrage odds.</li>
          <li>Exploiting software vulnerabilities, latency arbitrage, or unauthorized penetration of our backend systems.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard number="07" title="Account Suspension & Balance Forfeiture" icon={<ShieldAlert className="w-4 h-4 text-[#00D9FF]" />} accent="blue">
        <p>
          GameHub reserves the unilateral right to freeze, suspend, or terminate any account found in violation of these Terms.
        </p>
        <p>
          In cases of confirmed fraud, botting, multi-accounting, or financial chargebacks, all accrued winnings and bonuses shall be forfeited and reported to competent legal authorities.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="08" title="Amendments & Platform Modifications" icon={<RefreshCw className="w-4 h-4 text-[#00D9FF]" />} accent="blue">
        <p>
          We may update or revise these Terms &amp; Rules periodically to reflect statutory changes, platform enhancements, or new game formats. Continued use of GameHub following published amendments constitutes binding acceptance.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="09" title="Grievance Redressal & Contact" icon={<Mail className="w-4 h-4 text-[#00D9FF]" />} accent="blue">
        <p>
          For dispute resolution, contract inquiries, or official communication with our compliance officer, please submit a ticket via our <Link href="/contact" className="text-[#00D9FF] hover:underline font-bold">Contact &amp; Support</Link> portal or email <strong className="text-white font-mono">legal@gamehub.io</strong>.
        </p>
      </LegalSectionCard>
    </LegalLayout>
  );
}
