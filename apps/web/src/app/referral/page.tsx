'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReferralAliasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/invite');
  }, [router]);

  return null;
}
