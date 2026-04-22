// ============================================================
// DEBATER — SHARED COMPONENTS
// Editorial, serif-led. Pure presentational — no external state.
// ============================================================

// ——— MASTHEAD (top-of-screen title bar, newspaper-y) ————————
function Masthead({ title = "DEBATER", edition, children, right }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--ink-900)',
      padding: '14px 28px 12px',
      display: 'flex', alignItems: 'baseline', gap: 24,
      background: 'var(--paper)',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 22,
        letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>{title}</div>
      {edition && <div className="t-meta" style={{ color: 'var(--ink-500)' }}>
        {edition}
      </div>}
      <div style={{ flex: 1 }} />
      {right}
    </header>
  );
}

// ——— EYEBROW — small all-caps meta label above a title ——————
function Eyebrow({ children, accent }) {
  return (
    <div className="t-meta" style={{
      color: accent ? 'var(--accent)' : 'var(--ink-500)',
      marginBottom: 6,
    }}>{children}</div>
  );
}

// ——— BYLINE — monospace role tag ————————————————————————————
function Byline({ role, style, turn, model }) {
  const roleColor = {
    Advocate: 'var(--advocate)',
    Skeptic: 'var(--skeptic)',
    Judge: 'var(--judge)',
    'Fact-checker': 'var(--factcheck)',
    Steelman: 'var(--ink-700)',
  }[role] || 'var(--ink-700)';
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <span style={{
        width: 8, height: 8, borderRadius: 0, background: roleColor,
        display: 'inline-block', transform: 'translateY(1px)',
      }} />
      <span className="t-meta" style={{ color: roleColor, fontWeight: 600, letterSpacing: '0.1em' }}>
        {role}
      </span>
      {style && <span className="t-meta" style={{ color: 'var(--ink-500)' }}>· {style}</span>}
      {model && <span className="t-mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>— {model}</span>}
      {turn && <span className="t-mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>#{turn}</span>}
    </div>
  );
}

// ——— PILL — monospace chip ———————————————————————————————
function Pill({ children, active, onClick, variant }) {
  const styles = {
    default: { bg: 'transparent', fg: 'var(--ink-700)', bd: 'var(--ink-200)' },
    active: { bg: 'var(--ink-900)', fg: 'var(--paper)', bd: 'var(--ink-900)' },
    accent: { bg: 'var(--accent-bg)', fg: 'var(--accent)', bd: 'var(--accent)' },
    ghost: { bg: 'transparent', fg: 'var(--ink-500)', bd: 'transparent' },
  };
  const s = styles[variant] || (active ? styles.active : styles.default);
  return (
    <span onClick={onClick} style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em',
      textTransform: 'uppercase', padding: '4px 10px',
      border: `1px solid ${s.bd}`, color: s.fg, background: s.bg,
      borderRadius: 999, cursor: onClick ? 'pointer' : 'default',
      display: 'inline-flex', alignItems: 'center', gap: 6, lineHeight: 1.2,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

// ——— BUTTON ————————————————————————————————————————————
function Button({ children, variant = 'primary', size = 'md', icon, onClick, full, style = {} }) {
  const variants = {
    primary: { bg: 'var(--ink-900)', fg: 'var(--paper)', bd: 'var(--ink-900)' },
    secondary: { bg: 'transparent', fg: 'var(--ink-900)', bd: 'var(--ink-900)' },
    ghost: { bg: 'transparent', fg: 'var(--ink-700)', bd: 'transparent' },
    accent: { bg: 'var(--accent)', fg: 'var(--accent-ink)', bd: 'var(--accent)' },
  };
  const sizes = {
    sm: { h: 28, px: 12, fs: 12 },
    md: { h: 36, px: 18, fs: 13 },
    lg: { h: 48, px: 28, fs: 14 },
  };
  const v = variants[variant]; const sz = sizes[size];
  return (
    <button onClick={onClick} style={{
      height: sz.h, padding: `0 ${sz.px}px`,
      fontFamily: 'var(--font-ui)', fontSize: sz.fs, fontWeight: 500,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      background: v.bg, color: v.fg, border: `1px solid ${v.bd}`,
      borderRadius: 0, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 8,
      width: full ? '100%' : 'auto', justifyContent: 'center',
      ...style,
    }}>
      {children}
      {icon && <span>{icon}</span>}
    </button>
  );
}

// ——— CARD (paper tile) —————————————————————————————————
function Card({ children, style, bordered = true, inset }) {
  return (
    <div style={{
      background: 'var(--paper-0)',
      border: bordered ? '1px solid var(--ink-200)' : 'none',
      padding: inset ?? 20,
      borderRadius: 0,
      ...style,
    }}>{children}</div>
  );
}

// ——— TURN GLYPH — decorative phase marker ———————————————
function PhaseGlyph({ phase }) {
  // simple ornament per phase
  const glyphs = {
    Opening: <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="2.5" fill="currentColor"/></svg>,
    'Cross-Ex': <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.2"/></svg>,
    Rebuttal: <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.2"/></svg>,
    Final: <svg width="14" height="14" viewBox="0 0 14 14"><rect x="3" y="3" width="8" height="8" fill="currentColor"/></svg>,
    Synthesis: <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.2"/><circle cx="7" cy="7" r="2" fill="currentColor"/></svg>,
  };
  return glyphs[phase] || null;
}

// ——— PLACEHOLDER — for imagery we don't have ——————————————
function Placeholder({ w = '100%', h = 160, label }) {
  return (
    <div style={{
      width: w, height: h,
      background: 'repeating-linear-gradient(135deg, var(--paper-3) 0 8px, var(--paper-2) 8px 16px)',
      border: '1px solid var(--ink-200)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-500)',
      letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>{label}</div>
  );
}

// ——— SEGMENTED CONTROL ————————————————————————————————
function Segmented({ options, value, onChange }) {
  return (
    <div style={{
      display: 'inline-flex', border: '1px solid var(--ink-900)',
      fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }}>
      {options.map((o, i) => {
        const active = o === value;
        return (
          <div key={o} onClick={() => onChange && onChange(o)} style={{
            padding: '8px 14px',
            background: active ? 'var(--ink-900)' : 'transparent',
            color: active ? 'var(--paper)' : 'var(--ink-700)',
            borderLeft: i === 0 ? 'none' : '1px solid var(--ink-900)',
            cursor: 'pointer',
          }}>{o}</div>
        );
      })}
    </div>
  );
}

// ——— TOGGLE ————————————————————————————————————————————
function Toggle({ on, label, hint, onChange }) {
  return (
    <label style={{ display: 'flex', gap: 14, alignItems: 'flex-start', cursor: 'pointer' }}>
      <div style={{
        width: 34, height: 18, borderRadius: 999,
        background: on ? 'var(--ink-900)' : 'var(--paper-3)',
        border: `1px solid ${on ? 'var(--ink-900)' : 'var(--ink-200)'}`,
        position: 'relative', flexShrink: 0, marginTop: 2,
        transition: 'all .2s',
      }}>
        <div style={{
          position: 'absolute', top: 1, left: on ? 17 : 1,
          width: 14, height: 14, borderRadius: '50%',
          background: on ? 'var(--paper)' : 'var(--ink-700)',
          transition: 'all .2s',
        }} />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, color: 'var(--ink-900)' }}>{label}</div>
        {hint && <div className="t-ui" style={{ color: 'var(--ink-500)', fontSize: 12, marginTop: 2 }}>{hint}</div>}
      </div>
    </label>
  );
}

// ——— ARGUMENT STRENGTH BAR ————————————————————————————
function StrengthBar({ value = 0.7, color = 'var(--ink-900)' }) {
  return (
    <div style={{ display: 'flex', gap: 2, height: 10, alignItems: 'flex-end' }}>
      {[0,1,2,3,4,5,6,7,8,9].map((i) => (
        <div key={i} style={{
          width: 4,
          height: 3 + i * 0.7,
          background: (i / 10) < value ? color : 'var(--ink-200)',
        }} />
      ))}
    </div>
  );
}

// ——— CARET / CURSOR — for streaming ——————————————————
function Caret() {
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 16,
      background: 'var(--ink-900)', marginLeft: 2, transform: 'translateY(3px)',
      animation: 'debater-blink 1s step-start infinite',
    }} />
  );
}

// Register blink animation once
if (typeof document !== 'undefined' && !document.getElementById('debater-anims')) {
  const s = document.createElement('style');
  s.id = 'debater-anims';
  s.textContent = `
    @keyframes debater-blink { 50% { opacity: 0; } }
    @keyframes debater-fadeup { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    .fadeup { animation: debater-fadeup .5s var(--ease-out) both; }
  `;
  document.head.appendChild(s);
}

Object.assign(window, {
  Masthead, Eyebrow, Byline, Pill, Button, Card,
  PhaseGlyph, Placeholder, Segmented, Toggle, StrengthBar, Caret,
});
