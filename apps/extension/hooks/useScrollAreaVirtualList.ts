/**
 * 页面级 ScrollArea 内的虚拟列表 Hook
 *
 * 适用于「列表上方还有标题、统计卡片等内容一起滚动」的页面：
 * 整页只有一个滚动容器（ScrollArea 的 viewport），列表只是其中一段。
 * 这种场景必须告诉虚拟化器列表在滚动内容里的起始位置（scrollMargin），
 * 否则虚拟窗口会整体错位——滚到列表区时渲染出来的是另一批行。
 *
 * 行高不固定时交给 measureElement 实测，estimateSize 只用于实测前占位。
 */
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";

interface UseScrollAreaVirtualListOptions {
  /** 列表项总数 */
  count: number;
  /** 每项估计高度（像素），实测前用于占位 */
  estimateSize: number;
  /** 项与项之间的间距（像素） */
  gap?: number;
  /** 过扫描数量（视口外额外渲染的项数） */
  overscan?: number;
  /** 稳定的列表项 key，避免筛选后沿用别人的高度缓存 */
  getItemKey?: (index: number) => string | number;
}

interface UseScrollAreaVirtualListReturn {
  /** 传给 `ScrollArea` 的 `viewportRef`：viewport 才是真正滚动的节点 */
  viewportRef: React.RefObject<HTMLDivElement | null>;
  /** 挂在列表容器上，用于测量列表在滚动内容里的起始位置 */
  listRef: (node: HTMLDivElement | null) => void;
  /** 当前需要渲染的虚拟项 */
  virtualItems: VirtualItem[];
  /** 列表容器应设置的高度（像素） */
  totalSize: number;
  /** 列表起始位置，渲染每项时要从 `virtualItem.start` 中减掉 */
  scrollMargin: number;
  /** 实测行高，挂在每个列表项上（元素需带 `data-index`） */
  measureElement: (node: Element | null) => void;
}

export function useScrollAreaVirtualList({
  count,
  estimateSize,
  gap = 0,
  overscan = 6,
  getItemKey,
}: UseScrollAreaVirtualListOptions): UseScrollAreaVirtualListReturn {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [listElement, setListElement] = useState<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  const listRef = useCallback((node: HTMLDivElement | null) => {
    setListElement(node);
  }, []);

  // 列表上方的内容（统计卡片、筛选栏换行等）高度会变，变了就要重新量，
  // 所以除了首次测量，还要盯着滚动内容和视口的尺寸变化
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!listElement || !viewport) return;

    const measure = () => {
      // rect 差值会随滚动缩小，加回 scrollTop 后即与滚动位置无关
      const offset =
        listElement.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top +
        viewport.scrollTop;
      setScrollMargin((prev) => (Math.abs(prev - offset) < 1 ? prev : offset));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(listElement);
    // 滚动内容层：列表上方任何元素高度变化都会反映到它身上
    const content = viewport.firstElementChild;
    if (content) observer.observe(content);

    return () => observer.disconnect();
  }, [listElement]);

  const virtualizer = useVirtualizer({
    count,
    // viewport 才是滚动容器，取外层包装节点会读到恒为 0 的 scrollTop
    getScrollElement: () => viewportRef.current,
    estimateSize: () => estimateSize,
    gap,
    overscan,
    scrollMargin,
    getItemKey,
  });

  return {
    viewportRef,
    listRef,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    scrollMargin,
    measureElement: virtualizer.measureElement,
  };
}
