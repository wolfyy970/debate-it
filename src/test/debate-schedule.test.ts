import { describe, it, expect } from 'vitest';
import {
  buildSchedule,
  countAgentTurns,
  flattenAgentSteps,
  maxCommittedAgentTurns,
  activeScheduleSegmentIndex,
} from '../lib/debateSchedule';
import type { DebateScheduleStructure } from '../lib/debateSchedule';

function s(p: Partial<DebateScheduleStructure>): DebateScheduleStructure {
  return {
    rounds: 4,
    turnCap: 1_000_000,
    crossExAfterRound: 2,
    crossExEnabled: true,
    synthesisType: 'judge',
    ...p,
  };
}

describe('buildSchedule', () => {
  it('R=2, cross after 1: Opening, Cross-Ex, Final, Synthesis', () => {
    const segs = buildSchedule(s({ rounds: 2, crossExAfterRound: 1, crossExEnabled: true }));
    expect(segs.map((x) => x.label)).toEqual(['Opening', 'Cross-Ex', 'Final', 'Synthesis']);
    expect(countAgentTurns(segs)).toBe(6);
  });

  it('R=2, cross off: Opening, Final, Synthesis', () => {
    const segs = buildSchedule(s({ rounds: 2, crossExEnabled: false }));
    expect(segs.map((x) => x.label)).toEqual(['Opening', 'Final', 'Synthesis']);
    expect(countAgentTurns(segs)).toBe(4);
  });

  it('R=3, cross after 2: Opening, Rebuttal, Cross-Ex, Final, Synthesis', () => {
    const segs = buildSchedule(s({ rounds: 3, crossExAfterRound: 2 }));
    expect(segs.map((x) => x.label)).toEqual(['Opening', 'Rebuttal', 'Cross-Ex', 'Final', 'Synthesis']);
    expect(countAgentTurns(segs)).toBe(8);
  });

  it('R=5, cross after 3: matches planned ordering', () => {
    const segs = buildSchedule(s({ rounds: 5, crossExAfterRound: 3 }));
    expect(segs.map((x) => x.label)).toEqual([
      'Opening',
      'Rebuttal 1',
      'Rebuttal 2',
      'Cross-Ex',
      'Rebuttal 3',
      'Final',
      'Synthesis',
    ]);
    expect(countAgentTurns(segs)).toBe(12);
  });

  it('R=8 uses numbered Rebuttals', () => {
    const segs = buildSchedule(s({ rounds: 8, crossExAfterRound: 4 }));
    const rebuttalLabels = segs.filter((x) => x.phase === 'Rebuttal').map((x) => x.label);
    expect(rebuttalLabels[0]).toBe('Rebuttal 1');
    expect(rebuttalLabels.length).toBe(6);
  });
});

describe('flattenAgentSteps + maxCommittedAgentTurns', () => {
  it('turnCap truncates max committed turns', () => {
    const structure = s({ rounds: 2, crossExEnabled: false, turnCap: 3 });
    const steps = flattenAgentSteps(buildSchedule(structure));
    expect(steps.length).toBe(4);
    expect(maxCommittedAgentTurns(structure)).toBe(3);
  });
});

describe('activeScheduleSegmentIndex', () => {
  it('highlights first segment before any agent turn', () => {
    const structure = s({ rounds: 2, crossExEnabled: false });
    const turns = [{ role: 'Moderator', meta: true }];
    expect(activeScheduleSegmentIndex(structure, turns, 'live', 'Opening')).toBe(0);
  });

  it('highlights synthesis segment when complete', () => {
    const structure = s({ rounds: 2, crossExEnabled: false });
    const segs = buildSchedule(structure);
    expect(
      activeScheduleSegmentIndex(structure, [], 'complete', 'Synthesis'),
    ).toBe(segs.length - 1);
  });
});
