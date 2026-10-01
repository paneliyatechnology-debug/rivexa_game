'use client';

import React from 'react';
import { PlayingCard } from './PlayingCard';

export interface DealtCard {
  card: string;
  side: 'andar' | 'bahar';
  startX?: number;
  startY?: number;
  isMatching?: boolean;
}

interface PlayingTableProps {
  andarCards: DealtCard[];
  baharCards: DealtCard[];
  statusText: string;
  winningSideGlow: 'andar' | 'bahar' | null;
  deckRef: React.RefObject<HTMLDivElement | null>;
  andarRef: React.RefObject<HTMLDivElement | null>;
  baharRef: React.RefObject<HTMLDivElement | null>;
}

export const PlayingTable: React.FC<PlayingTableProps> = ({
  andarCards,
  baharCards,
  statusText,
  winningSideGlow,
  deckRef,
  andarRef,
  baharRef,
}) => {
  const isWaitingNextRound =
    statusText.includes('WAITING FOR NEXT') || statusText.includes('NEXT ROUND');
  const isDealingCards = statusText.includes('DEALING');

  return (
    <div className="bg-[#071735]/95 border-2 border-[#00D9FF]/50 rounded-[22px] p-3 sm:p-5 shadow-[0_0_25px_rgba(0,217,255,0.25)] backdrop-blur-2xl relative overflow-hidden">
      {/* Table Top Status Bar */}
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 pb-2 border-b border-[#243D66]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFC928] shadow-[0_0_10px_#FFC928] animate-pulse" />
          <h3 className="text-xs sm:text-sm font-black tracking-wide text-white uppercase">
            LIVE DEALING TABLE
          </h3>
        </div>

        {/* Dynamic Status Badge */}
        <div
          className={`text-[10px] sm:text-xs font-black font-mono px-3 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,217,255,0.3)] transition-all ${
            isWaitingNextRound
              ? 'bg-[#873BFF]/20 border border-[#873BFF] text-[#873BFF] animate-pulse'
              : isDealingCards
              ? 'bg-[#FFC928]/20 border border-[#FFC928] text-[#FFC928] animate-pulse'
              : 'bg-[#10254B] border border-[#00D9FF]/60 text-[#00D9FF]'
          }`}
        >
          {isWaitingNextRound ? (
            <>
              <i className="bi bi-arrow-repeat animate-spin text-xs text-[#873BFF]" />
              <span>WAITING FOR NEXT ROUND...</span>
            </>
          ) : isDealingCards ? (
            <>
              <i className="bi bi-arrow-repeat animate-spin text-xs text-[#FFC928]" />
              <span>{statusText}</span>
            </>
          ) : (
            <span>{statusText}</span>
          )}
        </div>
      </div>

      {/* Main Playing Table 2-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5 relative">
        {/* ─── PROMINENT CENTERED LOADING OVERLAY FOR NEXT ROUND ─── */}
        {isWaitingNextRound && andarCards.length === 0 && baharCards.length === 0 && (
          <div className="absolute inset-0 z-30 bg-[#050B20]/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center rounded-2xl border-2 border-[#00D9FF]/60 shadow-[0_0_30px_rgba(0,217,255,0.4)] animate-in fade-in duration-300">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#10254B] border-2 border-[#00D9FF] flex items-center justify-center shadow-[0_0_25px_rgba(0,217,255,0.8)] mb-2.5 animate-pulse">
              <i className="bi bi-arrow-repeat text-2xl sm:text-3xl text-[#00D9FF] animate-spin" />
            </div>
            <span className="text-xs sm:text-base font-black text-[#00D9FF] font-mono tracking-widest uppercase drop-shadow-[0_0_12px_#00D9FF]">
              WAITING FOR NEXT ROUND...
            </span>
            <span className="text-[10px] sm:text-xs text-[#A5B4D0] mt-1 font-medium max-w-xs">
              Preparing deck & open Joker card for the upcoming period
            </span>
          </div>
        )}

        {/* ─── LEFT: ANDAR CARD AREA (Blue Theme) ─── */}
        <div
          ref={andarRef}
          className={`bg-[#0B1530]/90 rounded-2xl p-3 sm:p-4 border-2 transition-all duration-300 relative min-h-[140px] sm:min-h-[170px] flex flex-col justify-between ${
            winningSideGlow === 'andar'
              ? 'border-[#00E5A0] shadow-[0_0_35px_rgba(0,229,160,0.85)] scale-[1.02] bg-[#042820]'
              : 'border-[#1677FF]/70 shadow-[0_0_20px_rgba(22,119,255,0.35)] hover:border-[#00D9FF]'
          }`}
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-black text-[#1677FF] drop-shadow-[0_0_10px_rgba(22,119,255,0.8)] tracking-wider uppercase">
              ANDAR
            </span>
            <span className="bg-[#1677FF]/20 border border-[#1677FF]/60 text-[#00D9FF] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(0,217,255,0.3)]">
              {andarCards.length} {andarCards.length === 1 ? 'Card' : 'Cards'}
            </span>
          </div>

          {/* Cards Flex Grid */}
          <div className="flex-1 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 py-1">
            {andarCards.length === 0 ? (
              <span className="text-xs text-[#8795B5] font-medium py-6 italic flex items-center gap-1.5">
                Waiting for deal...
              </span>
            ) : (
              andarCards.map((item, idx) => (
                <PlayingCard
                  key={`andar-${idx}-${item.card}`}
                  card={item.card}
                  size="md"
                  isMatching={item.isMatching}
                  isAnimated={idx === andarCards.length - 1}
                  startX={item.startX}
                  startY={item.startY}
                />
              ))
            )}
          </div>
        </div>

        {/* ─── RIGHT: BAHAR CARD AREA (Pink Theme) ─── */}
        <div
          ref={baharRef}
          className={`bg-[#0B1530]/90 rounded-2xl p-3 sm:p-4 border-2 transition-all duration-300 relative min-h-[140px] sm:min-h-[170px] flex flex-col justify-between ${
            winningSideGlow === 'bahar'
              ? 'border-[#00E5A0] shadow-[0_0_35px_rgba(0,229,160,0.85)] scale-[1.02] bg-[#042820]'
              : 'border-[#F4145B]/70 shadow-[0_0_20px_rgba(244,20,91,0.35)] hover:border-[#F13FA4]'
          }`}
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-black text-[#F4145B] drop-shadow-[0_0_10px_rgba(244,20,91,0.8)] tracking-wider uppercase">
              BAHAR
            </span>
            <span className="bg-[#F4145B]/20 border border-[#F4145B]/60 text-[#F13FA4] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(241,63,164,0.3)]">
              {baharCards.length} {baharCards.length === 1 ? 'Card' : 'Cards'}
            </span>
          </div>

          {/* Cards Flex Grid */}
          <div className="flex-1 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 py-1">
            {baharCards.length === 0 ? (
              <span className="text-xs text-[#8795B5] font-medium py-6 italic flex items-center gap-1.5">
                Waiting for deal...
              </span>
            ) : (
              baharCards.map((item, idx) => (
                <PlayingCard
                  key={`bahar-${idx}-${item.card}`}
                  card={item.card}
                  size="md"
                  isMatching={item.isMatching}
                  isAnimated={idx === baharCards.length - 1}
                  startX={item.startX}
                  startY={item.startY}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Central Reference Deck Anchor */}
      <div ref={deckRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 pointer-events-none opacity-0" />
    </div>
  );
};
