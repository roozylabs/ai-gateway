'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { apiGetTurnstileConfig } from '@/lib/api';

export interface UseTurnstileReturn {
  siteKey: string;
  showTurnstile: boolean;
  token: string;
  isReady: boolean;
  turnstileRef: React.RefObject<TurnstileInstance | null>;
  onSuccess: (token: string) => void;
  onError: () => void;
  onExpire: () => void;
  reset: () => void;
}

export function useTurnstile(): UseTurnstileReturn {
  const [token, setToken] = useState<string>('');
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const { data: turnstileConfig } = useQuery({
    queryKey: ['turnstile-config'],
    queryFn: apiGetTurnstileConfig,
    staleTime: 10 * 60 * 1000,
  });

  const siteKey =
    process.env.NEXT_PUBLIC_CLOUDFLARE_SITE_KEY ||
    turnstileConfig?.siteKey ||
    '1x00000000000000000000AA';

  const showTurnstile = Boolean(siteKey && siteKey !== 'disabled' && siteKey !== 'none');
  const isReady = !showTurnstile || Boolean(token);

  const reset = useCallback(() => {
    setToken('');
    try {
      turnstileRef.current?.reset();
    } catch {
      // Ignore reset failure if widget is not mounted
    }
  }, []);

  const onSuccess = useCallback((newToken: string) => {
    setToken(newToken);
  }, []);

  const onError = useCallback(() => {
    reset();
  }, [reset]);

  const onExpire = useCallback(() => {
    reset();
  }, [reset]);

  return {
    siteKey,
    showTurnstile,
    token,
    isReady,
    turnstileRef,
    onSuccess,
    onError,
    onExpire,
    reset,
  };
}
