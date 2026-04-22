import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const MOBILE_MAX = 640;
const TABLET_MAX = 1024;

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : TABLET_MAX + 1;
    if (w < MOBILE_MAX) return 'mobile';
    if (w < TABLET_MAX) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      if (w < MOBILE_MAX) setBp('mobile');
      else if (w < TABLET_MAX) setBp('tablet');
      else setBp('desktop');
    };

    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return bp;
}
