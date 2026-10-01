import * as React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Button Component
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-md';

  const variants = {
    primary: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-900/30',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700',
    accent: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-900/30',
    danger: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white shadow-red-900/30',
    outline: 'border-2 border-emerald-500 text-emerald-400 hover:bg-emerald-500/10',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  };

  return (
    <button className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
};

// Game Card Component
export interface GameCardProps {
  title: string;
  category: string;
  imageUrl: string;
  rtp: number;
  isHot?: boolean;
  onPlay?: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  title,
  category,
  imageUrl,
  rtp,
  isHot,
  onPlay,
}) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800 p-3 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-800">
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {isHot && (
          <span className="absolute top-2 left-2 rounded-lg bg-gradient-to-r from-amber-500 to-red-500 px-2 py-0.5 text-xs font-bold text-white shadow-md">
            HOT 🔥
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-950/60 backdrop-blur-xs">
          <Button variant="primary" size="md" onClick={onPlay}>
            Play Now
          </Button>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm">{title}</h3>
          <p className="text-xs text-slate-400 capitalize">{category}</p>
        </div>
        <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
          RTP {rtp}%
        </span>
      </div>
    </div>
  );
};
