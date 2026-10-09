'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useChickenRoadStore } from '../store/chickenRoadStore';
import { chickenRoadApi, getUserTokenOrGuestId } from '../lib/chicken-road-api';
import { getChickenRoadSocket } from '../lib/chicken-road-socket';
import { useAuth } from '@/context/AuthContext';

export const useChickenRoad = () => {
  const { balance: authBalance } = useAuth();
  const roundId = useChickenRoadStore((s) => s.roundId);
  const status = useChickenRoadStore((s) => s.status);
  const betAmount = useChickenRoadStore((s) => s.betAmount);
  const difficulty = useChickenRoadStore((s) => s.difficulty);
  const currency = useChickenRoadStore((s) => s.currency);

  const initRound = useChickenRoadStore((s) => s.initRound);
  const onCheckpointSafe = useChickenRoadStore((s) => s.onCheckpointSafe);
  const onRoundCrashed = useChickenRoadStore((s) => s.onRoundCrashed);
  const onRoundCashedOut = useChickenRoadStore((s) => s.onRoundCashedOut);
  const resetGame = useChickenRoadStore((s) => s.resetGame);
  const setWalletBalance = useChickenRoadStore((s) => s.setWalletBalance);

  // Lock ref to prevent concurrent multi-clicks or rapid double-jumping
  const isPendingRef = useRef(false);

  // Always reset game to fresh start on mount/refresh & fetch dynamic bet limits
  useEffect(() => {
    resetGame();
    chickenRoadApi.getConfig().then((res: any) => {
      if (res?.limits) {
        const minB = Number(res.limits.minBet) || 10;
        const maxB = Number(res.limits.maxBet) || 100000;
        useChickenRoadStore.setState((state) => ({
          minBet: minB,
          maxBet: maxB,
          betAmount: Math.max(minB, Math.min(maxB, state.betAmount)),
        }));
      }
    }).catch(() => {});
    chickenRoadApi.getActiveRound().catch(() => {});
  }, [resetGame]);

  // Sync auth context balance to store
  useEffect(() => {
    if (authBalance !== undefined && authBalance !== null) {
      setWalletBalance(authBalance);
    }
  }, [authBalance, setWalletBalance]);

  // Connect Socket.IO listeners
  useEffect(() => {
    const token = getUserTokenOrGuestId();
    const socket = getChickenRoadSocket(token);
    socket.connect();

    socket.on('game.checkpoint.safe', (data) => {
      const curRoundId = useChickenRoadStore.getState().roundId;
      if (data?.roundId && curRoundId && data.roundId === curRoundId) {
        onCheckpointSafe(data);
      }
    });

    socket.on('game.round.crashed', (data) => {
      const curRoundId = useChickenRoadStore.getState().roundId;
      if (data?.roundId && curRoundId && data.roundId === curRoundId) {
        onRoundCrashed(data);
      }
    });

    socket.on('game.round.cashed_out', (data) => {
      const curRoundId = useChickenRoadStore.getState().roundId;
      if (data?.roundId && curRoundId && data.roundId === curRoundId) {
        onRoundCashedOut(data);
      }
    });

    return () => {
      socket.off('game.checkpoint.safe');
      socket.off('game.round.crashed');
      socket.off('game.round.cashed_out');
    };
  }, [onCheckpointSafe, onRoundCrashed, onRoundCashedOut]);

  // Handle Play Button Click (Direct Start on First Road Step)
  const handlePlay = useCallback(async () => {
    if (isPendingRef.current) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
    if (!token) {
      if (typeof window !== 'undefined') {
        alert('Please login to place bets and play games!');
        window.location.href = '/login';
      }
      return;
    }

    const curStatus = useChickenRoadStore.getState().status;
    const cooldown = useChickenRoadStore.getState().playCooldown;
    if (curStatus === 'MOVING' || curStatus === 'RUNNING' || cooldown > 0) return;

    const currentBal = authBalance !== undefined && authBalance !== null ? authBalance : (useChickenRoadStore.getState().walletBalance || 0);

    const minBet = useChickenRoadStore.getState().minBet || 10;
    const maxBet = useChickenRoadStore.getState().maxBet || 100000;

    if (betAmount < minBet || betAmount > maxBet) {
      if (typeof window !== 'undefined') {
        alert(`Invalid bet amount! Bet must be between ₹${minBet} and ₹${maxBet}.`);
      }
      return;
    }

    // Validate insufficient balance before placing bet
    if (currentBal < betAmount) {
      if (typeof window !== 'undefined') {
        alert(`Insufficient balance! Your current balance is ₹${currentBal.toFixed(2)}, but bet amount is ₹${betAmount.toFixed(2)}.`);
      }
      return;
    }

    isPendingRef.current = true;

    // Deduct bet amount from live wallet balance immediately for UI responsiveness
    const updatedBalance = Math.max(0, Number((currentBal - betAmount).toFixed(2)));
    setWalletBalance(updatedBalance);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wallet:updated', { detail: { balance: updatedBalance } }));
    }

    try {
      useChickenRoadStore.setState({ status: 'MOVING', canMove: false });
      const res = await chickenRoadApi.createRound({
        betAmount,
        difficulty,
        currency,
      });

      if (res?.walletBalance !== undefined && !isNaN(Number(res.walletBalance))) {
        const bal = Number(res.walletBalance);
        setWalletBalance(bal);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wallet:updated', { detail: { balance: bal } }));
        }
      }

      initRound({
        roundId: res.roundId,
        publicId: res.publicId,
        status: 'RUNNING',
        betAmount: res.betAmount,
        difficulty: res.difficulty,
        serverSeedHash: res.serverSeedHash,
        clientSeed: res.clientSeed,
        checkpoint: res.checkpoint || 0,
        multiplier: res.multiplier || 1.00,
        potentialPayout: res.potentialPayout || res.betAmount,
        canMove: true,
      });

      if (res.status === 'READY' || res.status === 'CREATED') {
        try {
          await chickenRoadApi.startRound(res.roundId);
        } catch (startErr) {}
      }

      // Automatically take the 1st step onto the 1st road lane (Checkpoint 1)
      const moveRes = await chickenRoadApi.move(res.roundId);
      if (moveRes?.result === 'SAFE') {
        onCheckpointSafe({
          checkpoint: moveRes.checkpoint,
          multiplier: moveRes.multiplier,
          potentialPayout: moveRes.potentialPayout,
        });
      } else if (moveRes?.result === 'CRASH') {
        onRoundCrashed({
          checkpoint: moveRes.checkpoint,
          multiplier: moveRes.multiplier,
          serverSeed: moveRes.serverSeed,
        });
        setTimeout(() => {
          if (useChickenRoadStore.getState().status === 'CRASHED') {
            resetGame();
          }
        }, 1800);
      } else {
        onCheckpointSafe({
          checkpoint: 1,
          multiplier: 1.02,
          potentialPayout: betAmount * 1.02,
        });
      }
    } catch (err: any) {
      resetGame();
      // Re-sync balance from auth context on failure
      if (authBalance !== undefined && authBalance !== null) {
        setWalletBalance(authBalance);
      }
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to place bet';
      if (errMsg.includes('ACTIVE_ROUND_EXISTS') || err?.response?.status === 409) {
        if (typeof window !== 'undefined') {
          alert('Active round in progress on another device or tab. Please complete that active round first.');
        }
      } else {
        if (typeof window !== 'undefined') {
          alert(`Bet Failed: ${errMsg}`);
        }
      }
    } finally {
      setTimeout(() => {
        isPendingRef.current = false;
      }, 300);
    }
  }, [betAmount, difficulty, currency, authBalance, initRound, onCheckpointSafe, onRoundCrashed, resetGame, setWalletBalance]);

  // Handle Move / Cross Checkpoint
  const handleMove = useCallback(async () => {
    if (isPendingRef.current) return;
    const curState = useChickenRoadStore.getState();
    if (!curState.roundId || curState.status !== 'RUNNING') return;

    isPendingRef.current = true;

    try {
      const res = await chickenRoadApi.move(curState.roundId);
      
      const curStatus = useChickenRoadStore.getState().status;
      if (curStatus === 'CRASHED' || curStatus === 'CASHED_OUT') {
        isPendingRef.current = false;
        return;
      }

      if (res?.result === 'SAFE') {
        onCheckpointSafe({
          checkpoint: res.checkpoint,
          multiplier: res.multiplier,
          potentialPayout: res.potentialPayout,
        });
      } else if (res?.result === 'CRASH') {
        onRoundCrashed({
          checkpoint: res.checkpoint,
          multiplier: res.multiplier,
          serverSeed: res.serverSeed,
        });
        setTimeout(() => {
          if (useChickenRoadStore.getState().status === 'CRASHED') {
            resetGame();
          }
        }, 1800);
      } else {
        const nextCp = (curState.checkpoint || 0) + 1;
        onCheckpointSafe({
          checkpoint: nextCp,
          multiplier: 1.05,
          potentialPayout: curState.betAmount * 1.05,
        });
      }
    } catch (err: any) {
      // Fail-safe move fallback for offline / mock play
      const nextCp = (curState.checkpoint || 0) + 1;
      const safeProbMap: Record<string, number> = { easy: 0.95, medium: 0.85, hard: 0.70, hardcore: 0.50 };
      const safeProb = safeProbMap[curState.difficulty] || 0.95;
      const isSafe = Math.random() < safeProb || nextCp === 1;

      if (isSafe) {
        const mult = Math.floor(Math.pow(1 / safeProb, nextCp) * 0.97 * 100) / 100;
        onCheckpointSafe({
          checkpoint: nextCp,
          multiplier: mult,
          potentialPayout: curState.betAmount * mult,
        });
      } else {
        onRoundCrashed({
          checkpoint: nextCp,
          multiplier: 0,
        });
        setTimeout(() => {
          if (useChickenRoadStore.getState().status === 'CRASHED') {
            resetGame();
          }
        }, 1800);
      }
    } finally {
      setTimeout(() => {
        isPendingRef.current = false;
      }, 300);
    }
  }, [roundId, status, onCheckpointSafe, onRoundCrashed, resetGame]);

  // Handle Cashout
  const handleCashout = useCallback(async () => {
    if (!roundId || status !== 'RUNNING') return;

    try {
      const res = await chickenRoadApi.cashout(roundId);
      const payout = Number(res?.payout || useChickenRoadStore.getState().potentialPayout || 0);

      onRoundCashedOut({
        checkpoint: res?.checkpoint || useChickenRoadStore.getState().checkpoint,
        multiplier: res?.multiplier || useChickenRoadStore.getState().multiplier,
        payout,
        serverSeed: res?.serverSeed,
      });

      const serverBal = res?.walletBalance;
      const finalBalance = serverBal !== undefined && !isNaN(Number(serverBal))
        ? Number(serverBal)
        : Number(((authBalance !== undefined && authBalance !== null ? authBalance : (useChickenRoadStore.getState().walletBalance || 0)) + payout).toFixed(2));

      setWalletBalance(finalBalance);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wallet:updated', { detail: { balance: finalBalance } }));
      }
    } catch (err: any) {
      const curState = useChickenRoadStore.getState();
      const payout = Number(curState.potentialPayout || 0);

      onRoundCashedOut({
        checkpoint: curState.checkpoint,
        multiplier: curState.multiplier,
        payout,
      });

      const currentBal = authBalance !== undefined && authBalance !== null ? authBalance : (curState.walletBalance || 0);
      const updatedBalance = Number((currentBal + payout).toFixed(2));

      setWalletBalance(updatedBalance);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wallet:updated', { detail: { balance: updatedBalance } }));
      }
    }
  }, [roundId, status, authBalance, onRoundCashedOut, setWalletBalance]);

  return {
    handlePlay,
    handleMove,
    handleCashout,
    resetGame,
  };
};
