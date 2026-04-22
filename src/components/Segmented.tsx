interface SegmentedProps {
  options: string[];
  value: string;
  onChange?: (value: string) => void;
}

export function Segmented({ options, value, onChange }: SegmentedProps) {
  return (
    <div style={{
      display: 'inline-flex',
      border: '1px solid var(--ink-900)',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }}>
      {options.map((o, i) => {
        const active = o === value;
        return (
          <div
            key={o}
            onClick={() => onChange?.(o)}
            style={{
              padding: '8px 14px',
              background: active ? 'var(--ink-900)' : 'transparent',
              color: active ? 'var(--paper)' : 'var(--ink-700)',
              borderLeft: i === 0 ? 'none' : '1px solid var(--ink-900)',
              cursor: 'pointer',
            }}
          >
            {o}
          </div>
        );
      })}
    </div>
  );
}