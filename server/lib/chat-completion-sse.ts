import type { ToolCall } from './tools';
import type { StreamEvent } from './llm-types';
import { LLM_STREAM_IDLE_MS } from './constants';

/** OpenAI-style chat delta (OpenRouter normalizes provider-specific reasoning into these fields). */
type OpenAiChatDelta = {
  tool_calls?: Array<{
    index: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }>;
  content?: string;
  reasoning_content?: string;
  thinking?: string;
  /** OpenRouter: plaintext reasoning on the delta when models emit it. */
  reasoning?: string;
  /** OpenRouter: structured reasoning chunks (`reasoning.text`, `reasoning.summary`, …). */
  reasoning_details?: unknown;
};

/**
 * Concatenate all reasoning text from one streamed delta chunk (may be empty).
 * OpenRouter streams `reasoning_details` for Claude / GPT reasoning models; legacy
 * providers may use `reasoning_content` or `thinking` only.
 */
function reasoningFragmentFromDetailItem(o: Record<string, unknown>): string {
  const t = o.type;
  if (t === 'reasoning.text' && typeof o.text === 'string' && o.text.length > 0) {
    return o.text;
  }
  if (t === 'reasoning.summary' && typeof o.summary === 'string' && o.summary.length > 0) {
    return o.summary;
  }
  // `reasoning.encrypted` and other provider-specific blocks: skip binary payloads.
  if (t === 'reasoning.encrypted') {
    return '';
  }
  // OpenRouter may forward vendor-specific `reasoning_details` types with `text` / `content` / `summary`.
  if (typeof o.text === 'string' && o.text.length > 0) return o.text;
  if (typeof o.content === 'string' && o.content.length > 0) return o.content;
  if (typeof o.summary === 'string' && o.summary.length > 0) return o.summary;
  return '';
}

export function reasoningTextFromDelta(delta: OpenAiChatDelta | undefined): string {
  if (!delta) return '';
  const parts: string[] = [];

  if (Array.isArray(delta.reasoning_details)) {
    for (const item of delta.reasoning_details) {
      if (!item || typeof item !== 'object') continue;
      const frag = reasoningFragmentFromDetailItem(item as Record<string, unknown>);
      if (frag.length > 0) parts.push(frag);
    }
  }

  if (typeof delta.reasoning_content === 'string' && delta.reasoning_content.length > 0) {
    parts.push(delta.reasoning_content);
  }
  if (typeof delta.thinking === 'string' && delta.thinking.length > 0) {
    parts.push(delta.thinking);
  }
  if (typeof delta.reasoning === 'string' && delta.reasoning.length > 0) {
    parts.push(delta.reasoning);
  }

  return parts.join('');
}

export interface StreamSseOptions {
  /** If no bytes arrive for this long, the body reader is cancelled. */
  idleMs?: number;
}

function debugDebateSseEnabled(): boolean {
  const v = process.env.DEBUG_DEBATE_SSE?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function logOpenRouterDeltaDebug(delta: OpenAiChatDelta | undefined, rawLine: string): void {
  if (!debugDebateSseEnabled() || !delta) return;
  const keys = Object.keys(delta);
  const extracted = reasoningTextFromDelta(delta);
  const snippet = rawLine.length > 800 ? `${rawLine.slice(0, 800)}…` : rawLine;
  console.debug('[DEBUG_DEBATE_SSE] delta keys:', keys.join(', '), '| reasoning chars:', extracted.length, '| line:', snippet);
}

/**
 * Shared OpenAI-style chat completions SSE parser (OpenRouter + Kimi use the same delta shape).
 */
export async function* streamEventsFromOpenAiSseResponse(
  response: Response,
  options?: StreamSseOptions,
): AsyncGenerator<StreamEvent> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const idleMs = options?.idleMs ?? LLM_STREAM_IDLE_MS;
  const decoder = new TextDecoder();
  const currentToolCalls: Map<number, ToolCall> = new Map();

  let idleHandle: ReturnType<typeof setTimeout> | undefined;
  let idleTimerFired = false;
  const clearIdle = () => {
    if (idleHandle !== undefined) {
      clearTimeout(idleHandle);
      idleHandle = undefined;
    }
  };
  const bumpIdle = () => {
    clearIdle();
    idleTimerFired = false;
    idleHandle = setTimeout(() => {
      idleTimerFired = true;
      void reader.cancel();
    }, idleMs);
  };

  try {
    bumpIdle();
    while (true) {
      let done: boolean;
      let value: Uint8Array | undefined;
      try {
        const r = await reader.read();
        done = r.done;
        value = r.value;
      } catch (e) {
        if (idleTimerFired) {
          throw new Error(
            `LLM stream stalled: no data received for ${Math.round(idleMs / 1000)}s (idle timeout)`,
          );
        }
        const name = e instanceof Error ? e.name : '';
        const msg = e instanceof Error ? e.message : String(e);
        if (name === 'AbortError' || /aborted|AbortError/i.test(msg)) {
          throw new Error(
            'LLM stream ended early (max duration reached or cancelled). Try again.',
          );
        }
        throw e;
      }
      if (done) {
        if (idleTimerFired) {
          throw new Error(
            `LLM stream stalled: no data received for ${Math.round(idleMs / 1000)}s (idle timeout)`,
          );
        }
        break;
      }

      if (value && value.byteLength > 0) {
        bumpIdle();
      }

      const chunk = decoder.decode(value ?? new Uint8Array(0));
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed: unknown = JSON.parse(data);
          const root = parsed as {
            choices?: Array<{
              delta?: OpenAiChatDelta;
              finish_reason?: string | null;
            }>;
          };
          const delta = root.choices?.[0]?.delta;
          const finishReason = root.choices?.[0]?.finish_reason;

          logOpenRouterDeltaDebug(delta, line);

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

          const reasoningChunk = reasoningTextFromDelta(delta);
          if (reasoningChunk.length > 0) {
            yield { type: 'reasoning', data: reasoningChunk };
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
    clearIdle();
    reader.releaseLock();
  }
}
