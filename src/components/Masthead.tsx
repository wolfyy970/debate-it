import type { ReactNode } from 'react';

interface MastheadProps {
  title?: string;
  edition?: string;
  right?: ReactNode;
  /** Narrow / stacked shell: tighter padding and wrapping so title + actions fit. */
  compact?: boolean;
}

export function Masthead({ title = "DEBATER", edition, right, compact }: MastheadProps) {
  return (
    <header style={{
      borderBottom: '1px solid var(--ink-900)',
      padding: compact ? '12px var(--pad-x) 10px' : '14px 28px 12px',
      display: 'flex',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      rowGap: 8,
      columnGap: compact ? 12 : 24,
      background: 'var(--paper)',
    }}>
      <a
        href="/"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: 22,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'inherit',
          textDecoration: 'none',
        }}
      >{title}</a>
      {edition && (
        <div className="t-meta" style={{ color: 'var(--ink-500)', minWidth: 0 }}>
          {edition}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }} />
      {right}
    </header>
  );
}