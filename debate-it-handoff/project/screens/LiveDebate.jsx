// LIVE DEBATE VIEW — the hero. Three variations.
//
// Shared chrome: masthead (topic, phase, round), footer (transport).
// Variation A: Broadsheet — two-column newspaper split w/ center gutter
// Variation B: Transcript — vertical stream, annotations in margin
// Variation C: Stage — centered card, turn ticker and ledger

const SAMPLE_TOPIC = "Should nations implement a four-day workweek as standard policy?";

const TURNS = [
  {
    role: 'Advocate', style: 'Data-driven', model: 'Claude Sonnet 4.5', phase: 'Opening', n: 1,
    text: "The four-day week is not a lifestyle preference — it is a productivity reform. Controlled trials in Iceland, the UK, and Japan have produced consistent findings: output holds steady or rises, sickness absence falls, and retention improves. What these studies measure is not leisure, but the decline of performative work.",
    strong: ["trials in Iceland, the UK, and Japan", "output holds steady or rises"],
  },
  {
    role: 'Skeptic', style: 'Philosophical', model: 'GPT-5', phase: 'Opening', n: 2,
    text: "That framing is seductive but incomplete. It treats the workweek as a scalar to be optimized, rather than as a coordination mechanism binding supply chains, services, and civic life. Shortening it in a knowledge-work trial is cheap. Doing it across healthcare, logistics, and schooling is a different problem — one the evidence has not yet touched.",
    strong: ["coordination mechanism", "healthcare, logistics, and schooling"],
  },
  {
    role: 'Advocate', style: 'Data-driven', model: 'Claude Sonnet 4.5', phase: 'Cross-Ex', n: 3,
    text: "Then let us narrow the claim. In sectors where output is measured in finished tasks rather than hours occupied, the evidence is decisive. The policy question is not whether a nurse works four days, but whether we still measure white-collar labor by time-in-seat.",
  },
  {
    role: 'Skeptic', style: 'Philosophical', model: 'GPT-5', phase: 'Cross-Ex', n: 4,
    text: "A narrower claim is a safer one, but a narrower policy is not yet a national standard. A four-day workweek for 30% of workers is not a four-day workweek — it is a perk.",
    flagged: true,
  },
  {
    role: 'Fact-checker', model: 'Gemini 2.5 Pro', phase: 'Cross-Ex', n: 5,
    text: "Clarification: the UK pilot (2022, 61 firms) reported 92% retained the policy. \"Consistent\" is accurate for knowledge-work trials; no comparable continuous-operations study yet exists at national scale.",
    meta: true,
  },
];

// ——————————————————————————————————————————————————————————
// VARIATION A — BROADSHEET
// ——————————————————————————————————————————————————————————
function LiveDebate_Broadsheet() {
  const advocate = TURNS.filter(t => t.role === 'Advocate');
  const skeptic = TURNS.filter(t => t.role === 'Skeptic');
  const margin = TURNS.filter(t => t.role === 'Fact-checker');

  return (
    <DebateShell variant="A" phase="Cross-Examination" round="Round 02 / 04">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 32, padding: '32px 48px 48px' }}>
        <ColumnSide side="Advocate" style="Data-driven" color="var(--advocate)" turns={advocate} />
        <div style={{ background: 'var(--ink-900)', width: 1 }} />
        <ColumnSide side="Skeptic" style="Philosophical" color="var(--skeptic)" turns={skeptic} streaming />
      </div>
      {margin.length > 0 && (
        <div style={{ borderTop: '1px solid var(--ink-200)', background: 'var(--paper-2)',
          padding: '20px 48px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 160px' }}>
            <Byline role="Fact-checker" turn="05" model="Gemini 2.5 Pro" />
          </div>
          <div className="t-body" style={{ flex: 1, fontSize: 15, color: 'var(--ink-700)', fontStyle: 'italic' }}>
            {margin[0].text}
          </div>
        </div>
      )}
    </DebateShell>
  );
}

