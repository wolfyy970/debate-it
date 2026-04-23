const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const KIMI_API_KEY = process.env.KIMI_API_KEY || '';

import type { ToolDefinition, ToolCall } from './tools';
import {
  DEFAULT_VITE_DEV_PORT,
  GENERATE_RESPONSE_TIMEOUT_MS,
  LLM_STREAM_IDLE_MS,
  LLM_STREAM_MAX_MS,
} from './constants';
import { streamEventsFromOpenAiSseResponse } from './chat-completion-sse';

import type { Message, StreamEvent } from './llm-types';

export type { Message, StreamEvent } from './llm-types';

function isKimiModel(model: string): boolean {
  return model.toLowerCase().includes('kimi') || model.toLowerCase().includes('moonshot');
}

/** Map UI / OpenRouter model ids to Moonshot `model` field (e.g. `moonshotai/kimi-k2.6` → `kimi-k2.6`). */
function moonshotChatModelId(stored: string): string {
  const m = stored.trim();
  const lower = m.toLowerCase();
  if (lower.startsWith('moonshotai/')) return m.slice('moonshotai/'.length);
  return m.replace(/kimi-/i, '');
}

function kimiThinkingSupported(apiModel: string): boolean {
  const s = apiModel.toLowerCase();
  return /k2|thinking|kimi-k2/.test(s);
}

function hasApiKey(): boolean {
  return !!(OPENROUTER_API_KEY || KIMI_API_KEY);
}

export interface ApiKeyStatus {
  openrouter: boolean;
  kimi: boolean;
  tavily: boolean;
  /** True when at least one LLM provider key is set. */
  hasAny: boolean;
  /** True when both an LLM provider and Tavily are configured — required to run a debate. */
  hasAllRequired: boolean;
}

/** OpenRouter `HTTP-Referer`; override with `OPENROUTER_HTTP_REFERER` or align via `VITE_DEV_PORT`. */
function openRouterHttpReferer(): string {
  const explicit = process.env.OPENROUTER_HTTP_REFERER?.trim();
  if (explicit) return explicit;
  const devPort = Number(process.env.VITE_DEV_PORT) || DEFAULT_VITE_DEV_PORT;
  return `http://localhost:${devPort}`;
}

export function checkApiKeys(): ApiKeyStatus {
  const tavily = !!process.env.TAVILY_API_KEY;
  const hasAny = hasApiKey();
  return {
    openrouter: !!OPENROUTER_API_KEY,
    kimi: !!KIMI_API_KEY,
    tavily,
    hasAny,
    hasAllRequired: hasAny && tavily,
  };
}

export function formatToolsForProvider(tools: ToolDefinition[]): Record<string, unknown>[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.entries(tool.parameters).reduce(
          (acc, [key, param]) => {
            acc[key] = {
              type: param.type,
              description: param.description,
              ...(param.enum ? { enum: param.enum } : {}),
            };
            return acc;
          },
          {} as Record<string, unknown>
        ),
        required: tool.required || Object.keys(tool.parameters),
      },
    },
  }));
}

