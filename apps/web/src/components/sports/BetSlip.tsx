'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { IMarketSelection, ICricketMarketData } from './MarketCardView';
import { getApiBaseUrl } from '@/lib/config';
import { Ticket, Trash2, ShieldAlert, CheckCircle, X, Sparkles, Coins, History, Clock, RefreshCw } from 'lucide-react';

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
  const [activePanelTab, setActivePanelTab] = useState<'slip' | 'my_bets'>('slip');
  const [betScopeFilter, setBetScopeFilter] = useState<'this_match' | 'all_matches'>('this_match');

  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // My Bets History State
  const [placedBets, setPlacedBets] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const virtualBalance = 10000;

  const totalStake = items.reduce((sum, item) => sum + (Number(item.stake) || 0), 0);
  const totalReturn = items.reduce((sum, item) => sum + (Number(item.stake) || 0) * item.odds, 0);
  const totalProfit = totalReturn - totalStake;

  const fetchPlacedBets = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/cricket/test-bets/history`);
      if (res.ok) {
        const json = await res.json();
        setPlacedBets(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchPlacedBets();
  }, [fetchPlacedBets]);

  const handlePlaceTestBet = async () => {
    if (items.length === 0) return;
    if (totalStake <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid test stake amount.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const payload = {
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
        await fetchPlacedBets();
        setTimeout(() => {
          setActivePanelTab('my_bets');
          setMessage(null);
        }, 1200);
      } else {
        setMessage({ type: 'error', text: json.message || 'Failed to place test bet.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Network error placing test bet.' });
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
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0B1838] via-[#08132E] to-[#050C20] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Header Tabs */}
      <div className="bg-[#0C1A3E] border-b border-white/10 p-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            onClick={() => setActivePanelTab('slip')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activePanelTab === 'slip'
                ? 'bg-[#287BFF] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#152754]'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Bet Slip</span>
            {items.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#00E5A0] text-slate-950 font-black text-[9px]">
                {items.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActivePanelTab('my_bets')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activePanelTab === 'my_bets'
                ? 'bg-[#287BFF] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#152754]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>My Bets</span>
            {placedBets.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-500 text-white font-black text-[9px]">
                {placedBets.length}
              </span>
            )}
          </button>
        </div>

        <button onClick={() => setIsOpenMobile(false)} className="lg:hidden text-slate-400 hover:text-white p-1 ml-2">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Badge & Virtual Balance */}
      <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[11px]">
        <span className="font-bold text-amber-300 flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> TEST MODE
        </span>
        <span className="font-mono text-slate-300 flex items-center gap-1">
          <Coins className="w-3.5 h-3.5 text-amber-400" /> ₹{virtualBalance.toLocaleString()} Credits
        </span>
      </div>

      {/* Feedback Alert Message */}
      {message && (
        <div
          className={`p-3 text-xs border-b font-medium flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/20 border-red-500/30 text-red-300'
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
          <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
            {items.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#101F42] text-[#7183A8] flex items-center justify-center mx-auto">
                  <Ticket className="w-6 h-6" />
                </div>
                <p className="text-xs text-[#7183A8] max-w-[200px] mx-auto">
                  Select an outcome odds button from any market card to add it to your slip.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.selectionId}
                  className="bg-[#061026] border border-white/10 rounded-xl p-3 space-y-2.5 shadow-md relative"
                >
                  <button
                    onClick={() => onRemoveItem(item.selectionId)}
                    className="absolute top-2.5 right-2.5 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold truncate pr-5">
                      {item.matchName} &bull; {item.marketName}
                    </div>
                    <div className="text-xs font-bold text-white mt-0.5">{item.selectionName}</div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Odds:</span>
                      <span className="text-xs font-mono font-black text-[#00E5A0]">
                        {item.odds.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Stake:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.stake || ''}
                        onChange={(e) => onStakeChange(item.selectionId, parseFloat(e.target.value) || 0)}
                        placeholder="100"
                        className="w-20 px-2 py-1 bg-[#101F42] border border-white/10 rounded-lg text-xs font-mono font-bold text-white text-right focus:outline-none focus:border-[#00E5A0]"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Calculation & Place Bet Button */}
          {items.length > 0 && (
            <div className="p-3.5 pb-24 lg:pb-3.5 bg-[#07112A] border-t border-white/10 space-y-3 shrink-0">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Total Stake:</span>
                  <span className="font-mono text-white font-bold">₹{totalStake.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Potential Return:</span>
                  <span className="font-mono text-[#00E5A0] font-extrabold">
                    ₹{totalReturn.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Est. Net Profit:</span>
                  <span className="font-mono text-[#00D9FF]">₹{totalProfit.toFixed(2)}</span>
                </div>
              </div>

              <button
                disabled={isSubmitting || totalStake <= 0}
                onClick={handlePlaceTestBet}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                {isSubmitting ? 'Placing Test Bet...' : 'Place Test Bet (Virtual)'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY BETS (Placed Bet History) */}
      {activePanelTab === 'my_bets' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Filter Bar: This Match vs All Matches */}
          <div className="px-3 py-2 bg-[#091533] border-b border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setBetScopeFilter('this_match')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  betScopeFilter === 'this_match'
                    ? 'bg-[#287BFF] text-white'
                    : 'bg-[#101F42] text-slate-400 hover:text-white'
                }`}
              >
                This Match
              </button>
              <button
                onClick={() => setBetScopeFilter('all_matches')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  betScopeFilter === 'all_matches'
                    ? 'bg-[#287BFF] text-white'
                    : 'bg-[#101F42] text-slate-400 hover:text-white'
                }`}
              >
                All Matches ({placedBets.length})
              </button>
            </div>

            <button
              onClick={fetchPlacedBets}
              className="text-slate-400 hover:text-white p-1 text-[11px] flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
            {isLoadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <div className="w-5 h-5 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p>Loading your bets...</p>
              </div>
            ) : filteredPlacedBets.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <History className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  {betScopeFilter === 'this_match'
                    ? 'No bets placed on this match yet.'
                    : 'No test bets placed yet.'}
                </p>
              </div>
            ) : (
              filteredPlacedBets.map((bet) => (
                <div
                  key={bet.id}
                  className="bg-[#061026] border border-white/10 rounded-xl p-3 space-y-2 shadow-md text-xs"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="font-mono text-[11px] font-bold text-[#00E5A0]">
                      {bet.betReference}
                    </span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                        bet.status === 'WON'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : bet.status === 'LOST'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {bet.status}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 truncate">
                    {bet.match
                      ? `${bet.match.teamA?.shortName || bet.match.teamA?.name} vs ${bet.match.teamB?.shortName || bet.match.teamB?.name}`
                      : 'Cricket Match'}
                  </div>

                  <div className="space-y-1 bg-[#0A1633] p-2 rounded-lg border border-white/5">
                    {bet.selections?.map((s: any) => (
                      <div key={s.id} className="flex justify-between items-center text-[11px]">
                        <span className="text-white font-bold truncate pr-2">
                          {s.marketName}: {s.selectionName}
                        </span>
                        <span className="font-mono text-[#00D9FF] shrink-0 font-bold">
                          @{Number(s.oddsAtPlacement).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                    <span className="text-slate-400">
                      Stake: <strong className="text-white">₹{Number(bet.totalStake).toFixed(2)}</strong>
                    </span>
                    <span className="text-slate-400">
                      Pot. Return:{' '}
                      <strong className="text-[#00E5A0]">
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
      {/* Desktop Sticky Sidebar Panel */}
      <div className="hidden lg:block w-80 shrink-0 sticky top-20 h-[calc(100vh-100px)]">
        {Content}
      </div>

      {/* Mobile Floating Button */}
      {!isOpenMobile && (
        <button
          onClick={() => setIsOpenMobile(true)}
          className="lg:hidden fixed bottom-[76px] right-4 z-40 px-4 py-3 bg-gradient-to-r from-[#287BFF] to-[#00D9FF] text-white text-xs font-black rounded-full shadow-2xl flex items-center gap-2 cursor-pointer animate-bounce border border-white/20 active:scale-95 transition-transform"
        >
          <Ticket className="w-4 h-4" />
          <span>Bet Slip</span>
          {items.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#00E5A0] text-slate-950 font-black text-[10px]">
              {items.length}
            </span>
          )}
        </button>
      )}

      {/* Mobile Slide-over Drawer Modal */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md h-[88vh] sm:h-[650px] max-h-[90vh] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col bg-[#050C20] border-t sm:border border-white/10">
            {/* Mobile Pull Indicator */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-2 shrink-0 sm:hidden" />
            {Content}
          </div>
        </div>
      )}
    </>
  );
}
