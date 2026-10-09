'use client';

import React from 'react';
import { SpinColor } from './types';

interface ColorSelectorProps {
  selectedColor: SpinColor;
  onSelectColor: (color: SpinColor) => void;
  disabled: boolean;
}

export function ColorSelector({
  selectedColor,
  onSelectColor,
  disabled,
}: ColorSelectorProps) {
  const options: Array<{
    color: SpinColor;
    label: string;
    multiplier: string;
    slots: string;
    dotColor: string;
    activeBorder: string;
    activeBg: string;
    activeShadow: string;
    textColor: string;
    underLight: string;
  }> = [
    {
      color: 'green',
      label: 'GREEN',
      multiplier: '1.90x',
      slots: '11 SLOTS',
      dotColor: 'bg-[#00E5A0]',
      activeBorder: 'border-2 border-[#00E5A0]',
      activeBg: 'bg-gradient-to-b from-[#00E5A0]/30 to-[#00A86B]/25',
      activeShadow: 'shadow-[0_0_25px_rgba(0,229,160,0.5),inset_0_0_12px_rgba(0,229,160,0.25)]',
      textColor: 'text-[#00E5A0]',
      underLight: 'bg-[#00E5A0]/50 shadow-[0_0_16px_#00E5A0]',
    },
    {
      color: 'blue',
      label: 'BLUE',
      multiplier: '1.90x',
      slots: '11 SLOTS',
      dotColor: 'bg-[#00D9FF]',
      activeBorder: 'border-2 border-[#00D9FF]',
      activeBg: 'bg-gradient-to-b from-[#00D9FF]/30 to-[#0077FF]/25',
      activeShadow: 'shadow-[0_0_25px_rgba(0,217,255,0.5),inset_0_0_12px_rgba(0,217,255,0.25)]',
      textColor: 'text-[#00D9FF]',
      underLight: 'bg-[#00D9FF]/50 shadow-[0_0_16px_#00D9FF]',
    },
    {
      color: 'red',
      label: 'RED',
      multiplier: '9.50x',
      slots: '2 SLOTS',
      dotColor: 'bg-[#FF2468]',
      activeBorder: 'border-2 border-[#FF2468]',
      activeBg: 'bg-gradient-to-b from-[#FF2468]/30 to-[#C70039]/25',
      activeShadow: 'shadow-[0_0_25px_rgba(255,36,104,0.6),inset_0_0_12px_rgba(255,36,104,0.25)]',
      textColor: 'text-[#FF2468]',
      underLight: 'bg-[#FF2468]/60 shadow-[0_0_18px_#FF2468]',
    },
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] sm:text-xs font-black uppercase text-[#9DB5D8] tracking-wider flex items-center gap-1.5">
          <span>🎨</span>
          <span>SELECT COLOR</span>
        </label>
        <span className="text-[10px] font-mono font-bold text-[#7285AE]">
          1 Pick Only
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {options.map((opt) => {
          const isSelected = selectedColor === opt.color;

          return (
            <button
              key={opt.color}
              type="button"
              disabled={disabled}
              onClick={() => onSelectColor(opt.color)}
              className={`relative rounded-xl py-1.5 sm:py-2 px-1 sm:px-2 border transition-all duration-200 cursor-pointer text-center flex flex-col items-center justify-center gap-0.5 sm:gap-1 select-none ${
                isSelected
                  ? `${opt.activeBorder} ${opt.activeBg} ${opt.activeShadow} scale-[1.03] z-10 ring-1 ring-white/30`
                  : 'bg-[#091735]/75 border-white/10 hover:border-white/30 hover:bg-[#0B1E4A]/85 opacity-90'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
            >
              {/* Luminous underside light bar when selected */}
              {isSelected && (
                <div
                  className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-1.5 rounded-full blur-xs pointer-events-none ${opt.underLight}`}
                />
              )}

              {/* Selected indicator check badge */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white text-[#06122E] flex items-center justify-center text-[9px] font-black shadow-[0_0_8px_rgba(255,255,255,0.85)]">
                  ✓
                </div>
              )}

              {/* Glowing color dot + Name */}
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${opt.dotColor} shadow-md shrink-0`} />
                <span className={`text-[11px] sm:text-xs md:text-sm font-black font-mono tracking-wider ${opt.textColor}`}>
                  {opt.label}
                </span>
              </div>

              {/* Multiplier and Slot count */}
              <div className="flex items-center gap-1 flex-wrap justify-center">
                <span className="text-[11px] sm:text-xs font-black font-mono text-white">
                  {opt.multiplier}
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono text-[#7285AE] bg-black/30 px-1 py-0.2 rounded">
                  {opt.slots}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
