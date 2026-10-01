'use client';

import React, { use } from 'react';
import AdminDashboardPage from '../page';

export default function AdminSubRoutePage({ params }: { params: Promise<{ slug: string }> }) {
  // Unwraps params Promise for Next.js 15/16 App Router
  const resolvedParams = use(params);
  
  // Maps URL slug aliases to standard game control tabs
  const slug = resolvedParams?.slug || '';
  
  return <AdminDashboardPage initialTab={slug} />;
}
