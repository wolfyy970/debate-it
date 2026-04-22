// LANDING / EMPTY state — first entry point

function LandingScreen() {
  return (
    <div style={{ width: '100%', minHeight: '100%', background: 'var(--paper)', color: 'var(--ink-900)', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column' }}>
      <Masthead
        title="DEBATER"
        edition="VOL. I · NO. 01"
        right={<div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span className="t-meta">Library</span>
          <span className="t-meta">Modes</span>
          <span className="t-meta">Docs</span>
          <Button size="sm" variant="secondary">Sign in</Button>
        </div>}
      />

      {/* Front page */}
      <section style={{ padding: '80px 80px 60px', borderBottom: '1px solid var(--ink-900)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 80, alignItems: 'end' }}>
          <div>
            <Eyebrow accent>A Reasoning Instrument — Not a Chatbot</Eyebrow>
            <h1 className="t-display" style={{
              margin: '12px 0 0', fontSize: 120, lineHeight: 0.9, letterSpacing: '-0.03em',
            }}>
              Ask a hard<br/>question.<br/>
              <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Let them argue.</span>
            </h1>
          </div>
          <div className="t-body" style={{ color: 'var(--ink-700)', fontSize: 17 }}>
            Debater runs multiple agents under structured rules — Advocate, Skeptic, Judge — to produce not more conversation, but <em>insight</em>: summaries, trade-offs, and defensible conclusions.
            <div className="rule" style={{ margin: '20px 0' }} />
            <div className="t-mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>
              v0.1 · MVP · Apr 2026
            </div>
          </div>
        </div>
      </section>

      {/* Topic composer */}
      <section style={{ padding: '64px 80px', borderBottom: '1px solid var(--ink-200)' }}>
        <Eyebrow accent>§ Begin</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'end', marginTop: 16 }}>
          <div style={{ borderBottom: '2px solid var(--ink-900)', paddingBottom: 18 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 46, lineHeight: 1.1,
              color: 'var(--ink-300)', minHeight: 60,
            }}>
              What question would you like debated?
              <span style={{ color: 'var(--ink-900)' }}>▌</span>
            </div>
          </div>
          <Button variant="primary" size="lg">Begin →</Button>
        </div>

        <div style={{ marginTop: 32 }}>
          <div className="t-meta" style={{ marginBottom: 14 }}>Or try —</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              'Should tenure be abolished in research universities?',
              'Is consumer-grade genetic testing a net social good?',
              'Should AI-generated images be legally watermarked?',
              'Is a universal basic income economically viable in 2030?',
              'Should we colonize Mars within the century?',
            ].map(p => (
              <div key={p} style={{
                fontFamily: 'var(--font-display)', fontSize: 14,
                padding: '8px 14px', border: '1px solid var(--ink-200)',
                background: 'var(--paper-0)', cursor: 'pointer',
              }}>{p}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Three-up — how it works */}
      <section style={{ padding: '72px 80px', borderBottom: '1px solid var(--ink-200)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 40, marginBottom: 40 }}>
          <div className="t-meta" style={{ color: 'var(--accent)' }}>§ How it works</div>
          <div className="t-title" style={{ fontSize: 38, lineHeight: 1.1 }}>
            Structured rounds. Defined roles. One synthesis at the end.
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48, paddingLeft: 240 }}>
          {[
            ['01', 'Frame the question', 'Pick a mode — balanced, adversarial, decision. Configure the agents or accept the defaults.'],
            ['02', 'Watch them debate', 'Opening statements, cross-examination, rebuttals, finals. Each turn is capped, each role constrained.'],
            ['03', 'Read the insight', 'A judge synthesizes: key arguments, agreements, open questions, and a confidence score.'],
          ].map(([n, t, d]) => (
            <div key={n}>
              <div className="t-display" style={{ fontSize: 52, color: 'var(--accent)', lineHeight: 1 }}>{n}</div>
              <div className="rule" style={{ margin: '14px 0' }} />
              <div className="t-head" style={{ fontSize: 22, marginBottom: 10 }}>{t}</div>
              <div className="t-body" style={{ color: 'var(--ink-700)', fontSize: 15 }}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Principle quote */}
      <section style={{ padding: '80px 80px', borderBottom: '1px solid var(--ink-200)', textAlign: 'center' }}>
        <Eyebrow accent>Product Principle · 10</Eyebrow>
        <blockquote className="t-display" style={{
          fontSize: 64, fontStyle: 'italic', lineHeight: 1.05, margin: '20px auto 0', maxWidth: 1000, color: 'var(--ink-900)',
        }}>
          "The debate is not the product.<br/>
          The <span style={{ color: 'var(--accent)' }}>insight</span> is."
        </blockquote>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 80px', borderTop: '1px solid var(--ink-900)', display: 'flex', justifyContent: 'space-between' }}>
        <div className="t-meta">Debater — published daily</div>
        <div style={{ display: 'flex', gap: 28 }}>
          <span className="t-meta">Roadmap</span>
          <span className="t-meta">Changelog</span>
          <span className="t-meta">Colophon</span>
        </div>
      </footer>
    </div>
  );
}

Object.assign(window, { LandingScreen });
