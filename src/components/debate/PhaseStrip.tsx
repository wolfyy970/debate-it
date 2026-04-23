import { PhaseGlyph } from '../PhaseGlyph';
import type { ScheduleSegment } from '../../lib/debateSchedule';

export function PhaseStrip({
  segments,
  activeSegmentIndex,
  variant = 'live',
}: {
  segments: ScheduleSegment[];
  /** Index into `segments` for the active pill; `null` = none highlighted (e.g. setup preview). */
  activeSegmentIndex: number | null;
  variant?: 'live' | 'preview';
}) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {segments.map((seg, i) => {
        const isActive = activeSegmentIndex !== null && i === activeSegmentIndex;
        const isPast = activeSegmentIndex !== null && i < activeSegmentIndex;
        const color =
          variant === 'preview'
            ? 'var(--ink-500)'
            : isActive
              ? 'var(--accent)'
              : isPast
                ? 'var(--ink-700)'
                : 'var(--ink-300)';
        return (
          <div
            key={`${seg.phase}-${seg.label}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color,
              fontWeight: isActive ? 600 : 400,
            }}
          >
            <PhaseGlyph phase={seg.phase} />
            <span className="t-meta" style={{ color: 'inherit' }}>
              {seg.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
