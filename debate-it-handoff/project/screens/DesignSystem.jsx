// DESIGN SYSTEM — the spec page. Tall, structured, newspaper-like.

function DesignSystem() {
  return (
    <div style={{
      width: '100%', minHeight: '100%',
      background: 'var(--paper)', color: 'var(--ink-900)',
      fontFamily: 'var(--font-body)',
    }}>
      <Masthead
        title="DEBATER"
        edition="DESIGN SYSTEM · VOL. I · APR 2026"
        right={<div className="t-meta">Version 0.1 — Working Draft</div>}
      />

      {/* ——— MASTHEAD SPREAD ——— */}
      <section style={{ padding: '60px 60px 80px', borderBottom: '1px solid var(--ink-900)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'end' }}>
          <div>
            <Eyebrow accent>A System for Reasoning, Rendered</Eyebrow>
            <h1 className="t-display" style={{ margin: 0, fontSize: 88, lineHeight: 0.94 }}>
              The debate is not the product.
              <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}> The insight is.</span>
            </h1>
          </div>
          <div className="t-body" style={{ columnCount: 2, columnGap: 28, color: 'var(--ink-700)' }}>
            <p className="t-drop" style={{ marginTop: 0 }}>
              Debater is a reasoning instrument. Its visual language borrows from the
              broadsheet and the law review: generous serifs for argument,
              monospace for metadata, deep ink on warm paper. Color is rationed.
              A single accent carries weight.
            </p>
            <p>
              The system prioritizes clarity over chrome. Rules are thin, shadows
              are rare, and whitespace is structural. Every element asks: does this
              help the reader reason better?
            </p>
          </div>
        </div>
      </section>

      {/* ——— TYPE ——— */}
      <Section label="§ 01" title="Typography" subtitle="Three families, clear hierarchy">
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 40, alignItems: 'start' }}>
          <div className="t-meta">Families</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            <FamilyCard
              family="Source Serif 4"
              role="Display & Body"
              sample="Aa"
              note="The editorial voice. Arguments, headlines, long-form prose."
              stack="--font-display"
            />
            <FamilyCard
              family="Söhne / Inter"
              role="Interface"
              sample="Aa"
              note="Buttons, form controls, navigation. Neutral, workmanlike."
              stack="--font-ui"
              sans
            />
            <FamilyCard
              family="JetBrains Mono"
              role="Metadata & Code"
              sample="Aa"
              note="Timestamps, turn numbers, role tags, debate IDs."
              stack="--font-mono"
              mono
            />
          </div>
        </div>

        <div style={{ marginTop: 64, borderTop: '1px solid var(--ink-200)', paddingTop: 40 }}>
          <div className="t-meta" style={{ marginBottom: 20 }}>Scale</div>
          {[
            { name: 'Display', size: 88, cls: 't-display', label: 'fs-5xl / 88' },
            { name: 'Title', size: 46, cls: 't-display', label: 'fs-3xl / 46', sz: 46 },
            { name: 'Head', size: 34, cls: 't-title', label: 'fs-2xl / 34' },
            { name: 'Subhead', size: 26, cls: 't-head', label: 'fs-xl / 26' },
            { name: 'Body', size: 17, cls: 't-body', label: 'fs-md / 17' },
            { name: 'UI', size: 15, cls: 't-ui', label: 'fs-base / 15', sans: true },
            { name: 'Meta', size: 11, cls: 't-meta', label: 'fs-xs / 11' },
          ].map((r) => (
            <div key={r.name} style={{
              display: 'grid', gridTemplateColumns: '120px 180px 1fr', gap: 24,
              alignItems: 'baseline', padding: '16px 0',
              borderBottom: '1px solid var(--ink-100)',
            }}>
              <div className="t-meta">{r.name}</div>
              <div className="t-mono" style={{ color: 'var(--ink-500)' }}>{r.label}</div>
              <div style={{
                fontSize: r.sz ?? r.size,
                fontFamily: r.sans ? 'var(--font-ui)' : 'var(--font-display)',
                lineHeight: 1.05, letterSpacing: r.size > 30 ? '-0.02em' : 0,
              }}>
                On the question of autonomy.
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ——— COLOR ——— */}
      <Section label="§ 02" title="Color" subtitle="Ink on paper. One accent earns its place.">
        <div className="t-meta" style={{ marginBottom: 16 }}>Paper & Ink</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 48 }}>
          <Swatch name="paper" v="#f4efe4" fg="var(--ink-900)" note="Primary bg" />
          <Swatch name="paper-2" v="#ecE6d8" fg="var(--ink-900)" />
          <Swatch name="paper-3" v="#e4ddc9" fg="var(--ink-900)" />
          <Swatch name="paper-0" v="#faf6eb" fg="var(--ink-900)" note="Card" />
          <Swatch name="ink-900" v="#191511" fg="var(--paper)" note="Body" />
        </div>

        <div className="t-meta" style={{ marginBottom: 16 }}>Ink Ramp</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 48 }}>
          {[
            ['ink-900','#191511'],['ink-700','#3a332c'],['ink-500','#6b6258'],
            ['ink-300','#a39b90'],['ink-200','#cfc8bd'],['ink-100','#e3ddd1']
          ].map(([n,v]) => <Swatch key={n} name={n} v={v} fg={n.startsWith('ink-9') || n.startsWith('ink-7') ? 'var(--paper)' : 'var(--ink-900)'} />)}
        </div>

        <div className="t-meta" style={{ marginBottom: 16 }}>Accent — Oxblood</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 48 }}>
          <Swatch name="accent" v="#7a1f1f" fg="var(--paper)" note="Sparingly" />
          <Swatch name="accent-soft" v="#a64040" fg="var(--paper)" />
          <Swatch name="accent-bg" v="#f2e4df" fg="var(--accent)" />
        </div>

        <div className="t-meta" style={{ marginBottom: 16 }}>Agent Voices</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <Swatch name="advocate" v="#1e3a5c" fg="var(--paper)" note="Navy" />
          <Swatch name="skeptic" v="#7a1f1f" fg="var(--paper)" note="Oxblood" />
          <Swatch name="judge" v="#4a4438" fg="var(--paper)" note="Stone" />
          <Swatch name="factcheck" v="#3d5a3a" fg="var(--paper)" note="Forest" />
        </div>
      </Section>

      {/* ——— SPACING & GRID ——— */}
      <Section label="§ 03" title="Spacing" subtitle="A 4px baseline, modest at body, generous at section breaks">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          {[['1',4],['2',8],['3',12],['4',16],['5',20],['6',24],['7',32],['8',40],['9',56],['10',72],['11',96]].map(([n,v]) => (
            <div key={n} style={{ textAlign: 'center' }}>
              <div style={{ width: v, height: v, background: 'var(--ink-900)', marginBottom: 8 }} />
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--ink-500)' }}>sp-{n}</div>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--ink-700)' }}>{v}px</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ——— COMPONENTS ——— */}
      <Section label="§ 04" title="Components" subtitle="Buttons, pills, toggles, and the specimens that follow">
        <ComponentRow label="Buttons">
          <Button variant="primary">Begin Debate</Button>
          <Button variant="secondary">Fork</Button>
          <Button variant="accent">Require Verdict</Button>
          <Button variant="ghost">Cancel</Button>
        </ComponentRow>

        <ComponentRow label="Pills">
          <Pill>Default</Pill>
          <Pill active>Active</Pill>
          <Pill variant="accent">Accent</Pill>
          <Pill variant="ghost">Ghost</Pill>
        </ComponentRow>

        <ComponentRow label="Bylines">
          <Byline role="Advocate" style="Data-driven" turn="03" />
          <Byline role="Skeptic" style="Philosophical" turn="04" />
          <Byline role="Judge" />
          <Byline role="Fact-checker" />
        </ComponentRow>

        <ComponentRow label="Segmented">
          <Segmented options={["Balanced","Adversarial","Decision","Education"]} value="Balanced" />
        </ComponentRow>

        <ComponentRow label="Toggles">
          <div style={{ display: 'flex', gap: 40 }}>
            <Toggle on={true} label="Fact-checking" hint="Flag unsupported claims" />
            <Toggle on={false} label="Require verdict" hint="Judge issues a final call" />
          </div>
        </ComponentRow>

        <ComponentRow label="Strength Bars">
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <StrengthBar value={0.3} color="var(--advocate)" />
            <StrengthBar value={0.62} color="var(--skeptic)" />
            <StrengthBar value={0.88} color="var(--judge)" />
          </div>
        </ComponentRow>

        <ComponentRow label="Phase Glyphs">
          <div style={{ display: 'flex', gap: 24, color: 'var(--ink-900)' }}>
            {['Opening','Cross-Ex','Rebuttal','Final','Synthesis'].map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PhaseGlyph phase={p} />
                <span className="t-meta">{p}</span>
              </div>
            ))}
          </div>
        </ComponentRow>
      </Section>

      {/* ——— PRINCIPLES ——— */}
      <Section label="§ 05" title="Principles" subtitle="Four rules for the system">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 40 }}>
          {[
            ['Clarity over verbosity','Words earn their weight. Remove before you add.'],
            ['Structure over chaos','Phases, rounds, and roles are always legible.'],
            ['Usefulness over novelty','If it doesn\u2019t help the reader decide, cut it.'],
            ['Ink before color','Color marks meaning, never decoration.'],
          ].map(([t,d], i) => (
            <div key={t}>
              <div className="t-meta" style={{ color: 'var(--accent)' }}>0{i+1}</div>
              <div className="t-head" style={{ margin: '8px 0' }}>{t}</div>
              <div className="t-body" style={{ color: 'var(--ink-700)' }}>{d}</div>
            </div>
          ))}
        </div>
      </Section>

      <footer style={{ padding: '40px 60px', borderTop: '1px solid var(--ink-900)', display: 'flex', justifyContent: 'space-between' }}>
        <div className="t-meta">Debater · Design System v0.1</div>
        <div className="t-meta" style={{ color: 'var(--ink-500)' }}>— fin —</div>
      </footer>
    </div>
  );
}

