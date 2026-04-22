import type { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  onClick?: () => void;
  full?: boolean;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  onClick,
  full,
  style = {},
  disabled,
}: ButtonProps) {
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

  const v = variants[variant];
  const sz = sizes[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: sz.h,
        padding: `0 ${sz.px}px`,
        fontFamily: 'var(--font-ui)',
        fontSize: sz.fs,
        fontWeight: 500,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: v.bg,
        color: v.fg,
        border: `1px solid ${v.bd}`,
        borderRadius: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        width: full ? '100%' : 'auto',
        justifyContent: 'center',
        ...style,
      }}
    >
      {children}
      {icon && <span>{icon}</span>}
    </button>
  );
}