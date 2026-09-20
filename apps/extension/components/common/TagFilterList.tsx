/**
 * TagFilterList - 可搜索的标签多选列表
 *
 * 标签数量可能上千，一次性把每个标签都渲染成节点会让下拉打开时明显卡顿，
 * 因此这里只渲染可视区域内的行（TanStack Virtual），并配一个搜索框快速收敛候选。
 */
import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Checkbox, Input, ScrollArea, cn } from "@hamhome/ui";

/** 单行高度：px-2 py-1.5 + 20px 内容，固定值让虚拟化无需实测 */
const ROW_HEIGHT = 32;

export interface TagFilterListProps {
  /** 全部可选标签 */
  allTags: string[];
  /** 已选标签 */
  selectedTags: string[];
  /** 切换某个标签的选中态 */
  onToggleTag: (tag: string) => void;
  /** 列表可视区高度（像素） */
  height?: number;
  className?: string;
}

export function TagFilterList({
  allTags,
  selectedTags,
  onToggleTag,
  height = 256,
  className,
}: TagFilterListProps) {
  const { t } = useTranslation("bookmark");
  const [keyword, setKeyword] = useState("");
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const filteredTags = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return allTags;
    return allTags.filter((tag) => tag.toLowerCase().includes(query));
  }, [allTags, keyword]);

  // 用 Set 判断选中：逐行 includes 会让渲染退化成 O(n²)
  const selectedSet = useMemo(() => new Set(selectedTags), [selectedTags]);

  const virtualizer = useVirtualizer({
    count: filteredTags.length,
    // ScrollArea 的 viewport 才是真正滚动的节点，取外层包装会读到恒为 0 的 scrollTop
    getScrollElement: () => viewportRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    // 用标签名做 key，搜索后不会沿用上一批行的状态
    getItemKey: (index) => filteredTags[index] ?? index,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div className={cn("space-y-2", className)}>
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={t("bookmark:contentPanel.searchTags")}
          className="pl-8 pr-7 h-8 text-xs"
        />
        {keyword && (
          <button
            type="button"
            onClick={() => setKeyword("")}
            aria-label={t("bookmark:contentPanel.clearSearch")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {filteredTags.length === 0 ? (
        <p className="text-sm text-muted-foreground p-2">
          {allTags.length === 0
            ? t("bookmark:tags.empty")
            : t("bookmark:contentPanel.noMatchingTags")}
        </p>
      ) : (
        // type="auto"：内容溢出就常驻滚动条。默认的 hover 模式在指针进入前会把
        // viewport 的 overflow 设成 hidden，虚拟化拿到的就不是真正的滚动容器
        <ScrollArea
          type="auto"
          viewportRef={viewportRef}
          // 标签少时不必撑满，弹层跟着内容收窄
          style={{ height: Math.min(height, totalSize) }}
        >
          <div className="relative w-full" style={{ height: totalSize }}>
            {virtualItems.map((virtualItem) => {
              const tag = filteredTags[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  onClick={() => onToggleTag(tag)}
                  className="absolute left-0 top-0 flex w-full items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm text-left cursor-pointer"
                  style={{
                    height: virtualItem.size,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <Checkbox checked={selectedSet.has(tag)} />
                  <span className="truncate">{tag}</span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
