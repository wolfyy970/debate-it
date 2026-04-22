import { describe, it, expect } from 'vitest';
import { getNextPhase, getNextAgent, generateId } from '../../server/lib/store';

describe('phase transitions', () => {
  describe('getNextPhase', () => {
    it('advances from Opening to Cross-Ex', () => {
      expect(getNextPhase('Opening', 1, 2)).toBe('Cross-Ex');
    });

    it('advances from Cross-Ex to Rebuttal', () => {
      expect(getNextPhase('Cross-Ex', 1, 2)).toBe('Rebuttal');
    });

    it('advances from Rebuttal back to Opening when rounds remain', () => {
      expect(getNextPhase('Rebuttal', 1, 4)).toBe('Opening');
    });

    it('advances from Rebuttal to Final when rounds exhausted', () => {
      expect(getNextPhase('Rebuttal', 4, 4)).toBe('Final');
    });

    it('advances from Final to Synthesis', () => {
      expect(getNextPhase('Final', 4, 4)).toBe('Synthesis');
    });
  });

  describe('getNextAgent', () => {
    it('returns Advocate as first agent', () => {
      const debate = {
        turns: [],
        agents: [
          { id: '1', role: 'Advocate' as const, style: 'analytical', model: 'test', provider: 'test' },
          { id: '2', role: 'Skeptic' as const, style: 'data-driven', model: 'test', provider: 'test' },
        ],
      };

      const agent = getNextAgent(debate as any);
      expect(agent.role).toBe('Advocate');
    });

    it('alternates from Advocate to Skeptic', () => {
      const debate = {
        turns: [
          { id: '1', n: 1, role: 'Advocate' as const, phase: 'Opening' as const, text: 'test', timestamp: new Date().toISOString() },
        ],
        agents: [
          { id: '1', role: 'Advocate' as const, style: 'analytical', model: 'test', provider: 'test' },
          { id: '2', role: 'Skeptic' as const, style: 'data-driven', model: 'test', provider: 'test' },
        ],
      };

      const agent = getNextAgent(debate as any);
      expect(agent.role).toBe('Skeptic');
    });

    it('alternates from Skeptic back to Advocate', () => {
      const debate = {
        turns: [
          { id: '1', n: 1, role: 'Advocate' as const, phase: 'Opening' as const, text: 'test', timestamp: new Date().toISOString() },
          { id: '2', n: 2, role: 'Skeptic' as const, phase: 'Opening' as const, text: 'test', timestamp: new Date().toISOString() },
        ],
        agents: [
          { id: '1', role: 'Advocate' as const, style: 'analytical', model: 'test', provider: 'test' },
          { id: '2', role: 'Skeptic' as const, style: 'data-driven', model: 'test', provider: 'test' },
        ],
      };

      const agent = getNextAgent(debate as any);
      expect(agent.role).toBe('Advocate');
    });
  });

  describe('generateId', () => {
    it('generates unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('generates IDs with reasonable length', () => {
      const id = generateId();
      expect(id.length).toBeGreaterThan(8);
    });
  });
});
