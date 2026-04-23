import { useState, useEffect, useRef, useCallback, useReducer, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Masthead, Eyebrow, Pill, Button } from '../components';
import { PhaseStrip } from '../components/debate/PhaseStrip';
import { TurnRow } from '../components/debate/TurnRow';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useDebateSse, type DebateConnectionStatus } from '../hooks/useDebateSse';
import type { AgentRole, DebateStructure } from '../types';
import {
  buildSchedule,
  flattenAgentSteps,
  countCommittedAgentTurns,
  activeScheduleSegmentIndex,
  maxCommittedAgentTurns,
} from '../lib/debateSchedule';
import { AUTO_ADVANCE_MS } from '../lib/constants';
import { apiUrl } from '../lib/apiBase';
import { missingKeysErrorPath, parseMissingKeys } from '../lib/apiErrors';
import {
  debateLiveReducer,
  getInitialDebateLiveUiState,
} from '../state/debateSseReducer';

function coerceStructure(data: Record<string, unknown>): DebateStructure {
  const s = data.structure as Partial<DebateStructure> | undefined;
  const total = Number(data.totalRounds) || 4;
  return {
    rounds: typeof s?.rounds === 'number' ? s.rounds : total,
    turnCap: typeof s?.turnCap === 'number' ? s.turnCap : 1_000_000,
    crossExAfterRound:
      typeof s?.crossExAfterRound === 'number' ? s.crossExAfterRound : Math.max(1, Math.floor(total / 2)),
    crossExEnabled: s?.crossExEnabled !== false,
    synthesisType: s?.synthesisType === 'judge+system' ? 'judge+system' : 'judge',
  };
}

