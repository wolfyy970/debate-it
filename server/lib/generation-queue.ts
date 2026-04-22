import { EventEmitter } from 'events';
import { DebateAgent, type AgentEvent } from './debate-agent';
import type { Agent, Turn, Debate, Source } from './store';
import { countTokens } from './tokenizer';

export interface GenerationJob {
  id: string;
  debateId: string;
  status: 'queued' | 'generating' | 'completed' | 'cancelled' | 'error';
  agent?: Agent;
  turnId?: string;
  error?: string;
}

interface SSEEvent {
  type: string;
  data: unknown;
}

class GenerationQueue extends EventEmitter {
  private jobs: Map<string, GenerationJob> = new Map();
  private activeAgents: Map<string, DebateAgent> = new Map();
  private sseListeners: Map<string, Set<(event: SSEEvent) => void>> = new Map();

  enqueue(debateId: string, agent: Agent, debate: Debate): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const job: GenerationJob = {
      id: jobId,
      debateId,
      status: 'queued',
      agent,
    };

    this.jobs.set(jobId, job);
    
    // Start generation
    this.runAgent(jobId, debateId, agent, debate);
    
    return jobId;
  }

  private async runAgent(
    jobId: string,
    debateId: string,
    agent: Agent,
    debate: Debate
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'generating';
    this.jobs.set(jobId, job);

      let fullText = '';
      let reasoningText = '';
      let sources: Source[] | undefined;

      try {
      // Build agent context
      const agentContext = {
        topic: debate.topic,
        phase: debate.phase,
        round: debate.round,
        role: agent.role,
        style: agent.style,
        model: agent.model,
        priorTurns: debate.turns
          .filter(t => !t.meta)
          .map(t => ({
            role: t.role,
            text: t.text,
            phase: t.phase,
          })),
      };

      // Create and run agent
      const debateAgent = new DebateAgent(agentContext);
      this.activeAgents.set(jobId, debateAgent);
      
      const agentStream = debateAgent.run();
      
      for await (const event of agentStream) {
        switch (event.type) {
          case 'text_delta':
            fullText += event.data || '';
            this.emitSSE(debateId, { 
              type: 'chunk', 
              data: event.data 
            });
            break;
            
          case 'reasoning':
            reasoningText += event.data || '';
            this.emitSSE(debateId, { 
              type: 'reasoning', 
              data: event.data 
            });
            break;
            
          case 'tool_call_start':
            this.emitSSE(debateId, { 
              type: 'search_start', 
              data: {
                query: event.toolCall?.arguments?.query || '',
                reason: event.toolCall?.arguments?.reason || '',
                name: event.toolCall?.name || '',
              }
            });
            break;
            
          case 'tool_call_delta':
            // Forward updated tool arguments to frontend
            this.emitSSE(debateId, { 
              type: 'search_update', 
              data: {
                query: event.toolCall?.arguments?.query || '',
                reason: event.toolCall?.arguments?.reason || '',
                name: event.toolCall?.name || '',
              }
            });
            break;
            
          case 'tool_call_end':
            this.emitSSE(debateId, { 
              type: 'search_result', 
              data: {
                query: event.toolCall?.arguments?.query || '',
                name: event.toolCall?.name || '',
              }
            });
            break;
            
          case 'tool_result':
            // Tool execution completed
            break;
            
          case 'search_results':
            if (event.sources && event.sources.length > 0) {
              this.emitSSE(debateId, {
                type: 'search_result',
                data: {
                  results: event.sources.map(s => ({
                    title: s.title,
                    url: s.url,
                  })),
                },
              });
            }
            break;
            
          case 'done':
            // Final argument complete
            if (event.sources) {
              sources = event.sources;
            }
            break;
            
          case 'error':
            throw new Error(event.data || 'Agent error');
        }
      }

      job.status = 'completed';
      this.jobs.set(jobId, job);

      const tokenCount = countTokens(fullText, agent.model);

      console.log(`[Queue] Generation complete for ${agent.role}. Text length: ${fullText.length}, reasoning length: ${reasoningText?.length || 0}`);
      
      this.emitSSE(debateId, {
        type: 'done',
        data: {
          text: fullText,
          reasoning: reasoningText || undefined,
          tokenCount,
          agent,
          sources,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      job.status = 'error';
      job.error = errorMessage;
      this.jobs.set(jobId, job);

      this.emitSSE(debateId, {
        type: 'error',
        data: {
          message: errorMessage,
          jobId,
        },
      });
    } finally {
      this.activeAgents.delete(jobId);
    }
  }

  cancel(jobId: string): boolean {
    const agent = this.activeAgents.get(jobId);
    if (agent) {
      // Note: We can't truly cancel the agent mid-stream without AbortSignal
      // For now, just mark as cancelled
      this.activeAgents.delete(jobId);
      
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'cancelled';
        this.jobs.set(jobId, job);
        this.emitSSE(job.debateId, { type: 'cancelled', data: { jobId } });
      }
      return true;
    }
    return false;
  }

  cancelByDebate(debateId: string): boolean {
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.debateId === debateId && job.status === 'generating') {
        return this.cancel(jobId);
      }
    }
    return false;
  }

  getJob(jobId: string): GenerationJob | undefined {
    return this.jobs.get(jobId);
  }

  getActiveJob(debateId: string): GenerationJob | undefined {
    for (const job of this.jobs.values()) {
      if (job.debateId === debateId && (job.status === 'queued' || job.status === 'generating')) {
        return job;
      }
    }
    return undefined;
  }

  // SSE listener management
  addSSEListener(debateId: string, callback: (event: SSEEvent) => void): () => void {
    if (!this.sseListeners.has(debateId)) {
      this.sseListeners.set(debateId, new Set());
    }
    
    const listeners = this.sseListeners.get(debateId)!;
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.sseListeners.delete(debateId);
      }
    };
  }

  private emitSSE(debateId: string, event: SSEEvent): void {
    const listeners = this.sseListeners.get(debateId);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }
}

const queue = new GenerationQueue();

export function getGenerationQueue(): GenerationQueue {
  return queue;
}
