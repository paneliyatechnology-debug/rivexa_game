'use client';

import React, { useState } from 'react';
import { IScorecard } from '@gaming-platform/types';
import { UserCheck, Shield } from 'lucide-react';

export function ScorecardView({ scorecard }: { scorecard?: IScorecard | null }) {
  const [activeInnings, setActiveInnings] = useState<'1' | '2'>('1');

  if (!scorecard || !scorecard.data) {
    return (
      <div className="bg-[#0A1633] p-8 rounded-2xl border border-white/10 text-center text-[#7183A8]">
        No detailed scorecard available yet for this match.
      </div>
    );
  }

  const firstInnings = scorecard.data.firstInnings;
  const secondInnings = scorecard.data.secondInnings;

  const currentData = activeInnings === '1' ? firstInnings : secondInnings;

  return (
    <div className="space-y-6">
      {/* Innings Selector */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {firstInnings && (
          <button
            onClick={() => setActiveInnings('1')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeInnings === '1'
                ? 'bg-[#287BFF] text-white shadow-md'
                : 'bg-[#0E1C3E] text-[#B8C7E6] hover:text-white'
            }`}
          >
            {firstInnings.teamName} Innings ({firstInnings.totalRuns}/{firstInnings.wickets})
          </button>
        )}
        {secondInnings && (
          <button
            onClick={() => setActiveInnings('2')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeInnings === '2'
                ? 'bg-[#287BFF] text-white shadow-md'
                : 'bg-[#0E1C3E] text-[#B8C7E6] hover:text-white'
            }`}
          >
            {secondInnings.teamName} Innings ({secondInnings.totalRuns}/{secondInnings.wickets})
          </button>
        )}
      </div>

      {currentData ? (
        <div className="space-y-6">
          {/* Batting Table */}
          <div className="bg-[#08132E] border border-white/10 rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-[#0E1C3E] px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#00E5A0]" />
                Batting - {currentData.teamName}
              </h3>
              <span className="text-xs font-mono text-[#00D9FF] font-bold">
                {currentData.totalRuns}/{currentData.wickets} ({currentData.overs} Overs)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#050C20] text-[#7183A8] border-b border-white/5 uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-4">Batsman</th>
                    <th className="py-2.5 px-4 hidden md:table-cell">Dismissal</th>
                    <th className="py-2.5 px-2 text-right">R</th>
                    <th className="py-2.5 px-2 text-right">B</th>
                    <th className="py-2.5 px-2 text-right">4s</th>
                    <th className="py-2.5 px-2 text-right">6s</th>
                    <th className="py-2.5 px-3 text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentData.batting.map((b: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        {b.batsmanName}
                        {b.isCaptain && <span className="text-[10px] text-amber-400 font-bold ml-1">(c)</span>}
                        {b.isWicketKeeper && <span className="text-[10px] text-cyan-400 font-bold ml-1">(wk)</span>}
                        <div className="text-[11px] text-[#7183A8] font-normal md:hidden mt-0.5">
                          {b.dismissal}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#7183A8] text-xs hidden md:table-cell">{b.dismissal}</td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-[#00E5A0]">{b.runs}</td>
                      <td className="py-3 px-2 text-right font-mono text-[#B8C7E6]">{b.balls}</td>
                      <td className="py-3 px-2 text-right font-mono text-[#B8C7E6]">{b.fours}</td>
                      <td className="py-3 px-2 text-right font-mono text-[#B8C7E6]">{b.sixes}</td>
                      <td className="py-3 px-3 text-right font-mono text-[#00D9FF] font-semibold">
                        {b.strikeRate.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Extras & Total */}
            <div className="bg-[#050C20] px-4 py-3 border-t border-white/10 flex flex-wrap justify-between items-center text-xs text-[#B8C7E6] gap-2">
              <div>
                <span className="font-bold text-white">Extras:</span> {currentData.extras?.total || 0} (w{' '}
                {currentData.extras?.wides || 0}, nb {currentData.extras?.noBalls || 0}, b {currentData.extras?.byes || 0}, lb{' '}
                {currentData.extras?.legByes || 0})
              </div>
              <div className="font-mono text-sm font-black text-white">
                Total: <span className="text-[#00E5A0]">{currentData.totalRuns}</span> ({currentData.wickets} wkts, {currentData.overs} ov)
              </div>
            </div>
          </div>

          {/* Bowling Table */}
          <div className="bg-[#08132E] border border-white/10 rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-[#0E1C3E] px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#287BFF]" />
                Bowling
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#050C20] text-[#7183A8] border-b border-white/5 uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-4">Bowler</th>
                    <th className="py-2.5 px-2 text-right">O</th>
                    <th className="py-2.5 px-2 text-right">M</th>
                    <th className="py-2.5 px-2 text-right">R</th>
                    <th className="py-2.5 px-2 text-right">W</th>
                    <th className="py-2.5 px-3 text-right">Econ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentData.bowling.map((bw: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{bw.bowlerName}</td>
                      <td className="py-3 px-2 text-right font-mono text-[#B8C7E6]">{bw.overs}</td>
                      <td className="py-3 px-2 text-right font-mono text-[#B8C7E6]">{bw.maidens}</td>
                      <td className="py-3 px-2 text-right font-mono text-[#B8C7E6]">{bw.runsConceded}</td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-amber-400">{bw.wickets}</td>
                      <td className="py-3 px-3 text-right font-mono text-[#00D9FF] font-semibold">
                        {bw.economy.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-[#7183A8]">Innings data not recorded.</div>
      )}
    </div>
  );
}
