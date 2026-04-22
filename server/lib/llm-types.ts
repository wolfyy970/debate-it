import type { ToolCall } from './tools';

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface StreamEvent {
  type: 'text_delta' | 'tool_call_start' | 'tool_call_delta' | 'tool_call_end' | 'reasoning' | 'done' | 'error';
  data?: string;
  toolCall?: ToolCall;
  stopReason?: string;
}
