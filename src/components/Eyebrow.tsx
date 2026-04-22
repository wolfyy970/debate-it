interface EyebrowProps {
  children: React.ReactNode;
  accent?: boolean;
}

export function Eyebrow({ children, accent }: EyebrowProps) {
  return (
    <div className="t-meta" style={{
      color: accent ? 'var(--accent)' : 'var(--ink-500)',
      marginBottom: 6,
    }}>{children}</div>
  );
}