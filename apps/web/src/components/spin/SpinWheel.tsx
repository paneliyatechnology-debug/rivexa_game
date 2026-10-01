'use client';

import React, { useEffect, useRef } from 'react';
import { SECTORS } from './sectors';
import { SpinResult, WheelSector } from './types';

interface SpinWheelProps {
  status: 'BETTING_OPEN' | 'SPINNING' | 'RESULT';
  secondsRemaining: number;
  winningResult: SpinResult | null;
  targetAngle: number;
  currentAngleRef: React.MutableRefObject<number>;
  spinStartTimeRef: React.MutableRefObject<number>;
  onTickSound?: () => void;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({
  status,
  secondsRemaining,
  winningResult,
  targetAngle,
  currentAngleRef,
  spinStartTimeRef,
  onTickSound,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastTickSectorRef = useRef<number>(-1);

  // Loaded 4K Avatar Image References
  const lionImgRef = useRef<HTMLImageElement | null>(null);
  const elephantImgRef = useRef<HTMLImageElement | null>(null);
  const bullImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lion = new Image();
      lion.src = '/images/lion_avatar.png';
      lionImgRef.current = lion;

      const elephant = new Image();
      elephant.src = '/images/elephant_avatar.png';
      elephantImgRef.current = elephant;

      const bull = new Image();
      bull.src = '/images/bull_avatar.png';
      bullImgRef.current = bull;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const container = containerRef.current;
      const displayWidth = container ? container.clientWidth : 380;
      const displayHeight = container ? container.clientHeight : 380;

      // Ensure high DPI / sharp rendering on retina displays
      const dpr = window.devicePixelRatio || 1;
      const width = (canvas.width = Math.floor(displayWidth * dpr));
      const height = (canvas.height = Math.floor(displayHeight * dpr));

      ctx.save();
      ctx.scale(dpr, dpr);

      const size = Math.min(displayWidth, displayHeight) * 0.94;
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;
      const radius = size / 2;

      ctx.clearRect(0, 0, displayWidth, displayHeight);

      // Handle spinning rotation physics (Decelerating Cubic ease-out)
      if (status === 'SPINNING') {
        const elapsed = (Date.now() - spinStartTimeRef.current) / 1000;
        const duration = 4.5;
        if (elapsed < duration) {
          const t = elapsed / duration;
          const easeOut = 1 - Math.pow(1 - t, 3);
          currentAngleRef.current = targetAngle * easeOut;

          // Sound tick as pointer crosses sector boundary
          const sectorAngle = (Math.PI * 2) / SECTORS.length;
          const currentSectorIdx = Math.floor(
            ((currentAngleRef.current % (Math.PI * 2)) + Math.PI * 2) / sectorAngle
          );
          if (currentSectorIdx !== lastTickSectorRef.current) {
            lastTickSectorRef.current = currentSectorIdx;
            if (onTickSound) onTickSound();
          }
        } else {
          currentAngleRef.current = targetAngle;
        }
      }

      ctx.save();
      ctx.translate(centerX, centerY);

      // 1. Outer Golden Rim Glow & Drop Shadow
      ctx.shadowColor = 'rgba(255, 215, 0, 0.45)';
      ctx.shadowBlur = Math.min(24, radius * 0.12);

      const outerGrad = ctx.createRadialGradient(0, 0, radius * 0.84, 0, 0, radius);
      outerGrad.addColorStop(0, '#fff494');
      outerGrad.addColorStop(0.25, '#ffd700');
      outerGrad.addColorStop(0.65, '#b8860b');
      outerGrad.addColorStop(1, '#3b2700');

      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 2. Studded Golden Light Bulbs around Rim
      const numBulbs = 24;
      const bulbRadius = Math.max(3, radius * 0.02);
      for (let i = 0; i < numBulbs; i++) {
        const angle = (i * Math.PI * 2) / numBulbs;
        const bx = (radius - bulbRadius - 4) * Math.cos(angle);
        const by = (radius - bulbRadius - 4) * Math.sin(angle);

        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#ffe44d';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(bx, by, bulbRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Rotate Wheel Canvas by currentAngleRef
      ctx.rotate(currentAngleRef.current);

      // 3. Draw 38 Wheel Sectors & Numbers
      const totalSectors = SECTORS.length;
      const sliceAngle = (Math.PI * 2) / totalSectors;
      const sectorRadius = radius - Math.max(14, radius * 0.08);

      SECTORS.forEach((sec, idx) => {
        const startA = idx * sliceAngle - sliceAngle / 2;
        const endA = startA + sliceAngle;

        let fillGrad: CanvasGradient;
        if (sec.color === 'yellow') {
          fillGrad = ctx.createRadialGradient(0, 0, sectorRadius * 0.3, 0, 0, sectorRadius);
          fillGrad.addColorStop(0, '#ffe552');
          fillGrad.addColorStop(1, '#d98200');
        } else if (sec.color === 'green') {
          fillGrad = ctx.createRadialGradient(0, 0, sectorRadius * 0.3, 0, 0, sectorRadius);
          fillGrad.addColorStop(0, '#10b981');
          fillGrad.addColorStop(1, '#046c4e');
        } else if (sec.color === 'red') {
          fillGrad = ctx.createRadialGradient(0, 0, sectorRadius * 0.3, 0, 0, sectorRadius);
          fillGrad.addColorStop(0, '#ef4444');
          fillGrad.addColorStop(1, '#b91c1c');
        } else {
          fillGrad = ctx.createRadialGradient(0, 0, sectorRadius * 0.3, 0, 0, sectorRadius);
          fillGrad.addColorStop(0, '#fbbf24');
          fillGrad.addColorStop(1, '#b45309');
        }

        ctx.fillStyle = fillGrad;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, sectorRadius, startA, endA);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Highlight sector if it's the winning result on wheel stop
        if (
          status === 'RESULT' &&
          winningResult &&
          (winningResult.label === sec.label || winningResult.number === sec.number)
        ) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, sectorRadius, startA, endA);
          ctx.closePath();
          ctx.fill();
        }

        // Numbers on Outer Track
        ctx.save();
        const midA = startA + sliceAngle / 2;
        const textR = sectorRadius - Math.max(12, sectorRadius * 0.08);
        const tx = textR * Math.cos(midA);
        const ty = textR * Math.sin(midA);

        ctx.translate(tx, ty);
        ctx.rotate(midA + Math.PI / 2);
        ctx.fillStyle = '#ffffff';
        const fontSize = Math.max(9, Math.floor(radius * 0.055));
        ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sec.label, 0, 0);
        ctx.restore();
      });

      // 4. Animal Quadrant Badges
      const animalRadius = sectorRadius * 0.52;
      const badgeSize = Math.max(16, radius * 0.11);
      const animalPositions = [
        { angle: -Math.PI / 2, type: 'elephant' },
        { angle: 0, type: 'lion' },
        { angle: Math.PI / 2, type: 'bull' },
        { angle: Math.PI, type: 'crown' },
      ];

      animalPositions.forEach((pos) => {
        const ax = animalRadius * Math.cos(pos.angle);
        const ay = animalRadius * Math.sin(pos.angle);

        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(pos.angle + Math.PI / 2);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, badgeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Render HD Image if loaded, else fallback symbol
        let imgObj: HTMLImageElement | null = null;
        if (pos.type === 'lion') imgObj = lionImgRef.current;
        else if (pos.type === 'elephant') imgObj = elephantImgRef.current;
        else if (pos.type === 'bull') imgObj = bullImgRef.current;

        const imgRadius = badgeSize - 2;
        if (imgObj && imgObj.complete) {
          ctx.beginPath();
          ctx.arc(0, 0, imgRadius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(imgObj, -imgRadius, -imgRadius, imgRadius * 2, imgRadius * 2);
        } else {
          ctx.font = `${Math.floor(badgeSize * 0.9)}px Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const icon =
            pos.type === 'lion'
              ? '🦁'
              : pos.type === 'elephant'
              ? '🐘'
              : pos.type === 'bull'
              ? '🐂'
              : '👑';
          ctx.fillText(icon, 0, 1);
        }

        ctx.restore();
      });

      // 5. Center Hub
      const hubRadius = radius * 0.34;
      const hubGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, hubRadius);
      hubGrad.addColorStop(0, '#1e3a8a');
      hubGrad.addColorStop(0.65, '#0f172a');
      hubGrad.addColorStop(1, '#020617');

      ctx.fillStyle = hubGrad;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.arc(0, 0, hubRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore(); // Restore unrotated context

      // 6. PERFECT 3D GOLDEN ARROW POINTER ALIGNED AT TOP 12 O'CLOCK
      const pointerY = centerY - radius + Math.max(8, radius * 0.05);
      const ptrW = Math.max(14, radius * 0.08);
      const ptrH = Math.max(16, radius * 0.09);

      ctx.save();
      ctx.translate(centerX, pointerY);

      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;

      const ptrGrad = ctx.createLinearGradient(0, -ptrH, 0, ptrH);
      ptrGrad.addColorStop(0, '#ffffff');
      ptrGrad.addColorStop(0.35, '#ffe552');
      ptrGrad.addColorStop(0.75, '#d98200');
      ptrGrad.addColorStop(1, '#473000');

      ctx.fillStyle = ptrGrad;
      ctx.beginPath();
      ctx.moveTo(-ptrW, -ptrH);
      ctx.lineTo(ptrW, -ptrH);
      ctx.lineTo(0, ptrH);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, -ptrH * 0.35, ptrW * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.restore(); // Restore dpr scale

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [status, targetAngle, winningResult, onTickSound]);

  return (
    <div className="w-full relative bg-gradient-to-b from-[#0b1426] via-[#08101d] to-[#050a14] border border-[#1c2d4a] rounded-3xl p-2 sm:p-4 overflow-hidden flex flex-col items-center justify-center shadow-2xl">
      {/* Safari Ambient Backdrop */}
      <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950 via-slate-950 to-black" />

      {/* HERO WHEEL CONTAINER: Responsive square aspect ratio */}
      <div
        ref={containerRef}
        className="relative w-full max-w-[420px] sm:max-w-[480px] aspect-square flex items-center justify-center mx-auto"
      >
        <canvas ref={canvasRef} className="w-full h-full block drop-shadow-[0_0_25px_rgba(245,158,11,0.25)]" />

        {/* Central Hub Display overlay for Status & Countdown */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center z-10">
          {status === 'BETTING_OPEN' && (
            <div className="space-y-0.5 animate-in fade-in">
              <span className="text-[10px] sm:text-xs font-mono font-bold text-blue-300 uppercase tracking-widest block">
                COUNTDOWN
              </span>
              <span className="text-2xl xs:text-3xl sm:text-4xl font-black font-mono text-white tracking-tight drop-shadow-md">
                {secondsRemaining.toFixed(1)}s
              </span>
              <span className="text-[9px] text-slate-400 font-mono block">
                SECONDS
              </span>
            </div>
          )}

          {status === 'SPINNING' && (
            <div className="space-y-1 animate-pulse">
              <span className="text-xs sm:text-sm font-black text-amber-400 tracking-widest uppercase block">
                SPINNING...
              </span>
              <span className="text-2xl sm:text-3xl block">🔮</span>
            </div>
          )}

          {status === 'RESULT' && winningResult && (
            <div className="space-y-0.5 animate-in zoom-in-95">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                WINNER
              </span>
              <span className="text-xl sm:text-3xl font-black font-mono text-amber-300 block drop-shadow-md">
                #{winningResult.label}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-200 uppercase block">
                {winningResult.animal} ({winningResult.multiplier}x)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
