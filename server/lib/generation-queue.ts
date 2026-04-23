import { EventEmitter } from 'events';
import { DebateAgent } from './debate-agent';
import type { Agent, Debate, Source, Turn } from './store';
import { countTokens } from './tokenizer';
import { getDebateStore, generateId } from './store';
import { computePhaseAfterTurnCompletion } from './debate-phase';
import type { ServerSseEvent } from './sse-events';

interface GenerationJob {
  id: string;
  debateId: string;
  status: 'queued' | 'generating' | 'completed' | 'cancelled' | 'error';
  agent?: Agent;
  turnId?: string;
  error?: string;
  abortController: AbortController;
}

class GenerationQueue extends EventEmitter {
  private jobs: Map<string, GenerationJob> = new Map();
  private activeAgents: Map<string, DebateAgent> = new Map();
  private sseListeners: Map<string, Set<(event: ServerSseEvent) => void>> = new Map();

  enqueue(debateId: string, agent: Agent, debate: Debate): string {
    const jobId = generateId('job');
    const abortController = new AbortController();

    const job: GenerationJob = {
      id: jobId,
      debateId,
      status: 'queued',
      agent,
      abortController,
    };

    this.jobs.set(jobId, job);

    void this.runAgent(jobId, debateId, agent, debate, abortController.signal).catch((err) => {
      console.error('[Queue] runAgent failed:', err);
    });

    return jobId;
  }

  private async runAgent(
    jobId: string,
    debateId: string,
    agent: Agent,
    debate: Debate,
    signal: AbortSignal,
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'generating';
    this.jobs.set(jobId, job);

    let fullText = '';
    let reasoningText = '';
    let sources: Source[] | undefined;

    try {
      const agentContext = {
        topic: debate.topic,
        phase: debate.phase,
        round: debate.round,
        role: agent.role,
        style: agent.style,
        model: agent.model,
        priorTurns: debate.turns
          .filter((t) => !t.meta)
          .map((t) => ({
            role: t.role,
            text: t.text,
            phase: t.phase,
          })),
      };

      const debateAgent = new DebateAgent(agentContext);
      this.activeAgents.set(jobId, debateAgent);

      const agentStream = debateAgent.run(signal);

      for await (const event of agentStream) {
        if (this.jobs.get(jobId)?.status === 'cancelled') {
          return;
        }
        switch (event.type) {
          case 'text_delta':
            fullText += event.data || '';
            this.emitSSE(debateId, {
              type: 'chunk',
              data: event.data || '',
            });
            break;

          case 'reasoning':
            reasoningText += event.data || '';
            this.emitSSE(debateId, {
              type: 'reasoning',
              data: event.data || '',
            });
            break;

          case 'tool_call_start':
            this.emitSSE(debateId, {
              type: 'search_start',
              data: {
                query: (event.toolCall?.arguments?.query as string) || '',
                reason: (event.toolCall?.arguments?.reason as string) || '',
                name: event.toolCall?.name || '',
              },
            });
            break;

          case 'tool_call_delta':
            this.emitSSE(debateId, {
              type: 'search_update',
              data: {
                query: (event.toolCall?.arguments?.query as string) || '',
                reason: (event.toolCall?.arguments?.reason as string) || '',
                name: event.toolCall?.name || '',
              },
            });
            break;

          case 'tool_call_end':
            // Finalize the query on the UI (args are fully parsed here);
            // the actual execution result is emitted later via `search_results`.
            this.emitSSE(debateId, {
              type: 'search_update',
              data: {
                query: (event.toolCall?.arguments?.query as string) || '',
                reason: (event.toolCall?.arguments?.reason as string) || '',
                name: event.toolCall?.name || '',
              },
            });
            break;

          case 'tool_result':
            break;

          case 'search_results':
            this.emitSSE(debateId, {
              type: 'search_result',
              data: {
                results: (event.sources ?? []).map((s) => ({
                  title: s.title,
                  url: s.url,
                })),
              },
            });
            break;

          case 'done':
            if (event.sources) {
              sources = event.sources;
            }
            break;

          case 'error':
            throw new Error(event.data || 'Agent error');
        }
      }

      if (this.jobs.get(jobId)?.status === 'cancelled' || signal.aborted) {
        return;
      }

      const tokenCount = countTokens(fullText, agent.model);
      console.log(
        `[Queue] Generation complete for ${agent.role}. Text length: ${fullText.length}, reasoning length: ${reasoningText?.length || 0}`,
      );

      const store = getDebateStore();
      const debateRef = store.get(debateId);
      if (!debateRef) {
        throw new Error(`Debate ${debateId} not found when committing turn`);
      }

      const turn: Turn = {
        id: generateId('turn'),
        n: debateRef.turns.length + 1,
        role: agent.role as Turn['role'],
        style: agent.style,
        model: agent.model,
        phase: debateRef.phase,
        text: fullText,
        reasoning: reasoningText || undefined,
        sources,
        timestamp: new Date().toISOString(),
      };

      debateRef.turns.push(turn);

      const pr = computePhaseAfterTurnCompletion({
        phase: debateRef.phase,
        round: debateRef.round,
        totalRounds: debateRef.totalRounds,
        turnsLengthAfterPush: debateRef.turns.length,
        status: debateRef.status,
      });
      debateRef.phase = pr.phase;
      debateRef.round = pr.round;
      debateRef.status = pr.status;

      store.set(debateId, debateRef);

      this.emitSSE(debateId, {
        type: 'turn',
        turn: { ...turn, tokenCount } as Record<string, unknown>,
      });

      this.emitSSE(debateId, {
        type: 'phase-change',
        phase: debateRef.phase,
        round: debateRef.round,
        status: debateRef.status,
      });

      job.status = 'completed';
      this.jobs.set(jobId, job);
    } catch (error) {
      if (this.jobs.get(jobId)?.status === 'cancelled') {
        return;
      }

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
    const job = this.jobs.get(jobId);
    if (!job || (job.status !== 'generating' && job.status !== 'queued')) {
      return false;
    }
    job.abortController.abort();
    job.status = 'cancelled';
    this.jobs.set(jobId, job);
    this.activeAgents.delete(jobId);
    this.emitSSE(job.debateId, { type: 'cancelled', data: { jobId } });
    return true;
  }

  cancelByDebate(debateId: string): boolean {
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.debateId === debateId && (job.status === 'generating' || job.status === 'queued')) {
        return this.cancel(jobId);
      }
    }
    return false;
  }

  getActiveJob(debateId: string): GenerationJob | undefined {
    for (const job of this.jobs.values()) {
      if (job.debateId === debateId && (job.status === 'queued' || job.status === 'generating')) {
        return job;
      }
    }
    return undefined;
  }

  addSSEListener(debateId: string, callback: (event: ServerSseEvent) => void): () => void {
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

  private emitSSE(debateId: string, event: ServerSseEvent): void {
    const listeners = this.sseListeners.get(debateId);
    if (listeners) {
      listeners.forEach((callback) => callback(event));
    }
  }
}

const queue = new GenerationQueue();

export function getGenerationQueue(): GenerationQueue {
  return queue;
}
