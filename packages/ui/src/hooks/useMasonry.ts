/**
 * Masonry Hooks
 * 参考 Masonic 库的设计，将瀑布流逻辑拆分为多个独立的 hooks
 */
import * as React from "react";
import { createPositioner, type IPositioner, type PositionerItem } from "../lib/positioner";
import { elementsCache } from "../lib/elements-cache";

// ==================== useForceUpdate ====================

/**
 * 强制更新 hook
 */
export function useForceUpdate(): () => void {
  const [, setState] = React.useState({});
  return React.useRef(() => setState({})).current;
}

// ==================== usePositioner ====================

export interface UsePositionerOptions {
  /** 容器宽度 */
  width: number;
  /** 列宽 */
  columnWidth?: number;
  /** 列间距 */
  columnGutter?: number;
  /** 行间距（默认等于列间距） */
  rowGutter?: number;
  /** 固定列数（设置后忽略 columnWidth 自动计算） */
  columnCount?: number;
  /** 最大列数 */
  maxColumnCount?: number;
}

/**
 * 计算列数和列宽
 */
function getColumns(
  width: number,
  minimumWidth: number,
  gutter: number,
  columnCount?: number,
  maxColumnCount?: number
): [number, number] {
  let cols =
    columnCount ||
    Math.min(
      Math.floor((width + gutter) / (minimumWidth + gutter)),
      maxColumnCount || Infinity
    ) ||
    1;

  const columnWidth = Math.floor((width - gutter * (cols - 1)) / cols);
  return [columnWidth, cols];
}

/**
 * 创建位置管理器的 hook
 * @param options 配置选项
 * @param deps 依赖项数组，变化时会重建 positioner
 */
export function usePositioner(
  options: UsePositionerOptions,
  deps: React.DependencyList = []
): IPositioner {
  const {
    width,
    columnWidth = 200,
    columnGutter = 0,
    rowGutter,
    columnCount,
    maxColumnCount,
  } = options;

  const initPositioner = (): IPositioner => {
    const [computedColumnWidth, computedColumnCount] = getColumns(
      width,
      columnWidth,
      columnGutter,
      columnCount,
      maxColumnCount
    );
    return createPositioner(
      computedColumnCount,
      computedColumnWidth,
      columnGutter,
      rowGutter ?? columnGutter
    );
  };

  const positionerRef = React.useRef<IPositioner>(initPositioner());


  const prevDeps = React.useRef(deps);
  const opts = [width, columnWidth, columnGutter, rowGutter, columnCount, maxColumnCount];
  const prevOpts = React.useRef(opts);
  const optsChanged = !opts.every((item, i) => prevOpts.current[i] === item);

  // 当依赖项或配置变化时重建 positioner
  if (optsChanged || !deps.every((item, i) => prevDeps.current[i] === item)) {
    const prevPositioner = positionerRef.current;
    const positioner = initPositioner();
    prevDeps.current = deps;
    prevOpts.current = opts;

    // 如果配置变化，迁移已有位置数据
    if (optsChanged && prevPositioner) {
      const cacheSize = prevPositioner.size();
      for (let index = 0; index < cacheSize; index++) {
        const pos = prevPositioner.get(index);
        positioner.set(index, pos !== undefined ? pos.height : 0);
      }
    }

    positionerRef.current = positioner;
  }

  return positionerRef.current;
}

// ==================== useResizeObserver ====================

/**
 * RAF 调度器
 */
function rafSchedule<T extends (...args: HTMLElement[]) => void>(fn: T): T & { cancel: () => void } {
  let rafId: number | null = null;

  const scheduled = ((...args: HTMLElement[]) => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      rafId = null;
      fn(...args);
    });
  }) as T & { cancel: () => void };

  scheduled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  return scheduled;
}

export interface ResizeObserverInstance {
  observe: ResizeObserver["observe"];
  unobserve: ResizeObserver["unobserve"];
  disconnect: ResizeObserver["disconnect"];
}

/**
 * 创建 ResizeObserver
 * 监听元素尺寸变化并更新 positioner
 */
