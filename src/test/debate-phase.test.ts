import { describe, it, expect } from 'vitest';
import {
  computePhaseAfterTurnCompletion,
  resolveNextSpeakingRole,
  resolveNextAgentForTurn,
} from '../../server/lib/debate-phase';
import type { Debate } from '../../server/lib/store';

function minimalDebate(overrides: Partial<Debate> & Pick<Debate, 'turns' | 'agents'>): Debate {
  return {
    id: 'd1',
    topic: 't',
    mode: 'balanced',
    phase: 'Opening',
    round: 1,
    totalRounds: 4,
    toggles: {
      factChecking: false,
      forceSteelmanning: false,
      requireVerdict: false,
      scoring: false,
    },
    structure: { rounds: 4, turnCap: 500, crossExAfterRound: 2, synthesisType: 'judge+system' },
    status: 'live',
    createdAt: '',
    currentAgentIndex: 0,
    ...overrides,
  } as Debate;
}

describe('computePhaseAfterTurnCompletion (schedule-driven)', () => {
  it('stays Opening round 1 after first Advocate (R=2, no cross)', () => {
    expect(
      computePhaseAfterTurnCompletion({
        totalRounds: 2,
        committedAgentTurnsAfterPush: 1,
        structure: { rounds: 2, turnCap: 500, crossExAfterRound: 1, crossExEnabled: false, synthesisType: 'judge' },
      }),
    ).toEqual({ phase: 'Opening', round: 1, status: 'live' });
  });

  it('moves to Final after Opening pair when R=2, no cross', () => {
    expect(
      computePhaseAfterTurnCompletion({
        totalRounds: 2,
        committedAgentTurnsAfterPush: 2,
        structure: { rounds: 2, turnCap: 500, crossExAfterRound: 1, crossExEnabled: false, synthesisType: 'judge' },
      }),
    ).toEqual({ phase: 'Final', round: 2, status: 'live' });
  });

  it('enters Cross-Ex after Opening pair when R=2, cross after 1', () => {
    expect(
      computePhaseAfterTurnCompletion({
        totalRounds: 2,
        committedAgentTurnsAfterPush: 2,
        structure: { rounds: 2, turnCap: 500, crossExAfterRound: 1, crossExEnabled: true, synthesisType: 'judge' },
      }),
    ).toEqual({ phase: 'Cross-Ex', round: 1, status: 'live' });
  });

  it('completes after all agent steps', () => {
    const structure = { rounds: 2, turnCap: 500, crossExEnabled: false, crossExAfterRound: 1, synthesisType: 'judge' as const };
    expect(
      computePhaseAfterTurnCompletion({
        totalRounds: 2,
        committedAgentTurnsAfterPush: 4,
        structure,
      }),
    ).toEqual({ phase: 'Synthesis', round: 2, status: 'complete' });
  });

  it('respects turnCap below schedule length', () => {
    const structure = { rounds: 2, turnCap: 2, crossExEnabled: false, crossExAfterRound: 1, synthesisType: 'judge' as const };
    expect(
      computePhaseAfterTurnCompletion({
        totalRounds: 2,
        committedAgentTurnsAfterPush: 2,
        structure,
      }),
    ).toEqual({ phase: 'Synthesis', round: 2, status: 'complete' });
  });
});

describe('resolveNextSpeakingRole (legacy alternation)', () => {
  it('starts with Advocate', () => {
    expect(resolveNextSpeakingRole([])).toBe('Advocate');
  });

  it('alternates Advocate to Skeptic', () => {
    expect(resolveNextSpeakingRole([{ role: 'Advocate' }])).toBe('Skeptic');
  });

  it('alternates Skeptic to Advocate', () => {
    expect(resolveNextSpeakingRole([{ role: 'Advocate' }, { role: 'Skeptic' }])).toBe('Advocate');
  });

  it('after Moderator uses Advocate', () => {
    expect(resolveNextSpeakingRole([{ role: 'Moderator' }])).toBe('Advocate');
  });
});

describe('resolveNextAgentForTurn', () => {
  it('returns Advocate first (topic meta turn ignored by schedule)', () => {
    const debate = minimalDebate({
      totalRounds: 2,
      structure: { rounds: 2, turnCap: 500, crossExEnabled: false, crossExAfterRound: 1, synthesisType: 'judge' },
      turns: [
        {
          id: 't0',
          n: 1,
          role: 'Moderator',
          phase: 'Opening',
          text: 'topic',
          timestamp: '',
          meta: true,
        },
      ],
      agents: [
        { id: '1', role: 'Advocate', style: 'a', model: 'm', provider: 'p' },
        { id: '2', role: 'Skeptic', style: 's', model: 'm', provider: 'p' },
      ],
    });
    expect(resolveNextAgentForTurn(debate).role).toBe('Advocate');
  });

  it('returns Skeptic after Advocate', () => {
    const debate = minimalDebate({
      totalRounds: 2,
      structure: { rounds: 2, turnCap: 500, crossExEnabled: false, crossExAfterRound: 1, synthesisType: 'judge' },
      turns: [
        {
          id: 't1',
          n: 2,
          role: 'Advocate',
          phase: 'Opening',
          text: 'x',
          timestamp: '',
        },
      ],
      agents: [
        { id: '1', role: 'Advocate', style: 'a', model: 'm', provider: 'p' },
        { id: '2', role: 'Skeptic', style: 's', model: 'm', provider: 'p' },
      ],
    });
    expect(resolveNextAgentForTurn(debate).role).toBe('Skeptic');
  });
});
