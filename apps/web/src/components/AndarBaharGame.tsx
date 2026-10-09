'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/lib/config';
import { TopHeader } from '@/components/Navigation';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import ValidationErrorModal, { ValidationErrorType } from './ValidationErrorModal';

import { PlayingCard } from './andar-bahar/PlayingCard';
import { AndarBaharHeader } from './andar-bahar/AndarBaharHeader';
import { GameStatusPanel } from './andar-bahar/GameStatusPanel';
import { PlayingTable, DealtCard } from './andar-bahar/PlayingTable';
import { BettingControls } from './andar-bahar/BettingControls';
import { RecentResultsBar } from './andar-bahar/RecentResultsBar';
import { OrdersHistoryTabs } from './andar-bahar/OrdersHistoryTabs';
import { BetConfirmationModal } from './andar-bahar/BetConfirmationModal';
import { AndarBaharRulesModal } from './andar-bahar/AndarBaharRulesModal';
import { FullHistoryModal, HistoryItemData } from './andar-bahar/FullHistoryModal';

// Web Audio API Sound Synthesizer
class AndarSoundEngine {
  private audioCtx: AudioContext | null = null;

  private init() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) this.audioCtx = new AC();
    }
  }

  private isMuted(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const savedGlobal =
        localStorage.getItem('rivexa_sound_enabled') ??
        localStorage.getItem('game_sound_enabled');
      if (savedGlobal === 'false') return true;
      const savedAndar = localStorage.getItem('andar_sound_enabled');
      if (savedAndar === 'false') return true;
    } catch {}
    return false;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, gainVal = 0.08) {
    if (this.isMuted()) return;
    try {
      this.init();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  public playCardFlip() {
    this.playTone(650, 'sine', 0.05, 0.08);
    setTimeout(() => this.playTone(850, 'triangle', 0.05, 0.06), 30);
  }

  public playWinSound() {
    this.playTone(523.25, 'sine', 0.15, 0.12);
    setTimeout(() => this.playTone(659.25, 'sine', 0.15, 0.12), 120);
    setTimeout(() => this.playTone(783.99, 'sine', 0.35, 0.15), 240);
  }

  public playLossSound() {
    this.playTone(240, 'sawtooth', 0.2, 0.12);
    setTimeout(() => this.playTone(180, 'sawtooth', 0.3, 0.12), 150);
  }
}

const soundEngine = new AndarSoundEngine();

export type GameStateEnum =
  | 'BETTING_OPEN'
  | 'BETTING_CLOSED'
  | 'DEALING'
  | 'RESULT_DECLARED'
  | 'SETTLED';

export function AndarBaharGame() {
  const { user, balance: authBalance, refreshBalance } = useAuth();
  const userId = user?.id;

  const [balanceState, setBalanceState] = useState<number>(0);
  const balance = authBalance ?? balanceState;

  // Game state machine
  const [period, setPeriod] = useState<string>('----------------');
  const [openCard, setOpenCard] = useState<string>('7♦');
  const [gameState, setGameState] = useState<GameStateEnum>('BETTING_OPEN');
  const [countdown, setCountdown] = useState<number>(30);
  const [bettingOpen, setBettingOpen] = useState<boolean>(true);

  // Raw server state vs Displayed state
  const [rawHistory, setRawHistory] = useState<any[]>([]);
  const [rawMyOrders, setRawMyOrders] = useState<any[]>([]);
  const [everyoneOrders, setEveryoneOrders] = useState<any[]>([]);

  const [displayedHistory, setDisplayedHistory] = useState<any[]>([]);
  const [displayedMyOrders, setDisplayedMyOrders] = useState<any[]>([]);

  // Modals & History
  const [isBetModalOpen, setIsBetModalOpen] = useState<boolean>(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);
  const [isFullHistoryOpen, setIsFullHistoryOpen] = useState<boolean>(false);
  const [fullHistoryData, setFullHistoryData] = useState<HistoryItemData[]>([]);

  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);
  const [resultModalInfo, setResultModalInfo] = useState<any>(null);

  // Bet Form
  const [selectedOption, setSelectedOption] = useState<'andar' | 'bahar' | 'tie'>('andar');
  const [betAmount, setBetAmount] = useState<number>(100);
  const [minBetLimit, setMinBetLimit] = useState<number>(10);
  const [maxBetLimit, setMaxBetLimit] = useState<number>(50000);
  const [isSubmittingBet, setIsSubmittingBet] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Validation Modal State
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    type: ValidationErrorType;
    message: string;
    requiredAmount?: number;
    minBet?: number;
    maxBet?: number;
    currentBalance?: number;
  } | null>(null);

  // Dealing Table Cards State
  const [andarCards, setAndarCards] = useState<DealtCard[]>([]);
  const [baharCards, setBaharCards] = useState<DealtCard[]>([]);
  const [dealStatusText, setDealStatusText] = useState<string>('WAITING FOR BETS');
  const [winningSideGlow, setWinningSideGlow] = useState<'andar' | 'bahar' | null>(null);
  const [isDealingAnimated, setIsDealingAnimated] = useState<boolean>(false);

  // Refs for dynamic trajectory calculation
  const deckRef = useRef<HTMLDivElement>(null);
  const andarRef = useRef<HTMLDivElement>(null);
  const baharRef = useRef<HTMLDivElement>(null);

  const dealIntervalRef = useRef<any>(null);
  const lastAnimatedPeriodRef = useRef<string | null>(null);

  // Auto hide toast message
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg: string) => setToastMessage(msg);

  // State polling every 1 sec
  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 1000);
    return () => {
      clearInterval(interval);
      if (dealIntervalRef.current) clearInterval(dealIntervalRef.current);
    };
  }, [userId]);

  const fetchGameState = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = userId
        ? `${apiBase}/games/andar-bahar/state?userId=${userId}`
        : `${apiBase}/games/andar-bahar/state`;

      const res = await fetch(url, { headers });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.status) return;

      setPeriod(data.period);
      setOpenCard(data.open_card || '7♦');
      setCountdown(data.countdown);
      setBettingOpen(data.betting_open);

      if (data.settings) {
        if (data.settings.min_bet !== undefined) setMinBetLimit(Number(data.settings.min_bet));
        if (data.settings.max_bet !== undefined) setMaxBetLimit(Number(data.settings.max_bet));
      }

      const isDealingPhase = !!data.is_dealing_phase || data.countdown === 0;

      // Determine authoritative game state machine
      if (data.betting_open) {
        setGameState('BETTING_OPEN');
        if (isDealingAnimated || andarCards.length > 0 || baharCards.length > 0) {
          setIsDealingAnimated(false);
          if (dealIntervalRef.current) {
            clearInterval(dealIntervalRef.current);
            dealIntervalRef.current = null;
          }
          resetDealingStage();
        }
      } else if (isDealingPhase || isDealingAnimated) {
        setGameState('DEALING');
      } else {
        setGameState('SETTLED');
      }

      if (data.history) {
        setRawHistory(data.history);
        if (!isDealingAnimated) {
          setDisplayedHistory(data.history.filter((h: any) => h.period_number !== data.period));
        }
      }

      if (data.my_orders) {
        setRawMyOrders(data.my_orders);
        const sanitizedOrders = data.my_orders.map((o: any) => {
          if (o.period_number === data.period || isDealingPhase || isDealingAnimated) {
            if (
              o.period_number === data.period ||
              (data.last_result &&
                o.period_number === data.last_result.period_number &&
                isDealingAnimated)
            ) {
              return { ...o, status: 'pending', win_amount: '0.00' };
            }
          }
          return o;
        });

        setDisplayedMyOrders(sanitizedOrders);
      }

      if (data.everyone_orders) setEveryoneOrders(data.everyone_orders);

      // Trigger Card Dealing Animation when in dealing phase & last_result is present
      if ((isDealingPhase || data.countdown === 0) && data.last_result) {
        if (!isDealingAnimated && lastAnimatedPeriodRef.current !== data.last_result.period_number) {
          animateDealingSequence(data.last_result, data.history || [], data.my_orders || []);
        }
      } else if (!isDealingPhase && data.countdown > 0) {
        if (isDealingAnimated || andarCards.length > 0 || baharCards.length > 0) {
          setIsDealingAnimated(false);
          if (dealIntervalRef.current) {
            clearInterval(dealIntervalRef.current);
            dealIntervalRef.current = null;
          }
          resetDealingStage();
        }
      }
    } catch (e) {}
  };

  const resetDealingStage = () => {
    setAndarCards([]);
    setBaharCards([]);
    setDealStatusText('WAITING FOR BETS');
    setWinningSideGlow(null);
  };

  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  /**
   * Fetch complete record history for the More > modal
   */
  const fetchFullHistory = async () => {
    setIsFullHistoryOpen(true);
    setIsLoadingHistory(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/andar-bahar/history`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : data.status && Array.isArray(data.data)
          ? data.data
          : data.status && Array.isArray(data.history)
          ? data.history
          : rawHistory;
        setFullHistoryData(list && list.length > 0 ? list : rawHistory);
      } else {
        setFullHistoryData(rawHistory);
      }
    } catch (e) {
      setFullHistoryData(rawHistory);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  /**
   * Calculate dynamic trajectory offsets from Deck to Target containers
   */
  const calculateTrajectory = (targetSide: 'andar' | 'bahar') => {
    if (!deckRef.current) return { startX: 0, startY: -40 };
    const deckRect = deckRef.current.getBoundingClientRect();
    const targetRef = targetSide === 'andar' ? andarRef.current : baharRef.current;
    if (!targetRef) return { startX: 0, startY: -40 };
    const targetRect = targetRef.getBoundingClientRect();

    const startX = deckRect.left + deckRect.width / 2 - (targetRect.left + targetRect.width / 2);
    const startY = deckRect.top + deckRect.height / 2 - (targetRect.top + targetRect.height / 2);

    return { startX, startY };
  };

  /**
   * Sequential Physical Card Dealing Loop (450ms throw per card)
   */
  const animateDealingSequence = (resultData: any, fullHistory: any[], userOrders: any[]) => {
    if (!resultData || !resultData.deal_sequence) return;

    lastAnimatedPeriodRef.current = resultData.period_number;
    setIsDealingAnimated(true);
    setGameState('DEALING');

    if (dealIntervalRef.current) {
      clearInterval(dealIntervalRef.current);
      dealIntervalRef.current = null;
    }

    const sequence: { card: string; side: 'andar' | 'bahar' }[] = resultData.deal_sequence;
    if (sequence.length === 0) return;

    setAndarCards([]);
    setBaharCards([]);
    setWinningSideGlow(null);
    setDealStatusText('⚡ CARDS DEALING...');

    let index = 0;
    const dealIntervalMs = 450;

    let localAndar: DealtCard[] = [];
    let localBahar: DealtCard[] = [];

    dealIntervalRef.current = setInterval(() => {
      if (index >= sequence.length) {
        clearInterval(dealIntervalRef.current);
        dealIntervalRef.current = null;

        const winner = (resultData.winner || '').toLowerCase();
        const winningCard = resultData.winning_card || '';

        setTimeout(() => {
          setGameState('RESULT_DECLARED');
          setDealStatusText(`🎉 WINNER: ${winner.toUpperCase()} (${winningCard})`);
          if (winner === 'andar' || winner === 'bahar') {
            setWinningSideGlow(winner);
          }

          setGameState('SETTLED');
          setDisplayedHistory(fullHistory);
          setDisplayedMyOrders(userOrders);

          checkAndShowUserResultModal(resultData, userOrders);

          // After 2.5 seconds, clear cards and transition status to WAITING FOR NEXT ROUND...
          setTimeout(() => {
            resetDealingStage();
            setDealStatusText('⏳ WAITING FOR NEXT ROUND...');
            setIsDealingAnimated(false);
          }, 2500);
        }, 450);

        return;
      }

      setDealStatusText('⚡ CARDS DEALING...');
      const item = sequence[index];
      const isMatching = index === sequence.length - 1;
      const { startX, startY } = calculateTrajectory(item.side);

      soundEngine.playCardFlip();

      const dealtItem: DealtCard = {
        card: item.card,
        side: item.side,
        startX,
        startY,
        isMatching,
      };

      if (item.side === 'andar') {
        localAndar = [...localAndar, dealtItem];
        setAndarCards(localAndar);
      } else {
        localBahar = [...localBahar, dealtItem];
        setBaharCards(localBahar);
      }

      index++;
    }, dealIntervalMs);
  };

  const checkAndShowUserResultModal = (resultData: any, userOrders: any[]) => {
    if (!resultData) return;
    const bet = userOrders.find((b: any) => b.period_number === resultData.period_number);
    if (!bet) return;

    const winner = (resultData.winner || '').toLowerCase();
    const betOption = (bet.bet_option || bet.selection || 'andar').toLowerCase();
    const betAmount = parseFloat(bet.bet_amount || bet.amount || 0);

    const isWon = betOption === winner || bet.status === 'won' || parseFloat(bet.win_amount || 0) > 0;
    const odds = betOption === 'tie' ? 9.0 : 2.0;
    const winAmount = isWon ? (parseFloat(bet.win_amount || 0) > 0 ? parseFloat(bet.win_amount) : betAmount * odds) : 0;

    setResultModalInfo({
      periodNumber: resultData.period_number,
      option: betOption.toUpperCase(),
      winner,
      winningCard: resultData.winning_card,
      isWon,
      winAmount,
      betAmount,
    });

    if (isWon) soundEngine.playWinSound();
    else soundEngine.playLossSound();

    setIsResultModalOpen(true);
    refreshBalance();
  };

  const handleOpenBetModal = (option: 'andar' | 'bahar' | 'tie') => {
    if (!bettingOpen || countdown === 0) {
      showToast('⚠️ Betting is closed for this period!');
      return;
    }
    setSelectedOption(option);
    setIsBetModalOpen(true);
  };

  const handleSubmitBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.id) {
      setIsBetModalOpen(false);
      setValidationModal({
        isOpen: true,
        type: 'AUTH_REQUIRED',
        message: 'Please log in to place bets on Andar Bahar.',
      });
      return;
    }

    if (betAmount < minBetLimit || betAmount > maxBetLimit) {
      setIsBetModalOpen(false);
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: `Bet amount must be between ₹${minBetLimit} and ₹${maxBetLimit.toLocaleString('en-IN')}.`,
        minBet: minBetLimit,
        maxBet: maxBetLimit,
        requiredAmount: betAmount,
      });
      return;
    }

    if (balance <= 0 || balance < betAmount) {
      setIsBetModalOpen(false);
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: `Your current balance (₹${balance.toFixed(2)}) is insufficient for a ₹${betAmount.toFixed(2)} bet. Please recharge your wallet.`,
        requiredAmount: betAmount,
        currentBalance: balance,
      });
      return;
    }

    setIsSubmittingBet(true);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/andar-bahar/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          bet_option: selectedOption,
          amount: betAmount,
        }),
      });

      const data = await res.json();
      setIsSubmittingBet(false);

      if (data.status) {
        setIsBetModalOpen(false);
        showToast(`🎉 Bet placed on ${selectedOption.toUpperCase()} for ₹${betAmount}!`);
        refreshBalance();
        fetchGameState();
      } else {
        setIsBetModalOpen(false);
        const errMsg = data.message || 'Failed to place bet.';
        if (errMsg.toLowerCase().includes('balance') || res.status === 400) {
          setValidationModal({
            isOpen: true,
            type: 'INSUFFICIENT_BALANCE',
            message: errMsg,
            requiredAmount: betAmount,
            currentBalance: balance,
          });
        } else {
          setValidationModal({
            isOpen: true,
            type: 'GAME_ERROR',
            message: errMsg,
          });
        }
      }
    } catch (err: any) {
      setIsSubmittingBet(false);
      setIsBetModalOpen(false);
      setValidationModal({
        isOpen: true,
        type: 'GAME_ERROR',
        message: err.message || 'Error placing bet.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#050B20] text-gray-100 flex flex-col font-sans selection:bg-[#00D9FF]/30 selection:text-[#00D9FF] relative overflow-x-hidden">
      {/* 🌌 High-Quality Ambient Background Lighting Spheres */}
      <div className="fixed top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,rgba(40,123,255,0.15)_0%,rgba(5,11,32,0)_70%)] pointer-events-none blur-3xl z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,rgba(135,59,255,0.12)_0%,rgba(5,11,32,0)_70%)] pointer-events-none blur-3xl z-0" />

      {/* Dynamic Keyframes for Trajectory Flying Cards */}
      <style jsx global>{`
        @keyframes flyFromDeck {
          0% {
            opacity: 0;
            transform: translate(var(--startX, 0px), var(--startY, -40px)) scale(0.4) rotate(-18deg);
          }
          50% {
            opacity: 1;
            transform: translate(calc(var(--startX, 0px) * 0.4), calc(var(--startY, -40px) * 0.4 - 15px)) scale(1.08) rotate(6deg);
          }
          100% {
            opacity: 1;
            transform: translate(0px, 0px) scale(1) rotate(0deg);
          }
        }
        .card-physical-fly {
          animation: flyFromDeck 0.45s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          will-change: transform, opacity;
        }
      `}</style>

      {/* Top Header */}
      <TopHeader balance={balance} onSearch={() => {}} />

      <div className="flex-1 flex w-full mx-auto max-w-[1700px] relative z-10 pt-[84px] lg:pl-[220px] xl:pl-60">
        {/* Sidebar */}
        <DesktopSidebar />

        {/* Main Content Arena */}
        <main className="flex-1 min-w-0 pb-16 lg:pb-6 px-2.5 sm:px-4 lg:px-5 py-3 space-y-3">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed top-20 right-4 z-50 bg-gradient-to-r from-[#00D9FF] via-[#00E5A0] to-[#00D9FF] text-[#03081B] font-black text-xs sm:text-sm py-2.5 px-5 rounded-full shadow-[0_0_30px_rgba(0,217,255,0.8)] animate-bounce flex items-center gap-2 border border-white/60">
              <span>{toastMessage}</span>
            </div>
          )}

          {/* ─── 1. GAME HEADER CARD ─── */}
          <AndarBaharHeader
            period={period}
            openCard={openCard}
            balance={balance}
            onOpenRules={() => setIsRulesModalOpen(true)}
          />

          {/* ─── 2. GAME STATUS PANEL (Timer, Win Amount, Balance) ─── */}
          <GameStatusPanel
            countdown={countdown}
            bettingOpen={bettingOpen}
            isDealing={isDealingAnimated || gameState === 'DEALING'}
            currentWin={0}
            balance={balance}
            openCard={openCard}
          />

          {/* ─── 3. LIVE DEALING TABLE (Andar / Bahar Card Areas & Deck Source) ─── */}
          <PlayingTable
            andarCards={andarCards}
            baharCards={baharCards}
            statusText={dealStatusText}
            winningSideGlow={winningSideGlow}
            deckRef={deckRef}
            andarRef={andarRef}
            baharRef={baharRef}
          />

          {/* ─── 4. BETTING CONTROLS (ANDAR 2.0x, TIE 9.0x, BAHAR 2.0x & Bet Input) ─── */}
          <BettingControls
            selectedOption={selectedOption}
            onSelectOption={setSelectedOption}
            betAmount={betAmount}
            onBetAmountChange={setBetAmount}
            bettingOpen={bettingOpen}
            balance={balance}
            minBet={minBetLimit}
            maxBet={maxBetLimit}
            onPlaceBet={handleOpenBetModal}
          />

          {/* ─── 5. RECORD HISTORY (Recent 30 Outcome Pills) ─── */}
          <RecentResultsBar
            history={displayedHistory}
            onViewAll={fetchFullHistory}
          />

          {/* ─── 6. MY ORDERS & EVERYONE'S ORDERS TABS ─── */}
          <OrdersHistoryTabs
            myOrders={displayedMyOrders}
            everyoneOrders={everyoneOrders}
          />
        </main>
      </div>

      {/* ─── BET CONFIRMATION MODAL ─── */}
      <BetConfirmationModal
        isOpen={isBetModalOpen}
        onClose={() => setIsBetModalOpen(false)}
        selectedOption={selectedOption}
        betAmount={betAmount}
        period={period}
        isSubmitting={isSubmittingBet}
        onConfirm={handleSubmitBet}
      />

      {/* ─── RULES MODAL ─── */}
      <AndarBaharRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

      {/* ─── COMPLETE RECORD HISTORY MODAL (When user clicks More >) ─── */}
      <FullHistoryModal
        isOpen={isFullHistoryOpen}
        onClose={() => setIsFullHistoryOpen(false)}
        historyData={fullHistoryData}
        isLoading={isLoadingHistory}
      />

      {/* ─── WIN / LOSS RESULT POPUP MODAL ─── */}
      {isResultModalOpen && resultModalInfo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#071735] border-2 border-[#00D9FF]/60 rounded-[28px] max-w-sm w-full p-5 sm:p-6 text-white space-y-4 shadow-[0_0_50px_rgba(0,217,255,0.4)] animate-in fade-in zoom-in-95 relative overflow-hidden text-center">
            <div className="text-4xl mb-1">
              {resultModalInfo.isWon ? '🏆' : '💔'}
            </div>

            <h3
              className={`text-xl font-black uppercase ${
                resultModalInfo.isWon ? 'text-[#00E5A0] drop-shadow-[0_0_12px_#00E5A0]' : 'text-[#FF3155]'
              }`}
            >
              {resultModalInfo.isWon ? 'YOU WON!' : 'ROUND LOST'}
            </h3>

            <p className="text-xs text-[#A5B4D0]">
              Period #{resultModalInfo.periodNumber} • Winner:{' '}
              <strong className="text-white uppercase">{resultModalInfo.winner}</strong> ({resultModalInfo.winningCard})
            </p>

            {resultModalInfo.isWon && (
              <div className="bg-[#0B1530] border border-[#00E5A0]/50 rounded-2xl p-3">
                <span className="text-[10px] text-[#A5B4D0] uppercase font-bold block">
                  PAYOUT AMOUNT
                </span>
                <span className="text-2xl font-black font-mono text-[#00E5A0] drop-shadow-[0_0_12px_rgba(0,229,160,0.8)]">
                  +₹{Number(resultModalInfo.winAmount).toFixed(2)}
                </span>
              </div>
            )}

            <button
              onClick={() => setIsResultModalOpen(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00E5A0] to-[#00D9FF] text-[#03081B] font-black text-xs uppercase tracking-wide shadow-lg cursor-pointer"
            >
              CONTINUE PLAYING
            </button>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {validationModal?.isOpen && (
        <ValidationErrorModal
          isOpen={validationModal.isOpen}
          type={validationModal.type}
          message={validationModal.message}
          minBet={validationModal.minBet}
          maxBet={validationModal.maxBet}
          requiredAmount={validationModal.requiredAmount}
          currentBalance={validationModal.currentBalance}
          onClose={() => setValidationModal(null)}
        />
      )}
    </div>
  );
}
