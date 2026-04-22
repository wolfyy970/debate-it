import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Brain, Search, CheckCircle2 } from 'lucide-react';
import {
  Masthead,
  Eyebrow,
  Pill,
  Button,
  PhaseGlyph,
  Caret,
} from '../components';
import { useBreakpoint } from '../hooks/useBreakpoint';
import type { Phase, Turn, AgentRole } from '../types';

const PHASES: Phase[] = ['Opening', 'Cross-Ex', 'Rebuttal', 'Final', 'Synthesis'];

function getRoleColor(role: AgentRole): string {
  const colors: Record<AgentRole, string> = {
    Advocate: 'var(--advocate)',
    Skeptic: 'var(--skeptic)',
    Judge: 'var(--judge)',
    'Fact-checker': 'var(--factcheck)',
    Moderator: 'var(--ink-700)',
  };
  return colors[role] || 'var(--ink-700)';
}

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export function LiveDebatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';

  // Redirect if no debate ID
  useEffect(() => {
    if (!id || id === 'undefined') {
      navigate('/error?reason=invalid-debate');
    }
  }, [id, navigate]);

  const [debate, setDebate] = useState<{
    topic: string;
    phase: Phase;
    round: number;
    totalRounds: number;
    turns: Turn[];
    status: string;
  } | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [reasoningText, setReasoningText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const [showClarifyInput, setShowClarifyInput] = useState(false);
  const [clarifyQuestion, setClarifyQuestion] = useState('');
  const [status, setStatus] = useState<'live' | 'paused'>('live');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [activeSearches, setActiveSearches] = useState<{ query: string; reason?: string; status: 'searching' | 'done'; results?: { title: string; url: string }[] }[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clarifyInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchDebate = useCallback(async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/debates/${id}`);
      if (response.ok) {
        const data = await response.json();
        setDebate(data);
      }
    } catch (error) {
      console.error('Failed to fetch debate:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchDebate();
  }, [fetchDebate]);

  // Setup SSE with reconnect logic
  const setupSSE = useCallback(() => {
    if (!id) return;
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');
    
    const es = new EventSource(`/api/debates/${id}/stream`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'start':
            break;
          case 'turn':
            setDebate((prev) => {
              if (!prev) return prev;
              const exists = prev.turns.find(t => t.id === data.turn.id);
              if (exists) return prev;
              return {
                ...prev,
                turns: [...prev.turns, data.turn],
              };
            });
            setStreamingText('');
            setReasoningText('');
            setIsStreaming(false);
            setIsThinking(false);
            setIsAdvancing(false);
            setGenerationError(null);
            setActiveSearches([]);
            break;
          case 'chunk':
            setStreamingText((prev) => prev + data.data);
            setIsStreaming(true);
            setIsThinking(false);
            break;
          case 'reasoning':
            setReasoningText((prev) => prev + data.data);
            setIsThinking(true);
            break;
          case 'search_start':
            setActiveSearches((prev) => [...prev, {
              query: data.data?.query || '',
              reason: data.data?.reason || '',
              status: 'searching',
            }]);
            break;
          case 'search_update':
            setActiveSearches((prev) => {
              const lastSearch = prev[prev.length - 1];
              if (lastSearch && lastSearch.status === 'searching') {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastSearch,
                    query: data.data?.query || lastSearch.query,
                    reason: data.data?.reason || lastSearch.reason,
                  },
                ];
              }
              return prev;
            });
            break;
          case 'search_result':
            setActiveSearches((prev) => {
              const lastSearch = prev[prev.length - 1];
              if (lastSearch && lastSearch.status === 'searching') {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastSearch,
                    status: 'done',
                    results: data.data?.results || [],
                  },
                ];
              }
              return prev;
            });
            break;
          case 'done':
            setStreamingText('');
            setReasoningText('');
            setIsStreaming(false);
            setIsThinking(false);
            setIsAdvancing(false);
            setActiveSearches([]);
            setGenerationError(null);
            break;
          case 'error':
            setGenerationError(data.data?.message || 'Generation failed');
            setIsStreaming(false);
            setIsThinking(false);
            setIsAdvancing(false);
            break;
          case 'cancelled':
            setStreamingText('');
            setReasoningText('');
            setIsStreaming(false);
            setIsThinking(false);
            setIsAdvancing(false);
            break;
          case 'phase-change':
            setDebate((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                phase: data.phase,
                round: data.round,
                status: data.status || prev.status,
              };
            });
            break;
          case 'ping':
            break;
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    es.onerror = () => {
      setConnectionStatus('disconnected');
      es.close();
      
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        setupSSE();
      }, delay);
    };

    return () => {
      es.close();
    };
  }, [id]);

  useEffect(() => {
    const cleanup = setupSSE();
    return () => {
      cleanup?.();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [setupSSE]);

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
      }, 2000);
      
      autoAdvanceTimeoutRef.current = timer;
      return () => clearTimeout(timer);
    }
  }, [debate?.turns.length, status, isStreaming, isThinking, activeSearches.length, debate?.phase, isAdvancing, connectionStatus]);

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

  const handleNextTurn = async () => {
    if (!id || isAdvancing) return;
    
    setIsAdvancing(true);
    setGenerationError(null);
    
    try {
      const response = await fetch(`/api/debates/${id}/next`, { method: 'POST' });
      
      if (response.status === 503) {
        navigate('/error?reason=no-api-keys');
        setIsAdvancing(false);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setGenerationError(errorData.message || 'Failed to start next turn');
        setIsAdvancing(false);
      }
    } catch (error) {
      console.error('Failed to advance:', error);
      setGenerationError('Network error. Retrying...');
      setIsAdvancing(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    
    try {
      await fetch(`/api/debates/${id}/cancel`, { method: 'POST' });
      setStreamingText('');
      setReasoningText('');
      setIsStreaming(false);
      setIsThinking(false);
      setIsAdvancing(false);
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  const handleRetry = async () => {
    if (!id) return;
    
    setGenerationError(null);
    setIsAdvancing(true);
    
    try {
      const response = await fetch(`/api/debates/${id}/retry`, { method: 'POST' });
      
      if (response.status === 503) {
        navigate('/error?reason=no-api-keys');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setGenerationError(errorData.message || 'Retry failed');
        setIsAdvancing(false);
      }
    } catch (error) {
      console.error('Failed to retry:', error);
      setGenerationError('Network error during retry');
      setIsAdvancing(false);
    }
  };

  const handleSubmitClarify = async () => {
    if (!clarifyQuestion.trim() || !id) return;

    try {
      await fetch(`/api/debates/${id}/turns`, {
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
      const response = await fetch(`/api/debates/${id}/complete`, { method: 'POST' });
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
                timestamp: new Date(),
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
                      color: getRoleColor(turn.role),
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

// Single turn row — chronological stack layout
function TurnRow({ 
  turn, 
  isGenerating, 
  streamingText,
  reasoningText,
  isThinking,
  searches,
  isMobile
}: { 
  turn: Turn; 
  isGenerating: boolean; 
  streamingText: string;
  reasoningText?: string;
  isThinking?: boolean;
  searches?: { query: string; reason?: string; status: 'searching' | 'done'; results?: { title: string; url: string }[] }[];
  isMobile?: boolean;
}) {
  const c = getRoleColor(turn.role as AgentRole);
  const [showReasoning, setShowReasoning] = useState(false);
  
  const cleanText = (text: string) => text.replace(/\*\*/g, '').replace(/\*/g, '');
  const paragraphs = (text: string) => 
    cleanText(text).split(/\n\n+/).filter(p => p.trim());
  
  const displayText = isGenerating ? streamingText : turn.text;
  const displayReasoning = isGenerating ? reasoningText : turn.reasoning;
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '44px 1fr' : '64px 1fr',
      gap: isMobile ? 12 : 20,
      padding: '24px 0',
      borderTop: '1px solid var(--ink-200)',
      opacity: isGenerating ? 0.7 : 1,
    }}>
      {/* Left gutter */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 4,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--ink-500)',
          letterSpacing: '0.02em',
        }}>
          #{String(turn.n).padStart(2, '0')}
        </div>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: c,
          marginTop: 2,
        }} />
        
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: c,
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          marginTop: 4,
        }}>
          {turn.role}
        </div>
      </div>

      {/* Content */}
      <div>
        {/* Header line */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 12,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          <span style={{ color: c, fontWeight: 600 }}>{turn.role}</span>
          <span style={{ color: 'var(--ink-300)' }}>·</span>
          <span style={{ color: 'var(--ink-500)' }}>{turn.style?.toUpperCase() || 'DEFAULT'}</span>
          <span style={{ color: 'var(--ink-300)' }}>—</span>
          <span style={{ color: 'var(--ink-500)' }}>{turn.model || 'System'}</span>
        </div>

        {/* Thinking box */}
        {(isGenerating && (searches && searches.length > 0 || reasoningText)) && (
          <div style={{
            marginBottom: 20,
            padding: '16px 20px',
            background: 'var(--paper-0)',
            border: '1px solid var(--ink-200)',
            borderLeft: `3px solid ${c}`,
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: searches && searches.length > 0 ? 12 : 0,
            }}>
              <Brain 
                size={16} 
                style={{ 
                  color: c,
                  animation: isThinking ? 'debater-blink 2s infinite' : 'none',
                }} 
              />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: c,
                fontWeight: 600,
              }}>
                {isThinking ? 'Thinking' : 'Researching'}
              </span>
              {isThinking && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--ink-500)',
                  animation: 'debater-blink 1.5s infinite',
                }}>
                  …
                </span>
              )}
            </div>

            {/* Search queries */}
            {searches && searches.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searches.map((search, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: 'var(--paper)',
                    borderRadius: 0,
                  }}>
                    {search.status === 'searching' ? (
                      <Search size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    ) : (
                      <CheckCircle2 size={13} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 14,
                        color: 'var(--ink-700)',
                        lineHeight: 1.4,
                        fontStyle: 'italic',
                      }}>
                        {search.query}
                      </div>
                      {search.reason && (
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          color: 'var(--ink-500)',
                          lineHeight: 1.4,
                          marginTop: 2,
                        }}>
                          {search.reason}
                        </div>
                      )}
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: search.status === 'searching' ? 'var(--accent)' : 'var(--ok)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        marginTop: 2,
                      }}>
                        {search.status === 'searching' ? 'Searching…' : 'Found results'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reasoning preview */}
            {reasoningText && (
              <div style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid var(--ink-100)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--ink-500)',
                fontStyle: 'italic',
              }}>
                {reasoningText.length > 200 ? reasoningText.slice(0, 200) + '…' : reasoningText}
              </div>
            )}
          </div>
        )}

        {/* Text content */}
        <div style={{
          fontSize: 16,
          lineHeight: 1.58,
          color: 'var(--ink-900)',
          fontFamily: 'var(--font-display)',
          fontWeight: 400,
        }}>
          {paragraphs(displayText).map((p, i) => (
            <p key={i} style={{ margin: '0 0 12px 0' }}>{p}</p>
          ))}
          {isGenerating && <Caret />}
        </div>

        {/* Thinking process */}
        {(displayReasoning) && (
          <div style={{ marginTop: 16 }}>
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--ink-500)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
              onClick={() => setShowReasoning(!showReasoning)}
            >
              <span>{showReasoning ? '▼' : '▶'}</span>
              <span>Thinking Process</span>
              {isThinking && <span style={{ animation: 'debater-blink 1s infinite' }}>…</span>}
            </div>
            
            {showReasoning && (
              <div style={{
                marginTop: 10,
                padding: '12px 16px',
                background: 'var(--paper-2)',
                borderLeft: `2px solid ${c}`,
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--ink-500)',
                fontStyle: 'italic',
                fontFamily: 'var(--font-body)',
                whiteSpace: 'pre-wrap',
              }}>
                {displayReasoning}
              </div>
            )}
          </div>
        )}

        {/* Sources / Citations */}
        {turn.sources && turn.sources.length > 0 && (
          <div style={{
            marginTop: 16,
            padding: '10px 14px',
            background: 'var(--paper-2)',
            borderLeft: `2px solid ${c}`,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-500)',
              marginBottom: 8,
            }}>
              Sources
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {turn.sources.map((source, i) => (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: c,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>[{i + 1}]</span>
                  <span style={{ textDecoration: 'underline' }}>{source.title || source.url}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseStrip({ phase }: { phase: Phase }) {
  const idx = PHASES.indexOf(phase);
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {PHASES.map((p, i) => (
        <div
          key={p}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: i === idx ? 'var(--accent)' : i < idx ? 'var(--ink-700)' : 'var(--ink-300)',
            fontWeight: i === idx ? 600 : 400,
          }}
        >
          <PhaseGlyph phase={p} />
          <span className="t-meta" style={{ color: 'inherit' }}>{p}</span>
        </div>
      ))}
    </div>
  );
}
