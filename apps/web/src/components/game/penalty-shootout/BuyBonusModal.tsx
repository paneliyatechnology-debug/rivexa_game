'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';

interface BuyBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  betAmount: number;
  onActivateBonus: (tier: 'EASY' | 'MEDIUM' | 'HARD', shotsCount: number) => void;
}

const BONUS_TIERS = [
  {
    id: 'EASY' as const,
    name: 'EASY',
    maxWin: '100.64x',
    costMultiplier: 30,
    avatar: '/assets/penalty-nations-cup/player_easy.png',
    cardBorder: 'from-amber-700/60 via-amber-600/40 to-amber-900/60',
    headerBg: 'bg-amber-800/80',
    btnBg: 'bg-gradient-to-b from-[#c29b38] to-[#8c6b1d]',
  },
  {
    id: 'MEDIUM' as const,
    name: 'MEDIUM',
    maxWin: '1812.54x',
    costMultiplier: 60,
    avatar: '/assets/penalty-nations-cup/player_medium.png',
    cardBorder: 'from-slate-300/80 via-slate-400/50 to-slate-600/80',
    headerBg: 'bg-slate-700/80',
    btnBg: 'bg-gradient-to-b from-[#e2e8f0] to-[#94a3b8]',
    popular: true,
  },
  {
    id: 'HARD' as const,
    name: 'HARD',
    maxWin: '6298.56x',
    costMultiplier: 100,
    avatar: '/assets/penalty-nations-cup/player_hard.png',
    cardBorder: 'from-yellow-400/90 via-amber-300/60 to-yellow-600/90',
    headerBg: 'bg-amber-600/90',
    btnBg: 'bg-gradient-to-b from-[#fde047] to-[#ca8a04]',
  },
];

