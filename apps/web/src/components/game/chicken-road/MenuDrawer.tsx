'use client';

import React from 'react';
import { useChickenRoadStore } from '../../../store/chickenRoadStore';
import { X, History, HelpCircle, ShieldCheck, Volume2, VolumeX, Settings, ShieldAlert, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export const MenuDrawer: React.FC = () => {
  const activeModal = useChickenRoadStore((s) => s.activeModal);
  const closeModal = useChickenRoadStore((s) => s.closeModal);
  const openModal = useChickenRoadStore((s) => s.openModal);
  const soundEnabled = useChickenRoadStore((s) => s.soundEnabled);
  const toggleSound = useChickenRoadStore((s) => s.toggleSound);

  if (activeModal !== 'menu') return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-end">
      <div className="bg-[#242424] border-l border-[#3e3e3e] w-full max-w-sm h-full p-6 text-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
        <div>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#333]">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐔</span>
              <span className="font-extrabold text-lg text-amber-400">Chicken Road Menu</span>
            </div>
            <button
              onClick={closeModal}
              className="p-2 text-zinc-400 hover:text-white rounded-full bg-[#333]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => openModal('history')}
              className="flex items-center gap-3 p-3.5 bg-[#1e1e1e] hover:bg-[#2d2d2d] rounded-2xl border border-[#333] transition-all text-sm font-semibold"
            >
              <History className="w-5 h-5 text-amber-400" />
              <span>Game History</span>
            </button>

            <button
              onClick={() => openModal('help')}
              className="flex items-center gap-3 p-3.5 bg-[#1e1e1e] hover:bg-[#2d2d2d] rounded-2xl border border-[#333] transition-all text-sm font-semibold"
            >
              <HelpCircle className="w-5 h-5 text-blue-400" />
              <span>How to Play</span>
            </button>

            <button
              onClick={() => openModal('fairness')}
              className="flex items-center gap-3 p-3.5 bg-[#1e1e1e] hover:bg-[#2d2d2d] rounded-2xl border border-[#333] transition-all text-sm font-semibold"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Provably Fair</span>
            </button>

            <button
              onClick={toggleSound}
              className="flex items-center justify-between p-3.5 bg-[#1e1e1e] hover:bg-[#2d2d2d] rounded-2xl border border-[#333] transition-all text-sm font-semibold"
            >
              <div className="flex items-center gap-3">
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-purple-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-zinc-500" />
                )}
                <span>Sound FX</span>
              </div>
              <span className="text-xs font-mono text-zinc-400">{soundEnabled ? 'ON' : 'MUTED'}</span>
            </button>

            <Link
              href="/admin/chicken-road"
              onClick={closeModal}
              className="flex items-center gap-3 p-3.5 bg-[#1e1e1e] hover:bg-[#2d2d2d] rounded-2xl border border-[#333] transition-all text-sm font-semibold text-amber-300"
            >
              <LayoutDashboard className="w-5 h-5 text-amber-400" />
              <span>Admin Dashboard</span>
            </Link>
          </div>
        </div>

        <div className="pt-4 border-t border-[#333] text-center text-xs text-zinc-500">
          <p>Chicken Road v1.0.0 (100% Provably Fair)</p>
          <p className="mt-1">Play Responsibly 18+</p>
        </div>
      </div>
    </div>
  );
};
