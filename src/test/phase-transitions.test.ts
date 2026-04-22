import { describe, it, expect } from 'vitest';
import { generateId } from '../../server/lib/store';

describe('generateId', () => {
  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId('x'));
    }
    expect(ids.size).toBe(100);
  });

  it('generates prefixed UUID-style IDs', () => {
    expect(generateId('turn')).toMatch(/^turn-[0-9a-f-]{36}$/i);
    expect(generateId('debate')).toMatch(/^debate-[0-9a-f-]{36}$/i);
    expect(generateId()).toMatch(/^id-[0-9a-f-]{36}$/i);
  });
});
