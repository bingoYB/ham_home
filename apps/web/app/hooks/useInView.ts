'use client';

import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  /** Fraction of the element that must be visible, 0-1. Keep it 0 so tall blocks still reveal on small screens */
  threshold?: number;
  /** IntersectionObserver rootMargin, e.g. shrink the bottom edge to trigger a bit later */
  rootMargin?: string;
}

/**
 * Reports whether an element has entered the viewport. Fires once and then
 * stops observing, so revealed content never animates out again.
 * Browsers without IntersectionObserver report visible immediately.
 */
export function useInView<T extends Element = HTMLDivElement>({
  threshold = 0,
  rootMargin = '0px 0px -8% 0px',
}: UseInViewOptions = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, inView };
}
