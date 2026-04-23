/** @vitest-environment node */
import express from 'express';
import http from 'http';
import { describe, it, expect, vi, afterEach } from 'vitest';
import debatesRouter from '../../server/routes/debates';
import * as openrouter from '../../server/lib/openrouter';
import { createDebateInstance, getDebateStore } from '../../server/lib/store';

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

function makeApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/debates', debatesRouter);
  return app;
}

describe('Debate routes require both LLM and Tavily', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getDebateStore()
      .getAll()
      .forEach((d) => getDebateStore().delete(d.id));
  });

  const validBody = {
    topic: 'Whether Tavily should be required',
    mode: 'balanced',
    agents: [
      { role: 'Advocate', style: 'data-driven', model: 'm', provider: 'p' },
      { role: 'Skeptic', style: 'philosophical', model: 'm', provider: 'p' },
    ],
    toggles: {
      factChecking: true,
      forceSteelmanning: false,
      requireVerdict: false,
      scoring: false,
    },
    structure: {
      rounds: 2,
      turnCap: 500,
      crossExAfterRound: 1,
      synthesisType: 'judge' as const,
    },
  };

  it('POST /api/debates returns 503 with missing={llm:true,tavily:true} when no keys', async () => {
    vi.spyOn(openrouter, 'checkApiKeys').mockReturnValue({
      hasAny: false,
      openrouter: false,
      kimi: false,
      tavily: false,
      hasAllRequired: false,
    });

    const { url, close } = await listen(makeApp());
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      });
      expect(res.status).toBe(503);
      const body = (await res.json()) as { missing?: { llm?: boolean; tavily?: boolean } };
      expect(body.missing).toEqual({ llm: true, tavily: true });
    } finally {
      await close();
    }
  });

  it('POST /api/debates returns 503 with missing.tavily=true when only Tavily is missing', async () => {
    vi.spyOn(openrouter, 'checkApiKeys').mockReturnValue({
      hasAny: true,
      openrouter: true,
      kimi: false,
      tavily: false,
      hasAllRequired: false,
    });

    const { url, close } = await listen(makeApp());
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      });
      expect(res.status).toBe(503);
      const body = (await res.json()) as { missing?: { llm?: boolean; tavily?: boolean } };
      expect(body.missing).toEqual({ llm: false, tavily: true });
    } finally {
      await close();
    }
  });

  it('POST /api/debates/:id/next returns 503 when required keys missing', async () => {
    vi.spyOn(openrouter, 'checkApiKeys').mockReturnValue({
      hasAny: true,
      openrouter: true,
      kimi: false,
      tavily: false,
      hasAllRequired: false,
    });

    const debate = createDebateInstance({
      topic: 'Needs keys',
      mode: 'balanced',
      agents: validBody.agents,
      toggles: validBody.toggles,
      structure: validBody.structure,
    });

    const { url, close } = await listen(makeApp());
    try {
      const res = await fetch(`${url}/${debate.id}/next`, { method: 'POST' });
      expect(res.status).toBe(503);
      const body = (await res.json()) as { missing?: { tavily?: boolean } };
      expect(body.missing?.tavily).toBe(true);
    } finally {
      await close();
    }
  });
});
