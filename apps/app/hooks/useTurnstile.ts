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
  hasError: boolean;
  turnstileRef: React.RefObject<TurnstileInstance | null>;
  onSuccess: (token: string) => void;
  onError: () => void;
  onExpire: () => void;
  reset: () => void;
  getTokenOrWait: (timeoutMs?: number) => Promise<string | null>;
}

export function useTurnstile(): UseTurnstileReturn {
  const [token, setToken] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);
  const tokenRef = useRef<string>('');
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const waitersRef = useRef<Array<(token: string | null) => void>>([]);

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
    setHasError(false);
    tokenRef.current = '';
    try {
      turnstileRef.current?.reset();
    } catch {
      // Ignore reset failure if widget is not mounted
    }
  }, []);

  const onSuccess = useCallback((newToken: string) => {
    setToken(newToken);
    setHasError(false);
    tokenRef.current = newToken;
    if (waitersRef.current.length > 0) {
      waitersRef.current.forEach((resolve) => resolve(newToken));
      waitersRef.current = [];
    }
  }, []);

  const onError = useCallback(() => {
    setToken('');
    setHasError(true);
    tokenRef.current = '';
    if (waitersRef.current.length > 0) {
      waitersRef.current.forEach((resolve) => resolve(null));
      waitersRef.current = [];
    }
  }, []);

  const onExpire = useCallback(() => {
    reset();
  }, [reset]);

  const getTokenOrWait = useCallback(
    async (timeoutMs = 3500): Promise<string | null> => {
      if (!showTurnstile) return 'bypass';
      if (tokenRef.current) return tokenRef.current;

      // Try triggering execute if supported
      try {
        turnstileRef.current?.execute?.();
      } catch {
        // Ignore if execute is not needed or not supported
      }

      return new Promise<string | null>((resolve) => {
        let timer: NodeJS.Timeout | null = null;

        const waiter = (resolvedToken: string | null) => {
          if (timer) clearTimeout(timer);
          resolve(resolvedToken);
        };

        waitersRef.current.push(waiter);

        timer = setTimeout(() => {
          waitersRef.current = waitersRef.current.filter((w) => w !== waiter);
          resolve(tokenRef.current || null);
        }, timeoutMs);
      });
    },
    [showTurnstile]
  );

  return {
    siteKey,
    showTurnstile,
    token,
    isReady,
    hasError,
    turnstileRef,
    onSuccess,
    onError,
    onExpire,
    reset,
    getTokenOrWait,
  };
}