export function BuyBonusModal({
  isOpen,
  onClose,
  currentBalance,
  betAmount,
  onActivateBonus,
}: BuyBonusModalProps) {
  const [selectedStake, setSelectedStake] = useState<number>(betAmount || 100);
  const [stage, setStage] = useState<'SELECT' | 'ROULETTE'>('SELECT');
  const [selectedTier, setSelectedTier] = useState<'EASY' | 'MEDIUM' | 'HARD'>('HARD');
  const [rouletteAngle, setRouletteAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [awardedShots, setAwardedShots] = useState<number | null>(null);

  // Sync initial stake
  useEffect(() => {
    if (betAmount) setSelectedStake(betAmount);
  }, [betAmount]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStage('SELECT');
      setIsSpinning(false);
      setAwardedShots(null);
      setRouletteAngle(0);
    }
  }, [isOpen]);

  const handleSelectPackage = (tier: 'EASY' | 'MEDIUM' | 'HARD') => {
    const pkg = BONUS_TIERS.find((t) => t.id === tier)!;
    const totalCost = selectedStake * pkg.costMultiplier;
    if (currentBalance < totalCost) {
      alert(`Insufficient balance. Requires $${totalCost.toLocaleString()}`);
      return;
    }

    setSelectedTier(tier);
    setStage('ROULETTE');
    startRouletteSpin(tier);
  };

  const startRouletteSpin = (tier: 'EASY' | 'MEDIUM' | 'HARD') => {
    setIsSpinning(true);
    // Possible shots: 6, 7, 8, 9, 10
    const shotsList = [6, 7, 8, 9, 10];
    const pickedShots = shotsList[Math.floor(Math.random() * shotsList.length)];
    // Wheel wedges index (5 slices of 72 degrees each)
    const wedgeIndex = shotsList.indexOf(pickedShots);
    const targetDeg = 360 * 5 + (wedgeIndex * 72) + 36; // 5 full spins + landing offset

    setRouletteAngle(targetDeg);

    setTimeout(() => {
      setIsSpinning(false);
      setAwardedShots(pickedShots);

      // Settle and start bonus after reveal
      setTimeout(() => {
        onActivateBonus(tier, pickedShots);
        onClose();
      }, 1600);
    }, 2800);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="relative max-w-4xl w-full bg-[#0a0f1d] border border-white/15 rounded-3xl p-5 sm:p-8 text-white shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            disabled={isSpinning}
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition disabled:opacity-20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {stage === 'SELECT' ? (
            <div>
              {/* Header Title matching video */}
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
                  BUY BONUS:
                </h2>
              </div>

              {/* 3 Tier Cards Grid matching video 01:36 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
                {BONUS_TIERS.map((tier) => {
                  const cost = selectedStake * tier.costMultiplier;
                  return (
                    <motion.div
                      key={tier.id}
                      whileHover={{ scale: 1.03 }}
                      className={`relative flex flex-col rounded-2xl overflow-hidden border-2 bg-gradient-to-b ${tier.cardBorder} p-1 shadow-xl`}
                    >
                      {/* Card Content Interior */}
                      <div className="flex-1 bg-[#10172a] rounded-xl p-4 flex flex-col items-center text-center">
                        {/* Tier Title Banner */}
                        <div className={`w-full py-1 rounded-lg ${tier.headerBg} font-black text-sm tracking-wider uppercase mb-3 text-white drop-shadow`}>
                          {tier.name}
                        </div>

                        {/* Character Avatar Portrait */}
                        <div className="relative w-32 h-36 my-1">
                          <Image
                            src={tier.avatar}
                            alt={tier.name}
                            fill
                            className="object-contain object-top"
                          />
                        </div>

                        {/* Max Win Badge */}
                        <div className="w-full mt-2 mb-3">
                          <span className="text-[11px] font-bold text-gray-400 uppercase block tracking-wider">
                            MAX WIN
                          </span>
                          <span className="text-lg sm:text-xl font-black text-amber-300 tracking-wide drop-shadow">
                            {tier.maxWin}
                          </span>
                        </div>

                        {/* Price Action Button */}
                        <button
                          onClick={() => handleSelectPackage(tier.id)}
                          className={`w-full py-2.5 rounded-xl ${tier.btnBg} text-slate-950 font-black text-sm tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer`}
                        >
                          $ {cost.toLocaleString()}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Tagline from video */}
              <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                A MISS DOES NOT WASTE THE WINNINGS
              </p>

              {/* Bottom Stake Bar */}
              <div className="max-w-xs mx-auto flex flex-col items-center">
                <div className="flex items-center justify-between w-full bg-[#131b2e] border border-white/10 rounded-2xl p-1.5 px-3">
                  <span className="text-xs font-black text-gray-400">BET</span>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedStake(Math.max(10, selectedStake - 50))}
                      className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-black text-white min-w-[60px] text-center">
                      $ {selectedStake}
                    </span>
                    <button
                      onClick={() => setSelectedStake(selectedStake + 50)}
                      className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* User Balance */}
                <div className="mt-2 text-xs font-bold text-gray-400">
                  Balance: <span className="text-white font-black">${currentBalance.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            /* ── STAGE 2: ROULETTE WHEEL ── */
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-amber-300 tracking-widest mb-1 drop-shadow">
                ROULETTE
              </h2>
              <p className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-8">
                6-10 SHOTS GUARANTEED
              </p>

              {/* Roulette Wheel Graphics */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center mb-6">
                {/* Arrow Pointer on Top */}
                <div className="absolute -top-3 z-30 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[18px] border-t-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,1)]" />

                {/* Spinning Wheel */}
                <div
                  className="w-full h-full rounded-full border-4 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.6)] relative overflow-hidden transition-all ease-out"
                  style={{
                    transform: `rotate(${rouletteAngle}deg)`,
                    transitionDuration: isSpinning ? '2.8s' : '0s',
                    background: 'conic-gradient(#ef4444 0deg 72deg, #f59e0b 72deg 144deg, #eab308 144deg 216deg, #06b6d4 216deg 288deg, #8b5cf6 288deg 360deg)',
                  }}
                >
                  {/* Slices Numbers */}
                  {[6, 7, 8, 9, 10].map((num, idx) => {
                    const rot = idx * 72 + 36;
                    return (
                      <div
                        key={num}
                        className="absolute inset-0 flex items-start justify-center pt-3 pointer-events-none"
                        style={{ transform: `rotate(${rot}deg)` }}
                      >
                        <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {num}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Golden Football Center Hub */}
                <div className="absolute z-20 w-20 h-20 rounded-full bg-gradient-to-b from-amber-300 via-yellow-500 to-amber-600 border-2 border-white shadow-xl flex items-center justify-center p-2">
                  <Image
                    src="/assets/penalty-nations-cup/item_ball.png"
                    alt="Ball"
                    width={52}
                    height={52}
                    className="object-contain"
                  />
                </div>
              </div>

              {awardedShots !== null && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-base uppercase tracking-wider shadow-lg shadow-amber-500/40"
                >
                  🎉 {awardedShots} SHOTS AWARDED!
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
