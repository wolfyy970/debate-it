import type { Source } from '../shared/domain';
export type { Source };

export type AgentRole = 'Advocate' | 'Skeptic' | 'Judge' | 'Fact-checker' | 'Moderator';
export type AgentStyle = 'analytical' | 'emotional' | 'data-driven' | 'philosophical';
export type DebateMode = 'balanced' | 'adversarial' | 'decision' | 'educational' | 'devils-advocate';
export type Phase = 'Opening' | 'Cross-Ex' | 'Rebuttal' | 'Final' | 'Synthesis';

export interface Agent {
  id: string;
  role: AgentRole;
  style: AgentStyle;
  model: string;
  provider: string;
}

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
  /** ISO string from API / SSE (JSON has no Date type). */
  timestamp: string;
  isModerator?: boolean;
  flagged?: boolean;
  strong?: string[];
  meta?: boolean;
}

export interface Debate {
  id: string;
  topic: string;
  mode: DebateMode;
  agents: Agent[];
  phase: Phase;
  round: number;
  totalRounds: number;
  turns: Turn[];
  toggles: DebateToggles;
  structure: DebateStructure;
  status: 'draft' | 'live' | 'paused' | 'complete';
  createdAt: Date;
}

export interface DebateToggles {
  factChecking: boolean;
  forceSteelmanning: boolean;
  requireVerdict: boolean;
  scoring: boolean;
}

export interface DebateStructure {
  rounds: number;
  turnCap: number;
  /**
   * Shown in setup UI as “after round N”. Phase math in `server/lib/debate-phase.ts` currently
   * uses fixed Opening/Cross-Ex lengths (2 + 4 turns per macro-round); this field is advisory until wired.
   */
  crossExAfterRound: number;
  synthesisType: 'judge' | 'judge+system';
}

export interface CreateDebateRequest {
  topic: string;
  mode: DebateMode;
  agents: {
    role: AgentRole;
    model: string;
    style: AgentStyle;
    provider: string;
  }[];
  toggles: DebateToggles;
  structure: DebateStructure;
}

export interface ModelOption {
  provider: string;
  family: string;
  models: string[];
}

export const MODEL_ROSTER: ModelOption[] = [
  { provider: 'Anthropic', family: 'Claude', models: ['anthropic/claude-opus-4', 'anthropic/claude-sonnet-4', 'anthropic/claude-opus-4.5', 'anthropic/claude-sonnet-4.5'] },
  { provider: 'OpenAI', family: 'GPT', models: ['openai/gpt-5', 'openai/gpt-5-pro', 'openai/gpt-5-mini', 'openai/o3-pro', 'openai/gpt-5.1', 'openai/gpt-5.2', 'openai/gpt-5.3-codex', 'openai/gpt-5.4'] },
  { provider: 'Google', family: 'Gemini', models: ['google/gemini-2.5-pro', 'google/gemini-2.5-pro-preview', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite', 'google/gemini-3.1-pro-preview', 'google/gemini-3.1-flash-image-preview'] },
  { provider: 'xAI', family: 'Grok', models: ['x-ai/grok-4', 'x-ai/grok-3', 'x-ai/grok-3-mini', 'x-ai/grok-4-fast'] },
  { provider: 'DeepSeek', family: 'DeepSeek', models: ['deepseek/deepseek-r1-0528', 'deepseek/deepseek-v3.2', 'deepseek/deepseek-chat-v3.1'] },
  { provider: 'Mistral', family: 'Mistral', models: ['mistralai/mistral-medium-3', 'mistralai/mistral-small-3.2-24b-instruct', 'mistralai/devstral-medium', 'mistralai/devstral-small', 'mistralai/mistral-large-2512'] },
  { provider: 'Qwen', family: 'Qwen', models: ['qwen/qwen3-235b-a22b-2507', 'qwen/qwen3-235b-a22b-thinking-2507', 'qwen/qwen3-coder', 'qwen/qwen3-30b-a3b', 'qwen/qwen3-14b', 'qwen/qwen3.6-plus'] },
  { provider: 'Moonshot', family: 'Kimi', models: ['moonshotai/kimi-k2', 'moonshotai/kimi-k2-thinking', 'moonshotai/kimi-k2.5', 'moonshotai/kimi-k2.6'] },
];

export const DEBATE_MODES: { name: string; description: string; key: DebateMode }[] = [
  { name: 'Balanced Analysis', description: 'Structured rounds, neutral tone, ends with synthesis.', key: 'balanced' },
  { name: 'Adversarial Debate', description: 'Strong opposition, emphasis on critique, no forced agreement.', key: 'adversarial' },
  { name: 'Decision Mode', description: 'Focused on choosing. Judge issues a recommendation.', key: 'decision' },
  { name: 'Educational Mode', description: 'Slower pacing, concepts explained, beginner-friendly.', key: 'educational' },
  { name: "Devil's Advocate", description: 'One agent pushes extreme counterarguments.', key: 'devils-advocate' },
];

export const PHASES: Phase[] = ['Opening', 'Cross-Ex', 'Rebuttal', 'Final', 'Synthesis'];

export const AGENT_STYLES: AgentStyle[] = ['analytical', 'emotional', 'data-driven', 'philosophical'];