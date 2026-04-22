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

describe('computePhaseAfterTurnCompletion (production SSE rules)', () => {
  it('moves Opening to Cross-Ex when turn count after push is even', () => {
    expect(
      computePhaseAfterTurnCompletion({
        phase: 'Opening',
        round: 1,
        totalRounds: 4,
        turnsLengthAfterPush: 2,
        status: 'live',
      })
    ).toEqual({ phase: 'Cross-Ex', round: 1, status: 'live' });
  });

  it('leaves Opening when turn count after push is odd', () => {
    expect(
      computePhaseAfterTurnCompletion({
        phase: 'Opening',
        round: 1,
        totalRounds: 4,
        turnsLengthAfterPush: 3,
        status: 'live',
      })
    ).toEqual({ phase: 'Opening', round: 1, status: 'live' });
  });

  it('increments round and returns Opening when Cross-Ex block completes within total rounds', () => {
    expect(
      computePhaseAfterTurnCompletion({
        phase: 'Cross-Ex',
        round: 1,
        totalRounds: 4,
        turnsLengthAfterPush: 4,
        status: 'live',
      })
    ).toEqual({ phase: 'Opening', round: 2, status: 'live' });
  });

  it('moves to Final when Cross-Ex block completes and next round exceeds totalRounds', () => {
    expect(
      computePhaseAfterTurnCompletion({
        phase: 'Cross-Ex',
        round: 4,
        totalRounds: 4,
        turnsLengthAfterPush: 8,
        status: 'live',
      })
    ).toEqual({ phase: 'Final', round: 5, status: 'live' });
  });

  it('leaves Cross-Ex when turn count is not divisible by 4', () => {
    expect(
      computePhaseAfterTurnCompletion({
        phase: 'Cross-Ex',
        round: 1,
        totalRounds: 4,
        turnsLengthAfterPush: 5,
        status: 'live',
      })
    ).toEqual({ phase: 'Cross-Ex', round: 1, status: 'live' });
  });

  it('completes debate after Final phase turn', () => {
    expect(
      computePhaseAfterTurnCompletion({
        phase: 'Final',
        round: 5,
        totalRounds: 4,
        turnsLengthAfterPush: 9,
        status: 'live',
      })
    ).toEqual({ phase: 'Synthesis', round: 5, status: 'complete' });
  });
});

describe('resolveNextSpeakingRole', () => {
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
  it('returns Advocate first', () => {
    const debate = minimalDebate({
      turns: [],
      agents: [
        { id: '1', role: 'Advocate', style: 'a', model: 'm', provider: 'p' },
        { id: '2', role: 'Skeptic', style: 's', model: 'm', provider: 'p' },
      ],
    });
    expect(resolveNextAgentForTurn(debate).role).toBe('Advocate');
  });

  it('returns Skeptic after Advocate', () => {
    const debate = minimalDebate({
      turns: [
        {
          id: 't1',
          n: 1,
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

describe('crossExAfterRound (advisory)', () => {
  it('computePhaseAfterTurnCompletion does not accept structure; Cross-Ex block is always len % 4 === 0', () => {
    expect(
      computePhaseAfterTurnCompletion({
        phase: 'Cross-Ex',
        round: 1,
        totalRounds: 4,
        turnsLengthAfterPush: 4,
        status: 'live',
      }),
    ).toEqual({ phase: 'Opening', round: 2, status: 'live' });
  });
});
