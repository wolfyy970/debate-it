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
    | 'thinking_start'
    | 'thinking_end'
    | 'done'
    | 'error';
  data?: string;
  toolCall?: { name: string; arguments: Record<string, unknown> };
  toolResult?: { name: string; content: string };
  fullText?: string;
  sources?: Source[];
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
                    name: event.toolCall.name,
                    arguments: event.toolCall.arguments,
                  },
                };
              }
              break;
              
            case 'tool_call_delta':
              // Update accumulated arguments (for display)
              if (event.toolCall) {
                const existing = this.currentToolCalls.find(tc => tc.id === event.toolCall!.id);
                if (existing) {
                  existing.arguments = event.toolCall.arguments;
                }
                // Forward to frontend so search query updates live
                yield {
                  type: 'tool_call_delta',
                  toolCall: {
                    name: event.toolCall.name,
                    arguments: event.toolCall.arguments,
                  },
                };
              }
              break;
              
            case 'tool_call_end':
              if (event.toolCall) {
                yield {
                  type: 'tool_call_end',
                  toolCall: {
                    name: event.toolCall.name,
                    arguments: event.toolCall.arguments,
                  },
                };
              }
              break;
              
            case 'done':
              // Add the assistant's message to context
              this.messages.push({
                role: 'assistant',
                content: currentText,
                tool_calls: this.currentToolCalls.length > 0 ? this.currentToolCalls : undefined,
              });
              
              if (event.stopReason === 'stop' || event.stopReason === 'end_turn') {
                // LLM is done
                console.log(`[Agent] Done after ${this.iterationCount} iterations. Text length: ${this.fullText.length}, Sources: ${this.sources.length}`);
                yield {
                  type: 'done',
                  fullText: this.fullText,
                  data: this.reasoningText || undefined,
                  sources: this.sources.length > 0 ? this.sources : undefined,
                };
                return;
              } else if (event.stopReason === 'tool_calls' || hasToolCalls) {
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
                  
                  const result = await executeTool(toolCall);

                  if (result.toolName === 'search_web' && !result.isError && result.sources?.length) {
                    const added: Source[] = [];
                    for (const s of result.sources) {
                      if (
                        s.url &&
                        s.url.startsWith('http') &&
                        !this.sources.find((x) => x.url === s.url)
                      ) {
                        this.sourceCounter++;
                        const entry: Source = {
                          title: s.title,
                          url: s.url,
                          snippet: s.snippet,
                        };
                        this.sources.push(entry);
                        added.push(entry);
                      }
                    }
                    if (added.length > 0) {
                      yield {
                        type: 'search_results',
                        sources: added,
                      };
                    }
                  }
                  
                  // Add tool result to messages
                  this.messages.push({
                    role: 'tool',
                    content: result.content,
                    tool_call_id: result.toolCallId,
                    name: result.toolName,
                  });
                  
                  yield {
                    type: 'tool_result',
                    toolResult: {
                      name: result.toolName,
                      content: result.content.substring(0, 500) + (result.content.length > 500 ? '...' : ''),
                    },
                  };
                }
                
                this.currentToolCalls = [];
                hasToolCalls = false;
                currentText = '';
              }
              break;
              
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
      yield {
        type: 'done',
        fullText: this.fullText,
        data: this.reasoningText || undefined,
        sources: this.sources.length > 0 ? this.sources : undefined,
      };
    } catch (error) {
      yield {
        type: 'error',
        data: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.isRunning = false;
    }
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
