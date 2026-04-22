/** @vitest-environment node */
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Message } from '../../server/lib/llm-types';

describe('cancel / abort propagation to fetch', () => {
  const origFetch = globalThis.fetch;
  const origKey = process.env.OPENROUTER_API_KEY;

  afterEach(() => {
    globalThis.fetch = origFetch;
    if (origKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = origKey;
    }
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('passes an AbortSignal into fetch when streamWithTools receives one', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key-for-abort';
    const user = new AbortController();
    const seen: AbortSignal[] = [];

    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.signal) seen.push(init.signal);
      user.abort();
      return new Response('{}', { status: 401, statusText: 'Unauthorized' });
    });

    vi.resetModules();
    const { streamWithTools } = await import('../../server/lib/openrouter');

    const gen = streamWithTools(
      'openai/gpt-4',
      [{ role: 'user', content: 'ping' }] as Message[],
      undefined,
      user.signal,
    );

    await expect(async () => {
      for await (const _ of gen) {
        /* drain */
      }
    }).rejects.toThrow();

    expect(seen.length).toBeGreaterThanOrEqual(1);
    expect(seen[0]).toBeDefined();
  });
});
