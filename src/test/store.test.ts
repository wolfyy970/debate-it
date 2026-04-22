import { describe, it, expect, beforeEach } from 'vitest';
import { getDebateStore, generateId, createDebateInstance, parseDebatesJson } from '../../server/lib/store';

describe('store', () => {
  beforeEach(() => {
    // Reset store for each test
    const store = getDebateStore();
    store.getAll().forEach(d => store.delete(d.id));
  });

  it('exposes no load error after successful bootstrap', () => {
    expect(getDebateStore().getLastLoadError()).toBeNull();
  });

  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^id-[0-9a-f-]{36}$/i);
  });

  it('creates a debate instance', () => {
    const debate = createDebateInstance({
      topic: 'Test topic',
      mode: 'balanced',
      agents: [
        { role: 'Advocate', style: 'data-driven', model: 'test', provider: 'Test' },
        { role: 'Skeptic', style: 'philosophical', model: 'test', provider: 'Test' },
      ],
      toggles: {
        factChecking: true,
        forceSteelmanning: true,
        requireVerdict: false,
        scoring: true,
      },
      structure: {
        rounds: 4,
        turnCap: 500,
        crossExAfterRound: 2,
        synthesisType: 'judge+system',
      },
    });

    expect(debate.topic).toBe('Test topic');
    expect(debate.agents).toHaveLength(2);
    expect(debate.status).toBe('live');
    expect(debate.turns.length).toBeGreaterThan(0); // Topic turn
  });

  it('saves and retrieves debates', () => {
    const debate = createDebateInstance({
      topic: 'Test',
      mode: 'balanced',
      agents: [
        { role: 'Advocate', style: 'data-driven', model: 'test', provider: 'Test' },
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

    const store = getDebateStore();
    const retrieved = store.get(debate.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.topic).toBe('Test');
  });

  it('parseDebatesJson returns valid debates only', () => {
    const raw = JSON.stringify([
      { id: 'a', topic: 't', turns: [], agents: [] },
      { notid: true },
      'bad',
    ]);
    const parsed = parseDebatesJson(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('a');
  });

  it('parseDebatesJson returns empty on invalid JSON', () => {
    expect(parseDebatesJson('')).toEqual([]);
    expect(parseDebatesJson('not json')).toEqual([]);
    expect(parseDebatesJson('{}')).toEqual([]);
  });

  it('flushPendingWrites resolves after persistence', async () => {
    const debate = createDebateInstance({
      topic: 'Flush',
      mode: 'balanced',
      agents: [
        { role: 'Advocate', style: 'data-driven', model: 'test', provider: 'Test' },
        { role: 'Skeptic', style: 'philosophical', model: 'test', provider: 'Test' },
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
    const store = getDebateStore();
    await store.flushPendingWrites();
    expect(store.get(debate.id)).toBeDefined();
  });

  it('deletes debates', () => {
    const debate = createDebateInstance({
      topic: 'Test',
      mode: 'balanced',
      agents: [
        { role: 'Advocate', style: 'data-driven', model: 'test', provider: 'Test' },
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

    const store = getDebateStore();
    expect(store.delete(debate.id)).toBe(true);
    expect(store.get(debate.id)).toBeUndefined();
  });
});
