'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Slide {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  actionText: string;
  link: string;
  bgGradient: string;
  iconClass: string;
  iconColor: string;
}

const SLIDES: Slide[] = [
  {
    id: 'fast-parity',
    badge: '30s COLOR PREDICTION',
    badgeColor: 'bg-emerald-400 text-slate-950',
    title: 'Fast-Parity Room',
    subtitle: 'Win 9X on Number predictions & 2X on Colors!',
    actionText: 'PLAY NOW',
    link: '/play/fast-parity',
    bgGradient: 'from-emerald-700 via-teal-800 to-slate-900',
    iconClass: 'bi-lightning-charge-fill',
    iconColor: 'text-emerald-300',
  },
  {
    id: 'welcome-bonus',
    badge: 'PROMOTION',
    badgeColor: 'bg-amber-400 text-slate-950',
    title: '100% Welcome Match',
    subtitle: 'Double your wallet balance on your first deposit!',
    actionText: 'CLAIM NOW',
    link: '/deposit',
    bgGradient: 'from-purple-700 via-indigo-800 to-slate-900',
    iconClass: 'bi-gift-fill',
    iconColor: 'text-amber-300',
  },
  {
    id: 'mines',
    badge: 'MINES GAME',
    badgeColor: 'bg-amber-500 text-slate-950',
    title: 'Uncover Gold & Cash Out',
    subtitle: 'Up to 10,000X multipliers with zero mines!',
    actionText: 'PLAY MINES',
    link: '/play/mines',
    bgGradient: 'from-amber-700 via-orange-800 to-slate-900',
    iconClass: 'bi-minecart-loaded',
    iconColor: 'text-amber-300',
  },
  {
    id: 'crash',
    badge: 'CRASH & JETX',
    badgeColor: 'bg-rose-500 text-white',
    title: 'High Altitude Rocket',
    subtitle: 'Watch multiplier climb & cash out before crash!',
    actionText: 'FLY NOW',
    link: '/play/crash',
    bgGradient: 'from-rose-700 via-purple-900 to-slate-950',
    iconClass: 'bi-rocket-takeoff-fill',
    iconColor: 'text-rose-300',
  },
  {
    id: 'invite',
    badge: '3-TIER REFERRAL',
    badgeColor: 'bg-cyan-400 text-slate-950',
    title: 'Invite Friends & Earn',
    subtitle: 'Earn 3% Level 1, 2% Level 2, and 1% Level 3 lifetime!',
    actionText: 'INVITE NOW',
    link: '/register',
    bgGradient: 'from-blue-700 via-cyan-800 to-slate-950',
    iconClass: 'bi-people-fill',
    iconColor: 'text-cyan-300',
  },
];

export function AutoHeroSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % SLIDES.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [isPaused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (diff > 50) {
      // Swipe left -> next slide
      setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    } else if (diff < -50) {
      // Swipe right -> prev slide
      setCurrentIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-md select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {SLIDES.map((slide) => (
          <div key={slide.id} className="w-full flex-shrink-0">
            <Link
              href={slide.link}
              onClick={(e) => {
                if (slide.link.includes('/play/crash') || slide.link.includes('/play/jet')) {
                  if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                    e.preventDefault();
                    window.open(slide.link, '_blank');
                  }
                }
              }}
              className={`block p-4 bg-gradient-to-r ${slide.bgGradient} text-white relative overflow-hidden min-h-[120px] flex flex-col justify-between group cursor-pointer`}
            >
              {/* Background Accent Decorative Shape */}
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />

              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1.5 max-w-[75%]">
                  <span
                    className={`inline-block text-[9px] font-black font-mono px-2 py-0.5 rounded uppercase tracking-wider ${slide.badgeColor}`}
                  >
                    {slide.badge}
                  </span>
                  <h3 className="text-base font-black tracking-tight leading-snug drop-shadow-sm">
                    {slide.title}
                  </h3>
                  <p className="text-[11px] text-slate-100 opacity-90 leading-tight">
                    {slide.subtitle}
                  </p>
                </div>

                <div className={`text-4xl drop-shadow-md ${slide.iconColor}`}>
                  <i className={`bi ${slide.iconClass}`} />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between relative z-10">
                <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-wider bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3 py-1 rounded-full transition-all group-hover:translate-x-1">
                  {slide.actionText} <i className="bi bi-arrow-right-short text-sm" />
                </span>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Slider Pagination Indicators / Dots */}
      <div className="absolute bottom-2 right-3 flex items-center gap-1.5 z-20 pointer-events-auto">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
