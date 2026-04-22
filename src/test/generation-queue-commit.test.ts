import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DebateAgent } from '../../server/lib/debate-agent';
import { getDebateStore, createDebateInstance } from '../../server/lib/store';
import { getGenerationQueue } from '../../server/lib/generation-queue';

describe('GenerationQueue single-writer commit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const store = getDebateStore();
    store.getAll().forEach((d) => store.delete(d.id));
  });

  it('persists exactly one new turn when two SSE listeners are attached', async () => {
    vi.spyOn(DebateAgent.prototype, 'run').mockImplementation(async function* () {
      yield { type: 'text_delta', data: 'Synthetic advocate reply.' };
      yield { type: 'done', sources: undefined };
    });

    const debate = createDebateInstance({
      topic: 'Topic',
      mode: 'balanced',
      agents: [
        { role: 'Advocate', style: 'data-driven', model: 'm', provider: 'p' },
        { role: 'Skeptic', style: 'philosophical', model: 'm', provider: 'p' },
      ],
      toggles: {
        factChecking: false,
        forceSteelmanning: false,
        requireVerdict: false,
        scoring: false,
      },
      structure: {
        rounds: 2,
        turnCap: 500,
        crossExAfterRound: 1,
        synthesisType: 'judge',
      },
    });

    const queue = getGenerationQueue();
    const agent = debate.agents.find((a) => a.role === 'Advocate')!;

    let sseEvents = 0;
    queue.addSSEListener(debate.id, () => {
      sseEvents++;
    });
    queue.addSSEListener(debate.id, () => {
      sseEvents++;
    });

    queue.enqueue(debate.id, agent, debate);

    const store = getDebateStore();
    await vi.waitUntil(() => (store.get(debate.id)?.turns.length ?? 0) >= 2, { timeout: 8000 });

    const d = store.get(debate.id)!;
    expect(d.turns.length).toBe(2);
    const nonMeta = d.turns.filter((t) => !t.meta);
    expect(nonMeta).toHaveLength(1);
    expect(nonMeta[0].text).toContain('Synthetic advocate');
    expect(sseEvents).toBeGreaterThanOrEqual(4);
    await store.flushPendingWrites();
  });
});
