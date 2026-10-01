'use client';

import React from 'react';

export default function DeveloperDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
            DEV
          </div>
          <h1 className="font-extrabold text-lg text-white">RIVEXA Studio Portal</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <span className="text-xs text-slate-400 block uppercase">Published Games</span>
            <span className="text-3xl font-bold font-mono text-white mt-1 block">4</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <span className="text-xs text-slate-400 block uppercase">Total Plays</span>
            <span className="text-3xl font-bold font-mono text-emerald-400 mt-1 block">1.2M</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <span className="text-xs text-slate-400 block uppercase">Net Revenue (70%)</span>
            <span className="text-3xl font-bold font-mono text-indigo-400 mt-1 block">₹482,900</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <span className="text-xs text-slate-400 block uppercase">Available Payout</span>
            <span className="text-3xl font-bold font-mono text-amber-400 mt-1 block">₹45,000</span>
          </div>
        </div>

        {/* Build Upload Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-white mb-2">Upload New Game Build</h2>
          <p className="text-slate-400 text-xs mb-6">Upload ZIP bundle containing game assets, HTML5 index file, and game-manifest.json</p>

          <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-12 text-center transition-colors cursor-pointer bg-slate-950/50">
            <div className="text-4xl mb-3">📦</div>
            <div className="text-sm font-bold text-white">Drag & Drop Game Build ZIP here</div>
            <div className="text-xs text-slate-500 mt-1">Supports Phaser 3, WebGL, Unity WebGL (Max 50MB)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
