import { useEffect, useState } from 'react';
import { breakpoints } from '@/lib/breakpoints';

export type Breakpoint = 'mobile' | 'desktop';

// matchMedia mirror of the desktop breakpoint. Use for screen logic that
// needs to know layout state — pure visual responsiveness goes in CSS.
export function useBreakpoint(): Breakpoint {
  const query = `(min-width: ${breakpoints.desktop}px)`;

  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return isDesktop ? 'desktop' : 'mobile';
}
