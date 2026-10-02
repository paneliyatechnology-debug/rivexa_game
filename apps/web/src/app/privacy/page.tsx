'use client';

import React from 'react';
import Link from 'next/link';
import { LegalLayout, LegalSectionCard } from '@/components/legal/LegalLayout';
import {
  ShieldCheck,
  Lock,
  Database,
  Eye,
  Cookie,
  Users,
  FileCheck,
  UserCheck,
  Mail,
  Shield
} from 'lucide-react';

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="At GameHub, we take your privacy and data sovereignty seriously. This policy explains what information we collect, how it is secured, and your rights."
      icon={<ShieldCheck className="w-8 h-8 sm:w-9 sm:h-9 text-[#00D9FF]" />}
      lastUpdated="October 2026"
      accentGlow="cyan"
      currentPageName="Privacy Policy"
      badge={{
        text: 'Data Privacy & GDPR Aligned',
        icon: <Shield className="w-3.5 h-3.5" />,
        variant: 'cyan',
      }}
    >
      <LegalSectionCard number="01" title="Introduction & Commitment" icon={<Eye className="w-4 h-4 text-[#00D9FF]" />} accent="cyan">
        <p>
          GameHub (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates real-money skill gaming services. We are firmly committed to safeguarding your privacy, ensuring transparency in all our data handling practices, and upholding rigorous standards of cyber protection.
        </p>
        <p>
          By creating an account, accessing our gaming catalogs, or initiating deposits/withdrawals, you acknowledge and agree to the data collection and processing methods outlined in this policy.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="02" title="Information We Collect" icon={<Database className="w-4 h-4 text-[#00D9FF]" />} accent="cyan">
        <p>
          To deliver a seamless, secure, and compliant gaming environment, we collect the following categories of information:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li><strong>Registration Details:</strong> Mobile phone number, display username, password hash, and referral code.</li>
          <li><strong>KYC &amp; Verification Data:</strong> Government ID details, legal name, date of birth, and banking details (A/C number, IFSC, UPI ID) required for withdrawal settlement and regulatory compliance.</li>
          <li><strong>Gameplay &amp; Transaction Logs:</strong> Bets placed, outcomes, wallet transactions, IP addresses, device identifiers, and browser fingerprint logs for fraud detection.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard number="03" title="How We Use Your Information" icon={<UserCheck className="w-4 h-4 text-[#00D9FF]" />} accent="cyan">
        <p>
          The personal data collected is used strictly for legitimate business, operational, and regulatory purposes, including:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li>Creating, maintaining, and authenticating your player account.</li>
          <li>Processing real-time deposits, game balance adjustments, and bank withdrawals.</li>
          <li>Preventing multi-accounting, syndicate betting, bots, and fraudulent exploits.</li>
          <li>Complying with statutory anti-money laundering (AML) and financial recordkeeping requirements.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard number="04" title="Data Protection & Encryption Standards" icon={<Lock className="w-4 h-4 text-[#00D9FF]" />} accent="cyan">
        <p>
          All information transmitted between your client device and our servers is secured using modern TLS 1.3 encryption with 256-bit SSL protocols.
        </p>
        <p>
          Sensory data and database stores reside in isolated Virtual Private Clouds (VPC) protected by advanced Web Application Firewalls (WAF) and strict role-based access control (RBAC). Passwords are never stored in plain text and are cryptographically salted and hashed using standard bcrypt algorithms.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="05" title="Cookies & Session Tracking" icon={<Cookie className="w-4 h-4 text-[#00D9FF]" />} accent="cyan">
        <p>
          We use strictly necessary session cookies and local storage tokens to keep you securely signed in and preserve your gameplay sound and interface preferences. We do not sell your personal data or browsing activity to third-party advertising networks.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="06" title="Third-Party Integrations" icon={<Users className="w-4 h-4 text-[#00D9FF]" />} accent="cyan">
        <p>
          We partner exclusively with licensed, PCI-DSS compliant payment aggregators and banking partners for deposit and payout processing. These partners process your financial transactions under strict confidentiality and encryption obligations.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="07" title="Data Retention & Storage" icon={<FileCheck className="w-4 h-4 text-[#00D9FF]" />} accent="cyan">
        <p>
          We retain your account records and financial logs for as long as your account remains active and for an additional statutory retention period required under financial regulations and audit standards.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="08" title="Your Privacy Rights" icon={<ShieldCheck className="w-4 h-4 text-[#00D9FF]" />} accent="cyan">
        <p>
          You have the right to request a copy of your personal data, update inaccurate information, or request account closure and deletion of non-statutory records by submitting an inquiry to our privacy team.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="09" title="Contact Our Data Protection Team" icon={<Mail className="w-4 h-4 text-[#00D9FF]" />} accent="cyan">
        <p>
          If you have questions, feedback, or grievance requests concerning this Privacy Policy, please reach out directly through our <Link href="/contact" className="text-[#00D9FF] hover:underline font-bold">Contact &amp; Support</Link> desk or email us at <strong className="text-white font-mono">privacy@gamehub.io</strong>.
        </p>
      </LegalSectionCard>
    </LegalLayout>
  );
}
