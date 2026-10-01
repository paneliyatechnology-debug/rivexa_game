'use client';

import React, { useEffect, useRef } from 'react';
import { ResultModalData } from './types';

interface ResultModalProps {
  data: ResultModalData | null;
  onClose: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({ data, onClose }) => {
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Confetti Particle System for Win Popup Celebration
  useEffect(() => {
    if (!data || !data.isWin || !data.isOpen) return;

    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    const height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      vRot: number;
    }> = Array.from({ length: 70 }, () => ({
      x: width / 2,
      y: height / 2 - 40,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 8 + 4,
      color: ['#ffd700', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#f59e0b'][
        Math.floor(Math.random() * 6)
      ],
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 0.25,
    }));

    const renderConfetti = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.rotation += p.vRot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      animId = requestAnimationFrame(renderConfetti);
    };

    renderConfetti();

    return () => cancelAnimationFrame(animId);
  }, [data]);

  if (!data || !data.isOpen) return null;

  let avatarSrc = '';
  if (data.sector.animal === 'lion') avatarSrc = '/images/lion_avatar.png';
  else if (data.sector.animal === 'elephant') avatarSrc = '/images/elephant_avatar.png';
  else if (data.sector.animal === 'bull') avatarSrc = '/images/bull_avatar.png';

  const animalIcon =
    data.sector.animal === 'lion'
      ? '🦁'
      : data.sector.animal === 'elephant'
      ? '🐘'
      : data.sector.animal === 'bull'
      ? '🐂'
      : '👑';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div
        className={`relative max-w-sm w-full bg-gradient-to-b from-[#0d1728] to-[#070d18] border-2 ${
          data.isWin
            ? 'border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.6)]'
            : 'border-rose-500/60 shadow-[0_0_35px_rgba(244,63,94,0.3)]'
        } rounded-3xl p-6 text-center space-y-4 overflow-hidden z-10`}
      >
        {/* Confetti Background Canvas for Winner */}
        {data.isWin && (
          <canvas
            ref={confettiCanvasRef}
            className="absolute inset-0 pointer-events-none w-full h-full z-0"
          />
        )}

        <div className="relative z-10 space-y-3">
          {/* HD Avatar Graphic Header */}
          <div className="w-24 h-24 mx-auto relative rounded-3xl p-1 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-2xl">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={data.sector.animal}
                className="w-full h-full rounded-2xl object-cover shadow-inner"
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-amber-500 flex items-center justify-center text-4xl shadow-inner">
                {animalIcon}
              </div>
            )}
          </div>

          <h2
            className={`text-xl sm:text-2xl font-black uppercase tracking-wider ${
              data.isWin ? 'text-amber-400 drop-shadow-md' : 'text-slate-300'
            }`}
          >
            {data.isWin ? '🎉 LUCKY WINNER! 🎉' : 'SPIN RESULT'}
          </h2>

          {/* Landed Sector Details Badge */}
          <div className="bg-[#15243b] border border-[#273d61] rounded-2xl p-3 inline-block w-full">
            <span className="text-[10px] font-mono text-slate-400 block uppercase mb-1">
              LANDED ON SECTOR #{data.sector.label}
            </span>
            <span className="text-base font-black uppercase text-amber-300 block">
              {data.sector.color} ({data.sector.animal.toUpperCase()}) — {data.sector.multiplier}x
            </span>
          </div>

          {/* My Bet vs Outcome breakdown */}
          <div className="text-xs font-mono text-slate-300 bg-[#0b1424] p-2.5 rounded-xl flex items-center justify-between border border-[#1c2d4a]">
            <span>
              MY BET: <strong className="text-amber-400">{data.betOption}</strong>
            </span>
            <span>
              STAKE: <strong className="text-white">₹{data.betAmount}</strong>
            </span>
          </div>

          {/* Payout Display */}
          {data.isWin ? (
            <div className="space-y-1 bg-emerald-950/90 border border-emerald-500/70 rounded-2xl p-3 shadow-lg">
              <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase block">
                TOTAL WIN PAYOUT
              </span>
              <div className="text-3xl font-black font-mono text-emerald-400 drop-shadow-md">
                +₹{data.payout.toFixed(2)}
              </div>
              <span className="text-[11px] font-mono text-emerald-300 block">
                Net Profit: +₹{(data.payout - data.betAmount).toFixed(2)}
              </span>
            </div>
          ) : (
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs text-slate-400 font-mono">
              Landed on #{data.sector.label} ({data.sector.animal.toUpperCase()}). Better luck next round!
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 cursor-pointer uppercase font-mono ${
              data.isWin
                ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-110'
                : 'bg-[#1e2d4a] hover:bg-[#2c436b] text-white'
            }`}
          >
            {data.isWin ? 'CLAIM WINNINGS & SPIN AGAIN' : 'CONTINUE'}
          </button>
        </div>
      </div>
    </div>
  );
};
