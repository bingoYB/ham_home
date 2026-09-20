/**
 * 瀑布流组件
 *
 * 基于 masonic 的布局原语（`usePositioner` / `useResizeObserver` / `useMasonry`）实现，
 * 对外保持原有的 props / ref API 不变。
 *
 * 为什么换掉自研实现：原实现把「本次要渲染哪些卡片」包在 `useMemo` 里，而
 * positioner 是就地可变的对象——ResizeObserver 重排后依赖项没有任何变化，
 * memo 直接返回旧结果，卡片就停留在旧的 top 上互相重叠。masonic 每次渲染都
 * 重新计算渲染列表，从根本上消除了这一类问题。
 *
 * 与直接使用 `<masonic.Masonry>` 的两点差异：
 * 1. 网格滚动发生在某个容器内而非 window，滚动状态由 `useScrollContainer` 提供；
 * 2. `render` 是函数 prop 而非组件。masonic 会按 (组件, index, data, 列宽) 缓存
 *    元素，若把 `render` 直接包成组件，组件类型每次渲染都变会导致整棵子树重挂载；
 *    因此这里用一个稳定的 `Brick` 组件 + Context 传递 `render`，既不重挂载，
 *    又能在调用方闭包变化时（如选中状态更新）正常重渲染。
 */
import * as React from "react";
import {
  useMasonry,
  usePositioner,
  useResizeObserver,
  type PositionerItem,
  type RenderComponentProps,
} from "masonic";
import {
  useScrollContainerMetrics,
  useScrollElement,
  useScrollPosition,
  type ScrollElementInput,
} from "../hooks/useScrollContainer";

// ==================== 类型定义 ====================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

/** children 伪 brick 上标记其在 children 中的下标 */
const CHILD_INDEX_KEY = "__masonryChildIndex";

const EMPTY_ITEMS: AnyRecord[] = [];

export interface MasonryProps<T extends AnyRecord = AnyRecord> {
  /** 用于标识 brick 的 key，如果不传则使用索引 */
  brickId?: string;
  /** 数据列表 */
  bricks?: T[];
  /** 渲染函数，`width` 为实际列宽 */
  render: (brick: T, index: number, width: number) => React.ReactNode;
  /** 间距 */
  gutter?: number;
  /** 列宽基准值，未指定 columnNum 时用于推导列数 */
  columnSize?: number;
  /** 固定列数，不传则按容器宽度和 columnSize 自动推导 */
  columnNum?: number;
  /** 预渲染区域倍数（相对视口高度） */
  threshold?: number;
  /** 滚动元素，不传则自动向上查找最近的可滚动祖先 */
  scrollElement?: ScrollElementInput;
  /** 容器类名 */
  className?: string;
  /** 渲染完成回调 */
  onRendered?: (startIndex: number, stopIndex: number) => void;
  /** 子元素，会被排在 bricks 之前一并参与布局 */
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
  /** 丢弃全部测量结果并强制重新布局 */
  relayout: () => void;
}

// ==================== 工具函数 ====================

/** 获取 brick 的 id */
function defaultGetBrickId(
  record: AnyRecord,
  index: number,
  brickIdKey?: string
): string {
  if (brickIdKey && record[brickIdKey] !== undefined) {
    return String(record[brickIdKey]);
  }
  return String(index);
}

// ==================== 渲染桥接 ====================

type RenderBrick = (
  brick: AnyRecord,
  index: number,
  width: number
) => React.ReactNode;

const BrickRenderContext = React.createContext<RenderBrick | null>(null);

/**
 * 稳定的单元格组件。
 *
 * masonic 会缓存 `<Brick>` 元素，父级重渲染时 React 可能直接跳过它；
 * 但 Context 变更会穿透这种 bailout，所以调用方的 `render` 闭包更新后
 * 卡片依然会重新渲染。
 */
function Brick({ data, index, width }: RenderComponentProps<AnyRecord>) {
  const renderBrick = React.useContext(BrickRenderContext);
  return <>{renderBrick ? renderBrick(data, index, width) : null}</>;
}

// ==================== 主组件 ====================

