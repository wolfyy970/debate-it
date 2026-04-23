/** @vitest-environment node */
import express from 'express';
import http from 'http';
import { describe, it, expect, vi, afterEach } from 'vitest';
import debatesRouter from '../../server/routes/debates';
import * as openrouter from '../../server/lib/openrouter';
import { createDebateInstance, getDebateStore, generateId } from '../../server/lib/store';
import type { Turn } from '../../server/lib/store';

function listen(app: express.Express): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const srv = http.createServer(app);
    srv.listen(0, () => {
      const a = srv.address();
      const port = typeof a === 'object' && a ? a.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}/api/debates`,
        close: () => new Promise((r) => srv.close(() => r())),
      });
    });
    srv.on('error', reject);
  });
}

function agentTurn(role: 'Advocate' | 'Skeptic', phase: Turn['phase'], n: number): Turn {
  return {
    id: generateId('turn'),
    n,
    role,
    phase,
    text: 'x',
    timestamp: new Date().toISOString(),
  };
}

describe('POST /api/debates/:id/next schedule guard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getDebateStore().getAll().forEach((d) => getDebateStore().delete(d.id));
  });

  it('returns 409 with reason schedule_complete when agent cap already reached (live + stale phase)', async () => {
    vi.spyOn(openrouter, 'checkApiKeys').mockReturnValue({
      hasAny: true,
      openrouter: true,
      kimi: false,
      tavily: true,
      hasAllRequired: true,
    });

    const debate = createDebateInstance({
      topic: 'Schedule cap',
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
        crossExEnabled: false,
        synthesisType: 'judge',
      },
    });

    const store = getDebateStore();
    const d = store.get(debate.id)!;
    const topic = d.turns[0];
    d.turns = [
      topic,
      agentTurn('Advocate', 'Opening', 2),
      agentTurn('Skeptic', 'Opening', 3),
      agentTurn('Advocate', 'Final', 4),
      agentTurn('Skeptic', 'Final', 5),
    ];
    d.status = 'live';
    d.phase = 'Opening';
    d.round = 1;
    store.set(debate.id, d);

    const app = express();
    app.use(express.json());
    app.use('/api/debates', debatesRouter);

    const { url, close } = await listen(app);
    try {
      const res = await fetch(`${url}/${debate.id}/next`, { method: 'POST' });
      expect(res.status).toBe(409);
      const body = (await res.json()) as { reason?: string; message?: string };
      expect(body.reason).toBe('schedule_complete');
      expect(body.message).toBeDefined();
    } finally {
      await close();
    }
  });
});
