import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: React.CSSProperties;
  bordered?: boolean;
  inset?: number;
}

export function Card({ children, style, bordered = true, inset }: CardProps) {
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