'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { IMarketSelection, ICricketMarketData } from './MarketCardView';
import { getApiBaseUrl } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';
import { Ticket, Trash2, ShieldAlert, CheckCircle, X, Sparkles, Coins, History, Clock, RefreshCw, Wallet } from 'lucide-react';

export interface IBetSlipItem {
  matchId: string;
  matchName: string;
  marketId: string;
  marketName: string;
  selectionId: string;
  selectionName: string;
  odds: number;
  stake: number;
}

export function BetSlip({
  items,
  currentMatchId,
  onRemoveItem,
  onClearAll,
  onStakeChange,
}: {
  items: IBetSlipItem[];
  currentMatchId?: string;
  onRemoveItem: (selectionId: string) => void;
  onClearAll: () => void;
  onStakeChange: (selectionId: string, stake: number) => void;
}) {
  const { balance, refreshBalance, user } = useAuth();

  const [activePanelTab, setActivePanelTab] = useState<'slip' | 'my_bets'>('slip');
  const [betScopeFilter, setBetScopeFilter] = useState<'this_match' | 'all_matches'>('this_match');

  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // My Bets History State
  const [placedBets, setPlacedBets] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const totalStake = items.reduce((sum, item) => sum + (Number(item.stake) || 0), 0);
  const totalReturn = items.reduce((sum, item) => sum + (Number(item.stake) || 0) * item.odds, 0);
  const totalProfit = totalReturn - totalStake;

  const fetchPlacedBets = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/test-bets/history${user?.id ? `?userId=${user.id}` : ''}`);
      if (res.ok) {
        const json = await res.json();
        setPlacedBets(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPlacedBets();
  }, [fetchPlacedBets]);

  const handlePlaceBet = async () => {
    if (items.length === 0) return;
    if (totalStake <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid stake amount.' });
      return;
    }

    if (totalStake > (balance || 0)) {
      setMessage({
        type: 'error',
        text: `Insufficient wallet balance (₹${(balance || 0).toFixed(2)}). Please deposit funds to place this bet.`,
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        userId: user?.id,
        matchId: items[0].matchId,
        selections: items.map((it) => ({
          marketId: it.marketId,
          selectionId: it.selectionId,
          odds: it.odds,
          stake: it.stake,
        })),
      };

      const res = await fetch(`${getApiBaseUrl()}/cricket/test-bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({
          type: 'success',
          text: `Bet Placed! Ref: ${json.betReference || json.data?.betReference}`,
        });
        onClearAll();
        await refreshBalance();
        await fetchPlacedBets();
        setTimeout(() => {
          setActivePanelTab('my_bets');
          setMessage(null);
        }, 1200);
      } else {
        setMessage({ type: 'error', text: json.message || 'Failed to place bet.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Network error placing bet.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter placed bets by current match or all matches
  const filteredPlacedBets = placedBets.filter((bet) => {
    if (betScopeFilter === 'this_match' && currentMatchId) {
      return bet.matchId === currentMatchId;
    }
    return true;
  });

  const Content = (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#09173D] via-[#06112E] to-[#040A1D] border border-cyan-500/20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      {/* Top Header Tabs */}
      <div className="bg-[#0C1E4A] border-b border-cyan-500/20 p-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            onClick={() => setActivePanelTab('slip')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activePanelTab === 'slip'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-300'
                : 'text-slate-400 hover:text-white hover:bg-[#152754]'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Bet Slip</span>
            {items.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-cyan-300 font-black text-[10px] border border-cyan-400/40">
                {items.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActivePanelTab('my_bets')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activePanelTab === 'my_bets'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-300'
                : 'text-slate-400 hover:text-white hover:bg-[#152754]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>My Bets</span>
            {placedBets.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-500 text-white font-black text-[9px] shadow-[0_0_8px_rgba(168,85,247,0.5)]">
                {placedBets.length}
              </span>
            )}
          </button>
        </div>

        <button onClick={() => setIsOpenMobile(false)} className="lg:hidden text-slate-400 hover:text-white p-1 ml-2">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Real Wallet Balance Bar */}
      <div className="px-3.5 py-2 bg-gradient-to-r from-cyan-500/15 via-[#0C1E4A] to-blue-600/15 border-b border-cyan-500/20 flex items-center justify-between text-xs">
        <span className="font-extrabold text-slate-300 flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-cyan-400" /> Active Wallet
        </span>
        <span className="font-mono text-emerald-400 font-black text-sm drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
          ₹{Number(balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Feedback Alert Message */}
      {message && (
        <div
          className={`p-3 text-xs border-b font-extrabold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.2)]'
              : 'bg-red-500/20 border-red-500/30 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
          )}
          <span className="flex-1">{message.text}</span>
        </div>
      )}

      {/* TAB 1: BET SLIP (Selections) */}
      {activePanelTab === 'slip' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header Action Bar when items exist */}
          {items.length > 0 && (
            <div className="px-3 py-1.5 bg-[#071333] border-b border-cyan-500/20 flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-bold">Selections ({items.length})</span>
              <button
                onClick={onClearAll}
                className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[10px] font-extrabold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
            {items.length === 0 ? (
              <div className="py-14 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#0F224E] border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <Ticket className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-extrabold text-white">Your Bet Slip is Empty</h4>
                <p className="text-xs text-slate-400 max-w-[210px] mx-auto leading-relaxed">
                  Select an outcome odds button from any market card to add it to your slip.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.selectionId}
                  className="bg-gradient-to-br from-[#08173B] to-[#051029] border border-cyan-500/20 hover:border-cyan-400/50 rounded-xl p-3 space-y-2.5 shadow-md relative group transition-all"
                >
                  <button
                    onClick={() => onRemoveItem(item.selectionId)}
                    className="absolute top-2.5 right-2.5 text-slate-400 hover:text-red-400 transition-colors cursor-pointer p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div>
                    <div className="text-[10px] text-cyan-400 font-extrabold tracking-wider uppercase truncate pr-6">
                      {item.matchName} &bull; {item.marketName}
                    </div>
                    <div className="text-xs font-black text-white mt-0.5">{item.selectionName}</div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Odds:</span>
                      <span className="text-xs font-mono font-black text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                        {item.odds.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Stake:</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
                        <input
                          type="number"
                          min="1"
                          value={item.stake || ''}
                          onChange={(e) => onStakeChange(item.selectionId, parseFloat(e.target.value) || 0)}
                          placeholder="100"
                          className="w-24 pl-5 pr-2 py-1 bg-[#0A1A45] border border-cyan-500/30 focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(6,182,212,0.4)] rounded-lg text-xs font-mono font-black text-white text-right focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Stake Preset Buttons */}
                  <div className="flex items-center justify-end gap-1 pt-1">
                    {[100, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => onStakeChange(item.selectionId, (item.stake || 0) + amt)}
                        className="px-2 py-0.5 bg-[#0E2252] hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-cyan-500/30 rounded text-[9px] font-mono font-bold transition-all cursor-pointer"
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Calculation & Place Bet Action */}
          {items.length > 0 && (
            <div className="p-3.5 pb-24 lg:pb-3.5 bg-[#071333] border-t border-cyan-500/20 space-y-3 shrink-0 shadow-lg">
              <div className="space-y-1.5 text-xs bg-[#050E26] p-2.5 rounded-xl border border-white/5">
                <div className="flex justify-between text-slate-300 font-bold">
                  <span>Total Stake:</span>
                  <span className="font-mono text-white font-extrabold">₹{totalStake.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300 font-bold">
                  <span>Potential Return:</span>
                  <span className="font-mono text-emerald-400 font-black text-sm drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                    ₹{totalReturn.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>Est. Net Profit:</span>
                  <span className="font-mono text-cyan-300 font-bold">₹{totalProfit.toFixed(2)}</span>
                </div>
              </div>

              <button
                disabled={isSubmitting || totalStake <= 0}
                onClick={handlePlaceBet}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-emerald-500 to-teal-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98] uppercase tracking-wider"
              >
                <Ticket className="w-4 h-4 text-slate-950" />
                {isSubmitting ? 'Placing Bet...' : 'Place Bet'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY BETS (Placed Bet History) */}
      {activePanelTab === 'my_bets' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Filter Bar: This Match vs All Matches */}
          <div className="px-3 py-2 bg-[#09173D] border-b border-cyan-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setBetScopeFilter('this_match')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all ${
                  betScopeFilter === 'this_match'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'bg-[#10224D] text-slate-300 hover:text-white'
                }`}
              >
                This Match
              </button>
              <button
                onClick={() => setBetScopeFilter('all_matches')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all ${
                  betScopeFilter === 'all_matches'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'bg-[#10224D] text-slate-300 hover:text-white'
                }`}
              >
                All Matches ({placedBets.length})
              </button>
            </div>

            <button
              onClick={fetchPlacedBets}
              className="text-slate-400 hover:text-cyan-300 p-1 text-[11px] flex items-center gap-1 font-bold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
            {isLoadingHistory ? (
              <div className="py-10 text-center text-xs text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                <p className="font-bold text-cyan-300">Loading your bets...</p>
              </div>
            ) : filteredPlacedBets.length === 0 ? (
              <div className="py-14 text-center space-y-2">
                <History className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">
                  {betScopeFilter === 'this_match'
                    ? 'No bets placed on this match yet.'
                    : 'No bets placed yet.'}
                </p>
              </div>
            ) : (
              filteredPlacedBets.map((bet) => (
                <div
                  key={bet.id}
                  className="bg-gradient-to-br from-[#08173B] to-[#051029] border border-cyan-500/20 rounded-xl p-3 space-y-2 shadow-md text-xs"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="font-mono text-[11px] font-black text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.5)]">
                      {bet.betReference}
                    </span>
                    <span
                      className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        bet.status === 'WON'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                          : bet.status === 'LOST'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {bet.status}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide truncate">
                    {bet.match
                      ? `${bet.match.teamA?.shortName || bet.match.teamA?.name} vs ${bet.match.teamB?.shortName || bet.match.teamB?.name}`
                      : 'Cricket Match'}
                  </div>

                  <div className="space-y-1 bg-[#06112E] p-2 rounded-lg border border-white/5">
                    {bet.selections?.map((s: any) => (
                      <div key={s.id} className="flex justify-between items-center text-[11px]">
                        <span className="text-white font-extrabold truncate pr-2">
                          {s.marketName}: {s.selectionName}
                        </span>
                        <span className="font-mono text-cyan-300 shrink-0 font-black">
                          @{Number(s.oddsAtPlacement).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                    <span className="text-slate-400">
                      Stake: <strong className="text-white font-bold">₹{Number(bet.totalStake).toFixed(2)}</strong>
                    </span>
                    <span className="text-slate-400">
                      Pot. Return:{' '}
                      <strong className="text-emerald-400 font-black">
                        ₹{Number(bet.potentialReturn).toFixed(2)}
                      </strong>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Auto-open mobile bet slip when items are added
  useEffect(() => {
    if (items.length > 0 && typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsOpenMobile(true);
    }
  }, [items.length]);

  return (
    <>
      {/* Desktop Fixed Sidebar Panel */}
      <div className="hidden lg:block w-[360px] xl:w-96 shrink-0 h-full max-h-[calc(100vh-104px)] overflow-hidden">
        {Content}
      </div>

      {/* Mobile Floating Button */}
      {!isOpenMobile && (
        <button
          onClick={() => setIsOpenMobile(true)}
          className="lg:hidden fixed bottom-[76px] right-4 z-40 px-4 py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 text-slate-950 font-black text-xs rounded-full shadow-[0_0_25px_rgba(6,182,212,0.6)] flex items-center gap-2 cursor-pointer border border-cyan-300/80 active:scale-95 transition-all"
        >
          <Ticket className="w-4 h-4 text-slate-950" />
          <span className="tracking-wide">Bet Slip</span>
          {items.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-slate-950 text-cyan-300 font-black text-[10px] border border-cyan-400/40">
              {items.length}
            </span>
          )}
        </button>
      )}

      {/* Mobile Slide-over Drawer Modal */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-xl flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md h-[90vh] sm:h-[650px] max-h-[92vh] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col bg-[#050C20] border-t sm:border border-cyan-500/30">
            {/* Mobile Touch Drag Indicator */}
            <div className="w-12 h-1.5 bg-cyan-500/40 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />
            {Content}
          </div>
        </div>
      )}
    </>
  );
}
