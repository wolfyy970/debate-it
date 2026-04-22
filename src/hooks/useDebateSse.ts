import { useCallback, useEffect, useRef, type Dispatch } from 'react';
import { parseSseEvent } from '../lib/sseEvents';
import type { DebateLiveAction } from '../state/debateSseReducer';
import { SSE_RECONNECT_BASE_MS, SSE_RECONNECT_MAX_MS } from '../lib/constants';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export function useDebateSse(
  id: string | undefined,
  dispatch: Dispatch<DebateLiveAction>,
  setConnectionStatus: (s: ConnectionStatus) => void,
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const setupSSERef = useRef<(() => (() => void) | void) | undefined>(undefined);

  const setupSSE = useCallback(() => {
    if (!id) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');

    const es = new EventSource(`/api/debates/${id}/stream`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
    };

    es.onmessage = (event) => {
      try {
        const parsed = parseSseEvent(event.data);
        if (parsed) {
          dispatch({ type: 'SSE', event: parsed });
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    es.onerror = () => {
      setConnectionStatus('disconnected');
      es.close();

      const delay = Math.min(
        SSE_RECONNECT_BASE_MS * Math.pow(2, reconnectAttemptsRef.current),
        SSE_RECONNECT_MAX_MS,
      );
      reconnectAttemptsRef.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        setupSSERef.current?.();
      }, delay);
    };

    return () => {
      es.close();
    };
  }, [dispatch, id, setConnectionStatus]);

  useEffect(() => {
    setupSSERef.current = setupSSE;
    const cleanup = setupSSE();
    return () => {
      cleanup?.();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [setupSSE]);
}
