import { describe, it, expect } from 'vitest';
import {
  buildSynthesisUserContent,
  parseSynthesisJsonFromModelText,
  generateFallbackSynthesis,
} from '../../server/lib/synthesis';
import type { Debate, Turn } from '../../server/lib/store';

const baseTurn = (overrides: Partial<Turn> & Pick<Turn, 'role' | 'n' | 'text'>): Turn => ({
  id: 'id',
  phase: 'Opening',
  timestamp: '',
  ...overrides,
});

describe('synthesis helpers', () => {
  it('buildSynthesisUserContent truncates long turns at 500 chars', () => {
    const long = 'a'.repeat(600);
    const debate = {
      topic: 'Topic',
      turns: [baseTurn({ role: 'Advocate', n: 1, text: long })],
    } as Debate;
    const content = buildSynthesisUserContent(debate);
    expect(content).toContain('...');
    expect(content.length).toBeLessThan(long.length + 200);
  });

  it('parseSynthesisJsonFromModelText extracts JSON object', () => {
    const text = 'Here you go:\n{"summary":"S","keyArguments":{"advocate":[],"skeptic":[]},"pointsOfAgreement":[],"pointsOfDisagreement":[],"unresolvedQuestions":[]}';
    const parsed = parseSynthesisJsonFromModelText(text);
    expect(parsed.summary).toBe('S');
  });

  it('generateFallbackSynthesis shapes advocate and skeptic snippets', () => {
    const debate = {
      turns: [
        baseTurn({ role: 'Advocate', n: 1, text: 'x'.repeat(200) }),
        baseTurn({ role: 'Skeptic', n: 2, text: 'y'.repeat(200) }),
      ],
    } as Debate;
    const fb = generateFallbackSynthesis(debate);
    expect(fb.keyArguments.advocate[0]).toMatch(/^x+\.\.\.$/);
    expect(fb.keyArguments.skeptic[0]).toMatch(/^y+\.\.\.$/);
  });
});
