'use client';

import React from 'react';

interface GameIllustrationProps {
  type: string;
  className?: string;
}

export function GameIllustration({ type, className = "w-full h-full" }: GameIllustrationProps) {
  switch (type) {
    case 'fast-parity':
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
          <svg viewBox="0 0 120 120" className="w-full h-full max-w-[120px] max-h-[120px] drop-shadow-[0_0_15px_rgba(0,229,160,0.6)]">
            <defs>
              <linearGradient id="fastParityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00E5A0" />
                <stop offset="50%" stopColor="#00D9FF" />
                <stop offset="100%" stopColor="#287BFF" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="48" fill="none" stroke="url(#fastParityGrad)" strokeWidth="3" strokeDasharray="6 4" opacity="0.6" className="animate-slow-spin" />
            <circle cx="60" cy="60" r="36" fill="rgba(0, 229, 160, 0.15)" stroke="url(#fastParityGrad)" strokeWidth="2" />
            <path
              d="M68 18L32 66H60L52 102L88 54H60L68 18Z"
              fill="url(#fastParityGrad)"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinejoin="round"
              className="animate-pulse"
            />
          </svg>
        </div>
      );

    case 'parity':
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
          <svg viewBox="0 0 120 120" className="w-full h-full max-w-[120px] max-h-[120px] drop-shadow-[0_0_15px_rgba(40,123,255,0.6)]">
            <defs>
              <linearGradient id="parityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3295FF" />
                <stop offset="100%" stopColor="#873BFF" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="50" fill="rgba(40, 123, 255, 0.12)" stroke="url(#parityGrad)" strokeWidth="4" />
            <circle cx="60" cy="60" r="40" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" strokeDasharray="3 3" />
            {/* Clock hands */}
            <circle cx="60" cy="60" r="4" fill="#FFFFFF" />
            <line x1="60" y1="60" x2="60" y2="30" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="60" y1="60" x2="80" y2="60" stroke="url(#parityGrad)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="60" cy="20" r="2.5" fill="#00D9FF" />
            <circle cx="100" cy="60" r="2.5" fill="#00D9FF" />
            <circle cx="60" cy="100" r="2.5" fill="#00D9FF" />
            <circle cx="20" cy="60" r="2.5" fill="#00D9FF" />
          </svg>
        </div>
      );

    case 'mines':
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
          <svg viewBox="0 0 120 120" className="w-full h-full max-w-[120px] max-h-[120px] drop-shadow-[0_0_15px_rgba(255,201,40,0.6)]">
            <defs>
              <linearGradient id="minesGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF099" />
                <stop offset="50%" stopColor="#FFC928" />
                <stop offset="100%" stopColor="#D48800" />
              </linearGradient>
            </defs>
            {/* Gold Chest & Gems */}
            <rect x="25" y="45" width="70" height="50" rx="8" fill="url(#minesGold)" stroke="#FFFFFF" strokeWidth="1.5" />
            <path d="M20 48 C20 30, 100 30, 100 48 Z" fill="#FFC928" stroke="#FFFFFF" strokeWidth="1.5" />
            <rect x="50" y="55" width="20" height="15" rx="3" fill="#101C3A" stroke="#FFC928" strokeWidth="2" />
            <circle cx="60" cy="62" r="3" fill="#FFF099" />
            {/* Floating glowing gems */}
            <polygon points="30,25 38,33 30,41 22,33" fill="#00E5A0" className="animate-float" />
            <polygon points="90,25 98,33 90,41 82,33" fill="#00D9FF" className="animate-float-reverse" />
          </svg>
        </div>
      );

    case 'crash':
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
          <svg viewBox="0 0 120 120" className="w-full h-full max-w-[120px] max-h-[120px] drop-shadow-[0_0_15px_rgba(255,65,108,0.7)]">
            <defs>
              <linearGradient id="crashRocket" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF3FA4" />
                <stop offset="50%" stopColor="#FF416C" />
                <stop offset="100%" stopColor="#FFC928" />
              </linearGradient>
            </defs>
            {/* Multiplier Trajectory Line */}
            <path d="M15 95 Q 50 85, 95 25" fill="none" stroke="#FFC928" strokeWidth="3" strokeDasharray="4 2" />
            {/* Rocket */}
            <g transform="translate(65, 20) rotate(25)">
              <path d="M20 0 C 35 15, 35 35, 20 50 C 5 35, 5 15, 20 0 Z" fill="url(#crashRocket)" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle cx="20" cy="22" r="5" fill="#050B20" stroke="#FFFFFF" strokeWidth="1" />
              <path d="M5 38 L-5 50 L5 46 Z" fill="#FF416C" />
              <path d="M35 38 L45 50 L35 46 Z" fill="#FF416C" />
              {/* Flame */}
              <polygon points="14,50 20,68 26,50" fill="#FFC928" className="animate-pulse" />
            </g>
          </svg>
        </div>
      );

    case 'jet':
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
          <svg viewBox="0 0 120 120" className="w-full h-full max-w-[120px] max-h-[120px] drop-shadow-[0_0_15px_rgba(40,123,255,0.7)]">
            <defs>
              <linearGradient id="jetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00D9FF" />
                <stop offset="50%" stopColor="#287BFF" />
                <stop offset="100%" stopColor="#873BFF" />
              </linearGradient>
            </defs>
            {/* Futuristic Jet Aircraft */}
            <path d="M95 30 L45 65 L20 60 L10 70 L35 75 L50 95 L65 90 L60 70 L95 30 Z" fill="url(#jetGrad)" stroke="#FFFFFF" strokeWidth="1.5" />
            <path d="M70 42 L88 34 L78 52 Z" fill="#FFFFFF" opacity="0.8" />
            <path d="M10 70 L-5 78 L5 82 Z" fill="#00D9FF" className="animate-pulse" />
          </svg>
        </div>
      );

    case 'spin':
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
          <svg viewBox="0 0 120 120" className="w-full h-full max-w-[120px] max-h-[120px] drop-shadow-[0_0_15px_rgba(0,217,255,0.7)]">
            <g className="animate-slow-spin" style={{ transformOrigin: '60px 60px' }}>
              <circle cx="60" cy="60" r="48" fill="#101C3A" stroke="#FFC928" strokeWidth="3" />
              <path d="M60 60 L60 12 A48 48 0 0 1 108 60 Z" fill="#FF3FA4" />
              <path d="M60 60 L108 60 A48 48 0 0 1 60 108 Z" fill="#00E5A0" />
              <path d="M60 60 L60 108 A48 48 0 0 1 12 60 Z" fill="#287BFF" />
              <path d="M60 60 L12 60 A48 48 0 0 1 60 12 Z" fill="#FFC928" />
              <circle cx="60" cy="60" r="14" fill="#050B20" stroke="#FFFFFF" strokeWidth="2" />
            </g>
            {/* Center Pointer Pin */}
            <polygon points="60,6 54,20 66,20" fill="#FFFFFF" stroke="#FF3FA4" strokeWidth="1.5" />
          </svg>
        </div>
      );

    case 'dice':
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
          <svg viewBox="0 0 120 120" className="w-full h-full max-w-[120px] max-h-[120px] drop-shadow-[0_0_15px_rgba(135,59,255,0.7)]">
            {/* Die 1 */}
            <g transform="translate(20, 25) rotate(-12)" className="animate-float">
              <rect x="0" y="0" width="45" height="45" rx="9" fill="#FFFFFF" stroke="#873BFF" strokeWidth="2" />
              <circle cx="12" cy="12" r="3.5" fill="#873BFF" />
              <circle cx="33" cy="12" r="3.5" fill="#873BFF" />
              <circle cx="22.5" cy="22.5" r="4" fill="#FF3FA4" />
              <circle cx="12" cy="33" r="3.5" fill="#873BFF" />
              <circle cx="33" cy="33" r="3.5" fill="#873BFF" />
            </g>
            {/* Die 2 */}
            <g transform="translate(55, 45) rotate(15)" className="animate-float-reverse">
              <rect x="0" y="0" width="45" height="45" rx="9" fill="#FFFFFF" stroke="#00D9FF" strokeWidth="2" />
              <circle cx="12" cy="12" r="3.5" fill="#101C3A" />
              <circle cx="33" cy="33" r="3.5" fill="#101C3A" />
              <circle cx="22.5" cy="22.5" r="4.5" fill="#00E5A0" />
            </g>
          </svg>
        </div>
      );

    case 'andar-bahar':
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-blue-600/20 rounded-full blur-xl animate-pulse" />
          <svg viewBox="0 0 120 120" className="w-full h-full max-w-[120px] max-h-[120px] drop-shadow-[0_0_15px_rgba(40,123,255,0.7)]">
            {/* Card 1 */}
            <g transform="translate(25, 20) rotate(-15)">
              <rect x="0" y="0" width="46" height="68" rx="6" fill="#FFFFFF" stroke="#287BFF" strokeWidth="2" />
              <text x="6" y="16" fontSize="14" fontWeight="bold" fill="#FF416C">A</text>
              <path d="M 23 28 C 17 20, 10 32, 23 42 C 36 32, 29 20, 23 28 Z" fill="#FF416C" />
            </g>
            {/* Card 2 */}
            <g transform="translate(50, 30) rotate(10)">
              <rect x="0" y="0" width="46" height="68" rx="6" fill="#FFFFFF" stroke="#FF416C" strokeWidth="2" />
              <text x="6" y="16" fontSize="14" fontWeight="bold" fill="#050B20">K</text>
              <path d="M 23 32 L 32 44 L 14 44 Z M 23 46 L 26 50 L 20 50 Z" fill="#050B20" />
            </g>
          </svg>
        </div>
      );

    case 'coin-flip':
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl animate-pulse" />
          <svg viewBox="0 0 120 120" className="w-full h-full max-w-[120px] max-h-[120px] drop-shadow-[0_0_15px_rgba(255,201,40,0.8)]">
            <defs>
              <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF099" />
                <stop offset="50%" stopColor="#FFC928" />
                <stop offset="100%" stopColor="#B37800" />
              </linearGradient>
            </defs>
            <g className="animate-float">
              <circle cx="60" cy="60" r="48" fill="url(#coinGrad)" stroke="#FFFFFF" strokeWidth="2.5" />
              <circle cx="60" cy="60" r="40" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="4 2" />
              {/* Coin Symbol */}
              <text x="60" y="70" textAnchor="middle" fontSize="32" fontWeight="900" fill="#050B20" fontFamily="sans-serif">₹</text>
            </g>
          </svg>
        </div>
      );

    case 'pushparani':
    case 'pushpani':
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl animate-pulse" />
          <svg viewBox="0 0 120 120" className="w-full h-full max-w-[120px] max-h-[120px] drop-shadow-[0_0_15px_rgba(255,63,164,0.7)]">
            <defs>
              <linearGradient id="pushpaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF3FA4" />
                <stop offset="100%" stopColor="#FFC928" />
              </linearGradient>
            </defs>
            {/* Truck / Castle theme */}
            <rect x="20" y="45" width="55" height="35" rx="4" fill="url(#pushpaGrad)" stroke="#FFFFFF" strokeWidth="1.5" />
            <rect x="75" y="55" width="25" height="25" rx="3" fill="#287BFF" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="35" cy="85" r="8" fill="#050B20" stroke="#FFC928" strokeWidth="2" />
            <circle cx="70" cy="85" r="8" fill="#050B20" stroke="#FFC928" strokeWidth="2" />
            <polygon points="45,20 60,35 30,35" fill="#FFC928" className="animate-pulse" />
          </svg>
        </div>
      );

    default:
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-blue-400 text-3xl">
            🎮
          </div>
        </div>
      );
  }
}
