'use client';

import React, { useState, useEffect } from 'react';
import { useChickenRoadStore } from '../../../store/chickenRoadStore';

export const BetAmountControl: React.FC = () => {
  const betAmount = useChickenRoadStore((s) => s.betAmount);
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
    if (!isNaN(parsed) && parsed > 0) {
      setBetAmount(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(inputVal);
    if (isNaN(parsed) || parsed < 1) {
      setBetAmount(1);
      setInputVal('1');
    } else if (parsed > 100000) {
      setBetAmount(100000);
      setInputVal('100000');
    }
  };

  const presets = [2, 3, 8, 20];

  return (
    <div className="flex flex-col gap-12 w-full">
      {/* Top Row: [ MIN ]  Input Value  [ MAX ] */}
      <div className="grid grid-cols-12 gap-2 bg-[#1b1e24] border border-[#323642] rounded-xl sm:rounded-2xl p-2 shadow-inner items-center h-12 sm:h-14">
        <button
          onClick={() => setBetAmount(1)}
          disabled={isDisabled || betAmount <= 1}
          className="col-span-3 h-full bg-[#2c303b] hover:bg-[#393e4d] text-slate-300 font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-lg sm:rounded-xl disabled:opacity-30 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
        >
          MIN
        </button>

        <div className="col-span-6 flex items-center justify-center px-2 h-full">
          <input
            type="number"
            min={1}
            max={100000}
            disabled={isDisabled}
            value={inputVal}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-full bg-transparent text-center font-black text-xl sm:text-2xl text-white font-mono tracking-wide focus:outline-none focus:bg-slate-700/40 rounded py-0.5 cursor-text disabled:opacity-50"
          />
          <span className="text-slate-400 font-extrabold text-base sm:text-lg ml-1 select-none">{symbol}</span>
        </div>

        <button
          onClick={() => setBetAmount(1000)}
          disabled={isDisabled}
          className="col-span-3 h-full bg-[#2c303b] hover:bg-[#393e4d] text-slate-300 font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-lg sm:rounded-xl disabled:opacity-30 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
        >
          MAX
        </button>
      </div>

      {/* Bottom Row: Quick Preset Pills [ 2 ₹ ] [ 3 ₹ ] [ 8 ₹ ] [ 20 ₹ ] */}
      <div className="grid grid-cols-4 gap-2">
        {presets.map((amt) => (
          <button
            key={amt}
            onClick={() => setBetAmount(amt)}
            disabled={isDisabled}
            className={`h-9 sm:h-11 bg-[#1b1e24] hover:bg-[#2c303b] border border-[#323642] rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center ${
              betAmount === amt ? 'bg-[#3b404f] text-white border-slate-400 shadow-md' : 'text-slate-300'
            } disabled:opacity-30 active:scale-95 cursor-pointer`}
          >
            {amt} {symbol}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BetAmountControl;
