import type { Agent, Phase, Turn, Source, DebateStructure } from '../types';
import type { ServerSseEvent } from '../lib/sseEvents';

export type GenerationLastActivity = 'thinking' | 'searching' | 'reading' | 'writing' | null;

export interface LiveDebateSnapshot {
  topic: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  turns: Turn[];
  status: string;
  structure: DebateStructure;
  /** Setup-time agent roster; used so turn rows show configured style/model even when a turn omits them. */
  agents: Agent[];
}

export interface ActiveSearchUi {
  /** Tool call id from the provider; stable across start/update/result events. */
  id: string;
  query: string;
  reason?: string;
  status: 'searching' | 'done' | 'error';
  results?: { title: string; url: string }[];
  /** Set when Tavily/tool failed (distinct from empty legitimate results). */
  errorMessage?: string;
  /** Machine-readable category from server (`search_timeout`, etc.). */
  errorCode?: string;
}

export interface DebateLiveUiState {
  debate: LiveDebateSnapshot | null;
  streamingText: string;
  reasoningText: string;
  isStreaming: boolean;
  isThinking: boolean;
  generationError: string | null;
  isAdvancing: boolean;
  activeSearches: ActiveSearchUi[];
  /** Successful read_url executions this generation (each open + fetch counts once). */
  fullReadCount: number;
  /** Deduped sources accumulated during the current generation (order matches stable [N] in prose). */
  liveSources: Source[];
  /** Most recent SSE-driven activity for the live turn UI. */
  lastActivity: GenerationLastActivity;
  /** `Date.now()` of the last SSE event that updates live activity (for stall detection). */
  lastEventAt: number;
}

function anySearchSearching(searches: ActiveSearchUi[]): boolean {
  return searches.some((s) => s.status === 'searching');
}

function mergeLiveSources(prev: Source[], results: { title: string; url: string }[] | undefined): Source[] {
  if (!results?.length) return prev;
  const seen = new Set(prev.map((s) => s.url));
  const next = [...prev];
  for (const r of results) {
    if (!r.url || seen.has(r.url)) continue;
    seen.add(r.url);
    next.push({ title: r.title, url: r.url });
  }
  return next;
}

export function getInitialDebateLiveUiState(): DebateLiveUiState {
  return {
    debate: null,
    streamingText: '',
    reasoningText: '',
    isStreaming: false,
    isThinking: false,
    generationError: null,
    isAdvancing: false,
    activeSearches: [],
    fullReadCount: 0,
    liveSources: [],
    lastActivity: null,
    lastEventAt: 0,
  };
}

