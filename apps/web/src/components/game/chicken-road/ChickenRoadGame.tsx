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

export const ChickenRoadGame: React.FC = () => {
  const { balance } = useAuth();
  const setWalletBalance = useChickenRoadStore((s) => s.setWalletBalance);

  useEffect(() => {
    if (balance !== undefined && balance !== null) {
      setWalletBalance(balance);
    }
  }, [balance, setWalletBalance]);

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0d0e12] text-white flex flex-col font-sans select-none overflow-hidden selection:bg-[#00D9FF] selection:text-slate-950 relative">
      {/* FULL SCREEN GAME CONTAINER WITH CHICKEN ROAD DEDICATED HEADER */}
      <div className="flex-1 flex flex-col w-full min-h-0 relative z-10 overflow-hidden">
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



