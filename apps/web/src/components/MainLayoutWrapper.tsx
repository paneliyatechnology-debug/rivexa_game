'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Stop all playing audio elements and notify active game components when navigating away/changing routes
    const cleanupAudioOnRoute = () => {
      try {
        if (typeof window !== 'undefined') {
          const mediaElements = document.querySelectorAll('audio, video');
          mediaElements.forEach((el) => {
            try {
              const media = el as HTMLMediaElement;
              media.pause();
              media.currentTime = 0;
            } catch (e) {}
          });
          window.dispatchEvent(new Event('route_change_audio_cleanup'));
        }
      } catch (e) {}
    };

    cleanupAudioOnRoute();
  }, [pathname]);

  const isAdmin = pathname?.startsWith('/admin');
  const isPlay = pathname?.startsWith('/play');
  const isCoinFlip = pathname === '/play/coin-flip' || pathname === '/play/flipcoin';
  const isDice = pathname === '/play/dice';

  if (isAdmin) {
    return (
      <div className="w-full min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans overflow-x-hidden">
        {children}
      </div>
    );
  }

  if (isCoinFlip || isDice) {
    return (
      <div className="w-full min-h-screen bg-[#050B20] text-slate-100 font-sans flex flex-col justify-between overflow-x-hidden">
        {children}
      </div>
    );
  }

  if (isPlay) {
    return (
      <div className="w-full min-h-screen bg-[#08132C] text-slate-100 font-sans relative flex flex-col overflow-x-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#050B20] text-[#F5F7FF] font-sans relative overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Ambient background glow effects */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-1/3 right-10 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}

