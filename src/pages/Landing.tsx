import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Masthead, Button } from '../components';
import { useBreakpoint } from '../hooks/useBreakpoint';

const SUGGESTIONS = [
  'Should tenure be abolished in research universities?',
  'Is consumer-grade genetic testing a net social good?',
  'Should AI-generated images be legally watermarked?',
  'Is a universal basic income economically viable in 2030?',
  'Should we colonize Mars within the century?',
];

export function LandingPage() {
  const navigate = useNavigate();
  const { isMobile, isTablet, stackShell } = useBreakpoint();
  const [topic, setTopic] = useState('');

  const handleBegin = () => {
    if (topic.trim()) {
      navigate('/setup', { state: { topic: topic.trim() } });
    }
  };

  const handleSuggestion = (suggestion: string) => {
    navigate('/setup', { state: { topic: suggestion } });
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--paper)',
      color: 'var(--ink-900)',
      fontFamily: 'var(--font-body)',
    }}>
      <Masthead
        title="DEBATER"
        edition="VOL. I \u00b7 NO. 01"
        compact={stackShell}
      />

      {/* Hero */}
      <div style={{ padding: 'var(--pad-y) var(--pad-x) 0' }}>
        {/* Tagline */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-500)',
          marginBottom: 24,
        }}>
          A Reasoning Instrument \u2014 Not a Chatbot
        </div>

        {/* Headline + description row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: stackShell ? '1fr' : '1fr 320px',
          gap: stackShell ? 24 : 60,
          alignItems: 'start',
        }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              fontSize: 'var(--fs-display)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              margin: 0,
              overflowWrap: 'break-word',
            }}>
              Ask a hard
              {!isMobile && <br />}
              question.
            </h1>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              fontSize: 'var(--fs-display)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              fontStyle: 'italic',
              color: 'var(--accent)',
              marginTop: 4,
              overflowWrap: 'break-word',
            }}>
              Let them argue.
            </div>
          </div>

          <div style={{ paddingTop: stackShell ? 0 : 16 }}>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              lineHeight: 1.6,
              color: 'var(--ink-700)',
              margin: '0 0 20px 0',
            }}>
              Debater runs multiple agents under structured rules \u2014 Advocate, Skeptic, Judge \u2014 to produce not more conversation, but <em>insight</em>: summaries, trade-offs, and defensible conclusions.
            </p>
            <div className="t-mono" style={{
              fontSize: 10,
              color: 'var(--ink-500)',
              letterSpacing: '0.06em',
            }}>
              v0.1 \u00b7 MVP \u00b7 Apr 2026
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--ink-200)', margin: 'var(--pad-y) var(--pad-x) 0' }} />

      {/* Input section */}
      <div style={{ padding: 'var(--pad-y) var(--pad-x)' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-500)',
          marginBottom: 16,
        }}>
          \u00a7 Begin
        </div>

        <div style={{
          display: 'flex',
          gap: 16,
          alignItems: 'flex-end',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleBegin();
              }}
              placeholder="What question would you like debated?"
              style={{
                width: '100%',
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--fs-input)',
                fontWeight: 400,
                lineHeight: 1.2,
                color: 'var(--ink-900)',
                background: 'transparent',
                border: 'none',
                borderBottom: '2px solid var(--ink-900)',
                padding: '8px 0 12px',
                outline: 'none',
                letterSpacing: '-0.01em',
              }}
            />
          </div>
          <Button
            size="lg"
            onClick={handleBegin}
            disabled={!topic.trim()}
            style={{
              minWidth: isMobile ? '100%' : 120,
              borderRadius: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Begin \u2192
          </Button>
        </div>

        {/* Suggestions */}
        <div style={{ marginTop: 28 }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--ink-500)',
            marginBottom: 12,
          }}>
            Or Try \u2014
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestion(suggestion)}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  lineHeight: 1.4,
                  color: 'var(--ink-700)',
                  background: 'transparent',
                  border: '1px solid var(--ink-200)',
                  padding: '8px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s',
                  flex: isMobile ? '1 1 100%' : '0 1 auto',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.borderColor = 'var(--ink-900)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.borderColor = 'var(--ink-200)';
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--ink-200)', margin: '0 var(--pad-x)' }} />

      {/* How it works */}
      <div style={{ padding: 'var(--pad-y) var(--pad-x)' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-500)',
          marginBottom: 16,
        }}>
          \u00a7 How It Works
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 400,
          fontSize: 'var(--fs-title)',
          lineHeight: 1.2,
          margin: '0 0 var(--gap-md) 0',
          maxWidth: 700,
          overflowWrap: 'break-word',
        }}>
          Structured rounds. Defined roles. One synthesis at the end.
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          gap: 'var(--gap-md)',
        }}>
          {[
            {
              num: '01',
              title: 'Frame the question',
              desc: 'Pick a mode \u2014 balanced, adversarial, decision. Configure the agents or accept the defaults.',
            },
            {
              num: '02',
              title: 'Watch them debate',
              desc: 'Opening statements, cross-examination, rebuttals, finals. Each turn is capped, each role constrained.',
            },
            {
              num: '03',
              title: 'Read the insight',
              desc: 'A judge synthesizes: key arguments, agreements, open questions, and a confidence score.',
            },
          ].map((step) => (
            <div key={step.num}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 400,
                fontSize: 'var(--fs-quote)',
                lineHeight: 1,
                color: 'var(--accent)',
                marginBottom: 12,
              }}>
                {step.num}
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: 18,
                margin: '0 0 8px 0',
              }}>
                {step.title}
              </h3>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                lineHeight: 1.6,
                color: 'var(--ink-600)',
                margin: 0,
              }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--ink-200)', margin: '0 var(--pad-x)' }} />

      {/* Quote */}
      <div style={{ padding: 'var(--pad-y) var(--pad-x)', textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-500)',
          marginBottom: 24,
        }}>
          Product Principle \u00b7 10
        </div>
        <blockquote style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 400,
          fontSize: 'var(--fs-quote)',
          lineHeight: 1.2,
          fontStyle: 'italic',
          margin: 0,
          maxWidth: 700,
          marginLeft: 'auto',
          marginRight: 'auto',
          overflowWrap: 'break-word',
        }}>
          "The debate is not the product.
          <br />
          The <span style={{ color: 'var(--accent)' }}>insight</span> is."
        </blockquote>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--ink-200)', margin: '0 var(--pad-x)' }} />

      {/* Footer */}
      <div style={{
        padding: '16px var(--pad-x)',
        borderTop: '1px solid var(--ink-200)',
      }}>
        <div className="t-mono" style={{ fontSize: 10, color: 'var(--ink-500)' }}>
          DEBATER v0.1 \u00b7 MVP \u00b7 Apr 2026
        </div>
      </div>
    </div>
  );
}
