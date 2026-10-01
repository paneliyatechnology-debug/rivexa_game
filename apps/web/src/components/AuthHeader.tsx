'use client';

import React from 'react';
import Link from 'next/link';

interface AuthHeaderProps {
  activePage: 'login' | 'register';
}

export function AuthHeader({ activePage }: AuthHeaderProps) {
  return (
    <header className="w-full bg-white border-b border-slate-100 px-6 sm:px-12 py-4 flex items-center justify-between sticky top-0 z-50 shadow-xs">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H9v2H7v-2H5v-2h2V9h2v2h2v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 9 18.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
        </div>
        <span className="text-xl font-black tracking-tight text-slate-800">
          RIVEXA
        </span>
      </Link>

      {/* Top Right Header Actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className={`px-6 py-2 rounded-full text-xs font-extrabold transition-all tracking-wide ${
            activePage === 'login'
              ? 'border-2 border-blue-500 text-blue-600 bg-blue-50/50 shadow-xs'
              : 'border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          Login
        </Link>
        <Link
          href="/register"
          className={`px-6 py-2 rounded-full text-xs font-extrabold transition-all tracking-wide ${
            activePage === 'register'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 hover:bg-blue-700'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'
          }`}
        >
          Register
        </Link>
      </div>
    </header>
  );
}