/** Pure application of one server-sent event to UI state. */
export function applySseEvent(state: DebateLiveUiState, event: ServerSseEvent): DebateLiveUiState {
  const stamp = Date.now();
  switch (event.type) {
    case 'start':
    case 'ping':
      return state;
    case 'phase':
      return state;
    case 'turn': {
      if (!state.debate) return state;
      const exists = state.debate.turns.find((turn) => turn.id === event.turn.id);
      if (exists) return state;
      return {
        ...state,
        debate: {
          ...state.debate,
          turns: [...state.debate.turns, event.turn as unknown as Turn],
        },
        streamingText: '',
        reasoningText: '',
        isStreaming: false,
        isThinking: false,
        isAdvancing: false,
        generationError: null,
        activeSearches: [],
        fullReadCount: 0,
        liveSources: [],
        lastActivity: null,
        lastEventAt: 0,
      };
    }
    case 'url_read':
      return {
        ...state,
        fullReadCount: state.fullReadCount + 1,
        lastActivity: 'reading',
        lastEventAt: stamp,
      };
    case 'chunk':
      return {
        ...state,
        streamingText: state.streamingText + event.data,
        isStreaming: true,
        isThinking: false,
        lastActivity: 'writing',
        lastEventAt: stamp,
      };
    case 'reasoning':
      return {
        ...state,
        reasoningText: state.reasoningText + event.data,
        isThinking: true,
        lastActivity: state.isStreaming ? 'writing' : 'thinking',
        lastEventAt: stamp,
      };
    case 'search_start': {
      const id = event.data.id;
      const prev = state.activeSearches;
      if (prev.some((s) => s.id === id)) {
        return { ...state, lastActivity: 'searching', lastEventAt: stamp };
      }
      return {
        ...state,
        activeSearches: [
          ...prev,
          {
            id,
            query: event.data.query || '',
            reason: event.data.reason || '',
            status: 'searching',
          },
        ],
        lastActivity: 'searching',
        lastEventAt: stamp,
      };
    }
    case 'search_update': {
      const id = event.data.id;
      const prev = state.activeSearches;
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) {
        return {
          ...state,
          activeSearches: [
            ...prev,
            {
              id,
              query: event.data.query || '',
              reason: event.data.reason || '',
              status: 'searching',
            },
          ],
          lastActivity: 'searching',
          lastEventAt: stamp,
        };
      }
      const existing = prev[idx];
      const next = [...prev];
      next[idx] = {
        ...existing,
        query: event.data.query || existing.query,
        reason: event.data.reason || existing.reason,
      };
      return {
        ...state,
        activeSearches: next,
        lastActivity: 'searching',
        lastEventAt: stamp,
      };
    }
    case 'search_result': {
      const id = event.data.id;
      const prev = state.activeSearches;
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return state;
      const existing = prev[idx];
      const next = [...prev];
      const err = typeof event.data.error === 'string' ? event.data.error : undefined;
      const code = typeof event.data.code === 'string' ? event.data.code : undefined;
      next[idx] = {
        ...existing,
        status: err ? 'error' : 'done',
        results: event.data.results || [],
        ...(err
          ? { errorMessage: err, errorCode: code }
          : { errorMessage: undefined, errorCode: undefined }),
      };
      const liveSources = err ? state.liveSources : mergeLiveSources(state.liveSources, event.data.results);
      const activity: GenerationLastActivity = anySearchSearching(next) ? 'searching' : 'thinking';
      return {
        ...state,
        activeSearches: next,
        liveSources,
        lastActivity: activity,
        lastEventAt: stamp,
      };
    }
    case 'error':
      return {
        ...state,
        generationError: event.data.message || 'Generation failed',
        isStreaming: false,
        isThinking: false,
        isAdvancing: false,
        fullReadCount: 0,
        activeSearches: [],
        liveSources: [],
        lastActivity: null,
        lastEventAt: 0,
      };
    case 'cancelled':
      return {
        ...state,
        streamingText: '',
        reasoningText: '',
        isStreaming: false,
        isThinking: false,
        isAdvancing: false,
        fullReadCount: 0,
        activeSearches: [],
        liveSources: [],
        lastActivity: null,
        lastEventAt: 0,
      };
    case 'phase-change':
      if (!state.debate) return state;
      return {
        ...state,
        debate: {
          ...state.debate,
          phase: event.phase as Phase,
          round: event.round,
          status: event.status || state.debate.status,
        },
      };
    case 'done':
      return state;
    default:
      return state;
  }
}

export type DebateLiveAction =
  | { type: 'HYDRATE'; debate: LiveDebateSnapshot }
  | { type: 'SSE'; event: ServerSseEvent }
  | { type: 'RESET_STREAM_UI' }
  | { type: 'NEXT_START' }
  | { type: 'NEXT_FAIL'; message: string }
  | { type: 'NEXT_NET_ERROR' }
  | { type: 'RETRY_START' }
  | { type: 'RETRY_FAIL'; message: string }
  | { type: 'RETRY_NET_ERROR' };

export function debateLiveReducer(state: DebateLiveUiState, action: DebateLiveAction): DebateLiveUiState {
  const now = Date.now();
  switch (action.type) {
    case 'HYDRATE':
      return { ...getInitialDebateLiveUiState(), debate: action.debate };
    case 'SSE':
      return applySseEvent(state, action.event);
    case 'RESET_STREAM_UI':
      return {
        ...state,
        streamingText: '',
        reasoningText: '',
        isStreaming: false,
        isThinking: false,
        isAdvancing: false,
        fullReadCount: 0,
        activeSearches: [],
        liveSources: [],
        lastActivity: null,
        lastEventAt: 0,
      };
    case 'NEXT_START':
      return {
        ...state,
        isAdvancing: true,
        generationError: null,
        lastEventAt: now,
        lastActivity: 'thinking',
        liveSources: [],
        activeSearches: [],
      };
    case 'NEXT_FAIL':
      return { ...state, generationError: action.message, isAdvancing: false };
    case 'NEXT_NET_ERROR':
      return { ...state, generationError: 'Network error. Retrying...', isAdvancing: false };
    case 'RETRY_START':
      return {
        ...state,
        generationError: null,
        isAdvancing: true,
        lastEventAt: now,
        lastActivity: 'thinking',
        liveSources: [],
        activeSearches: [],
      };
    case 'RETRY_FAIL':
      return { ...state, generationError: action.message, isAdvancing: false };
    case 'RETRY_NET_ERROR':
      return { ...state, generationError: 'Network error during retry', isAdvancing: false };
    default:
      return state;
  }
}
