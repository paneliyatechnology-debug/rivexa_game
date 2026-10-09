'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getApiBaseUrl } from '@/lib/config';

export interface GameSessionInfo {
  sessionId: string;
  token: string;
  launchUrl: string;
  launchType: 'IFRAME' | 'REDIRECT' | 'DIRECT_ROUTE';
  expiresAt: string;
  status: string;
}

export interface UseGameSessionReturn {
  session: GameSessionInfo | null;
  loading: boolean;
  error: string | null;
  launchGame: (gameId: string, mode?: string, currency?: string) => Promise<GameSessionInfo | null>;
  closeSession: () => Promise<void>;
}

export function useGameSession(): UseGameSessionReturn {
  const [session, setSession] = useState<GameSessionInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rivexa_token');
    }
    return null;
  };

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const sendHeartbeat = useCallback(async (sessionId: string) => {
    const authToken = getAuthToken();
    if (!authToken) return;

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/game-sessions/${sessionId}/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          stopHeartbeat();
          setSession(null);
          setError('Session expired or revoked.');
        }
      }
    } catch {
      // ignore transient network errors during heartbeat
    }
  }, [stopHeartbeat]);

  const startHeartbeat = useCallback((sessionId: string) => {
    stopHeartbeat();
    // Heartbeat every 60 seconds
    heartbeatTimerRef.current = setInterval(() => {
      sendHeartbeat(sessionId);
    }, 60000);
  }, [sendHeartbeat, stopHeartbeat]);

  const launchGame = useCallback(
    async (gameId: string, mode = 'REAL', currency = 'INR'): Promise<GameSessionInfo | null> => {
      setLoading(true);
      setError(null);

      const authToken = getAuthToken();
      if (!authToken) {
        setError('Authentication required to launch game.');
        setLoading(false);
        return null;
      }

      try {
        const apiBase = getApiBaseUrl();
        const idempotencyKey = `idemp_${gameId}_${Date.now()}`;

        const res = await fetch(`${apiBase}/games/${gameId}/launch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            mode,
            currency,
            idempotencyKey,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          const errMsg = data.message || 'Failed to launch game session.';
          setError(errMsg);
          setLoading(false);
          return null;
        }

        const sessionInfo: GameSessionInfo = {
          sessionId: data.sessionId,
          token: data.token,
          launchUrl: data.launchUrl,
          launchType: data.launchType,
          expiresAt: data.expiresAt,
          status: data.status,
        };

        setSession(sessionInfo);
        if (typeof window !== 'undefined' && data.token) {
          sessionStorage.setItem(`gs_token_${gameId}`, data.token);
          sessionStorage.setItem('gs_active_session_id', data.sessionId);
        }

        startHeartbeat(data.sessionId);
        setLoading(false);
        return sessionInfo;
      } catch (err: any) {
        const errMsg = err.message || 'Network error during launch.';
        setError(errMsg);
        setLoading(false);
        return null;
      }
    },
    [startHeartbeat]
  );

  const closeSession = useCallback(async () => {
    stopHeartbeat();
    if (!session) return;

    const authToken = getAuthToken();
    if (authToken && session.sessionId) {
      try {
        const apiBase = getApiBaseUrl();
        await fetch(`${apiBase}/game-sessions/${session.sessionId}/close`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        });
      } catch {
        // ignore close error on teardown
      }
    }

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('gs_active_session_id');
    }
    setSession(null);
  }, [session, stopHeartbeat]);

  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return {
    session,
    loading,
    error,
    launchGame,
    closeSession,
  };
}
