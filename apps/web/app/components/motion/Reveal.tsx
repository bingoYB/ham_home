'use client';

import type { CSSProperties, ElementType, HTMLAttributes } from 'react';
import { cn } from '@hamhome/ui';
import { useInView } from '@/app/hooks/useInView';

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
