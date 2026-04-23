import type { CSSProperties, ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  onClick?: () => void;
  full?: boolean;
  style?: CSSProperties;
  disabled?: boolean;
  className?: string;
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
  className: classNameProp,
}: ButtonProps) {
  const className = [
    'debater-btn',
    `debater-btn--${variant}`,
    `debater-btn--${size}`,
    full && 'debater-btn--full',
    classNameProp,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
      {icon && <span>{icon}</span>}
    </button>
  );
}
