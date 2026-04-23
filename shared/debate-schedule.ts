import type { Phase } from './domain';

/** Shape shared by client `DebateStructure` and server `Debate.structure`. */
export interface DebateScheduleStructure {
  rounds: number;
  turnCap: number;
  crossExAfterRound: number;
  /** When `false`, Cross-Ex is omitted regardless of `crossExAfterRound`. */
  crossExEnabled?: boolean;
  synthesisType?: 'judge' | 'judge+system';
}

export interface ScheduleSegment {
  phase: Phase;
  label: string;
  /** Debate round this segment belongs to (1..R). */
  round: number;
  speakers: ('Advocate' | 'Skeptic' | 'Judge')[];
}

export interface AgentStep {
  phase: Phase;
  round: number;
  segmentIndex: number;
  role: 'Advocate' | 'Skeptic';
}

export const ESTIMATE_AGENT_TURN_SECONDS = 30;
export const ESTIMATE_SYNTHESIS_SECONDS = 45;

/** Canonical segment list for a debate (includes terminal Synthesis segment). */
export function buildSchedule(structure: DebateScheduleStructure): ScheduleSegment[] {
  const R = Math.max(2, Math.floor(structure.rounds) || 2);
  const rebuttalCount = Math.max(0, R - 2);

  const crossOn =
    structure.crossExEnabled !== false &&
    structure.crossExAfterRound >= 1 &&
    structure.crossExAfterRound <= R - 1;

  const ce = crossOn
    ? Math.min(Math.max(1, Math.floor(structure.crossExAfterRound)), R - 1)
    : -1;

  const segments: ScheduleSegment[] = [];

  segments.push({
    phase: 'Opening',
    label: 'Opening',
    round: 1,
    speakers: ['Advocate', 'Skeptic'],
  });

  if (crossOn && ce === 1) {
    segments.push({
      phase: 'Cross-Ex',
      label: 'Cross-Ex',
      round: 1,
      speakers: ['Advocate', 'Skeptic'],
    });
  }

  for (let r = 2; r < R; r++) {
    const label = rebuttalCount === 1 ? 'Rebuttal' : `Rebuttal ${r - 1}`;
    segments.push({
      phase: 'Rebuttal',
      label,
      round: r,
      speakers: ['Advocate', 'Skeptic'],
    });
    if (crossOn && ce === r) {
      segments.push({
        phase: 'Cross-Ex',
        label: 'Cross-Ex',
        round: r,
        speakers: ['Advocate', 'Skeptic'],
      });
    }
  }

  segments.push({
    phase: 'Final',
    label: 'Final',
    round: R,
    speakers: ['Advocate', 'Skeptic'],
  });

  segments.push({
    phase: 'Synthesis',
    label: 'Synthesis',
    round: R,
    speakers: ['Judge'],
  });

  return segments;
}

/** Advocate + Skeptic turns only (excludes Judge synthesis segment). */
export function countAgentTurns(segments: ScheduleSegment[]): number {
  return segments.reduce((acc, s) => {
    if (s.phase === 'Synthesis') return acc;
    return acc + s.speakers.filter((sp) => sp !== 'Judge').length;
  }, 0);
}

/** Ordered steps for `/next` queue (Advocate/Skeptic only). */
export function flattenAgentSteps(segments: ScheduleSegment[]): AgentStep[] {
  const steps: AgentStep[] = [];
  segments.forEach((seg, segmentIndex) => {
    if (seg.phase === 'Synthesis') return;
    for (const role of seg.speakers) {
      if (role === 'Judge') continue;
      steps.push({ phase: seg.phase, round: seg.round, segmentIndex, role });
    }
  });
  return steps;
}

export function countCommittedAgentTurns(
  turns: { meta?: boolean; role: string }[],
): number {
  return turns.filter(
    (t) => !t.meta && (t.role === 'Advocate' || t.role === 'Skeptic'),
  ).length;
}

/** Max agent turns allowed before hard stop (`turnCap` truncates schedule). */
export function maxCommittedAgentTurns(structure: DebateScheduleStructure): number {
  const n = flattenAgentSteps(buildSchedule(structure)).length;
  const cap = Math.max(0, Math.floor(structure.turnCap));
  return Math.min(n, cap);
}

export function estimateDebateDurationSeconds(structure: DebateScheduleStructure): number {
  const agentTurns = countAgentTurns(buildSchedule(structure));
  return agentTurns * ESTIMATE_AGENT_TURN_SECONDS + ESTIMATE_SYNTHESIS_SECONDS;
}

export function formatScheduleEstimateFooter(structure: DebateScheduleStructure): string {
  const segments = buildSchedule(structure);
  const agentTurns = countAgentTurns(segments);
  const seconds = estimateDebateDurationSeconds(structure);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `≈ ${minutes}:${String(secs).padStart(2, '0')} · ${agentTurns} agent turns + synthesis`;
}

/** Which schedule pill is active (for `PhaseStrip`). */
export function activeScheduleSegmentIndex(
  structure: DebateScheduleStructure,
  turns: { meta?: boolean; role: string }[],
  status: string,
  phase: Phase,
): number {
  const segments = buildSchedule(structure);
  const steps = flattenAgentSteps(segments);
  const committed = countCommittedAgentTurns(turns);
  const cap = maxCommittedAgentTurns(structure);
  if (status === 'complete' || phase === 'Synthesis') {
    return Math.max(0, segments.length - 1);
  }
  if (committed >= cap) {
    return Math.max(0, segments.length - 1);
  }
  if (committed >= steps.length) {
    return Math.max(0, segments.length - 1);
  }
  return steps[committed].segmentIndex;
}
