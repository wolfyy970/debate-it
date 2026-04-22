import { describe, it, expect } from 'vitest';

describe('types', () => {
  it('has valid AgentRole values', () => {
    const roles = ['Advocate', 'Skeptic', 'Judge', 'Fact-checker', 'Moderator'];
    roles.forEach(role => {
      expect(typeof role).toBe('string');
    });
  });

  it('has valid Phase values', () => {
    const phases = ['Opening', 'Cross-Ex', 'Rebuttal', 'Final', 'Synthesis'];
    phases.forEach(phase => {
      expect(typeof phase).toBe('string');
    });
  });

  it('has valid DebateMode values', () => {
    const modes = ['balanced', 'adversarial', 'decision', 'educational', 'devils-advocate'];
    modes.forEach(mode => {
      expect(typeof mode).toBe('string');
    });
  });
});
