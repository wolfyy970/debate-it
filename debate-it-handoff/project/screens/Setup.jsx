// SETUP / CONFIGURATION screen — topic + mode + agents + toggles

function SetupScreen() {
  return (
    <div style={{ width: '100%', minHeight: '100%', background: 'var(--paper)', color: 'var(--ink-900)', fontFamily: 'var(--font-body)' }}>
      <Masthead
        title="DEBATER"
        edition="NEW DEBATE · DRAFT"
        right={<div style={{ display: 'flex', gap: 8 }}>
          <Pill>Auto-save · 14:08</Pill>
          <Button size="sm" variant="ghost">Cancel</Button>
        </div>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', minHeight: 'calc(100% - 64px)' }}>
        {/* Main */}
        <div style={{ padding: '48px 56px', borderRight: '1px solid var(--ink-200)' }}>
          <Eyebrow accent>§ 01 · The Question</Eyebrow>
          <div style={{ marginTop: 10, borderBottom: '1px solid var(--ink-900)', paddingBottom: 20 }}>
            <div className="t-display" style={{ fontSize: 42, lineHeight: 1.08, color: 'var(--ink-900)' }}>
              Should nations implement a four-day workweek as standard policy?
              <span style={{ color: 'var(--ink-300)' }}>▌</span>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 18 }}>
              <Pill>Policy</Pill>
              <Pill>Labor</Pill>
              <Pill variant="ghost">+ add frame</Pill>
            </div>
          </div>

          {/* Mode selector */}
          <div style={{ marginTop: 48 }}>
            <Eyebrow accent>§ 02 · Debate Mode</Eyebrow>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                ['Balanced Analysis', 'Structured rounds, neutral tone, ends with synthesis.', true],
                ['Adversarial Debate', 'Strong opposition, emphasis on critique, no forced agreement.', false],
                ['Decision Mode', 'Focused on choosing. Judge issues a recommendation.', false],
                ['Educational Mode', 'Slower pacing, concepts explained, beginner-friendly.', false],
                ['Devil\u2019s Advocate', 'One agent pushes extreme counterarguments.', false],
                ['Custom — Thesis Prep', 'Saved configuration — 3 agents, heavy steelman.', false],
              ].map(([t, d, active]) => (
                <div key={t} style={{
                  border: active ? '1px solid var(--ink-900)' : '1px solid var(--ink-200)',
                  background: active ? 'var(--paper-0)' : 'transparent',
                  padding: 20, position: 'relative',
                  boxShadow: active ? 'inset 0 0 0 1px var(--ink-900)' : 'none',
                }}>
                  {active && <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7l3 3 7-7" fill="none" stroke="var(--accent)" strokeWidth="2"/></svg>
                  </div>}
                  <div className="t-head" style={{ fontSize: 18, marginBottom: 8 }}>{t}</div>
                  <div className="t-ui" style={{ fontSize: 13, color: 'var(--ink-500)', lineHeight: 1.5 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Agents */}
          <div style={{ marginTop: 48 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <Eyebrow accent>§ 03 · The Agents</Eyebrow>
                <div className="t-body" style={{ color: 'var(--ink-500)', fontSize: 14, marginTop: 4 }}>
                  Three voices. Expand any card to constrain style, evidence posture, or expertise.
                </div>
              </div>
              <Button size="sm" variant="ghost">+ Add agent</Button>
            </div>

            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <AgentCard role="Advocate" style="Data-driven" color="var(--advocate)" expanded
                model="Claude Sonnet 4.5" provider="Anthropic" />
              <AgentCard role="Skeptic" style="Philosophical" color="var(--skeptic)"
                model="GPT-5" provider="OpenAI" />
              <AgentCard role="Judge" style="Analytical" color="var(--judge)"
                model="Gemini 2.5 Pro" provider="Google" />
            </div>
          </div>
        </div>

        {/* Aside */}
        <aside style={{ padding: '48px 32px', background: 'var(--paper-2)' }}>
          <Eyebrow accent>Quick Toggles</Eyebrow>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Toggle on label="Fact-checking" hint="Flag unsupported or weakly-evidenced claims." />
            <Toggle on label="Force steelmanning" hint="Require the strongest version of each claim before rebuttal." />
            <Toggle on={false} label="Require final verdict" hint="Judge must issue a recommendation." />
            <Toggle on label="Argument scoring" hint="Score each turn on rigor, evidence, and novelty." />
          </div>

          <div className="rule" style={{ margin: '32px 0' }} />

          <Eyebrow accent>Structure</Eyebrow>
          <div style={{ marginTop: 20 }}>
            <Field label="Rounds" value="4" />
            <Field label="Turn cap" value="~500 tokens" />
            <Field label="Cross-Examination" value="After round 02" />
            <Field label="Synthesis" value="Judge + system" />
          </div>

          <div className="rule" style={{ margin: '32px 0' }} />

          <Eyebrow accent>Output</Eyebrow>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Summary','Key arguments','Points of agreement','Points of disagreement','Unresolved questions','Final verdict'].map((x, i) => (
              <label key={x} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                <div style={{
                  width: 14, height: 14, border: '1px solid var(--ink-900)',
                  background: i < 5 ? 'var(--ink-900)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i < 5 && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" fill="none" stroke="var(--paper)" strokeWidth="1.6"/></svg>}
                </div>
                <span className="t-ui" style={{ fontSize: 13, color: i < 5 ? 'var(--ink-900)' : 'var(--ink-500)' }}>{x}</span>
              </label>
            ))}
          </div>

          <div style={{ marginTop: 40 }}>
            <Button variant="primary" size="lg" full>Begin Debate →</Button>
            <div className="t-mono" style={{ fontSize: 11, color: 'var(--ink-500)', textAlign: 'center', marginTop: 10 }}>
              ≈ 02:40 · 12 turns
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ——— model roster ——————————————————————————————————————
const MODEL_ROSTER = [
  { provider: 'Anthropic', family: 'Claude', models: ['Claude Opus 4.1', 'Claude Sonnet 4.5', 'Claude Haiku 4.5'] },
  { provider: 'OpenAI',    family: 'GPT',    models: ['GPT-5', 'GPT-5 mini', 'o3', 'o4-mini'] },
  { provider: 'Google',    family: 'Gemini', models: ['Gemini 2.5 Pro', 'Gemini 2.5 Flash'] },
  { provider: 'Meta',      family: 'Llama',  models: ['Llama 4 Maverick', 'Llama 4 Scout'] },
  { provider: 'Mistral',   family: 'Mistral',models: ['Mistral Large 3', 'Mistral Medium'] },
  { provider: 'xAI',       family: 'Grok',   models: ['Grok 4', 'Grok 3 mini'] },
  { provider: 'DeepSeek',  family: 'DeepSeek',models: ['DeepSeek V3.2', 'DeepSeek R1'] },
];

function providerGlyph(provider) {
  // tiny abstract sigil per provider — 12px squares, no branded logos
  const map = {
    Anthropic: <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 10 L6 2 L9 10 M4.3 7 H7.7" stroke="currentColor" strokeWidth="1.4" fill="none"/></svg>,
    OpenAI:    <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>,
    Google:    <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 2 L10 10 L2 10 Z" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>,
    Meta:      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 9 Q4 3 6 6 Q8 9 10 3" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>,
    Mistral:   <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="2" width="3" height="3" fill="currentColor"/><rect x="7" y="2" width="3" height="3" fill="currentColor"/><rect x="2" y="7" width="3" height="3" fill="currentColor"/><rect x="7" y="7" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1"/></svg>,
    xAI:       <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.4"/></svg>,
    DeepSeek:  <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6 Q6 2 10 6 Q6 10 2 6 Z" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>,
  };
  return map[provider] || null;
}

function ModelSelect({ value, provider, color, open }) {
  // Static hi-fi mock — rendered open or closed. No state.
  const active = MODEL_ROSTER.find(r => r.models.includes(value));
  return (
    <div style={{ position: 'relative' }}>
      <button style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', background: 'var(--paper)',
        border: `1px solid ${open ? 'var(--ink-900)' : 'var(--ink-200)'}`,
        cursor: 'pointer', color: 'var(--ink-900)', fontFamily: 'var(--font-ui)',
        fontSize: 13, textAlign: 'left', borderRadius: 0,
      }}>
        <span style={{ color }}>{providerGlyph(provider || (active && active.provider))}</span>
        <span style={{ flex: 1, fontWeight: 500 }}>{value}</span>
        <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink-500)' }}>{provider || (active && active.provider)}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ color: 'var(--ink-500)' }}>
          <path d={open ? 'M2 6 L5 3 L8 6' : 'M2 4 L5 7 L8 4'} stroke="currentColor" strokeWidth="1.4" fill="none"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% - 1px)', left: 0, right: 0,
          background: 'var(--paper-0)', border: '1px solid var(--ink-900)',
          zIndex: 20, maxHeight: 280, overflow: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        }}>
          {MODEL_ROSTER.map((row) => (
            <div key={row.provider}>
              <div className="t-meta" style={{
                padding: '8px 12px 4px', color: 'var(--ink-500)', fontSize: 10,
                background: 'var(--paper-2)',
              }}>
                <span style={{ marginRight: 6, color: 'var(--ink-700)' }}>{providerGlyph(row.provider)}</span>
                {row.provider}
              </div>
              {row.models.map((m) => {
                const isSelected = m === value;
                return (
                  <div key={m} style={{
                    padding: '8px 12px 8px 28px', cursor: 'pointer',
                    background: isSelected ? 'var(--accent-bg)' : 'transparent',
                    color: isSelected ? 'var(--accent)' : 'var(--ink-900)',
                    fontFamily: 'var(--font-ui)', fontSize: 13,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderTop: '1px solid var(--ink-100)',
                    fontWeight: isSelected ? 600 : 400,
                  }}>
                    <span>{m}</span>
                    {isSelected && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 5l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="1.6"/></svg>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentCard({ role, style, color, expanded, model, provider }) {
  return (
    <div style={{ border: '1px solid var(--ink-200)', background: 'var(--paper-0)', position: 'relative' }}>
      <div style={{ borderTop: `3px solid ${color}`, padding: '16px 18px', borderBottom: '1px solid var(--ink-200)' }}>
        <Byline role={role} style={style} />
      </div>
      <div style={{ padding: 18 }}>
        <div className="t-meta" style={{ marginBottom: 8 }}>Model</div>
        <ModelSelect value={model} provider={provider} color={color} open={expanded} />

        <div className="t-meta" style={{ margin: '18px 0 8px' }}>Role</div>
        <Segmented options={['Advocate','Skeptic','Judge']} value={role === 'Fact-checker' ? 'Advocate' : role} />

        <div className="t-meta" style={{ margin: '18px 0 8px' }}>Style</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Analytical','Emotional','Data-driven','Philosophical'].map(s => (
            <Pill key={s} active={s === style}>{s}</Pill>
          ))}
        </div>

        {expanded && (
          <>
            <div className="t-meta" style={{ margin: '18px 0 8px' }}>Constraints</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ConstraintRow label="Evidence-only reasoning" on />
              <ConstraintRow label="Concise" on={false} />
              <ConstraintRow label="Worst-case assumptions" on={false} />
            </div>
            <div className="t-meta" style={{ margin: '18px 0 8px' }}>Domain expertise</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '8px 10px',
              border: '1px solid var(--ink-200)', background: 'var(--paper)' }}>
              Labor economics, organizational design
            </div>
          </>
        )}

        {!expanded && (
          <Button size="sm" variant="ghost" style={{ marginTop: 18, paddingLeft: 0 }}>Expand constraints ↓</Button>
        )}
      </div>
    </div>
  );
}

function ConstraintRow({ label, on }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
      <span className="t-ui" style={{ fontSize: 13, color: on ? 'var(--ink-900)' : 'var(--ink-500)' }}>{label}</span>
      <div style={{
        width: 14, height: 14, border: '1px solid var(--ink-900)',
        background: on ? 'var(--ink-900)' : 'transparent',
      }} />
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--ink-100)' }}>
      <span className="t-ui" style={{ fontSize: 13, color: 'var(--ink-500)' }}>{label}</span>
      <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-900)' }}>{value}</span>
    </div>
  );
}

Object.assign(window, { SetupScreen });
