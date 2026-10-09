'use client';

import React, { useEffect } from 'react';
import { GameHeader } from './GameHeader';
import { GameCanvas } from './GameCanvas';
import { BetPanel } from './BetPanel';
import { GameResultOverlay } from './GameResultOverlay';
import { FairnessModal } from './FairnessModal';
import { HelpModal } from './HelpModal';
import { GameHistory } from './GameHistory';
import { MenuDrawer } from './MenuDrawer';
import { useAuth } from '@/context/AuthContext';
import { useChickenRoadStore } from '../../../store/chickenRoadStore';

import { useResponsiveViewport } from '../../../hooks/useResponsiveViewport';
import { useGameTokenValidation } from '../../../hooks/useGameTokenValidation';
import { InvalidCredentialsModal } from '../../InvalidCredentialsModal';

export const ChickenRoadGame: React.FC = () => {
  const { balance } = useAuth();
  const setWalletBalance = useChickenRoadStore((s) => s.setWalletBalance);
  const { profile, observeContainer } = useResponsiveViewport();
  const { isInvalid, errorMessage } = useGameTokenValidation();

  const isTooSmall = profile === 'compact';

  useEffect(() => {
    if (balance !== undefined && balance !== null) {
      setWalletBalance(balance);
    }
  }, [balance, setWalletBalance]);

  return (
    <div
      ref={observeContainer}
      className="h-[100dvh] max-h-[100dvh] bg-[#0d0e12] text-white flex flex-col font-sans select-none overflow-hidden selection:bg-[#00D9FF] selection:text-slate-950 relative pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    >
      {/* INVALID TOKEN / LOGIN CREDENTIALS ERROR OVERLAY */}
      <InvalidCredentialsModal
        isOpen={isInvalid}
        message={errorMessage || 'Invalid user login credentials(Error:45)'}
      />

      {/* ULTRA-COMPACT WATCH VIEWPORT FALLBACK BADGE */}
      {isTooSmall && (
        <div className="absolute inset-0 z-50 bg-[#0d0e12]/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl mb-2 animate-bounce">
            !
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Watch Viewport</h3>
          <p className="text-xs text-slate-400 leading-tight">
            Screen size is too compact for full game controls. Please view on mobile, tablet, or desktop.
          </p>
        </div>
      )}

      {/* FULL SCREEN GAME CONTAINER WITH CHICKEN ROAD DEDICATED HEADER & TV MAX-WIDTH BOUNDS */}
      <div className="flex-1 flex flex-col w-full max-w-[1920px] mx-auto min-h-0 relative z-10 overflow-hidden">
        {/* MAIN GAME CONTENT AREA */}
        <main className="flex-1 w-full flex flex-col min-h-0 overflow-hidden">
          {/* CORE GAME CARD CONTAINER (FULL WIDTH) */}
          <div className="w-full bg-[#1a1c23] border-b border-[#2d3038] shadow-2xl flex flex-col flex-1 min-h-0 relative overflow-hidden">
            {/* Dedicated Chicken Road Header Bar */}
            <GameHeader />

            {/* Phaser Game Board Canvas */}
            <div className="relative w-full bg-[#2a2d32] flex-1 min-h-[180px] sm:min-h-[280px] flex items-center justify-center overflow-hidden">
              <GameCanvas />
              <GameResultOverlay />
            </div>

            {/* Betting Controls & Action Panel */}
            <BetPanel />
          </div>
        </main>
      </div>

      {/* INTERACTIVE MODALS & DRAWERS */}
      <FairnessModal />
      <HelpModal />
      <GameHistory />
      <MenuDrawer />
    </div>
  );
};

export default ChickenRoadGame;



