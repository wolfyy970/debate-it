// SYNTHESIS / OUTPUT view — the final insight, newspaper style

function SynthesisScreen() {
  return (
    <div style={{ width: '100%', minHeight: '100%', background: 'var(--paper)', color: 'var(--ink-900)', fontFamily: 'var(--font-body)' }}>
      <Masthead
        title="DEBATER"
        edition="SYNTHESIS · DB-0428-1704 · APR 28, 2026"
        right={<div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="ghost">↓ Export</Button>
          <Button size="sm" variant="ghost">⑂ Fork</Button>
          <Button size="sm" variant="secondary">Save</Button>
        </div>}
      />

      {/* Front page hero */}
      <section style={{ padding: '56px 64px 40px', borderBottom: '2px solid var(--ink-900)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 64, alignItems: 'end' }}>
          <div>
            <Eyebrow accent>Verdict · Balanced Analysis Mode</Eyebrow>
            <h1 className="t-display" style={{ fontSize: 72, lineHeight: 0.98, margin: '10px 0 0', letterSpacing: '-0.02em' }}>
              A four-day week is <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>defensible in knowledge work</span>, and unproven as national policy.
            </h1>
            <div className="t-body" style={{ marginTop: 24, fontSize: 19, color: 'var(--ink-700)', maxWidth: 720, lineHeight: 1.55 }}>
              The Advocate's strongest ground is empirical but narrow; the Skeptic's strongest ground is structural and unaddressed. A conditional recommendation, not a blanket one.
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--ink-200)', paddingLeft: 28 }}>
            <Eyebrow>Confidence</Eyebrow>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
              <div className="t-display" style={{ fontSize: 68, lineHeight: 1 }}>0.62</div>
              <div className="t-meta" style={{ color: 'var(--ink-500)' }}>/ 1.00</div>
            </div>
            <div style={{ display: 'flex', gap: 3, marginTop: 12, height: 6 }}>
              {[...Array(20)].map((_, i) => (
                <div key={i} style={{ flex: 1, background: i < 12 ? 'var(--ink-900)' : 'var(--ink-200)' }} />
              ))}
            </div>
            <div className="t-mono" style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 12 }}>
              Judge · 4 rounds · 11 turns<br/>2 contradictions flagged · 1 fact verified
            </div>
          </div>
        </div>
      </section>

      {/* Tri-column body */}
      <section style={{ padding: '48px 64px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40, borderBottom: '1px solid var(--ink-200)' }}>
        <SideColumn
          side="Advocate" color="var(--advocate)" score={0.74}
          points={[
            ['Empirical baseline','Controlled trials (Iceland, UK 2022, Japan) show stable or rising output.', 0.9],
            ['Productivity is task-bound','In knowledge work, the hour is a weak proxy for value.', 0.78],
            ['Retention effect','92% of UK pilot firms retained the four-day schedule.', 0.84],
            ['Health externalities','Sickness absence falls materially across trials.', 0.6],
          ]}
        />
        <SideColumn
          side="Skeptic" color="var(--skeptic)" score={0.68}
          points={[
            ['Coordination costs','Supply chains, schools, and services are 5-day coupled.', 0.88],
            ['Sector generalization','Evidence base is knowledge-work; no continuous-ops trial at scale.', 0.82],
            ['Wage compression risk','Unclear whether hourly labor absorbs cost or bears it.', 0.55],
            ['Policy vs. perk','A partial rollout is a benefit, not a standard.', 0.49],
          ]}
        />
        <div>
          <div style={{ borderTop: '2px solid var(--judge)', paddingTop: 14, marginBottom: 18 }}>
            <Byline role="Judge" style="Synthesizing" />
          </div>
          <div className="t-head" style={{ fontSize: 20, marginBottom: 12 }}>Where they agree</div>
          <Agreement>
            The four-day workweek has clear evidence in knowledge-worker settings.
          </Agreement>
          <Agreement>
            Productivity should not be measured by hours occupied alone.
          </Agreement>
          <Agreement>
            Continuous-operations sectors need their own evidence base.
          </Agreement>

          <div className="t-head" style={{ fontSize: 20, margin: '28px 0 12px' }}>Where they diverge</div>
          <Divergence
            a="Scale to national policy now"
            b="Scope to knowledge work first"
          />
          <Divergence
            a="Trials generalize sufficiently"
            b="Trials are a narrow sample"
          />

          <div className="t-head" style={{ fontSize: 20, margin: '28px 0 12px', color: 'var(--accent)' }}>Open questions</div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.5, color: 'var(--ink-700)' }}>
            Can a policy be standard if it excludes 40% of the workforce? What is the right unit of the workweek — individuals, firms, or sectors?
          </div>
        </div>
      </section>

      {/* Argument ledger */}
      <section style={{ padding: '48px 64px', borderBottom: '1px solid var(--ink-200)' }}>
        <Eyebrow accent>§ Ledger · Ranked by Strength</Eyebrow>
        <div style={{ marginTop: 24 }}>
          {[
            ['Empirical baseline: stable or rising output in trials','Advocate','advocate',0.9,'supported'],
            ['Coordination costs not addressed by trials','Skeptic','skeptic',0.88,'supported'],
            ['Productivity is task-bound, not time-bound','Advocate','advocate',0.78,'partial'],
            ['Evidence base is narrow (knowledge work)','Skeptic','skeptic',0.82,'supported'],
            ['A partial rollout is a perk, not a standard','Skeptic','skeptic',0.49,'rhetorical'],
            ['Health externalities — sickness absence falls','Advocate','advocate',0.6,'partial'],
          ].map(([t, side, color, score, tag], i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 120px 140px 80px', gap: 24,
              alignItems: 'center', padding: '14px 0', borderTop: '1px solid var(--ink-100)' }}>
              <div className="t-mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>#{String(i+1).padStart(2,'0')}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--ink-900)' }}>{t}</div>
              <div><Pill>{side}</Pill></div>
              <StrengthBar value={score} color={`var(--${color})`} />
              <div className="t-meta" style={{ color: tag === 'supported' ? 'var(--ok)' : tag === 'rhetorical' ? 'var(--warn)' : 'var(--ink-500)', fontSize: 10 }}>
                {tag}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <section style={{ padding: '40px 64px', background: 'var(--paper-2)', display: 'flex', gap: 16, alignItems: 'center' }}>
        <div>
          <div className="t-meta" style={{ color: 'var(--ink-500)' }}>Next</div>
          <div className="t-head" style={{ fontSize: 22, marginTop: 4 }}>What would you like to do with this debate?</div>
        </div>
        <div style={{ flex: 1 }} />
        <Button variant="ghost">⑂ Fork with new assumption</Button>
        <Button variant="secondary">⇔ Compare runs</Button>
        <Button variant="primary">Save to Library</Button>
      </section>
    </div>
  );
}

