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

  return (
    <div className="bg-gradient-to-br from-[#091533] to-[#050C20] border border-white/10 rounded-2xl overflow-hidden shadow-lg transition-all">
      {/* Card Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3.5 bg-[#0C1A3E] border-b border-white/5 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <span className="font-extrabold text-sm text-white tracking-wide">{market.name}</span>

          {market.sourceType === 'STATISTICAL_MODEL' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              Stats Model
            </span>
          )}

          {market.marketType === 'ODD_EVEN' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25">
              Odd / Even
            </span>
          )}

          {isSuspended && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Suspended
            </span>
          )}
        </div>

        <button className="text-[#7183A8] hover:text-white transition-colors">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Selections Body */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-2.5">
          {/* Table Header for Back/Lay or Price */}
          <div className="flex items-center justify-between text-[11px] text-[#7183A8] font-bold uppercase tracking-wider px-2 pb-1 border-b border-white/5">
            <span>Selection</span>
            <div className="flex items-center gap-2">
              <span className="w-20 text-center text-[#287BFF]">Back (Odds)</span>
              {market.isBackLay && <span className="w-20 text-center text-pink-400">Lay (Odds)</span>}
            </div>
          </div>

          {/* Selection Rows */}
          {market.selections.map((sel) => {
            const isSelected = selectedSelectionId === sel.id;
            const isDisabled = isSuspended || sel.status !== 'ACTIVE';

            return (
              <div
                key={sel.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-[#287BFF]/15 border-[#287BFF] shadow-[0_0_15px_rgba(40,123,255,0.2)]'
                    : 'bg-[#061026] hover:bg-[#0A183D] border-white/5'
                }`}
              >
                {/* Selection Name */}
                <div className="font-bold text-xs text-slate-100 flex items-center gap-2 min-w-0 pr-2">
                  <span className="truncate">{sel.name}</span>
                </div>

                {/* Odds Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Back Price Cell (Blue) */}
                  <button
                    disabled={isDisabled}
                    onClick={() => !isDisabled && onSelectOdds(sel, market)}
                    className={`w-20 py-2 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer font-mono ${
                      isDisabled
                        ? 'bg-slate-900 text-slate-600 border border-white/5 cursor-not-allowed opacity-50'
                        : isSelected
                        ? 'bg-gradient-to-r from-[#287BFF] to-[#00D9FF] text-white font-extrabold shadow-md scale-105'
                        : 'bg-[#142A5C] hover:bg-[#1C3A7E] text-[#00E5A0] border border-[#287BFF]/30 hover:border-[#00D9FF]'
                    }`}
                  >
                    <span className="text-xs font-black">{Number(sel.backPrice).toFixed(2)}</span>
                    {sel.backLiquidity && (
                      <span className="text-[9px] text-slate-400 font-normal">₹{sel.backLiquidity}</span>
                    )}
                  </button>

                  {/* Lay Price Cell (Pink) */}
                  {market.isBackLay && (
                    <button
                      disabled={isDisabled}
                      className="w-20 py-2 rounded-xl bg-[#4A1535] hover:bg-[#681C4B] text-pink-300 border border-pink-500/30 flex flex-col items-center justify-center font-mono opacity-80 cursor-not-allowed"
                    >
                      <span className="text-xs font-black">{sel.layPrice ? Number(sel.layPrice).toFixed(2) : '-'}</span>
                      {sel.layLiquidity && (
                        <span className="text-[9px] text-pink-400/80 font-normal">₹{sel.layLiquidity}</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
