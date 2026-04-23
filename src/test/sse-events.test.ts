import { describe, expect, it } from 'vitest';
import { parseSseEvent, type ServerSseEvent } from '../../server/lib/sse-events';

function roundTrip(event: ServerSseEvent): ServerSseEvent | null {
  const raw = JSON.stringify(event);
  return parseSseEvent(raw);
}

describe('parseSseEvent', () => {
  it('round-trips start', () => {
    const e: ServerSseEvent = { type: 'start', debateId: 'deb-1' };
    expect(roundTrip(e)).toEqual(e);
  });

  it('round-trips turn', () => {
    const e: ServerSseEvent = {
      type: 'turn',
      turn: { id: 't1', n: 2, role: 'Advocate', text: 'hello', phase: 'Opening' },
    };
    expect(roundTrip(e)).toEqual(e);
  });

  it('round-trips phase and ping', () => {
    expect(roundTrip({ type: 'phase', phase: 'Opening', round: 1 })).toEqual({
      type: 'phase',
      phase: 'Opening',
      round: 1,
    });
    expect(roundTrip({ type: 'ping' })).toEqual({ type: 'ping' });
  });

  it('round-trips phase-change', () => {
    const e: ServerSseEvent = {
      type: 'phase-change',
      phase: 'Cross-Ex',
      round: 1,
      status: 'live',
    };
    expect(roundTrip(e)).toEqual(e);
  });

  it('round-trips chunk and reasoning', () => {
    expect(roundTrip({ type: 'chunk', data: 'x' })).toEqual({ type: 'chunk', data: 'x' });
    expect(roundTrip({ type: 'reasoning', data: 'y' })).toEqual({ type: 'reasoning', data: 'y' });
  });

  it('round-trips search_*', () => {
    const start: ServerSseEvent = {
      type: 'search_start',
      data: { id: 'call_1', query: 'q', reason: 'r', name: 'search_web' },
    };
    expect(roundTrip(start)).toEqual(start);
    const upd: ServerSseEvent = {
      type: 'search_update',
      data: { id: 'call_1', query: 'q2', reason: 'r2' },
    };
    expect(roundTrip(upd)).toEqual(upd);
    const res: ServerSseEvent = {
      type: 'search_result',
      data: { id: 'call_1', results: [{ title: 'T', url: 'https://x' }] },
    };
    expect(roundTrip(res)).toEqual(res);
    const resErr: ServerSseEvent = {
      type: 'search_result',
      data: { id: 'call_2', results: [], error: 'Tavily API error: 500', code: 'search_http' },
    };
    expect(roundTrip(resErr)).toEqual(resErr);
  });

  it('round-trips url_read', () => {
    const e: ServerSseEvent = { type: 'url_read', data: { url: 'https://example.com/a' } };
    expect(roundTrip(e)).toEqual(e);
  });

  it('rejects search_* events missing id', () => {
    expect(
      parseSseEvent(
        JSON.stringify({ type: 'search_start', data: { query: 'q', reason: 'r' } }),
      ),
    ).toBeNull();
    expect(
      parseSseEvent(JSON.stringify({ type: 'search_result', data: { results: [] } })),
    ).toBeNull();
  });

  it('round-trips done', () => {
    const e: ServerSseEvent = {
      type: 'done',
      data: {
        text: 'arg',
        tokenCount: 42,
        agent: { role: 'Advocate', style: 'analytical', model: 'm' },
        sources: [{ title: 'S', url: 'https://s', snippet: 'snip' }],
      },
    };
    expect(roundTrip(e)).toEqual(e);
  });

  it('round-trips error and cancelled', () => {
    expect(
      roundTrip({ type: 'error', data: { message: 'bad', jobId: 'job-1' } }),
    ).toEqual({ type: 'error', data: { message: 'bad', jobId: 'job-1' } });
    expect(roundTrip({ type: 'cancelled', data: { jobId: 'job-1' } })).toEqual({
      type: 'cancelled',
      data: { jobId: 'job-1' },
    });
  });

  it('returns null for invalid JSON', () => {
    expect(parseSseEvent('not json')).toBeNull();
  });

  it('returns null for unknown type', () => {
    expect(parseSseEvent(JSON.stringify({ type: 'nope' }))).toBeNull();
  });

  it('returns null for malformed payloads', () => {
    expect(parseSseEvent(JSON.stringify({ type: 'start' }))).toBeNull();
    expect(parseSseEvent(JSON.stringify({ type: 'turn' }))).toBeNull();
  });
});
