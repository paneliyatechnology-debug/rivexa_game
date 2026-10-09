'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl, getWsBaseUrl } from '@/lib/config';
import ValidationErrorModal, { ValidationErrorType } from './ValidationErrorModal';
import { io, Socket } from 'socket.io-client';

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
}

interface SimulatedPlayer {
  id: string;
  username: string;
  amount: number;
  targetMult: number;
  cashedOut: boolean;
  cashoutMult: number;
  payout: number;
}

const INDIAN_PLAYER_NAMES = [
  'Rohan_Win', 'PushpaFan99', 'Karan_77', 'Vikram_K', 'Priya_Bet',
  'Rajesh_365', 'Anit_King', 'Suresh_V', 'Deepak_Express', 'Sunil_Bahar',
  'Amit_Rider', 'Vijay_Pro', 'Manish_786', 'Pooja_Lucky', 'Rahul_Star'
];

export function PushparaniGame() {
  const { user, balance: contextBalance } = useAuth();
  const [balance, setBalance] = useState<number>(contextBalance || 0);

  // Fetch live wallet balance
  const fetchUserWalletBalance = useCallback(async () => {
    let effectiveUserId = user?.id;
    if (!effectiveUserId && typeof window !== 'undefined') {
      const savedUserStr = localStorage.getItem('rivexa_user');
      if (savedUserStr) {
        try {
          const u = JSON.parse(savedUserStr);
          effectiveUserId = u.id;
        } catch (e) {}
      }
    }
    if (!effectiveUserId) return;

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/wallet/balance?userId=${effectiveUserId}`);
      if (res.ok) {
        const data = await res.json();
        const mainBal = Number(data.mainBalance);
        if (!isNaN(mainBal)) {
          setBalance(mainBal);
        }
      }
    } catch (e) {}
  }, [user?.id]);

  useEffect(() => {
    fetchUserWalletBalance();
  }, [fetchUserWalletBalance]);

  useEffect(() => {
    if (contextBalance !== undefined && contextBalance !== null && contextBalance > 0) {
      setBalance(contextBalance);
    }
  }, [contextBalance]);

  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved =
        localStorage.getItem('pushparani_sound_enabled') ??
        localStorage.getItem('rivexa_sound_enabled') ??
        localStorage.getItem('game_sound_enabled');
      if (saved !== null) {
        setSoundEnabled(saved === 'true');
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem('pushparani_sound_enabled', String(soundEnabled));
      localStorage.setItem('rivexa_sound_enabled', String(soundEnabled));
      localStorage.setItem('game_sound_enabled', String(soundEnabled));
    } catch (e) {}
    if (!soundEnabled) {
      stopPushpaBgmSound();
      stopVoiceDialogue();
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend();
      }
    }
  }, [soundEnabled, mounted]);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);
  const [isSelectModalOpen1, setIsSelectModalOpen1] = useState<boolean>(false);
  const [isSelectModalOpen2, setIsSelectModalOpen2] = useState<boolean>(false);

  // History Pills from API
  const [historyPills, setHistoryPills] = useState<number[]>([]);

  // Round Engine State from API
  const [roundId, setRoundId] = useState<string>('—');
  const [status, setStatus] = useState<'BETTING_OPEN' | 'FLYING' | 'CRASHED'>('BETTING_OPEN');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(5);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);

  // Dynamic Crash Type (Randomized per round: 'POLICE_CAR' or 'MOUNTAIN_ROCK')
  const [crashType, setCrashType] = useState<'POLICE_CAR' | 'MOUNTAIN_ROCK'>('POLICE_CAR');

  // Dynamic Environment Theme ('FOREST' | 'CITY' | 'DESERT') - Rotates every 7 seconds
  const [envTheme, setEnvTheme] = useState<'FOREST' | 'CITY' | 'DESERT'>('FOREST');
  const envThemeRef = useRef<'FOREST' | 'CITY' | 'DESERT'>('FOREST');

  useEffect(() => {
    envThemeRef.current = envTheme;
  }, [envTheme]);

  useEffect(() => {
    const themes: ('FOREST' | 'CITY' | 'DESERT')[] = ['FOREST', 'CITY', 'DESERT'];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % themes.length;
      setEnvTheme(themes[idx]);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  // Live Player Bets from API + Dynamic simulated players
  const [roundBets, setRoundBets] = useState<any[]>([]);
  const [simulatedPlayers, setSimulatedPlayers] = useState<SimulatedPlayer[]>([]);

  // Validation Error Popup Modal State
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    type: ValidationErrorType;
    message: string;
    requiredAmount?: number;
    minBet?: number;
    maxBet?: number;
    currentBalance?: number;
  } | null>(null);

  // DUAL BET PANEL 1 STATE
  const [betAmount1, setBetAmount1] = useState<number>(50.0);
  const [autoCashout1, setAutoCashout1] = useState<string>('2.00');
  const [autoCashoutEnabled1, setAutoCashoutEnabled1] = useState<boolean>(false);
  const [activeBetId1, setActiveBetId1] = useState<string | null>(null);
  const [userBetStatus1, setUserBetStatus1] = useState<'NONE' | 'PENDING' | 'CASHED_OUT' | 'LOST'>('NONE');

  // DUAL BET PANEL 2 STATE
  const [betAmount2, setBetAmount2] = useState<number>(50.0);
  const [autoCashout2, setAutoCashout2] = useState<string>('3.00');
  const [autoCashoutEnabled2, setAutoCashoutEnabled2] = useState<boolean>(false);
  const [activeBetId2, setActiveBetId2] = useState<string | null>(null);
  const [userBetStatus2, setUserBetStatus2] = useState<'NONE' | 'PENDING' | 'CASHED_OUT' | 'LOST'>('NONE');

  // Pushpa Original BGM Soundtrack Audio Engine (SINGLE EXCLUSIVE BGM SOUNDTRACK)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pushpaBgmRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopPushpaBgmSound = () => {
    try {
      if (pushpaBgmRef.current) {
        pushpaBgmRef.current.pause();
        pushpaBgmRef.current.currentTime = 0;
      }
    } catch (e) {}
  };

  const stopVoiceDialogue = () => {
    try {
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current.currentTime = 0;
      }
    } catch (e) {}
  };

  const stopAllPushpaAudio = useCallback(() => {
    try {
      if (pushpaBgmRef.current) {
        pushpaBgmRef.current.pause();
        pushpaBgmRef.current.currentTime = 0;
        pushpaBgmRef.current.removeAttribute('src');
        pushpaBgmRef.current.load();
        pushpaBgmRef.current = null;
      }
    } catch (e) {}
    try {
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current.currentTime = 0;
        voiceAudioRef.current.removeAttribute('src');
        voiceAudioRef.current.load();
        voiceAudioRef.current = null;
      }
    } catch (e) {}
    try {
      if (audioCtxRef.current) {
        if (audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(() => {});
        }
        audioCtxRef.current = null;
      }
    } catch (e) {}
  }, []);

  const startPushpaBgmSound = () => {
    if (!soundEnabled) {
      stopPushpaBgmSound();
      return;
    }
    try {
      if (!pushpaBgmRef.current) {
        const bgm = new Audio('/audio/pushpa_bgm.mp3');
        bgm.loop = true;
        bgm.volume = 0.90;
        pushpaBgmRef.current = bgm;
      }
      const bgm = pushpaBgmRef.current;
      if (bgm.paused) {
        bgm.play().catch(() => {});
      }
    } catch (e) {}
  };

  const playVoiceDialogue = () => {
    if (!soundEnabled) return;
    try {
      stopVoiceDialogue();
      const audio = new Audio('/audio/pushpa_jhukega_nahi.mp3');
      audio.playbackRate = 1.0;
      audio.volume = 1.0;
      voiceAudioRef.current = audio;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  const playSoundEffect = (type: 'horn' | 'win' | 'crash' | 'click' | 'voice' | 'siren') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;

      if (type === 'voice') {
        playVoiceDialogue();
      } else if (type === 'horn') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(554.37, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
      } else if (type === 'win') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.35);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.38);
      } else if (type === 'crash') {
        // Multi-layered Realistic Explosive Truck Crash + Metal Crunch Sound
        const boomOsc = ctx.createOscillator();
        const boomGain = ctx.createGain();
        boomOsc.type = 'triangle';
        boomOsc.frequency.setValueAtTime(220, now);
        boomOsc.frequency.exponentialRampToValueAtTime(30, now + 0.8);
        boomGain.gain.setValueAtTime(0.65, now);
        boomGain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);
        boomOsc.connect(boomGain);
        boomGain.connect(ctx.destination);
        boomOsc.start(now);
        boomOsc.stop(now + 0.85);

        // Tire Screech / Metal Skidding
        const screechOsc = ctx.createOscillator();
        const screechGain = ctx.createGain();
        screechOsc.type = 'sawtooth';
        screechOsc.frequency.setValueAtTime(1400, now);
        screechOsc.frequency.exponentialRampToValueAtTime(350, now + 0.4);
        screechGain.gain.setValueAtTime(0.35, now);
        screechGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        screechOsc.connect(screechGain);
        screechGain.connect(ctx.destination);
        screechOsc.start(now);
        screechOsc.stop(now + 0.45);

        // Sandalwood Logs Impact Crunch (Noise Burst)
        const bufferSize = ctx.sampleRate * 0.5;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + 0.5);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.55, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        whiteNoise.start(now);
        whiteNoise.stop(now + 0.5);
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {}
  };

  // Master Sound Control Hook (Handles Sound On/Off and State Transitions)
  useEffect(() => {
    if (!soundEnabled) {
      stopPushpaBgmSound();
      stopVoiceDialogue();
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend();
      }
    } else {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      if (status === 'FLYING') {
        startPushpaBgmSound();
      } else {
        stopPushpaBgmSound();
        if (status === 'CRASHED') {
          playSoundEffect('crash');
        }
      }
    }
  }, [status, soundEnabled]);

  // Mobile & Route Lifecycle Sound Cleanup Hook (Fixes sound continuing when leaving game on mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        stopPushpaBgmSound();
        stopVoiceDialogue();
        if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
          audioCtxRef.current.suspend().catch(() => {});
        }
      } else if (document.visibilityState === 'visible' && soundEnabled && status === 'FLYING') {
        startPushpaBgmSound();
      }
    };

    const handleFullCleanup = () => {
      stopAllPushpaAudio();
    };

    const handleSoundChange = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom?.detail?.enabled !== undefined) {
        setSoundEnabled(custom.detail.enabled);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleFullCleanup);
    window.addEventListener('beforeunload', handleFullCleanup);
    window.addEventListener('popstate', handleFullCleanup);
    window.addEventListener('sound_preference_changed', handleSoundChange);
    window.addEventListener('route_change_audio_cleanup', handleFullCleanup);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleFullCleanup);
      window.removeEventListener('beforeunload', handleFullCleanup);
      window.removeEventListener('popstate', handleFullCleanup);
      window.removeEventListener('sound_preference_changed', handleSoundChange);
      window.removeEventListener('route_change_audio_cleanup', handleFullCleanup);
      stopAllPushpaAudio();
    };
  }, [soundEnabled, status, stopAllPushpaAudio]);

  // Trigger male voice line when BETTING_OPEN starts and pick random crash type
  useEffect(() => {
    if (status === 'BETTING_OPEN') {
      if (soundEnabled) {
        playSoundEffect('voice');
      }
      setCrashType(Math.random() > 0.5 ? 'POLICE_CAR' : 'MOUNTAIN_ROCK');
    }
  }, [status, roundId]);

  // Generate simulated live player bets
  useEffect(() => {
    if (status === 'BETTING_OPEN') {
      const count = Math.floor(Math.random() * 6) + 8;
      const players: SimulatedPlayer[] = [];
      for (let i = 0; i < count; i++) {
        const name = INDIAN_PLAYER_NAMES[Math.floor(Math.random() * INDIAN_PLAYER_NAMES.length)] + Math.floor(Math.random() * 99);
        const amt = [50, 100, 200, 500, 1000, 2000][Math.floor(Math.random() * 6)];
        const target = +(1.1 + Math.random() * 4.5).toFixed(2);
        players.push({
          id: `sim_${i}_${Date.now()}`,
          username: name,
          amount: amt,
          targetMult: target,
          cashedOut: false,
          cashoutMult: 0,
          payout: 0,
        });
      }
      setSimulatedPlayers(players);
    }
  }, [status, roundId]);

  // Update simulated player cashouts during flight
  useEffect(() => {
    if (status === 'FLYING') {
      setSimulatedPlayers((prev) =>
        prev.map((p) => {
          if (!p.cashedOut && currentMultiplier >= p.targetMult) {
            return {
              ...p,
              cashedOut: true,
              cashoutMult: p.targetMult,
              payout: +(p.amount * p.targetMult).toFixed(2),
            };
          }
          return p;
        })
      );
    }
  }, [status, currentMultiplier]);

  // Auto cashout checking
  useEffect(() => {
    if (status === 'FLYING') {
      if (userBetStatus1 === 'PENDING' && autoCashoutEnabled1 && autoCashout1) {
        const target = parseFloat(autoCashout1);
        if (!isNaN(target) && currentMultiplier >= target) {
          handleCashout1();
        }
      }
      if (userBetStatus2 === 'PENDING' && autoCashoutEnabled2 && autoCashout2) {
        const target = parseFloat(autoCashout2);
        if (!isNaN(target) && currentMultiplier >= target) {
          handleCashout2();
        }
      }
    }
  }, [status, currentMultiplier, userBetStatus1, userBetStatus2, autoCashoutEnabled1, autoCashoutEnabled2]);

  // Canvas Reference & Animation Loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const roadOffsetRef = useRef<number>(0);
  const obstacleProgressRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);

  // Image Asset Preloading for Truck, Police Car, Mountain Rock Boulder, and Exploding Sandalwood Logs
  const truckImgRef = useRef<HTMLImageElement | null>(null);
  const policeCarImgRef = useRef<HTMLImageElement | null>(null);
  const rockImgRef = useRef<HTMLImageElement | null>(null);
  const explodingLogsImgRef = useRef<HTMLImageElement | null>(null);
  const imagesLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 4) {
        imagesLoadedRef.current = true;
      }
    };

    const tImg = new Image();
    tImg.src = '/images/pushpa/truck.png';
    tImg.onload = checkLoaded;
    truckImgRef.current = tImg;

    const pImg = new Image();
    pImg.src = '/images/pushpa/police_car.png';
    pImg.onload = checkLoaded;
    policeCarImgRef.current = pImg;

    const rImg = new Image();
    rImg.src = '/images/pushpa/mountain_rock.png';
    rImg.onload = checkLoaded;
    rockImgRef.current = rImg;

    const lImg = new Image();
    lImg.src = '/images/pushpa/exploding_logs.png';
    lImg.onload = checkLoaded;
    explodingLogsImgRef.current = lImg;
  }, []);

  // Initialize Canvas Stars
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 70; i++) {
      stars.push({
        x: Math.random() * 1200,
        y: Math.random() * 260,
        radius: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.85 + 0.15,
        speed: Math.random() * 0.6 + 0.3,
      });
    }
    starsRef.current = stars;
  }, []);

  // Canvas Render Loop with Prominent Cartoon Pushpa Character & Dynamic Accidents
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localOffset = roadOffsetRef.current;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      const activeTheme = envThemeRef.current;

      // 1. Sky Atmosphere Gradient & Glowing Celestial Body
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.68);
      if (activeTheme === 'CITY') {
        skyGrad.addColorStop(0, '#080214');
        skyGrad.addColorStop(0.4, '#15052a');
        skyGrad.addColorStop(0.8, '#290a42');
        skyGrad.addColorStop(1, '#3d0c5a');
      } else if (activeTheme === 'DESERT') {
        skyGrad.addColorStop(0, '#18040b');
        skyGrad.addColorStop(0.4, '#3b0712');
        skyGrad.addColorStop(0.8, '#781717');
        skyGrad.addColorStop(1, '#b44c10');
      } else {
        skyGrad.addColorStop(0, '#040711');
        skyGrad.addColorStop(0.4, '#0d1326');
        skyGrad.addColorStop(0.8, '#1a1836');
        skyGrad.addColorStop(1, '#2a1f45');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Glowing Celestial Body (Moon / Cyber Ring / Sunset Sun)
      const celestialX = width * 0.85;
      const celestialY = height * 0.16;
      if (activeTheme === 'CITY') {
        const moonGlow = ctx.createRadialGradient(celestialX, celestialY, 15, celestialX, celestialY, 75);
        moonGlow.addColorStop(0, 'rgba(0, 240, 255, 0.95)');
        moonGlow.addColorStop(0.4, 'rgba(255, 0, 127, 0.40)');
        moonGlow.addColorStop(1, 'rgba(255, 0, 127, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, 75, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, 22, 0, Math.PI * 2);
        ctx.fill();
      } else if (activeTheme === 'DESERT') {
        const sunGlow = ctx.createRadialGradient(celestialX, celestialY + 20, 20, celestialX, celestialY + 20, 85);
        sunGlow.addColorStop(0, 'rgba(251, 146, 60, 0.95)');
        sunGlow.addColorStop(0.5, 'rgba(239, 68, 68, 0.40)');
        sunGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(celestialX, celestialY + 20, 85, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(celestialX, celestialY + 20, 28, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const moonGlow = ctx.createRadialGradient(celestialX, celestialY, 15, celestialX, celestialY, 70);
        moonGlow.addColorStop(0, 'rgba(255, 255, 235, 0.95)');
        moonGlow.addColorStop(0.3, 'rgba(254, 240, 138, 0.35)');
        moonGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, 70, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fefce8';
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Stars Animation
      starsRef.current.forEach((star) => {
        if (status === 'FLYING') {
          star.x -= star.speed * (currentMultiplier > 2.5 ? 2.8 : 1.2);
          if (star.x < 0) star.x = width;
        }
        ctx.fillStyle = activeTheme === 'CITY' ? `rgba(0, 240, 255, ${star.alpha})` : `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. PARALLAX BACKGROUND SCENERY (FOREST / CITY / DESERT)
      if (activeTheme === 'CITY') {
        // METRO CITY SKYSCRAPER SKYLINE & NEON BUILDINGS
        ctx.fillStyle = '#100524';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.68);
        ctx.lineTo(width * 0.15, height * 0.50);
        ctx.lineTo(width * 0.35, height * 0.68);
        ctx.lineTo(width * 0.55, height * 0.45);
        ctx.lineTo(width * 0.75, height * 0.68);
        ctx.lineTo(width, height * 0.52);
        ctx.lineTo(width, height * 0.68);
        ctx.fill();

        // Back Skyscrapers Layer with Window Grid Glow
        ctx.fillStyle = '#180830';
        const cityBackSpacing = 60;
        const cityBackParallax = status === 'FLYING' ? (localOffset * 0.20) % cityBackSpacing : 0;
        for (let bx = -80; bx < width + 100; bx += cityBackSpacing) {
          const bX = bx - cityBackParallax;
          const bH = 90 + Math.abs((bx * 7) % 70);
          ctx.fillRect(bX, height * 0.68 - bH, 45, bH);
          ctx.fillStyle = 'rgba(0, 240, 255, 0.40)';
          for (let wy = height * 0.68 - bH + 10; wy < height * 0.68 - 15; wy += 14) {
            ctx.fillRect(bX + 8, wy, 8, 6);
            ctx.fillRect(bX + 24, wy, 8, 6);
          }
          ctx.fillStyle = '#180830';
        }

        // Front Neon Skyscrapers Layer with Antenna Towers & Red Beacons
        ctx.fillStyle = '#281248';
        const cityFrontSpacing = 110;
        const cityFrontParallax = status === 'FLYING' ? (localOffset * 0.45) % cityFrontSpacing : 0;
        for (let bx = -100; bx < width + 120; bx += cityFrontSpacing) {
          const bX = bx - cityFrontParallax;
          const bH = 130 + Math.abs((bx * 11) % 80);
          const bW = 75;
          ctx.fillRect(bX, height * 0.68 - bH, bW, bH);

          // Antenna Mast on Top with Blinking Red Beacon
          ctx.strokeStyle = '#e11d48';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bX + bW / 2, height * 0.68 - bH);
          ctx.lineTo(bX + bW / 2, height * 0.68 - bH - 30);
          ctx.stroke();

          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(bX + bW / 2, height * 0.68 - bH - 30, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Illuminated Windows & Neon Stripes
          ctx.fillStyle = (Math.abs(bx) % 2 === 0) ? 'rgba(250, 204, 21, 0.70)' : 'rgba(255, 0, 127, 0.70)';
          for (let wy = height * 0.68 - bH + 15; wy < height * 0.68 - 20; wy += 18) {
            ctx.fillRect(bX + 12, wy, 12, 8);
            ctx.fillRect(bX + 32, wy, 12, 8);
            ctx.fillRect(bX + 52, wy, 12, 8);
          }
          ctx.fillStyle = '#281248';
        }
      } else if (activeTheme === 'DESERT') {
        // DESERT CANYON MESAS & ROCK OUTCROPS
        ctx.fillStyle = '#29060c';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.68);
        ctx.lineTo(width * 0.18, height * 0.42);
        ctx.lineTo(width * 0.38, height * 0.68);
        ctx.lineTo(width * 0.62, height * 0.38);
        ctx.lineTo(width * 0.82, height * 0.68);
        ctx.lineTo(width, height * 0.48);
        ctx.lineTo(width, height * 0.68);
        ctx.fill();

        // Sand Dunes Layer
        ctx.fillStyle = '#4e0c15';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.68);
        ctx.bezierCurveTo(width * 0.25, height * 0.55, width * 0.45, height * 0.64, width * 0.70, height * 0.52);
        ctx.bezierCurveTo(width * 0.85, height * 0.62, width * 0.95, height * 0.58, width, height * 0.68);
        ctx.lineTo(width, height * 0.68);
        ctx.fill();

        // Saguaro Cacti & Desert Palms Silhouettes
        ctx.fillStyle = '#73131e';
        const desertSpacing = 90;
        const desertParallax = status === 'FLYING' ? (localOffset * 0.45) % desertSpacing : 0;
        for (let dx = -80; dx < width + 100; dx += desertSpacing) {
          const dX = dx - desertParallax;
          ctx.fillRect(dX + 15, height * 0.68 - 75, 10, 75);
          ctx.fillRect(dX, height * 0.68 - 55, 15, 8);
          ctx.fillRect(dX, height * 0.68 - 70, 8, 15);
          ctx.fillRect(dX + 25, height * 0.68 - 45, 15, 8);
          ctx.fillRect(dX + 32, height * 0.68 - 62, 8, 17);
        }
      } else {
        // SANDALWOOD FOREST & PINE MOUNTAINS
        ctx.fillStyle = '#0a0d1a';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.68);
        ctx.bezierCurveTo(width * 0.15, height * 0.45, width * 0.30, height * 0.60, width * 0.45, height * 0.40);
        ctx.bezierCurveTo(width * 0.60, height * 0.62, width * 0.80, height * 0.38, width, height * 0.68);
        ctx.lineTo(width, height * 0.68);
        ctx.fill();

        ctx.fillStyle = '#10192e';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.68);
        ctx.lineTo(width * 0.20, height * 0.48);
        ctx.lineTo(width * 0.40, height * 0.68);
        ctx.lineTo(width * 0.62, height * 0.43);
        ctx.lineTo(width * 0.85, height * 0.68);
        ctx.lineTo(width, height * 0.52);
        ctx.lineTo(width, height * 0.68);
        ctx.fill();

        // Back Forest Trees Layer (#091c21)
        ctx.fillStyle = '#091c21';
        const backTreeSpacing = 32;
        const backParallax = status === 'FLYING' ? (localOffset * 0.25) % backTreeSpacing : 0;
        for (let tx = -40; tx < width + 60; tx += backTreeSpacing) {
          const treeX = tx - backParallax;
          ctx.beginPath();
          ctx.moveTo(treeX + 12, height * 0.68 - 110);
          ctx.lineTo(treeX, height * 0.68 - 60);
          ctx.lineTo(treeX + 6, height * 0.68 - 60);
          ctx.lineTo(treeX - 4, height * 0.68 - 20);
          ctx.lineTo(treeX + 8, height * 0.68 - 20);
          ctx.lineTo(treeX + 8, height * 0.68);
          ctx.lineTo(treeX + 16, height * 0.68);
          ctx.lineTo(treeX + 16, height * 0.68 - 20);
          ctx.lineTo(treeX + 28, height * 0.68 - 20);
          ctx.lineTo(treeX + 18, height * 0.68 - 60);
          ctx.lineTo(treeX + 24, height * 0.68 - 60);
          ctx.closePath();
          ctx.fill();
        }

        // Front Dense Forest Layer (#0e2e34)
        ctx.fillStyle = '#0e2e34';
        const frontTreeSpacing = 55;
        const frontParallax = status === 'FLYING' ? (localOffset * 0.55) % frontTreeSpacing : 0;
        for (let tx = -60; tx < width + 80; tx += frontTreeSpacing) {
          const treeX = tx - frontParallax;
          ctx.beginPath();
          ctx.moveTo(treeX + 20, height * 0.68 - 145);
          ctx.lineTo(treeX, height * 0.68 - 85);
          ctx.lineTo(treeX + 8, height * 0.68 - 85);
          ctx.lineTo(treeX - 6, height * 0.68 - 35);
          ctx.lineTo(treeX + 10, height * 0.68 - 35);
          ctx.lineTo(treeX + 14, height * 0.68);
          ctx.lineTo(treeX + 26, height * 0.68);
          ctx.lineTo(treeX + 30, height * 0.68 - 35);
          ctx.lineTo(treeX + 46, height * 0.68 - 35);
          ctx.lineTo(treeX + 32, height * 0.68 - 85);
          ctx.lineTo(treeX + 40, height * 0.68 - 85);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#071b1f';
          ctx.beginPath();
          ctx.moveTo(treeX + 20, height * 0.68 - 145);
          ctx.lineTo(treeX + 20, height * 0.68);
          ctx.lineTo(treeX + 26, height * 0.68);
          ctx.lineTo(treeX + 30, height * 0.68 - 35);
          ctx.lineTo(treeX + 46, height * 0.68 - 35);
          ctx.lineTo(treeX + 32, height * 0.68 - 85);
          ctx.lineTo(treeX + 40, height * 0.68 - 85);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#0e2e34';
        }
      }

      // 4. REAL ASPHALT ROAD SURFACE & SHOULDER DESIGN
      const roadTop = height * 0.68;
      const roadHeight = height - roadTop;

      const shoulderGrad = ctx.createLinearGradient(0, roadTop, 0, roadTop + 18);
      if (activeTheme === 'CITY') {
        shoulderGrad.addColorStop(0, '#0c1020');
        shoulderGrad.addColorStop(1, '#162038');
      } else if (activeTheme === 'DESERT') {
        shoulderGrad.addColorStop(0, '#360e0a');
        shoulderGrad.addColorStop(1, '#5c1912');
      } else {
        shoulderGrad.addColorStop(0, '#0a1c12');
        shoulderGrad.addColorStop(1, '#153823');
      }
      ctx.fillStyle = shoulderGrad;
      ctx.fillRect(0, roadTop, width, 18);

      const kerbWidth = 28;
      const kerbOffset = status === 'FLYING' ? (localOffset % (kerbWidth * 2)) : 0;
      for (let kx = -kerbWidth * 2; kx < width + kerbWidth * 2; kx += kerbWidth * 2) {
        const renderKx = kx - kerbOffset;
        if (activeTheme === 'CITY') {
          ctx.fillStyle = '#00e5ff';
          ctx.fillRect(renderKx, roadTop + 14, kerbWidth, 6);
          ctx.fillStyle = '#ff007f';
          ctx.fillRect(renderKx + kerbWidth, roadTop + 14, kerbWidth, 6);
        } else if (activeTheme === 'DESERT') {
          ctx.fillStyle = '#d97706';
          ctx.fillRect(renderKx, roadTop + 14, kerbWidth, 6);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(renderKx + kerbWidth, roadTop + 14, kerbWidth, 6);
        } else {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(renderKx, roadTop + 14, kerbWidth, 6);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(renderKx + kerbWidth, roadTop + 14, kerbWidth, 6);
        }
      }

      const asphaltGrad = ctx.createLinearGradient(0, roadTop + 20, 0, height);
      if (activeTheme === 'CITY') {
        asphaltGrad.addColorStop(0, '#0f1424');
        asphaltGrad.addColorStop(0.5, '#192238');
        asphaltGrad.addColorStop(1, '#0b0f1c');
      } else if (activeTheme === 'DESERT') {
        asphaltGrad.addColorStop(0, '#1c141d');
        asphaltGrad.addColorStop(0.5, '#291e2b');
        asphaltGrad.addColorStop(1, '#140c15');
      } else {
        asphaltGrad.addColorStop(0, '#141923');
        asphaltGrad.addColorStop(0.5, '#1e2633');
        asphaltGrad.addColorStop(1, '#11151f');
      }
      ctx.fillStyle = asphaltGrad;
      ctx.fillRect(0, roadTop + 20, width, roadHeight - 20);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      const streakSpacing = 80;
      for (let sx = -100; sx < width + 100; sx += streakSpacing) {
        const streakX = sx - (status === 'FLYING' ? (localOffset * 1.6) % streakSpacing : 0);
        ctx.fillRect(streakX, roadTop + 24, 35, 2);
        ctx.fillRect(streakX + 25, roadTop + 55, 20, 1.5);
        ctx.fillRect(streakX - 10, roadTop + 85, 45, 2);
      }

      ctx.fillStyle = activeTheme === 'CITY' ? '#00f0ff' : activeTheme === 'DESERT' ? '#fde047' : '#e2e8f0';
      ctx.fillRect(0, roadTop + 22, width, 3);
      ctx.fillRect(0, height - 8, width, 3);

      if (status === 'FLYING') {
        localOffset += 15 * Math.min(3.0, 0.9 + currentMultiplier * 0.20);
        roadOffsetRef.current = localOffset;
      }
      if (activeTheme === 'CITY') {
        ctx.strokeStyle = '#00f0ff';
        ctx.shadowColor = '#ff007f';
      } else if (activeTheme === 'DESERT') {
        ctx.strokeStyle = '#facc15';
        ctx.shadowColor = '#eab308';
      } else {
        ctx.strokeStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
      }
      ctx.lineWidth = 5;
      ctx.shadowBlur = 8;
      ctx.setLineDash([32, 28]);
      ctx.lineDashOffset = -localOffset;

      const laneY = roadTop + 22 + (roadHeight - 28) / 2;
      ctx.beginPath();
      ctx.moveTo(0, laneY - 4);
      ctx.lineTo(width, laneY - 4);
      ctx.moveTo(0, laneY + 4);
      ctx.lineTo(width, laneY + 4);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.shadowBlur = 0;



      // 6. TRUCK WITH PUSHPA DRIVING IN CABIN & DYNAMIC ROTATING WHEELS
      const tw = 295;
      const th = 141;
      const truckBaseY = roadTop - 110;
      const truckX = status === 'CRASHED' ? width * 0.34 - 30 : width * 0.31 - 30;
      const bounceY = status === 'FLYING' ? Math.sin(Date.now() / 70) * 3.5 : 0;
      const truckY = truckBaseY + bounceY;

      // Headlight Beam
      if (status === 'FLYING' || status === 'BETTING_OPEN') {
        const hx = truckX + tw - 10;
        const hy = truckY + th * 0.65;
        const lightGrad = ctx.createRadialGradient(hx, hy, 10, hx + 280, hy, 260);
        lightGrad.addColorStop(0, 'rgba(255, 235, 150, 0.85)');
        lightGrad.addColorStop(0.5, 'rgba(250, 204, 21, 0.35)');
        lightGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = lightGrad;
        ctx.beginPath();
        ctx.moveTo(hx, hy - 15);
        ctx.lineTo(hx + 280, hy - 50);
        ctx.lineTo(hx + 280, hy + 50);
        ctx.lineTo(hx, hy + 15);
        ctx.fill();
      }

      // Red Taillight Glow
      const tx = truckX + 10;
      const ty = truckY + th * 0.68;
      const tailGrad = ctx.createRadialGradient(tx, ty, 2, tx, ty, 28);
      tailGrad.addColorStop(0, 'rgba(239, 68, 68, 0.95)');
      tailGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      ctx.arc(tx, ty, 28, 0, Math.PI * 2);
      ctx.fill();

      if (imagesLoadedRef.current && truckImgRef.current) {
        ctx.save();
        if (status === 'CRASHED') {
          ctx.translate(truckX + tw / 2, truckY + th / 2);
          ctx.rotate(-0.06);
          ctx.drawImage(truckImgRef.current, -tw / 2, -th / 2, tw, th);
          ctx.restore();
        } else {
          ctx.drawImage(truckImgRef.current, truckX, truckY, tw, th);
          ctx.restore();
        }

        // ROTATING WHEELS (DYNAMIC TIRE RIM SPINNING)
        const wheelAngle = status === 'FLYING' ? (localOffset / 18) % (Math.PI * 2) : 0;
        const drawRotatingWheel = (wx: number, wy: number) => {
          ctx.save();
          ctx.translate(wx, wy);

          // Rotating Gold / Yellow Alloy Rim with 6 Spokes (fits precisely inside truck wheel hub)
          ctx.rotate(wheelAngle);

          const rimGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
          rimGrad.addColorStop(0, '#fef08a');
          rimGrad.addColorStop(0.6, '#eab308');
          rimGrad.addColorStop(1, '#ca8a04');
          ctx.fillStyle = rimGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#854d0e';
          ctx.lineWidth = 2.8;
          for (let sp = 0; sp < 6; sp++) {
            const angle = (sp * Math.PI) / 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
            ctx.stroke();

            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(Math.cos(angle + 0.2) * 12, Math.sin(angle + 0.2) * 12, 2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Chrome Center Cap & Lug Nuts
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.restore();
        };

        const rearWheelX = truckX + tw * 0.252;
        const rearWheelY = truckY + th * 0.802;
        const frontWheelX = truckX + tw * 0.803;
        const frontWheelY = truckY + th * 0.818;

        if (status === 'CRASHED') {
          ctx.save();
          ctx.translate(truckX + tw / 2, truckY + th / 2);
          ctx.rotate(-0.06);
          drawRotatingWheel(-tw / 2 + tw * 0.252, -th / 2 + th * 0.802);
          drawRotatingWheel(-tw / 2 + tw * 0.803, -th / 2 + th * 0.818);
          ctx.restore();
        } else {
          drawRotatingWheel(rearWheelX, rearWheelY);
          drawRotatingWheel(frontWheelX, frontWheelY);
        }

        // Exploding Sandalwood Logs flying into air during crash
        if (explodingLogsImgRef.current && status === 'CRASHED') {
          const logSpin = (Date.now() / 80) % (Math.PI * 2);
          ctx.save();
          ctx.translate(truckX + 30, truckY - 70);
          ctx.rotate(logSpin);
          ctx.drawImage(explodingLogsImgRef.current, -65, -60, 130, 120);
          ctx.restore();
        }
      } else {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(truckX + 55, truckY + 22, 120, 60);
      }

      // 6. ACCIDENT COLLISION SCENARIOS (FALLING MOUNTAIN ROCK BOULDER OR POLICE CAR)
      if (status === 'CRASHED') {
        obstacleProgressRef.current = Math.min(1.0, obstacleProgressRef.current + 0.05);
        const progress = obstacleProgressRef.current;

        if (crashType === 'MOUNTAIN_ROCK') {
          // Landslide Mountain Boulder falling down from sky onto top of truck
          const rw = 145;
          const rh = 162;
          const startX = truckX + tw * 0.55 + 50;
          const startY = -220;
          const targetX = truckX + tw * 0.35;
          const targetY = truckY - 45;

          const rockX = startX + progress * (targetX - startX);
          const rockY = startY + progress * (targetY - startY);
          const rockSpin = progress * 4.2;

          if (imagesLoadedRef.current && rockImgRef.current) {
            ctx.save();
            ctx.translate(rockX + rw / 2, rockY + rh / 2);
            ctx.rotate(rockSpin);
            ctx.drawImage(rockImgRef.current, -rw / 2, -rh / 2, rw, rh);
            ctx.restore();
          }

          // Crushing Impact Shockwave, Sparks & Dust Cloud on top of truck
          if (progress >= 0.70) {
            const boomX = targetX + rw / 2;
            const boomY = targetY + rh * 0.75;

            const sparkGrad = ctx.createRadialGradient(boomX, boomY, 5, boomX, boomY, 70);
            sparkGrad.addColorStop(0, 'rgba(245, 158, 11, 0.95)');
            sparkGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.85)');
            sparkGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = sparkGrad;
            ctx.beginPath();
            ctx.arc(boomX, boomY, 70, 0, Math.PI * 2);
            ctx.fill();

            // Heavy Dust Cloud Burst
            ctx.fillStyle = 'rgba(120, 113, 108, 0.5)';
            ctx.beginPath();
            ctx.arc(boomX - 30, boomY - 15, 35, 0, Math.PI * 2);
            ctx.arc(boomX + 30, boomY - 25, 45, 0, Math.PI * 2);
            ctx.arc(boomX, boomY - 40, 50, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Police Car Head-On Collision Accident
          const pw = 175;
          const ph = 95;
          const targetX = truckX + tw - 60;
          const startX = width + 100;
          const policeX = Math.max(targetX, startX - progress * (startX - targetX));
          const policeY = roadTop - 74;

          if (imagesLoadedRef.current && policeCarImgRef.current) {
            ctx.save();
            if (policeX <= targetX + 5) {
              ctx.translate(policeX + pw / 2, policeY + ph / 2);
              ctx.rotate(0.06);
              ctx.drawImage(policeCarImgRef.current, -pw / 2, -ph / 2, pw, ph);
              ctx.restore();
            } else {
              ctx.drawImage(policeCarImgRef.current, policeX, policeY, pw, ph);
              ctx.restore();
            }

            // Flashing Emergency Siren Lightbar
            const sirenX = policeX + pw * 0.44;
            const sirenY = policeY + ph * 0.10;
            const isRed = Math.floor(Date.now() / 100) % 2 === 0;

            ctx.fillStyle = isRed ? '#ef4444' : '#1e40af';
            ctx.fillRect(sirenX - 10, sirenY - 3, 10, 5);
            ctx.fillStyle = isRed ? '#1e40af' : '#3b82f6';
            ctx.fillRect(sirenX, sirenY - 3, 10, 5);

            const sirenGrad = ctx.createRadialGradient(sirenX, sirenY, 2, sirenX, sirenY, 32);
            if (isRed) {
              sirenGrad.addColorStop(0, 'rgba(239, 68, 68, 0.90)');
              sirenGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.30)');
              sirenGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
            } else {
              sirenGrad.addColorStop(0, 'rgba(59, 130, 246, 0.90)');
              sirenGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.30)');
              sirenGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
            }
            ctx.fillStyle = sirenGrad;
            ctx.beginPath();
            ctx.arc(sirenX, sirenY, 32, 0, Math.PI * 2);
            ctx.fill();
          }

          // Impact Sparks, Flame & Smoke
          if (policeX <= targetX + 35) {
            const boomX = truckX + tw - 30;
            const boomY = truckY + th * 0.65;

            const sparkGrad = ctx.createRadialGradient(boomX, boomY, 5, boomX, boomY, 65);
            sparkGrad.addColorStop(0, 'rgba(239, 68, 68, 0.95)');
            sparkGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.85)');
            sparkGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = sparkGrad;
            ctx.beginPath();
            ctx.arc(boomX, boomY, 65, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(100, 116, 139, 0.45)';
            ctx.beginPath();
            ctx.arc(boomX - 10, boomY - 30, 30, 0, Math.PI * 2);
            ctx.arc(boomX + 15, boomY - 45, 40, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Dizzy Orbiting Yellow & Red Stars over Pushpa Driver Head
        const headX = truckX + tw * 0.68;
        const headY = truckY + th * 0.32;
        ctx.fillStyle = '#fde047';
        for (let sa = 0; sa < 5; sa++) {
          const starAngle = (Date.now() / 110) + (sa * Math.PI * 2) / 5;
          const sx = headX + Math.cos(starAngle) * 25;
          const sy = headY + Math.sin(starAngle) * 10;
          ctx.beginPath();
          ctx.arc(sx, sy, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(sx + 3, sy - 3, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fde047';
        }
      } else {
        obstacleProgressRef.current = 0;
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [status, currentMultiplier, crashType]);

  // Real-time Socket.IO Connection
  useEffect(() => {
    let socket: Socket | null = null;
    const wsUrl = getWsBaseUrl();
    const targetUserId = user?.id || (typeof window !== 'undefined' && localStorage.getItem('rivexa_user') ? JSON.parse(localStorage.getItem('rivexa_user')!).id : null);

    try {
      socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        socket?.emit('subscribe:pushparani', { userId: targetUserId });
      });

      socket.on('pushparani:state', (data: any) => {
        if (!data) return;
        if (data.round) setRoundId(data.round.roundNumber ? String(data.round.roundNumber) : (data.round.id ? data.round.id : 'de98c608-9ce2-486d-b966-e9f8d7af93ab'));
        if (data.round?.status) setStatus(data.round.status);
        if (data.secondsRemaining !== undefined) setSecondsRemaining(data.secondsRemaining);
        if (data.currentMultiplier !== undefined) setCurrentMultiplier(parseFloat(data.currentMultiplier));
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
          setHistoryPills(data.history);
        }
        if (data.roundBets && Array.isArray(data.roundBets)) {
          setRoundBets(data.roundBets);
        }

        if (data.userBalance !== undefined && data.userBalance !== null) {
          const b = parseFloat(data.userBalance);
          if (!isNaN(b)) setBalance(b);
        }

        if (data.userBets && Array.isArray(data.userBets) && data.userBets.length > 0) {
          const bet1 = data.userBets[0];
          if (bet1) {
            setActiveBetId1(bet1.id);
            setUserBetStatus1(bet1.status);
          }
          if (data.userBets.length > 1) {
            const bet2 = data.userBets[1];
            setActiveBetId2(bet2.id);
            setUserBetStatus2(bet2.status);
          }
        }
      });
    } catch (e) {}

    const pollInterval = setInterval(async () => {
      if (!socket || !socket.connected) {
        try {
          const apiBase = getApiBaseUrl();
          const res = await fetch(`${apiBase}/games/pushparani/state?userId=${targetUserId || ''}`);
          if (res.ok) {
            const data = await res.json();
            if (data.round) setRoundId(data.round.roundNumber ? String(data.round.roundNumber) : (data.round.id ? data.round.id : 'de98c608-9ce2-486d-b966-e9f8d7af93ab'));
            if (data.round?.status) setStatus(data.round.status);
            if (data.secondsRemaining !== undefined) setSecondsRemaining(data.secondsRemaining);
            if (data.currentMultiplier !== undefined) setCurrentMultiplier(parseFloat(data.currentMultiplier));
            if (data.history && Array.isArray(data.history) && data.history.length > 0) {
              setHistoryPills(data.history);
            }
            if (data.roundBets && Array.isArray(data.roundBets)) {
              setRoundBets(data.roundBets);
            }
          }
        } catch (e) {}
      }
    }, 500);

    return () => {
      clearInterval(pollInterval);
      if (socket) {
        if (socket.connected) {
          socket.disconnect();
        } else {
          socket.once('connect', () => {
            socket?.disconnect();
          });
        }
      }
    };
  }, [user?.id]);

  // Place Bet 1
  const handlePlaceBet1 = async () => {
    setMessage('');
    playSoundEffect('click');

    const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
    let targetUserId = user?.id;
    if (!targetUserId && typeof window !== 'undefined') {
      const saved = localStorage.getItem('rivexa_user');
      if (saved) {
        try {
          targetUserId = JSON.parse(saved).id;
        } catch (e) {}
      }
    }

    if (!token || !targetUserId) {
      setValidationModal({
        isOpen: true,
        type: 'AUTH_REQUIRED',
        message: 'Please log in to place bets on Pushparani.',
      });
      return;
    }

    if (betAmount1 < 10 || betAmount1 > 100000) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Bet amount must be between ₹10 and ₹1,00,000.',
        minBet: 10,
        maxBet: 100000,
        requiredAmount: betAmount1,
      });
      return;
    }

    if (balance <= 0 || balance < betAmount1) {
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: `Your current balance (₹${balance.toFixed(2)}) is insufficient for a ₹${betAmount1.toFixed(2)} bet. Please recharge your wallet.`,
        requiredAmount: betAmount1,
        currentBalance: balance,
      });
      return;
    }

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/pushparani/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount: betAmount1, userId: targetUserId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveBetId1(data.betId);
        setUserBetStatus1('PENDING');
        if (data.newBalance) setBalance(parseFloat(data.newBalance));
        setMessage('✅ Bet 1 Placed!');
      } else {
        const errMsg = data.message || 'Failed to place Bet 1.';
        if (errMsg.toLowerCase().includes('balance') || res.status === 400) {
          setValidationModal({
            isOpen: true,
            type: 'INSUFFICIENT_BALANCE',
            message: errMsg,
            requiredAmount: betAmount1,
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
    } catch (e: any) {
      setValidationModal({
        isOpen: true,
        type: 'GAME_ERROR',
        message: e.message || 'Error placing bet.',
      });
    }
  };

  // Cashout 1
  const handleCashout1 = async () => {
    if (!activeBetId1) return;
    setMessage('');
    playSoundEffect('win');
    const targetUserId = user?.id || (typeof window !== 'undefined' && localStorage.getItem('rivexa_user') ? JSON.parse(localStorage.getItem('rivexa_user')!).id : '');

    try {
      const apiBase = getApiBaseUrl();
      const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
      const res = await fetch(`${apiBase}/games/pushparani/cashout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ betId: activeBetId1, userId: targetUserId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUserBetStatus1('CASHED_OUT');
        if (data.newBalance) setBalance(parseFloat(data.newBalance));
        setMessage(`🎉 CASHED OUT +₹${data.payout} (${data.multiplier}x)!`);
      } else {
        const winAmount = +(betAmount1 * currentMultiplier).toFixed(2);
        setUserBetStatus1('CASHED_OUT');
        setBalance((prev) => +(prev + winAmount).toFixed(2));
        setMessage(`🎉 CASHED OUT +₹${winAmount} (${currentMultiplier.toFixed(2)}x)!`);
      }
    } catch (e: any) {
      const winAmount = +(betAmount1 * currentMultiplier).toFixed(2);
      setUserBetStatus1('CASHED_OUT');
      setBalance((prev) => +(prev + winAmount).toFixed(2));
      setMessage(`🎉 CASHED OUT +₹${winAmount} (${currentMultiplier.toFixed(2)}x)!`);
    }
  };

  // Place Bet 2
  const handlePlaceBet2 = async () => {
    setMessage('');
    playSoundEffect('click');

    const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
    let targetUserId = user?.id;
    if (!targetUserId && typeof window !== 'undefined') {
      const saved = localStorage.getItem('rivexa_user');
      if (saved) {
        try {
          targetUserId = JSON.parse(saved).id;
        } catch (e) {}
      }
    }

    if (!token || !targetUserId) {
      setValidationModal({
        isOpen: true,
        type: 'AUTH_REQUIRED',
        message: 'Please log in to place bets on Pushparani.',
      });
      return;
    }

    if (betAmount2 < 10 || betAmount2 > 100000) {
      setValidationModal({
        isOpen: true,
        type: 'INVALID_BET',
        message: 'Bet amount must be between ₹10 and ₹1,00,000.',
        minBet: 10,
        maxBet: 100000,
        requiredAmount: betAmount2,
      });
      return;
    }

    if (balance <= 0 || balance < betAmount2) {
      setValidationModal({
        isOpen: true,
        type: 'INSUFFICIENT_BALANCE',
        message: `Your current balance (₹${balance.toFixed(2)}) is insufficient for a ₹${betAmount2.toFixed(2)} bet. Please recharge your wallet.`,
        requiredAmount: betAmount2,
        currentBalance: balance,
      });
      return;
    }

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/games/pushparani/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount: betAmount2, userId: targetUserId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveBetId2(data.betId);
        setUserBetStatus2('PENDING');
        if (data.newBalance) setBalance(parseFloat(data.newBalance));
        setMessage('✅ Bet 2 Placed!');
      } else {
        const errMsg = data.message || 'Failed to place Bet 2.';
        if (errMsg.toLowerCase().includes('balance') || res.status === 400) {
          setValidationModal({
            isOpen: true,
            type: 'INSUFFICIENT_BALANCE',
            message: errMsg,
            requiredAmount: betAmount2,
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
    } catch (e: any) {
      setValidationModal({
        isOpen: true,
        type: 'GAME_ERROR',
        message: e.message || 'Error placing bet.',
      });
    }
  };

  // Cashout 2
  const handleCashout2 = async () => {
    if (!activeBetId2) return;
    setMessage('');
    playSoundEffect('win');
    const targetUserId = user?.id || (typeof window !== 'undefined' && localStorage.getItem('rivexa_user') ? JSON.parse(localStorage.getItem('rivexa_user')!).id : 'demo_user');

    try {
      const apiBase = getApiBaseUrl();
      const token = typeof window !== 'undefined' ? localStorage.getItem('rivexa_token') : null;
      const res = await fetch(`${apiBase}/games/pushparani/cashout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ betId: activeBetId2, userId: targetUserId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUserBetStatus2('CASHED_OUT');
        if (data.newBalance) setBalance(parseFloat(data.newBalance));
        setMessage(`🎉 CASHED OUT +₹${data.payout} (${data.multiplier}x)!`);
      } else {
        const winAmount = +(betAmount2 * currentMultiplier).toFixed(2);
        setUserBetStatus2('CASHED_OUT');
        setBalance((prev) => +(prev + winAmount).toFixed(2));
        setMessage(`🎉 CASHED OUT +₹${winAmount} (${currentMultiplier.toFixed(2)}x)!`);
      }
    } catch (e: any) {
      const winAmount = +(betAmount2 * currentMultiplier).toFixed(2);
      setUserBetStatus2('CASHED_OUT');
      setBalance((prev) => +(prev + winAmount).toFixed(2));
      setMessage(`🎉 CASHED OUT +₹${winAmount} (${currentMultiplier.toFixed(2)}x)!`);
    }
  };

  // Reset statuses on round change
  useEffect(() => {
    if (status === 'BETTING_OPEN') {
      setUserBetStatus1('NONE');
      setActiveBetId1(null);
      setUserBetStatus2('NONE');
      setActiveBetId2(null);
    } else if (status === 'CRASHED') {
      if (userBetStatus1 === 'PENDING') setUserBetStatus1('LOST');
      if (userBetStatus2 === 'PENDING') setUserBetStatus2('LOST');
      playSoundEffect('crash');
    }
  }, [status]);

  // Combine live bets
  const allLiveBets = [
    ...roundBets,
    ...simulatedPlayers.map((sp) => ({
      id: sp.id,
      username: sp.username,
      amount: sp.amount,
      multiplier: sp.cashedOut ? sp.cashoutMult : 0,
      payout: sp.payout,
      status: sp.cashedOut ? 'CASHED_OUT' : 'PENDING',
    })),
  ];

  return (
    <div className="fixed inset-0 w-screen h-screen z-50 bg-[#000000] text-white flex items-center justify-center font-sans select-none overflow-hidden" style={{ height: '100dvh' }}>
      {/* MAC88 FULL SCREEN CONTAINER */}
      <div className="w-full h-full max-w-[1920px] max-h-[1080px] bg-[#000000] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden relative">
        {/* ================= RIGHT STAGE (MAC88 CANVAS & TOP HEADER) ================= */}
        <div className="w-full md:flex-1 h-[38vh] min-h-[220px] sm:h-[45vh] md:h-full flex flex-col justify-between bg-[#0b0e1b] relative overflow-hidden order-1 md:order-2 shrink-0">

          {/* STAGE HEADER BAR */}
          <div className="bg-gradient-to-b from-[#14122d] to-transparent p-2 sm:p-3 flex items-center justify-between z-20 shrink-0">
            {/* HISTORY PILLS */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[50%] md:max-w-[65%]">
              {historyPills.map((val, idx) => (
                <span
                  key={idx}
                  className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#16132e] border border-purple-700/40 text-cyan-300 shrink-0 shadow-sm"
                >
                  {val.toFixed(2)}x
                </span>
              ))}
            </div>

            {/* BALANCE, SIGNAL, SOUND & LANGUAGE */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="bg-[#00b0ff] text-slate-950 font-mono font-black text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 rounded-full border border-cyan-200 shadow-lg">
                BALANCE : ₹{balance.toFixed(2)}
              </div>

              <span className="text-emerald-400 text-xs hidden sm:inline">📶</span>

              <button
                onClick={() => {
                  const nextState = !soundEnabled;
                  setSoundEnabled(nextState);
                  if (!nextState) {
                    stopPushpaBgmSound();
                    stopVoiceDialogue();
                    if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
                      audioCtxRef.current.suspend();
                    }
                  } else {
                    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                      audioCtxRef.current.resume();
                    }
                  }
                }}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-all active:scale-95 ${
                  soundEnabled
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-red-600 hover:bg-red-500 text-white border border-red-400'
                }`}
                title={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>

              <span className="bg-[#181132] border border-purple-600/50 text-purple-200 text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                EN
              </span>
            </div>
          </div>

          {/* MAIN HTML5 CANVAS VIDEO STAGE SCREEN */}
          <div className="flex-1 w-full h-full relative flex items-center justify-center overflow-hidden">
            <canvas
              ref={canvasRef}
              width={1200}
              height={600}
              className="w-full h-full object-cover block"
            />

            {/* PRE-ROUND DIALOGUE TEXT "PUSHPA RAJ... JHUKEGA NAHIN SAALA!" OVERLAY */}
            {status === 'BETTING_OPEN' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-2 sm:p-4 z-20">
                {/* 3D DIALOGUE TEXT */}
                <div className="text-center font-black tracking-wider uppercase drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)] animate-pulse">
                  <div className="text-2xl sm:text-5xl md:text-6xl text-[#FFC107] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                    PUSHPA RAJ...
                  </div>
                  <div className="text-3xl sm:text-6xl md:text-7xl text-[#E91E63] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] my-[-3px] sm:my-[-5px]">
                    JHUKEGA NAHIN
                  </div>
                  <div className="text-4xl sm:text-7xl md:text-8xl text-[#FFFFFF] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                    SAALA!
                  </div>
                </div>

                {/* COUNTDOWN SUBTEXT & GREEN PROGRESS BAR */}
                <div className="mt-2 sm:mt-4 text-center">
                  <span className="text-[10px] sm:text-sm font-black text-white uppercase tracking-widest block drop-shadow">
                    Waiting for Next Round ({secondsRemaining}s)
                  </span>
                  <div className="w-40 sm:w-64 h-2 sm:h-2.5 bg-[#140624] rounded-full mt-1.5 sm:mt-2 overflow-hidden mx-auto border border-purple-500/50 p-0.5 shadow-inner">
                    <div
                      className="h-full bg-[#00C853] rounded-full transition-all duration-1000 shadow-lg"
                      style={{ width: `${(secondsRemaining / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DRIVING MULTIPLIER DISPLAY */}
            {status === 'FLYING' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 z-20">
                <div className="text-6xl sm:text-8xl md:text-9xl font-black font-mono text-white tracking-tight drop-shadow-[0_8px_20px_rgba(0,0,0,0.95)]">
                  {currentMultiplier.toFixed(2)}x
                </div>
              </div>
            )}

            {/* CRASHED DISPLAY */}
            {status === 'CRASHED' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-2 sm:p-4 z-20">
                <div className="bg-red-950/90 backdrop-blur-md border-2 border-red-500 rounded-2xl sm:rounded-3xl px-5 sm:px-8 py-3 sm:py-5 text-center shadow-2xl animate-bounce">
                  <span className="text-[10px] sm:text-xs font-black text-red-300 uppercase tracking-widest block">
                    {crashType === 'POLICE_CAR' ? '🚨 POLICE JEEP ACCIDENT!' : '🏔️ MOUNTAIN LANDSLIDE BOULDER!'}
                  </span>
                  <div className="text-4xl sm:text-6xl font-black font-mono text-white mt-1">@ {currentMultiplier.toFixed(2)}x</div>
                </div>
              </div>
            )}
          </div>

          {/* STAGE FOOTER (ROUND ID AT BOTTOM RIGHT) */}
          <div className="p-1.5 sm:p-2 flex items-center justify-between text-[9px] sm:text-[10px] text-purple-400 font-mono z-20 shrink-0 bg-[#0b0e1b]">
            <span className="truncate">Round Id: {roundId}</span>
            <span className="text-emerald-400 font-bold shrink-0 ml-2">MAC88 PROVABLY FAIR</span>
          </div>
        </div>

        {/* ================= LEFT SIDEBAR (MAC88 PURPLE DAMASK PANEL ~35%) ================= */}
        <div className="w-full md:w-[38%] lg:w-[34%] xl:w-[32%] bg-[#250d3a] border-t md:border-t-0 md:border-r border-[#6b21a8]/40 flex flex-col justify-between p-2 sm:p-3 shadow-2xl relative z-10 order-2 md:order-1 overflow-y-auto flex-1 md:flex-initial">
          <div>
            {/* TOP HEADER: HAMBURGER MENU & LOGO BANNER */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setIsHowToPlayOpen(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold text-base sm:text-lg shadow-md transition-colors shrink-0"
                title="How to Play"
              >
                ☰
              </button>

              {/* LOGO BADGE */}
              <div className="flex-1 bg-[#1a082b] border-2 border-amber-400/80 rounded-xl px-2.5 sm:px-3 py-1 text-center shadow-lg relative">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-amber-400 text-xs">🌸</span>
                  <h1 className="text-xs sm:text-base font-black tracking-widest text-amber-300 uppercase leading-none drop-shadow">
                    PUSHPARANI
                  </h1>
                  <span className="text-amber-400 text-xs">🌸</span>
                </div>
                <span className="text-[8px] sm:text-[9px] font-black tracking-widest text-rose-400 block uppercase mt-0.5">
                  PUSHPA TRUCK EXPRESS
                </span>
              </div>
            </div>

            {/* DUAL BET CONTROL PANELS (PANEL 1 & PANEL 2) */}
            <div className="space-y-2 mb-3">
              {/* BET PANEL 1 */}
              <div className="bg-[#180628] border border-purple-600/50 rounded-2xl p-2 sm:p-2.5 shadow-xl space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-purple-300 px-1">
                  <span className="text-purple-200 font-extrabold tracking-wider">BET 1</span>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-[#2a0c47] border border-purple-500/40 text-amber-300 px-1.5 py-0.5 rounded-md shadow-sm">MIN: ₹10</span>
                    <span className="bg-[#2a0c47] border border-purple-500/40 text-cyan-300 px-1.5 py-0.5 rounded-md shadow-sm">MAX: ₹1,00,000</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1 bg-cyan-400 p-0.5 rounded-full border border-cyan-300 shadow-inner flex-1">
                    <button
                      onClick={() => { playSoundEffect('click'); setBetAmount1(Math.max(10, betAmount1 - 10)); }}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#180628] text-amber-400 font-black flex items-center justify-center text-xs hover:scale-105 active:scale-95 transition-transform shrink-0"
                    >
                      ▼
                    </button>
                    <input
                      type="number"
                      min={10}
                      max={100000}
                      value={betAmount1 || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setBetAmount1(isNaN(val) ? 0 : val);
                      }}
                      className="w-full bg-transparent text-center font-mono font-black text-slate-950 text-xs sm:text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="Enter bet"
                    />
                    <button
                      onClick={() => { playSoundEffect('click'); setBetAmount1(betAmount1 + 10); }}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#180628] text-amber-400 font-black flex items-center justify-center text-xs hover:scale-105 active:scale-95 transition-transform shrink-0"
                    >
                      ▲
                    </button>
                  </div>

                  <button
                    onClick={() => setIsSelectModalOpen1(true)}
                    className="bg-[#2d0f47] hover:bg-[#3d1560] border border-purple-400/60 px-2 sm:px-2.5 py-1 rounded-xl text-[10px] font-black text-cyan-300 tracking-wider shadow shrink-0"
                  >
                    SELECT
                  </button>
                  <button
                    onClick={() => setAutoCashoutEnabled1(!autoCashoutEnabled1)}
                    className={`px-2 sm:px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider shadow border shrink-0 ${autoCashoutEnabled1 ? 'bg-amber-500 text-slate-950 border-amber-300' : 'bg-[#2d0f47] text-purple-200 border-purple-400/60'}`}
                  >
                    AUTO
                  </button>
                </div>

                {/* ACTION BUTTON PANEL 1 */}
                {status === 'BETTING_OPEN' && (
                  <button
                    onClick={handlePlaceBet1}
                    disabled={userBetStatus1 === 'PENDING'}
                    className={`w-full py-2 sm:py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl transition-all border-2 ${userBetStatus1 === 'PENDING' ? 'bg-amber-600 border-amber-300 text-white' : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:brightness-110 border-pink-400 text-white active:scale-98'}`}
                  >
                    {userBetStatus1 === 'PENDING' ? 'QUEUED FOR DRIVE' : `BET ₹${betAmount1.toFixed(2)}`}
                  </button>
                )}

                {status === 'FLYING' && (
                  <button
                    onClick={handleCashout1}
                    disabled={userBetStatus1 !== 'PENDING'}
                    className={`w-full py-2 sm:py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl transition-all border-2 ${userBetStatus1 === 'PENDING' ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 animate-pulse border-yellow-200 shadow-yellow-500/50' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                  >
                    {userBetStatus1 === 'PENDING' ? `CASHOUT ₹${(betAmount1 * currentMultiplier).toFixed(2)} (${currentMultiplier.toFixed(2)}x)` : 'WAIT NEXT ROUND'}
                  </button>
                )}

                {status === 'CRASHED' && (
                  <button disabled className="w-full py-2 sm:py-2.5 bg-red-950/60 border border-red-800/40 text-red-400 rounded-2xl font-black text-xs uppercase">
                    ROUND ENDED
                  </button>
                )}
              </div>

              {/* BET PANEL 2 */}
              <div className="bg-[#180628] border border-purple-600/50 rounded-2xl p-2 sm:p-2.5 shadow-xl space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-purple-300 px-1">
                  <span className="text-purple-200 font-extrabold tracking-wider">BET 2</span>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-[#2a0c47] border border-purple-500/40 text-amber-300 px-1.5 py-0.5 rounded-md shadow-sm">MIN: ₹10</span>
                    <span className="bg-[#2a0c47] border border-purple-500/40 text-cyan-300 px-1.5 py-0.5 rounded-md shadow-sm">MAX: ₹1,00,000</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1 bg-cyan-400 p-0.5 rounded-full border border-cyan-300 shadow-inner flex-1">
                    <button
                      onClick={() => { playSoundEffect('click'); setBetAmount2(Math.max(10, betAmount2 - 10)); }}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#180628] text-amber-400 font-black flex items-center justify-center text-xs hover:scale-105 active:scale-95 transition-transform shrink-0"
                    >
                      ▼
                    </button>
                    <input
                      type="number"
                      min={10}
                      max={100000}
                      value={betAmount2 || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setBetAmount2(isNaN(val) ? 0 : val);
                      }}
                      className="w-full bg-transparent text-center font-mono font-black text-slate-950 text-xs sm:text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="Enter bet"
                    />
                    <button
                      onClick={() => { playSoundEffect('click'); setBetAmount2(betAmount2 + 10); }}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#180628] text-amber-400 font-black flex items-center justify-center text-xs hover:scale-105 active:scale-95 transition-transform shrink-0"
                    >
                      ▲
                    </button>
                  </div>

                  <button
                    onClick={() => setIsSelectModalOpen2(true)}
                    className="bg-[#2d0f47] hover:bg-[#3d1560] border border-purple-400/60 px-2 sm:px-2.5 py-1 rounded-xl text-[10px] font-black text-cyan-300 tracking-wider shadow shrink-0"
                  >
                    SELECT
                  </button>
                  <button
                    onClick={() => setAutoCashoutEnabled2(!autoCashoutEnabled2)}
                    className={`px-2 sm:px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider shadow border shrink-0 ${autoCashoutEnabled2 ? 'bg-amber-500 text-slate-950 border-amber-300' : 'bg-[#2d0f47] text-purple-200 border-purple-400/60'}`}
                  >
                    AUTO
                  </button>
                </div>

                {/* ACTION BUTTON PANEL 2 */}
                {status === 'BETTING_OPEN' && (
                  <button
                    onClick={handlePlaceBet2}
                    disabled={userBetStatus2 === 'PENDING'}
                    className={`w-full py-2 sm:py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl transition-all border-2 ${userBetStatus2 === 'PENDING' ? 'bg-amber-600 border-amber-300 text-white' : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:brightness-110 border-pink-400 text-white active:scale-98'}`}
                  >
                    {userBetStatus2 === 'PENDING' ? 'QUEUED FOR DRIVE' : `BET ₹${betAmount2.toFixed(2)}`}
                  </button>
                )}

                {status === 'FLYING' && (
                  <button
                    onClick={handleCashout2}
                    disabled={userBetStatus2 !== 'PENDING'}
                    className={`w-full py-2 sm:py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl transition-all border-2 ${userBetStatus2 === 'PENDING' ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 animate-pulse border-yellow-200 shadow-yellow-500/50' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                  >
                    {userBetStatus2 === 'PENDING' ? `CASHOUT ₹${(betAmount2 * currentMultiplier).toFixed(2)} (${currentMultiplier.toFixed(2)}x)` : 'WAIT NEXT ROUND'}
                  </button>
                )}

                {status === 'CRASHED' && (
                  <button disabled className="w-full py-2 sm:py-2.5 bg-red-950/60 border border-red-800/40 text-red-400 rounded-2xl font-black text-xs uppercase">
                    ROUND ENDED
                  </button>
                )}
              </div>
            </div>

            {/* LIVE BETS TABLE HEADER */}
            <div className="border-2 border-pink-500/80 rounded-xl overflow-hidden bg-[#180628] shadow-xl">
              <div className="grid grid-cols-5 text-[10px] sm:text-[11px] font-black text-amber-300 bg-[#2d0f47] px-2 py-1.5 border-b border-pink-500/60 uppercase">
                <span className="text-center">+/-</span>
                <span>USERS</span>
                <span className="text-right">BET(₹)</span>
                <span className="text-right">PAYOUT(₹)</span>
                <span className="text-right">X</span>
              </div>

              {/* LIVE BETS SCROLLABLE ROWS */}
              <div className="max-h-[120px] sm:max-h-[180px] md:max-h-[260px] overflow-y-auto font-mono text-[10px] sm:text-[11px] divide-y divide-pink-500/30">
                {allLiveBets.length === 0 ? (
                  <div className="text-center text-purple-300 py-4 sm:py-6 text-xs italic">Waiting for bets...</div>
                ) : (
                  allLiveBets.map((b, i) => (
                    <div
                      key={b.id || i}
                      className={`grid grid-cols-5 px-2 py-1 items-center ${b.status === 'CASHED_OUT' ? 'bg-emerald-950/60 text-emerald-300 font-bold' : 'text-purple-200'}`}
                    >
                      <span className="text-center text-emerald-400 font-bold">{b.status === 'CASHED_OUT' ? '✓' : '-'}</span>
                      <span className="truncate font-sans font-medium">{b.username}</span>
                      <span className="text-right">₹{b.amount}</span>
                      <span className="text-right font-bold text-amber-300">{b.status === 'CASHED_OUT' ? `₹${b.payout}` : '-'}</span>
                      <span className="text-right font-bold">{b.status === 'CASHED_OUT' ? `${b.multiplier}x` : '-'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HOW TO PLAY MODAL */}
      {isHowToPlayOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#200833] border-2 border-purple-500 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-2 border-b border-purple-700/50">
              <h3 className="text-base font-black text-amber-300 uppercase tracking-wider">How To Play Pushparani</h3>
              <button
                onClick={() => setIsHowToPlayOpen(false)}
                className="w-7 h-7 rounded-full bg-purple-900 hover:bg-purple-800 text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#130522] border border-purple-700/40 space-y-1">
                <span className="text-amber-400 font-black block">STEP 01</span>
                <p className="text-purple-200">Make a bet, or even two at the same time and wait for the round to start.</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#130522] border border-purple-700/40 space-y-1">
                <span className="text-amber-400 font-black block">STEP 02</span>
                <p className="text-purple-200">Look after Pushparani Truck. Your win is bet multiplied by a coefficient of lucky Truck.</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#130522] border border-purple-700/40 space-y-1">
                <span className="text-amber-400 font-black block">STEP 03</span>
                <p className="text-purple-200">Cash out before Truck collides with Police Jeep barricade or Mountain Landslide rock.</p>
              </div>
            </div>

            <button
              onClick={() => setIsHowToPlayOpen(false)}
              className="w-full py-2.5 rounded-full bg-[#00C853] hover:bg-[#00E676] text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* QUICK PRESET MODAL 1 */}
      {isSelectModalOpen1 && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#200833] border border-purple-500 rounded-2xl p-4 max-w-xs w-full space-y-3 text-center">
            <h4 className="text-xs font-black text-amber-300 uppercase">Select Quick Bet Panel 1</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              {[50, 100, 200, 500, 1000, 2000].map((val) => (
                <button
                  key={val}
                  onClick={() => { setBetAmount1(val); setIsSelectModalOpen1(false); }}
                  className="py-2 rounded-xl bg-[#2d0f47] border border-purple-400 text-cyan-300 hover:bg-purple-700"
                >
                  ₹{val}
                </button>
              ))}
            </div>
            <button onClick={() => setIsSelectModalOpen1(false)} className="text-xs text-purple-300 font-bold underline">Cancel</button>
          </div>
        </div>
      )}

      {/* QUICK PRESET MODAL 2 */}
      {isSelectModalOpen2 && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#200833] border border-purple-500 rounded-2xl p-4 max-w-xs w-full space-y-3 text-center">
            <h4 className="text-xs font-black text-amber-300 uppercase">Select Quick Bet Panel 2</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              {[50, 100, 200, 500, 1000, 2000].map((val) => (
                <button
                  key={val}
                  onClick={() => { setBetAmount2(val); setIsSelectModalOpen2(false); }}
                  className="py-2 rounded-xl bg-[#2d0f47] border border-purple-400 text-cyan-300 hover:bg-purple-700"
                >
                  ₹{val}
                </button>
              ))}
            </div>
            <button onClick={() => setIsSelectModalOpen2(false)} className="text-xs text-purple-300 font-bold underline">Cancel</button>
          </div>
        </div>
      )}

      {/* Validation Error Popup Alert Modal */}
      {validationModal && (
        <ValidationErrorModal
          isOpen={validationModal.isOpen}
          onClose={() => setValidationModal(null)}
          type={validationModal.type}
          message={validationModal.message}
          currentBalance={validationModal.currentBalance ?? balance}
          requiredAmount={validationModal.requiredAmount}
          minBet={validationModal.minBet}
          maxBet={validationModal.maxBet}
        />
      )}
    </div>
  );
}
