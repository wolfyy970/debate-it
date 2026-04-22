import { PhaseGlyph } from '../PhaseGlyph';
import type { Phase } from '../../types';
import { PHASES } from '../../types';

export function PhaseStrip({ phase }: { phase: Phase }) {
  const idx = PHASES.indexOf(phase);
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {PHASES.map((p, i) => (
        <div
          key={p}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: i === idx ? 'var(--accent)' : i < idx ? 'var(--ink-700)' : 'var(--ink-300)',
            fontWeight: i === idx ? 600 : 400,
          }}
        >
          <PhaseGlyph phase={p} />
          <span className="t-meta" style={{ color: 'inherit' }}>
            {p}
          </span>
        </div>
      ))}
    </div>
  );
}
