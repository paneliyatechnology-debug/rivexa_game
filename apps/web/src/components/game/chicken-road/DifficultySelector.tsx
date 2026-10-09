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
    <div className="flex flex-col justify-between w-full h-full min-w-0">
      {/* Title & Subtitle Header Row */}
      <div className="flex items-center justify-between px-1 text-xs sm:text-sm md:text-base lg:text-lg mb-2.5 sm:mb-3">
        <span className="font-extrabold text-slate-200">Difficulty</span>
        <span className="text-[#8b92a0] font-semibold text-[11px] sm:text-xs md:text-sm lg:text-base">Chance of being shot down</span>
      </div>

      {/* Pill Selector Bar */}
      <div className="grid grid-cols-4 gap-1 sm:gap-1.5 p-1.5 sm:p-2 bg-[#353843] border border-[#424654] rounded-xl w-full h-13 sm:h-14 md:h-16 lg:h-[72px] items-center min-w-0">
        {options.map((opt) => {
          const isSelected = currentDifficulty === opt.slug;
          return (
            <button
              key={opt.slug}
              onClick={() => setDifficulty(opt.slug)}
              disabled={isDisabled}
              className={`h-full rounded-lg text-xs sm:text-sm md:text-base lg:text-lg font-extrabold transition-all flex items-center justify-center select-none min-w-0 truncate ${
                isSelected
                  ? 'bg-[#525767] text-white shadow-md'
                  : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
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
