import { useState, useEffect } from 'react';
import {
  breakpointFromWidth,
  type BreakpointName,
  TABLET_MAX_EXCLUSIVE,
} from '../theme/breakpoints';

export type Breakpoint = BreakpointName;

export interface UseBreakpointResult {
  bp: BreakpointName;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Main + fixed rails stack (mobile + tablet); split two-column shell only on desktop. */
  stackShell: boolean;
}

function computeState(width: number): UseBreakpointResult {
  const bp = breakpointFromWidth(width);
  return {
    bp,
    isMobile: bp === 'mobile',
    isTablet: bp === 'tablet',
    isDesktop: bp === 'desktop',
    stackShell: bp !== 'desktop',
  };
}

export function useBreakpoint(): UseBreakpointResult {
  const [state, setState] = useState<UseBreakpointResult>(() =>
    computeState(typeof window !== 'undefined' ? window.innerWidth : TABLET_MAX_EXCLUSIVE),
  );

  useEffect(() => {
    const onResize = () => setState(computeState(window.innerWidth));
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return state;
}
