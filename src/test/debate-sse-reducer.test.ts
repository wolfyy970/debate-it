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
  structure: {
    rounds: 2,
    turnCap: 500,
    crossExAfterRound: 1,
    crossExEnabled: false,
    synthesisType: 'judge',
  },
  agents: [],
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

  it('increments fullReadCount on url_read and clears on turn', () => {
    const state = { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } };
    let s = applySseEvent(state, { type: 'url_read', data: { url: 'https://a' } });
    expect(s.fullReadCount).toBe(1);
    s = applySseEvent(s, { type: 'url_read', data: { url: 'https://b' } });
    expect(s.fullReadCount).toBe(2);
    s = applySseEvent(s, {
      type: 'turn',
      turn: { id: 't1', n: 1, role: 'Advocate', text: 'x', phase: 'Opening', timestamp: 'x' },
    } as ServerSseEvent);
    expect(s.fullReadCount).toBe(0);
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

  it('search_start → search_update fills in the final query (by id)', () => {
    const state = { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } };
    let s = applySseEvent(state, {
      type: 'search_start',
      data: { id: 'call_1', query: '', reason: '', name: 'search_web' },
    });
    expect(s.activeSearches).toHaveLength(1);
    expect(s.activeSearches[0].id).toBe('call_1');
    expect(s.activeSearches[0].status).toBe('searching');
    expect(s.activeSearches[0].query).toBe('');

    s = applySseEvent(s, {
      type: 'search_update',
      data: {
        id: 'call_1',
        query: 'does universal basic income work',
        reason: 'verifying',
        name: 'search_web',
      },
    });
    expect(s.activeSearches[0].query).toBe('does universal basic income work');
    expect(s.activeSearches[0].status).toBe('searching');
  });

  it('search_start is idempotent for the same id', () => {
    const state = { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } };
    let s = applySseEvent(state, {
      type: 'search_start',
      data: { id: 'call_1', query: '', reason: '', name: 'search_web' },
    });
    s = applySseEvent(s, {
      type: 'search_start',
      data: { id: 'call_1', query: '', reason: '', name: 'search_web' },
    });
    expect(s.activeSearches).toHaveLength(1);
  });

  it('two concurrent searches stay independent, keyed by id', () => {
    const state = { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } };
    let s = applySseEvent(state, {
      type: 'search_start',
      data: { id: 'a', query: '', reason: '', name: 'search_web' },
    });
    s = applySseEvent(s, {
      type: 'search_start',
      data: { id: 'b', query: '', reason: '', name: 'search_web' },
    });
    // out-of-order update for the first search: must not clobber the second
    s = applySseEvent(s, {
      type: 'search_update',
      data: { id: 'a', query: 'query A', reason: '', name: 'search_web' },
    });
    s = applySseEvent(s, {
      type: 'search_update',
      data: { id: 'b', query: 'query B', reason: '', name: 'search_web' },
    });
    s = applySseEvent(s, {
      type: 'search_result',
      data: {
        id: 'a',
        results: [{ title: 'A', url: 'https://example.com/a' }],
      },
    });

    expect(s.activeSearches).toHaveLength(2);
    const [first, second] = s.activeSearches;
    expect(first.id).toBe('a');
    expect(first.query).toBe('query A');
    expect(first.status).toBe('done');
    expect(second.id).toBe('b');
    expect(second.query).toBe('query B');
    expect(second.status).toBe('searching');
  });

  it('search_result with empty results still closes the matching search', () => {
    let s = applySseEvent(
      { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } },
      { type: 'search_start', data: { id: 'x', query: 'q', reason: '', name: 'search_web' } },
    );
    s = applySseEvent(s, { type: 'search_result', data: { id: 'x', results: [] } });
    expect(s.activeSearches[0].status).toBe('done');
    expect(s.activeSearches[0].results).toEqual([]);
  });

  it('search_result with error marks search as error', () => {
    let s = applySseEvent(
      { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } },
      { type: 'search_start', data: { id: 'e1', query: 'q', reason: '', name: 'search_web' } },
    );
    s = applySseEvent(s, {
      type: 'search_result',
      data: { id: 'e1', results: [], error: 'Tavily API error: 503' },
    });
    expect(s.activeSearches[0].status).toBe('error');
    expect(s.activeSearches[0].errorMessage).toBe('Tavily API error: 503');
  });

  it('search_result error may include errorCode', () => {
    let s = applySseEvent(
      { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } },
      { type: 'search_start', data: { id: 'e2', query: 'q', reason: '', name: 'search_web' } },
    );
    s = applySseEvent(s, {
      type: 'search_result',
      data: { id: 'e2', results: [], error: 'timed out', code: 'search_timeout' },
    });
    expect(s.activeSearches[0].errorCode).toBe('search_timeout');
  });

  it('chunk sets lastActivity to writing and bumps lastEventAt', () => {
    const state = { ...getInitialDebateLiveUiState(), debate: { ...baseDebate }, lastEventAt: 1 };
    const s = applySseEvent(state, { type: 'chunk', data: 'x' });
    expect(s.lastActivity).toBe('writing');
    expect(s.lastEventAt).toBeGreaterThanOrEqual(1);
    expect(s.streamingText).toBe('x');
  });

  it('search_result success merges liveSources by URL', () => {
    let s = applySseEvent(
      { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } },
      { type: 'search_start', data: { id: 'a', query: 'q1', reason: '', name: 'search_web' } },
    );
    s = applySseEvent(s, {
      type: 'search_result',
      data: {
        id: 'a',
        results: [
          { title: 'T1', url: 'https://a.com/1' },
          { title: 'T2', url: 'https://a.com/2' },
        ],
      },
    });
    expect(s.liveSources).toHaveLength(2);
    s = applySseEvent(s, { type: 'search_start', data: { id: 'b', query: 'q2', reason: '', name: 'search_web' } });
    s = applySseEvent(s, {
      type: 'search_result',
      data: {
        id: 'b',
        results: [
          { title: 'T1', url: 'https://a.com/1' },
          { title: 'T3', url: 'https://a.com/3' },
        ],
      },
    });
    expect(s.liveSources).toHaveLength(3);
    expect(s.liveSources[2]?.url).toBe('https://a.com/3');
  });

  it('search_update recovers missing search_start by creating the row', () => {
    const s = applySseEvent(
      { ...getInitialDebateLiveUiState(), debate: { ...baseDebate } },
      {
        type: 'search_update',
        data: { id: 'late', query: 'recovered query', reason: '', name: 'search_web' },
      },
    );
    expect(s.activeSearches).toHaveLength(1);
    expect(s.activeSearches[0].id).toBe('late');
    expect(s.activeSearches[0].query).toBe('recovered query');
    expect(s.activeSearches[0].status).toBe('searching');
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
