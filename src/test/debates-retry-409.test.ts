/** @vitest-environment node */
import express from 'express';
import http from 'http';
import { describe, it, expect, vi, afterEach } from 'vitest';
import debatesRouter from '../../server/routes/debates';
import * as openrouter from '../../server/lib/openrouter';
import { createDebateInstance, getDebateStore } from '../../server/lib/store';
import { getGenerationQueue } from '../../server/lib/generation-queue';

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

describe('POST /api/debates/:id/retry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getDebateStore().getAll().forEach((d) => getDebateStore().delete(d.id));
  });

  it('returns 409 with jobId when a generation is already in progress', async () => {
    vi.spyOn(openrouter, 'checkApiKeys').mockReturnValue({
      hasAny: true,
      openrouter: true,
      kimi: false,
    });

    const debate = createDebateInstance({
      topic: 'Retry conflict',
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
    vi.spyOn(queue, 'getActiveJob').mockReturnValue({
      id: 'active-job-stub',
      debateId: debate.id,
      status: 'generating',
    } as never);

    const app = express();
    app.use(express.json());
    app.use('/api/debates', debatesRouter);

    const { url, close } = await listen(app);
    try {
      const res = await fetch(`${url}/${debate.id}/retry`, { method: 'POST' });
      expect(res.status).toBe(409);
      const body = (await res.json()) as { jobId?: string; message?: string };
      expect(body.jobId).toBe('active-job-stub');
      expect(body.message).toBeDefined();
    } finally {
      await close();
    }
  });
});
