'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useGameTokenValidation } from '@/hooks/useGameTokenValidation';
import { InvalidCredentialsModal } from '@/components/InvalidCredentialsModal';
import { FastParityGame } from '@/components/FastParityGame';
import { AviatorGame } from '@/components/AviatorGame';
import { JetXGame } from '@/components/JetXGame';
import { SpinGame } from '@/components/SpinGame';
import { AndarBaharGame } from '@/components/AndarBaharGame';
import { PushparaniGame } from '@/components/PushparaniGame';
import CoinFlipGame from '@/components/CoinFlipGame';
import { DiceGame } from '@/components/DiceGame';
import { MinesGame } from '@/components/MinesGame';
import HiloGame from '@/components/HiloGame';
import ChickenRoadGame from '@/components/game/chicken-road/ChickenRoadGame';
import PenaltyShootoutGame from '@/components/game/penalty-shootout/PenaltyShootoutGame';
import { TopHeader, BottomNavigation } from '@/components/Navigation';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/lib/config';

/**
 * Clean wrapper component for FastParityGame to encapsulate all parity-specific layout.
 * Having its own lifecycle prevents React "Rendered fewer hooks than expected" violations.
 */
function ParityGameLayout({ mode }: { mode: 'fast-parity' | 'parity' }) {
  const { balance } = useAuth();

  return (
    <div className="w-full min-h-screen bg-[#050B20] text-gray-100 flex flex-col font-sans selection:bg-[#287BFF]/30 selection:text-[#00D9FF] pt-[84px]">
      <TopHeader balance={balance} onSearch={() => {}} />

      <div className="flex-1 flex w-full max-w-[1700px] mx-auto px-2 sm:px-4 py-4 gap-6 lg:pl-[220px] xl:pl-60 relative z-10">
        <DesktopSidebar />

        <main className="flex-1 min-w-0 pb-20 lg:pb-8 px-2 sm:px-4 space-y-4">
          <FastParityGame gameMode={mode} />
        </main>
      </div>

      <BottomNavigation />
    </div>
  );
}

export default function PlayGamePage() {
  const params = useParams();
  const slug = (params.slug as string) || 'crash';

  const { isInvalid, errorMessage } = useGameTokenValidation();

  // If page was accessed directly without session token query parameters, auto-create a session & update address bar URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const hasToken =
      urlParams.get('st') ||
      urlParams.get('gt') ||
      urlParams.get('ticket') ||
      urlParams.get('t') ||
      urlParams.get('authToken') ||
      urlParams.get('token') ||
      urlParams.get('sessionToken');

    if (!hasToken) {
      const apiBase = getApiBaseUrl();
      const token = localStorage.getItem('rivexa_token') || '00000000-0000-4000-a000-000000000000';
      fetch(`${apiBase}/games/${slug}/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: 'REAL', currency: 'INR' }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.launchUrl) {
            window.history.replaceState(null, '', data.launchUrl);
            if (data?.token) {
              sessionStorage.setItem('gs_token', data.token);
            }
            if (data?.sessionId) {
              sessionStorage.setItem('gs_active_session_id', data.sessionId);
            }
          }
        })
        .catch(() => {});
    }
  }, [slug]);

  if (isInvalid) {
    return (
      <div className="w-full min-h-screen bg-[#050B20] text-gray-100 flex flex-col font-sans">
        <InvalidCredentialsModal
          isOpen={true}
          message={errorMessage || 'Invalid user login credentials(Error:45)'}
        />
      </div>
    );
  }

  // Pure router dispatch: each child game manages its own isolated hook tree
  switch (slug) {
    case 'hilo':
      return <HiloGame />;
    case 'coin-flip':
    case 'flipcoin':
      return <CoinFlipGame />;
    case 'dice':
      return <DiceGame />;
    case 'crash':
    case 'aviator':
      return <AviatorGame />;
    case 'jet':
    case 'jetx':
      return <JetXGame />;
    case 'spin':
      return <SpinGame />;
    case 'andar-bahar':
      return <AndarBaharGame />;
    case 'pushparani':
    case 'horn-ok-please':
    case 'pushparani-2':
      return <PushparaniGame />;
    case 'mines':
      return <MinesGame />;
    case 'chicken-road':
    case 'chickenroad':
      return <ChickenRoadGame />;
    case 'penalty':
    case 'penalty-shootout':
    case 'penalty-nations-cup':
      return <PenaltyShootoutGame />;
    case 'parity':
      return <ParityGameLayout mode="parity" />;
    case 'fast-parity':
    default:
      return <ParityGameLayout mode="fast-parity" />;
  }
}
