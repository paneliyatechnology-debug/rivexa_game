'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export type ValidationErrorType =
  | 'INSUFFICIENT_BALANCE'
  | 'AUTH_REQUIRED'
  | 'INVALID_BET'
  | 'GAME_ERROR'
  | 'BETTING_CLOSED';

export interface ValidationErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ValidationErrorType;
  title?: string;
  message: string;
  currentBalance?: number;
  requiredAmount?: number;
  minBet?: number;
  maxBet?: number;
}

export default function ValidationErrorModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  currentBalance,
  requiredAmount,
  minBet,
  maxBet,
}: ValidationErrorModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const isBalanceError = type === 'INSUFFICIENT_BALANCE';
  const isAuthError = type === 'AUTH_REQUIRED';
  const isBetError = type === 'INVALID_BET';
  const isClosedError = type === 'BETTING_CLOSED';

  // Config defaults based on type
  const defaultTitle = isClosedError
    ? 'Betting Closed'
    : isBalanceError
    ? 'Insufficient Wallet Balance'
    : isAuthError
    ? 'Authentication Required'
    : isBetError
    ? 'Invalid Bet Parameters'
    : 'Action Required';

  const modalTitle = title || defaultTitle;

  const handlePrimaryAction = () => {
    onClose();
    if (isBalanceError) {
      router.push('/deposit');
    } else if (isAuthError) {
      router.push('/login');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-[400px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/60 rounded-3xl p-6 shadow-2xl shadow-emerald-950/30 overflow-hidden transform transition-all scale-100">
        {/* Glow ambient background effect */}
        <div
          className={`absolute -top-20 -left-20 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 ${
            isClosedError
              ? 'bg-purple-500'
              : isBalanceError
              ? 'bg-amber-500'
              : isAuthError
              ? 'bg-purple-500'
              : 'bg-emerald-500'
          }`}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* Modal Icon Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg ${
              isClosedError
                ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-purple-500/10'
                : isBalanceError
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-amber-500/10'
                : isAuthError
                ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-purple-500/10'
                : isBetError
                ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400 shadow-blue-500/10'
                : 'bg-red-500/10 border border-red-500/30 text-red-400 shadow-red-500/10'
            }`}
          >
            {isClosedError && '⏳'}
            {isBalanceError && '💳'}
            {isAuthError && '🔒'}
            {isBetError && '⚖️'}
            {type === 'GAME_ERROR' && '⚠️'}
          </div>

          <h3 className="text-xl font-extrabold text-white tracking-tight">
            {modalTitle}
          </h3>

          <p className="text-sm text-slate-300 font-medium leading-relaxed max-w-sm">
            {message}
          </p>
        </div>

        {/* Details Card ONLY for true balance or range errors */}
        {isBalanceError && (
          <div className="mt-5 bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs font-mono">
            {currentBalance !== undefined && (
              <div className="flex justify-between items-center text-slate-400">
                <span>Current Wallet Balance:</span>
                <span className="text-amber-400 font-bold">
                  ₹{Number(currentBalance).toFixed(2)}
                </span>
              </div>
            )}
            {requiredAmount !== undefined && requiredAmount > 0 && (
              <div className="flex justify-between items-center text-slate-400">
                <span>Required Bet Amount:</span>
                <span className="text-white font-bold">
                  ₹{Number(requiredAmount).toFixed(2)}
                </span>
              </div>
            )}
            {minBet !== undefined && (
              <div className="flex justify-between items-center text-slate-400">
                <span>Min Allowed Bet:</span>
                <span className="text-emerald-400 font-bold">
                  ₹{Number(minBet).toFixed(2)}
                </span>
              </div>
            )}
            {maxBet !== undefined && (
              <div className="flex justify-between items-center text-slate-400">
                <span>Max Allowed Bet:</span>
                <span className="text-emerald-400 font-bold">
                  ₹{Number(maxBet).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* CTA Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 text-center cursor-pointer"
          >
            {isClosedError ? 'Understood' : 'Close'}
          </button>

          {(isBalanceError || isAuthError) && (
            <button
              type="button"
              onClick={handlePrimaryAction}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs text-slate-950 shadow-lg transition-all transform active:scale-95 text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                isBalanceError
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-purple-400 to-indigo-300 hover:from-purple-300 hover:to-indigo-200 shadow-purple-500/20'
              }`}
            >
              {isBalanceError && (
                <>
                  <span>Recharge Now</span>
                  <span>⚡</span>
                </>
              )}
              {isAuthError && (
                <>
                  <span>Login / Register</span>
                  <span>🔑</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
