'use client';

import React, { useEffect, useState } from 'react';
import { useChickenRoadStore } from '../../../store/chickenRoadStore';
import { chickenRoadApi } from '../../../lib/chicken-road-api';
import { FairnessData } from '../../../types/chicken-road';
import { X, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export const FairnessModal: React.FC = () => {
  const activeModal = useChickenRoadStore((s) => s.activeModal);
  const closeModal = useChickenRoadStore((s) => s.closeModal);
  const selectedRoundId = useChickenRoadStore((s) => s.selectedFairnessRoundId);
  const activeRoundId = useChickenRoadStore((s) => s.roundId);

  const [data, setData] = useState<FairnessData | null>(null);
  const [loading, setLoading] = useState(false);

  const roundToFetch = selectedRoundId || activeRoundId;

  useEffect(() => {
    if (activeModal === 'fairness' && roundToFetch) {
      setLoading(true);
      chickenRoadApi
        .getFairness(roundToFetch)
        .then((res) => setData(res))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [activeModal, roundToFetch]);

  if (activeModal !== 'fairness') return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#242424] border border-[#3e3e3e] rounded-3xl p-6 max-w-xl w-full text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={closeModal}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full bg-[#333]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
          <h2 className="text-xl font-bold">100% Provably Fair Verification</h2>
        </div>

        <p className="text-zinc-400 text-xs mb-6">
          Every game round outcome is cryptographically generated using server seed commitment and HMAC-SHA256.
        </p>

        {loading ? (
          <div className="py-12 text-center text-zinc-400 text-sm">Loading fairness parameters...</div>
        ) : data ? (
          <div className="flex flex-col gap-4">
            {/* Hash Match Badge */}
            {data.isRevealed && (
              <div
                className={`p-3 rounded-2xl border flex items-center gap-2 text-xs font-semibold ${
                  data.verifiedHashMatch
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {data.verifiedHashMatch ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>VERIFIED MATCH: SHA256(Server Seed) matches Server Seed Hash!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <span>UNVERIFIED OR PENDING MATCH</span>
                  </>
                )}
              </div>
            )}

            {/* Server Seed Hash */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400 font-semibold">Server Seed Hash (Pre-Round Commitment):</label>
              <input
                readOnly
                value={data.serverSeedHash}
                className="bg-[#1a1a1a] border border-[#333] p-2.5 rounded-xl text-xs font-mono text-amber-300 w-full"
              />
            </div>

            {/* Revealed Server Seed */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400 font-semibold">Revealed Server Seed:</label>
              <input
                readOnly
                value={data.serverSeed}
                className="bg-[#1a1a1a] border border-[#333] p-2.5 rounded-xl text-xs font-mono text-zinc-200 w-full"
              />
            </div>

            {/* Client Seed & Nonce */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400 font-semibold">Client Seed:</label>
                <input
                  readOnly
                  value={data.clientSeed}
                  className="bg-[#1a1a1a] border border-[#333] p-2.5 rounded-xl text-xs font-mono text-zinc-300 w-full"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400 font-semibold">Nonce:</label>
                <input
                  readOnly
                  value={data.nonce}
                  className="bg-[#1a1a1a] border border-[#333] p-2.5 rounded-xl text-xs font-mono text-zinc-300 w-full"
                />
              </div>
            </div>

            {/* Checkpoint Ladder Outcomes */}
            <div className="mt-2">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Recorded Checkpoints
              </h3>
              <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl max-h-48 overflow-y-auto p-2">
                {data.checkpoints.length === 0 ? (
                  <div className="text-center py-4 text-xs text-zinc-500">No checkpoints recorded yet.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-1 text-xs font-mono">
                    {data.checkpoints.map((cp) => (
                      <div
                        key={cp.checkpoint}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#252525]"
                      >
                        <span className="text-zinc-400">Step {cp.checkpoint} ({cp.multiplier}x)</span>
                        <span className={cp.result === 'SAFE' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                          {cp.result} (RNG: {cp.randomValue.toFixed(6)})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-500 text-xs">No active round selected for verification.</div>
        )}
      </div>
    </div>
  );
};
