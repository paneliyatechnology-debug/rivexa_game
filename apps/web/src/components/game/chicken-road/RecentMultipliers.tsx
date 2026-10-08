'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useChickenRoadStore } from '../../../store/chickenRoadStore';

export const RecentMultipliers: React.FC = () => {
  const history = useChickenRoadStore((s) => s.history);

  // Exact fallback items matching target design image 2
  const defaultItems = [
    '1.02x', '1.14x', '1.37x', '1.08x', '1.21x', '1.29x',
    '1.06x', '1.18x', '1.42x', '1.07x', '1.33x', '1.11x'
  ];

  const displayItems = history.length > 0
    ? history.slice(0, 12).map((item) => `${(item.multiplier || 1.0).toFixed(2)}x`)
    : defaultItems;

  return (
    <div className="w-full flex flex-wrap items-center gap-3 pt-3 border-t border-[#00D9FF]/15">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 pr-1">
        <TrendingUp className="w-3.5 h-3.5 text-[#00D9FF]" />
        <span>Recent Multipliers</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
        {displayItems.map((item, idx) => {
          const numVal = parseFloat(item);
          let badgeColor = 'bg-[#00D9FF]/15 text-[#00D9FF] border-[#00D9FF]/30';

          if (numVal >= 1.25) {
            badgeColor = 'bg-[#873BFF]/25 text-[#D8B4FE] border-[#873BFF]/40 shadow-[0_0_8px_rgba(135,59,255,0.3)]';
          } else if (numVal >= 1.12) {
            badgeColor = 'bg-[#287BFF]/20 text-[#60A5FA] border-[#287BFF]/40 shadow-[0_0_8px_rgba(40,123,255,0.3)]';
          } else {
            badgeColor = 'bg-[#00E5A0]/20 text-[#00E5A0] border-[#00E5A0]/40 shadow-[0_0_8px_rgba(0,229,160,0.3)]';
          }

          return (
            <span
              key={idx}
              className={`px-3 py-1 rounded-full text-xs font-black border tracking-wide whitespace-nowrap shadow-sm transition-transform hover:scale-105 ${badgeColor}`}
            >
              {item}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default RecentMultipliers;
