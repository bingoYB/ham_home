/**
 * 瀑布流组件 (高性能版)
 *
 * 优化点:
 * 1. 使用 O(1) 索引直接访问，去除 ID-Map 映射
 * 2. 滚动时禁用 pointer-events
 * 3. 修复窗口调整和初始加载问题
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPositioner, type IPositioner, type PositionerItem } from "../lib/positioner";
import { elementsCache } from "../lib/elements-cache";
import {
  useForceUpdate,
  useResizeObserver,
  useScroller,
  useContainerPosition,
  type ResizeObserverInstance,
} from "../hooks/useMasonry";

// ==================== 工具函数 ====================

function resolveScrollElement(
  scrollElement: HTMLElement | string | (() => HTMLElement | null) | undefined
): HTMLElement | null {
  if (!scrollElement) return null;
  if (typeof scrollElement === "function") return scrollElement();
  if (typeof scrollElement === "string") return document.getElementById(scrollElement);
  return scrollElement;
}

// ==================== 类型定义 ====================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

/**
 * 获取 brick 的 id
 */
function defaultGetBrickId(record: AnyRecord, index: number, brickIdKey?: string): string {
  if (brickIdKey && record[brickIdKey] !== undefined) {
    return String(record[brickIdKey]);
  }
  return String(index);
}

export interface MasonryProps<T extends AnyRecord = AnyRecord> {
  /** 用于标识 brick 的 key，如果不传则使用索引 */
  brickId?: string;
  /** 数据列表 */
  bricks?: T[];
  /** 渲染函数 */
  render: (brick: T) => React.ReactNode;
  /** 间距 */
  gutter?: number;
  /** 列宽 */
  columnSize?: number;
  /** 列数 */
  columnNum?: number;
  /** 预加载区域（倍数或像素值） */
  threshold?: number;
  /** 滚动元素 */
  scrollElement?: HTMLElement | string | (() => HTMLElement | null);
  /** 容器类名 */
  className?: string;
  /** 渲染完成回调 */
  onRendered?: (startIndex: number, stopIndex: number) => void;
  /** 子元素 */
  children?: React.ReactNode;
  /** 默认元素高度估算值 */
  itemHeightEstimate?: number;
}

export interface MasonryRef {
  /** 获取所有元素位置信息（用于框选） */
  getBricksPosition: () => {
    containerOffsetTop: number | undefined;
    containerOffsetLeft: number | undefined;
    computedBricks: React.MutableRefObject<Map<string, PositionerItem>>;
  };
  /** 强制重新布局 */
  relayout: () => void;
}

// ==================== 内部组件 ====================

interface MasonryItemProps {
  index: number;
  position: PositionerItem | null;
  columnWidth: number;
  resizeObserver: ResizeObserverInstance;
  positioner: IPositioner;
  children: React.ReactNode;
  recordId: string;
}

/**
 * 单个瀑布流元素
 */
const MasonryItem = React.memo(function MasonryItem({
  index,
  position,
  columnWidth,
  resizeObserver,
  positioner,
  children,
  recordId,
}: MasonryItemProps) {
  const refCallback = useCallback(
    (el: HTMLDivElement | null) => {
      if (el === null) return;

      resizeObserver.observe(el);
      elementsCache.set(el, index);

      if (positioner.get(index) === undefined) {
        positioner.set(index, el.offsetHeight);
      }
    },
    [index, resizeObserver, positioner]
  );

  let style: React.CSSProperties;
  let className: string;

  if (position) {
    style = {
      position: "absolute",
      top: 0,
      left: 0,
      transform: `translate(${position.left}px, ${position.top}px)`,
      width: columnWidth,
      writingMode: "horizontal-tb",
    };
    className = "masonry-item visible pointer-events-auto";
  } else {
    style = {
      position: "absolute",
      width: columnWidth,
      zIndex: -1000,
      visibility: "hidden",
      writingMode: "horizontal-tb",
    };
    className = "masonry-item invisible pointer-events-none";
  }

  return (
    <div
      ref={refCallback}
      data-masonry-id={recordId}
      data-masonry-index={index}
      className={className}
      style={style}
    >
      {children}
    </div>
  );
});

