import type { Agent, Debate, Turn } from './store';
import {
  buildSchedule,
  flattenAgentSteps,
  countCommittedAgentTurns,
  maxCommittedAgentTurns,
} from '../../shared/debate-schedule';

/** State after an agent turn is appended (mirrors turn commit in `GenerationQueue.runAgent`). */
export interface PhaseRoundStatus {
  phase: Debate['phase'];
  round: number;
  status: Debate['status'];
}

/**
 * Production phase/round transition after a completed agent turn is saved.
 * Must stay aligned with `server/lib/generation-queue.ts` turn commit.
 */
export function computePhaseAfterTurnCompletion(input: {
  totalRounds: number;
  committedAgentTurnsAfterPush: number;
  structure: Debate['structure'];
}): PhaseRoundStatus {
  const structure = input.structure;
  const R = Math.max(2, structure.rounds || input.totalRounds);
  const committed = input.committedAgentTurnsAfterPush;
  const cap = maxCommittedAgentTurns(structure);
  const steps = flattenAgentSteps(buildSchedule(structure));

  if (committed >= cap) {
    return { phase: 'Synthesis', round: R, status: 'complete' };
  }

  const next = steps[committed];
  return { phase: next.phase, round: next.round, status: 'live' };
}

/** Recompute `phase`, `round`, and `status` from current turns (e.g. after retry pop). */
export function syncDebatePhaseFromTurns(debate: Debate): void {
  const committed = countCommittedAgentTurns(debate.turns);
  const pr = computePhaseAfterTurnCompletion({
    totalRounds: debate.totalRounds,
    committedAgentTurnsAfterPush: committed,
    structure: debate.structure,
  });
  debate.phase = pr.phase;
  debate.round = pr.round;
  debate.status = pr.status;
}

/**
 * Which role speaks next when queueing `/next` — driven by the canonical schedule.
 */
export function resolveNextSpeakingRoleFromSchedule(debate: Debate): 'Advocate' | 'Skeptic' {
  const steps = flattenAgentSteps(buildSchedule(debate.structure));
  const committed = countCommittedAgentTurns(debate.turns);
  const cap = maxCommittedAgentTurns(debate.structure);
  if (committed >= cap) {
    return steps[steps.length - 1]?.role ?? 'Advocate';
  }
  return steps[committed]?.role ?? 'Advocate';
}

/** @deprecated Prefer `resolveNextSpeakingRoleFromSchedule` */
export function resolveNextSpeakingRole(turns: Pick<Turn, 'role'>[]): 'Advocate' | 'Skeptic' {
  if (turns.length === 0) return 'Advocate';
  const lastRole = turns[turns.length - 1].role;
  return lastRole === 'Advocate' ? 'Skeptic' : 'Advocate';
}

export function resolveNextAgentForTurn(debate: Debate): Agent {
  const nextRole = resolveNextSpeakingRoleFromSchedule(debate);
  return debate.agents.find((a) => a.role === nextRole) || debate.agents[0];
}

export { countCommittedAgentTurns, buildSchedule, flattenAgentSteps, maxCommittedAgentTurns };
