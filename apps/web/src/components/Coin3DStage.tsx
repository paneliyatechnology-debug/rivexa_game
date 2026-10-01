'use client';

import React, { useRef, useEffect, useState } from 'react';

type CoinSide = 'HEADS' | 'TAILS';

interface Coin3DStageProps {
  isFlipping: boolean;
  resultSide: CoinSide | null;
  chosenSide: CoinSide;
  isWin?: boolean;
  payoutAmount?: number;
  betAmount?: number;
  onAnimationComplete?: () => void;
  className?: string;
}

export const Coin3DStage: React.FC<Coin3DStageProps> = ({
  isFlipping,
  resultSide,
  chosenSide,
  isWin = false,
  payoutAmount = 0,
  betAmount = 0,
  onAnimationComplete,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hasCalledCompleteRef = useRef<boolean>(false);
  const [hudStatus, setHudStatus] = useState<string>('READY');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── High-DPI Canvas Setup ──────────────────────────────────────────────
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Particle System ───────────────────────────────────────────────────
    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      color: string;
      alpha: number;
      life: number;
      maxLife: number;
    };
    const particles: Particle[] = [];
    const burst = (cx: number, cy: number, n = 16, explosive = false, forceColor?: string) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = explosive ? 3.0 + Math.random() * 7 : 0.6 + Math.random() * 2.2;
        const defaultColor = forceColor
          ? forceColor
          : Math.random() > 0.45
          ? '#fbbf24'
          : Math.random() > 0.5
          ? '#38bdf8'
          : '#ffffff';
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd - (explosive ? 3.0 : 0.6),
          r: 2.0 + Math.random() * 4.0,
          color: defaultColor,
          alpha: 1,
          life: 0,
          maxLife: explosive ? 60 + Math.random() * 30 : 90 + Math.random() * 30,
        });
      }
    };

    // ── Animation State ───────────────────────────────────────────────────
    let phase = 'IDLE';
    let flipStart = 0;
    let phaseT = 0;
    let coinOffY = 0;
    let spinY = 0;
    let spinX = 1.38; // ~79° frontal tilt
    let scale = 1;
    let targetSpinY = 0;
    let resultSideChoice: CoinSide = resultSide || chosenSide;

    // ══════════════════════════════════════════════════════════════════════
    //  1. CINEMATIC ARENA BACKGROUND
    // ══════════════════════════════════════════════════════════════════════
    const drawEnvironment = (W: number, H: number, CX: number, PLATFORM_Y: number, PR: number, t: number) => {
      // Midnight Navy / Black Gradient
      const bgG = ctx.createLinearGradient(0, 0, 0, H);
      bgG.addColorStop(0.0, '#01040d');
      bgG.addColorStop(0.35, '#050d22');
      bgG.addColorStop(0.7, '#030817');
      bgG.addColorStop(1.0, '#010208');
      ctx.fillStyle = bgG;
      ctx.fillRect(0, 0, W, H);

      // Concentric Ceiling Mechanical Rings
      ctx.save();
      const ceilG = ctx.createRadialGradient(CX, H * 0.22, 0, CX, H * 0.22, W * 0.65);
      ceilG.addColorStop(0, 'rgba(251,191,36,0.14)');
      ceilG.addColorStop(0.4, 'rgba(6,182,212,0.08)');
      ceilG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ceilG;
      ctx.beginPath();
      ctx.ellipse(CX, H * 0.22, W * 0.65, H * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ceiling Mechanical Ring Arcs
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.16)';
      ctx.lineWidth = 2;
      for (let r = 0.2; r <= 0.6; r += 0.12) {
        ctx.beginPath();
        ctx.ellipse(CX, H * 0.22, W * r, H * 0.2 * r, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Dark Reflective Metallic Floor below platform
      const PERSP = 0.22;
      ctx.save();
      const fg = ctx.createRadialGradient(CX, PLATFORM_Y, 0, CX, PLATFORM_Y, PR * 2.8);
      fg.addColorStop(0, 'rgba(14,28,64,0.75)');
      fg.addColorStop(0.5, 'rgba(6,14,34,0.5)');
      fg.addColorStop(1, 'rgba(1,3,10,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(CX, PLATFORM_Y + PR * 0.08, PR * 2.8, PR * PERSP * 2.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Floor Perspective Grid Lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.09)';
      ctx.lineWidth = 1;
      for (let i = -12; i <= 12; i++) {
        ctx.beginPath();
        ctx.moveTo(CX + i * (W * 0.05), PLATFORM_Y);
        ctx.lineTo(CX + i * (W * 0.13), H);
        ctx.stroke();
      }
      ctx.restore();

      // Volumetric Radial Spotlight (behind coin)
      ctx.save();
      const beamG = ctx.createLinearGradient(CX, 0, CX, PLATFORM_Y);
      beamG.addColorStop(0, 'rgba(251,191,36,0.18)');
      beamG.addColorStop(0.45, 'rgba(6,182,212,0.10)');
      beamG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = beamG;
      ctx.beginPath();
      ctx.moveTo(CX - W * 0.15, 0);
      ctx.lineTo(CX + W * 0.15, 0);
      ctx.lineTo(CX + PR * 1.35, PLATFORM_Y);
      ctx.lineTo(CX - PR * 1.35, PLATFORM_Y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Futuristic Architectural Side Pillars (Left & Right)
      const pillarPositions = [CX - PR * 1.48, CX + PR * 1.48];
      pillarPositions.forEach((px, idx) => {
        const pillarW = W * 0.048;
        const pulse = 0.75 + Math.sin(t * 2.2 + idx) * 0.25;

        ctx.save();
        // Metallic Pillar Body
        const pilG = ctx.createLinearGradient(px - pillarW, 0, px + pillarW, 0);
        pilG.addColorStop(0, '#030814');
        pilG.addColorStop(0.3, '#0b1935');
        pilG.addColorStop(0.5, '#172b50');
        pilG.addColorStop(0.7, '#0b1935');
        pilG.addColorStop(1, '#030814');
        ctx.fillStyle = pilG;
        ctx.fillRect(px - pillarW, H * 0.04, pillarW * 2, PLATFORM_Y - H * 0.04);

        // Gold Trim Line
        const trimX = idx === 0 ? px + pillarW * 0.75 : px - pillarW * 0.75;
        const tg = ctx.createLinearGradient(trimX, 0, trimX, PLATFORM_Y);
        tg.addColorStop(0, '#78350f');
        tg.addColorStop(0.5, '#fbbf24');
        tg.addColorStop(1, '#78350f');
        ctx.strokeStyle = tg;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(trimX, H * 0.04);
        ctx.lineTo(trimX, PLATFORM_Y);
        ctx.stroke();

        // Blue LED Strip
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.5 * pulse})`;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 16 * pulse;
        ctx.beginPath();
        ctx.moveTo(px, H * 0.07);
        ctx.lineTo(px, PLATFORM_Y * 0.95);
        ctx.stroke();

        // Glowing Top Orb
        ctx.fillStyle = `rgba(34, 211, 238, ${0.9 * pulse})`;
        ctx.beginPath();
        ctx.arc(px, H * 0.07, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    };

    // ══════════════════════════════════════════════════════════════════════
    //  2. LARGE 3D CIRCULAR PLATFORM
    // ══════════════════════════════════════════════════════════════════════
    const drawPlatform = (cx: number, cy: number, R: number, t: number, flip: boolean) => {
      const pulse = flip ? 1.65 : 1.0;
      const PERSP = 0.22;

      // Ambient Floor Bloom
      ctx.save();
      const flg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.3);
      flg.addColorStop(0, `rgba(6,182,212,${0.24 * pulse})`);
      flg.addColorStop(0.4, `rgba(245,158,11,${0.14 * pulse})`);
      flg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = flg;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 2.3, R * PERSP * 2.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Stepped Circular Tiers (Outside -> Inside, Base -> Core)
      const tiers = [
        { rx: R * 1.12, wallH: R * 0.024, topFill: '#050f22', wallCol: '#030816', rim: '#1e3a5f', rimGlow: 'rgba(30,58,95,0.65)', rimW: 1.5 },
        { rx: R * 0.96, wallH: R * 0.032, topFill: '#071634', wallCol: '#050f24', rim: '#d97706', rimGlow: `rgba(217,119,6,${0.9 * pulse})`, rimW: 2.5 },
        { rx: R * 0.80, wallH: R * 0.040, topFill: '#091c44', wallCol: '#071432', rim: '#06b6d4', rimGlow: `rgba(6,182,212,${0.95 * pulse})`, rimW: 2.8 },
        { rx: R * 0.64, wallH: R * 0.048, topFill: '#0b2052', wallCol: '#09183f', rim: '#22d3ee', rimGlow: `rgba(34,211,238,${1.0 * pulse})`, rimW: 3.0 },
        { rx: R * 0.48, wallH: R * 0.056, topFill: '#0f245a', wallCol: '#0b1a47', rim: '#f59e0b', rimGlow: `rgba(245,158,11,${1.05 * pulse})`, rimW: 3.5 },
        { rx: R * 0.32, wallH: R * 0.062, topFill: '#132766', wallCol: '#0e1e52', rim: '#fbbf24', rimGlow: `rgba(251,191,36,${1.2 * pulse})`, rimW: 3.5 },
        { rx: R * 0.18, wallH: R * 0.068, topFill: '#172b72', wallCol: '#122260', rim: '#fef08a', rimGlow: `rgba(254,240,138,${1.35 * pulse})`, rimW: 3.0 },
      ];

      let elevY = 0;
      tiers.forEach(({ rx, wallH, topFill, wallCol, rim, rimGlow, rimW }) => {
        const ry = rx * PERSP;
        const nextElevY = elevY + wallH;

        // 3D Wall
        ctx.save();
        const wg = ctx.createLinearGradient(cx - rx, cy - elevY, cx + rx, cy - elevY);
        wg.addColorStop(0, `${wallCol}dd`);
        wg.addColorStop(0.3, '#0d1f46');
        wg.addColorStop(0.5, '#1d3774');
        wg.addColorStop(0.7, '#0d1f46');
        wg.addColorStop(1, `${wallCol}dd`);
        ctx.beginPath();
        ctx.ellipse(cx, cy - elevY, rx, ry, 0, 0, Math.PI);
        ctx.lineTo(cx - rx, cy - nextElevY);
        ctx.ellipse(cx, cy - nextElevY, rx, ry, 0, Math.PI, 0, true);
        ctx.closePath();
        ctx.fillStyle = wg;
        ctx.fill();
        ctx.restore();

        // Top Surface
        ctx.save();
        const tsg = ctx.createRadialGradient(cx, cy - nextElevY, 0, cx, cy - nextElevY, rx);
        tsg.addColorStop(0, '#244686');
        tsg.addColorStop(0.6, topFill);
        tsg.addColorStop(1, '#040a18');
        ctx.beginPath();
        ctx.ellipse(cx, cy - nextElevY, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = tsg;
        ctx.fill();

        // Anisotropic Sheen
        const sg = ctx.createLinearGradient(cx - rx * 0.7, cy - nextElevY - ry * 0.5, cx + rx * 0.7, cy - nextElevY + ry * 0.5);
        sg.addColorStop(0, 'rgba(255,255,255,0)');
        sg.addColorStop(0.5, 'rgba(255,255,255,0.09)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.fill();

        // Emissive Neon Rim
        ctx.strokeStyle = rim;
        ctx.lineWidth = rimW;
        ctx.shadowColor = rimGlow;
        ctx.shadowBlur = 18 * pulse;
        ctx.stroke();
        ctx.restore();

        elevY = nextElevY;
      });

      // Rotating Gold Outer Ring Ticks (Clockwise)
      ctx.save();
      const goldRx = R * 0.96;
      const goldRy = goldRx * PERSP;
      const rotA = t * 0.22;
      ctx.strokeStyle = `rgba(251, 191, 36, ${0.7 * pulse})`;
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 32; i++) {
        const a = rotA + (i / 32) * Math.PI * 2;
        const inner = 0.86;
        const outer = 0.97;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * goldRx * inner, cy - elevY * 0.28 + Math.sin(a) * goldRy * inner);
        ctx.lineTo(cx + Math.cos(a) * goldRx * outer, cy - elevY * 0.28 + Math.sin(a) * goldRy * outer);
        ctx.stroke();
      }
      ctx.restore();

      // Traveling Light Orbit Nodes on Cyan Ring (Counter-Clockwise)
      ctx.save();
      const cyanRx = R * 0.80;
      const cyanRy = cyanRx * PERSP;
      const lightNodeA = -t * 0.65;
      for (let node = 0; node < 4; node++) {
        const a = lightNodeA + (node / 4) * Math.PI * 2;
        const nx = cx + Math.cos(a) * cyanRx;
        const ny = cy - elevY * 0.42 + Math.sin(a) * cyanRy;
        ctx.fillStyle = '#22d3ee';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 15 * pulse;
        ctx.beginPath();
        ctx.arc(nx, ny, 4.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Central Glowing Gold Energy Core
      const corePulse = 0.7 + Math.sin(t * 3.5) * 0.3;
      ctx.save();
      const ig = ctx.createRadialGradient(cx, cy - elevY, 0, cx, cy - elevY, R * 0.18);
      ig.addColorStop(0, `rgba(254,240,138,${0.9 * corePulse * pulse})`);
      ig.addColorStop(0.4, `rgba(245,158,11,${0.55 * corePulse * pulse})`);
      ig.addColorStop(1, 'rgba(245,158,11,0)');
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.ellipse(cx, cy - elevY, R * 0.18, R * PERSP * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const topSurfaceY = cy - elevY;
      return { elevY, topSurfaceY };
    };

    // ══════════════════════════════════════════════════════════════════════
    //  3. VECTOR EMBLEM DRAWING FUNCTIONS (HEADS Crown & TAILS Eagle)
    // ══════════════════════════════════════════════════════════════════════

    const drawEngravedCrown = (r: number) => {
      ctx.save();

      // Bevel Drop Shadow
      ctx.fillStyle = 'rgba(45, 12, 0, 0.78)';
      ctx.save();
      ctx.translate(2.5, 2.5);

      ctx.beginPath();
      ctx.ellipse(0, r * 0.14, r * 0.36, r * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-r * 0.36, r * 0.12);
      ctx.lineTo(-r * 0.44, -r * 0.22);
      ctx.lineTo(-r * 0.22, -r * 0.04);
      ctx.lineTo(-r * 0.12, -r * 0.34);
      ctx.lineTo(0, -r * 0.08);
      ctx.lineTo(0, -r * 0.42);
      ctx.lineTo(0, -r * 0.08);
      ctx.lineTo(r * 0.12, -r * 0.34);
      ctx.lineTo(r * 0.22, -r * 0.04);
      ctx.lineTo(r * 0.44, -r * 0.22);
      ctx.lineTo(r * 0.36, r * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Main Embossed Gold Crown Body
      const crownG = ctx.createLinearGradient(0, -r * 0.45, 0, r * 0.2);
      crownG.addColorStop(0.0, '#ffffff');
      crownG.addColorStop(0.2, '#fde68a');
      crownG.addColorStop(0.5, '#f59e0b');
      crownG.addColorStop(0.8, '#d97706');
      crownG.addColorStop(1.0, '#78350f');

      ctx.beginPath();
      ctx.moveTo(-r * 0.36, r * 0.12);
      ctx.lineTo(-r * 0.44, -r * 0.22);
      ctx.lineTo(-r * 0.22, -r * 0.04);
      ctx.lineTo(-r * 0.12, -r * 0.34);
      ctx.lineTo(0, -r * 0.08);
      ctx.lineTo(0, -r * 0.42);
      ctx.lineTo(0, -r * 0.08);
      ctx.lineTo(r * 0.12, -r * 0.34);
      ctx.lineTo(r * 0.22, -r * 0.04);
      ctx.lineTo(r * 0.44, -r * 0.22);
      ctx.lineTo(r * 0.36, r * 0.12);
      ctx.closePath();
      ctx.fillStyle = crownG;
      ctx.shadowColor = 'rgba(251,191,36,0.85)';
      ctx.shadowBlur = 14;
      ctx.fill();

      // Base Band
      ctx.beginPath();
      ctx.ellipse(0, r * 0.14, r * 0.36, r * 0.07, 0, 0, Math.PI * 2);
      ctx.fillStyle = crownG;
      ctx.fill();

      // Crown Jewels
      ctx.fillStyle = '#ffffff';
      [-r * 0.44, -r * 0.12, 0, r * 0.12, r * 0.44].forEach((jx, idx) => {
        const jy = idx === 2 ? -r * 0.42 : idx === 1 || idx === 3 ? -r * 0.34 : -r * 0.22;
        ctx.beginPath();
        ctx.arc(jx, jy, r * 0.045, 0, Math.PI * 2);
        ctx.fill();
      });

      // Base Band Gem Accents
      ctx.fillStyle = '#b45309';
      [-r * 0.22, 0, r * 0.22].forEach((gx) => {
        ctx.beginPath();
        ctx.arc(gx, r * 0.14, r * 0.035, 0, Math.PI * 2);
        ctx.fill();
      });

      // Specular Edge Stroke
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = Math.max(1, r * 0.02);
      ctx.stroke();
      ctx.restore();
    };

    const drawEngravedEagle = (r: number) => {
      ctx.save();

      // Bevel Drop Shadow
      ctx.fillStyle = 'rgba(4, 10, 25, 0.78)';
      ctx.save();
      ctx.translate(2.5, 2.5);

      ctx.beginPath();
      ctx.moveTo(-r * 0.06, -r * 0.42);
      ctx.lineTo(r * 0.08, -r * 0.38);
      ctx.lineTo(r * 0.02, -r * 0.32);
      ctx.lineTo(r * 0.24, -r * 0.28);
      ctx.lineTo(r * 0.48, -r * 0.18);
      ctx.lineTo(r * 0.36, -r * 0.04);
      ctx.lineTo(r * 0.22, 0);
      ctx.lineTo(r * 0.12, r * 0.22);
      ctx.lineTo(0, r * 0.28);
      ctx.lineTo(-r * 0.12, r * 0.22);
      ctx.lineTo(-r * 0.22, 0);
      ctx.lineTo(-r * 0.36, -r * 0.04);
      ctx.lineTo(-r * 0.48, -r * 0.18);
      ctx.lineTo(-r * 0.24, -r * 0.28);
      ctx.lineTo(-r * 0.02, -r * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Metallic Platinum Silver Gradient
      const eagleG = ctx.createLinearGradient(0, -r * 0.45, 0, r * 0.3);
      eagleG.addColorStop(0.0, '#ffffff');
      eagleG.addColorStop(0.25, '#e2e8f0');
      eagleG.addColorStop(0.55, '#94a3b8');
      eagleG.addColorStop(0.85, '#475569');
      eagleG.addColorStop(1.0, '#1e293b');

      ctx.beginPath();
      ctx.moveTo(-r * 0.06, -r * 0.42);
      ctx.lineTo(r * 0.08, -r * 0.38);
      ctx.lineTo(r * 0.02, -r * 0.32);
      ctx.lineTo(r * 0.24, -r * 0.28);
      ctx.lineTo(r * 0.48, -r * 0.18);
      ctx.lineTo(r * 0.36, -r * 0.04);
      ctx.lineTo(r * 0.22, 0);
      ctx.lineTo(r * 0.12, r * 0.22);
      ctx.lineTo(0, r * 0.28);
      ctx.lineTo(-r * 0.12, r * 0.22);
      ctx.lineTo(-r * 0.22, 0);
      ctx.lineTo(-r * 0.36, -r * 0.04);
      ctx.lineTo(-r * 0.48, -r * 0.18);
      ctx.lineTo(-r * 0.24, -r * 0.28);
      ctx.lineTo(-r * 0.02, -r * 0.32);
      ctx.closePath();

      ctx.fillStyle = eagleG;
      ctx.shadowColor = 'rgba(226, 232, 240, 0.75)';
      ctx.shadowBlur = 12;
      ctx.fill();

      // Chest Shield
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.12);
      ctx.lineTo(r * 0.1, -r * 0.04);
      ctx.lineTo(r * 0.08, r * 0.10);
      ctx.lineTo(0, r * 0.16);
      ctx.lineTo(-r * 0.08, r * 0.10);
      ctx.lineTo(-r * 0.1, -r * 0.04);
      ctx.closePath();
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = Math.max(1, r * 0.015);
      ctx.stroke();

      // Specular Edge Stroke
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = Math.max(1, r * 0.018);
      ctx.stroke();

      ctx.restore();
    };

    // ══════════════════════════════════════════════════════════════════════
    //  4. PHOTOREALISTIC 3D GOLD COIN RENDERER
    // ══════════════════════════════════════════════════════════════════════
    const drawCoin = (
      cx: number,
      cy: number,
      radius: number,
      thickness: number,
      sY: number,
      sX: number,
      sc: number,
      topSurfaceY: number
    ) => {
      const cosY = Math.cos(sY);
      const absCosY = Math.abs(cosY);
      const isHeads = cosY >= 0;
      const sinX = Math.sin(sX);
      const cosX = Math.cos(sX);
      const PERSP = 0.22;

      const rx = radius * sc * absCosY;
      const ry = radius * sc * sinX;
      const edgeH = thickness * sc * Math.abs(cosX);

      // Contact Reflection on Platform Surface
      {
        ctx.save();
        const refG = ctx.createRadialGradient(cx, topSurfaceY, 0, cx, topSurfaceY, rx * 1.15);
        refG.addColorStop(0, isHeads ? 'rgba(254,240,138,0.45)' : 'rgba(226,232,240,0.4)');
        refG.addColorStop(0.5, isHeads ? 'rgba(245,158,11,0.22)' : 'rgba(148,163,184,0.18)');
        refG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = refG;
        ctx.beginPath();
        ctx.ellipse(cx, topSurfaceY, rx * 1.15, rx * PERSP * 1.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Realistic Contact Shadow directly beneath bottom edge
      {
        const shadowY = Math.max(cy + ry * 0.85 + edgeH * 0.5, topSurfaceY + 2);
        const shg = ctx.createRadialGradient(cx, shadowY, 0, cx, shadowY, rx * 1.05);
        shg.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        shg.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
        shg.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.save();
        ctx.fillStyle = shg;
        ctx.beginPath();
        ctx.ellipse(cx, shadowY, rx * 1.05, ry * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3D Cylinder Edge Wall with Reeding Grooves
      if (edgeH > 0.4 && rx > 0.5) {
        const wg = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy);
        if (isHeads) {
          wg.addColorStop(0.0, '#2a0c00');
          wg.addColorStop(0.2, '#b45309');
          wg.addColorStop(0.5, '#fef3c7');
          wg.addColorStop(0.8, '#b45309');
          wg.addColorStop(1.0, '#2a0c00');
        } else {
          wg.addColorStop(0.0, '#040914');
          wg.addColorStop(0.2, '#475569');
          wg.addColorStop(0.5, '#f8fafc');
          wg.addColorStop(0.8, '#475569');
          wg.addColorStop(1.0, '#040914');
        }

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
        ctx.lineTo(cx - rx, cy + edgeH);
        ctx.ellipse(cx, cy + edgeH, rx, ry, 0, Math.PI, 0, true);
        ctx.closePath();
        ctx.fillStyle = wg;
        ctx.shadowColor = isHeads ? '#f59e0b' : '#94a3b8';
        ctx.shadowBlur = 18;
        ctx.fill();

        // Vertical Reeding Grooves
        ctx.strokeStyle = isHeads ? 'rgba(40,15,2,0.55)' : 'rgba(6,10,24,0.55)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i <= 34; i++) {
          const a = Math.PI * (i / 34);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
          ctx.lineTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry + edgeH);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (rx < 0.5 || ry < 0.5) return;

      // Main Coin Disc Face — PBR Metallic Multi-stop Gradient
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

      const mg = ctx.createLinearGradient(cx - rx * 0.75, cy - ry * 0.75, cx + rx * 0.75, cy + ry * 0.75);
      if (isHeads) {
        mg.addColorStop(0.0, '#1c0a00');
        mg.addColorStop(0.12, '#78350f');
        mg.addColorStop(0.28, '#f59e0b');
        mg.addColorStop(0.44, '#fde68a');
        mg.addColorStop(0.5, '#fffbeb');
        mg.addColorStop(0.56, '#fde68a');
        mg.addColorStop(0.72, '#d97706');
        mg.addColorStop(0.88, '#78350f');
        mg.addColorStop(1.0, '#1c0a00');
      } else {
        mg.addColorStop(0.0, '#040816');
        mg.addColorStop(0.12, '#1e293b');
        mg.addColorStop(0.28, '#64748b');
        mg.addColorStop(0.44, '#e2e8f0');
        mg.addColorStop(0.5, '#ffffff');
        mg.addColorStop(0.56, '#e2e8f0');
        mg.addColorStop(0.72, '#64748b');
        mg.addColorStop(0.88, '#1e293b');
        mg.addColorStop(1.0, '#02040a');
      }
      ctx.fillStyle = mg;
      ctx.shadowColor = isHeads ? 'rgba(251,191,36,0.85)' : 'rgba(148,163,184,0.75)';
      ctx.shadowBlur = 38;
      ctx.fill();

      // Outer Beveled Rim Stroke
      ctx.strokeStyle = isHeads ? '#fef08a' : '#f8fafc';
      ctx.lineWidth = Math.max(2, 6 * sc * absCosY * sinX);
      ctx.stroke();

      // Inner Recessed Ring Groove
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.86, ry * 0.86, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isHeads ? 'rgba(50,18,2,0.65)' : 'rgba(6,12,30,0.65)';
      ctx.lineWidth = Math.max(1.2, 2.5 * sc);
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();

      // Radial Engraved Star Dots around rim
      if (absCosY > 0.08 && sinX > 0.1) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(absCosY * sc, sinX * sc);
        ctx.fillStyle = isHeads ? 'rgba(254,240,138,0.72)' : 'rgba(226,232,240,0.72)';
        for (let i = 0; i < 36; i++) {
          const a = (i / 36) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * radius * 0.915, Math.sin(a) * radius * 0.915, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Engraved Vector Emblem (Crown or Eagle)
      if (absCosY > 0.06 && sinX > 0.08) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(absCosY * sc, sinX * sc);

        const r = radius * 0.72;
        if (isHeads) {
          drawEngravedCrown(r);

          const tf = radius * 0.195;
          ctx.font = `900 ${tf}px 'Arial Black', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          ctx.fillStyle = 'rgba(50, 15, 0, 0.78)';
          ctx.fillText('HEADS', 2, radius * 0.56 + 2);
          ctx.fillStyle = '#fffbeb';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 8;
          ctx.fillText('HEADS', 0, radius * 0.56);

          const sf = radius * 0.082;
          ctx.font = `bold ${sf}px sans-serif`;
          ctx.fillStyle = 'rgba(180, 83, 9, 0.85)';
          ctx.fillText('★ RIVEXA GOLD ★', 0, radius * 0.73);
        } else {
          drawEngravedEagle(r);

          const tf = radius * 0.195;
          ctx.font = `900 ${tf}px 'Arial Black', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          ctx.fillStyle = 'rgba(4, 10, 25, 0.78)';
          ctx.fillText('TAILS', 2, radius * 0.56 + 2);
          ctx.fillStyle = '#f8fafc';
          ctx.shadowColor = '#cbd5e1';
          ctx.shadowBlur = 8;
          ctx.fillText('TAILS', 0, radius * 0.56);

          const sf = radius * 0.082;
          ctx.font = `bold ${sf}px sans-serif`;
          ctx.fillStyle = 'rgba(100, 116, 139, 0.85)';
          ctx.fillText('★ RIVEXA SILVER ★', 0, radius * 0.73);
        }
        ctx.restore();
      }

      // Lens Flare Specular Highlight
      if (absCosY > 0.18 && sinX > 0.18) {
        ctx.save();
        const hg = ctx.createRadialGradient(cx - rx * 0.28, cy - ry * 0.28, 0, cx - rx * 0.28, cy - ry * 0.28, rx * 0.55);
        hg.addColorStop(0, 'rgba(255,255,255,0.48)');
        hg.addColorStop(0.5, 'rgba(255,255,255,0.09)');
        hg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Outer Glow Halo
      if (absCosY > 0.12 && sinX > 0.12) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx + 5, ry + 3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = isHeads ? `rgba(251,191,36,${0.35 * absCosY})` : `rgba(148,163,184,${0.3 * absCosY})`;
        ctx.lineWidth = 10;
        ctx.shadowColor = isHeads ? '#f59e0b' : '#94a3b8';
        ctx.shadowBlur = 28;
        ctx.stroke();
        ctx.restore();
      }
    };

    // ══════════════════════════════════════════════════════════════════════
    //  5. MAIN RENDER LOOP & TIMELINE STATE MACHINE
    // ══════════════════════════════════════════════════════════════════════
    const render = (now: number) => {
      const W = canvas.width;
      const H = canvas.height;
      const CX = W / 2; // SINGLE COMMON CENTER REFERENCE FOR ALL LAYERS!
      const PLATFORM_Y = H * 0.72; // Platform center at 72% height
      const PEAK_Y = H * 0.22; // Exact peak point aligned with top ceiling mechanical circle

      const CR = Math.min(W * 0.28, H * 0.23);
      const CT = CR * 0.15;
      const PR = Math.min(W * 0.43, H * 0.44);
      const t = now * 0.001;

      // Phase Initialisation & Triggers
      if (isFlipping && phase === 'IDLE') {
        phase = 'WIND_UP';
        flipStart = now;
        hasCalledCompleteRef.current = false;
        resultSideChoice = resultSide || chosenSide;
        targetSpinY = Math.PI * 24 + (resultSideChoice === 'HEADS' ? 0 : Math.PI);
        setHudStatus('FLIPPING...');
      }
      if (!isFlipping && phase !== 'IDLE' && phase !== 'REVEAL') {
        phase = 'IDLE';
        setHudStatus('READY');
      }
      if (phase !== 'IDLE') phaseT = (now - flipStart) / 1000;

      // Calculate platform elevation & surface coordinate first
      const { topSurfaceY } = drawPlatform(CX, PLATFORM_Y, PR, t, isFlipping);
      const totalRiseDistance = topSurfaceY - PEAK_Y;

      // ── Timeline State Machine ─────────────────────────────────────────────
      if (phase === 'IDLE') {
        setHudStatus('READY');
        const bob = Math.sin(t * 1.5) * 3;
        coinOffY = -bob;
        spinY = (t * 0.35) % (Math.PI * 2);
        spinX = 1.38 + Math.sin(t * 0.7) * 0.03;
        scale = 1.0;

        if (Math.random() < 0.02) burst(CX, PLATFORM_Y, 1, false);
      }
      // PHASE 1 — LOCK / ENERGY CHARGE (0.00s - 0.25s)
      else if (phase === 'WIND_UP') {
        setHudStatus('FLIPPING...');
        const p = Math.min(phaseT / 0.25, 1);
        coinOffY = p * 5; // Crouch down onto platform
        spinX = 1.38 + p * 0.08;
        scale = 1.0 - p * 0.02;

        if (p >= 1) phase = 'LAUNCH';
      }
      // PHASE 2 — LAUNCH (0.25s - 0.65s): Smooth rise to peak point at top circle
      else if (phase === 'LAUNCH') {
        setHudStatus('FLIPPING...');
        const p = Math.min((phaseT - 0.25) / 0.40, 1);
        const ease = Math.sin(p * Math.PI * 0.5);
        coinOffY = -ease * totalRiseDistance; // Rises straight to top peak point
        spinX = 1.46 - p * 0.95;
        scale = 1.0 + ease * 0.12; // Scales up naturally as it reaches top peak
        spinY = p * Math.PI * 5;

        if (p < 0.4 && Math.random() < 0.5) burst(CX, PLATFORM_Y - 10, 6, true);
        if (p >= 1) phase = 'FAST_SPIN';
      }
      // PHASE 3 — FAST ROTATION AT PEAK (0.65s - 1.75s)
      else if (phase === 'FAST_SPIN') {
        setHudStatus('FLIPPING...');
        const p = Math.min((phaseT - 0.65) / 1.10, 1);
        const arc = Math.sin(p * Math.PI);
        // Holds at top PEAK_Y with small vertical arc pulse
        coinOffY = -totalRiseDistance - arc * (H * 0.04);
        spinX = 0.51 + arc * 0.1;
        scale = 1.12;

        const flipEase = Math.pow(p, 0.88);
        spinY = Math.PI * 5 + flipEase * (targetSpinY - Math.PI * 5);

        if (Math.random() < 0.22) burst(CX + (Math.random() - 0.5) * 50, PEAK_Y, 2, false);
        if (p >= 1) phase = 'SLOW_FALL';
      }
      // PHASE 4 — SLOW MOTION AT PEAK (1.75s - 2.30s): Decelerates at peak facing camera
      else if (phase === 'SLOW_FALL') {
        setHudStatus('RESULT NEAR');
        const p = Math.min((phaseT - 1.75) / 0.55, 1);
        const ease = p * p * (3 - 2 * p);
        // Descends smoothly from top PEAK_Y back to platform top surface
        coinOffY = -totalRiseDistance * (1 - ease);
        spinX = 0.61 + ease * 0.77;
        scale = 1.12 - ease * 0.12;
        spinY = targetSpinY - (1 - ease) * Math.PI * 0.8;

        if (p >= 1) phase = 'IMPACT';
      }
      // PHASE 5 — LAND & BOUNCE (2.30s - 2.70s)
      else if (phase === 'IMPACT') {
        setHudStatus('LANDING');
        const p = Math.min((phaseT - 2.30) / 0.40, 1);
        const bounce = Math.sin(p * Math.PI * 3.5) * (1 - p) * CR * 0.08;
        coinOffY = -bounce;
        spinY = targetSpinY;
        spinX = 1.38 + Math.sin(p * Math.PI * 2.5) * (1 - p) * 0.07;
        scale = 1.0;

        if (p < 0.12) {
          const impactColor = resultSideChoice === 'HEADS' ? '#fbbf24' : '#38bdf8';
          burst(CX, topSurfaceY, 28, true, impactColor);
        }
        if (p >= 1) phase = 'REVEAL';
      }
      // PHASE 6 — RESULT STATE (2.70s - 3.30s)
      else if (phase === 'REVEAL') {
        setHudStatus('RESULT');
        const p = Math.min((phaseT - 2.70) / 0.60, 1);
        coinOffY = Math.sin(p * Math.PI * 2) * 1.5;
        spinY = targetSpinY;
        spinX = 1.38;
        scale = 1.04;

        if (p < 0.25 && Math.random() < 0.4) {
          const burstColor = resultSideChoice === 'HEADS' ? '#fbbf24' : '#38bdf8';
          burst(CX + (Math.random() - 0.5) * CR, topSurfaceY - CR * 0.4, 8, true, burstColor);
        }

        if (p >= 1) {
          phase = 'IDLE';
          spinY = targetSpinY % (Math.PI * 2);
          setHudStatus('READY');
          if (onAnimationComplete && !hasCalledCompleteRef.current) {
            hasCalledCompleteRef.current = true;
            onAnimationComplete();
          }
        }
      }

      // ── DRAWING SEQUENCE ──────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);

      // 1. Arena Background Environment
      drawEnvironment(W, H, CX, PLATFORM_Y, PR, t);

      // 2. Futuristic Multi-Layered Platform (Redrawn cleanly behind particles/coin)
      drawPlatform(CX, PLATFORM_Y, PR, t, isFlipping);

      // 3. Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life++;
        const a = Math.max(0, (1 - p.life / p.maxLife) * p.alpha);
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 4. Exact Coin Center Y (Moving from front platform to top PEAK_Y and back)
      const ry = CR * scale * Math.sin(spinX);
      const edgeH = CT * scale * Math.abs(Math.cos(spinX));
      const restingCoinCY = topSurfaceY - (ry * 0.88 + edgeH * 0.5);
      const coinCY = restingCoinCY + coinOffY;

      // 5. Draw Photorealistic 3D Gold Coin
      drawCoin(CX, coinCY, CR, CT, spinY, spinX, scale, topSurfaceY);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isFlipping, resultSide, chosenSide, isWin, payoutAmount, betAmount]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden game-arena ${className}`}>
      {/* 3D Photorealistic Canvas Arena */}
      <canvas ref={canvasRef} className="relative w-full h-full block z-10" />

      {/* Glass HUD Status Badge at Top Left */}
      <div className="absolute top-3 left-4 bg-[#040918]/85 border border-[#16274a] px-3.5 py-1 rounded-full text-[10px] font-extrabold text-slate-300 tracking-widest uppercase backdrop-blur-md pointer-events-none z-20 shadow-lg flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${hudStatus === 'FLIPPING...' ? 'bg-amber-400 animate-ping' : hudStatus === 'RESULT' ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}`} />
        <span className="text-slate-400">STATUS:</span>
        <span className="text-amber-400 font-black">{hudStatus}</span>
      </div>
    </div>
  );
};
