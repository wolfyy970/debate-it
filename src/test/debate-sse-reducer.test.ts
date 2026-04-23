import { describe, it, expect } from 'vitest';
import {
  applySseEvent,
  debateLiveReducer,
  getInitialDebateLiveUiState,
  type LiveDebateSnapshot,
} from '../state/debateSseReducer';
import type { ServerSseEvent } from '../lib/sseEvents';

const baseDebate: LiveDebateSnapshot = {
  topic: 'T',
  phase: 'Opening',
  round: 1,
  totalRounds: 2,
  turns: [],
  status: 'live',
};

describe('applySseEvent', () => {
  it('appends turn and clears stream state', () => {
    const state = { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } };
    const turn = { id: 'turn-1', n: 1, role: 'Advocate', text: 'Hi', phase: 'Opening', timestamp: 'x' };
    const next = applySseEvent(state, {
      type: 'turn',
      turn: turn as unknown as Record<string, unknown>,
    });
    expect(next.debate?.turns).toHaveLength(1);
    expect(next.streamingText).toBe('');
    expect(next.isAdvancing).toBe(false);
  });

  it('concatenates chunk text', () => {
    const state = { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } };
    let s = applySseEvent(state, { type: 'chunk', data: 'a' });
    s = applySseEvent(s, { type: 'chunk', data: 'b' });
    expect(s.streamingText).toBe('ab');
    expect(s.isStreaming).toBe(true);
  });

  it('handles phase-change', () => {
    const state = { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } };
    const next = applySseEvent(state, {
      type: 'phase-change',
      phase: 'Cross-Ex',
      round: 1,
      status: 'live',
    });
    expect(next.debate?.phase).toBe('Cross-Ex');
  });

  it('handles error', () => {
    const state = { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } };
    const next = applySseEvent(state, {
      type: 'error',
      data: { message: 'boom' },
    });
    expect(next.generationError).toBe('boom');
    expect(next.isAdvancing).toBe(false);
  });

  it('search_start → search_update fills in the final query', () => {
    const state = { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } };
    let s = applySseEvent(state, {
      type: 'search_start',
      data: { query: '', reason: '', name: 'search_web' },
    });
    expect(s.activeSearches).toHaveLength(1);
    expect(s.activeSearches[0].status).toBe('searching');
    expect(s.activeSearches[0].query).toBe('');

    s = applySseEvent(s, {
      type: 'search_update',
      data: { query: 'does universal basic income work', reason: 'verifying', name: 'search_web' },
    });
    expect(s.activeSearches[0].query).toBe('does universal basic income work');
    expect(s.activeSearches[0].status).toBe('searching');
  });

  it('search_result closes the search with results attached', () => {
    let s = applySseEvent(
      { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } },
      { type: 'search_start', data: { query: '', reason: '', name: 'search_web' } },
    );
    s = applySseEvent(s, {
      type: 'search_update',
      data: { query: 'final query', reason: '', name: 'search_web' },
    });
    s = applySseEvent(s, {
      type: 'search_result',
      data: {
        results: [{ title: 'A study', url: 'https://example.com/a' }],
      },
    });

    expect(s.activeSearches).toHaveLength(1);
    expect(s.activeSearches[0].status).toBe('done');
    expect(s.activeSearches[0].query).toBe('final query');
    expect(s.activeSearches[0].results).toEqual([
      { title: 'A study', url: 'https://example.com/a' },
    ]);
  });

  it('search_result with empty results still closes the search', () => {
    let s = applySseEvent(
      { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } },
      { type: 'search_start', data: { query: 'q', reason: '', name: 'search_web' } },
    );
    s = applySseEvent(s, { type: 'search_result', data: { results: [] } });
    expect(s.activeSearches[0].status).toBe('done');
    expect(s.activeSearches[0].results).toEqual([]);
  });
});

describe('debateLiveReducer', () => {
  it('hydrates debate', () => {
    const s = debateLiveReducer(getInitialDebateLiveUiState(), {
      type: 'HYDRATE',
      debate: baseDebate,
    });
    expect(s.debate?.topic).toBe('T');
  });

  it('delegates SSE', () => {
    const s0 = debateLiveReducer(getInitialDebateLiveUiState(), { type: 'HYDRATE', debate: baseDebate });
    const s1 = debateLiveReducer(s0, {
      type: 'SSE',
      event: { type: 'chunk', data: 'z' } as ServerSseEvent,
    });
    expect(s1.streamingText).toBe('z');
  });
});
