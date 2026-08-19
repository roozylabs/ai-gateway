'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface SSEMessageEvent {
  type: string;
  payload: any;
  timestamp: string;
}

export function useSSE() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEMessageEvent | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      // Connect to Next.js API proxy route for SSE
      eventSource = new EventSource('/api/sse');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastEvent({
            type: data.type || 'message',
            payload: data,
            timestamp: new Date().toISOString(),
          });

          // Live update React Query caches on gateway activity
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-usage'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-health'] });
          queryClient.invalidateQueries({ queryKey: ['logs'] });
          queryClient.invalidateQueries({ queryKey: ['providers'] });
        } catch (err) {
          console.error('[SSE Parse Error]', err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('[SSE Connection Error]', err);
        setIsConnected(false);
      };
    } catch (err) {
      console.error('[SSE Initialization Error]', err);
      setIsConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [queryClient]);

  return { isConnected, lastEvent };
}

export default useSSE;
