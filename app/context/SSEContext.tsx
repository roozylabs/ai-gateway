'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface SSEMessageEvent {
  type: string;
  payload: any;
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
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEMessageEvent | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        eventSource = new EventSource('/api/sse');

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

            // Live update React Query caches on gateway activity
            queryClient.invalidateQueries({ queryKey: ['health'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-usage'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-health'] });
            queryClient.invalidateQueries({ queryKey: ['logs'] });
            queryClient.invalidateQueries({ queryKey: ['providers'] });
            queryClient.invalidateQueries({ queryKey: ['credentials'] });
          } catch (err) {
            console.error('[SSE Parse Error]', err);
          }
        };

        eventSource.onmessage = (event) => {
          handleData(event.data, 'message');
        };

        eventSource.addEventListener('ping', (event) => {
          setIsConnected(true);
          handleData(event.data, 'ping');
        });

        eventSource.addEventListener('connected', (event) => {
          setIsConnected(true);
          handleData(event.data, 'connected');
        });

        eventSource.onerror = (err) => {
          console.warn('[SSE Connection Error]', err);
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
          }
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        console.error('[SSE Initialization Error]', err);
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [queryClient]);

  return (
    <SSEContext.Provider value={{ isConnected, lastEvent }}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSSE = () => useContext(SSEContext);
