'use client';

import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '@/lib/config';

export interface TokenValidationResult {
  isValid: boolean;
  isInvalid: boolean;
  validating: boolean;
  errorMessage: string | null;
  sessionData: any | null;
  clearError: () => void;
}

export function useGameTokenValidation(): TokenValidationResult {
  const [validating, setValidating] = useState<boolean>(true);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isInvalid, setIsInvalid] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any | null>(null);

  const validateUrlToken = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const token =
      urlParams.get('st') ||
      urlParams.get('gt') ||
      urlParams.get('ticket') ||
      urlParams.get('t') ||
      urlParams.get('authToken') ||
      urlParams.get('token') ||
      urlParams.get('sessionToken');

    // If an explicit bearer token is present in the URL parameter
    if (token) {
      setValidating(true);
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(
          `${apiBase}/game-sessions/validate?authToken=${encodeURIComponent(token)}`
        );
        const data = await res.json();

        if (res.ok && data.valid) {
          setIsValid(true);
          setIsInvalid(false);
          setErrorMessage(null);
          setSessionData(data);
          sessionStorage.setItem('gs_token', token);
          if (data.sessionId) {
            sessionStorage.setItem('gs_active_session_id', data.sessionId);
          }
        } else {
          setIsValid(false);
          setIsInvalid(true);
          setErrorMessage(data.message || 'Invalid user login credentials(Error:45)');
          setSessionData(null);
        }
      } catch {
        setIsValid(false);
        setIsInvalid(true);
        setErrorMessage('Invalid user login credentials(Error:45)');
        setSessionData(null);
      } finally {
        setValidating(false);
      }
      return;
    }

    // If no URL token parameter, check sessionStorage fallback
    const storedToken = sessionStorage.getItem('gs_token');
    const storedSessionId = sessionStorage.getItem('gs_active_session_id');

    if (storedToken && storedSessionId) {
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(
          `${apiBase}/game-sessions/validate?authToken=${encodeURIComponent(storedToken)}`
        );
        const data = await res.json();

        if (res.ok && data.valid) {
          setIsValid(true);
          setIsInvalid(false);
          setErrorMessage(null);
          setSessionData(data);
        } else {
          setIsValid(false);
          setIsInvalid(true);
          setErrorMessage('Invalid user login credentials(Error:45)');
          sessionStorage.removeItem('gs_token');
          sessionStorage.removeItem('gs_active_session_id');
        }
      } catch {
        setIsValid(false);
        setIsInvalid(true);
        setErrorMessage('Invalid user login credentials(Error:45)');
      } finally {
        setValidating(false);
      }
    } else {
      // No token present -> Guest preview mode (allow game UI to open)
      setIsValid(false);
      setIsInvalid(false);
      setErrorMessage(null);
      setValidating(false);
    }
  }, []);

  useEffect(() => {
    validateUrlToken();
  }, [validateUrlToken]);

  const clearError = () => {
    setIsInvalid(false);
    setErrorMessage(null);
  };

  return {
    isValid,
    isInvalid,
    validating,
    errorMessage,
    sessionData,
    clearError,
  };
}
