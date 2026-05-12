'use client';

import type { ReactNode } from 'react';
import { cn } from '@hamhome/ui';

interface FeatureSectionProps {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  /** 偶数/奇数行交替背景 */
  alternate?: boolean;
  className?: string;
}

/**
 * 功能展示区块 - 垂直排列的功能介绍容器
 * 每个区块包含标题、描述文字和 Demo 内容
 */
export function FeatureSection({
  id,
  icon,
  title,
  description,
  children,
  alternate = false,
  className,
}: FeatureSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'relative py-16 sm:py-20 lg:py-24 overflow-hidden',
        alternate && 'bg-muted/30',
        className,
      )}
    >
      {/* 装饰性背景渐变 */}
      {alternate && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -right-40 -bottom-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        </div>
      )}

      <div className="container relative mx-auto px-4">
        {/* 区块标题 */}
        <div className="mb-10 max-w-2xl sm:mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h2>
          </div>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
        </div>

        {/* Demo 内容 */}
        <div className="relative">{children}</div>
      </div>
    </section>
  );
}
