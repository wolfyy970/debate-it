import { describe, expect, it } from 'vitest';
import { breakpointFromWidth, MOBILE_MAX_EXCLUSIVE, TABLET_MAX_EXCLUSIVE } from '../theme/breakpoints';

describe('breakpointFromWidth', () => {
  it('matches tokens.css thresholds', () => {
    expect(MOBILE_MAX_EXCLUSIVE).toBe(641);
    expect(TABLET_MAX_EXCLUSIVE).toBe(1025);
  });

  it('classifies viewports', () => {
    expect(breakpointFromWidth(375)).toBe('mobile');
    expect(breakpointFromWidth(640)).toBe('mobile');
    expect(breakpointFromWidth(641)).toBe('tablet');
    expect(breakpointFromWidth(900)).toBe('tablet');
    expect(breakpointFromWidth(1024)).toBe('tablet');
    expect(breakpointFromWidth(1025)).toBe('desktop');
  });
});
