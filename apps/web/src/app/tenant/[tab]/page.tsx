'use client';

import React, { use } from 'react';
import TenantDashboardPage from '../dashboard/page';

export default function TenantTabRoutePage({ params }: { params: Promise<{ tab: string }> }) {
  const resolvedParams = use(params);
  return <TenantDashboardPage initialTab={resolvedParams.tab} />;
}
