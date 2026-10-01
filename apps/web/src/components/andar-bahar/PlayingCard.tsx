'use client';

import React from 'react';

export interface PlayingCardProps {
  card?: string; // e.g. "7♦", "K♠", "10♥", "A♣"
  isBack?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isMatching?: boolean;
  isAnimated?: boolean;
  startX?: number;
  startY?: number;
  className?: string;
}

export function parseCard(cardStr?: string) {
  if (!cardStr) return { suit: '♦', rank: '7', isRed: true };
  const str = cardStr.trim();
  const lastChar = str.slice(-1);
  const rawRank = str.slice(0, -1) || '7';

  let suit = '♦';
  let isRed = true;

  if (lastChar === '♦' || lastChar.toUpperCase() === 'D') {
    suit = '♦';
    isRed = true;
  } else if (lastChar === '♥' || lastChar.toUpperCase() === 'H') {
    suit = '♥';
    isRed = true;
  } else if (lastChar === '♠' || lastChar.toUpperCase() === 'S') {
    suit = '♠';
    isRed = false;
  } else if (lastChar === '♣' || lastChar.toUpperCase() === 'C') {
    suit = '♣';
    isRed = false;
  } else {
    // If str has suit embedded or default
    suit = lastChar;
    isRed = suit === '♥' || suit === '♦';
  }

  return { suit, rank: rawRank.toUpperCase(), isRed };
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  isBack = false,
  size = 'md',
  isMatching = false,
  isAnimated = false,
  startX = 0,
  startY = 0,
  className = '',
}) => {
  const { suit, rank, isRed } = parseCard(card);

  // Size dimensions for crisp high-visibility display
  const sizeClasses = {
    sm: 'w-9 h-13 text-xs',
    md: 'w-12 h-16 sm:w-15 sm:h-20 text-xs sm:text-sm',
    lg: 'w-16 h-22 sm:w-20 sm:h-28 text-sm sm:text-base',
  }[size];

  if (isBack || !card) {
    return (
      <div
        className={`relative rounded-xl bg-gradient-to-br from-[#0B1E48] via-[#081534] to-[#040C24] border-2 border-[#00D9FF] shadow-[0_0_15px_rgba(0,217,255,0.4)] flex items-center justify-center overflow-hidden transition-all duration-300 shrink-0 ${sizeClasses} ${className}`}
      >
        {/* Geometric Card Back Pattern */}
        <div className="absolute inset-1 rounded-lg border border-[#00D9FF]/40 bg-[radial-gradient(#00D9FF_1px,transparent_1px)] [background-size:6px_6px] opacity-40" />
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-[#00D9FF] flex items-center justify-center bg-[#071738] shadow-[0_0_12px_rgba(0,217,255,0.6)] z-10">
          <span className="text-xs sm:text-sm text-[#00D9FF] font-black">♠</span>
        </div>
      </div>
    );
  }

  // Dynamic Trajectory Inline Style
  const animStyle = isAnimated
    ? ({
        '--startX': `${startX}px`,
        '--startY': `${startY}px`,
      } as React.CSSProperties)
    : {};

  return (
    <div
      style={animStyle}
      className={`relative rounded-xl bg-gradient-to-b from-[#FFFFFF] via-[#FAFCFF] to-[#EAEFF8] border-2 border-slate-300 shadow-[0_6px_16px_rgba(0,0,0,0.5)] flex flex-col justify-between p-1 sm:p-1.5 transition-all duration-300 select-none shrink-0 ${sizeClasses} ${
        isMatching ? 'ring-4 ring-[#FFC928] shadow-[0_0_25px_#FFC928] animate-pulse scale-105 z-20' : ''
      } ${isAnimated ? 'card-physical-fly' : ''} ${className}`}
    >
      {/* Top Left Rank & Suit */}
      <div className={`leading-none flex flex-col items-center ${isRed ? 'text-[#E11D48]' : 'text-[#0F172A]'}`}>
        <span className="font-extrabold tracking-tighter text-xs sm:text-sm font-mono">{rank}</span>
        <span className="text-[11px] sm:text-xs leading-none">{suit}</span>
      </div>

      {/* Center Large Suit Symbol */}
      <div className={`absolute inset-0 flex items-center justify-center text-lg sm:text-2xl pointer-events-none font-bold ${isRed ? 'text-[#E11D48]' : 'text-[#0F172A]'}`}>
        <span>{suit}</span>
      </div>

      {/* Bottom Right Rank & Suit (Inverted) */}
      <div className={`leading-none flex flex-col items-center rotate-180 self-end ${isRed ? 'text-[#E11D48]' : 'text-[#0F172A]'}`}>
        <span className="font-extrabold tracking-tighter text-xs sm:text-sm font-mono">{rank}</span>
        <span className="text-[11px] sm:text-xs leading-none">{suit}</span>
      </div>
    </div>
  );
};
