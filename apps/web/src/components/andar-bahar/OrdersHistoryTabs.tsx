'use client';

import React, { useState } from 'react';

export interface OrderRecord {
  id?: string;
  period_number?: string;
  periodNumber?: string;
  bet_option?: string;
  betType?: string;
  selection?: string;
  bet_amount?: number | string;
  amount?: number | string;
  betAmount?: number | string;
  status?: string;
  win_amount?: number | string;
  winAmount?: number | string;
  created_at?: string;
  createdAt?: string;
  userEmail?: string;
  username?: string;
}

interface OrdersHistoryTabsProps {
  myOrders: OrderRecord[];
  everyoneOrders: OrderRecord[];
}

export const OrdersHistoryTabs: React.FC<OrdersHistoryTabsProps> = ({
  myOrders,
  everyoneOrders,
}) => {
  const [activeTab, setActiveTab] = useState<'my' | 'everyone'>('my');
  const [page, setPage] = useState<number>(1);
  const perPage = 8;

  const currentList = activeTab === 'my' ? myOrders : everyoneOrders;
  const totalItems = currentList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const pageRows = currentList.slice((page - 1) * perPage, page * perPage);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="bg-[#071735]/95 border-2 border-[#00D9FF]/50 rounded-[22px] p-3 sm:p-4 shadow-[0_0_25px_rgba(0,217,255,0.25)] backdrop-blur-2xl space-y-3">
      {/* Tab Switcher */}
      <div className="flex bg-[#0B1530] p-1 rounded-xl border border-[#287BFF]/30">
        <button
          onClick={() => {
            setActiveTab('my');
            setPage(1);
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'my'
              ? 'bg-gradient-to-r from-[#1677FF] to-[#00D9FF] text-[#03081B] shadow-[0_0_15px_rgba(0,217,255,0.5)]'
              : 'text-[#A5B4D0] hover:text-white'
          }`}
        >
          <i className="bi bi-person-fill text-xs" />
          <span>My Orders</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('everyone');
            setPage(1);
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'everyone'
              ? 'bg-gradient-to-r from-[#1677FF] to-[#00D9FF] text-[#03081B] shadow-[0_0_15px_rgba(0,217,255,0.5)]'
              : 'text-[#A5B4D0] hover:text-white'
          }`}
        >
          <i className="bi bi-people-fill text-xs" />
          <span>Everyone's Orders</span>
        </button>
      </div>

      {/* Orders Table (Desktop) / Cards (Mobile) */}
      <div className="overflow-x-auto min-h-[260px] flex flex-col justify-between">
        {totalItems === 0 ? (
          <p className="text-center text-xs text-[#8795B5] py-10 font-medium">No order history available.</p>
        ) : (
          <>
            {/* Desktop Table View */}
            <table className="w-full text-left text-xs font-mono border-collapse hidden sm:table">
              <thead className="text-[10px] text-[#A5B4D0] uppercase tracking-wider border-b border-[#243D66]">
                <tr>
                  <th className="py-2.5 px-2">PERIOD</th>
                  <th className="py-2.5 px-2">OPTION</th>
                  <th className="py-2.5 px-2">AMOUNT</th>
                  <th className="py-2.5 px-2">RESULT</th>
                  <th className="py-2.5 px-2">PAYOUT</th>
                  <th className="py-2.5 px-2 text-right">TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#F4F8FF]">
                {pageRows.map((row, idx) => {
                  const periodNum = row.period_number || row.periodNumber || `AB${idx}`;
                  const optionStr = (
                    row.bet_option ||
                    row.betType ||
                    row.selection ||
                    'andar'
                  ).toLowerCase();
                  const betAmt = Number(row.bet_amount || row.amount || row.betAmount || 0);
                  const winAmt = Number(row.win_amount || row.winAmount || 0);

                  const statusStr = (row.status || 'pending').toLowerCase();
                  const isWon = statusStr === 'won' || winAmt > 0;
                  const isPending = statusStr === 'pending';

                  let optionBadgeClass = 'bg-[#1677FF]/20 text-[#00D9FF] border-[#1677FF]/50';
                  if (optionStr === 'bahar') {
                    optionBadgeClass = 'bg-[#F4145B]/20 text-[#F13FA4] border-[#F4145B]/50';
                  } else if (optionStr === 'tie') {
                    optionBadgeClass = 'bg-[#FFC928]/20 text-[#FFC928] border-[#FFC928]/50';
                  }

                  return (
                    <tr key={row.id || idx} className="hover:bg-[#10254B]/60 transition-all">
                      <td className="py-2.5 px-2 font-bold text-white text-[11px]">
                        #{periodNum}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${optionBadgeClass}`}
                        >
                          {optionStr}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-bold text-[#A5B4D0]">
                        ₹{betAmt.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2">
                        {isPending ? (
                          <span className="bg-[#FFC928]/20 text-[#FFC928] border border-[#FFC928]/50 px-2 py-0.5 rounded-full font-extrabold text-[9px] shadow-[0_0_8px_rgba(255,201,40,0.3)]">
                            PENDING
                          </span>
                        ) : isWon ? (
                          <span className="bg-[#00E5A0]/20 text-[#00E5A0] border border-[#00E5A0]/50 px-2 py-0.5 rounded-full font-extrabold text-[9px] shadow-[0_0_8px_rgba(0,229,160,0.3)]">
                            WON
                          </span>
                        ) : (
                          <span className="bg-[#F4145B]/20 text-[#F4145B] border border-[#F4145B]/50 px-2 py-0.5 rounded-full font-extrabold text-[9px]">
                            LOST
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-black text-[#00E5A0]">
                        ₹{winAmt.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-[#8795B5] text-[10px]">
                        {formatTime(row.created_at || row.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Cards View */}
            <div className="space-y-2 sm:hidden">
              {pageRows.map((row, idx) => {
                const periodNum = row.period_number || row.periodNumber || `AB${idx}`;
                const optionStr = (
                  row.bet_option ||
                  row.betType ||
                  row.selection ||
                  'andar'
                ).toLowerCase();
                const betAmt = Number(row.bet_amount || row.amount || row.betAmount || 0);
                const winAmt = Number(row.win_amount || row.winAmount || 0);
                const statusStr = (row.status || 'pending').toLowerCase();
                const isWon = statusStr === 'won' || winAmt > 0;
                const isPending = statusStr === 'pending';

                return (
                  <div
                    key={row.id || idx}
                    className="bg-[#0B1530] border border-[#287BFF]/30 rounded-xl p-2.5 flex items-center justify-between font-mono text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-bold text-white text-[11px]">#{periodNum}</span>
                        <span className="text-[10px] uppercase font-bold text-[#00D9FF]">
                          ({optionStr})
                        </span>
                      </div>
                      <span className="text-[10px] text-[#8795B5]">
                        {formatTime(row.created_at || row.createdAt)}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5 mb-1">
                        <span className="text-xs font-bold text-[#A5B4D0]">₹{betAmt.toFixed(0)}</span>
                        {isPending ? (
                          <span className="bg-[#FFC928]/20 text-[#FFC928] border border-[#FFC928]/40 px-1.5 py-0.2 rounded-full font-bold text-[9px]">
                            PENDING
                          </span>
                        ) : isWon ? (
                          <span className="bg-[#00E5A0]/20 text-[#00E5A0] border border-[#00E5A0]/40 px-1.5 py-0.2 rounded-full font-bold text-[9px]">
                            +₹{winAmt.toFixed(0)}
                          </span>
                        ) : (
                          <span className="bg-[#F4145B]/20 text-[#F4145B] border border-[#F4145B]/40 px-1.5 py-0.2 rounded-full font-bold text-[9px]">
                            LOST
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="mt-3 pt-2 border-t border-[#243D66] flex items-center justify-between text-xs font-mono">
              <span className="text-[10px] text-[#8795B5]">
                Page {page} of {totalPages} ({totalItems} Total)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 rounded-lg bg-[#10254B] border border-[#287BFF]/40 text-[#00D9FF] text-[11px] font-bold hover:bg-[#172947] disabled:opacity-40 transition-all cursor-pointer"
                >
                  ‹ Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 rounded-lg bg-[#10254B] border border-[#287BFF]/40 text-[#00D9FF] text-[11px] font-bold hover:bg-[#172947] disabled:opacity-40 transition-all cursor-pointer"
                >
                  Next ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
