'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Globe, ChevronRight } from 'lucide-react';

export interface Country {
  name: string;
  code: string;
  flag: string;
  continent?: string;
}

/** Full country catalogue — cosmetic only */
export const FULL_COUNTRY_LIST: Country[] = [
  { name: 'Argentina', code: 'AR', flag: '🇦🇷', continent: 'South America' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', continent: 'Oceania' },
  { name: 'Belgium', code: 'BE', flag: '🇧🇪', continent: 'Europe' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷', continent: 'South America' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦', continent: 'North America' },
  { name: 'Chile', code: 'CL', flag: '🇨🇱', continent: 'South America' },
  { name: 'Colombia', code: 'CO', flag: '🇨🇴', continent: 'South America' },
  { name: 'Croatia', code: 'HR', flag: '🇭🇷', continent: 'Europe' },
  { name: 'Curaçao', code: 'CW', flag: '🇨🇼', continent: 'Caribbean' },
  { name: 'Czech Republic', code: 'CZ', flag: '🇨🇿', continent: 'Europe' },
  { name: 'Denmark', code: 'DK', flag: '🇩🇰', continent: 'Europe' },
  { name: 'Ecuador', code: 'EC', flag: '🇪🇨', continent: 'South America' },
  { name: 'England', code: 'GB-ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', continent: 'Europe' },
  { name: 'France', code: 'FR', flag: '🇫🇷', continent: 'Europe' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪', continent: 'Europe' },
  { name: 'Ghana', code: 'GH', flag: '🇬🇭', continent: 'Africa' },
  { name: 'India', code: 'IN', flag: '🇮🇳', continent: 'Asia' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹', continent: 'Europe' },
  { name: 'Ivory Coast', code: 'CI', flag: '🇨🇮', continent: 'Africa' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵', continent: 'Asia' },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽', continent: 'North America' },
  { name: 'Morocco', code: 'MA', flag: '🇲🇦', continent: 'Africa' },
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱', continent: 'Europe' },
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬', continent: 'Africa' },
  { name: 'Norway', code: 'NO', flag: '🇳🇴', continent: 'Europe' },
  { name: 'Poland', code: 'PL', flag: '🇵🇱', continent: 'Europe' },
  { name: 'Portugal', code: 'PT', flag: '🇵🇹', continent: 'Europe' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', continent: 'Asia' },
  { name: 'Senegal', code: 'SN', flag: '🇸🇳', continent: 'Africa' },
  { name: 'Serbia', code: 'RS', flag: '🇷🇸', continent: 'Europe' },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦', continent: 'Africa' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷', continent: 'Asia' },
  { name: 'Spain', code: 'ES', flag: '🇪🇸', continent: 'Europe' },
  { name: 'Switzerland', code: 'CH', flag: '🇨🇭', continent: 'Europe' },
  { name: 'Tunisia', code: 'TN', flag: '🇹🇳', continent: 'Africa' },
  { name: 'Turkey', code: 'TR', flag: '🇹🇷', continent: 'Europe' },
  { name: 'Ukraine', code: 'UA', flag: '🇺🇦', continent: 'Europe' },
  { name: 'Uruguay', code: 'UY', flag: '🇺🇾', continent: 'South America' },
  { name: 'USA', code: 'US', flag: '🇺🇸', continent: 'North America' },
  { name: 'Wales', code: 'GB-WLS', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', continent: 'Europe' },
];

const CONTINENTS = ['All', 'Europe', 'South America', 'North America', 'Africa', 'Asia', 'Oceania', 'Caribbean'];

interface CountrySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHome: Country;
  selectedAway: Country;
  onConfirm: (home: Country, away: Country) => void;
  isRoundActive?: boolean;
}

export function CountrySelectionModal({
  isOpen,
  onClose,
  selectedHome,
  selectedAway,
  onConfirm,
  isRoundActive,
}: CountrySelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeContinent, setActiveContinent] = useState('All');
  const [pickingFor, setPickingFor] = useState<'home' | 'away'>('home');
  const [pendingHome, setPendingHome] = useState<Country>(selectedHome);
  const [pendingAway, setPendingAway] = useState<Country>(selectedAway);
  const [hideNextTime, setHideNextTime] = useState(false);
  const [prevOpen, setPrevOpen] = useState(isOpen);

  // Synchronize pending selections when modal opens without cascading effect setState
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setPendingHome(selectedHome);
      setPendingAway(selectedAway);
      setSearchQuery('');
      setPickingFor('home');
    }
  }

  // Accessibility: Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    return FULL_COUNTRY_LIST.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesContinent =
        activeContinent === 'All' || c.continent === activeContinent;
      return matchesSearch && matchesContinent;
    });
  }, [searchQuery, activeContinent]);

  const handleCountrySelect = (country: Country) => {
    if (pickingFor === 'home') {
      setPendingHome(country);
      setPickingFor('away');
    } else {
      setPendingAway(country);
    }
  };

  const handleConfirm = () => {
    if (hideNextTime && typeof window !== 'undefined') {
      localStorage.setItem('penalty_hide_country_modal', '1');
    }
    onConfirm(pendingHome, pendingAway);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-hidden"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="select-match-teams-title"
            aria-describedby="select-match-teams-desc"
            className="relative bg-gradient-to-b from-[#0c1427] via-[#080d1b] to-[#050811] border border-teal-500/25 rounded-2xl sm:rounded-3xl w-[calc(100vw-20px)] sm:w-[min(640px,calc(100vw-32px))] max-w-[640px] max-h-[calc(100vh-20px)] max-h-[calc(100dvh-20px)] sm:max-h-[min(780px,calc(100dvh-40px))] shadow-[0_15px_35px_rgba(0,0,0,0.5),0_0_25px_rgba(20,184,166,0.12)] overflow-hidden flex flex-col"
          >
            {/* ── 1. HEADER (Non-scrolling, sticky top) ── */}
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-[#0c1427]/95 backdrop-blur-md">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 shadow-[0_0_12px_rgba(20,184,166,0.25)]">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="select-match-teams-title"
                    className="text-sm sm:text-base font-black text-white uppercase tracking-wider truncate"
                  >
                    Select Match Teams
                  </h2>
                  <p
                    id="select-match-teams-desc"
                    className="text-[10px] sm:text-xs text-slate-400 font-medium truncate"
                  >
                    Country is cosmetic — does not affect outcome
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95 shrink-0 ml-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── 2. SCROLLABLE CENTRAL CONTENT ── */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 flex flex-col gap-3 sm:gap-4 overscroll-contain touch-pan-y">
              {/* Team Selection Summary Cards (Stacked on compact mobile, side-by-side on >=460px) */}
              <div className="grid grid-cols-1 min-[460px]:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
                {/* Your Team */}
                <button
                  type="button"
                  onClick={() => setPickingFor('home')}
                  className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer min-w-0 ${
                    pickingFor === 'home'
                      ? 'bg-teal-500/15 border-teal-400/80 shadow-[0_0_20px_rgba(20,184,166,0.25)] ring-1 ring-teal-400/50'
                      : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-2xl sm:text-3xl shrink-0">{pendingHome.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-teal-300 truncate">
                        Your Team
                      </span>
                      {pickingFor === 'home' && (
                        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-black text-white truncate">{pendingHome.name}</p>
                  </div>
                </button>

                {/* VS Badge */}
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-950/90 border border-white/15 flex items-center justify-center text-[9px] sm:text-xs font-black italic text-slate-400 shadow-md shrink-0 justify-self-center">
                  VS
                </div>

                {/* Opponent */}
                <button
                  type="button"
                  onClick={() => setPickingFor('away')}
                  className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer min-w-0 ${
                    pickingFor === 'away'
                      ? 'bg-blue-500/15 border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-1 ring-blue-400/50'
                      : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-2xl sm:text-3xl shrink-0">{pendingAway.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-300 truncate">
                        Opponent
                      </span>
                      {pickingFor === 'away' && (
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-black text-white truncate">{pendingAway.name}</p>
                  </div>
                </button>
              </div>

              {/* Active Step Helper Pill */}
              <div className="flex justify-center -mt-1 sm:-mt-1.5">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider border ${
                    pickingFor === 'home'
                      ? 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      pickingFor === 'home' ? 'bg-teal-400 animate-ping' : 'bg-blue-400 animate-ping'
                    }`}
                  />
                  <span>{pickingFor === 'home' ? 'Selecting Your Team' : 'Selecting Opponent'}</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="country-search"
                  type="text"
                  placeholder="Search country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-950/70 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 transition shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Region Filter Chips (Horizontally scrollable with scrollbar hidden) */}
              <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex items-center gap-1.5 sm:gap-2 py-0.5 shrink-0">
                {CONTINENTS.map((cont) => {
                  const isActive = activeContinent === cont;
                  return (
                    <button
                      key={cont}
                      type="button"
                      onClick={() => setActiveContinent(cont)}
                      className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition select-none cursor-pointer ${
                        isActive
                          ? 'bg-teal-400 text-slate-950 font-black shadow-md shadow-teal-500/20'
                          : 'bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {cont}
                    </button>
                  );
                })}
              </div>

              {/* Country Grid */}
              <div className="w-full">
                {filtered.length === 0 ? (
                  <div className="text-center py-10 sm:py-12 bg-slate-950/30 rounded-2xl border border-white/5">
                    <Globe className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-xs sm:text-sm font-bold">No countries found</p>
                    <p className="text-slate-600 text-[10px] sm:text-xs mt-1">Try another search or region filter</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                    {filtered.map((country) => {
                      const isHomeSelected = country.code === pendingHome.code;
                      const isAwaySelected = country.code === pendingAway.code;
                      return (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => handleCountrySelect(country)}
                          className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition hover:scale-[1.01] active:scale-[0.98] cursor-pointer min-w-0 ${
                            isHomeSelected && isAwaySelected
                              ? 'bg-purple-500/15 border-purple-400/80 shadow-[0_0_15px_rgba(168,85,247,0.25)] ring-1 ring-purple-400/40'
                              : isHomeSelected
                              ? 'bg-teal-500/15 border-teal-400/80 shadow-[0_0_15px_rgba(20,184,166,0.25)] ring-1 ring-teal-400/40'
                              : isAwaySelected
                              ? 'bg-blue-500/15 border-blue-400/80 shadow-[0_0_15px_rgba(59,130,246,0.25)] ring-1 ring-blue-400/40'
                              : 'bg-slate-950/40 border-white/5 hover:border-teal-500/30 hover:bg-white/[0.04]'
                          }`}
                        >
                          <span className="text-2xl sm:text-3xl shrink-0">{country.flag}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-bold text-white truncate">{country.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">
                              {country.continent}
                            </p>
                          </div>
                          {isHomeSelected && isAwaySelected ? (
                            <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-400/20 text-purple-300 border border-purple-400/40">
                              BOTH
                            </span>
                          ) : isHomeSelected ? (
                            <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-400/20 text-teal-300 border border-teal-400/40">
                              YOU
                            </span>
                          ) : isAwaySelected ? (
                            <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-400/20 text-blue-300 border border-blue-400/40">
                              OPP
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── 3. STICKY FOOTER (Non-scrolling, bottom) ── */}
            <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 border-t border-white/10 bg-[#070b16]/95 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  checked={hideNextTime}
                  onChange={(e) => setHideNextTime(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-teal-400 accent-teal-400 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-slate-400 font-medium">Don't show again</span>
              </label>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isRoundActive}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(20,184,166,0.35)] hover:shadow-[0_0_35px_rgba(20,184,166,0.5)] transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>CONFIRM MATCH</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
