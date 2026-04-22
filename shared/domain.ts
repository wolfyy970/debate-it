/**
 * JSON-shaped debate entities (no Node APIs). Kept aligned with `server/lib/store.ts`
 * for documentation; the app client still uses `src/types.ts` for UI-specific unions.
 */

export interface Source {
  title: string;
  url: string;
  snippet?: string;
}

export type AgentRole =
  | 'Advocate'
  | 'Skeptic'
  | 'Judge'
  | 'Fact-checker'
  | 'Moderator';

export interface Agent {
  id: string;
  role: AgentRole;
  style: string;
  model: string;
  provider: string;
}

export type Phase = 'Opening' | 'Cross-Ex' | 'Rebuttal' | 'Final' | 'Synthesis';

export interface Turn {
  id: string;
  n: number;
  role: AgentRole;
  style?: string;
  model?: string;
  phase: Phase;
  text: string;
  reasoning?: string;
  sources?: Source[];
  timestamp: string;
  isModerator?: boolean;
  flagged?: boolean;
  strong?: string[];
  meta?: boolean;
}
