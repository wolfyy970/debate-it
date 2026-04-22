const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const KIMI_API_KEY = process.env.KIMI_API_KEY || '';

import type { ToolDefinition, ToolCall, ToolResult } from './tools';

interface Message {
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

function isKimiModel(model: string): boolean {
  return model.toLowerCase().includes('kimi') || model.toLowerCase().includes('moonshot');
}

function hasApiKey(): boolean {
  return !!(OPENROUTER_API_KEY || KIMI_API_KEY);
}

export function checkApiKeys(): { openrouter: boolean; kimi: boolean; hasAny: boolean } {
  return {
    openrouter: !!OPENROUTER_API_KEY,
    kimi: !!KIMI_API_KEY,
    hasAny: hasApiKey(),
  };
}

export function formatToolsForProvider(tools: ToolDefinition[]): any[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.entries(tool.parameters).reduce((acc, [key, param]) => {
          acc[key] = {
            type: param.type,
            description: param.description,
            ...(param.enum ? { enum: param.enum } : {}),
          };
          return acc;
        }, {} as Record<string, any>),
        required: tool.required || Object.keys(tool.parameters),
      },
    },
  }));
}

/**
 * Stream a response from the LLM with tool support.
 * 
 * This is the core streaming function. It yields events:
 * - text_delta: Regular text tokens
 * - tool_call_start: LLM started emitting a tool call
 * - tool_call_delta: More arguments for the tool call
 * - tool_call_end: Tool call is complete
 * - reasoning: Thinking/reasoning tokens (if model supports it)
 * - done: Stream complete (includes stopReason)
 */
export async function* streamWithTools(
  model: string,
  messages: Message[],
  tools?: ToolDefinition[]
): AsyncGenerator<StreamEvent> {
  if (!hasApiKey()) {
    throw new Error('No API keys configured. Set OPENROUTER_API_KEY or KIMI_API_KEY.');
  }

  // Route to appropriate provider
  if (isKimiModel(model) && KIMI_API_KEY) {
    yield* streamKimiWithTools(model, messages, tools);
  } else if (OPENROUTER_API_KEY) {
    yield* streamOpenRouterWithTools(model, messages, tools);
  } else if (KIMI_API_KEY) {
    yield* streamKimiWithTools(model, messages, tools);
  } else {
    throw new Error('No API keys configured. Set OPENROUTER_API_KEY or KIMI_API_KEY.');
  }
}

