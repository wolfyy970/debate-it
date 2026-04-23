import type { CSSProperties } from 'react';
import type { Source } from '../types';

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Inline bracketed citation `[N]` with hover/focus preview and click-to-open.
 * Uses `.debater-cite` / `.debater-cite-popover` from `tokens.css` (not inline hover rules).
 */
export function CitationRef({
  n,
  source,
  accentColor,
}: {
  n: number;
  source: Source | undefined;
  accentColor: string;
}) {
  if (!source?.url) {
    return (
      <span className="debater-cite debater-cite--missing" title="Unknown source">
        [{n}]
      </span>
    );
  }

  const host = hostnameFromUrl(source.url);
  const title = source.title?.trim() || host;
  const snippet = source.snippet?.trim();

  const open = () => {
    window.open(source.url, '_blank', 'noopener,noreferrer');
  };

  const style = { '--cite-accent': accentColor } as CSSProperties;

  return (
    <span className="debater-cite-wrap">
      <button
        type="button"
        className="debater-cite"
        style={style}
        onClick={open}
        aria-label={`Open source ${n}: ${title}`}
      >
        [{n}]
      </button>
      <span className="debater-cite-popover" role="tooltip">
        <span className="debater-cite-popover__title">{title}</span>
        {snippet ? <span className="debater-cite-popover__snippet">{snippet}</span> : null}
        <span className="debater-cite-popover__host">{host}</span>
      </span>
    </span>
  );
}
