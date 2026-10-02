'use client';

import React from 'react';
import Link from 'next/link';
import { LegalLayout, LegalSectionCard } from '@/components/legal/LegalLayout';
import {
  Lock,
  ShieldCheck,
  KeyRound,
  Server,
  CreditCard,
  UserCheck,
  CheckCircle2,
  Cpu,
  Fingerprint
} from 'lucide-react';

export default function SecurityPage() {
  return (
    <LegalLayout
      title="HTTPS Security &amp; Data Protection"
      description="Bank-grade 256-bit TLS/SSL encryption, continuous server monitoring, and secure cryptographic RNG engines powering GameHub."
      icon={<Lock className="w-8 h-8 sm:w-9 sm:h-9 text-[#00E5A0]" />}
      lastUpdated="October 2026"
      accentGlow="emerald"
      currentPageName="HTTPS Security"
      badge={{
        text: 'TLS 1.3 Active • 256-Bit SSL',
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
        variant: 'emerald',
      }}
      topHeroExtra={
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#00E5A0]/15 via-[#00D9FF]/10 to-[#08152E] border border-[#00E5A0]/45 shadow-[0_0_25px_rgba(0,229,160,0.2)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00E5A0]/20 border border-[#00E5A0]/50 flex items-center justify-center text-xl shrink-0">
              🔒
            </div>
            <div>
              <div className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>Secure Connection Active</span>
                <span className="w-2 h-2 rounded-full bg-[#00E5A0] animate-pulse" />
              </div>
              <p className="text-xs text-[#A8B9DE]">
                All traffic is encrypted using 256-bit Transport Layer Security (TLS 1.3).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00E5A0] bg-[#070D1F] px-3 py-1.5 rounded-xl border border-[#00E5A0]/30 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>SSL CERTIFIED</span>
          </div>
        </div>
      }
    >
      <LegalSectionCard number="01" title="HTTPS 256-Bit TLS Encryption" icon={<Lock className="w-4 h-4 text-[#00E5A0]" />} accent="emerald">
        <p>
          GameHub operates exclusively over Hypertext Transfer Protocol Secure (HTTPS). All communication between your web browser or mobile client and our servers is secured using modern TLS 1.3 cryptographic suites with SHA-256 digital certificates.
        </p>
        <p>
          This prevents unauthorized third parties from intercepting, eavesdropping, or tampering with your authentication credentials, personal records, and transaction payloads.
        </p>
      </LegalSectionCard>

      <LegalSectionCard number="02" title="End-to-End Encrypted Data Transmission" icon={<Server className="w-4 h-4 text-[#00E5A0]" />} accent="emerald">
        <p>
          Our network infrastructure is hosted within secure Amazon Web Services (AWS) data centers with automated multi-zone redundancy:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li><strong>DDoS Mitigation:</strong> High-capacity edge Cloudflare protection against Distributed Denial-of-Service attacks.</li>
          <li><strong>Web Application Firewall (WAF):</strong> Real-time filtering against SQL injection, cross-site scripting (XSS), and malicious bots.</li>
          <li><strong>Isolated VPC Subnets:</strong> Core database clusters reside in private subnets with no direct public internet exposure.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard number="03" title="Account &amp; Password Cryptography" icon={<KeyRound className="w-4 h-4 text-[#00E5A0]" />} accent="emerald">
        <p>
          We employ strict zero-knowledge principles for user authentication:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li>Passwords are never transmitted or stored in plain text. They are hashed using salted bcrypt with adaptive work factors.</li>
          <li>Authentication tokens are stateless, digitally signed JWTs containing expiries and anti-tamper checksums.</li>
          <li>Rate limiting is enforced on all login and password reset endpoints to eliminate brute-force password guessing.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard number="04" title="Payment &amp; Banking Gateway Security" icon={<CreditCard className="w-4 h-4 text-[#00E5A0]" />} accent="emerald">
        <p>
          Financial transactions on GameHub adhere to international financial compliance standards:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li><strong>PCI-DSS Certified Gateways:</strong> We never capture or store credit/debit card numbers or netbanking passwords on our servers.</li>
          <li><strong>UPI Checksum Verification:</strong> Real-time automated UTR verification and server-to-server webhook reconciliation prevent transaction spoofing.</li>
          <li><strong>Manual Audit Safeguards:</strong> High-value withdrawal disbursements undergo multi-tier manual security verification.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard number="05" title="Session Protection &amp; Anti-Hijacking" icon={<Fingerprint className="w-4 h-4 text-[#00E5A0]" />} accent="emerald">
        <p>
          To safeguard against session hijacking and unauthorized device usage, our platform enforces:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li>Automatic session termination following prolonged inactivity.</li>
          <li>Cross-Site Request Forgery (CSRF) protection tokens on all state-altering requests.</li>
          <li>Device and browser fingerprint consistency checks on critical account actions like password updates and bank withdrawals.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard number="06" title="Player Security Best Practices" icon={<UserCheck className="w-4 h-4 text-[#00E5A0]" />} accent="emerald">
        <p>
          Keep your gaming account impenetrable by following these best practices:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#C4D5F6]">
          <li>Always verify that the browser address bar displays the padlock icon and points to the official URL.</li>
          <li>Never share your password, PIN, or one-time password (OTP) with anyone — GameHub staff will never ask for your password.</li>
          <li>Always log out when accessing your account from public or shared computers.</li>
        </ul>
      </LegalSectionCard>
    </LegalLayout>
  );
}
