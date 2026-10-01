import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tenant Portal — Rivexa Gaming Platform',
  description: 'White-label tenant management console for Rivexa Gaming Platform. Manage agents, players, credits, and commissions.',
};

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  // Tenant portal has its own isolated layout (no main site navigation)
  return <>{children}</>;
}
