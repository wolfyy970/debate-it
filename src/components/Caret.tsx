export function Caret() {
  return (
    <span style={{
      display: 'inline-block',
      width: 7,
      height: 16,
      background: 'var(--ink-900)',
      marginLeft: 2,
      transform: 'translateY(3px)',
      animation: 'debater-blink 1s step-start infinite',
    }} />
  );
}