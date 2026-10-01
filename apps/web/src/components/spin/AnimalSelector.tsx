'use client';

import React from 'react';
import { SectorColor, WheelSector } from './types';
import { UNIQUE_WHEEL_NUMBERS } from './sectors';

interface AnimalSelectorProps {
  betCategory: 'color' | 'number';
  selectedColor: SectorColor;
  selectedNumObj: WheelSector | null;
  onSelectCategory: (cat: 'color' | 'number') => void;
  onSelectColor: (color: SectorColor) => void;
  onSelectNumber: (num: WheelSector) => void;
  onPlaySound?: () => void;
}

export const AnimalSelector: React.FC<AnimalSelectorProps> = ({
  betCategory,
  selectedColor,
  selectedNumObj,
  onSelectCategory,
  onSelectColor,
  onSelectNumber,
  onPlaySound,
}) => {
  return (
    <div className="bg-[#0b1424] border border-[#1c2d4a] rounded-3xl p-3 sm:p-4 space-y-3 shadow-xl">
      {/* Category Switcher Tabs */}
      <div className="flex items-center bg-[#15243b] p-1 rounded-2xl border border-[#273d61]">
        <button
          type="button"
          onClick={() => {
            onSelectCategory('color');
            if (onPlaySound) onPlaySound();
          }}
          className={`flex-1 py-2 text-xs font-mono font-black rounded-xl transition-all ${
            betCategory === 'color'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md scale-101'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🎨 ANIMAL CARDS (2x • 18x • 50x)
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectCategory('number');
            if (!selectedNumObj) onSelectNumber(UNIQUE_WHEEL_NUMBERS[0]);
            if (onPlaySound) onPlaySound();
          }}
          className={`flex-1 py-2 text-xs font-mono font-black rounded-xl transition-all ${
            betCategory === 'number'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md scale-101'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🔢 NUMBERS GRID (0 - 36)
        </button>
      </div>

      {/* ANIMAL CARDS SELECTOR */}
      {betCategory === 'color' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {/* Elephant Card */}
          <button
            type="button"
            onClick={() => {
              onSelectColor('green');
              if (onPlaySound) onPlaySound();
            }}
            className={`relative p-2.5 sm:p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
              selectedColor === 'green'
                ? 'bg-gradient-to-b from-[#10b981]/25 to-[#046c4e]/50 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-103 ring-2 ring-emerald-400/40 z-10'
                : 'bg-[#15243b] border-[#273d61] text-emerald-400 hover:border-emerald-500/60 hover:bg-[#1c2d4a]'
            }`}
          >
            {selectedColor === 'green' && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black flex items-center justify-center shadow-md">
                ✓
              </div>
            )}
            <img
              src="/images/elephant_avatar.png"
              alt="Elephant"
              className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl object-cover shadow-md border-2 border-emerald-400/80 shrink-0"
            />
            <div className="text-center min-w-0 w-full">
              <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase block truncate text-emerald-300">
                ELEPHANT
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400/90 block">
                GREEN • 2x
              </span>
            </div>
          </button>

          {/* Lion Card */}
          <button
            type="button"
            onClick={() => {
              onSelectColor('yellow');
              if (onPlaySound) onPlaySound();
            }}
            className={`relative p-2.5 sm:p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
              selectedColor === 'yellow'
                ? 'bg-gradient-to-b from-[#f59e0b]/25 to-[#b45309]/50 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-103 ring-2 ring-amber-400/40 z-10'
                : 'bg-[#15243b] border-[#273d61] text-amber-400 hover:border-amber-500/60 hover:bg-[#1c2d4a]'
            }`}
          >
            {selectedColor === 'yellow' && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center shadow-md">
                ✓
              </div>
            )}
            <img
              src="/images/lion_avatar.png"
              alt="Lion"
              className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl object-cover shadow-md border-2 border-amber-400/80 shrink-0"
            />
            <div className="text-center min-w-0 w-full">
              <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase block truncate text-amber-300">
                LION
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-400/90 block">
                YELLOW • 2x
              </span>
            </div>
          </button>

          {/* Bull Card */}
          <button
            type="button"
            onClick={() => {
              onSelectColor('red');
              if (onPlaySound) onPlaySound();
            }}
            className={`relative p-2.5 sm:p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
              selectedColor === 'red'
                ? 'bg-gradient-to-b from-[#ef4444]/25 to-[#991b1b]/50 border-rose-400 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-103 ring-2 ring-rose-400/40 z-10'
                : 'bg-[#15243b] border-[#273d61] text-rose-400 hover:border-rose-500/60 hover:bg-[#1c2d4a]'
            }`}
          >
            {selectedColor === 'red' && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-400 text-slate-950 text-[10px] font-black flex items-center justify-center shadow-md">
                ✓
              </div>
            )}
            <img
              src="/images/bull_avatar.png"
              alt="Bull"
              className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl object-cover shadow-md border-2 border-rose-400/80 shrink-0"
            />
            <div className="text-center min-w-0 w-full">
              <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase block truncate text-rose-300">
                BULL
              </span>
              <span className="text-[10px] font-mono font-bold text-rose-400/90 block">
                RED • 18x
              </span>
            </div>
          </button>

          {/* Gold Crown Option (Hidden on tiny screens or shown in 4-col grid) */}
          <button
            type="button"
            onClick={() => {
              onSelectColor('gold');
              if (onPlaySound) onPlaySound();
            }}
            className={`relative p-2.5 sm:p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer col-span-3 sm:col-span-1 ${
              selectedColor === 'gold'
                ? 'bg-gradient-to-b from-[#fbbf24]/30 to-[#b45309]/60 border-yellow-300 shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-103 ring-2 ring-yellow-300/50 z-10'
                : 'bg-[#15243b] border-[#273d61] text-amber-300 hover:border-amber-400/60 hover:bg-[#1c2d4a]'
            }`}
          >
            {selectedColor === 'gold' && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-yellow-300 text-slate-950 text-[10px] font-black flex items-center justify-center shadow-md">
                ✓
              </div>
            )}
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-2xl shadow-md border-2 border-yellow-200 shrink-0">
              👑
            </div>
            <div className="text-center min-w-0 w-full">
              <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase block truncate text-yellow-300">
                GOLD
              </span>
              <span className="text-[10px] font-mono font-bold text-yellow-200 block">
                CROWN • 50x
              </span>
            </div>
          </button>
        </div>
      ) : (
        /* NUMBERS GRID SELECTOR */
        <div className="space-y-2">
          <div className="text-[11px] font-mono font-bold text-slate-400 flex items-center justify-between px-1">
            <span>SELECT SECTOR NUMBER:</span>
            <span className="text-amber-400">
              {selectedNumObj
                ? `SELECTED: #${selectedNumObj.label} (${selectedNumObj.multiplier}x)`
                : 'PICK A NUMBER'}
            </span>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5 max-h-36 overflow-y-auto p-1 scrollbar-thin">
            {UNIQUE_WHEEL_NUMBERS.map((item) => {
              const bgClass =
                item.color === 'red'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : item.color === 'green'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : item.color === 'yellow'
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  : 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950';

              const isSelected = selectedNumObj?.label === item.label;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    onSelectNumber(item);
                    if (onPlaySound) onPlaySound();
                  }}
                  className={`py-2 rounded-xl font-mono font-black text-xs transition-all flex flex-col items-center justify-center border cursor-pointer ${bgClass} ${
                    isSelected
                      ? 'ring-4 ring-white shadow-xl scale-105 border-white z-10'
                      : 'border-transparent opacity-85 hover:opacity-100'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-[9px] opacity-90 font-bold">
                    {item.multiplier}x
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
