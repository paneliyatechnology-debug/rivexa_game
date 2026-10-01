'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GameHubIcon } from '@/components/gamehub/GameHubIcon';
import { GameHubButton } from '@/components/gamehub/GameHubButton';
import { Eye, EyeOff, Plus, ArrowUpRight } from 'lucide-react';

interface WalletCardProps {
  balance: number;
}

/**
 * WalletCard — glassmorphism wallet panel.
 * Uses GameHubIcon SVG wallet icon from asset pack.
 * Balance uses real API value (passed from parent via useAuth/fetchBalance).
 * Animated number on change; toggle balance visibility.
 */
export function WalletCard({ balance }: WalletCardProps) {
  const [visible, setVisible] = useState(true);
  const [prevBalance, setPrevBalance] = useState(balance);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (balance !== prevBalance) {
      setChanged(true);
      const t = setTimeout(() => {
        setPrevBalance(balance);
        setChanged(false);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [balance, prevBalance]);

  return (
    <div className="relative rounded-[20px] overflow-hidden bg-gradient-to-br from-[#101C3A] via-[#142650] to-[#0C1030] border border-white/10 shadow-2xl">
      {/* Ambient glows */}
      <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-[#287BFF]/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -top-8 -right-8 w-40 h-40 bg-[#00D9FF]/10 rounded-full blur-2xl pointer-events-none" />

      {/* Decorative animated ring */}
      <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
        <svg viewBox="0 0 80 80" className="w-20 h-20 animate-slow-spin">
          <circle cx="40" cy="40" r="38" stroke="#287BFF" strokeWidth="2" fill="none" strokeDasharray="6 3" />
          <circle cx="40" cy="40" r="28" stroke="#00E5A0" strokeWidth="1.5" fill="none" />
        </svg>
      </div>

      <div className="relative z-10 p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#287BFF]/15 border border-[#287BFF]/30 flex items-center justify-center shadow-md shadow-[#287BFF]/20">
              <GameHubIcon name="wallet" size={18} isActive activeColor="#00D9FF" glow />
            </div>
            <p className="text-[10px] uppercase font-black tracking-widest text-[#7285AE]">
              Total Balance
            </p>
          </div>
          <button
            onClick={() => setVisible(!visible)}
            className="text-[#7285AE] hover:text-white transition-colors"
          >
            {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        {/* Balance amount */}
        <motion.div
          key={balance}
          initial={{ opacity: 0, y: -5, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={`text-3xl sm:text-4xl font-black font-mono tracking-tighter mb-4 transition-colors duration-300 ${
            changed ? 'text-[#00E5A0]' : 'text-white'
          }`}
        >
          {visible ? (
            <span
              style={{
                textShadow: changed ? '0 0 20px rgba(0,229,160,0.5)' : '0 0 10px rgba(0,217,255,0.2)',
              }}
            >
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          ) : (
            <span className="text-[#7285AE] tracking-widest">₹••••••</span>
          )}
        </motion.div>

        {/* Deposit & Withdraw buttons using GameHubButton */}
        <div className="grid grid-cols-2 gap-3">
          <GameHubButton variant="deposit" size="sm" href="/deposit" fullWidth>
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            Deposit
          </GameHubButton>

          <GameHubButton variant="withdraw" size="sm" href="/withdraw" fullWidth>
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
            Withdraw
          </GameHubButton>
        </div>
      </div>
    </div>
  );
}
