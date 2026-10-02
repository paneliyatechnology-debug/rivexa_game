'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, ShieldAlert, Sparkles } from 'lucide-react';

export interface IMarketSelection {
  id: string;
  name: string;
  backPrice: number;
  layPrice?: number;
  backLiquidity?: number;
  layLiquidity?: number;
  status: string;
}

export interface ICricketMarketData {
  id: string;
  name: string;
  categorySlug: string;
  marketType: string;
  status: string;
  sourceType: string;
  lineThreshold?: number;
  isBackLay?: boolean;
  selections: IMarketSelection[];
}

export function MarketCardView({
  market,
  onSelectOdds,
  selectedSelectionId,
}: {
  market: ICricketMarketData;
  onSelectOdds: (selection: IMarketSelection, market: ICricketMarketData) => void;
  selectedSelectionId?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isSuspended = market.status !== 'OPEN';

  // Dynamic selection theme map: Higher odds = Electric Neon Green, Lower odds = Purple/Fuchsia (No Blue!)
  const getDynamicSelectionTheme = (
    sel: IMarketSelection,
    idx: number,
    isSelected: boolean,
    isDisabled: boolean
  ) => {
    if (isDisabled) {
      return {
        card: 'bg-slate-900/50 text-slate-600 border-white/5 cursor-not-allowed opacity-50',
        badge: 'bg-slate-950 text-slate-600 border border-white/5',
      };
    }

    const currentOdds = Number(sel.backPrice) || 0;
    const allOdds = market.selections.map((s) => Number(s.backPrice) || 0);
    const maxOdds = Math.max(...allOdds);
    const minOdds = Math.min(...allOdds);
    const isEqualOdds = allOdds.every((v) => v === allOdds[0]);

    // Side with Higher Odds (or first option if equal odds) -> Electric Neon Green Lighting Glow
    const isGreenSide = isEqualOdds ? idx === 0 : currentOdds === maxOdds;

    if (isGreenSide) {
      return {
        card: isSelected
          ? 'bg-emerald-950/80 border-emerald-400 shadow-[0_0_25px_rgba(0,255,135,0.6)] scale-[1.01] cursor-pointer ring-1 ring-emerald-400'
          : 'bg-[#062418]/90 hover:bg-[#0B3827] border-emerald-500/40 hover:border-emerald-400 hover:shadow-[0_0_16px_rgba(0,255,135,0.35)] cursor-pointer',
        badge: isSelected
          ? 'bg-gradient-to-r from-[#00FF87] via-[#00E5A0] to-[#10B981] text-slate-950 font-black shadow-[0_0_18px_rgba(0,255,135,0.95)] border-2 border-white scale-105'
          : 'bg-[#0B3D2A] text-[#00FF87] border border-emerald-400/60 shadow-[0_0_12px_rgba(0,255,135,0.3)] hover:bg-[#104D36] hover:text-white',
      };
    }

    // Side with Lower Odds -> Vibrant Purple / Fuchsia (No Blue!)
    if (currentOdds === minOdds || idx === 1) {
      return {
        card: isSelected
          ? 'bg-purple-950/80 border-purple-400 shadow-[0_0_25px_rgba(224,102,255,0.6)] scale-[1.01] cursor-pointer ring-1 ring-purple-400'
          : 'bg-[#210930]/90 hover:bg-[#36104C] border-purple-500/40 hover:border-purple-400 hover:shadow-[0_0_16px_rgba(224,102,255,0.35)] cursor-pointer',
        badge: isSelected
          ? 'bg-gradient-to-r from-[#E066FF] via-[#C084FC] to-[#A855F7] text-white font-black shadow-[0_0_18px_rgba(224,102,255,0.95)] border-2 border-white scale-105'
          : 'bg-[#3A1352] text-[#E066FF] border border-purple-400/60 shadow-[0_0_12px_rgba(224,102,255,0.3)] hover:bg-[#4D1A6D] hover:text-white',
      };
    }

    // Middle Odds -> Warm Amber / Gold
    if (idx % 2 === 0) {
      return {
        card: isSelected
          ? 'bg-amber-950/80 border-amber-400 shadow-[0_0_25px_rgba(255,215,0,0.6)] scale-[1.01] cursor-pointer ring-1 ring-amber-400'
          : 'bg-[#261905]/90 hover:bg-[#3D2909] border-amber-500/40 hover:border-amber-400 hover:shadow-[0_0_16px_rgba(255,215,0,0.35)] cursor-pointer',
        badge: isSelected
          ? 'bg-gradient-to-r from-[#FFD700] to-[#F59E0B] text-slate-950 font-black shadow-[0_0_18px_rgba(255,215,0,0.95)] border-2 border-white scale-105'
          : 'bg-[#422D0A] text-[#FFD700] border border-amber-400/60 shadow-[0_0_12px_rgba(255,215,0,0.3)] hover:bg-[#573C0D] hover:text-white',
      };
    }

    // Other Options -> Rose / Coral
    return {
      card: isSelected
        ? 'bg-rose-950/80 border-rose-400 shadow-[0_0_25px_rgba(255,77,141,0.6)] scale-[1.01] cursor-pointer ring-1 ring-rose-400'
        : 'bg-[#2B0A1A]/90 hover:bg-[#441129] border-rose-500/40 hover:border-rose-400 hover:shadow-[0_0_16px_rgba(255,77,141,0.35)] cursor-pointer',
      badge: isSelected
        ? 'bg-gradient-to-r from-[#FF4D8D] to-[#F43F5E] text-white font-black shadow-[0_0_18px_rgba(255,77,141,0.95)] border-2 border-white scale-105'
        : 'bg-[#4A112C] text-[#FF4D8D] border border-rose-400/60 shadow-[0_0_12px_rgba(255,77,141,0.3)] hover:bg-[#61163A] hover:text-white',
    };
  };

  return (
    <div className="bg-gradient-to-br from-[#142654] via-[#101F48] to-[#0D193B] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all">
      {/* Card Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3.5 bg-[#162A5E] border-b border-cyan-500/20 flex items-center justify-between cursor-pointer select-none hover:bg-[#1C3678] transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-black text-sm text-white tracking-wide drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]">{market.name}</span>

          {market.sourceType === 'STATISTICAL_MODEL' && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
              Stats Model
            </span>
          )}

          {market.marketType === 'ODD_EVEN' && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Odd / Even
            </span>
          )}

          {isSuspended && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 flex items-center gap-1 border border-red-500/30">
              <Lock className="w-3 h-3" /> Suspended
            </span>
          )}
        </div>

        <button className="text-slate-400 hover:text-cyan-300 transition-colors">
          {isExpanded ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-cyan-400" />}
        </button>
      </div>

      {/* Selections Body */}
      {isExpanded && (
        <div className="p-3 sm:p-4">
          <div
            className={`grid gap-2.5 ${
              market.selections.length === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : market.selections.length === 3
                ? 'grid-cols-1 sm:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {market.selections.map((sel, idx) => {
              const isSelected = selectedSelectionId === sel.id;
              const isDisabled = isSuspended || sel.status !== 'ACTIVE';
              const theme = getDynamicSelectionTheme(sel, idx, isSelected, isDisabled);

              return (
                <div
                  key={sel.id}
                  onClick={() => !isDisabled && onSelectOdds(sel, market)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none ${theme.card}`}
                >
                  {/* Outcome Name */}
                  <span className="font-extrabold text-xs text-white truncate pr-2">{sel.name}</span>

                  {/* Odds Button Badge */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-3 py-1.5 rounded-xl font-mono font-black text-xs transition-all ${theme.badge}`}>
                      {Number(sel.backPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
