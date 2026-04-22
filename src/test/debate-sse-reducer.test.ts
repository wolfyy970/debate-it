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
