'use client';

import React from 'react';
import { useChickenRoadStore } from '../../../store/chickenRoadStore';
import { DifficultySlug } from '../../../types/chicken-road';

export const DifficultySelector: React.FC = () => {
  const currentDifficulty = useChickenRoadStore((s) => s.difficulty);
  const setDifficulty = useChickenRoadStore((s) => s.setDifficulty);
  const status = useChickenRoadStore((s) => s.status);

  const isDisabled = status === 'RUNNING' || status === 'MOVING';

  const options: Array<{ slug: DifficultySlug; label: string }> = [
    { slug: 'easy', label: 'Easy' },
    { slug: 'medium', label: 'Medium' },
    { slug: 'hard', label: 'Hard' },
    { slug: 'hardcore', label: 'Hardcore' },
  ];

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Title & Subtitle Header Row */}
      <div className="flex items-center justify-between px-1 text-xs sm:text-sm">
        <span className="font-extrabold text-slate-200">Difficulty</span>
        <span className="text-slate-400 font-semibold text-[11px] sm:text-xs">Chance of being shot down</span>
      </div>

      {/* Pill Selector Bar */}
      <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-[#1b1e24] border border-[#323642] rounded-xl sm:rounded-2xl w-full h-12 sm:h-14 items-center">
        {options.map((opt) => {
          const isSelected = currentDifficulty === opt.slug;
          return (
            <button
              key={opt.slug}
              onClick={() => setDifficulty(opt.slug)}
              disabled={isDisabled}
              className={`h-full rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center ${
                isSelected
                  ? 'bg-[#3b404f] text-white shadow-md border border-slate-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              } disabled:opacity-30 active:scale-95 cursor-pointer`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DifficultySelector;
