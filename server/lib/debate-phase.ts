import type { Agent, Debate, Turn } from './store';

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
  phase: Debate['phase'];
  round: number;
  totalRounds: number;
  turnsLengthAfterPush: number;
  status: Debate['status'];
}): PhaseRoundStatus {
  const { phase, round, totalRounds, turnsLengthAfterPush: len, status } = input;

  if (phase === 'Opening' && len % 2 === 0) {
    return { phase: 'Cross-Ex', round, status };
  }
  // Fixed four Cross-Ex turns per macro-round (Adv/Skept ×2 each). `Debate.structure.crossExAfterRound` in the DB is advisory until wired here.
  if (phase === 'Cross-Ex' && len % 4 === 0) {
    const nextRound = round + 1;
    if (nextRound > totalRounds) {
      return { phase: 'Final', round: nextRound, status };
    }
    return { phase: 'Opening', round: nextRound, status };
  }
  if (phase === 'Final') {
    return { phase: 'Synthesis', round, status: 'complete' };
  }
  return { phase, round, status };
}

/**
 * Which role speaks next when queueing `/next` (Advocate first, then alternates).
 * Must stay aligned with `server/routes/debates.ts` POST `/:id/next`.
 */
export function resolveNextSpeakingRole(turns: Pick<Turn, 'role'>[]): 'Advocate' | 'Skeptic' {
  if (turns.length === 0) return 'Advocate';
  const lastRole = turns[turns.length - 1].role;
  return lastRole === 'Advocate' ? 'Skeptic' : 'Advocate';
}

export function resolveNextAgentForTurn(debate: Debate): Agent {
  const nextRole = resolveNextSpeakingRole(debate.turns);
  return debate.agents.find((a) => a.role === nextRole) || debate.agents[0];
}
