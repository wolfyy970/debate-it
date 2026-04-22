import type { ToolCall } from './tools';
import type { StreamEvent } from './llm-types';

/**
 * Shared OpenAI-style chat completions SSE parser (OpenRouter + Kimi use the same delta shape).
 */
export async function* streamEventsFromOpenAiSseResponse(
  response: Response
): AsyncGenerator<StreamEvent> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  const currentToolCalls: Map<number, ToolCall> = new Map();

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
          const parsed: unknown = JSON.parse(data);
          const root = parsed as {
            choices?: Array<{
              delta?: {
                tool_calls?: Array<{
                  index: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
                content?: string;
                reasoning_content?: string;
                thinking?: string;
              };
              finish_reason?: string | null;
            }>;
          };
          const delta = root.choices?.[0]?.delta;
          const finishReason = root.choices?.[0]?.finish_reason;

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
                  const args = JSON.parse(toolDelta.function.arguments) as Record<string, unknown>;
                  existingCall.arguments = { ...existingCall.arguments, ...args };
                } catch {
                  const currentArgs = (existingCall.arguments._raw as string) || '';
                  existingCall.arguments = {
                    ...existingCall.arguments,
                    _raw: currentArgs + toolDelta.function.arguments,
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
          if (delta?.thinking) {
            yield { type: 'reasoning', data: delta.thinking };
          }

          if (finishReason) {
            for (const toolCall of currentToolCalls.values()) {
              if (toolCall.arguments._raw) {
                try {
                  const parsedRaw = JSON.parse(toolCall.arguments._raw as string) as Record<string, unknown>;
                  delete toolCall.arguments._raw;
                  toolCall.arguments = { ...toolCall.arguments, ...parsedRaw };
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
          // Skip invalid JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
