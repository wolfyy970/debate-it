import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Masthead, Eyebrow, Pill, Button } from '../components';
import { PhaseStrip } from '../components/debate/PhaseStrip';
import { TurnRow } from '../components/debate/TurnRow';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useDebateSse } from '../hooks/useDebateSse';
import type { AgentRole } from '../types';
import { getRoleColorToken } from '../theme/roleColors';
import { AUTO_ADVANCE_MS } from '../lib/constants';
import { apiUrl } from '../lib/apiBase';
import { missingKeysErrorPath, parseMissingKeys } from '../lib/apiErrors';
import {
  debateLiveReducer,
  getInitialDebateLiveUiState,
} from '../state/debateSseReducer';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export function LiveDebatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';

  const [ui, dispatch] = useReducer(debateLiveReducer, undefined, () => getInitialDebateLiveUiState());
  const debate = ui.debate;
  const streamingText = ui.streamingText;
  const reasoningText = ui.reasoningText;
  const isStreaming = ui.isStreaming;
  const isThinking = ui.isThinking;
  const generationError = ui.generationError;
  const isAdvancing = ui.isAdvancing;
  const activeSearches = ui.activeSearches;

  // Redirect if no debate ID
  useEffect(() => {
    if (!id || id === 'undefined') {
      navigate('/error?reason=invalid-debate');
    }
  }, [id, navigate]);

  const [showClarifyInput, setShowClarifyInput] = useState(false);
  const [clarifyQuestion, setClarifyQuestion] = useState('');
  const [status, setStatus] = useState<'live' | 'paused'>('live');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clarifyInputRef = useRef<HTMLTextAreaElement>(null);

  useDebateSse(id, dispatch, setConnectionStatus);

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
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch debate:', error);
    }
  }, [id]);

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
      !isStreaming &&
      !isThinking &&
      activeSearches.length === 0 &&
      debate.phase !== 'Synthesis' &&
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
  
  // Check which role is currently generating (including searches and queueing)
  const isGenerating = isStreaming || isThinking || activeSearches.length > 0 || isAdvancing;
  const currentRole = isGenerating 
    ? (debate.turns.length > 0 
      ? debate.turns[debate.turns.length - 1].role === 'Advocate' ? 'Skeptic' : 'Advocate'
      : 'Advocate')
    : null;

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
        right={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Pill>Mode · Balanced</Pill>
            <Pill variant="accent">● Live</Pill>
            {connectionStatus === 'connected' && (
              <Pill variant="ghost">● Connected</Pill>
            )}
            {connectionStatus === 'connecting' && (
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
          <PhaseStrip phase={debate.phase} />
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
        gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', 
        gap: isMobile ? 0 : 48,
        padding: isMobile ? '24px var(--pad-x)' : '32px var(--pad-x)',
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
            />
          ))}

          {/* Active generation row */}
          {isGenerating && (
            <TurnRow
              turn={{
                id: 'generating',
                n: debate.turns.length + 1,
                role: currentRole as AgentRole,
                phase: debate.phase,
                text: '',
                timestamp: new Date().toISOString(),
              }}
              isGenerating={true}
              streamingText={streamingText}
              reasoningText={reasoningText}
              isThinking={isThinking}
              searches={activeSearches}
              isMobile={isMobile}
            />
          )}
        </div>

        {/* Right sidebar - hidden on mobile */}
        {!isMobile && <aside style={{ paddingTop: 8 }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-500)',
            marginBottom: 20,
          }}>
            Live Ledger
          </div>

          {/* Points raised */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize: 16,
              marginBottom: 16,
            }}>
              Points raised
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {debate.turns
                .filter(t => !t.meta && t.text.length > 20)
                .slice(-6)
                .map((turn) => (
                  <div key={turn.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: getRoleColorToken(turn.role),
                    }}>
                      {turn.role}
                    </div>
                    <div style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: 'var(--ink-700)',
                    }}>
                      {turn.text.slice(0, 80)}{turn.text.length > 80 ? '...' : ''}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Simple stats */}
          <div style={{
            borderTop: '1px solid var(--ink-200)',
            paddingTop: 16,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-500)',
              marginBottom: 12,
            }}>
              Progress
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-ui" style={{ fontSize: 13, color: 'var(--ink-500)' }}>Turns</span>
                <span className="t-mono" style={{ fontSize: 12 }}>{debate.turns.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-ui" style={{ fontSize: 13, color: 'var(--ink-500)' }}>Phase</span>
                <span className="t-mono" style={{ fontSize: 12 }}>{debate.phase}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-ui" style={{ fontSize: 13, color: 'var(--ink-500)' }}>Round</span>
                <span className="t-mono" style={{ fontSize: 12 }}>{debate.round} / {debate.totalRounds}</span>
              </div>
            </div>
          </div>
        </aside>}
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
          {debate.turns.length} / ~{debate.totalRounds * 2 + 2} turns
        </div>
        <Button size="sm" variant="secondary" onClick={handleEndDebate}>
          End & Synthesize →
        </Button>
      </div>
    </div>
  );
}
