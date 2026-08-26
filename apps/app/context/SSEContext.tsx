'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import { AppRoutes, ApiEndpoints, CookieKeys } from '@/constants/routes';

export interface SSEMessageEvent {
  type: string;
  payload: Record<string, unknown> | unknown;
  timestamp: string;
}

interface SSEContextType {
  isConnected: boolean;
  lastEvent: SSEMessageEvent | null;
}

const SSEContext = createContext<SSEContextType>({
  isConnected: false,
  lastEvent: null,
});

export const SSEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEMessageEvent | null>(null);

  useEffect(() => {
    const token = Cookies.get(CookieKeys.AUTH_TOKEN);
    if (pathname === AppRoutes.LOGIN || !token) {
      setIsConnected(false);
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      const currentToken = Cookies.get(CookieKeys.AUTH_TOKEN);
      if (pathname === AppRoutes.LOGIN || !currentToken) {
        setIsConnected(false);
        return;
      }

      try {
        eventSource = new EventSource(ApiEndpoints.SSE, { withCredentials: true });

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        const handleData = (eventData: string, eventType: string) => {
          try {
            const data = JSON.parse(eventData);
            setLastEvent({
              type: eventType,
              payload: data,
              timestamp: new Date().toISOString(),
            });

            // Live update React Query caches on actual gateway activity messages
            if (eventType === 'message') {
              queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-usage'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-health'] });
              queryClient.invalidateQueries({ queryKey: ['active-streams'] });
              queryClient.invalidateQueries({ queryKey: ['logs'] });
              queryClient.invalidateQueries({ queryKey: ['recent-logs'] });
              queryClient.invalidateQueries({ queryKey: ['credentials'] });
            }
          } catch (err) {
            console.error('[SSE Parse Error]', err);
          }
        };

        eventSource.onmessage = (event) => {
          handleData(event.data, 'message');
        };

        eventSource.addEventListener('ping', () => {
          setIsConnected(true);
        });

        eventSource.addEventListener('connected', () => {
          setIsConnected(true);
        });

        eventSource.onerror = (err) => {
          console.warn('[SSE Connection Error]', err);
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
          }
          const activeToken = Cookies.get(CookieKeys.AUTH_TOKEN);
          if (pathname !== AppRoutes.LOGIN && activeToken) {
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };
      } catch (err) {
        console.error('[SSE Initialization Error]', err);
        setIsConnected(false);
        const activeToken = Cookies.get(CookieKeys.AUTH_TOKEN);
        if (pathname !== AppRoutes.LOGIN && activeToken) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [queryClient, pathname]);

  return (
    <SSEContext.Provider value={{ isConnected, lastEvent }}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSSE = () => useContext(SSEContext);
