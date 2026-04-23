import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { StreamEvent } from '../../server/lib/llm-types';
import { DebateAgent } from '../../server/lib/debate-agent';
import * as openrouter from '../../server/lib/openrouter';

describe('DebateAgent forced prose pass', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('emits error when main stream and forced no-tools stream both produce no body', async () => {
    const emptyStop: StreamEvent = { type: 'done', stopReason: 'stop' };

    vi.spyOn(openrouter, 'streamWithTools').mockImplementation(async function* (_model, _messages, tools) {
      if (tools != null && tools.length > 0) {
        yield emptyStop;
      } else {
        yield emptyStop;
      }
    });

    const agent = new DebateAgent({
      topic: 'Test topic',
      phase: 'Opening',
      round: 1,
      role: 'Advocate',
      style: 'analytical',
      model: 'test-model',
      priorTurns: [],
    });

    const events: { type: string; data?: string }[] = [];
    for await (const e of agent.run()) {
      events.push({ type: e.type, data: typeof e.data === 'string' ? e.data : undefined });
    }

    expect(events.some((e) => e.type === 'error')).toBe(true);
    expect(events.filter((e) => e.type === 'done')).toHaveLength(0);
  });

  it('commits done when forced pass streams text after empty stop', async () => {
    let call = 0;
    vi.spyOn(openrouter, 'streamWithTools').mockImplementation(async function* (_model, _messages, tools) {
      call++;
      if (tools != null && tools.length > 0) {
        yield { type: 'done', stopReason: 'stop' };
      } else {
        yield { type: 'text_delta', data: 'Here is the required argument body.' };
        yield { type: 'done', stopReason: 'stop' };
      }
    });

    const agent = new DebateAgent({
      topic: 'Test topic',
      phase: 'Opening',
      round: 1,
      role: 'Advocate',
      style: 'analytical',
      model: 'test-model',
      priorTurns: [],
    });

    const events: { type: string }[] = [];
    for await (const e of agent.run()) {
      events.push({ type: e.type });
    }

    expect(call).toBe(2);
    expect(events.filter((e) => e.type === 'done')).toHaveLength(1);
    expect(events.some((e) => e.type === 'error')).toBe(false);
    expect(agent.getFullText()).toContain('required argument');
  });
});
