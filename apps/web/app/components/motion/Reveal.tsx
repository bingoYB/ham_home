'use client';

import { useEffect, type CSSProperties, type ElementType, type HTMLAttributes } from 'react';
import { cn } from '@hamhome/ui';
import { useInView } from '@/app/hooks/useInView';
import { REVEAL_READY_CLASS } from '@/app/lib/reveal-gate';

export type RevealVariant = 'up' | 'scale' | 'left' | 'right';

interface RevealProps extends HTMLAttributes<HTMLElement> {
  /** Element to render, defaults to div */
  as?: ElementType;
  variant?: RevealVariant;
  /** Delay in ms, used to stagger siblings */
  delay?: number;
}

/**
 * Fades its children in as they scroll into view.
 * Content stays in the DOM (and in the static HTML) the whole time; only
 * opacity/transform change, and prefers-reduced-motion disables the motion.
 * The hidden start state only applies behind the gate in `app/lib/reveal-gate.ts`,
 * so the content stays visible when scripts are off, blocked or fail to hydrate.
 */
export function Reveal({
  as: Component = 'div',
  variant = 'up',
  delay = 0,
  className,
  style,
  children,
  ...rest
}: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>();

  // Hydrated: keep the gate so off-screen blocks wait for the observer instead of the fallback timer.
  useEffect(() => {
    document.documentElement.classList.add(REVEAL_READY_CLASS);
  }, []);

  return (
    <Component
      ref={ref}
      data-reveal={variant}
      className={cn('reveal', inView && 'is-visible', className)}
      style={{ ...style, '--reveal-delay': `${delay}ms` } as CSSProperties}
      {...rest}
    >
      {children}
    </Component>
  );
}
