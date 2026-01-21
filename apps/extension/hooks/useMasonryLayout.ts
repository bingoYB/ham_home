/**
 * 瀑布流布局计算 Hook
 */
import { useState, useEffect, useCallback, useRef, type RefObject } from 'react';
import { masonryCompute, MasonryComputeMode } from '@hamhome/ui';

interface MasonryConfig {
  cols: number;
  columnSize: number;
}

interface UseMasonryLayoutOptions {
  benchWidth?: number;
  itemGap?: number;
  maxCol?: number;
  minCol?: number;
  containerPadding?: number;
}

export function useMasonryLayout(options: UseMasonryLayoutOptions = {}): {
  containerRef: RefObject<HTMLDivElement | null>;
  config: MasonryConfig;
} {
  const {
    benchWidth = 356,
    itemGap = 16,
    maxCol = 12,
    minCol = 1,
    containerPadding = 48,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<MasonryConfig>({ cols: 4, columnSize: 356 });

  const computeLayout = useCallback(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth - containerPadding;
    const result = masonryCompute({
      containerWidth,
      benchWidth,
      mode: MasonryComputeMode.PREFER,
      itemGap,
      maxCol,
      minCol,
    });

    if (result) {
      setConfig({ cols: result.cols, columnSize: result.columnSize });
    }
  }, [benchWidth, itemGap, maxCol, minCol, containerPadding]);

  useEffect(() => {
    computeLayout();

    const resizeObserver = new ResizeObserver(() => {
      computeLayout();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [computeLayout]);

  return { containerRef, config };
}
