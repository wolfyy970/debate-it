import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Masthead, Eyebrow, Byline, Button, Card } from '../components';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { apiUrl } from '../lib/apiBase';
import type { Turn } from '../types';

export function SynthesisPage() {
  const { id } = useParams<{ id: string }>();
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const [debate, setDebate] = useState<{
    topic: string;
    turns: Turn[];
    synthesis?: {
      summary: string;
      keyArguments: { advocate: string[]; skeptic: string[] };
      pointsOfAgreement: string[];
      pointsOfDisagreement: string[];
      unresolvedQuestions: string[];
      verdict?: string;
    };
  } | null>(null);

  useEffect(() => {
    if (id) {
      fetch(apiUrl(`/api/debates/${id}`))
        .then(res => res.json())
        .then(setDebate)
        .catch(console.error);
    }
  }, [id]);

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

  const synthesis = debate.synthesis || {
    summary: "The debate explored the merits and challenges of implementing a four-day workweek as national policy. Both sides agreed that productivity in knowledge work can be maintained or improved with reduced hours, but disagreed on whether the evidence base is sufficient to justify a nationwide mandate affecting all sectors.",
    keyArguments: {
      advocate: [
        "Productivity holds steady or rises in reduced-hour trials (Iceland, UK, Japan)",
        "Worker wellbeing and retention improve significantly",
        "Measure output, not hours — knowledge work should not be time-locked",
      ],
      skeptic: [
        "Evidence is limited to knowledge work — healthcare, logistics, schooling remain untested",
        "Coordination costs could outweigh productivity gains at national scale",
        "A four-day week for 30% of workers is a perk, not a policy",
      ],
    },
    pointsOfAgreement: [
      "Productivity in controlled knowledge-work trials is not harmed by reduced hours",
      "Worker satisfaction and retention improve in shorter-week arrangements",
      "The current evidence base is insufficient for continuous-operations sectors",
    ],
    pointsOfDisagreement: [
      "Whether national policy is the right instrument vs. voluntary adoption",
      "How to handle sectors that cannot easily adopt four-day weeks",
      "Whether the Skeptic's 'perk vs. policy' distinction is fatal to the Advocate's case",
    ],
    unresolvedQuestions: [
      "What does 'output' mean across different types of work?",
      "How would a national policy handle exemptions for essential services?",
      "What is the minimum viable evidence base to justify nationwide change?",
    ],
    verdict: "The evidence supports a voluntary adoption framework for knowledge-work sectors, with rigorous pilots for continuous-operations industries before any national mandate. The burden of proof for a universal four-day standard has not yet been met.",
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
        edition="SYNTHESIS"
      />

      <div style={{ padding: 'var(--pad-y) var(--pad-x)' }}>
        {/* Header */}
        <Eyebrow accent>Debate #{(id || '').slice(0, 8).toUpperCase()}</Eyebrow>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 400,
          fontSize: 'var(--fs-title)',
          lineHeight: 1.08,
          marginTop: 8,
          marginBottom: 8,
          letterSpacing: 'var(--tr-tight)',
          overflowWrap: 'break-word',
        }}>
          {debate.topic}
        </h1>
        <div className="t-meta" style={{ marginBottom: 40 }}>
          {debate.turns.length} turns · Round 04 / 04
        </div>

        {/* Summary */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 22,
            marginBottom: 16,
            letterSpacing: 'var(--tr-tight)',
          }}>
            Summary
          </h2>
          <Card>
            <p className="t-body" style={{ margin: 0, fontSize: 18, lineHeight: 1.7 }}>
              {synthesis.summary}
            </p>
          </Card>
        </section>

        {/* Key Arguments */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 22,
            marginBottom: 16,
            letterSpacing: 'var(--tr-tight)',
          }}>
            Key Arguments
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
            <Card style={{ borderTop: '3px solid var(--advocate)' }}>
              <Byline role="Advocate" style="Data-driven" />
              <ul style={{
                marginTop: 16,
                paddingLeft: 20,
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                lineHeight: 1.65,
                color: 'var(--ink-700)',
              }}>
                {synthesis.keyArguments.advocate.map((arg, i) => (
                  <li key={i} style={{ marginBottom: 12 }}>{arg}</li>
                ))}
              </ul>
            </Card>
            <Card style={{ borderTop: '3px solid var(--skeptic)' }}>
              <Byline role="Skeptic" style="Philosophical" />
              <ul style={{
                marginTop: 16,
                paddingLeft: 20,
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                lineHeight: 1.65,
                color: 'var(--ink-700)',
              }}>
                {synthesis.keyArguments.skeptic.map((arg, i) => (
                  <li key={i} style={{ marginBottom: 12 }}>{arg}</li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {/* Points of Agreement / Disagreement */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
            <div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: 18,
                marginBottom: 12,
                color: 'var(--ok)',
              }}>
                Points of Agreement
              </h3>
              <ul style={{
                margin: 0,
                paddingLeft: 20,
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                lineHeight: 1.65,
                color: 'var(--ink-700)',
              }}>
                {synthesis.pointsOfAgreement.map((point, i) => (
                  <li key={i} style={{ marginBottom: 12 }}>{point}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: 18,
                marginBottom: 12,
                color: 'var(--danger)',
              }}>
                Points of Disagreement
              </h3>
              <ul style={{
                margin: 0,
                paddingLeft: 20,
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                lineHeight: 1.65,
                color: 'var(--ink-700)',
              }}>
                {synthesis.pointsOfDisagreement.map((point, i) => (
                  <li key={i} style={{ marginBottom: 12 }}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Unresolved Questions */}
        <section style={{ marginBottom: 48 }}>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 18,
            marginBottom: 12,
            color: 'var(--ink-500)',
          }}>
            Unresolved Questions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {synthesis.unresolvedQuestions.map((q, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 16px',
                  background: 'var(--paper-2)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  lineHeight: 1.5,
                  color: 'var(--ink-700)',
                  borderLeft: '2px solid var(--ink-300)',
                }}
              >
                {q}
              </div>
            ))}
          </div>
        </section>

        {/* Verdict */}
        {synthesis.verdict && (
          <section style={{ marginBottom: 48 }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize: 18,
              marginBottom: 12,
            }}>
              Judge's Verdict
            </h3>
            <Card style={{
              borderTop: '3px solid var(--judge)',
              background: 'var(--judge-bg)',
            }}>
              <Byline role="Judge" style="Analytical" />
              <p style={{
                marginTop: 16,
                marginBottom: 0,
                fontFamily: 'var(--font-body)',
                fontSize: 17,
                lineHeight: 1.7,
                color: 'var(--ink-900)',
              }}>
                {synthesis.verdict}
              </p>
            </Card>
          </section>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 64,
          paddingTop: 24,
          borderTop: '1px solid var(--ink-200)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div className="t-meta">
            Debated on {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="secondary" onClick={() => window.location.href = '/'}>
              New Debate
            </Button>
            <Button variant="ghost" onClick={() => window.location.href = `/live/${id}`}>
              Review Debate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}