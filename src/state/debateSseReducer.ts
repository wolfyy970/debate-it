import type { Phase, Turn } from '../types';
import type { ServerSseEvent } from '../lib/sseEvents';

export interface LiveDebateSnapshot {
  topic: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  turns: Turn[];
  status: string;
}

export interface ActiveSearchUi {
  query: string;
  reason?: string;
  status: 'searching' | 'done';
  results?: { title: string; url: string }[];
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
  };
}

/** Pure application of one server-sent event to UI state. */
export function applySseEvent(state: DebateLiveUiState, event: ServerSseEvent): DebateLiveUiState {
  switch (event.type) {
    case 'start':
    case 'ping':
      return state;
    case 'phase':
      return state;
    case 'turn': {
      if (!state.debate) return state;
      const exists = state.debate.turns.find((t) => t.id === event.turn.id);
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
      };
    }
    case 'chunk':
      return {
        ...state,
        streamingText: state.streamingText + event.data,
        isStreaming: true,
        isThinking: false,
      };
    case 'reasoning':
      return {
        ...state,
        reasoningText: state.reasoningText + event.data,
        isThinking: true,
      };
    case 'search_start':
      return {
        ...state,
        activeSearches: [
          ...state.activeSearches,
          {
            query: event.data.query || '',
            reason: event.data.reason || '',
            status: 'searching',
          },
        ],
      };
    case 'search_update': {
      const prev = state.activeSearches;
      const lastSearch = prev[prev.length - 1];
      if (lastSearch && lastSearch.status === 'searching') {
        return {
          ...state,
          activeSearches: [
            ...prev.slice(0, -1),
            {
              ...lastSearch,
              query: event.data.query || lastSearch.query,
              reason: event.data.reason || lastSearch.reason,
            },
          ],
        };
      }
      return state;
    }
    case 'search_result': {
      const prev = state.activeSearches;
      const lastSearch = prev[prev.length - 1];
      if (lastSearch && lastSearch.status === 'searching') {
        return {
          ...state,
          activeSearches: [
            ...prev.slice(0, -1),
            {
              ...lastSearch,
              status: 'done',
              results: event.data.results || [],
            },
          ],
        };
      }
      return state;
    }
    case 'error':
      return {
        ...state,
        generationError: event.data.message || 'Generation failed',
        isStreaming: false,
        isThinking: false,
        isAdvancing: false,
      };
    case 'cancelled':
      return {
        ...state,
        streamingText: '',
        reasoningText: '',
        isStreaming: false,
        isThinking: false,
        isAdvancing: false,
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
      };
    case 'NEXT_START':
      return { ...state, isAdvancing: true, generationError: null };
    case 'NEXT_FAIL':
      return { ...state, generationError: action.message, isAdvancing: false };
    case 'NEXT_NET_ERROR':
      return { ...state, generationError: 'Network error. Retrying...', isAdvancing: false };
    case 'RETRY_START':
      return { ...state, generationError: null, isAdvancing: true };
    case 'RETRY_FAIL':
      return { ...state, generationError: action.message, isAdvancing: false };
    case 'RETRY_NET_ERROR':
      return { ...state, generationError: 'Network error during retry', isAdvancing: false };
    default:
      return state;
  }
}
