'use client';

import React from 'react';

interface AndarBaharRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndarBaharRulesModal: React.FC<AndarBaharRulesModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#071735] border-2 border-[#00D9FF]/60 rounded-[28px] max-w-md w-full p-5 sm:p-6 text-white space-y-4 shadow-[0_0_50px_rgba(0,217,255,0.4)] animate-in fade-in zoom-in-95 relative overflow-hidden">
        {/* Top Glow Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00D9FF] to-transparent shadow-[0_0_15px_#00D9FF]" />

        <div className="flex items-center justify-between border-b border-[#243D66] pb-3">
          <h3 className="text-base sm:text-lg font-black text-[#00D9FF] flex items-center gap-2 drop-shadow-[0_0_10px_#00D9FF]">
            <span>📖</span> Andar Bahar Rules & How to Play
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#10254B] border border-[#287BFF]/30 text-[#A5B4D0] hover:text-white flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-[#F4F8FF] leading-relaxed max-h-[60vh] overflow-y-auto pr-1 font-sans">
          <div className="bg-[#0B1530] p-3 rounded-xl border border-[#287BFF]/30 space-y-1.5">
            <h4 className="font-extrabold text-[#00D9FF] uppercase text-xs">1. Game Overview</h4>
            <p className="text-[#A5B4D0]">
              Andar Bahar is a traditional game played with a single 52-card deck. A central Joker card (Open Card) is revealed at the start of each period.
            </p>
          </div>

          <div className="bg-[#0B1530] p-3 rounded-xl border border-[#287BFF]/30 space-y-1.5">
            <h4 className="font-extrabold text-[#00D9FF] uppercase text-xs">2. Card Dealing Process</h4>
            <p className="text-[#A5B4D0]">
              Cards are dealt one by one alternatingly to the <strong>ANDAR</strong> and <strong>BAHAR</strong> sides until a card with the matching rank of the Open Card appears!
            </p>
          </div>

          <div className="bg-[#0B1530] p-3 rounded-xl border border-[#287BFF]/30 space-y-1.5">
            <h4 className="font-extrabold text-[#00D9FF] uppercase text-xs">3. Payout Multipliers</h4>
            <ul className="list-disc pl-4 space-y-1 text-[#A5B4D0]">
              <li><strong className="text-[#1677FF]">ANDAR:</strong> Pays <strong>2.0x</strong> if the matching card lands on the Andar side.</li>
              <li><strong className="text-[#F4145B]">BAHAR:</strong> Pays <strong>2.0x</strong> if the matching card lands on the Bahar side.</li>
              <li><strong className="text-[#FFC928]">TIE:</strong> Pays <strong>9.0x</strong> if the first card dealt immediately matches the Open Card rank!</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00E5A0] to-[#00D9FF] text-[#03081B] font-black text-sm tracking-wide shadow-[0_0_20px_rgba(0,217,255,0.5)] hover:brightness-110 cursor-pointer"
        >
          GOT IT! PLAY ANDAR BAHAR
        </button>
      </div>
    </div>
  );
};
