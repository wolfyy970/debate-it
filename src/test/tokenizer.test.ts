import { describe, it, expect } from 'vitest';
import { countTokens } from '../../server/lib/tokenizer';

describe('tokenizer', () => {
  it('counts tokens for English text', () => {
    const text = 'Hello world';
    const count = countTokens(text, 'openai/gpt-4');
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(10);
  });

  it('returns approximate count for unknown models', () => {
    const text = 'Hello world this is a test';
    const count = countTokens(text, 'unknown/model');
    expect(count).toBeGreaterThan(0);
  });

  it('handles empty string', () => {
    const count = countTokens('', 'openai/gpt-4');
    expect(count).toBe(0);
  });

  it('handles long text', () => {
    const text = 'Hello world '.repeat(100);
    const count = countTokens(text, 'openai/gpt-4');
    expect(count).toBeGreaterThan(100);
  });
});
