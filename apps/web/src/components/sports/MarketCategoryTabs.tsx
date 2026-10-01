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
    <div className="w-full overflow-x-auto no-scrollbar scroll-smooth border-b border-white/10 pb-3 mb-4">
      <div className="flex items-center gap-2 min-w-max">
        {categories.map((cat) => {
          const isActive = activeSlug === cat.slug;
          return (
            <button
              key={cat.slug}
              onClick={() => onSelectCategory(cat.slug)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-[#287BFF] to-[#00D9FF] text-white shadow-[0_0_15px_rgba(40,123,255,0.4)] scale-105'
                  : 'bg-[#08132E] hover:bg-[#101F42] text-[#7183A8] hover:text-white border border-white/5'
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
