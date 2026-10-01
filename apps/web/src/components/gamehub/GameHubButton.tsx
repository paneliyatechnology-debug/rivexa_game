'use client';

import React from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'deposit' | 'withdraw' | 'claim' | 'invite' | 'playnow' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GameHubButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  fullWidth?: boolean;
  openInNew?: boolean;
}

/**
 * GameHubButton — Master cyber gaming button component.
 * Features 3-level neon glow lighting, shine sweep effect, and exact design tokens.
 */
export function GameHubButton({
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  children,
  disabled = false,
  loading = false,
  className = '',
  fullWidth = false,
  openInNew = false,
}: GameHubButtonProps) {
  const baseClasses = `
    inline-flex items-center justify-center gap-2 font-bold relative overflow-hidden
    transition-all duration-200 active:scale-95 select-none
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#050B20]
    disabled:opacity-50 disabled:pointer-events-none cursor-pointer
  `;

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'text-xs px-4 py-2 rounded-[14px]',
    md: 'text-sm px-5 py-2.5 rounded-[16px]',
    lg: 'text-base px-7 py-3.5 rounded-[18px]',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    /** Primary Green-Cyan CTA with shine sweep */
    primary: `
      bg-gradient-to-r from-[#00E5A0] via-[#00D9FF] to-[#287BFF]
      text-[#04101F] font-bold shadow-[0_0_12px_rgba(0,229,160,0.35),0_0_30px_rgba(0,217,255,0.18)]
      hover:shadow-[0_0_18px_rgba(0,229,160,0.55),0_0_35px_rgba(0,217,255,0.30)]
      hover:-translate-y-0.5 focus:ring-[#00E5A0] btn-shine-sweep
    `,
    /** Secondary Electric Blue Button */
    secondary: `
      bg-gradient-to-r from-[#287BFF] to-[#1765E8] border border-[#00D9FF]/40 text-white font-bold
      shadow-[0_0_8px_rgba(40,123,255,0.45),0_0_22px_rgba(40,123,255,0.25)]
      hover:border-[#00D9FF] hover:shadow-[0_0_16px_rgba(40,123,255,0.6)]
      hover:-translate-y-0.5 focus:ring-[#287BFF]
    `,
    /** Deposit Emerald Neon Button */
    deposit: `
      bg-gradient-to-r from-[#00E5A0] to-[#00C98B]
      text-[#04101F] font-bold shadow-[0_0_10px_rgba(0,229,160,0.45),0_0_25px_rgba(0,229,160,0.20)]
      hover:shadow-[0_0_18px_rgba(0,229,160,0.65)] hover:-translate-y-0.5
      focus:ring-[#00E5A0] btn-shine-sweep
    `,
    /** Withdraw Muted Dark Button */
    withdraw: `
      bg-[#101C3A] border border-[#287BFF]/40 text-[#F5F7FF] font-bold
      hover:border-[#00D9FF]/60 hover:bg-[#142650] hover:shadow-[0_0_12px_rgba(40,123,255,0.3)]
      focus:ring-white/40
    `,
    /** Claim Golden Reward Button */
    claim: `
      bg-gradient-to-r from-[#FFC928] to-[#FF9F1C]
      text-[#04101F] font-bold shadow-[0_0_8px_rgba(255,201,40,0.45),0_0_25px_rgba(255,201,40,0.20)]
      hover:shadow-[0_0_18px_rgba(255,201,40,0.65)] hover:-translate-y-0.5
      focus:ring-[#FFC928] btn-shine-sweep
    `,
    /** Invite Multi-Gradient Special Button */
    invite: `
      bg-gradient-to-r from-[#287BFF] via-[#873BFF] to-[#FF3FA4]
      text-white font-bold shadow-[0_0_12px_rgba(135,59,255,0.45),0_0_30px_rgba(135,59,255,0.25)]
      hover:shadow-[0_0_20px_rgba(255,63,164,0.55)] hover:-translate-y-0.5
      focus:ring-[#873BFF] btn-shine-sweep
    `,
    /** PlayNow Compact Cyan Pill */
    playnow: `
      bg-gradient-to-r from-[#287BFF] to-[#00D9FF]
      text-white font-bold shadow-[0_0_10px_rgba(40,123,255,0.4)]
      hover:shadow-[0_0_20px_rgba(0,217,255,0.6)] hover:-translate-y-0.5
      focus:ring-[#00D9FF]
    `,
    ghost: `
      bg-transparent text-[#B8C7E6] border border-white/15
      hover:bg-white/5 hover:text-white hover:border-[#00D9FF]/40
      focus:ring-white/30
    `,
  };

  const classes = [
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const content = loading ? (
    <>
      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <span>Loading…</span>
    </>
  ) : (
    children
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        target={openInNew ? '_blank' : undefined}
        rel={openInNew ? 'noopener noreferrer' : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} onClick={onClick} disabled={disabled || loading}>
      {content}
    </button>
  );
}
