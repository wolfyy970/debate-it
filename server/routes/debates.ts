import { Router } from 'express';
import type { Request, Response } from 'express';
import { createDebateInstance, getDebateStore, generateId } from '../lib/store';
import { generateResponse, checkApiKeys } from '../lib/openrouter';
import { getGenerationQueue } from '../lib/generation-queue';
import { resolveNextAgentForTurn } from '../lib/debate-phase';
import { SSE_HEARTBEAT_MS } from '../lib/constants';
import {
  buildSynthesisMessages,
  generateFallbackSynthesis,
  parseSynthesisJsonFromModelText,
} from '../lib/synthesis';
import { validate, validateId, getRouteParamId } from '../middleware/validation';
import { sendApiError } from '../lib/http-errors.js';
import { writeSseData } from '../lib/sse-writer.js';

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
        return sendApiError(res, 400, 'Validation Error', 'At least 2 agents are required');
      }

      // Validate each agent
      for (const agent of agents) {
        if (!agent.role || !agent.style || !agent.model || !agent.provider) {
          return sendApiError(
            res,
            400,
            'Validation Error',
            'Each agent must have role, style, model, and provider',
          );
        }
      }

      // Check API keys
      const keys = checkApiKeys();
      if (!keys.hasAny) {
        return sendApiError(
          res,
          503,
          'Service Unavailable',
          'No LLM API keys configured. Set OPENROUTER_API_KEY or KIMI_API_KEY.',
        );
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
      return sendApiError(res, 500, 'Internal Server Error', 'Failed to create debate');
    }
  }
);

