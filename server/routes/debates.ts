import { Router, Request, Response } from 'express';
import { createDebateInstance, getDebateStore, generateId } from '../lib/store';
import { generateResponse, checkApiKeys } from '../lib/openrouter';
import { getGenerationQueue } from '../lib/generation-queue';
import { countTokens } from '../lib/tokenizer';
import { validate, validateId } from '../middleware/validation';

const router = Router();

// Create new debate
router.post(
  '/',
  validate([
    { field: 'topic', required: true, type: 'string', minLength: 1, maxLength: 500 },
    { field: 'mode', required: true, type: 'string' },
    { field: 'agents', required: true, type: 'array' },
    { field: 'toggles', required: true, type: 'object' },
    { field: 'structure', required: true, type: 'object' },
  ]),
  async (req: Request, res: Response) => {
    try {
      const { topic, mode, agents, toggles, structure } = req.body;

      // Validate agents array
      if (!Array.isArray(agents) || agents.length < 2) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'At least 2 agents are required',
          timestamp: new Date().toISOString(),
        });
      }

      // Validate each agent
      for (const agent of agents) {
        if (!agent.role || !agent.style || !agent.model || !agent.provider) {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'Each agent must have role, style, model, and provider',
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Check API keys
      const keys = checkApiKeys();
      if (!keys.hasAny) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'No LLM API keys configured. Set OPENROUTER_API_KEY or KIMI_API_KEY.',
          timestamp: new Date().toISOString(),
        });
      }

      const debate = createDebateInstance({
        topic,
        mode,
        agents,
        toggles,
        structure,
      });

      res.status(201).json(debate);
    } catch (error) {
      console.error('Create debate error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create debate',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Get debate by ID
router.get('/:id', validateId, (req: Request, res: Response) => {
  const debate = getDebateStore().get(req.params.id);
  if (!debate) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Debate not found',
      timestamp: new Date().toISOString(),
    });
  }
  res.json(debate);
});

// Add a turn (moderator question)
router.post(
  '/:id/turns',
  validateId,
  validate([
    { field: 'text', required: true, type: 'string', minLength: 1, maxLength: 2000 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const debate = getDebateStore().get(req.params.id);
      if (!debate) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Debate not found',
          timestamp: new Date().toISOString(),
        });
      }

      // Only allow moderator questions during Cross-Ex phase
      if (debate.phase !== 'Cross-Ex') {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Clarifying questions are only allowed during Cross-Examination phase',
          timestamp: new Date().toISOString(),
        });
      }

      const { text, isModerator } = req.body;

      const turn = {
        id: generateId(),
        n: debate.turns.length + 1,
        role: 'Moderator' as const,
        phase: debate.phase,
        text,
        timestamp: new Date().toISOString(),
        isModerator: isModerator !== false,
      };

      debate.turns.push(turn);
      getDebateStore().set(debate.id, debate);

      res.status(201).json(debate);
    } catch (error) {
      console.error('Add turn error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to add turn',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Next turn — async enqueue
router.post('/:id/next', validateId, async (req: Request, res: Response) => {
  try {
    const debate = getDebateStore().get(req.params.id);
    if (!debate) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Debate not found',
        timestamp: new Date().toISOString(),
      });
    }

    if (debate.status !== 'live') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Debate is not live',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if there's already an active generation
    const queue = getGenerationQueue();
    const activeJob = queue.getActiveJob(debate.id);
    if (activeJob) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A generation is already in progress',
        jobId: activeJob.id,
        timestamp: new Date().toISOString(),
      });
    }

    // Check API keys
    const keys = checkApiKeys();
    if (!keys.hasAny) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'No LLM API keys configured. Set OPENROUTER_API_KEY or KIMI_API_KEY.',
        timestamp: new Date().toISOString(),
      });
    }

    // Determine whose turn it is. Advocate always goes first.
    let nextRole: string;
    if (debate.turns.length === 0) {
      nextRole = 'Advocate';
    } else {
      const lastRole = debate.turns[debate.turns.length - 1].role;
      nextRole = lastRole === 'Advocate' ? 'Skeptic' : 'Advocate';
    }
    const nextAgent = debate.agents.find(a => a.role === nextRole) || debate.agents[0];

    if (!nextAgent) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'No agent found for next turn',
        timestamp: new Date().toISOString(),
      });
    }

    // Enqueue generation job with full debate context
    const jobId = queue.enqueue(debate.id, nextAgent, debate);

    res.status(202).json({
      jobId,
      status: 'queued',
      message: 'Generation queued',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Next turn error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to queue next turn',
      timestamp: new Date().toISOString(),
    });
  }
});

