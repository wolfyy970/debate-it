import { useCallback, useEffect, useRef, type Dispatch } from 'react';
import { apiUrl } from '../lib/apiBase';
import { parseSseEvent } from '../lib/sseEvents';
import type { DebateLiveAction } from '../state/debateSseReducer';
import { SSE_RECONNECT_BASE_MS, SSE_RECONNECT_MAX_MS } from '../lib/constants';

/** Transport state for the debate EventSource (masthead + auto-advance gating). */
export type DebateConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export function useDebateSse(
  id: string | undefined,
  dispatch: Dispatch<DebateLiveAction>,
  setConnectionStatus: (s: DebateConnectionStatus) => void,
  /** After a transport reconnect, refetch debate state (replay turns; clears stale stream UI). */
  onReconnect?: () => void | Promise<void>,
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const setupSSERef = useRef<(() => (() => void) | void) | undefined>(undefined);
  /** Bumped on teardown and each new subscription so stale `EventSource` handlers never touch state. */
  const connectionGenRef = useRef(0);
  /** Ignores handlers after React effect cleanup (StrictMode remount, route change). */
  const effectAliveRef = useRef(true);
  /** `onReconnect` must not sit in `useCallback` deps — an inline parent callback changes every render and would recreate the stream every paint. */
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  const setupSSE = useCallback(() => {
    if (!id) return;

    connectionGenRef.current += 1;
    const gen = connectionGenRef.current;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionStatus(
      reconnectAttemptsRef.current > 0 ? 'reconnecting' : 'connecting',
    );

    const es = new EventSource(apiUrl(`/api/debates/${id}/stream`));
    eventSourceRef.current = es;

    const isCurrent = () =>
      effectAliveRef.current && gen === connectionGenRef.current && eventSourceRef.current === es;

    es.onopen = () => {
      if (!isCurrent()) return;
      const attemptsBeforeReset = reconnectAttemptsRef.current;
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      if (attemptsBeforeReset > 0) {
        void Promise.resolve(onReconnectRef.current?.()).catch((err) => {
          console.error('useDebateSse onReconnect:', err);
        });
      }
    };

    es.onmessage = (event) => {
      if (!isCurrent()) return;
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
      if (!isCurrent()) {
        return;
      }
      setConnectionStatus('disconnected');
      es.close();
      if (eventSourceRef.current === es) {
        eventSourceRef.current = null;
      }

      const delay = Math.min(
        SSE_RECONNECT_BASE_MS * Math.pow(2, reconnectAttemptsRef.current),
        SSE_RECONNECT_MAX_MS,
      );
      reconnectAttemptsRef.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        if (effectAliveRef.current) {
          setupSSERef.current?.();
        }
      }, delay);
    };

    return () => {
      es.close();
    };
  }, [dispatch, id, setConnectionStatus]);

  useEffect(() => {
    reconnectAttemptsRef.current = 0;
    effectAliveRef.current = true;
    setupSSERef.current = setupSSE;
    const cleanupInner = setupSSE();
    return () => {
      connectionGenRef.current += 1;
      effectAliveRef.current = false;
      cleanupInner?.();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [setupSSE]);
}
