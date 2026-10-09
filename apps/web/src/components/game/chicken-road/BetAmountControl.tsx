'use client';

import React, { useState, useEffect } from 'react';
import { useChickenRoadStore } from '../../../store/chickenRoadStore';

export const BetAmountControl: React.FC = () => {
  const betAmount = useChickenRoadStore((s) => s.betAmount);
  const minBet = useChickenRoadStore((s) => s.minBet || 10);
  const maxBet = useChickenRoadStore((s) => s.maxBet || 100000);
  const setBetAmount = useChickenRoadStore((s) => s.setBetAmount);
  const currency = useChickenRoadStore((s) => s.currency);
  const status = useChickenRoadStore((s) => s.status);

  const isDisabled = status === 'RUNNING' || status === 'MOVING';
  const symbol = currency === 'INR' ? '₹' : currency;

  const [inputVal, setInputVal] = useState(betAmount.toString());

  useEffect(() => {
    setInputVal(betAmount.toString());
  }, [betAmount]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputVal(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= minBet && parsed <= maxBet) {
      setBetAmount(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(inputVal);
    if (isNaN(parsed) || parsed < minBet) {
      setBetAmount(minBet);
      setInputVal(minBet.toString());
    } else if (parsed > maxBet) {
      setBetAmount(maxBet);
      setInputVal(maxBet.toString());
    } else {
      setBetAmount(parsed);
      setInputVal(parsed.toString());
    }
  };

  // Generate dynamic preset chips based on minBet and maxBet
  const generatePresets = () => {
    if (minBet <= 2 && maxBet >= 20) return [2, 3, 8, 20];
    if (minBet <= 10 && maxBet >= 500) return [10, 50, 100, 500];

    const step1 = minBet;
    const step2 = Math.min(maxBet, Math.round(minBet * 2));
    const step3 = Math.min(maxBet, Math.round(minBet * 5));
    const step4 = Math.min(maxBet, Math.round(minBet * 10));

    const unique = Array.from(new Set([step1, step2, step3, step4])).filter((x) => x <= maxBet);
    if (unique.length >= 4) return unique.slice(0, 4);
    return [minBet, Math.min(maxBet, minBet + 10), Math.min(maxBet, minBet + 50), maxBet];
  };

  const presets = generatePresets();

  return (
    <div className="flex flex-col justify-between w-full h-full min-w-0">
      {/* Top Row: [ MIN ]  Input Value  [ MAX ] */}
      <div className="flex items-center justify-between bg-[#353843] border border-[#424654] rounded-xl p-1.5 sm:p-2 shadow-inner h-13 sm:h-14 md:h-16 lg:h-[72px] w-full min-w-0">
        <button
          onClick={() => {
            setBetAmount(minBet);
            setInputVal(minBet.toString());
          }}
          disabled={isDisabled || betAmount <= minBet}
          className="bg-[#484c5a] hover:bg-[#555a6c] text-white font-extrabold text-xs sm:text-sm md:text-base lg:text-lg uppercase tracking-wider px-3 sm:px-4 md:px-5 lg:px-6 h-full rounded-lg disabled:opacity-30 transition-all active:scale-95 cursor-pointer flex items-center justify-center select-none shrink-0"
        >
          MIN
        </button>

        <div className="flex items-center justify-center px-2 flex-1 min-w-0 h-full">
          <input
            type="number"
            min={minBet}
            max={maxBet}
            disabled={isDisabled}
            value={inputVal}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-full bg-transparent text-center font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white font-mono tracking-wide focus:outline-none rounded cursor-text disabled:opacity-50 min-w-0"
          />
          <span className="text-slate-300 font-extrabold text-base sm:text-lg md:text-xl lg:text-2xl ml-1 select-none shrink-0">{symbol}</span>
        </div>

        <button
          onClick={() => {
            setBetAmount(maxBet);
            setInputVal(maxBet.toString());
          }}
          disabled={isDisabled || betAmount >= maxBet}
          className="bg-[#484c5a] hover:bg-[#555a6c] text-white font-extrabold text-xs sm:text-sm md:text-base lg:text-lg uppercase tracking-wider px-3 sm:px-4 md:px-5 lg:px-6 h-full rounded-lg disabled:opacity-30 transition-all active:scale-95 cursor-pointer flex items-center justify-center select-none shrink-0"
        >
          MAX
        </button>
      </div>

      {/* Bottom Row: Quick Preset Pills */}
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5 mt-3 sm:mt-3.5 w-full min-w-0">
        {presets.map((amt) => (
          <button
            key={amt}
            onClick={() => {
              setBetAmount(amt);
              setInputVal(amt.toString());
            }}
            disabled={isDisabled}
            className={`h-11 sm:h-12 md:h-14 lg:h-[58px] bg-[#353843] hover:bg-[#484c5a] border border-[#424654] rounded-xl text-xs sm:text-sm md:text-base lg:text-lg font-extrabold transition-all flex items-center justify-center ${
              betAmount === amt ? 'bg-[#4d5262] text-white border-slate-300 shadow-md' : 'text-slate-200'
            } disabled:opacity-30 active:scale-95 cursor-pointer select-none min-w-0 truncate`}
          >
            {amt} {symbol}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BetAmountControl;
