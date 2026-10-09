'use client';

import React, { useRef, useState } from 'react';
import { RecentSpin } from './types';

interface RecentSpinsProps {
  spins: RecentSpin[];
  roundId?: string;
}

export function RecentSpins({ spins }: RecentSpinsProps) {
  // Only display actual completed spins that have occurred - strictly dynamic, no static dummy data
  const displaySpins = (spins || [])
    .filter((s) => s && s.periodNumber && !s.periodNumber.match(/^SPIN-[1-6]$/))
    .slice(0, 10);

  // Mouse & Touch Drag-to-Scroll support
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftStart.current = scrollRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftStart.current - walk;
  };

  return (
    <div className="w-full max-w-full bg-[#091735]/85 backdrop-blur-md border border-[#287BFF]/25 rounded-xl py-1 px-1.5 sm:py-1.5 sm:px-2.5 flex items-center overflow-hidden shrink-0">
      {/* Title Label: Compact on mobile, full on desktop */}
      <div className="flex items-center gap-1 shrink-0 pr-1.5 sm:pr-2 border-r border-white/10">
        <span className="text-[10px] sm:text-xs">🕒</span>
        <span className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase text-[#9DB5D8] tracking-tight whitespace-nowrap">
          <span className="inline sm:hidden">RECENT</span>
          <span className="hidden sm:inline">RECENT SPINS</span>
        </span>
      </div>

      {/* Results Strip: Fits 3 full results on mobile screens + smooth touch/drag sliding for all history */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={`flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 pl-1.5 sm:pl-2 min-w-0 flex-1 justify-start select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
          scrollbarWidth: 'none',
        }}
      >
        {displaySpins.length === 0 ? (
          <span className="text-[9px] sm:text-[10px] text-[#7285AE] font-mono italic px-1">
            Waiting for spins...
          </span>
        ) : (
          displaySpins.map((spin, idx) => {
            const colorUpper = (spin.resultColor || 'RED').toUpperCase();
            const isGreen = colorUpper === 'GREEN';
            const isBlue = colorUpper === 'BLUE';
            const isRed = colorUpper === 'RED';
            const isLatest = idx === 0;

            let bgClass = 'bg-[#0A1838] border-white/20 text-[#9DB5D8]';
            let dotColor = 'bg-[#9DB5D8]';
            if (isGreen) {
              bgClass = 'bg-[#00E5A0]/15 border-[#00E5A0]/60 text-[#00E5A0] shadow-[0_0_8px_rgba(0,229,160,0.25)]';
              dotColor = 'bg-[#00E5A0] shadow-[0_0_5px_#00E5A0]';
            } else if (isBlue) {
              bgClass = 'bg-[#00D9FF]/15 border-[#00D9FF]/60 text-[#00D9FF] shadow-[0_0_8px_rgba(0,217,255,0.25)]';
              dotColor = 'bg-[#00D9FF] shadow-[0_0_5px_#00D9FF]';
            } else if (isRed) {
              bgClass = 'bg-[#FF2468]/20 border-[#FF2468]/70 text-[#FF2468] shadow-[0_0_8px_rgba(255,36,104,0.3)]';
              dotColor = 'bg-[#FF2468] shadow-[0_0_5px_#FF2468]';
            }

            return (
              <div
                key={`${spin.periodNumber}-${idx}`}
                title={`Round #${spin.periodNumber.replace('SPIN-', '')} - ${colorUpper}`}
                className={`h-6 sm:h-7 px-1.5 sm:px-2 rounded-full border text-[9px] sm:text-[10.5px] font-black font-mono tracking-tight shrink-0 flex items-center gap-1 transition-all ${bgClass} ${
                  isLatest ? 'ring-1 ring-white/50' : ''
                }`}
              >
                <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${dotColor} ${isLatest ? 'animate-pulse' : ''} shrink-0`} />
                <span className="leading-none">{colorUpper}</span>
                {spin.multiplier > 0 && (
                  <span className="text-[8px] sm:text-[9px] opacity-85 leading-none font-bold">
                    {spin.multiplier.toFixed(1)}x
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