// Get debate by ID
router.get('/:id', validateId, (req: Request, res: Response) => {
  const debate = getDebateStore().get(getRouteParamId(req)!);
  if (!debate) {
    return sendApiError(res, 404, 'Not Found', 'Debate not found');
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
      const debate = getDebateStore().get(getRouteParamId(req)!);
      if (!debate) {
        return sendApiError(res, 404, 'Not Found', 'Debate not found');
      }

      // Only allow moderator questions during Cross-Ex phase
      if (debate.phase !== 'Cross-Ex') {
        return sendApiError(
          res,
          400,
          'Validation Error',
          'Clarifying questions are only allowed during Cross-Examination phase',
        );
      }

      const { text, isModerator } = req.body;

      const turn = {
        id: generateId('turn'),
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
      return sendApiError(res, 500, 'Internal Server Error', 'Failed to add turn');
    }
  }
);

// Next turn — async enqueue
router.post('/:id/next', validateId, async (req: Request, res: Response) => {
  try {
    const debate = getDebateStore().get(getRouteParamId(req)!);
    if (!debate) {
      return sendApiError(res, 404, 'Not Found', 'Debate not found');
    }

    if (debate.status !== 'live') {
      return sendApiError(res, 400, 'Validation Error', 'Debate is not live');
    }

    // Check if there's already an active generation
    const queue = getGenerationQueue();
    const activeJob = queue.getActiveJob(debate.id);
    if (activeJob) {
      return sendApiError(res, 409, 'Conflict', 'A generation is already in progress', {
        jobId: activeJob.id,
      });
    }

    // Check API keys
    const keys = checkApiKeys();
    if (!keys.hasAny) {
      return sendApiError(
        res,
        503,
        'Service Unavailable',
        'No LLM API keys configured. Set OPENROUTER_API_KEY or KIMI_API_KEY.',
      );
    }

    const nextAgent = resolveNextAgentForTurn(debate);

    if (!nextAgent) {
      return sendApiError(res, 500, 'Internal Server Error', 'No agent found for next turn');
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
    return sendApiError(res, 500, 'Internal Server Error', 'Failed to queue next turn');
  }
});

// SSE stream — persistent with real-time events
router.get('/:id/stream', validateId, async (req: Request, res: Response) => {
  const debate = getDebateStore().get(getRouteParamId(req)!);
  if (!debate) {
    sendApiError(res, 404, 'Not Found', 'Debate not found');
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial state
  writeSseData(res, { type: 'start', debateId: debate.id });

  // Send existing turns
  debate.turns.forEach((turn) => {
    writeSseData(res, { type: 'turn', turn: { ...turn } as Record<string, unknown> });
  });

  // Send current phase info
  writeSseData(res, { type: 'phase', phase: debate.phase, round: debate.round });

  // Set up heartbeat
  const heartbeatInterval = setInterval(() => {
    writeSseData(res, { type: 'ping' });
  }, SSE_HEARTBEAT_MS);

  // Set up SSE listener for this debate
  const queue = getGenerationQueue();
  const unsubscribe = queue.addSSEListener(debate.id, (event) => {
    writeSseData(res, event);
  });

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    unsubscribe();
  });
});

// Cancel active generation
router.post('/:id/cancel', validateId, (req: Request, res: Response) => {
  const debate = getDebateStore().get(getRouteParamId(req)!);
  if (!debate) {
    return sendApiError(res, 404, 'Not Found', 'Debate not found');
  }

  const queue = getGenerationQueue();
  const cancelled = queue.cancelByDebate(debate.id);

  if (cancelled) {
    res.json({
      message: 'Generation cancelled',
      timestamp: new Date().toISOString(),
    });
  } else {
    return sendApiError(res, 400, 'Bad Request', 'No active generation to cancel');
  }
});

// Retry failed/cancelled turn
router.post('/:id/retry', validateId, async (req: Request, res: Response) => {
  try {
    const debate = getDebateStore().get(getRouteParamId(req)!);
    if (!debate) {
      return sendApiError(res, 404, 'Not Found', 'Debate not found');
    }

    if (debate.status !== 'live') {
      return sendApiError(res, 400, 'Validation Error', 'Debate is not live');
    }

    // Check API keys
    const keys = checkApiKeys();
    if (!keys.hasAny) {
      return sendApiError(
        res,
        503,
        'Service Unavailable',
        'No LLM API keys configured. Set OPENROUTER_API_KEY or KIMI_API_KEY.',
      );
    }

    const queue = getGenerationQueue();
    const activeJob = queue.getActiveJob(debate.id);
    if (activeJob) {
      return sendApiError(res, 409, 'Conflict', 'A generation is already in progress', {
        jobId: activeJob.id,
      });
    }

    // Remove the last turn if it exists (retry the most recent)
    if (debate.turns.length > 0) {
      const lastTurn = debate.turns[debate.turns.length - 1];
      
      // Determine which agent should go next based on the turn we're retrying
      const nextAgent = debate.agents.find(a => a.role === lastTurn.role) || debate.agents[0];
      
      if (!nextAgent) {
        return sendApiError(res, 500, 'Internal Server Error', 'No agent found for retry');
      }

      // Remove the last turn
      debate.turns.pop();

      // Enqueue generation
      const jobId = queue.enqueue(debate.id, nextAgent, debate);

      getDebateStore().set(debate.id, debate);

      res.status(202).json({
        jobId,
        status: 'queued',
        message: 'Retry queued',
        timestamp: new Date().toISOString(),
      });
    } else {
      return sendApiError(res, 400, 'Bad Request', 'No turns to retry');
    }
  } catch (error) {
    console.error('Retry error:', error);
    return sendApiError(res, 500, 'Internal Server Error', 'Failed to retry turn');
  }
});

// Complete debate and generate synthesis
router.post('/:id/complete', validateId, async (req: Request, res: Response) => {
  try {
    const debate = getDebateStore().get(getRouteParamId(req)!);
    if (!debate) {
      return sendApiError(res, 404, 'Not Found', 'Debate not found');
    }

    // Check API keys
    const keys = checkApiKeys();
    
    debate.status = 'complete';
    debate.phase = 'Synthesis';

    let synthesis;

    if (keys.hasAny) {
      // Generate real synthesis via LLM
      const judgeAgent = debate.agents.find(a => a.role === 'Judge') || debate.agents[0];
      
      const synthesisMessages = buildSynthesisMessages(debate);

      try {
        const synthesisText = await generateResponse(judgeAgent.model, synthesisMessages);
        synthesis = parseSynthesisJsonFromModelText(synthesisText);
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
    return sendApiError(res, 500, 'Internal Server Error', 'Failed to complete debate');
  }
});

export default router;