// ——— helpers (local) ——————————————————————————————
function Section({ label, title, subtitle, children }) {
  return (
    <section style={{ padding: '64px 60px', borderBottom: '1px solid var(--ink-200)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 40, marginBottom: 40, alignItems: 'baseline' }}>
        <div className="t-meta" style={{ color: 'var(--accent)' }}>{label}</div>
        <div>
          <div className="t-title" style={{ fontSize: 46, lineHeight: 1, marginBottom: 10 }}>{title}</div>
          {subtitle && <div className="t-body" style={{ color: 'var(--ink-500)' }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ paddingLeft: 220 }}>{children}</div>
    </section>
  );
}

function FamilyCard({ family, role, sample, note, stack, sans, mono }) {
  const ff = sans ? 'var(--font-ui)' : mono ? 'var(--font-mono)' : 'var(--font-display)';
  return (
    <div style={{ border: '1px solid var(--ink-200)', padding: 24, background: 'var(--paper-0)' }}>
      <div style={{ fontSize: 96, lineHeight: 1, fontFamily: ff, fontWeight: 500, color: 'var(--ink-900)' }}>
        {sample}
      </div>
      <div className="t-meta" style={{ marginTop: 20, color: 'var(--accent)' }}>{role}</div>
      <div className="t-head" style={{ margin: '4px 0 8px', fontSize: 20 }}>{family}</div>
      <div className="t-ui" style={{ color: 'var(--ink-500)', fontSize: 12 }}>{note}</div>
      <div className="t-mono" style={{ marginTop: 16, color: 'var(--ink-500)', fontSize: 11 }}>{stack}</div>
    </div>
  );
}

function Swatch({ name, v, fg, note }) {
  return (
    <div style={{ border: '1px solid var(--ink-200)' }}>
      <div style={{ height: 100, background: v, color: fg, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div className="t-mono" style={{ fontSize: 11, color: fg, opacity: 0.9 }}>{v.toUpperCase()}</div>
        {note && <div className="t-mono" style={{ fontSize: 10, color: fg, opacity: 0.7 }}>{note}</div>}
      </div>
      <div style={{ padding: '8px 12px', background: 'var(--paper-0)' }}>
        <div className="t-mono" style={{ fontSize: 11 }}>{name}</div>
      </div>
    </div>
  );
}

function ComponentRow({ label, children }) {
  return (
    <div style={{ padding: '24px 0', borderBottom: '1px solid var(--ink-100)', display: 'grid', gridTemplateColumns: '160px 1fr', gap: 40, alignItems: 'center' }}>
      <div className="t-meta">{label}</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

Object.assign(window, { DesignSystem });