function ColumnSide({ side, style, color, turns, streaming }) {
  return (
    <div>
      <div style={{ borderTop: `2px solid ${color}`, paddingTop: 14, marginBottom: 20 }}>
        <Byline role={side} style={style} model={side === 'Advocate' ? 'Claude Sonnet 4.5' : 'GPT-5'} />
      </div>
      {turns.map((t, i) => (
        <article key={i} style={{ marginBottom: 28 }} className="fadeup">
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 10 }}>
            <span className="t-mono" style={{ color, fontWeight: 600 }}>#{String(t.n).padStart(2,'0')}</span>
            <span className="t-meta" style={{ color: 'var(--ink-500)' }}>— {t.phase}</span>
          </div>
          <p className="t-body" style={{
            fontSize: 17, lineHeight: 1.58, margin: 0,
            color: t.flagged ? 'var(--ink-700)' : 'var(--ink-900)',
          }}>
            {highlightPhrases(t.text, t.strong, color)}
            {streaming && i === turns.length - 1 && <Caret />}
          </p>
          {t.flagged && (
            <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: `2px solid var(--warn)` }}>
              <span className="t-meta" style={{ color: 'var(--warn)' }}>⚑ Flagged — unsupported</span>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function highlightPhrases(text, phrases, color) {
  if (!phrases || !phrases.length) return text;
  let out = [text];
  phrases.forEach((p, idx) => {
    const next = [];
    out.forEach((chunk) => {
      if (typeof chunk !== 'string') { next.push(chunk); return; }
      const parts = chunk.split(p);
      parts.forEach((part, i) => {
        if (i > 0) next.push(
          <span key={`${idx}-${i}`} style={{
            background: `${color}18`, borderBottom: `1px solid ${color}`, padding: '0 2px',
          }}>{p}</span>
        );
        next.push(part);
      });
    });
    out = next;
  });
  return out;
}

// ——————————————————————————————————————————————————————————
// VARIATION B — TRANSCRIPT
// ——————————————————————————————————————————————————————————
function LiveDebate_Transcript() {
  return (
    <DebateShell variant="B" phase="Cross-Examination" round="Round 02 / 04">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 40, padding: '32px 48px 48px' }}>
        <div>
          {TURNS.map((t, i) => (
            <TranscriptTurn key={i} turn={t} streaming={i === TURNS.length - 1} />
          ))}
        </div>
        <aside>
          <StreamAside />
        </aside>
      </div>
    </DebateShell>
  );
}

function TranscriptTurn({ turn, streaming }) {
  const colors = {
    Advocate: 'var(--advocate)', Skeptic: 'var(--skeptic)',
    Judge: 'var(--judge)', 'Fact-checker': 'var(--factcheck)',
  };
  const color = colors[turn.role] || 'var(--ink-700)';
  const isMeta = turn.meta;
  return (
    <div className="fadeup" style={{
      display: 'grid', gridTemplateColumns: '90px 1fr', gap: 24,
      padding: '22px 0', borderTop: '1px solid var(--ink-100)',
      background: isMeta ? 'var(--paper-2)' : 'transparent',
      margin: isMeta ? '0 -20px' : 0, padding: isMeta ? '22px 20px' : '22px 0',
    }}>
      <div>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>#{String(turn.n).padStart(2,'0')}</div>
        <div style={{ width: 4, height: 4, background: color, margin: '10px 0' }} />
        <div className="t-meta" style={{ color, fontSize: 10 }}>{turn.role}</div>
      </div>
      <div>
        {!isMeta && <Byline role={turn.role} style={turn.style} model={turn.model} />}
        <div className="t-body" style={{
          fontSize: isMeta ? 14 : 17,
          marginTop: 10, lineHeight: 1.58,
          fontStyle: isMeta ? 'italic' : 'normal',
          color: isMeta ? 'var(--ink-700)' : 'var(--ink-900)',
        }}>
          {turn.text}
          {streaming && <Caret />}
        </div>
      </div>
    </div>
  );
}

function StreamAside() {
  return (
    <div style={{ position: 'sticky', top: 20 }}>
      <div className="t-meta" style={{ marginBottom: 14 }}>Live Ledger</div>
      <div style={{ border: '1px solid var(--ink-200)', padding: 20, background: 'var(--paper-0)' }}>
        <div className="t-head" style={{ fontSize: 17, marginBottom: 14 }}>Points raised</div>
        {[
          ['Productivity unchanged in trials', 'advocate', 0.85],
          ['Coordination costs ignored', 'skeptic', 0.72],
          ['Evidence base narrow (knowledge work)', 'factcheck', 0.9],
          ['Policy vs. perk distinction', 'skeptic', 0.55],
        ].map(([t, role, s]) => (
          <div key={t} style={{ padding: '10px 0', borderTop: '1px solid var(--ink-100)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="t-meta" style={{ color: `var(--${role === 'factcheck' ? 'factcheck' : role})`, fontSize: 10 }}>{role}</span>
              <StrengthBar value={s} color={`var(--${role === 'factcheck' ? 'factcheck' : role})`} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, lineHeight: 1.35 }}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <div className="t-meta" style={{ marginBottom: 10 }}>Contradictions (2)</div>
        <div style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 14 }}>
          <div className="t-ui" style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.5 }}>
            "Evidence decisive" (#03) vs. "continuous operations untested" (#05).
          </div>
        </div>
      </div>
    </div>
  );
}

// ——————————————————————————————————————————————————————————
// VARIATION C — STAGE
// ——————————————————————————————————————————————————————————
function LiveDebate_Stage() {
  const current = TURNS[TURNS.length - 1];
  const color = { Advocate: 'var(--advocate)', Skeptic: 'var(--skeptic)', Judge: 'var(--judge)', 'Fact-checker': 'var(--factcheck)' }[current.role];

  return (
    <DebateShell variant="C" phase="Cross-Examination" round="Round 02 / 04">
      <div style={{ padding: '32px 48px 48px' }}>
        {/* Turn ticker */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 32 }}>
          <span className="t-meta">Turns</span>
          {TURNS.map((t, i) => {
            const c = { Advocate: 'var(--advocate)', Skeptic: 'var(--skeptic)', Judge: 'var(--judge)', 'Fact-checker': 'var(--factcheck)' }[t.role];
            const isCur = i === TURNS.length - 1;
            return (
              <div key={i} style={{
                padding: '6px 10px', border: `1px solid ${c}`,
                background: isCur ? c : 'transparent',
                color: isCur ? 'var(--paper)' : c,
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
              }}>#{String(t.n).padStart(2,'0')} {t.role.slice(0,3).toUpperCase()}</div>
            );
          })}
          <span className="t-mono" style={{ color: 'var(--ink-300)', marginLeft: 6 }}>· · ·</span>
        </div>

        {/* Current turn card */}
        <div style={{
          border: `1px solid ${color}`, background: 'var(--paper-0)',
          padding: '40px 48px', position: 'relative', maxWidth: 820, margin: '0 auto',
        }} className="fadeup">
          <div style={{
            position: 'absolute', top: -1, left: 40,
            background: 'var(--paper)', padding: '0 14px',
            transform: 'translateY(-50%)',
          }}>
            <Byline role={current.role} style={current.style} turn={String(current.n).padStart(2,'0')} model={current.model} />
          </div>
          <p className="t-body" style={{
            fontSize: 21, lineHeight: 1.5, margin: 0, color: 'var(--ink-900)',
            fontFamily: 'var(--font-display)', fontWeight: 400,
          }}>
            <span style={{ float: 'left', fontSize: 64, lineHeight: 0.88, marginRight: 10, color }}>"</span>
            {current.text}<Caret />
          </p>
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--ink-100)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="t-meta">Phase</span>
              <PhaseGlyph phase="Cross-Ex" />
              <span className="t-meta" style={{ color: 'var(--ink-900)' }}>Cross-Examination</span>
            </div>
            <div className="t-mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>
              generating · 284 / 500 tokens
            </div>
          </div>
        </div>

        {/* Prior turns, ghosted */}
        <div style={{ marginTop: 40, opacity: 0.72 }}>
          <div className="t-meta" style={{ marginBottom: 14 }}>Prior Turns — Round 01</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {TURNS.slice(0, 2).map((t, i) => {
              const c = { Advocate: 'var(--advocate)', Skeptic: 'var(--skeptic)' }[t.role];
              return (
                <div key={i} style={{ paddingTop: 14, borderTop: `1px solid ${c}` }}>
                  <Byline role={t.role} style={t.style} turn={String(t.n).padStart(2,'0')} model={t.model} />
                  <div className="t-body" style={{ fontSize: 15, marginTop: 10, color: 'var(--ink-700)',
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DebateShell>
  );
}

// ——— Shared shell (masthead + footer) —————————————————————
function DebateShell({ children, variant, phase, round }) {
  return (
    <div style={{ width: '100%', minHeight: '100%', background: 'var(--paper)', color: 'var(--ink-900)', fontFamily: 'var(--font-body)' }}>
      <Masthead
        title="DEBATER"
        edition={`LIVE · ${new Date().toISOString().slice(0,10).toUpperCase()}`}
        right={<div style={{ display: 'flex', gap: 12 }}>
          <Pill>Mode · Balanced</Pill>
          <Pill variant="accent">● Live</Pill>
        </div>}
      />

      {/* Topic band */}
      <div style={{ padding: '28px 48px 24px', borderBottom: '1px solid var(--ink-200)' }}>
        <Eyebrow accent>Topic · Debate #DB-0428-1704</Eyebrow>
        <h1 className="t-title" style={{ margin: '6px 0 0', fontSize: 38, lineHeight: 1.08, maxWidth: 900 }}>
          {SAMPLE_TOPIC}
        </h1>
        <div style={{ marginTop: 20, display: 'flex', gap: 28, alignItems: 'center' }}>
          <PhaseStrip phase={phase} />
          <div style={{ flex: 1, height: 1, background: 'var(--ink-200)' }} />
          <div className="t-meta" style={{ color: 'var(--ink-700)' }}>{round}</div>
        </div>
      </div>

      {children}

      {/* Transport */}
      <div style={{
        position: 'sticky', bottom: 0,
        borderTop: '1px solid var(--ink-900)', background: 'var(--paper)',
        padding: '14px 48px', display: 'flex', gap: 20, alignItems: 'center',
      }}>
        <div className="t-meta">Transport</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="ghost">◁ Prev</Button>
          <Button size="sm" variant="primary">❚❚ Pause</Button>
          <Button size="sm" variant="ghost">Next ▷</Button>
          <Button size="sm" variant="ghost">↻ Regenerate</Button>
        </div>
        <div style={{ flex: 1 }} />
        <div className="t-mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>
          elapsed 02:17 · 5 / ~12 turns
        </div>
        <Button size="sm" variant="secondary">End & Synthesize →</Button>
      </div>
    </div>
  );
}

function PhaseStrip({ phase }) {
  const phases = ['Opening', 'Cross-Ex', 'Rebuttal', 'Final', 'Synthesis'];
  const idx = phases.indexOf(phase.includes('Cross') ? 'Cross-Ex' : phase);
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {phases.map((p, i) => (
        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6,
          color: i === idx ? 'var(--accent)' : i < idx ? 'var(--ink-700)' : 'var(--ink-300)',
          fontWeight: i === idx ? 600 : 400,
        }}>
          <PhaseGlyph phase={p} />
          <span className="t-meta" style={{ color: 'inherit' }}>{p}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  LiveDebate_Broadsheet, LiveDebate_Transcript, LiveDebate_Stage,
});