export default React.forwardRef<MasonryRef, MasonryProps>(function Masonry(
  {
    brickId,
    bricks = EMPTY_ITEMS,
    render,
    gutter = 24,
    columnSize = 240,
    columnNum,
    children,
    threshold = 2,
    scrollElement,
    className = "masonry",
    onRendered,
    itemHeightEstimate = 300,
  },
  ref
) {
  const containerRef = React.useRef<HTMLElement | null>(null);

  // relayout() 通过递增版本号让 masonic 重建 positioner，从而丢弃全部测量缓存
  const [layoutVersion, setLayoutVersion] = React.useState(0);

  const resolvedScrollElement = useScrollElement(containerRef, scrollElement);
  const { offset, width, height } = useScrollContainerMetrics(
    containerRef,
    resolvedScrollElement
  );
  const { scrollTop, isScrolling } = useScrollPosition(
    resolvedScrollElement,
    offset
  );

  // 合并 children 与 bricks；没有 children 时保持 bricks 的引用不变
  const childNodes = React.useMemo(
    () => React.Children.toArray(children),
    [children]
  );
  const items = React.useMemo<AnyRecord[]>(() => {
    if (childNodes.length === 0) return bricks;

    const idKey = brickId || "id";
    const placeholders = childNodes.map((_, index) => ({
      [CHILD_INDEX_KEY]: index,
      [idKey]: `childId_${index}`,
    }));
    return [...placeholders, ...bricks];
  }, [childNodes, bricks, brickId]);

  const renderBrick = React.useCallback<RenderBrick>(
    (brick, index, brickWidth) => {
      const childIndex = brick[CHILD_INDEX_KEY];
      if (typeof childIndex === "number") return childNodes[childIndex];
      return render(brick, index, brickWidth);
    },
    [childNodes, render]
  );

  const itemKey = React.useCallback(
    (data: AnyRecord, index: number) => defaultGetBrickId(data, index, brickId),
    [brickId]
  );

  const handleRender = React.useCallback(
    (startIndex: number, stopIndex: number) => {
      onRendered?.(startIndex, stopIndex);
    },
    [onRendered]
  );

  const positioner = usePositioner(
    {
      width,
      columnWidth: columnSize,
      columnGutter: gutter,
      columnCount: columnNum,
    },
    // 位置缓存按「索引」存放。数据集一变，同一个索引就对应另一条数据，缓存的
    // 高度立刻失效：沿用它会让卡片按别人的高度排版而互相压盖，数据变少时还会
    // 按旧的区间树渲染到不存在的数据上。所以数据一变就整体重建。
    // 这里盯 bricks 本身而不是合并后的 items：children 每次渲染都是新元素，
    // 但它们占据的索引不变，高度交给 ResizeObserver 跟即可。
    // 调用方需保证 bricks 引用稳定（memo 化），否则每次父级渲染都会重新测量。
    [layoutVersion, bricks, childNodes.length]
  );
  const resizeObserver = useResizeObserver(positioner);

  React.useImperativeHandle(
    ref,
    () => ({
      getBricksPosition: () => {
        const computedBricks = new Map<string, PositionerItem>();
        const measuredCount = positioner.size();

        for (let index = 0; index < measuredCount; index++) {
          const position = positioner.get(index);
          const brick = items[index];
          if (position && brick) {
            computedBricks.set(
              defaultGetBrickId(brick, index, brickId),
              position
            );
          }
        }

        const rect = containerRef.current?.getBoundingClientRect();
        return {
          containerOffsetTop: rect?.top,
          containerOffsetLeft: rect?.left,
          computedBricks: { current: computedBricks },
        };
      },
      relayout: () => setLayoutVersion((version) => version + 1),
    }),
    [positioner, items, brickId]
  );

  // 容器宽度尚未测量出来时不渲染任何卡片：此时列宽是错的，
  // 测出来的高度会被缓存下来，后续修正宽度也救不回来。
  const ready = width > 0;

  const grid = useMasonry<AnyRecord>({
    positioner,
    resizeObserver,
    items: ready ? items : EMPTY_ITEMS,
    height: ready ? height : 0,
    scrollTop,
    isScrolling,
    overscanBy: threshold,
    itemHeightEstimate,
    itemKey,
    className,
    containerRef,
    role: "list",
    tabIndex: -1,
    render: Brick,
    onRender: handleRender,
  });

  return (
    <BrickRenderContext.Provider value={renderBrick}>
      {grid}
    </BrickRenderContext.Provider>
  );
});
