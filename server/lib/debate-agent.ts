import { streamWithTools, buildSystemPrompt } from './openrouter';
import type { Message } from './llm-types';
import { executeTool, TOOL_DEFINITIONS, type ToolCall } from './tools';
import { MAX_AGENT_ITERATIONS } from './constants';
import type { Source } from './store';

interface AgentContext {
  topic: string;
  phase: string;
  round: number;
  role: string;
  style: string;
  model: string;
  priorTurns: { role: string; text: string; phase: string }[];
}

export interface AgentEvent {
  type:
    | 'text_delta'
    | 'reasoning'
    | 'tool_call_start'
    | 'tool_call_delta'
    | 'tool_call_end'
    | 'tool_result'
    | 'search_results'
    | 'url_read'
    | 'thinking_start'
    | 'thinking_end'
    | 'done'
    | 'error';
  data?: string;
  toolCall?: { id: string; name: string; arguments: Record<string, unknown> };
  toolResult?: { name: string; content: string };
  fullText?: string;
  sources?: Source[];
  /** Successful read_url fetch — URL for UI telemetry only. */
  url?: string;
  /** Present on `search_results` — identifies which tool call produced the sources. */
  toolCallId?: string;
  /** Present on `search_results` when the tool failed (Tavily error, timeout, etc.). */
  searchError?: string;
  /** Optional category for UI copy (`search_timeout`, etc.). */
  searchErrorCode?: string;
}

/**
 * DebateAgent implements a ReAct-style loop where the LLM is in control.
 * 
 * The agent:
 * 1. Streams the LLM's response in real-time (text, reasoning, tool calls)
 * 2. Detects native tool calls mid-generation
 * 3. Executes tools and feeds results back into context
 * 4. Continues the loop until the LLM decides it's done (stopReason === 'stop')
 * 
 * Events are emitted for every state change so the UI can show:
 * - Real-time text generation
 * - Thinking/reasoning process
 * - Active searches and their results
 */
export class DebateAgent {
  private context: AgentContext;
  private messages: Message[];
  private fullText: string;
  private reasoningText: string;
  private currentToolCalls: ToolCall[];
  private isRunning: boolean;
  private maxIterations: number;
  private iterationCount: number;
  private sources: Source[];
  private sourceCounter: number;

  constructor(context: AgentContext) {
    this.context = context;
    this.messages = [];
    this.fullText = '';
    this.reasoningText = '';
    this.currentToolCalls = [];
    this.isRunning = false;
    this.maxIterations = MAX_AGENT_ITERATIONS;
    this.iterationCount = 0;
    this.sources = [];
    this.sourceCounter = 0;
  }