// SSE stream — persistent with real-time events
router.get('/:id/stream', validateId, async (req: Request, res: Response) => {
  const debate = getDebateStore().get(req.params.id);
  if (!debate) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Debate not found',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial state
  res.write(`data: ${JSON.stringify({ type: 'start', debateId: debate.id })}
\n\n`);

  // Send existing turns
  debate.turns.forEach(turn => {
    res.write(`data: ${JSON.stringify({ type: 'turn', turn })}
\n\n`);
  });

  // Send current phase info
  res.write(`data: ${JSON.stringify({ type: 'phase', phase: debate.phase, round: debate.round })}
\n\n`);

  // Set up heartbeat
  const heartbeatInterval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping' })}
\n\n`);
  }, 15000);

  // Set up SSE listener for this debate
  const queue = getGenerationQueue();
  const unsubscribe = queue.addSSEListener(debate.id, (event) => {
    // Handle turn completion
    if (event.type === 'done') {
      const doneData = event.data as {
        text: string;
        reasoning?: string;
        tokenCount: number;
        agent: { role: string; style: string; model: string };
        sources?: { title: string; url: string; snippet?: string }[];
      };

      // Create and save the turn
      const turn = {
        id: generateId(),
        n: debate.turns.length + 1,
        role: doneData.agent.role as any,
        style: doneData.agent.style,
        model: doneData.agent.model,
        phase: debate.phase,
        text: doneData.text,
        reasoning: doneData.reasoning,
        sources: doneData.sources,
        timestamp: new Date().toISOString(),
      };

      debate.turns.push(turn);

      // Update phase/round logic
      if (debate.phase === 'Opening' && debate.turns.length % 2 === 0) {
        debate.phase = 'Cross-Ex';
      } else if (debate.phase === 'Cross-Ex' && debate.turns.length % 4 === 0) {
        debate.round++;
        if (debate.round > debate.totalRounds) {
          debate.phase = 'Final';
        } else {
          debate.phase = 'Opening';
        }
      } else if (debate.phase === 'Final') {
        debate.phase = 'Synthesis';
        debate.status = 'complete';
      }

      getDebateStore().set(debate.id, debate);

      // Send turn event with token count
      res.write(`data: ${JSON.stringify({
        type: 'turn',
        turn: { ...turn, tokenCount: doneData.tokenCount },
      })}
\n\n`);

      // Send phase change if applicable
      res.write(`data: ${JSON.stringify({
        type: 'phase-change',
        phase: debate.phase,
        round: debate.round,
        status: debate.status,
      })}
\n\n`);
    } else {
      // Forward other events (chunk, reasoning, error, cancelled)
      res.write(`data: ${JSON.stringify(event)}
\n\n`);
    }
  });

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    unsubscribe();
  });
});

// Cancel active generation
router.post('/:id/cancel', validateId, (req: Request, res: Response) => {
  const debate = getDebateStore().get(req.params.id);
  if (!debate) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Debate not found',
      timestamp: new Date().toISOString(),
    });
  }

  const queue = getGenerationQueue();
  const cancelled = queue.cancelByDebate(debate.id);

  if (cancelled) {
    res.json({
      message: 'Generation cancelled',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(400).json({
      error: 'Bad Request',
      message: 'No active generation to cancel',
      timestamp: new Date().toISOString(),
    });
  }
});

// Retry failed/cancelled turn
router.post('/:id/retry', validateId, async (req: Request, res: Response) => {
  try {
    const debate = getDebateStore().get(req.params.id);
    if (!debate) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Debate not found',
        timestamp: new Date().toISOString(),
      });
    }

    if (debate.status !== 'live') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Debate is not live',
        timestamp: new Date().toISOString(),
      });
    }

    // Check API keys
    const keys = checkApiKeys();
    if (!keys.hasAny) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'No LLM API keys configured. Set OPENROUTER_API_KEY or KIMI_API_KEY.',
        timestamp: new Date().toISOString(),
      });
    }

    // Remove the last turn if it exists (retry the most recent)
    if (debate.turns.length > 0) {
      const lastTurn = debate.turns[debate.turns.length - 1];
      
      // Determine which agent should go next based on the turn we're retrying
      const nextAgent = debate.agents.find(a => a.role === lastTurn.role) || debate.agents[0];
      
      if (!nextAgent) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'No agent found for retry',
          timestamp: new Date().toISOString(),
        });
      }

      // Remove the last turn
      debate.turns.pop();

      // Enqueue generation
      const queue = getGenerationQueue();
      const jobId = queue.enqueue(debate.id, nextAgent, debate);

      getDebateStore().set(debate.id, debate);

      res.status(202).json({
        jobId,
        status: 'queued',
        message: 'Retry queued',
        timestamp: new Date().toISOString(),
      });
    } else {
      // No turns to retry, just trigger next
      res.status(400).json({
        error: 'Bad Request',
        message: 'No turns to retry',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Retry error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retry turn',
      timestamp: new Date().toISOString(),
    });
  }
});

// Complete debate and generate synthesis
router.post('/:id/complete', validateId, async (req: Request, res: Response) => {
  try {
    const debate = getDebateStore().get(req.params.id);
    if (!debate) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Debate not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Check API keys
    const keys = checkApiKeys();
    
    debate.status = 'complete';
    debate.phase = 'Synthesis';

    let synthesis;

    if (keys.hasAny) {
      // Generate real synthesis via LLM
      const judgeAgent = debate.agents.find(a => a.role === 'Judge') || debate.agents[0];
      
      const synthesisMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        {
          role: 'system',
          content: `You are the Judge. Analyze this debate and produce a structured synthesis.

Guidelines:
- Be objective and evidence-based
- Identify genuine agreements
- Distinguish factual from values-based disagreements
- Note where evidence is lacking
- Issue a clear, reasoned verdict

Output format (JSON):
{
  "summary": "brief overview",
  "keyArguments": { "advocate": ["point 1", "point 2"], "skeptic": ["point 1", "point 2"] },
  "pointsOfAgreement": ["point 1"],
  "pointsOfDisagreement": ["point 1"],
  "unresolvedQuestions": ["question 1"],
  "verdict": "reasoned conclusion"
}`,
        },
        {
          role: 'user',
          content: `DEBATE TOPIC: ${debate.topic}\n\nTURNS:\n${debate.turns.map(t => 
            `[${t.role} - ${t.phase} #${t.n}]: ${t.text.substring(0, 500)}${t.text.length > 500 ? '...' : ''}`
          ).join('\n\n')}`,
        },
      ];

      try {
        const synthesisText = await generateResponse(judgeAgent.model, synthesisMessages);
        
        // Try to parse JSON from the response
        const jsonMatch = synthesisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          synthesis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse synthesis JSON');
        }
      } catch (error) {
        console.error('Synthesis generation failed, using fallback:', error);
        synthesis = generateFallbackSynthesis(debate);
      }
    } else {
      synthesis = generateFallbackSynthesis(debate);
    }

    debate.synthesis = synthesis;
    getDebateStore().set(debate.id, debate);

    res.json({ id: debate.id, synthesis });
  } catch (error) {
    console.error('Complete debate error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to complete debate',
      timestamp: new Date().toISOString(),
    });
  }
});

function generateFallbackSynthesis(debate: any) {
  const advocateTurns = debate.turns.filter((t: any) => t.role === 'Advocate');
  const skepticTurns = debate.turns.filter((t: any) => t.role === 'Skeptic');

  return {
    summary: "The debate explored the merits and challenges of the topic. Both sides presented evidence-based arguments, with the Advocate focusing on supporting data and the Skeptic examining implications and limitations.",
    keyArguments: {
      advocate: advocateTurns.slice(0, 3).map((t: any) => t.text.substring(0, 150) + '...'),
      skeptic: skepticTurns.slice(0, 3).map((t: any) => t.text.substring(0, 150) + '...'),
    },
    pointsOfAgreement: [
      "Both sides acknowledged the complexity of the issue",
      "Evidence-based reasoning is essential for sound conclusions",
    ],
    pointsOfDisagreement: [
      "The weight to assign different types of evidence",
      "The practical implications of the proposed position",
    ],
    unresolvedQuestions: [
      "What additional evidence would help resolve the key disagreements?",
      "How do we balance short-term and long-term considerations?",
    ],
    verdict: "The evidence supports a nuanced position that acknowledges both the potential benefits and the legitimate concerns raised during the debate.",
  };
}

export default router;
