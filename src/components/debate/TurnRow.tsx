import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Brain, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { Caret } from '../Caret';
import { CitationRef } from '../CitationRef';
import type { Turn, AgentRole, Agent, Source } from '../../types';
import type { GenerationLastActivity } from '../../state/debateSseReducer';
import { getRoleColorToken } from '../../theme/roleColors';
import { useStallHint } from '../../hooks/useStallHint';

export type ActiveSearch = {
  id: string;
  query: string;
  reason?: string;
  status: 'searching' | 'done' | 'error';
  results?: { title: string; url: string }[];
  errorMessage?: string;
  errorCode?: string;
};

function formatElapsed(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function searchCategoryLabel(code: string | undefined): string {
  switch (code) {
    case 'search_timeout':
      return 'timed out';
    case 'search_unavailable':
      return 'unavailable';
    case 'search_http':
      return 'API error';
    case 'search_error':
      return 'failed';
    default:
      return 'failed';
  }
}

function formatSearchFailureHint(searches: ActiveSearch[]): string | null {
  const failed = searches.filter((s) => s.status === 'error');
  const done = searches.filter((s) => s.status === 'done');
  if (failed.length === 0) return null;

  const total = searches.length;
  const f = failed.length;

  if (f === total) {
    return `${f} search${f === 1 ? '' : 'es'} failed — the model will proceed with general knowledge. Check server logs or search API quota if this persists.`;
  }

  if (f === 1 && total > 1 && failed[0]?.errorCode === 'search_timeout') {
    return `1 search timed out — continuing with partial results (${done.length} succeeded).`;
  }

  const cat = searchCategoryLabel(failed[0]?.errorCode);
  return `${f} of ${total} searches failed (${cat}) — continuing with partial results.`;
}

function activitySubtitle(
  lastActivity: GenerationLastActivity,
  hasSearches: boolean,
  currentSearchQuery: string,
): string {
  switch (lastActivity) {
    case 'searching':
      return currentSearchQuery ? `Searching · "${currentSearchQuery}"` : 'Searching…';
    case 'reading':
      return 'Reading page…';
    case 'writing':
      return 'Writing rebuttal…';
    case 'thinking':
      return 'Reasoning…';
    default:
      return hasSearches ? 'Preparing search…' : 'Waiting for stream…';
  }
}

function useElapsedTick(isGenerating: boolean, turnKey: string): number {
  const [sec, setSec] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isGenerating) {
      startRef.current = null;
      setSec(0);
      return;
    }
    startRef.current = Date.now();
    setSec(0);
    const id = window.setInterval(() => {
      if (startRef.current != null) {
        setSec(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [isGenerating, turnKey]);

  return sec;
}

function cleanText(text: string) {
  return text.replace(/\*\*/g, '').replace(/\*/g, '');
}

function renderParagraphWithCitations(
  paragraph: string,
  paraIndex: number,
  sources: Source[] | undefined,
  accent: string,
): ReactNode {
  const text = cleanText(paragraph);
  const re = /\[(\d+)\]/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const n = parseInt(m[1]!, 10);
    const src = sources && n >= 1 && n <= sources.length ? sources[n - 1] : undefined;
    nodes.push(<CitationRef key={`cite-${paraIndex}-${m.index}`} n={n} source={src} accentColor={accent} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return (
    <p key={paraIndex} style={{ margin: '0 0 12px 0' }}>
      {nodes}
    </p>
  );
}

export function TurnRow({
  turn,
  isGenerating,
  streamingText,
  reasoningText,
  isThinking,
  searches,
  isMobile,
  agents,
  fullReadCount = 0,
  lastActivity = null,
  lastEventAt = 0,
  citationSources,
}: {
  turn: Turn;
  isGenerating: boolean;
  streamingText: string;
  reasoningText?: string;
  isThinking?: boolean;
  searches?: ActiveSearch[];
  isMobile?: boolean;
  /** When set, style/model in the byline prefer setup (`agents`) over optional fields on `turn`. */
  agents?: Agent[];
  /** Successful full-page fetches (`read_url`) this generation; live rows only. */
  fullReadCount?: number;
  lastActivity?: GenerationLastActivity;
  lastEventAt?: number;
  /** Deduped sources for live `[N]` resolution (falls back to `turn.sources`). */
  citationSources?: Source[];
}) {
  const c = getRoleColorToken(turn.role as AgentRole);
  const [showReasoning, setShowReasoning] = useState(false);
  const elapsed = useElapsedTick(isGenerating, turn.id);
  const stallHint = useStallHint(lastEventAt ?? 0, isGenerating && (lastEventAt ?? 0) > 0);

  const configured = agents?.find((a) => a.role === turn.role);
  const styleRaw = configured?.style ?? turn.style;
  const modelRaw = configured?.model ?? turn.model;
  const debaterRole = turn.role === 'Advocate' || turn.role === 'Skeptic';
  const showStyleModel = debaterRole || !!styleRaw || !!modelRaw;
  const styleLabel = styleRaw ? styleRaw.toUpperCase() : 'DEFAULT';
  const modelLabel = modelRaw || 'System';

  const paragraphs = (text: string) => cleanText(text).split(/\n\n+/).filter((p) => p.trim());

  const displayText = isGenerating ? streamingText : turn.text;
  const displayReasoning = isGenerating ? reasoningText : turn.reasoning;

  const hasSearches = !!(searches && searches.length > 0);
  const anySearchActive = hasSearches && searches!.some((s) => s.status === 'searching');
  const searchErrorCount = hasSearches ? searches!.filter((s) => s.status === 'error').length : 0;
  const researchHeader =
    hasSearches ? (anySearchActive ? 'Researching' : 'Researched') : isThinking ? 'Thinking' : 'Researching';

  let currentSearchQuery = '';
  if (hasSearches) {
    const activeRev = [...searches!].reverse().find((s) => s.status === 'searching');
    if (activeRev?.query) currentSearchQuery = activeRev.query;
    else {
      const last = searches![searches!.length - 1];
      currentSearchQuery = last?.query || '';
    }
  }

  const uniqueSourceUrls = new Set<string>();
  if (hasSearches) {
    for (const s of searches!) {
      if (s.status !== 'done' || !s.results) continue;
      for (const r of s.results) {
        if (r.url) uniqueSourceUrls.add(r.url);
      }
    }
  }
  const uniqueSourceCount = uniqueSourceUrls.size;
  const allSearchesSettled = hasSearches && !anySearchActive;
  const allSearchesFailed = allSearchesSettled && searches!.every((s) => s.status === 'error');

  const resolvedSources =
    citationSources && citationSources.length > 0 ? citationSources : turn.sources;

  const searchFailureHint = hasSearches && searchErrorCount > 0 ? formatSearchFailureHint(searches!) : null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '44px 1fr' : '64px 1fr',
        gap: isMobile ? 12 : 20,
        padding: '24px 0',
        borderTop: '1px solid var(--ink-200)',
        opacity: isGenerating ? 0.7 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 4,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--ink-500)',
            letterSpacing: '0.02em',
          }}
        >
          #{String(turn.n).padStart(2, '0')}
        </div>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: c,
            marginTop: 2,
          }}
        />

        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: c,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            marginTop: 4,
          }}
        >
          {turn.role}
        </div>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            marginBottom: 12,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ color: c, fontWeight: 600 }}>{turn.role}</span>
          {showStyleModel && (
            <>
              <span style={{ color: 'var(--ink-300)' }}>·</span>
              <span style={{ color: 'var(--ink-500)' }}>{styleLabel}</span>
              <span style={{ color: 'var(--ink-300)' }}>—</span>
              <span style={{ color: 'var(--ink-500)' }}>{modelLabel}</span>
            </>
          )}
        </div>

        {isGenerating && (
          <div
            style={{
              marginBottom: 20,
              padding: '16px 20px',
              background: 'var(--paper-0)',
              border: '1px solid var(--ink-200)',
              borderLeft: `3px solid ${c}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
                flexWrap: 'wrap',
              }}
            >
              <Brain
                size={16}
                style={{
                  color: c,
                  animation:
                    isThinking || anySearchActive ? 'debater-blink 2s infinite' : 'none',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: c,
                  fontWeight: 600,
                }}
              >
                {researchHeader}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  color: 'var(--ink-600)',
                }}
              >
                · {formatElapsed(elapsed)}
              </span>
              {(isThinking || anySearchActive) && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--ink-500)',
                    animation: 'debater-blink 1.5s infinite',
                  }}
                >
                  …
                </span>
              )}
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.04em',
                color: 'var(--ink-600)',
                marginBottom: stallHint ? 8 : 14,
                lineHeight: 1.45,
              }}
            >
              {activitySubtitle(lastActivity ?? null, hasSearches, currentSearchQuery)}
            </div>

            {stallHint && (
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--ink-500)',
                  fontStyle: 'italic',
                  marginBottom: 14,
                  lineHeight: 1.45,
                }}
              >
                Model still working — complex rebuttals can take a minute.
              </div>
            )}

            {hasSearches && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: '10px 12px',
                  background: 'var(--paper)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {anySearchActive ? (
                    <Search size={14} style={{ color: 'var(--ink-600)', flexShrink: 0 }} />
                  ) : allSearchesFailed ? (
                    <AlertCircle size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  ) : (
                    <CheckCircle2 size={14} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                  )}
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color:
                        anySearchActive ? 'var(--ink-700)' : allSearchesFailed ? 'var(--ink-700)' : 'var(--ink-600)',
                    }}
                  >
                    {anySearchActive
                      ? `Searching… · ${searches!.length} ${searches!.length === 1 ? 'query' : 'queries'}`
                      : allSearchesFailed
                        ? `${searches!.length} ${searches!.length === 1 ? 'search' : 'searches'} · failed`
                        : `${searches!.length} ${searches!.length === 1 ? 'search' : 'searches'} · done`}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: 'var(--ink-600)',
                    lineHeight: 1.45,
                    fontStyle: 'italic',
                  }}
                >
                  {currentSearchQuery || 'Preparing query…'}
                </div>
                {uniqueSourceCount > 0 && (
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--ink-500)',
                      letterSpacing: '0.04em',
                      lineHeight: 1.45,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span>
                      {`${uniqueSourceCount} link${uniqueSourceCount === 1 ? '' : 's'} across searches — snippet previews only (not full pages).`}
                    </span>
                    <span>
                      {fullReadCount === 0
                        ? '0 full page reads (no link opened and loaded in full yet).'
                        : `${fullReadCount} full page read${fullReadCount === 1 ? '' : 's'} (link opened and page loaded in full).`}
                    </span>
                  </div>
                )}
                {searchFailureHint && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 6,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--ink-600)',
                      lineHeight: 1.4,
                    }}
                  >
                    <AlertCircle size={12} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
                    <span>{searchFailureHint}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--ink-100)' }}>
              <button
                type="button"
                onClick={() => setShowReasoning(!showReasoning)}
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
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
              >
                <span>{showReasoning ? '▼' : '▶'}</span>
                <span>Thinking Process</span>
                {isThinking && <span style={{ animation: 'debater-blink 1s infinite' }}>…</span>}
              </button>

              {!showReasoning && (displayReasoning || '').length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: 'var(--ink-500)',
                    fontStyle: 'italic',
                  }}
                >
                  {(displayReasoning || '').length > 200
                    ? (displayReasoning || '').slice(0, 200) + '…'
                    : displayReasoning}
                </div>
              )}
              {showReasoning && (
                <div
                  style={{
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
                  }}
                >
                  {displayReasoning || '—'}
                </div>
              )}
            </div>
          </div>
        )}

        <div
          style={{
            fontSize: 16,
            lineHeight: 1.58,
            color: 'var(--ink-900)',
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
          }}
        >
          {paragraphs(displayText).map((p, i) => renderParagraphWithCitations(p, i, resolvedSources, c))}
          {isGenerating && <Caret />}
        </div>

        {!isGenerating && displayReasoning && (
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setShowReasoning(!showReasoning)}
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
                background: 'none',
                border: 'none',
                padding: 0,
              }}
            >
              <span>{showReasoning ? '▼' : '▶'}</span>
              <span>Thinking Process</span>
            </button>

            {showReasoning && (
              <div
                style={{
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
                }}
              >
                {displayReasoning}
              </div>
            )}
          </div>
        )}

        {resolvedSources && resolvedSources.length > 0 && (
          <div
            style={{
              marginTop: 16,
              padding: '10px 14px',
              background: 'var(--paper-2)',
              borderLeft: `2px solid ${c}`,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-500)',
                marginBottom: 8,
              }}
            >
              Sources
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {resolvedSources.map((source, i) => (
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
