/**
 * Wire contract for debate SSE (browser EventSource ↔ Express).
 * Pure module — safe for both Vite client and Node server.
 */

export type ServerSseEventType =
  | 'start'
  | 'turn'
  | 'phase'
  | 'ping'
  | 'phase-change'
  | 'chunk'
  | 'reasoning'
  | 'search_start'
  | 'search_update'
  | 'search_result'
  | 'url_read'
  | 'done'
  | 'error'
  | 'cancelled';

/** Agent snapshot on wire (subset of persisted Agent). */
export interface SseAgentWire {
  role: string;
  style: string;
  model: string;
  provider?: string;
}

export type ServerSseEvent =
  | { type: 'start'; debateId: string }
  | { type: 'turn'; turn: Record<string, unknown> }
  | { type: 'phase'; phase: string; round: number }
  | { type: 'ping' }
  | { type: 'phase-change'; phase: string; round: number; status?: string }
  | { type: 'chunk'; data: string }
  | { type: 'reasoning'; data: string }
  | {
      type: 'search_start';
      data: { id: string; query: string; reason: string; name?: string };
    }
  | {
      type: 'search_update';
      data: { id: string; query: string; reason: string; name?: string };
    }
  | {
      type: 'search_result';
      data: {
        id: string;
        query?: string;
        name?: string;
        results?: { title: string; url: string }[];
        /** Tool / Tavily failure message when the search did not succeed. */
        error?: string;
        /** Optional machine-readable category (`search_timeout`, `search_unavailable`, …). */
        code?: string;
      };
    }
  | { type: 'url_read'; data: { url: string } }
  | {
      type: 'done';
      data: {
        text: string;
        reasoning?: string;
        tokenCount: number;
        agent: SseAgentWire;
        sources?: { title: string; url: string; snippet?: string }[];
      };
    }
  | { type: 'error'; data: { message: string; jobId?: string } }
  | { type: 'cancelled'; data: { jobId: string } };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function hasString(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === 'string';
}

/**
 * Parse and narrow a single SSE `data:` JSON line.
 * Returns null if the payload is not a recognized ServerSseEvent.
 */
export function parseSseEvent(raw: string): ServerSseEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    return null;
  }

  const t = parsed.type as ServerSseEventType;

  switch (t) {
    case 'start':
      if (hasString(parsed, 'debateId')) {
        return { type: 'start', debateId: parsed.debateId as string };
      }
      return null;
    case 'turn':
      if (isRecord(parsed.turn)) {
        return { type: 'turn', turn: parsed.turn };
      }
      return null;
    case 'phase':
      if (hasString(parsed, 'phase') && typeof parsed.round === 'number') {
        return { type: 'phase', phase: parsed.phase as string, round: parsed.round as number };
      }
      return null;
    case 'ping':
      return { type: 'ping' };
    case 'phase-change':
      if (hasString(parsed, 'phase') && typeof parsed.round === 'number') {
        return {
          type: 'phase-change',
          phase: parsed.phase as string,
          round: parsed.round as number,
          ...(typeof parsed.status === 'string' ? { status: parsed.status } : {}),
        };
      }
      return null;
    case 'chunk':
    case 'reasoning':
      if (typeof parsed.data === 'string') {
        return { type: t, data: parsed.data };
      }
      return null;
    case 'search_start':
    case 'search_update':
      if (isRecord(parsed.data) && typeof parsed.data.id === 'string') {
        const d = parsed.data;
        return {
          type: t,
          data: {
            id: d.id as string,
            query: typeof d.query === 'string' ? d.query : '',
            reason: typeof d.reason === 'string' ? d.reason : '',
            ...(typeof d.name === 'string' ? { name: d.name } : {}),
          },
        };
      }
      return null;
    case 'search_result':
      if (isRecord(parsed.data) && typeof parsed.data.id === 'string') {
        const d = parsed.data;
        return {
          type: 'search_result',
          data: {
            id: d.id as string,
            ...(typeof d.query === 'string' ? { query: d.query } : {}),
            ...(typeof d.name === 'string' ? { name: d.name } : {}),
            ...(Array.isArray(d.results) ? { results: d.results as { title: string; url: string }[] } : {}),
            ...(typeof d.error === 'string' ? { error: d.error } : {}),
            ...(typeof d.code === 'string' ? { code: d.code } : {}),
          },
        };
      }
      return null;
    case 'url_read':
      if (isRecord(parsed.data) && typeof parsed.data.url === 'string') {
        return { type: 'url_read', data: { url: parsed.data.url as string } };
      }
      return null;
    case 'done': {
      const d = parsed.data;
      if (isRecord(d) && typeof d.text === 'string') {
        return {
          type: 'done',
          data: d as {
            text: string;
            reasoning?: string;
            tokenCount: number;
            agent: SseAgentWire;
            sources?: { title: string; url: string; snippet?: string }[];
          },
        };
      }
      return null;
    }
    case 'error':
      if (isRecord(parsed.data) && typeof parsed.data.message === 'string') {
        return { type: 'error', data: parsed.data as { message: string; jobId?: string } };
      }
      return null;
    case 'cancelled':
      if (isRecord(parsed.data) && typeof parsed.data.jobId === 'string') {
        return { type: 'cancelled', data: { jobId: parsed.data.jobId } };
      }
      return null;
    default:
      return null;
  }
}
