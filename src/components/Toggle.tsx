interface ToggleProps {
  on: boolean;
  label: string;
  hint?: string;
  onChange?: (on: boolean) => void;
}

export function Toggle({ on, label, hint, onChange }: ToggleProps) {
  return (
    <label style={{ display: 'flex', gap: 14, alignItems: 'flex-start', cursor: 'pointer' }}>
      <div
        onClick={() => onChange?.(!on)}
        style={{
          width: 34,
          height: 18,
          borderRadius: 999,
          background: on ? 'var(--ink-900)' : 'var(--paper-3)',
          border: `1px solid ${on ? 'var(--ink-900)' : 'var(--ink-200)'}`,
          position: 'relative',
          flexShrink: 0,
          marginTop: 2,
          transition: 'all .2s',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 1,
          left: on ? 17 : 1,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: on ? 'var(--paper)' : 'var(--ink-700)',
          transition: 'all .2s',
        }} />
      </div>
      <div>
        <div style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--ink-900)'
        }}>{label}</div>
        {hint && (
          <div className="t-ui" style={{ color: 'var(--ink-500)', fontSize: 12, marginTop: 2 }}>
            {hint}
          </div>
        )}
      </div>
    </label>
  );
}