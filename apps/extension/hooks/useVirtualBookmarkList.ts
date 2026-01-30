/**
 * 虚拟书签列表 Hook
 * 使用 TanStack Virtual 实现高性能虚拟滚动
 */
import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface UseVirtualBookmarkListOptions {
  /** 书签列表 */
  items: { id: string }[];
  /** 每项估计高度 */
  estimateSize?: number;
  /** 过扫描数量（预渲染的额外项数） */
  overscan?: number;
}

interface UseVirtualBookmarkListReturn {
  /** 滚动容器 ref */
  parentRef: React.RefObject<HTMLDivElement | null>;
  /** 虚拟列表实例 */
  virtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;
  /** 虚拟项列表 */
  virtualItems: ReturnType<
    typeof useVirtualizer<HTMLDivElement, Element>
  >["getVirtualItems"] extends () => infer R
    ? R
    : never;
  /** 总高度 */
  totalSize: number;
  /** 滚动到指定书签 */
  scrollToBookmark: (bookmarkId: string) => void;
  /** 书签元素 refs Map */
  bookmarkRefs: React.RefObject<Map<string, HTMLElement>>;
}

/**
 * 虚拟书签列表 Hook
 * @param options 配置选项
 * @returns 虚拟列表控制对象
 */
export function useVirtualBookmarkList({
  items,
  estimateSize = 88, // BookmarkListItem 默认高度约 88px (p-4 = 32px padding + ~56px content)
  overscan = 5,
}: UseVirtualBookmarkListOptions): UseVirtualBookmarkListReturn {
  const parentRef = useRef<HTMLDivElement>(null);
  const bookmarkRefs = useRef<Map<string, HTMLElement>>(new Map());

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () =>
      document.querySelector("#main-content>div") as HTMLDivElement,
    estimateSize: () => estimateSize,
    overscan,
    // 使用书签 ID 作为 key
    getItemKey: (index) => items[index]?.id ?? index,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // 滚动到指定书签
  const scrollToBookmark = useCallback(
    (bookmarkId: string) => {
      const index = items.findIndex((item) => item.id === bookmarkId);
      if (index !== -1) {
        virtualizer.scrollToIndex(index, {
          align: "center",
          behavior: "smooth",
        });
      }
    },
    [items, virtualizer],
  );

  return {
    parentRef,
    virtualizer,
    virtualItems,
    totalSize,
    scrollToBookmark,
    bookmarkRefs,
  };
}
