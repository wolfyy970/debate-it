import type { AgentRole } from '../types';
import { getRoleColorToken } from '../theme/roleColors';

interface BylineProps {
  role: AgentRole;
  style?: string;
  model?: string;
  turn?: string | number;
}

export function Byline({ role, style, model, turn }: BylineProps) {
  const roleColor = getRoleColorToken(role);

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <span style={{
        width: 8,
        height: 8,
        borderRadius: 0,
        background: roleColor,
        display: 'inline-block',
        transform: 'translateY(1px)',
      }} />
      <span className="t-meta" style={{ color: roleColor, fontWeight: 600, letterSpacing: '0.1em' }}>
        {role}
      </span>
      {style && (
        <span className="t-meta" style={{ color: 'var(--ink-500)' }}>· {style}</span>
      )}
      {model && (
        <span className="t-mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>— {model}</span>
      )}
      {turn && (
        <span className="t-mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>#{turn}</span>
      )}
    </div>
  );
}