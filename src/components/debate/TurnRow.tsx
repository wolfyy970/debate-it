import { useState } from 'react';
import { Brain, Search, CheckCircle2 } from 'lucide-react';
import { Caret } from '../Caret';
import type { Turn, AgentRole } from '../../types';
import { getRoleColorToken } from '../../theme/roleColors';

export type ActiveSearch = {
  query: string;
  reason?: string;
  status: 'searching' | 'done';
  results?: { title: string; url: string }[];
};

export function TurnRow({
  turn,
  isGenerating,
  streamingText,
  reasoningText,
  isThinking,
  searches,
  isMobile,
}: {
  turn: Turn;
  isGenerating: boolean;
  streamingText: string;
  reasoningText?: string;
  isThinking?: boolean;
  searches?: ActiveSearch[];
  isMobile?: boolean;
}) {
  const c = getRoleColorToken(turn.role as AgentRole);
  const [showReasoning, setShowReasoning] = useState(false);

  const cleanText = (text: string) => text.replace(/\*\*/g, '').replace(/\*/g, '');
  const paragraphs = (text: string) => cleanText(text).split(/\n\n+/).filter((p) => p.trim());

  const displayText = isGenerating ? streamingText : turn.text;
  const displayReasoning = isGenerating ? reasoningText : turn.reasoning;

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
          <span style={{ color: 'var(--ink-300)' }}>·</span>
          <span style={{ color: 'var(--ink-500)' }}>{turn.style?.toUpperCase() || 'DEFAULT'}</span>
          <span style={{ color: 'var(--ink-300)' }}>—</span>
          <span style={{ color: 'var(--ink-500)' }}>{turn.model || 'System'}</span>
        </div>

        {(isGenerating && ((searches && searches.length > 0) || reasoningText)) && (
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
                marginBottom: searches && searches.length > 0 ? 12 : 0,
              }}
            >
              <Brain
                size={16}
                style={{
                  color: c,
                  animation: isThinking ? 'debater-blink 2s infinite' : 'none',
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
                {isThinking ? 'Thinking' : 'Researching'}
              </span>
              {isThinking && (
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

            {searches && searches.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searches.map((search, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      background: 'var(--paper)',
                      borderRadius: 0,
                    }}
                  >
                    {search.status === 'searching' ? (
                      <Search size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    ) : (
                      <CheckCircle2 size={13} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 14,
                          color: 'var(--ink-700)',
                          lineHeight: 1.4,
                          fontStyle: 'italic',
                        }}
                      >
                        {search.query}
                      </div>
                      {search.reason && (
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10,
                            color: 'var(--ink-500)',
                            lineHeight: 1.4,
                            marginTop: 2,
                          }}
                        >
                          {search.reason}
                        </div>
                      )}
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          color: search.status === 'searching' ? 'var(--accent)' : 'var(--ok)',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          marginTop: 2,
                        }}
                      >
                        {search.status === 'searching' ? 'Searching…' : 'Found results'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {reasoningText && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid var(--ink-100)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--ink-500)',
                  fontStyle: 'italic',
                }}
              >
                {reasoningText.length > 200 ? reasoningText.slice(0, 200) + '…' : reasoningText}
              </div>
            )}
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
          {paragraphs(displayText).map((p, i) => (
            <p key={i} style={{ margin: '0 0 12px 0' }}>
              {p}
            </p>
          ))}
          {isGenerating && <Caret />}
        </div>

        {displayReasoning && (
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

        {turn.sources && turn.sources.length > 0 && (
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
