import { describe, it, expect } from 'vitest';
import { getRoleColorToken } from '../theme/roleColors';

describe('getRoleColorToken', () => {
  it('returns advocate token', () => {
    expect(getRoleColorToken('Advocate')).toBe('var(--advocate)');
  });

  it('falls back for unexpected role at type boundary', () => {
    expect(getRoleColorToken('Judge')).toBe('var(--judge)');
  });
});