function SideColumn({ side, color, score, points }) {
  return (
    <div>
      <div style={{ borderTop: `2px solid ${color}`, paddingTop: 14, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Byline role={side} />
          <span className="t-mono" style={{ fontSize: 12, color }}>{score.toFixed(2)}</span>
        </div>
      </div>
      {points.map(([t, d, s], i) => (
        <article key={i} style={{ padding: '14px 0', borderTop: '1px solid var(--ink-100)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div className="t-mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>#{String(i+1).padStart(2,'0')}</div>
            <StrengthBar value={s} color={color} />
          </div>
          <div className="t-head" style={{ fontSize: 17, marginBottom: 6 }}>{t}</div>
          <div className="t-body" style={{ fontSize: 14, color: 'var(--ink-700)', lineHeight: 1.5 }}>{d}</div>
        </article>
      ))}
    </div>
  );
}

function Agreement({ children }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
      <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginTop: 4, flexShrink: 0 }}>
        <path d="M2 7l3 3 7-7" fill="none" stroke="var(--ok)" strokeWidth="1.8"/>
      </svg>
      <div className="t-body" style={{ fontSize: 15, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function Divergence({ a, b }) {
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--ink-100)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span className="t-meta" style={{ color: 'var(--advocate)', flexShrink: 0, width: 30, fontSize: 10 }}>ADV</span>
        <span className="t-body" style={{ fontSize: 14, fontStyle: 'italic' }}>{a}</span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 6 }}>
        <span className="t-meta" style={{ color: 'var(--skeptic)', flexShrink: 0, width: 30, fontSize: 10 }}>SKP</span>
        <span className="t-body" style={{ fontSize: 14, fontStyle: 'italic' }}>{b}</span>
      </div>
    </div>
  );
}

Object.assign(window, { SynthesisScreen });
