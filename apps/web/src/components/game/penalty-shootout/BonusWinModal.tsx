'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

interface BonusWinModalProps {
  isOpen: boolean;
  onClose: () => void;
  payout: number;
  multiplier: number;
}

export function BonusWinModal({
  isOpen,
  onClose,
  payout,
  multiplier,
}: BonusWinModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-pointer select-none overflow-hidden"
      >
        {/* Background Sunburst Rays */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
          <div className="w-[800px] h-[800px] rounded-full bg-gradient-radial from-amber-400 via-yellow-600/20 to-transparent animate-spin-slow" />
        </div>

        {/* Floating Confetti Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                y: -20,
                x: `${Math.random() * 100}%`,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: 1000,
                rotate: 720,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 2.5 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: 'linear',
              }}
              className="absolute w-3 h-2 rounded-sm"
              style={{
                backgroundColor: ['#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#eab308'][i % 5],
              }}
            />
          ))}
        </div>

        {/* 3D Golden Trophy Artwork */}
        <motion.div
          initial={{ scale: 0.5, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 120 }}
          className="relative z-10 w-64 h-64 sm:w-72 sm:h-72 mb-2 flex items-center justify-center"
        >
          <Image
            src="/assets/penalty-nations-cup/item_hand.png"
            alt="Golden Glove Trophy"
            fill
            className="object-contain drop-shadow-[0_8px_32px_rgba(251,191,36,0.8)]"
            priority
          />
        </motion.div>

        {/* Title: BONUS WIN in metallic typography */}
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 text-4xl sm:text-5xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-600 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] mb-3"
        >
          BONUS WIN
        </motion.h2>

        {/* Cash Payout Banner */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="relative z-10 px-8 py-3 rounded-2xl bg-black/60 border border-amber-400/50 shadow-[0_0_30px_rgba(245,158,11,0.5)] flex flex-col items-center mb-6"
        >
          <span className="text-3xl sm:text-4xl font-black text-amber-300 tracking-wider">
            $ {payout.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-xs font-black text-emerald-400 uppercase tracking-widest mt-1">
            {multiplier.toFixed(2)}X BET
          </span>
        </motion.div>

        {/* Press anywhere prompt matching video */}
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="relative z-10 text-[11px] font-black uppercase tracking-widest text-gray-300"
        >
          PRESS ANYWHERE TO CONTINUE
        </motion.span>
      </div>
    </AnimatePresence>
  );
}
