// LIBRARY — saved debates, forks, compare

function LibraryScreen() {
  return (
    <div style={{ width: '100%', minHeight: '100%', background: 'var(--paper)', color: 'var(--ink-900)', fontFamily: 'var(--font-body)' }}>
      <Masthead
        title="DEBATER"
        edition="LIBRARY · 24 DEBATES"
        right={<div style={{ display: 'flex', gap: 8 }}>
          <Pill>All</Pill>
          <Pill variant="ghost">Mine</Pill>
          <Pill variant="ghost">Archived</Pill>
          <Button size="sm" variant="primary">+ New Debate</Button>
        </div>}
      />

      {/* Section header */}
      <div style={{ padding: '40px 56px 24px', borderBottom: '1px solid var(--ink-200)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'end' }}>
        <div>
          <Eyebrow accent>The Archive</Eyebrow>
          <h1 className="t-title" style={{ fontSize: 42, lineHeight: 1, margin: '6px 0 0' }}>Twenty-four debates, forked and filed.</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="t-meta">Sort</span>
          <Segmented options={['Recent','Strongest','Forked']} value="Recent" />
        </div>
      </div>

      {/* Featured */}
      <section style={{ padding: '40px 56px', borderBottom: '1px solid var(--ink-200)', background: 'var(--paper-2)' }}>
        <Eyebrow>Featured · Latest Synthesis</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48, marginTop: 14, alignItems: 'center' }}>
          <div>
            <h2 className="t-display" style={{ fontSize: 52, lineHeight: 1, margin: 0 }}>
              Should nations implement a four-day workweek?
            </h2>
            <div style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
              <Pill variant="accent">Balanced · Verdict</Pill>
              <span className="t-meta">4 rounds · 11 turns · 02:40</span>
              <span className="t-meta" style={{ color: 'var(--accent)' }}>3 forks</span>
            </div>
            <div className="t-body" style={{ marginTop: 20, fontSize: 17, color: 'var(--ink-700)', maxWidth: 620 }}>
              Empirical in knowledge work, structurally unaddressed at national scale. Conditional recommendation with 0.62 confidence.
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <Button variant="secondary" size="sm">Open →</Button>
              <Button variant="ghost" size="sm">⑂ Fork</Button>
              <Button variant="ghost" size="sm">⇔ Compare with run 02</Button>
            </div>
          </div>
          <div>
            <ForkTree />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section style={{ padding: '40px 56px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            ['Is carbon pricing regressive in net effect?','Adversarial','0.71','3 rounds','Feb 14'],
            ['Should PhD programs be fully funded as policy?','Educational','0.58','5 rounds','Feb 11'],
            ['Is remote work a net productivity gain for firms?','Decision','0.64','4 rounds','Jan 29'],
            ['Does open-source AI produce more safety, not less?','Adversarial','0.49','6 rounds','Jan 22'],
            ['Should universities weight GPA less in admissions?','Balanced','0.73','4 rounds','Jan 15'],
            ['Is nuclear essential to net-zero by 2050?','Balanced','0.81','5 rounds','Jan 08','flagged'],
          ].map(([t, mode, score, rounds, date, flag], i) => (
            <article key={i} style={{ border: '1px solid var(--ink-200)', background: 'var(--paper-0)', padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Pill>{mode}</Pill>
                <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{date}</span>
              </div>
              <h3 className="t-head" style={{ fontSize: 20, lineHeight: 1.2, margin: '0 0 14px', minHeight: 72 }}>{t}</h3>
              <div className="rule" style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="t-meta" style={{ fontSize: 10 }}>Confidence · {score}</div>
                  <div className="t-meta" style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 3 }}>{rounds}</div>
                </div>
                <StrengthBar value={parseFloat(score)} color={parseFloat(score) > 0.7 ? 'var(--ok)' : parseFloat(score) > 0.55 ? 'var(--judge)' : 'var(--warn)'} />
              </div>
              {flag && <div style={{ marginTop: 10 }}><Pill variant="accent">⚑ Contradictions</Pill></div>}
            </article>
          ))}
        </div>
      </section>

      {/* Compare drawer */}
      <section style={{ padding: '40px 56px', background: 'var(--paper-2)', borderTop: '1px solid var(--ink-200)' }}>
        <Eyebrow accent>Compare · Run 01 vs. Run 02 vs. Run 03</Eyebrow>
        <div className="t-body" style={{ color: 'var(--ink-500)', fontSize: 14, marginTop: 6, marginBottom: 24 }}>
          Same topic, different assumptions. How does the conclusion shift?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr 1fr', gap: 0, border: '1px solid var(--ink-200)', background: 'var(--paper-0)' }}>
          {[
            ['','Run 01 · Original','Run 02 · w/ Fact-check','Run 03 · Adversarial'],
            ['Mode','Balanced','Balanced','Adversarial'],
            ['Confidence','0.62','0.68','0.51'],
            ['Verdict','Conditional yes','Conditional yes','Unresolved'],
            ['Agreements','3','4','1'],
            ['Contradictions','2','1','4'],
          ].map((row, r) => (
            <React.Fragment key={r}>
              {row.map((cell, c) => (
                <div key={c} style={{
                  padding: '14px 18px',
                  borderTop: r > 0 ? '1px solid var(--ink-100)' : 'none',
                  borderRight: c < 3 ? '1px solid var(--ink-100)' : 'none',
                  background: r === 0 ? 'var(--paper-2)' : 'transparent',
                  fontFamily: r === 0 || c === 0 ? 'var(--font-mono)' : 'var(--font-display)',
                  fontSize: r === 0 || c === 0 ? 11 : 16,
                  letterSpacing: r === 0 || c === 0 ? '0.06em' : 0,
                  textTransform: r === 0 || c === 0 ? 'uppercase' : 'none',
                  color: r === 0 || c === 0 ? 'var(--ink-500)' : 'var(--ink-900)',
                  fontWeight: r === 0 ? 600 : 400,
                }}>{cell}</div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </section>
    </div>
  );
}

function ForkTree() {
  return (
    <svg viewBox="0 0 400 180" style={{ width: '100%', maxWidth: 400 }}>
      {/* root */}
      <circle cx="40" cy="90" r="5" fill="var(--ink-900)" />
      <text x="40" y="110" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-500)" textAnchor="middle">root</text>

      {/* branches */}
      <path d="M40 90 C 100 90, 120 40, 180 40" stroke="var(--advocate)" strokeWidth="1.5" fill="none" />
      <path d="M40 90 L 180 90" stroke="var(--ink-900)" strokeWidth="1.5" fill="none" />
      <path d="M40 90 C 100 90, 120 140, 180 140" stroke="var(--skeptic)" strokeWidth="1.5" fill="none" />

      <circle cx="180" cy="40" r="5" fill="var(--advocate)" />
      <circle cx="180" cy="90" r="5" fill="var(--ink-900)" />
      <circle cx="180" cy="140" r="5" fill="var(--skeptic)" />

      <text x="192" y="44" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-700)">fork · data-only</text>
      <text x="192" y="94" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-900)">main · 0.62</text>
      <text x="192" y="144" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-700)">fork · adversarial</text>

      {/* continuation dots */}
      <path d="M180 40 L 280 40" stroke="var(--ink-200)" strokeWidth="1" strokeDasharray="2 3" fill="none" />
      <circle cx="290" cy="40" r="3" fill="var(--ink-300)" />
    </svg>
  );
}

Object.assign(window, { LibraryScreen });
