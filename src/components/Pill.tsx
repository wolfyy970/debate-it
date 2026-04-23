import type { ReactNode } from 'react';

interface PillProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'active' | 'accent' | 'ghost';
}

export function Pill({ children, active, onClick, variant }: PillProps) {
  const looksActive = Boolean(active || variant === 'active');
  const isAccentOrGhost = variant === 'accent' || variant === 'ghost';

  if (onClick && !isAccentOrGhost) {
    return (
      <button
        type="button"
        className="debater-pill"
        data-active={looksActive ? 'true' : undefined}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }

  if (isAccentOrGhost) {
    return (
      <span className={`debater-pill debater-pill--${variant}`}>
        {children}
      </span>
    );
  }

  return (
    <span className="debater-pill" data-active={looksActive ? 'true' : undefined}>
      {children}
    </span>
  );
}
