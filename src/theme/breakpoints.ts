/**
 * Viewport breakpoints — keep in sync with `src/tokens.css` responsive utilities:
 * - `@media (min-width: 641px)` → first non-mobile layout
 * - `@media (min-width: 1025px)` → desktop / hide-tablet utilities
 */
export type BreakpointName = 'mobile' | 'tablet' | 'desktop';

/** Widths strictly below this are treated as mobile (matches CSS min-width: 641px). */
export const MOBILE_MAX_EXCLUSIVE = 641;

/** Widths strictly below this are mobile or tablet; desktop starts here (matches CSS min-width: 1025px). */
export const TABLET_MAX_EXCLUSIVE = 1025;

export function breakpointFromWidth(width: number): BreakpointName {
  if (width < MOBILE_MAX_EXCLUSIVE) return 'mobile';
  if (width < TABLET_MAX_EXCLUSIVE) return 'tablet';
  return 'desktop';
}
