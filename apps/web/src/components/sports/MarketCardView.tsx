'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, Sparkles, Check, Target, Zap, X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/lib/config';

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

export interface MarketCardViewProps {
  market: ICricketMarketData;
  onSelectOdds: (selection: IMarketSelection, market: ICricketMarketData) => void;
  selectedSelectionId?: string;
  matchId?: string;
}

export function MarketCardView({
  market,
  onSelectOdds,
  selectedSelectionId,
  matchId,
}: MarketCardViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedQuickBetId, setExpandedQuickBetId] = useState<string | null>(null);
  const [quickStakeMap, setQuickStakeMap] = useState<Record<string, number>>({});
  const [isSubmittingMap, setIsSubmittingMap] = useState<Record<string, boolean>>({});
  const [messageMap, setMessageMap] = useState<
    Record<string, { type: 'success' | 'error'; text: string } | null>
  >({});

  const { user, balance, refreshBalance } = useAuth();
  const isSuspended = market.status !== 'OPEN';

  const toggleQuickBet = (selectionId: string) => {
    if (expandedQuickBetId === selectionId) {
      setExpandedQuickBetId(null);
    } else {
      setExpandedQuickBetId(selectionId);
      if (!quickStakeMap[selectionId]) {
        setQuickStakeMap((prev) => ({ ...prev, [selectionId]: 100 }));
      }
      setMessageMap((prev) => ({ ...prev, [selectionId]: null }));
    }
  };

  const handleQuickStakeChange = (selectionId: string, val: number) => {
    setQuickStakeMap((prev) => ({ ...prev, [selectionId]: Math.max(0, val) }));
  };

  const handleDirectPlaceBet = async (sel: IMarketSelection) => {
    const stake = quickStakeMap[sel.id] || 100;
    if (stake <= 0) {
      setMessageMap((prev) => ({
        ...prev,
        [sel.id]: { type: 'error', text: 'Please enter a valid stake amount.' },
      }));
      return;
    }

    if (balance !== undefined && stake > balance) {
      setMessageMap((prev) => ({
        ...prev,
        [sel.id]: {
          type: 'error',
          text: `Insufficient balance (₹${(balance || 0).toFixed(2)}). Please deposit.`,
        },
      }));
      return;
    }

    setIsSubmittingMap((prev) => ({ ...prev, [sel.id]: true }));
    setMessageMap((prev) => ({ ...prev, [sel.id]: null }));

    try {
      const payload = {
        userId: user?.id,
        matchId: matchId || 'cricket-match-1',
        selections: [
          {
            marketId: market.id,
            selectionId: sel.id,
            odds: Number(sel.backPrice),
            stake,
          },
        ],
      };

      const res = await fetch(`${getApiBaseUrl()}/cricket/test-bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setMessageMap((prev) => ({
          ...prev,
          [sel.id]: {
            type: 'success',
            text: `Bet Placed! Ref: ${json.betReference || json.data?.betReference || 'OK'}`,
          },
        }));
        await refreshBalance();
        setTimeout(() => {
          setExpandedQuickBetId(null);
          setMessageMap((prev) => ({ ...prev, [sel.id]: null }));
        }, 1500);
      } else {
        setMessageMap((prev) => ({
          ...prev,
          [sel.id]: { type: 'error', text: json.message || 'Failed to place bet.' },
        }));
      }
    } catch (err: any) {
      setMessageMap((prev) => ({
        ...prev,
        [sel.id]: { type: 'error', text: err.message || 'Error placing bet.' },
      }));
    } finally {
      setIsSubmittingMap((prev) => ({ ...prev, [sel.id]: false }));
    }
  };

  // Dynamic selection theme map: Electric Neon Green, Cyber Magenta/Purple, Warm Gold
  const getDynamicSelectionTheme = (
    sel: IMarketSelection,
    idx: number,
    isSelected: boolean,
    isQuickBetOpen: boolean,
    isDisabled: boolean
  ) => {
    if (isDisabled) {
      return {
        card: 'bg-slate-900/60 text-slate-600 border-white/5 cursor-not-allowed opacity-50',
        badge: 'bg-slate-950 text-slate-600 border border-white/5',
      };
    }

    const currentOdds = Number(sel.backPrice) || 0;
    const allOdds = market.selections.map((s) => Number(s.backPrice) || 0);
    const maxOdds = Math.max(...allOdds);
    const minOdds = Math.min(...allOdds);
    const isEqualOdds = allOdds.every((v) => v === allOdds[0]);

    // High Odds / Favored Outcome -> Electric Neon Green Lighting Glow
    const isGreenSide = isEqualOdds ? idx === 0 : currentOdds === maxOdds;

    if (isGreenSide) {
      return {
        card: isSelected
          ? 'bg-emerald-950/90 border-emerald-400 shadow-[0_0_30px_rgba(0,255,135,0.7)] ring-2 ring-emerald-400/80'
          : isQuickBetOpen
          ? 'bg-[#093826] border-emerald-400 shadow-[0_0_20px_rgba(0,255,135,0.5)]'
          : 'bg-[#052116]/90 hover:bg-[#0B3827] border-emerald-500/50 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(0,255,135,0.4)]',
        badge: isSelected || isQuickBetOpen
          ? 'bg-gradient-to-r from-[#00FF87] via-[#00E5A0] to-[#10B981] text-slate-950 font-black shadow-[0_0_20px_rgba(0,255,135,1)] border-2 border-white scale-105 animate-pulse'
          : 'bg-[#093826] text-[#00FF87] border border-emerald-400/70 shadow-[0_0_14px_rgba(0,255,135,0.35)] hover:bg-[#0F4B34] hover:text-white',
      };
    }

    // Lower Odds -> Cyber Magenta / Fuchsia
    if (currentOdds === minOdds || idx === 1) {
      return {
        card: isSelected
          ? 'bg-purple-950/90 border-purple-400 shadow-[0_0_30px_rgba(224,102,255,0.7)] ring-2 ring-purple-400/80'
          : isQuickBetOpen
          ? 'bg-[#35114D] border-purple-400 shadow-[0_0_20px_rgba(224,102,255,0.5)]'
          : 'bg-[#1E082C]/90 hover:bg-[#340F4A] border-purple-500/50 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(224,102,255,0.4)]',
        badge: isSelected || isQuickBetOpen
          ? 'bg-gradient-to-r from-[#E066FF] via-[#C084FC] to-[#A855F7] text-white font-black shadow-[0_0_20px_rgba(224,102,255,1)] border-2 border-white scale-105 animate-pulse'
          : 'bg-[#35114D] text-[#E066FF] border border-purple-400/70 shadow-[0_0_14px_rgba(224,102,255,0.35)] hover:bg-[#49186B] hover:text-white',
      };
    }

    // Warm Gold / Amber
    return {
      card: isSelected
        ? 'bg-amber-950/90 border-amber-400 shadow-[0_0_30px_rgba(255,215,0,0.7)] ring-2 ring-amber-400/80'
        : isQuickBetOpen
        ? 'bg-[#3D2908] border-amber-400 shadow-[0_0_20px_rgba(255,215,0,0.5)]'
        : 'bg-[#241704]/90 hover:bg-[#3B2607] border-amber-500/50 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(255,215,0,0.4)]',
      badge: isSelected || isQuickBetOpen
        ? 'bg-gradient-to-r from-[#FFD700] to-[#F59E0B] text-slate-950 font-black shadow-[0_0_20px_rgba(255,215,0,1)] border-2 border-white scale-105 animate-pulse'
        : 'bg-[#3D2908] text-[#FFD700] border border-amber-400/70 shadow-[0_0_14px_rgba(255,215,0,0.35)] hover:bg-[#54380B] hover:text-white',
    };
  };

  const isSessionMarket =
    market.categorySlug === 'session' ||
    market.marketType === 'SESSION_FANCY' ||
    market.name.toLowerCase().includes('over');
  const isOddEven = market.categorySlug === 'odd_even' || market.marketType === 'ODD_EVEN';

  return (
    <div className="bg-gradient-to-br from-[#122452] via-[#0E1C44] to-[#0B1638] border border-cyan-500/35 rounded-2xl overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.4)] transition-all">
      {/* Card Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3.5 bg-gradient-to-r from-[#162B60] via-[#1A3372] to-[#162B60] border-b border-cyan-500/25 flex items-center justify-between cursor-pointer select-none hover:bg-[#1E3A7E] transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-black text-sm text-white tracking-wide drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">
            {market.name}
          </span>

          {isSessionMarket && (
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/25 to-yellow-500/25 text-amber-300 border border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-300" />
              Live Session Line
            </span>
          )}

          {isOddEven && (
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/25 to-pink-500/25 text-purple-300 border border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.3)] flex items-center gap-1">
              <Target className="w-3 h-3 text-purple-300" />
              Odd / Even
            </span>
          )}

          {market.sourceType === 'STATISTICAL_MODEL' && !isSessionMarket && !isOddEven && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Live Odds
            </span>
          )}

          {isSuspended && (
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 flex items-center gap-1 border border-red-500/40 animate-pulse">
              <Lock className="w-3 h-3" /> Suspended
            </span>
          )}
        </div>

        <button className="text-slate-400 hover:text-cyan-300 transition-colors p-1">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-cyan-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-cyan-400" />
          )}
        </button>
      </div>

      {/* Selections Body */}
      {isExpanded && (
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
            {market.selections.map((sel, idx) => {
              const isSelected = selectedSelectionId === sel.id;
              const isQuickBetOpen = expandedQuickBetId === sel.id;
              const isDisabled = isSuspended || sel.status !== 'ACTIVE';
              const theme = getDynamicSelectionTheme(sel, idx, isSelected, isQuickBetOpen, isDisabled);
              const currentStake = quickStakeMap[sel.id] || 100;
              const isSubmitting = isSubmittingMap[sel.id] || false;
              const currentMsg = messageMap[sel.id] || null;

              return (
                <div
                  key={sel.id}
                  className="rounded-xl border border-cyan-500/20 overflow-hidden shadow-md transition-all select-none"
                >
                  {/* Main Selection Row */}
                  <div
                    className={`flex items-center justify-between p-3.5 sm:p-4 transition-all ${theme.card}`}
                  >
                    {/* Left Side: Outcome Name & Status (Click adds to Bet Slip) */}
                    <div
                      onClick={() => !isDisabled && onSelectOdds(sel, market)}
                      className="flex-1 flex items-center gap-2.5 min-w-0 pr-3 cursor-pointer group py-0.5"
                      title="Click to add selection to Bet Slip"
                    >
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(0,255,135,0.8)]">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-cyan-400/40 group-hover:bg-cyan-400 shrink-0 transition-colors"></span>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-black text-xs sm:text-sm text-white truncate drop-shadow-[0_0_4px_rgba(0,0,0,0.5)] group-hover:text-cyan-300 transition-colors">
                          {sel.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium truncate">
                          {isSelected ? 'In Bet Slip (Click to toggle)' : 'Click name to add to Bet Slip'}
                        </span>
                      </div>
                    </div>

                    {/* Right Side: Direct Odds Rate Number Button (Click expands inline Quick Bet row) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isDisabled) toggleQuickBet(sel.id);
                        }}
                        disabled={isDisabled}
                        title="Click rate number for direct quick bet"
                        className={`px-3.5 py-2 rounded-xl font-mono font-black text-xs sm:text-sm tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${theme.badge}`}
                      >
                        <span>{Number(sel.backPrice).toFixed(2)}</span>
                        {isQuickBetOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Inline Collapsible Row: Direct Place Bet */}
                  {isQuickBetOpen && (
                    <div className="bg-gradient-to-b from-[#09173D] via-[#0B1C4B] to-[#071333] border-t border-cyan-500/30 p-3 sm:p-4 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs border-b border-cyan-500/20 pb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20 shrink-0 animate-pulse" />
                          <span className="font-black text-white shrink-0">Direct Quick Bet:</span>
                          <span className="font-extrabold text-cyan-300 truncate">{sel.name}</span>
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[11px] shrink-0 border border-cyan-400/30">
                            @{Number(sel.backPrice).toFixed(2)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedQuickBetId(null)}
                          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quick Stake Preset Chips */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] text-slate-300 font-bold flex justify-between items-center">
                          <span>Select Stake Amount (₹)</span>
                          <span className="text-slate-400 font-mono text-[10px]">
                            Balance: ₹{(balance || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[100, 500, 1000, 5000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => handleQuickStakeChange(sel.id, amt)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                currentStake === amt
                                  ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_12px_rgba(6,182,212,0.8)] scale-105'
                                  : 'bg-[#122452] text-cyan-200 border border-cyan-500/30 hover:bg-[#18316E] hover:text-white'
                              }`}
                            >
                              +₹{amt}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickStakeChange(sel.id, Math.max(10, Math.floor(balance || 0)))
                            }
                            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30 cursor-pointer"
                          >
                            Max
                          </button>
                        </div>
                      </div>

                      {/* Custom Stake Input & Est. Returns */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-bold text-xs">
                            ₹
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={currentStake || ''}
                            onChange={(e) => handleQuickStakeChange(sel.id, Number(e.target.value))}
                            placeholder="Enter stake amount"
                            className="w-full pl-7 pr-3 py-2.5 bg-[#050D24] border border-cyan-500/40 rounded-xl text-white font-mono font-bold text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                          />
                        </div>

                        <div className="bg-[#050D24] p-2.5 rounded-xl border border-cyan-500/20 text-xs flex items-center justify-between">
                          <span className="text-slate-400 font-semibold">Est. Return:</span>
                          <span className="font-mono font-black text-[#00FF87] text-sm drop-shadow-[0_0_8px_rgba(0,255,135,0.6)]">
                            ₹{(currentStake * Number(sel.backPrice)).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Notification / Status Feedback */}
                      {currentMsg && (
                        <div
                          className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${
                            currentMsg.type === 'success'
                              ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                              : 'bg-red-500/20 border border-red-400/50 text-red-300'
                          }`}
                        >
                          <span>{currentMsg.text}</span>
                          <X
                            className="w-3.5 h-3.5 cursor-pointer shrink-0"
                            onClick={() => setMessageMap((prev) => ({ ...prev, [sel.id]: null }))}
                          />
                        </div>
                      )}

                      {/* Action Buttons: Direct Place Bet vs Add to Slip */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleDirectPlaceBet(sel)}
                          disabled={isSubmitting}
                          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00FF87] via-[#00E5A0] to-[#10B981] text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,255,135,0.4)] hover:shadow-[0_0_25px_rgba(0,255,135,0.7)] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                              <span>Placing Bet...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 fill-slate-950" />
                              <span>Direct Place Bet (₹{currentStake})</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectOdds(sel, market);
                            setExpandedQuickBetId(null);
                          }}
                          className="py-3 px-3.5 rounded-xl bg-[#122452] hover:bg-[#18316E] border border-cyan-500/30 text-cyan-200 hover:text-white text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="hidden sm:inline">Add to Slip</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
