'use client';

import React from 'react';

type IconName =
  | 'home' | 'wallet' | 'gift' | 'bell' | 'user'
  | 'gamepad' | 'dice' | 'coin' | 'trophy'
  | 'flame' | 'star' | 'zap' | 'chart' | 'crown' | 'shield';

interface GameHubIconProps {
  name: IconName;
  size?: number;
  color?: string;
  activeColor?: string;
  isActive?: boolean;
  className?: string;
  glow?: boolean;
}

/**
 * GameHubIcon — renders the editable SVG icons from the GameHub asset pack.
 * Inline SVG so color can be overridden dynamically.
 * Source: 05_icons/editable_svg_icons/*.svg
 */
export function GameHubIcon({
  name,
  size = 24,
  color = '#A8B9DE',
  activeColor = '#00E5A0',
  isActive = false,
  className = '',
  glow = false,
}: GameHubIconProps) {
  const strokeColor = isActive ? activeColor : color;
  const glowFilter = glow && isActive ? `drop-shadow(0 0 6px ${activeColor}88)` : undefined;

  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: strokeColor,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: { filter: glowFilter, transition: 'all 0.2s ease' },
    className,
  };

  switch (name) {
    case 'home':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
        </svg>
      );

    case 'wallet':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="5" width="18" height="15" rx="2" />
          <path d="M3 8h18M16 14h2" />
        </svg>
      );

    case 'gift':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="9" width="18" height="12" rx="2" />
          <path d="M2 6h20v4H2zM12 6v15M12 6H8a2 2 0 1 1 2-2c0 1 2 2 2 2Zm0 0h4a2 2 0 1 0-2-2c0 1-2 2-2 2Z" />
        </svg>
      );

    case 'bell':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
        </svg>
      );

    case 'user':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );

    case 'gamepad':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <path d="M6 8h12a4 4 0 0 1 3.8 5l-1.2 4a2 2 0 0 1-3.3 1l-2.2-2H9l-2.2 2a2 2 0 0 1-3.3-1l-1.2-4A4 4 0 0 1 6 8Z" />
          <path d="M7 11v4m-2-2h4m7-1h.01M18 14h.01" />
        </svg>
      );

    case 'dice':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <circle cx="8" cy="8" r="1" fill={strokeColor} stroke="none" />
          <circle cx="16" cy="16" r="1" fill={strokeColor} stroke="none" />
          <circle cx="12" cy="12" r="1" fill={strokeColor} stroke="none" />
        </svg>
      );

    case 'coin':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" />
          <path d="M15 8.5c-.7-.8-1.7-1.2-3-1.2-1.7 0-3 .9-3 2.2 0 3.2 6 1.4 6 4.7 0 1.4-1.3 2.5-3.2 2.5-1.4 0-2.6-.5-3.4-1.4M12 5v14" />
        </svg>
      );

    case 'trophy':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4" />
        </svg>
      );

    case 'flame':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C9 7 6 9 6 13a6 6 0 0 0 12 0c0-4-2-6-3-8-1 2-2 3-3 5-1-2-1-5 0-8Z" />
        </svg>
      );

    case 'star':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );

    case 'zap':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );

    case 'chart':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );

    case 'crown':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <path d="M2 20h20M5 20V10l7-7 7 7v10" />
          <path d="M12 3v7M8 20v-5a4 4 0 0 1 8 0v5" />
        </svg>
      );

    case 'shield':
      return (
        <svg {...commonProps} xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        </svg>
      );

    default:
      return null;
  }
}
