'use client';

import React from 'react';

export interface IMarketCategory {
  id: string;
  slug: string;
  name: string;
  sortOrder?: number;
}

export function MarketCategoryTabs({
  categories,
  activeSlug,
  onSelectCategory,
}: {
  categories: IMarketCategory[];
  activeSlug: string;
  onSelectCategory: (slug: string) => void;
}) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar scroll-smooth border-b border-cyan-500/20 pb-3 mb-4">
      <div className="flex items-center gap-2 min-w-max">
        {categories.map((cat) => {
          const isActive = activeSlug === cat.slug;
          return (
            <button
              key={cat.slug}
              onClick={() => onSelectCategory(cat.slug)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-105 border border-cyan-200'
                  : 'bg-[#162A5E] hover:bg-[#1C3678] text-[#C2D4F8] hover:text-white border border-cyan-500/20 shadow-xs'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
