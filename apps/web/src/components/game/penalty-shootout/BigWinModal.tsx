'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

export type WinType = 'big' | 'mega' | 'epic' | 'legendary';

interface BigWinModalProps {
  isOpen: boolean;
  onClose: () => void;
  winType: WinType;
  multiplier: number;
  payout: number;
}

const WIN_CONFIG: Record<
  WinType,
  {
    bg: string;
    titleImg: string;
    itemImg: string;
    titleWidth: number;
    titleHeight: number;
    itemWidth: number;
    itemHeight: number;
  }
> = {
  big: {
    bg: '/assets/penalty-nations-cup/bg_big_win.png',
    titleImg: '/assets/penalty-nations-cup/img_bigwin.png',
    itemImg: '/assets/penalty-nations-cup/img_item_ball.png',
    titleWidth: 380,
    titleHeight: 135,
    itemWidth: 280,
    itemHeight: 360,
  },
  mega: {
    bg: '/assets/penalty-nations-cup/bg_mega_win.png',
    titleImg: '/assets/penalty-nations-cup/img_megawin.png',
    itemImg: '/assets/penalty-nations-cup/img_item_boot.png',
    titleWidth: 420,
    titleHeight: 125,
    itemWidth: 280,
    itemHeight: 350,
  },
  epic: {
    bg: '/assets/penalty-nations-cup/bg_epic_win.png',
    titleImg: '/assets/penalty-nations-cup/img_epicwin.png',
    itemImg: '/assets/penalty-nations-cup/img_item_cup.png',
    titleWidth: 400,
    titleHeight: 130,
    itemWidth: 280,
    itemHeight: 400,
  },
  legendary: {
    bg: '/assets/penalty-nations-cup/bg_legendary_win.png',
    titleImg: '/assets/penalty-nations-cup/img_legendarywin.png',
    itemImg: '/assets/penalty-nations-cup/img_item_5cup.png',
    titleWidth: 460,
    titleHeight: 180,
    itemWidth: 340,
    itemHeight: 410,
  },
};

const CONFETTI_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export function BigWinModal({
  isOpen,
  onClose,
  winType,
  multiplier,
  payout,
}: BigWinModalProps) {
  const config = WIN_CONFIG[winType] || WIN_CONFIG.big;

  const confettiPieces = useMemo(() => {
    return Array.from({ length: 42 }).map((_, i) => ({
      id: i,
      left: `${(i * 2.4 + Math.sin(i * 99) * 10 + 5) % 96}%`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      width: 10 + (i % 4) * 4,
      height: 6 + (i % 3) * 3,
      delay: (i % 12) * 0.18,
      duration: 2.2 + (i % 5) * 0.4,
      rotation: (i * 47) % 360,
    }));
  }, []);

  if (!isOpen) return null;

  // Format payout: e.g. "$551.71" or "$10 064"
  const formattedPayout =
    payout >= 10000
      ? Math.round(payout).toLocaleString('en-US').replace(/,/g, ' ')
      : payout.toFixed(2);

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex flex-col items-center justify-between cursor-pointer select-none overflow-hidden"
      >
        {/* Fullscreen Stadium Backdrop (Fixed, Cover) */}
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src={config.bg}
            alt="Stadium Win Background"
            fill
            priority
            className="object-cover object-center"
          />
          {/* Subtle dark gradient overlay to guarantee readability */}
          <div className="absolute inset-0 bg-black/25" />
        </div>

        {/* Confetti Fluttering Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiPieces.map((c) => (
            <motion.div
              key={c.id}
              initial={{
                top: '-5%',
                x: 0,
                rotateX: 0,
                rotateY: 0,
                rotateZ: c.rotation,
                opacity: 0.9,
              }}
              animate={{
                top: '105%',
                x: [0, (c.id % 2 === 0 ? 30 : -30), 0],
                rotateX: [0, 360, 720],
                rotateY: [0, 180, 360],
                rotateZ: [c.rotation, c.rotation + 360],
                opacity: [0.9, 1, 0.4],
              }}
              transition={{
                duration: c.duration,
                repeat: Infinity,
                delay: c.delay,
                ease: 'linear',
              }}
              className="absolute rounded-xs shadow-sm"
              style={{
                left: c.left,
                width: `${c.width}px`,
                height: `${c.height}px`,
                backgroundColor: c.color,
              }}
            />
          ))}
        </div>

        {/* ── TOP SECTION: 3D WIN TITLE BANNER ── */}
        <div className="relative z-20 w-full flex justify-center pt-8 sm:pt-12 shrink-0">
          <motion.div
            initial={{ scale: 0.35, y: -40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 140 }}
            className="relative flex items-center justify-center filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.8)]"
            style={{ width: `${config.titleWidth}px`, height: `${config.titleHeight}px` }}
          >
            <Image
              src={config.titleImg}
              alt="Win Title"
              fill
              priority
              className="object-contain"
            />
          </motion.div>
        </div>

        {/* ── CENTER SECTION: TROPHY PEDESTAL & CASH BADGE ── */}
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center w-full px-4 -mt-2">
          {/* Trophy Table Item */}
          <motion.div
            initial={{ scale: 0.6, y: 60, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 16, stiffness: 120, delay: 0.15 }}
            className="relative flex items-center justify-center drop-shadow-[0_12px_36px_rgba(0,0,0,0.7)]"
            style={{ width: `${config.itemWidth}px`, height: `${config.itemHeight}px` }}
          >
            <Image
              src={config.itemImg}
              alt="Win Trophy Item"
              fill
              priority
              className="object-contain object-bottom"
            />

            {/* Overlapping Cash & Multiplier Badges attached directly to table front */}
            <div className="absolute -bottom-4 sm:-bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center w-full max-w-[320px]">
              {/* Cash Plate */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="relative w-64 sm:w-72 h-14 sm:h-16 flex items-center justify-center drop-shadow-xl"
              >
                <Image
                  src="/assets/penalty-nations-cup/bg_win_cash.png"
                  alt="Cash Plate"
                  fill
                  priority
                  className="object-contain"
                />
                <span className="relative z-10 text-2xl sm:text-3xl font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  ${formattedPayout}
                </span>
              </motion.div>

              {/* Multiplier x BET Badge */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.42, type: 'spring' }}
                className="relative w-40 sm:w-44 h-8 sm:h-9 flex items-center justify-center -mt-1 drop-shadow-lg"
              >
                <Image
                  src="/assets/penalty-nations-cup/bg_win_xbet.png"
                  alt="Multiplier Plate"
                  fill
                  priority
                  className="object-contain"
                />
                <span className="relative z-10 text-xs sm:text-sm font-black text-[#facc15] tracking-widest drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                  {multiplier.toFixed(2)} x BET
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* ── BOTTOM PROMPT: PRESS ANYWAY TO CONTINUE ── */}
        <div className="relative z-20 pb-5 sm:pb-8 pt-4 shrink-0 text-center">
          <motion.p
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="text-[11px] sm:text-xs font-black uppercase tracking-[0.25em] text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
          >
            PRESS ANYWAY TO CONTINUE
          </motion.p>
        </div>
      </div>
    </AnimatePresence>
  );
}