function mapMessagesToOpenAiChat(messages: Message[]): Record<string, unknown>[] {
  return messages.map((m) => {
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
        tool_calls: m.tool_calls.map((tc: ToolCall) => ({
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
  });
}

function buildStreamingRequestBody(
  _model: string,
  messages: Message[],
  tools: ToolDefinition[] | undefined,
  modelForApi: string
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: modelForApi,
    messages: mapMessagesToOpenAiChat(messages),
    stream: true,
  };
  if (tools && tools.length > 0) {
    body.tools = formatToolsForProvider(tools);
    body.tool_choice = 'auto';
  }
  return body;
}

/**
 * Stream a response from the LLM with tool support.
 */
/** User cancel + max wall-clock per streaming request (idle is enforced inside the SSE reader). */
function composeStreamingFetchSignal(streamSignal?: AbortSignal): AbortSignal {
  const maxWall = AbortSignal.timeout(LLM_STREAM_MAX_MS);
  return streamSignal != null ? AbortSignal.any([streamSignal, maxWall]) : maxWall;
}

export async function* streamWithTools(
  model: string,
  messages: Message[],
  tools?: ToolDefinition[],
  streamSignal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  if (!hasApiKey()) {
    throw new Error('No API keys configured. Set OPENROUTER_API_KEY or KIMI_API_KEY.');
  }

  const signal = composeStreamingFetchSignal(streamSignal);

  // Prefer OpenRouter when configured so OpenRouter-hosted Kimi slugs (e.g. `moonshotai/kimi-k2.6`)
  // are not silently routed to direct Moonshot just because `KIMI_API_KEY` is also set.
  if (OPENROUTER_API_KEY) {
    yield* streamOpenRouterWithTools(model, messages, tools, signal);
  } else if (isKimiModel(model) && KIMI_API_KEY) {
    yield* streamKimiWithTools(model, messages, tools, signal);
  } else if (KIMI_API_KEY) {
    yield* streamKimiWithTools(model, messages, tools, signal);
  } else {
    throw new Error('No API keys configured. Set OPENROUTER_API_KEY or KIMI_API_KEY.');
  }
}

async function* streamOpenRouterWithTools(
  model: string,
  messages: Message[],
  tools: ToolDefinition[] | undefined,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const body = buildStreamingRequestBody(model, messages, tools, model);
  /**
   * Ask OpenRouter for reasoning in the same SSE stream as content/tools.
   * `max_tokens` maps across providers that use a reasoning budget (incl. many Kimi routes per OpenRouter docs).
   */
  body.reasoning = { max_tokens: 32_768, exclude: false };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': openRouterHttpReferer(),
      'X-Title': 'Debater',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  yield* streamEventsFromOpenAiSseResponse(response, { idleMs: LLM_STREAM_IDLE_MS });
}

async function* streamKimiWithTools(
  model: string,
  messages: Message[],
  tools: ToolDefinition[] | undefined,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const apiModel = moonshotChatModelId(model);
  const body = buildStreamingRequestBody(model, messages, tools, apiModel);
  if (kimiThinkingSupported(apiModel)) {
    body.thinking = { type: 'enabled' };
  }

  const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KIMI_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kimi API error: ${response.status} - ${errorText}`);
  }

  yield* streamEventsFromOpenAiSseResponse(response, { idleMs: LLM_STREAM_IDLE_MS });
}

export async function generateResponse(
  model: string,
  messages: Message[],
  streamSignal?: AbortSignal,
): Promise<string> {
  if (!hasApiKey()) {
    throw new Error('No API keys configured. Set OPENROUTER_API_KEY or KIMI_API_KEY.');
  }

  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: false,
  };

  const signal =
    streamSignal != null
      ? AbortSignal.any([streamSignal, AbortSignal.timeout(GENERATE_RESPONSE_TIMEOUT_MS)])
      : AbortSignal.timeout(GENERATE_RESPONSE_TIMEOUT_MS);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': openRouterHttpReferer(),
      'X-Title': 'Debater',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content || '';
}

export function buildSystemPrompt(role: string, style: string, topic: string, phase: string, round: number): string {
  return `You are a ${role} in a formal debate about: ${topic}

Style: ${style}
Phase: ${phase} (Round ${round})

You have access to two tools:
- search_web: the only way to obtain external evidence. Use it to verify statistical claims, find studies, check sources, or research counterarguments.
- read_url: ONLY use with a URL that was returned by a prior search_web result in this conversation. Do not invent URLs from memory; any URL you did not receive from search_web must be treated as a hypothesis, not a source.

Process:
1. Consider what facts you need.
2. Call search_web to get a set of results. After search_web returns at least one URL, you MUST call read_url on at least one promising URL in this turn before writing your argument, unless a single snippet is unambiguous and directly answers the claim you need (in that rare case, say so in one short clause and cite it).
3. Write your argument using what you learned (including from full-page reads where you used read_url).

IMPORTANT: If search_web returns no results or fails, DO NOT retry endlessly. Proceed with general knowledge and clearly mark unverified claims as such.

CITATION RULES:
When you use information from a search result, cite inline using bracketed numbers like [1], [2] that match the bracketed prefix on each block in the search_web tool output (e.g. "[3] Title…").
- Those numbers are stable indices into the debate's accumulated source list for this turn — use them exactly as shown; do not invent or renumber.
- Cite immediately after the claim: "Studies show X is effective [1]."
- If a claim uses multiple sources, cite all: "X and Y are linked [1][2]."
- Only cite sources you actually used from tool output; do not invent citations.

Your argument should be 200-400 words in plain text paragraphs (no markdown).`;
}