  /**
   * Run the agent loop. Yields events in real-time as the LLM generates.
   * @param signal When aborted (e.g. user cancel), upstream fetch is aborted.
   */
  async *run(signal?: AbortSignal): AsyncGenerator<AgentEvent> {
    if (this.isRunning) {
      throw new Error('Agent is already running');
    }
    
    this.isRunning = true;
    this.iterationCount = 0;
    
    try {
      // Build initial context
      this.buildInitialMessages();
      console.log(`[Agent] Starting ${this.context.role} for "${this.context.topic.substring(0, 50)}..."`);
      console.log(`[Agent] Context: ${this.messages.length} messages, ${this.messages.reduce((acc, m) => acc + m.content.length, 0)} chars`);
      
      // Main ReAct loop
      while (this.iterationCount < this.maxIterations) {
        this.iterationCount++;
        console.log(`[Agent] Iteration ${this.iterationCount}/${this.maxIterations}`);
        
        // Stream LLM response
        const stream = streamWithTools(
          this.context.model,
          this.messages,
          TOOL_DEFINITIONS,
          signal,
        );
        
        let hasToolCalls = false;
        let currentText = '';
        
        for await (const event of stream) {
          switch (event.type) {
            case 'text_delta':
              currentText += event.data || '';
              this.fullText += event.data || '';
              yield {
                type: 'text_delta',
                data: event.data,
              };
              break;
              
            case 'reasoning':
              this.reasoningText += event.data || '';
              yield {
                type: 'reasoning',
                data: event.data,
              };
              break;
              
            case 'tool_call_start':
              hasToolCalls = true;
              if (event.toolCall) {
                this.currentToolCalls.push(event.toolCall);
                yield {
                  type: 'tool_call_start',
                  toolCall: {
                    id: event.toolCall.id,
                    name: event.toolCall.name,
                    arguments: event.toolCall.arguments,
                  },
                };
              }
              break;

            case 'tool_call_delta':
              // Provider streams arguments as JSON fragments; mid-stream values
              // are almost always empty or partial. Accumulate internally and
              // let tool_call_end be the single authoritative update to the UI.
              if (event.toolCall) {
                const existing = this.currentToolCalls.find((tc) => tc.id === event.toolCall!.id);
                if (existing) existing.arguments = event.toolCall.arguments;
              }
              break;

            case 'tool_call_end':
              if (event.toolCall) {
                yield {
                  type: 'tool_call_end',
                  toolCall: {
                    id: event.toolCall.id,
                    name: event.toolCall.name,
                    arguments: event.toolCall.arguments,
                  },
                };
              }
              break;
              
            case 'done': {
              // Add the assistant's message to context
              this.messages.push({
                role: 'assistant',
                content: currentText,
                tool_calls: this.currentToolCalls.length > 0 ? this.currentToolCalls : undefined,
              });

              // Tool rounds first: some providers may send stop + tool_calls; never skip executing tools.
              if (event.stopReason === 'tool_calls' || hasToolCalls) {
                console.log(`[Agent] Tool calls detected, executing ${this.currentToolCalls.length} tools`);
                // Execute tools and continue loop
                yield { type: 'thinking_end' };

                for (const toolCall of this.currentToolCalls) {
                  yield {
                    type: 'tool_result',
                    toolResult: {
                      name: toolCall.name,
                      content: `Executing ${toolCall.name}...`,
                    },
                  };
                  
                  const result = await executeTool(toolCall, { signal });

                  if (result.toolName === 'read_url' && !result.isError) {
                    const url =
                      typeof toolCall.arguments?.url === 'string' ? toolCall.arguments.url.trim() : '';
                    if (url.startsWith('http')) {
                      yield { type: 'url_read', url };
                    }
                  }

                  let toolMessageContent = result.content;

                  if (result.toolName === 'search_web') {
                    const rawForUi: Source[] = [];
                    if (!result.isError && result.sources?.length) {
                      for (const s of result.sources) {
                        if (s.url && s.url.startsWith('http')) {
                          rawForUi.push({
                            title: s.title,
                            url: s.url,
                            snippet: s.snippet,
                          });
                          if (!this.sources.find((x) => x.url === s.url)) {
                            this.sourceCounter++;
                            this.sources.push({
                              title: s.title,
                              url: s.url,
                              snippet: s.snippet,
                            });
                          }
                        }
                      }
                      const numbered = result.sources
                        .filter((s) => s.url && s.url.startsWith('http'))
                        .map((s) => {
                          const idx = this.sources.findIndex((x) => x.url === s.url) + 1;
                          if (idx < 1) return '';
                          const snip = s.snippet?.trim() || '';
                          return `[${idx}] ${s.title}\n${s.url}\n${snip}`;
                        })
                        .filter(Boolean)
                        .join('\n\n');
                      if (numbered) toolMessageContent = numbered;
                    }
                    const searchError = result.isError
                      ? result.content.replace(/^Error:\s*/i, '').trim() || 'Search failed'
                      : undefined;
                    yield {
                      type: 'search_results',
                      sources: rawForUi,
                      toolCallId: toolCall.id,
                      searchError,
                      searchErrorCode: result.isError ? result.errorCode : undefined,
                    };
                  }

                  // Add tool result to messages
                  this.messages.push({
                    role: 'tool',
                    content: toolMessageContent,
                    tool_call_id: result.toolCallId,
                    name: result.toolName,
                  });
                  
                  yield {
                    type: 'tool_result',
                    toolResult: {
                      name: result.toolName,
                      content:
                        toolMessageContent.substring(0, 500) +
                        (toolMessageContent.length > 500 ? '...' : ''),
                    },
                  };
                }
                
                this.currentToolCalls = [];
                hasToolCalls = false;
                currentText = '';
                break;
              }

              if (event.stopReason === 'stop' || event.stopReason === 'end_turn') {
                if (this.fullText.trim().length > 0) {
                  console.log(
                    `[Agent] Done after ${this.iterationCount} iterations. Text length: ${this.fullText.length}, Sources: ${this.sources.length}`,
                  );
                  yield {
                    type: 'done',
                    fullText: this.fullText,
                    data: this.reasoningText || undefined,
                    sources: this.sources.length > 0 ? this.sources : undefined,
                  };
                  return;
                }
                yield { type: 'thinking_end' };
                yield* this.runForcedProsePass(signal);
                if (this.fullText.trim().length === 0) {
                  yield { type: 'error', data: 'Model produced no argument' };
                  return;
                }
                yield {
                  type: 'done',
                  fullText: this.fullText,
                  data: this.reasoningText || undefined,
                  sources: this.sources.length > 0 ? this.sources : undefined,
                };
                return;
              }

              // Unknown / empty stopReason: require prose if body still empty
              if (this.fullText.trim().length === 0) {
                yield { type: 'thinking_end' };
                yield* this.runForcedProsePass(signal);
                if (this.fullText.trim().length === 0) {
                  yield { type: 'error', data: 'Model produced no argument' };
                  return;
                }
              }
              yield {
                type: 'done',
                fullText: this.fullText,
                data: this.reasoningText || undefined,
                sources: this.sources.length > 0 ? this.sources : undefined,
              };
              return;
            }
              
            case 'error':
              yield {
                type: 'error',
                data: event.data || 'Unknown error',
              };
              return;
          }
        }
      }
      
      // Max iterations reached
      console.log(`[Agent] Max iterations reached. Text length: ${this.fullText.length}`);
      if (this.fullText.trim().length > 0) {
        yield {
          type: 'done',
          fullText: this.fullText,
          data: this.reasoningText || undefined,
          sources: this.sources.length > 0 ? this.sources : undefined,
        };
      } else {
        yield { type: 'thinking_end' };
        yield* this.runForcedProsePass(signal);
        if (this.fullText.trim().length === 0) {
          yield { type: 'error', data: 'Model produced no argument' };
          return;
        }
        yield {
          type: 'done',
          fullText: this.fullText,
          data: this.reasoningText || undefined,
          sources: this.sources.length > 0 ? this.sources : undefined,
        };
      }
    } catch (error) {
      yield {
        type: 'error',
        data: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * One streaming call with tools disabled so the model must emit plain-text argument.
   * Used when the ReAct loop would otherwise commit an empty body.
   */
  private async *runForcedProsePass(signal?: AbortSignal): AsyncGenerator<AgentEvent> {
    this.messages.push({
      role: 'user',
      content:
        'Your prior reply contained no readable argument text. Write your debate argument now in 200–400 words as plain text paragraphs only (no markdown). ' +
        'Use evidence from tool results in this thread where relevant. Do not call search_web, read_url, or any other tools.',
    });

    const stream = streamWithTools(this.context.model, this.messages, undefined, signal);
    let forcedAssistantText = '';

    for await (const event of stream) {
      switch (event.type) {
        case 'text_delta':
          forcedAssistantText += event.data || '';
          this.fullText += event.data || '';
          yield { type: 'text_delta', data: event.data };
          break;
        case 'reasoning':
          this.reasoningText += event.data || '';
          yield { type: 'reasoning', data: event.data };
          break;
        case 'done':
          this.messages.push({
            role: 'assistant',
            content: forcedAssistantText,
          });
          yield { type: 'thinking_end' };
          return;
        case 'error':
          yield { type: 'error', data: event.data || 'Unknown error' };
          return;
        case 'tool_call_start':
        case 'tool_call_delta':
        case 'tool_call_end':
          break;
        default:
          break;
      }
    }

    if (forcedAssistantText.trim().length > 0) {
      this.messages.push({
        role: 'assistant',
        content: forcedAssistantText,
      });
    }
    yield { type: 'thinking_end' };
  }

  private buildInitialMessages(): void {
    const systemPrompt = buildSystemPrompt(
      this.context.role,
      this.context.style,
      this.context.topic,
      this.context.phase,
      this.context.round
    );
    
    this.messages = [
      { role: 'system', content: systemPrompt },
    ];
    
    // Add prior turns
    if (this.context.priorTurns.length > 0) {
      this.messages.push({
        role: 'user',
        content: 'Prior turns in this debate:\n\n' +
          this.context.priorTurns.map(t => `[${t.role} - ${t.phase}]: ${t.text}`).join('\n\n'),
      });
    }
    
    // Add instruction to begin
    this.messages.push({
      role: 'user',
      content: `Write your ${this.context.role.toLowerCase()} argument for: ${this.context.topic}\n\n` +
        `Use the search_web and read_url tools if you need to verify facts or find evidence. ` +
        `When you are ready to write your argument, just start writing. ` +
        `Write 200-400 words in plain text paragraphs (no markdown formatting).`,
    });
  }

  getReasoning(): string {
    return this.reasoningText;
  }

  getFullText(): string {
    return this.fullText;
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  getSources(): Source[] {
    return [...this.sources];
  }

}
