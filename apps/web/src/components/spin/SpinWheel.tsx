'use client';

import React, { useMemo } from 'react';
import { WHEEL_SLOTS } from './sectors';
import { WheelSlot } from './types';

interface SpinWheelProps {
  rotation: number;
  isSpinning: boolean;
  secondsRemaining: number;
  status: 'BETTING_OPEN' | 'SPINNING' | 'RESULT';
  winningSlot: WheelSlot | null;
  onTransitionEnd?: () => void;
}

export function SpinWheel({
  rotation,
  isSpinning,
  secondsRemaining,
  status,
  winningSlot,
  onTransitionEnd,
}: SpinWheelProps) {
  const size = 420;
  const center = size / 2; // 210
  const radius = 186; // Outer edge of wedges
  const innerRadius = 76; // Inner edge (center hub perimeter)
  const slotCount = WHEEL_SLOTS.length; // 24
  const anglePerSlot = 360 / slotCount; // 15 degrees per slice

  // Pre-calculate SVG geometry for all 24 slices
  const slices = useMemo(() => {
    return WHEEL_SLOTS.map((slot, i) => {
      // Slot 0 (numbered 1) is centered directly at 12 o'clock (-90 deg)
      const startDeg = -90 + (i - 0.5) * anglePerSlot;
      const endDeg = -90 + (i + 0.5) * anglePerSlot;
      const midDeg = -90 + i * anglePerSlot;

      const startRad = (startDeg * Math.PI) / 180;
      const endRad = (endDeg * Math.PI) / 180;
      const midRad = (midDeg * Math.PI) / 180;

      // Outer arc points
      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      // Inner arc points
      const ix1 = center + innerRadius * Math.cos(startRad);
      const iy1 = center + innerRadius * Math.sin(startRad);
      const ix2 = center + innerRadius * Math.cos(endRad);
      const iy2 = center + innerRadius * Math.sin(endRad);

      // Number text placement: near the outer rim, exactly like the reference wheel
      const textRadius = radius - 24;
      const textX = center + textRadius * Math.cos(midRad);
      const textY = center + textRadius * Math.sin(midRad);

      const pathData = [
        `M ${ix1} ${iy1}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${innerRadius} ${innerRadius} 0 0 0 ${ix1} ${iy1}`,
        'Z',
      ].join(' ');

      // Color scheme matching casino wheel:
      // RED: Slot 1 (index 0) and Slot 11 (index 10)
      // BLUE & GREEN: alternating for the rest
      let fillColor = 'url(#blueGradient)';
      if (slot.color === 'red') {
        fillColor = 'url(#redGradient)';
      } else if (slot.color === 'green') {
        fillColor = 'url(#greenGradient)';
      }

      return {
        slot,
        pathData,
        fillColor,
        textX,
        textY,
        midDeg,
      };
    });
  }, [center, radius, innerRadius, anglePerSlot]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#287BFF]/35 shadow-[0_0_25px_rgba(0,110,255,0.25)] flex items-center justify-center select-none py-3 sm:py-5 md:py-6 my-0.5 bg-[#050D24]">
      {/* 3D NEON ARENA BACKGROUND (Exact attached image placed ONLY behind the spin wheel) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url('/images/wheel-arena-bg.jpg')`,
          backgroundPosition: 'center 46%',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Subtle edge vignette overlay to blend into the card */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#050D24]/35 via-transparent to-[#050D24]/50 pointer-events-none" />

      {/* WHEEL ASSEMBLY (Halo, Pointer, Rotating 24-Segment Wheel & Center Hub) */}
      <div className="relative z-10 flex items-center justify-center">
        {/* Outer Glow Halo & Dynamic Ambient Arena Lighting */}
      <div
        className={`absolute rounded-full pointer-events-none transition-all duration-700 ${
          isSpinning
            ? 'w-[300px] sm:w-[380px] md:w-[420px] h-[300px] sm:h-[380px] md:h-[420px] bg-gradient-to-tr from-[#00D9FF]/40 via-[#287BFF]/35 to-[#873BFF]/30 blur-3xl animate-pulse'
            : status === 'RESULT' && winningSlot
            ? winningSlot.color === 'green'
              ? 'w-[290px] sm:w-[360px] md:w-[400px] h-[290px] sm:h-[360px] md:h-[400px] bg-gradient-to-tr from-[#00E5A0]/50 via-[#00C853]/40 to-[#00E5A0]/25 blur-3xl'
              : winningSlot.color === 'blue'
              ? 'w-[290px] sm:w-[360px] md:w-[400px] h-[290px] sm:h-[360px] md:h-[400px] bg-gradient-to-tr from-[#00D9FF]/50 via-[#0066FF]/40 to-[#287BFF]/25 blur-3xl'
              : 'w-[290px] sm:w-[360px] md:w-[400px] h-[290px] sm:h-[360px] md:h-[400px] bg-gradient-to-tr from-[#FF2468]/55 via-[#D8132B]/45 to-[#FF3FA4]/30 blur-3xl'
            : 'w-[250px] sm:w-[320px] md:w-[350px] h-[250px] sm:h-[320px] md:h-[350px] bg-gradient-to-tr from-[#287BFF]/25 via-[#00D9FF]/20 to-[#FFB703]/20 blur-2xl animate-neon-breathe'
        }`}
      />

      {/* Luminous Outer Orbit Trail when spinning */}
      {isSpinning && (
        <div className="absolute w-[240px] h-[240px] xs:w-[260px] xs:h-[260px] sm:w-[280px] sm:h-[280px] md:w-[300px] md:h-[300px] lg:w-[310px] lg:h-[310px] rounded-full border border-[#00D9FF]/60 shadow-[0_0_20px_#00D9FF] animate-spin-slow pointer-events-none" />
      )}

      {/* TOP GOLDEN POINTER (with centered diamond cutout matching reference) */}
      <div
        className={`absolute -top-2.5 sm:-top-2 z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ${
          isSpinning
            ? 'drop-shadow-[0_4px_18px_rgba(255,232,133,1)] scale-105'
            : status === 'RESULT'
            ? 'drop-shadow-[0_4px_22px_rgba(255,201,40,1)] scale-110'
            : 'drop-shadow-[0_4px_12px_rgba(245,166,35,0.85)]'
        }`}
      >
        <svg width="38" height="42" viewBox="0 0 44 48" fill="none">
          {/* Main Gold Arrow */}
          <path
            d="M22 46 L5 12 C3 6 7 2 13 2 L31 2 C37 2 41 6 39 12 L22 46 Z"
            fill="url(#goldPointerGradient)"
            stroke="#FFE885"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Inner Golden Border Accent */}
          <path
            d="M22 40 L9 13 C8 9 10 6 14 6 L30 6 C34 6 36 9 35 13 L22 40 Z"
            fill="none"
            stroke="#D48806"
            strokeWidth="1.2"
            opacity="0.8"
          />
          {/* Diamond Symbol In Center of Pointer */}
          <polygon
            points="22,12 28,18 22,24 16,18"
            fill="#B26A00"
            stroke="#FFF2A3"
            strokeWidth="1.5"
          />
          <polygon
            points="22,14 26,18 22,22 18,18"
            fill="#FFE885"
          />

          <defs>
            <linearGradient id="goldPointerGradient" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFF4A3" />
              <stop offset="40%" stopColor="#F5A623" />
              <stop offset="100%" stopColor="#D48806" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ROTATING 24-SEGMENT WHEEL */}
      <div
        className="w-[220px] h-[220px] xs:w-[240px] xs:h-[240px] sm:w-[260px] sm:h-[260px] md:w-[280px] md:h-[280px] lg:w-[290px] lg:h-[290px] xl:w-[300px] xl:h-[300px] relative transition-transform"
        style={{
          transform: `rotate(${rotation}deg)`,
          transitionDuration: isSpinning ? '4500ms' : '0ms',
          transitionTimingFunction: 'cubic-bezier(0.12, 0.88, 0.22, 1.0)',
        }}
        onTransitionEnd={onTransitionEnd}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full drop-shadow-[0_0_25px_rgba(0,0,0,0.85)]"
        >
          <defs>
            {/* Casino Red Gradient */}
            <linearGradient id="redGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FF2A48" />
              <stop offset="100%" stopColor="#D8132B" />
            </linearGradient>

            {/* Casino Royal Blue Gradient */}
            <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0066FF" />
              <stop offset="100%" stopColor="#0048D9" />
            </linearGradient>

            {/* Casino Vibrant Green Gradient */}
            <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00C853" />
              <stop offset="100%" stopColor="#009638" />
            </linearGradient>

            {/* Metallic Gold Outer Rim Gradient */}
            <radialGradient id="goldRimGradient" cx="50%" cy="50%" r="50%">
              <stop offset="86%" stopColor="#8A5A0C" />
              <stop offset="91%" stopColor="#F5A623" />
              <stop offset="95%" stopColor="#FFE57F" />
              <stop offset="98%" stopColor="#F5A623" />
              <stop offset="100%" stopColor="#7A4E06" />
            </radialGradient>

            {/* Center Gold Ring Gradient */}
            <linearGradient id="centerGoldRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFE885" />
              <stop offset="50%" stopColor="#F5A623" />
              <stop offset="100%" stopColor="#D48806" />
            </linearGradient>
          </defs>

          {/* Outer Heavy Gold Rim */}
          <circle
            cx={center}
            cy={center}
            r={radius + 15}
            fill="#061026"
            stroke="url(#goldRimGradient)"
            strokeWidth="16"
          />

          {/* Inner Gold Thin Trim Line */}
          <circle
            cx={center}
            cy={center}
            r={radius + 1}
            fill="none"
            stroke="#FFE885"
            strokeWidth="1.8"
            opacity="0.9"
          />

          {/* 24 Glowing Light Bulbs on the Gold Rim */}
          {Array.from({ length: 24 }).map((_, idx) => {
            const bulbAngle = ((idx * 15 - 90) * Math.PI) / 180;
            const bx = center + (radius + 8) * Math.cos(bulbAngle);
            const by = center + (radius + 8) * Math.sin(bulbAngle);
            return (
              <g key={`bulb-${idx}`}>
                {/* Bulb Glow */}
                <circle
                  cx={bx}
                  cy={by}
                  r="5.5"
                  fill="#FFAA00"
                  opacity="0.45"
                />
                {/* Bulb Base */}
                <circle
                  cx={bx}
                  cy={by}
                  r="3.5"
                  fill="#FFF7C2"
                  stroke="#F5A623"
                  strokeWidth="0.8"
                />
                {/* Hotspot */}
                <circle
                  cx={bx}
                  cy={by}
                  r="1.5"
                  fill="#FFFFFF"
                />
              </g>
            );
          })}

          {/* All 24 Wheel Segments */}
          {slices.map((slice, i) => (
            <g key={`slice-${i}`}>
              <path
                d={slice.pathData}
                fill={slice.fillColor}
                stroke="#FFE082"
                strokeWidth="1.2"
                strokeLinejoin="round"
                className="transition-all"
              />

              {/* Bold White Segment Number */}
              <text
                x={slice.textX}
                y={slice.textY}
                fill="#FFFFFF"
                fontSize="15"
                fontWeight="900"
                fontFamily="system-ui, -apple-system, sans-serif"
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${slice.midDeg + 90}, ${slice.textX}, ${slice.textY})`}
                style={{
                  filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.85))',
                }}
              >
                {slice.slot.slotNumber}
              </text>
            </g>
          ))}

          {/* Center Hub Outer Gold Border */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="#070E22"
            stroke="url(#centerGoldRing)"
            strokeWidth="4.5"
          />
        </svg>
      </div>

      {/* STATIC WHEEL CENTER HUB (Does not rotate with the wheel) */}
      <div
        className={`absolute z-20 w-[96px] h-[96px] xs:w-[104px] xs:h-[104px] sm:w-[114px] sm:h-[114px] md:w-[120px] md:h-[120px] rounded-full bg-gradient-to-b from-[#091535] via-[#060E24] to-[#030816] border-2 flex flex-col items-center justify-center p-1.5 text-center pointer-events-none transition-all duration-300 ${
          isSpinning
            ? 'border-[#00D9FF] shadow-[0_0_30px_rgba(0,217,255,0.7),inset_0_0_15px_rgba(0,217,255,0.3)]'
            : status === 'RESULT' && winningSlot
            ? winningSlot.color === 'green'
              ? 'border-[#00E5A0] shadow-[0_0_30px_rgba(0,229,160,0.75),inset_0_0_15px_rgba(0,229,160,0.3)]'
              : winningSlot.color === 'blue'
              ? 'border-[#00D9FF] shadow-[0_0_30px_rgba(0,217,255,0.75),inset_0_0_15px_rgba(0,217,255,0.3)]'
              : 'border-[#FF2468] shadow-[0_0_30px_rgba(255,36,104,0.85),inset_0_0_15px_rgba(255,36,104,0.3)]'
            : secondsRemaining <= 3 && secondsRemaining > 0
            ? 'border-[#FF2468] shadow-[0_0_22px_rgba(255,36,104,0.7)]'
            : secondsRemaining <= 10
            ? 'border-[#FFD166]/85 shadow-[0_0_18px_rgba(255,209,102,0.5)]'
            : 'border-[#F5A623]/70 shadow-[0_0_20px_rgba(245,166,35,0.3),inset_0_0_12px_rgba(0,0,0,0.8)]'
        }`}
      >
        {/* Subtle glowing ring inside center */}
        <div className="absolute inset-1 rounded-full border border-white/10" />

        {isSpinning ? (
          <div className="flex flex-col items-center justify-center leading-tight">
            <span className="text-[9px] sm:text-[10px] font-black text-[#00D9FF] tracking-widest uppercase animate-pulse drop-shadow-[0_0_8px_#00D9FF]">
              SPINNING
            </span>
            <span className="text-xl sm:text-2xl my-0.5 animate-spin">🎡</span>
            <span className="text-[7.5px] sm:text-[8px] font-bold text-[#7285AE] tracking-widest uppercase">
              GOOD LUCK
            </span>
          </div>
        ) : status === 'RESULT' && winningSlot ? (
          <div className="flex flex-col items-center justify-center leading-tight">
            <span className="text-[8px] sm:text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">
              RESULT
            </span>
            <span
              className={`text-sm sm:text-base font-black font-mono tracking-wider drop-shadow-md ${
                winningSlot.color === 'green'
                  ? 'text-[#00E5A0] drop-shadow-[0_0_10px_#00E5A0]'
                  : winningSlot.color === 'blue'
                  ? 'text-[#00D9FF] drop-shadow-[0_0_10px_#00D9FF]'
                  : 'text-[#FF2468] drop-shadow-[0_0_10px_#FF2468]'
              }`}
            >
              {winningSlot.color.toUpperCase()}
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono font-black text-white bg-white/10 px-1.5 py-0.2 rounded-full mt-0.5 border border-white/15">
              {winningSlot.multiplier.toFixed(2)}x
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center leading-tight">
            {secondsRemaining <= 0 ? (
              <>
                <span className="text-[8px] sm:text-[9px] font-black text-[#FF2468] uppercase tracking-wider drop-shadow-[0_0_10px_#FF2468] animate-pulse">
                  BETTING CLOSED
                </span>
                <span className="text-base sm:text-lg font-black font-mono tracking-tight my-0.5 text-[#FF2468] drop-shadow-[0_0_12px_#FF2468]">
                  00:00
                </span>
                <span className="text-[7px] sm:text-[8px] font-bold text-[#FF7A90] uppercase tracking-widest">
                  LOCKING IN
                </span>
              </>
            ) : secondsRemaining <= 3 ? (
              <>
                <span className="text-[8px] sm:text-[9px] font-black text-[#FF2468] uppercase tracking-wider drop-shadow-[0_0_10px_#FF2468] animate-pulse">
                  HURRY UP!
                </span>
                <span className="text-lg sm:text-2xl font-black font-mono tracking-tight my-0.5 text-[#FF2468] drop-shadow-[0_0_16px_#FF2468] animate-pulse">
                  00:{String(Math.max(0, Math.floor(secondsRemaining))).padStart(2, '0')}
                </span>
                <span className="text-[7px] sm:text-[8px] font-bold text-[#FF7A90] uppercase tracking-widest">
                  LOCKING BETS
                </span>
              </>
            ) : secondsRemaining <= 10 ? (
              <>
                <span className="text-[8px] sm:text-[9px] font-black text-[#FFD166] uppercase tracking-wider drop-shadow-[0_0_8px_rgba(255,209,102,0.8)]">
                  BETTING OPEN
                </span>
                <span className="text-lg sm:text-2xl font-black font-mono tracking-tight my-0.5 text-[#FFD166] drop-shadow-[0_0_12px_rgba(255,209,102,0.85)]">
                  00:{String(Math.max(0, Math.floor(secondsRemaining))).padStart(2, '0')}
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-bold text-[#FFAA00] uppercase tracking-widest">
                  CLOSING SOON
                </span>
              </>
            ) : (
              <>
                <span className="text-[8.5px] sm:text-[9.5px] font-black text-[#00E5A0] uppercase tracking-wider drop-shadow-[0_0_8px_rgba(0,229,160,0.5)]">
                  BETTING OPEN
                </span>
                <span className="text-lg sm:text-2xl font-black font-mono tracking-tight my-0.5 text-white drop-shadow-[0_0_8px_rgba(0,217,255,0.45)]">
                  00:{String(Math.max(0, Math.floor(secondsRemaining))).padStart(2, '0')}
                </span>
                <span className="text-[7.5px] sm:text-[8.5px] font-bold text-[#38BDF8] uppercase tracking-widest">
                  PLACE YOUR BET
                </span>
              </>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