async function* streamOpenRouterWithTools(
  model: string,
  messages: Message[],
  tools?: ToolDefinition[]
): AsyncGenerator<StreamEvent> {
  const body: any = {
    model,
    messages: messages.map(m => {
      // Transform tool messages to OpenAI format
      if (m.role === 'tool') {
        return {
          role: 'tool',
          content: m.content,
          tool_call_id: m.tool_call_id,
        };
      }
      // Transform assistant messages with tool calls
      if (m.role === 'assistant' && m.tool_calls) {
        return {
          role: 'assistant',
          content: m.content,
          tool_calls: m.tool_calls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        };
      }
      return {
        role: m.role,
        content: m.content,
      };
    }),
    stream: true,
  };

  if (tools && tools.length > 0) {
    body.tools = formatToolsForProvider(tools);
    body.tool_choice = 'auto';
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Debater',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let currentToolCalls: Map<number, ToolCall> = new Map();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          const finishReason = parsed.choices?.[0]?.finish_reason;

          // Handle tool calls
          if (delta?.tool_calls) {
            for (const toolDelta of delta.tool_calls) {
              const index = toolDelta.index;
              
              if (!currentToolCalls.has(index)) {
                // New tool call starting
                const newToolCall: ToolCall = {
                  id: toolDelta.id || `call_${Date.now()}_${index}`,
                  name: toolDelta.function?.name || '',
                  arguments: {},
                };
                currentToolCalls.set(index, newToolCall);
                
                yield {
                  type: 'tool_call_start',
                  toolCall: newToolCall,
                };
              }
              
              const existingCall = currentToolCalls.get(index)!;
              
              // Accumulate arguments
              if (toolDelta.function?.arguments) {
                try {
                  const args = JSON.parse(toolDelta.function.arguments);
                  existingCall.arguments = { ...existingCall.arguments, ...args };
                } catch {
                  // Partial JSON, accumulate as string and try later
                  // For now, store the raw string
                  const currentArgs = existingCall.arguments._raw || '';
                  existingCall.arguments = { 
                    ...existingCall.arguments, 
                    _raw: currentArgs + toolDelta.function.arguments 
                  };
                }
              }
              
              if (toolDelta.function?.name) {
                existingCall.name = toolDelta.function.name;
              }
              
              yield {
                type: 'tool_call_delta',
                toolCall: existingCall,
              };
            }
          }

          // Handle text content
          if (delta?.content) {
            yield { type: 'text_delta', data: delta.content };
          }

          // Handle reasoning (Claude/DeepSeek)
          if (delta?.reasoning_content) {
            yield { type: 'reasoning', data: delta.reasoning_content };
          }
          if (delta?.thinking) {
            yield { type: 'reasoning', data: delta.thinking };
          }

          // Handle completion
          if (finishReason) {
            // Emit any completed tool calls
            for (const toolCall of currentToolCalls.values()) {
              // Try to parse any remaining raw arguments
              if (toolCall.arguments._raw) {
                try {
                  const parsed = JSON.parse(toolCall.arguments._raw);
                  delete toolCall.arguments._raw;
                  toolCall.arguments = { ...toolCall.arguments, ...parsed };
                } catch {
                  // Keep as-is if unparseable
                }
              }
              
              yield {
                type: 'tool_call_end',
                toolCall,
              };
            }
            currentToolCalls.clear();
            
            yield {
              type: 'done',
              stopReason: finishReason,
            };
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function* streamKimiWithTools(
  model: string,
  messages: Message[],
  tools?: ToolDefinition[]
): AsyncGenerator<StreamEvent> {
  // Kimi/Moonshot also supports OpenAI-compatible tool calling
  const body: any = {
    model: model.replace('kimi-', ''),
    messages: messages.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'tool',
          content: m.content,
          tool_call_id: m.tool_call_id,
        };
      }
      if (m.role === 'assistant' && m.tool_calls) {
        return {
          role: 'assistant',
          content: m.content,
          tool_calls: m.tool_calls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        };
      }
      return {
        role: m.role,
        content: m.content,
      };
    }),
    stream: true,
  };

  if (tools && tools.length > 0) {
    body.tools = formatToolsForProvider(tools);
    body.tool_choice = 'auto';
  }

  const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIMI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kimi API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let currentToolCalls: Map<number, ToolCall> = new Map();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          const finishReason = parsed.choices?.[0]?.finish_reason;

          if (delta?.tool_calls) {
            for (const toolDelta of delta.tool_calls) {
              const index = toolDelta.index;
              
              if (!currentToolCalls.has(index)) {
                const newToolCall: ToolCall = {
                  id: toolDelta.id || `call_${Date.now()}_${index}`,
                  name: toolDelta.function?.name || '',
                  arguments: {},
                };
                currentToolCalls.set(index, newToolCall);
                
                yield {
                  type: 'tool_call_start',
                  toolCall: newToolCall,
                };
              }
              
              const existingCall = currentToolCalls.get(index)!;
              
              if (toolDelta.function?.arguments) {
                try {
                  const args = JSON.parse(toolDelta.function.arguments);
                  existingCall.arguments = { ...existingCall.arguments, ...args };
                } catch {
                  const currentArgs = existingCall.arguments._raw || '';
                  existingCall.arguments = { 
                    ...existingCall.arguments, 
                    _raw: currentArgs + toolDelta.function.arguments 
                  };
                }
              }
              
              if (toolDelta.function?.name) {
                existingCall.name = toolDelta.function.name;
              }
              
              yield {
                type: 'tool_call_delta',
                toolCall: existingCall,
              };
            }
          }

          if (delta?.content) {
            yield { type: 'text_delta', data: delta.content };
          }

          if (delta?.reasoning_content) {
            yield { type: 'reasoning', data: delta.reasoning_content };
          }

          if (finishReason) {
            for (const toolCall of currentToolCalls.values()) {
              if (toolCall.arguments._raw) {
                try {
                  const parsed = JSON.parse(toolCall.arguments._raw);
                  delete toolCall.arguments._raw;
                  toolCall.arguments = { ...toolCall.arguments, ...parsed };
                } catch {
                  // Keep as-is
                }
              }
              
              yield {
                type: 'tool_call_end',
                toolCall,
              };
            }
            currentToolCalls.clear();
            
            yield {
              type: 'done',
              stopReason: finishReason,
            };
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Blocking mode for synthesis generation (kept for backward compat)
export async function generateResponse(
  model: string,
  messages: Message[]
): Promise<string> {
  if (!hasApiKey()) {
    throw new Error('No API keys configured. Set OPENROUTER_API_KEY or KIMI_API_KEY.');
  }

  const body: any = {
    model,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    stream: false,
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Debater',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export function buildSystemPrompt(
  role: string,
  style: string,
  topic: string,
  phase: string,
  round: number
): string {
  return `You are a ${role} in a formal debate about: ${topic}

Style: ${style}
Phase: ${phase} (Round ${round})

You have access to tools to search the web for facts. Use them when you need to:
- Verify statistical claims
- Find evidence for arguments
- Check the validity of sources or studies
- Research counterarguments

Process:
1. Consider what facts you need
2. Use search_web or read_url tools as needed
3. After gathering evidence, write your argument

IMPORTANT: If a search returns no results or fails, DO NOT keep searching. Proceed with your argument using general knowledge and reasoning. Do not get stuck in a search loop.

CITATION RULES:
When you use information from a search result, you MUST cite it inline using bracketed numbers like [1], [2], etc.
- Each search result is numbered in the order it was returned
- Cite immediately after the claim: "Studies show X is effective [1]."
- If a claim uses multiple sources, cite all: "X and Y are linked [1][2]."
- Only cite sources you actually used in your argument
- Do not invent citations or cite sources you did not receive

Your argument should be 200-400 words in plain text paragraphs (no markdown).`;
}
