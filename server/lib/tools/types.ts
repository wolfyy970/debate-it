import type { Source } from '../store';

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean';
  description: string;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  required?: string[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  content: string;
  isError: boolean;
  /** Populated for `search_web` on success (structured; no regex re-parse). */
  sources?: Source[];
  /** Populated when `isError` and the failure is categorized (e.g. `search_timeout`). */
  errorCode?: string;
}

export type ToolExecutor = (args: Record<string, unknown>) => Promise<string>;
