import type { AgentRole } from '../types';

const ROLE_COLOR_VARS: Record<AgentRole, string> = {
  Advocate: 'var(--advocate)',
  Skeptic: 'var(--skeptic)',
  Judge: 'var(--judge)',
  'Fact-checker': 'var(--factcheck)',
  Moderator: 'var(--ink-700)',
};

/** CSS `var(--…)` token for debate role accents (Byline, Setup, LiveDebate). */
export function getRoleColorToken(role: AgentRole): string {
  return ROLE_COLOR_VARS[role] ?? 'var(--ink-700)';
}