// ==================== 主组件 ====================

// 默认视口高度，用于初始加载时容器高度还未测量的情况
const DEFAULT_VIEWPORT_HEIGHT = 800;

export default forwardRef<MasonryRef, MasonryProps>(
  function Masonry(
    {
      brickId,
      bricks = [],
      render,
      gutter = 24,
      columnSize = 240,
      columnNum = 4,
      children,
      threshold = 2,
      scrollElement,
      className = "masonry",
      onRendered,
      itemHeightEstimate = 300,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const forceUpdate = useForceUpdate();
    
    // 用于追踪 positioner 版本，当配置变化时强制重新渲染
    const [positionerVersion, setPositionerVersion] = useState(0);

    // 解析滚动元素
    const resolvedScrollElement = useMemo(
      () => resolveScrollElement(scrollElement),
      [scrollElement]
    );

    // 容器位置
    const containerPosition = useContainerPosition(
      containerRef,
      resolvedScrollElement
    );

    // 创建位置管理器
    const positioner = useMemo<IPositioner>(() => {
      return createPositioner(columnNum, columnSize, gutter, gutter);
    }, [columnNum, columnSize, gutter]);

    // 当 positioner 重建时，触发版本更新以强制重新渲染
    const prevPositionerRef = useRef(positioner);
    useEffect(() => {
      if (prevPositionerRef.current !== positioner) {
        prevPositionerRef.current = positioner;
        // 延迟一帧更新，确保 DOM 已更新
        requestAnimationFrame(() => {
          setPositionerVersion(v => v + 1);
        });
      }
    }, [positioner]);

    // ResizeObserver
    const resizeObserver = useResizeObserver(positioner);

    // 滚动状态
    const { scrollTop, isScrolling } = useScroller(
      resolvedScrollElement,
      containerPosition.offset
    );

    // 合并子元素和 bricks -> items
    const allItems = useMemo(() => {
      const list: AnyRecord[] = [];
      React.Children.forEach(children, (child, index) => {
        if (child) {
          list.push({
            mansonryInnerChildIndex: index,
            [brickId || 'id']: `childId_${index}`,
          });
        }
      });
      list.push(...bricks);
      return list;
    }, [brickId, bricks, children]);

    // 使用实际视口高度或默认值
    const effectiveViewportHeight = containerPosition.height > 0 
      ? containerPosition.height 
      : DEFAULT_VIEWPORT_HEIGHT;

    // 可视区域计算
    const visibleRect = useMemo(() => {
      const overscan = effectiveViewportHeight * threshold;
      const top = Math.max(0, scrollTop - overscan / 2);
      const bottom = scrollTop + effectiveViewportHeight + overscan;
      return { top, bottom };
    }, [scrollTop, effectiveViewportHeight, threshold]);

    // 渲染项目
    const { renderedItems, startIndex, stopIndex, needsFreshBatch } = useMemo(() => {
      const { columnWidth, range, size, shortestColumn } = positioner;
      const measuredCount = size();
      const itemCount = allItems.length;
      const shortestColumnSize = shortestColumn();

      const items: Array<{
        index: number;
        brick: AnyRecord;
        position: PositionerItem | null;
        recordId: string;
      }> = [];

      let start = 0;
      let stop: number | undefined;

      // 1. 查找可视区域内的元素
      range(visibleRect.top, visibleRect.bottom, (index, left, top) => {
        const brick = allItems[index];
        if (brick) {
          const position = positioner.get(index);
          const recordId = defaultGetBrickId(brick, index, brickId);
          
          items.push({
            index,
            brick,
            position: position || null,
            recordId,
          });

          if (stop === undefined) {
            start = index;
            stop = index;
          } else {
            start = Math.min(start, index);
            stop = Math.max(stop, index);
          }
        }
      });

      // 2. 检查是否需要新批次
      // 修复：确保初始时也能加载足够元素
      const needsBatch = measuredCount < itemCount && (
        shortestColumnSize < visibleRect.bottom || measuredCount === 0
      );

      // 3. 添加未测量元素
      if (needsBatch) {
        // 修复：确保初始批次大小足够填满视口
        const estimatedItemsPerColumn = Math.ceil(effectiveViewportHeight / itemHeightEstimate);
        const minBatchSize = Math.max(positioner.columnCount * estimatedItemsPerColumn, 10);
        
        const batchSize = Math.min(
          itemCount - measuredCount,
          Math.max(
            minBatchSize,
            Math.ceil(
              ((scrollTop + effectiveViewportHeight * threshold - shortestColumnSize) /
                itemHeightEstimate) *
                positioner.columnCount
            )
          ),
          50 // 增加单次最大加载数量
        );

        for (let i = measuredCount; i < measuredCount + batchSize && i < itemCount; i++) {
          const brick = allItems[i];
          if (brick) {
            const recordId = defaultGetBrickId(brick, i, brickId);
            
            items.push({
              index: i,
              brick,
              position: null,
              recordId,
            });
          }
        }
      }

      return {
        renderedItems: items,
        startIndex: start,
        stopIndex: stop,
        needsFreshBatch: needsBatch,
      };
    }, [
      positioner,
      allItems,
      visibleRect,
      scrollTop,
      effectiveViewportHeight,
      threshold,
      itemHeightEstimate,
      brickId,
      positionerVersion, // 添加版本依赖，确保 positioner 变化时重新计算
    ]);

    // 如果需要新批次，触发重渲染
    useEffect(() => {
      if (needsFreshBatch) {
        const timer = requestAnimationFrame(() => {
          forceUpdate();
        });
        return () => cancelAnimationFrame(timer);
      }
    }, [needsFreshBatch, forceUpdate, renderedItems.length]);

    // 渲染回调
    useEffect(() => {
      if (onRendered && stopIndex !== undefined) {
        onRendered(startIndex, stopIndex);
      }
    }, [startIndex, stopIndex, onRendered]);

    const childrenNodes = useMemo(() => React.Children.toArray(children), [children]);

    const renderContent = useCallback(
      (brick: AnyRecord) => {
        if (brick.mansonryInnerChildIndex !== undefined) {
          return childrenNodes[brick.mansonryInnerChildIndex];
        }
        return render(brick);
      },
      [childrenNodes, render]
    );

    useImperativeHandle(ref, () => ({
      getBricksPosition: () => {
        const computedBricks = new Map<string, PositionerItem>();
        
        const count = positioner.size();
        for (let i = 0; i < count; i++) {
          const pos = positioner.get(i);
          const brick = allItems[i];
          if (pos && brick) {
            const id = defaultGetBrickId(brick, i, brickId);
            computedBricks.set(id, pos);
          }
        }

        return {
          containerOffsetTop: containerRef.current?.getBoundingClientRect()?.top,
          containerOffsetLeft: containerRef.current?.getBoundingClientRect()?.left,
          computedBricks: { current: computedBricks },
        };
      },
      relayout: () => {
        positioner.clear();
        setPositionerVersion(v => v + 1);
        forceUpdate();
      },
    }));

    const containerStyle: React.CSSProperties = useMemo(
      () => ({
        position: "relative",
        width: "100%",
        height: positioner.estimateHeight(allItems.length, itemHeightEstimate),
        maxHeight: positioner.estimateHeight(allItems.length, itemHeightEstimate),
        willChange: isScrolling ? "contents" : undefined,
        pointerEvents: isScrolling ? "none" : undefined,
      }),
      [positioner, allItems.length, itemHeightEstimate, isScrolling]
    );

    return (
      <div className={className} style={containerStyle} ref={containerRef}>
        {renderedItems.map((item) => (
          <MasonryItem
            key={item.recordId}
            index={item.index}
            position={item.position}
            columnWidth={positioner.columnWidth}
            resizeObserver={resizeObserver}
            positioner={positioner}
            recordId={item.recordId}
          >
            {renderContent(item.brick)}
          </MasonryItem>
        ))}
      </div>
    );
  }
);