export function LiveDebatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile, stackShell } = useBreakpoint();

  const [ui, dispatch] = useReducer(debateLiveReducer, undefined, () => getInitialDebateLiveUiState());
  const debate = ui.debate;
  const streamingText = ui.streamingText;
  const reasoningText = ui.reasoningText;
  const isStreaming = ui.isStreaming;
  const isThinking = ui.isThinking;
  const generationError = ui.generationError;
  const isAdvancing = ui.isAdvancing;
  const activeSearches = ui.activeSearches;
  const fullReadCount = ui.fullReadCount;
  const liveSources = ui.liveSources;
  const lastActivity = ui.lastActivity;
  const lastEventAt = ui.lastEventAt;

  // Redirect if no debate ID
  useEffect(() => {
    if (!id || id === 'undefined') {
      navigate('/error?reason=invalid-debate');
    }
  }, [id, navigate]);

  const [showClarifyInput, setShowClarifyInput] = useState(false);
  const [clarifyQuestion, setClarifyQuestion] = useState('');
  const [status, setStatus] = useState<'live' | 'paused'>('live');
  const [connectionStatus, setConnectionStatus] = useState<DebateConnectionStatus>('connecting');
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clarifyInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchDebate = useCallback(async () => {
    if (!id) return;
    try {
      const response = await fetch(apiUrl(`/api/debates/${id}`));
      if (response.ok) {
        const data = await response.json();
        dispatch({
          type: 'HYDRATE',
          debate: {
            topic: data.topic,
            phase: data.phase,
            round: data.round,
            totalRounds: data.totalRounds,
            turns: data.turns,
            status: data.status,
            structure: coerceStructure(data as Record<string, unknown>),
            agents: Array.isArray(data.agents) ? data.agents : [],
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch debate:', error);
    }
  }, [id, dispatch]);

  useDebateSse(id, dispatch, setConnectionStatus, fetchDebate);

  useEffect(() => {
    fetchDebate();
  }, [fetchDebate]);

  const handleNextTurn = useCallback(async () => {
    if (!id || isAdvancing) return;

    dispatch({ type: 'NEXT_START' });

    try {
      const response = await fetch(apiUrl(`/api/debates/${id}/next`), { method: 'POST' });

      if (response.status === 503) {
        const missing = await parseMissingKeys(response);
        navigate(missingKeysErrorPath(missing));
        dispatch({ type: 'NEXT_FAIL', message: 'Service unavailable' });
        return;
      }

      if (response.status === 409) {
        const errorData = await response.json().catch(() => ({}));
        const reason = (errorData as { reason?: string }).reason;
        dispatch({
          type: 'NEXT_FAIL',
          message:
            reason === 'schedule_complete'
              ? 'Debate schedule is complete.'
              : (errorData as { message?: string }).message || 'Cannot start next turn.',
        });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        dispatch({
          type: 'NEXT_FAIL',
          message: (errorData as { message?: string }).message || 'Failed to start next turn',
        });
      }
    } catch (error) {
      console.error('Failed to advance:', error);
      dispatch({ type: 'NEXT_NET_ERROR' });
    }
  }, [dispatch, id, isAdvancing, navigate]);

  // Auto-advance loop
  useEffect(() => {
    if (!debate || !id) return;

    if (
      status === 'live' &&
      debate.status === 'live' &&
      !isStreaming &&
      !isThinking &&
      activeSearches.length === 0 &&
      !isAdvancing &&
      connectionStatus === 'connected'
    ) {
      const timer = setTimeout(() => {
        handleNextTurn();
      }, AUTO_ADVANCE_MS);

      autoAdvanceTimeoutRef.current = timer;
      return () => clearTimeout(timer);
    }
  }, [
    debate,
    debate?.status,
    id,
    status,
    isStreaming,
    isThinking,
    activeSearches.length,
    isAdvancing,
    connectionStatus,
    handleNextTurn,
  ]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showClarifyInput && clarifyInputRef.current) {
      clarifyInputRef.current.focus();
    }
  }, [showClarifyInput]);

  const handleCancel = async () => {
    if (!id) return;

    try {
      await fetch(apiUrl(`/api/debates/${id}/cancel`), { method: 'POST' });
      dispatch({ type: 'RESET_STREAM_UI' });
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  const handleRetry = async () => {
    if (!id) return;

    dispatch({ type: 'RETRY_START' });

    try {
      const response = await fetch(apiUrl(`/api/debates/${id}/retry`), { method: 'POST' });

      if (response.status === 503) {
        const missing = await parseMissingKeys(response);
        navigate(missingKeysErrorPath(missing));
        dispatch({ type: 'RETRY_FAIL', message: 'Service unavailable' });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        dispatch({
          type: 'RETRY_FAIL',
          message: (errorData as { message?: string }).message || 'Retry failed',
        });
      }
    } catch (error) {
      console.error('Failed to retry:', error);
      dispatch({ type: 'RETRY_NET_ERROR' });
    }
  };

  const handleSubmitClarify = async () => {
    if (!clarifyQuestion.trim() || !id) return;

    try {
      await fetch(apiUrl(`/api/debates/${id}/turns`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clarifyQuestion, isModerator: true }),
      });
      setClarifyQuestion('');
      setShowClarifyInput(false);
      void fetchDebate();
    } catch (error) {
      console.error('Failed to submit question:', error);
    }
  };

  const handleEndDebate = async () => {
    if (!id) return;
    
    try {
      const response = await fetch(apiUrl(`/api/debates/${id}/complete`), { method: 'POST' });
      const data = await response.json();
      navigate(`/synthesis/${data.id}`);
    } catch (error) {
      console.error('Failed to end debate:', error);
    }
  };

  const segments = useMemo(
    () => (debate ? buildSchedule(debate.structure) : []),
    [debate],
  );
  const scheduleSteps = useMemo(() => flattenAgentSteps(segments), [segments]);

  if (!debate) {
    return (
      <div style={{
        width: '100%',
        minHeight: '100vh',
        background: 'var(--paper)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-ui)',
      }}>
        Loading...
      </div>
    );
  }

  const isCrossEx = debate.phase === 'Cross-Ex';
  const committed = countCommittedAgentTurns(debate.turns);
  const agentTurnCap = maxCommittedAgentTurns(debate.structure);
  const activeSegIdx = activeScheduleSegmentIndex(
    debate.structure,
    debate.turns,
    debate.status,
    debate.phase,
  );

  // Check which role is currently generating (including searches and queueing)
  const isGenerating = isStreaming || isThinking || activeSearches.length > 0 || isAdvancing;
  const nextRoleForRow =
    isGenerating && committed < agentTurnCap && committed < scheduleSteps.length
      ? scheduleSteps[committed].role
      : null;
  const nextAgent =
    nextRoleForRow != null ? debate.agents.find((a) => a.role === nextRoleForRow) : undefined;

  // Determine which turn is currently being generated
  const generatingTurnIndex = isGenerating ? debate.turns.length : -1;

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--paper)',
      color: 'var(--ink-900)',
      fontFamily: 'var(--font-body)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Masthead
        title="DEBATER"
        edition={`LIVE · ${new Date().toISOString().slice(0, 10).toUpperCase()}`}
        compact={stackShell}
        right={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Pill>Mode · Balanced</Pill>
            {connectionStatus === 'connected' && (
              <Pill variant="accent">● Live</Pill>
            )}
            {connectionStatus === 'connecting' && (
              <Pill variant="accent">◐ Connecting…</Pill>
            )}
            {connectionStatus === 'reconnecting' && (
              <Pill variant="accent">◐ Reconnecting…</Pill>
            )}
            {connectionStatus === 'disconnected' && (
              <Pill variant="accent">● Disconnected</Pill>
            )}
          </div>
        }
      />

      {/* Topic band */}
      <div style={{ padding: '28px var(--pad-x) 24px', borderBottom: '1px solid var(--ink-200)' }}>
        <Eyebrow accent>Topic · Debate #{(id || '').slice(0, 8).toUpperCase()}</Eyebrow>
        <h1 style={{
          margin: '6px 0 0',
          fontSize: 'var(--fs-title)',
          lineHeight: 1.08,
          maxWidth: 900,
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          overflowWrap: 'break-word',
        }}>
          {debate.topic}
        </h1>
        <div style={{ marginTop: 20, display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
          <PhaseStrip segments={segments} activeSegmentIndex={activeSegIdx} />
          <div style={{ flex: 1, height: 1, background: 'var(--ink-200)', minWidth: 40 }} />
          <div className="t-meta" style={{ color: 'var(--ink-700)' }}>
            Round {String(debate.round).padStart(2, '0')} / {String(debate.totalRounds).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {generationError && (
        <div style={{
          background: 'var(--skeptic-bg)',
          border: '1px solid var(--skeptic)',
          padding: '16px 20px',
          margin: '24px var(--pad-x) 0',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ color: 'var(--skeptic)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
            ⚠ {generationError}
          </span>
          <Button size="sm" variant="secondary" onClick={handleRetry}>
            ↻ Retry
          </Button>
        </div>
      )}

      {/* Main content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 32,
        padding: stackShell ? '24px var(--pad-x)' : '32px var(--pad-x)',
        flex: 1,
      }}>
        <div>
          {/* Chronological turn stack */}
          {debate.turns.map((turn, i) => (
            <TurnRow
              key={turn.id || i}
              turn={turn}
              isGenerating={isGenerating && i === generatingTurnIndex}
              streamingText={isGenerating && i === generatingTurnIndex ? streamingText : ''}
              reasoningText={isGenerating && i === generatingTurnIndex ? reasoningText : ''}
              isThinking={isGenerating && i === generatingTurnIndex ? isThinking : false}
              searches={isGenerating && i === generatingTurnIndex ? activeSearches : []}
              isMobile={isMobile}
              agents={debate.agents}
              fullReadCount={fullReadCount}
              lastActivity={isGenerating && i === generatingTurnIndex ? lastActivity : null}
              lastEventAt={isGenerating && i === generatingTurnIndex ? lastEventAt : 0}
              citationSources={
                isGenerating && i === generatingTurnIndex && liveSources.length > 0
                  ? liveSources
                  : undefined
              }
            />
          ))}

          {/* Active generation row */}
          {isGenerating && nextRoleForRow != null && (
            <TurnRow
              turn={{
                id: 'generating',
                n: debate.turns.length + 1,
                role: nextRoleForRow as AgentRole,
                phase: debate.phase,
                text: '',
                timestamp: new Date().toISOString(),
                style: nextAgent?.style,
                model: nextAgent?.model,
              }}
              isGenerating={true}
              streamingText={streamingText}
              reasoningText={reasoningText}
              isThinking={isThinking}
              searches={activeSearches}
              isMobile={isMobile}
              agents={debate.agents}
              fullReadCount={fullReadCount}
              lastActivity={lastActivity}
              lastEventAt={lastEventAt}
              citationSources={liveSources.length > 0 ? liveSources : undefined}
            />
          )}
        </div>
      </div>

      {/* Transport */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        borderTop: '1px solid var(--ink-900)',
        background: 'var(--paper)',
        padding: '14px var(--pad-x)',
        display: 'flex',
        gap: isMobile ? 10 : 20,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <div className="t-meta">Transport</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="sm"
            variant={status === 'paused' ? 'primary' : 'ghost'}
            onClick={() => setStatus(status === 'live' ? 'paused' : 'live')}
          >
            {status === 'paused' ? '❚❚ Resume' : '❚❚ Pause'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleNextTurn}
            disabled={isAdvancing || isStreaming || status === 'live'}
          >
            {isAdvancing ? 'Queueing…' : 'Next ▷'}
          </Button>
        </div>

        {/* Cancel button */}
        {(isStreaming || isThinking) && (
          <Button 
            size="sm" 
            variant="accent" 
            onClick={handleCancel}
            style={{ color: 'var(--paper)' }}
          >
            ■ Stop
          </Button>
        )}

        {/* Ask Clarifying Question - only during Cross-Ex */}
        {isCrossEx && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!showClarifyInput ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowClarifyInput(true)}
              >
                ? Ask Clarifying Question
              </Button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <textarea
                  ref={clarifyInputRef}
                  value={clarifyQuestion}
                  onChange={(e) => setClarifyQuestion(e.target.value)}
                  placeholder="Type your clarifying question..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitClarify();
                    }
                    if (e.key === 'Escape') {
                      setShowClarifyInput(false);
                      setClarifyQuestion('');
                    }
                  }}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    padding: '8px 12px',
                    border: '1px solid var(--ink-900)',
                    background: 'var(--paper-0)',
                    color: 'var(--ink-900)',
                    borderRadius: 0,
                    minWidth: 280,
                    maxWidth: 400,
                    resize: 'none',
                    outline: 'none',
                  }}
                  rows={2}
                />
                <Button size="sm" variant="primary" onClick={handleSubmitClarify}>
                  Ask
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setShowClarifyInput(false);
                  setClarifyQuestion('');
                }}>
                  ×
                </Button>
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1 }} />
        <div className="t-mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>
          {committed} / {agentTurnCap} agent turns
        </div>
        <Button size="sm" variant="secondary" onClick={handleEndDebate}>
          End & Synthesize →
        </Button>
      </div>
    </div>
  );
}
