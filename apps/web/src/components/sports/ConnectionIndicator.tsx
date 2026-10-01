'use client';

import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function ConnectionIndicator({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#101C3A] border border-white/10 text-xs font-medium">
      {isConnected ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-300 hidden sm:inline">Live Sync</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-300 hidden sm:inline">Connecting...</span>
        </>
      )}
    </div>
  );
}