export function createResizeObserver(
  positioner: IPositioner,
  updater: () => void
): ResizeObserverInstance {
  const updates: number[] = [];
  const handlers = new Map<number, ReturnType<typeof rafSchedule>>();

  const update = rafSchedule(() => {
    if (updates.length > 0) {
      positioner.update(updates);
      updater();
    }
    updates.length = 0;
  });

  const commonHandler = (target: HTMLElement) => {
    const height = target.offsetHeight;
    if (height > 0) {
      const index = elementsCache.get(target);
      if (index !== undefined) {
        const position = positioner.get(index);
        if (position !== undefined && height !== position.height) {
          updates.push(index, height);
        }
      }
    }
    update();
  };

  const handleEntries: ResizeObserverCallback = (entries) => {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const index = elementsCache.get(entry.target);
      if (index === undefined) continue;

      let handler = handlers.get(index);
      if (!handler) {
        handler = rafSchedule(commonHandler);
        handlers.set(index, handler);
      }
      handler(entry.target as HTMLElement);
    }
  };

  const ro = new ResizeObserver(handleEntries);

  // 扩展 disconnect 方法，取消所有待处理的 handlers
  const originalDisconnect = ro.disconnect.bind(ro);
  ro.disconnect = () => {
    originalDisconnect();
    update.cancel();
    handlers.forEach((handler) => handler.cancel());
    handlers.clear();
  };

  return ro;
}

/**
 * ResizeObserver hook
 * 自动监听元素尺寸变化并更新布局
 */
export function useResizeObserver(positioner: IPositioner): ResizeObserverInstance {
  const forceUpdate = useForceUpdate();

  const resizeObserverRef = React.useRef<ResizeObserverInstance | null>(null);

  // 当 positioner 变化时重建 ResizeObserver
  if (!resizeObserverRef.current) {
    resizeObserverRef.current = createResizeObserver(positioner, forceUpdate);
  }

  React.useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, []);

  // 当 positioner 变化时更新 ResizeObserver
  React.useEffect(() => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = createResizeObserver(positioner, forceUpdate);
  }, [positioner, forceUpdate]);

  return resizeObserverRef.current;
}

// ==================== useScroller ====================

export interface ScrollerResult {
  scrollTop: number;
  isScrolling: boolean;
}

/**
 * 滚动状态 hook
 * @param scrollElement 滚动元素
 * @param offset 容器到滚动元素顶部的偏移量
 */
export function useScroller(
  scrollElement?: HTMLElement | null,
  offset = 0
): ScrollerResult {
  const [scrollTop, setScrollTop] = React.useState(0);
  const [isScrolling, setIsScrolling] = React.useState(false);
  const scrollingTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const target = scrollElement || window;

    const getScrollTop = (): number => {
      if (target instanceof Window) return target.scrollY;
      return target.scrollTop;
    };

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        setScrollTop(getScrollTop() - offset);
        setIsScrolling(true);

        // 150ms 后标记为非滚动状态
        if (scrollingTimeoutRef.current !== null) {
          clearTimeout(scrollingTimeoutRef.current);
        }
        scrollingTimeoutRef.current = window.setTimeout(() => {
          setIsScrolling(false);
        }, 150);
      });
    };

    // 初始化
    setScrollTop(getScrollTop() - offset);
    target.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      target.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (scrollingTimeoutRef.current !== null) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, [scrollElement, offset]);

  return { scrollTop, isScrolling };
}

// ==================== useContainerPosition ====================

export interface ContainerPosition {
  /** 容器到文档顶部的偏移量 */
  offset: number;
  /** 容器宽度 */
  width: number;
  /** 容器高度（可视区域高度） */
  height: number;
}

/**
 * 容器位置 hook
 * 获取容器相对于滚动元素的位置和尺寸
 */
export function useContainerPosition(
  containerRef: React.RefObject<HTMLElement | null>,
  scrollElement?: HTMLElement | null,
  deps: React.DependencyList = []
): ContainerPosition {
  const [position, setPosition] = React.useState<ContainerPosition>({
    offset: 0,
    width: 0,
    height: 0,
  });

  React.useLayoutEffect(() => {
    const updatePosition = () => {
      const container = containerRef.current;
      if (!container) return;

      const scrollEl = scrollElement || document.documentElement;
      const containerRect = container.getBoundingClientRect();
      const scrollRect = scrollEl.getBoundingClientRect();

      const offset = containerRect.top - scrollRect.top + (scrollElement?.scrollTop ?? window.scrollY);
      const width = container.offsetWidth;
      const height = scrollElement?.clientHeight ?? window.innerHeight;

      setPosition({ offset, width, height });
    };

    updatePosition();

    // 监听窗口 resize
    window.addEventListener("resize", updatePosition);

    // 监听容器
    const resizeObserver = new ResizeObserver(updatePosition);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updatePosition);
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, scrollElement, ...deps]);

  return position;
}

// ==================== 类型导出 ====================

export type {
  IPositioner,
  PositionerItem,
} from "../lib/positioner";
