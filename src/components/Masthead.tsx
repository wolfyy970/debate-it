import type { ReactNode } from 'react';

interface MastheadProps {
  title?: string;
  edition?: string;
  right?: ReactNode;
}

export function Masthead({ title = "DEBATER", edition, right }: MastheadProps) {
  return (
    <header style={{
      borderBottom: '1px solid var(--ink-900)',
      padding: '14px 28px 12px',
      display: 'flex',
      alignItems: 'baseline',
      gap: 24,
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
        <div className="t-meta" style={{ color: 'var(--ink-500)' }}>
          {edition}
        </div>
      )}
      <div style={{ flex: 1 }} />
      {right}
    </header>
  );
}