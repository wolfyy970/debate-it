import type { ReactNode } from 'react';
import type { Phase } from '../types';

interface PhaseGlyphProps {
  phase: Phase;
}

export function PhaseGlyph({ phase }: PhaseGlyphProps) {
  const glyphs: Record<Phase, ReactNode> = {
    Opening: (
      <svg width="14" height="14" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="2.5" fill="currentColor"/>
      </svg>
    ),
    'Cross-Ex': (
      <svg width="14" height="14" viewBox="0 0 14 14">
        <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
    Rebuttal: (
      <svg width="14" height="14" viewBox="0 0 14 14">
        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
    Final: (
      <svg width="14" height="14" viewBox="0 0 14 14">
        <rect x="3" y="3" width="8" height="8" fill="currentColor"/>
      </svg>
    ),
    Synthesis: (
      <svg width="14" height="14" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="7" cy="7" r="2" fill="currentColor"/>
      </svg>
    ),
  };

  return glyphs[phase] || null;
}