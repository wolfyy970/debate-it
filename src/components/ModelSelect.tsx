import { MODEL_ROSTER } from '../types';

interface ModelSelectProps {
  value: string;
  provider: string;
  color?: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (model: string, provider: string) => void;
}

export function ModelSelect({ value, provider, color, open, onToggle, onSelect }: ModelSelectProps) {
  // Extract just the model name for display (remove provider prefix)
  const displayValue = value.includes('/') ? value.split('/').slice(1).join('/') : value;
  const displayProvider = provider || (value.includes('/') ? value.split('/')[0] : '');

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="debater-modelselect-trigger"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 12px',
          background: 'var(--paper)',
          border: `1px solid ${open ? 'var(--ink-900)' : 'var(--ink-200)'}`,
          cursor: 'pointer',
          color: 'var(--ink-900)',
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          textAlign: 'left',
          borderRadius: 0,
          transition: 'border-color var(--dur-1) var(--ease-out)',
        }}
      >
        <span style={{ color }}>{displayProvider}</span>
        <span style={{ flex: 1, fontWeight: 500 }}>{displayValue}</span>
        <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink-500)' }}>{displayProvider}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ color: 'var(--ink-500)' }}>
          <path d={open ? 'M2 6 L5 3 L8 6' : 'M2 4 L5 7 L8 4'} stroke="currentColor" strokeWidth="1.4" fill="none"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% - 1px)',
          left: 0,
          right: 0,
          background: 'var(--paper-0)',
          border: '1px solid var(--ink-900)',
          zIndex: 20,
          maxHeight: 320,
          overflow: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        }}>
          {MODEL_ROSTER.map((roster) => (
            <div key={roster.provider}>
              <div className="t-meta" style={{
                padding: '8px 12px 4px',
                color: 'var(--ink-500)',
                fontSize: 10,
                background: 'var(--paper-2)',
              }}>
                {roster.provider}
              </div>
              {roster.models.map((m) => {
                const isSelected = m === value;
                const modelName = m.includes('/') ? m.split('/').slice(1).join('/') : m;
                return (
                  <div
                    key={m}
                    className="debater-modelselect-option"
                    onClick={() => onSelect(m, roster.provider)}
                    style={{
                      padding: '8px 12px 8px 28px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-bg)' : 'transparent',
                      color: isSelected ? 'var(--accent)' : 'var(--ink-900)',
                      fontFamily: 'var(--font-ui)',
                      fontSize: 13,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid var(--ink-100)',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    <span>{modelName}</span>
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 10 10">
                        <path d="M1 5l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="1.6"/>
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}