'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X, Copy, CheckCheck, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/config';

interface FairnessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roundId: string | null;
  publicId?: string;
  serverSeedHash?: string;
  serverSeed?: string;
  clientSeed?: string;
  difficulty?: string;
  status?: string;
  userId?: string;
}

export function FairnessDialog({
  isOpen,
  onClose,
  roundId,
  publicId,
  serverSeedHash,
  serverSeed,
  clientSeed,
  difficulty,
  status,
  userId,
}: FairnessDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const apiUrl = getApiBaseUrl();
  const isSettled = status && ['SAVED', 'COMPLETED', 'CASHED_OUT'].includes(status);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleVerify = async () => {
    if (!roundId || !userId) return;
    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const res = await fetch(
        `${apiUrl}/games/penalty-shootout/fairness/${roundId}?userId=${userId}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');
      setVerifyResult(data);
    } catch (err: any) {
      setVerifyError(err.message || 'Failed to verify fairness');
    } finally {
      setVerifying(false);
    }
  };

  const CopyField = ({ label, value, fieldKey }: { label: string; value?: string; fieldKey: string }) => (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5">
        <code className="text-[10px] text-emerald-300 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
          {value || '—'}
        </code>
        {value && (
          <button
            onClick={() => handleCopy(value, fieldKey)}
            className="flex-shrink-0 text-gray-400 hover:text-white transition"
          >
            {copied === fieldKey ? (
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="relative bg-gradient-to-b from-[#0c1830] to-[#060b17] border border-white/15 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Provably Fair</h3>
                  <p className="text-[10px] text-gray-400">
                    Verify any completed round's outcome integrity
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-none">
              {/* Round info */}
              {(roundId || publicId) && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Round Details</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Public ID</span>
                    <code className="text-xs font-mono text-white">{publicId || '—'}</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Difficulty</span>
                    <span className="text-xs font-bold text-white">{difficulty || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Status</span>
                    <span className={`text-xs font-bold ${
                      isSettled ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {status || 'IDLE'}
                    </span>
                  </div>
                </div>
              )}

              {/* How it works */}
              <div className="bg-blue-950/40 border border-blue-500/20 rounded-2xl p-4">
                <p className="text-xs font-black text-blue-300 mb-2">How Provably Fair Works</p>
                <ol className="space-y-1.5 text-[10px] text-gray-400 leading-relaxed list-decimal list-inside">
                  <li>Before the round starts, the server commits to a secret <strong className="text-white">server seed</strong> by publishing its <strong className="text-white">SHA-256 hash</strong>.</li>
                  <li>A random <strong className="text-white">client seed</strong> and nonce are recorded for each round.</li>
                  <li>Each shot outcome is derived via <code className="text-emerald-300">HMAC-SHA256(serverSeed, serverSeed:clientSeed:nonce:shotNumber)</code>.</li>
                  <li>After the round ends, the <strong className="text-white">server seed is revealed</strong> so you can re-compute and verify every shot.</li>
                </ol>
              </div>

              {/* Seeds */}
              <div className="space-y-3">
                <CopyField
                  label="Server Seed Hash (committed before round)"
                  value={serverSeedHash}
                  fieldKey="hash"
                />
                <CopyField
                  label={isSettled ? 'Server Seed (revealed after settlement)' : 'Server Seed (hidden until round ends)'}
                  value={isSettled ? serverSeed : undefined}
                  fieldKey="seed"
                />
                <CopyField
                  label="Client Seed (recorded at round start)"
                  value={clientSeed}
                  fieldKey="client"
                />
              </div>

              {/* Active round warning */}
              {!isSettled && (
                <div className="flex items-start gap-2.5 bg-amber-950/40 border border-amber-500/25 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-200">
                    The server seed will only be revealed once this round ends (GOAL saved, cashout, or all 5 kicks completed). This ensures the outcome cannot be determined in advance.
                  </p>
                </div>
              )}

              {/* Verify button */}
              {isSettled && roundId && (
                <div className="space-y-3">
                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 disabled:opacity-60 transition cursor-pointer"
                  >
                    {verifying ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying…</>
                    ) : (
                      <><Shield className="w-4 h-4" /> Verify This Round</>
                    )}
                  </button>

                  {verifyError && (
                    <p className="text-xs text-red-400 text-center">{verifyError}</p>
                  )}

                  {verifyResult && (
                    <div className={`rounded-2xl p-4 border space-y-3 ${
                      verifyResult.integrityOk
                        ? 'bg-emerald-950/40 border-emerald-500/30'
                        : 'bg-red-950/40 border-red-500/30'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          verifyResult.integrityOk ? 'bg-emerald-500' : 'bg-red-500'
                        }`}>
                          {verifyResult.integrityOk ? '✓' : '✗'}
                        </div>
                        <p className={`text-xs font-black ${
                          verifyResult.integrityOk ? 'text-emerald-300' : 'text-red-300'
                        }`}>
                          {verifyResult.summary}
                        </p>
                      </div>

                      {/* Shot-by-shot breakdown */}
                      {verifyResult.shots?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Shot Verification</p>
                          {verifyResult.shots.map((s: any) => (
                            <div
                              key={s.shotNumber}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg text-[10px] ${
                                s.integrityOk ? 'bg-emerald-500/10' : 'bg-red-500/10'
                              }`}
                            >
                              <span className="text-gray-400">Shot #{s.shotNumber}</span>
                              <span className={`font-bold ${s.result === 'GOAL' ? 'text-emerald-300' : 'text-red-300'}`}>
                                {s.result}
                              </span>
                              <span className="text-gray-500 font-mono">{s.recomputedFloat}</span>
                              <span className={s.integrityOk ? 'text-emerald-400' : 'text-red-400'}>
                                {s.integrityOk ? '✓ OK' : '✗ FAIL'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* External verify link */}
              <a
                href="https://emn178.github.io/online-tools/sha256.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[11px] text-blue-400 hover:text-blue-300 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Verify SHA-256 hash independently with an external tool
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
