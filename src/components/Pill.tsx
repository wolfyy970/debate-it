import type { ReactNode } from 'react';

interface PillProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'active' | 'accent' | 'ghost';
}

export function Pill({ children, active, onClick, variant }: PillProps) {
  const styles = {
    default: { bg: 'transparent', fg: 'var(--ink-700)', bd: 'var(--ink-200)' },
    active: { bg: 'var(--ink-900)', fg: 'var(--paper)', bd: 'var(--ink-900)' },
    accent: { bg: 'var(--accent-bg)', fg: 'var(--accent)', bd: 'var(--accent)' },
    ghost: { bg: 'transparent', fg: 'var(--ink-500)', bd: 'transparent' },
  };

  const s = variant ? styles[variant] : (active ? styles.active : styles.default);

  return (
    <span onClick={onClick} style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      padding: '4px 10px',
      border: `1px solid ${s.bd}`,
      color: s.fg,
      background: s.bg,
      borderRadius: 999,
      cursor: onClick ? 'pointer' : 'default',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}