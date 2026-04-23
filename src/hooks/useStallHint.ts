import { useEffect, useState } from 'react';

/**
 * True when `enabled` and no SSE heartbeat for longer than `stallMs`
 * (compared to `lastEventAt` from the reducer, updated on each SSE case).
 */
export function useStallHint(lastEventAt: number, enabled: boolean, stallMs = 10_000): boolean {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (!enabled || lastEventAt <= 0) {
      setStalled(false);
      return;
    }

    const tick = () => {
      setStalled(Date.now() - lastEventAt > stallMs);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [lastEventAt, enabled, stallMs]);

  return stalled;
}
