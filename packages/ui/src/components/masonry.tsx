import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

// Simple debounce implementation
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number,
  options?: { trailing?: boolean; maxWait?: number; leading?: boolean }
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;

  const maxWait = options?.maxWait;
  const leading = options?.leading ?? false;
  const trailing = options?.trailing ?? true;

  const invokeFunc = (args: unknown[]) => {
    lastInvokeTime = Date.now();
    fn(...args);
  };

  const debounced = ((...args: unknown[]) => {
    const now = Date.now();
    const isInvoking = shouldInvoke(now);

    lastCallTime = now;

    if (isInvoking && leading && lastInvokeTime === 0) {
      invokeFunc(args);
    }

    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      if (trailing && lastCallTime !== null) {
        invokeFunc(args);
      }
      timeoutId = null;
    }, wait);

    if (maxWait !== undefined) {
      const timeSinceLastInvoke = now - lastInvokeTime;
      if (timeSinceLastInvoke >= maxWait) {
        invokeFunc(args);
      }
    }
  }) as T & { cancel: () => void };

  const shouldInvoke = (time: number): boolean => {
    return lastCallTime === null || time - lastCallTime >= wait;
  };

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
    lastCallTime = null;
    lastInvokeTime = 0;
  };

  return debounced;
}

interface BrickRect {
  column: number;
  left: number;
  top: number;
  height: number;
  bottom: number;
  right: number;
}

interface BrickRecord {
  mansonryInnerChildIndex?: number;
  [key: string]: string | number | undefined;
}

// Helper to get brick id as string
const getBrickId = (record: BrickRecord, brickIdKey: string): string => {
  const id = record[brickIdKey];
  return id !== undefined ? String(id) : "";
};

interface IWaterfallProps {
  brickId?: string;
  bricks?: any[];
  render: (brick: any) => React.ReactNode;
  gutter?: number;
  columnSize?: number;
  columnNum?: number;
  threshold?: number;
  /** id 或者 dom引用 或者返回元素的函数 */
  scrollElement?: HTMLElement | string | (() => HTMLElement | null);
  className?: string;
  onRendered?: () => void;
  children?: React.ReactNode;
}

// 解析 scrollElement 为实际的 HTMLElement
const resolveScrollElement = (
  scrollElement: HTMLElement | string | (() => HTMLElement | null) | undefined
): HTMLElement | null => {
  if (!scrollElement) return null;
  if (typeof scrollElement === "function") return scrollElement();
  if (typeof scrollElement === "string") return document.getElementById(scrollElement);
  return scrollElement;
};

export default forwardRef(
  /**
   * 瀑布流
   * @param {*} props
   */
  function Waterfall(
    {
      brickId = "id",
      bricks = [],
      render,
      gutter = 24,
      columnSize = 240,
      columnNum = 4,
      children,
      threshold = 1, // 预加载的滚动区域，小于10是容器倍数，大于10是绝对值
      scrollElement, // 滚动元素
      className = "masonry",
      onRendered = () => { },
    }: // getBrickHeight,
      IWaterfallProps,
    ref
  ) {

    const containerRef = useRef<HTMLDivElement>(null);
    const computedBricks = useRef<Map<string, BrickRect>>(new Map()); // 已经计算大小和位置的bricks
    const columnHeightArr = useRef<number[]>([]); // 瀑布流各列高度

    const [containerOffsetTop, setContainerOffsetTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0); // 瀑布流容器高度
    const [scrollTop, setScrollTop] = useState(0); // 页面滚动高度

    const isUnmount = useRef(false); // 是否销毁
    useEffect(() => {
      isUnmount.current = false;
      return () => {
        isUnmount.current = true;
      };
    }, []);

    const renderChild = useMemo(() => {
      const childrenNode = React.Children.toArray(children);
      return function Fn(record: BrickRecord) {
        const computedBrickMap = computedBricks.current;

        let props: React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLDivElement>,
          HTMLDivElement
        > = {
          className: "invisible pointer-events-none",
        };

        const recordId = getBrickId(record, brickId);
        if (computedBrickMap.has(recordId)) {
          const rect = computedBrickMap.get(recordId)!;
          props = {
            className: "absolute top-0 left-0 visible pointer-events-auto",
            style: { transform: `translate(${rect.left}px, ${rect.top}px)` },
          };
        }

        // 先渲染 组件子元素
        if (record.mansonryInnerChildIndex !== undefined) {
          return (
            <div key={record.mansonryInnerChildIndex} {...props}>
              {childrenNode[record.mansonryInnerChildIndex]}
            </div>
          );
        }

        return (
          <div key={recordId} {...props}>
            {render(record)}
          </div>
        );
      };
    }, [brickId, children, render]);

    // 获取瀑布流容器位置（距离视图顶部的距离）
    useEffect(() => {
      const realScrollElement = resolveScrollElement(scrollElement) || document.documentElement;

      const containerRectTop = containerRef.current?.getBoundingClientRect()
        ?.top as number;

      if (!scrollElement) {
        // 窗口滚动距离 + 容器距离顶部距离
        setContainerOffsetTop(containerRectTop + window.scrollY);
      } else {
        setContainerOffsetTop(
          containerRectTop -
          realScrollElement?.getBoundingClientRect()?.top +
          realScrollElement.scrollTop
        );
      }
    }, [scrollElement]);

    // 获取瀑布流容器高度
    const getContainerHeight = useCallback(() => {
      const realScrollElement = resolveScrollElement(scrollElement) || document.documentElement;
      const containerHeight = realScrollElement?.clientHeight || 0;
      setContainerHeight(containerHeight);
    }, [scrollElement]);

    useEffect(() => {
      getContainerHeight();
      window.addEventListener("resize", getContainerHeight);
      return () => {
        window.removeEventListener("resize", getContainerHeight);
      };
    }, [getContainerHeight]);

    // 所有要渲染的元素：子元素+列表
    const allBricks = useMemo(() => {
      const list: BrickRecord[] = [];
      React.Children.map(children, (child, index) => {
        if (child) {
          list.push({
            mansonryInnerChildIndex: index,
            [brickId]: `childId_${index}`,
          });
        }
      });

      list.push(...bricks);
      return list;
    }, [brickId, bricks, children]);

    // 顶部加载新数据 或 删除某个brick
    useEffect(() => {
      const bricks = allBricks;

      // 清除bricks
      if (!bricks.length) {
        columnHeightArr.current.fill(0);
        computedBricks.current.clear();
        return;
      }

      const keys: Record<string, boolean> = {};
      let index = 0;
      for (let [key] of computedBricks.current) {
        let realKey = bricks[index] ? getBrickId(bricks[index], brickId) : "";

        // 循环跳过重复的brick
        while (keys[realKey] && index < bricks.length - 1) {
          index += 1;
          realKey = getBrickId(bricks[index], brickId);
        }

        if (!bricks[index] || getBrickId(bricks[index], brickId) !== key) {
          // 变更出现在前面几个，直接全部清空
          if (index < 5) {
            columnHeightArr.current.fill(0);
            computedBricks.current.clear();
            break;
          }

          // 清除当前brick后的所有brick缓存
          let clearAfter = false;
          for (let [remainKey, remainBrick] of computedBricks.current) {
            if (clearAfter || remainKey === key) {
              clearAfter = true;

              computedBricks.current.delete(remainKey);
              columnHeightArr.current[remainBrick.column] = Math.min(
                remainBrick.top,
                columnHeightArr.current[remainBrick.column]
              );
            }
          }
          break;
        }

        keys[key] = true;
        index += 1;
      }
    }, [allBricks, brickId]);

    // 重新渲染整个瀑布流所有内容
    const relayout = useCallback(() => {
      columnHeightArr.current = Array(columnNum).fill(0);
      computedBricks.current.clear();

      setScrollTop((scrollTop) => scrollTop + 1);
    }, [columnNum, columnSize]);

    // 列数量发生变化
    useEffect(() => {
      relayout();
    }, [relayout]);

    // 可视区域坐标
    const visibleRect = useMemo(() => {
      const expandSize =
        threshold > 10 ? threshold : containerHeight * threshold;
      const top = scrollTop - containerOffsetTop - expandSize;
      const bottom =
        scrollTop + containerHeight - containerOffsetTop + expandSize;

      return { top, bottom };
    }, [threshold, containerHeight, containerOffsetTop, scrollTop]);

    // 需要被渲染的brick
    const renderBricks = useMemo(() => {
      const bricks = allBricks;
      const keys: Record<string, boolean> = {}; // 避免重复
      const beRenders: BrickRecord[] = [];

      let unRect = 0; // 未定位过的元素个数
      for (let i = 0; i < bricks.length; i++) {
        const brick = bricks[i];
        const id = getBrickId(brick, brickId);
        const rect = computedBricks.current.get(id);
        if (rect) {
          if (rect.bottom > visibleRect.top && rect.top < visibleRect.bottom) {
            // 视口范围内
            if (!keys[id]) {
              beRenders.push(brick);
              keys[id] = true;
            }
          }
        } else {
          // 找到没有加载过的brick
          if (!keys[id]) {
            beRenders.push(brick);
            keys[id] = true;
            unRect += 1;
          }
        }

        // 最多200个， TODO
        if (unRect >= 20) {
          break;
        }
      }

      return beRenders;
    }, [allBricks, brickId, visibleRect]);

    // 定位所有Dom节点
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const brickDom = [...container.children] as HTMLElement[];

      const computedBrickMap = computedBricks.current;
      const columnHeightArrCurrent = columnHeightArr.current;
      let unRect = 0;
      let outVisibleRect = false;
      brickDom.forEach((brick, index) => {
        const brickItemId = getBrickId(renderBricks[index], brickId);
        const rect = computedBrickMap.get(brickItemId);

        if (!rect) {
          // 找到高度最小的列
          let targetColumn = 0;
          let minHeight = Infinity;
          for (let i = 0; i < columnHeightArrCurrent.length; i++) {
            const value = columnHeightArrCurrent[i];
            if (value < minHeight) {
              targetColumn = i;
              minHeight = value;
            }
          }

          const clientHeight = brick.clientHeight;
          // const clientWidth = columnSize;
          const newRect = {
            column: targetColumn,
            left: targetColumn * (columnSize + gutter),
            top: minHeight,
            height: clientHeight,
            bottom: minHeight + clientHeight,
            right: targetColumn * (columnSize + gutter) + columnSize,
          };
          // visibleRect 线上打印出来值为{}，跟本地有差异
          if (
            (newRect.bottom > visibleRect.top && newRect.top < visibleRect.bottom) ||
            !visibleRect.top
          ) {
            // 视口范围内
            Promise.resolve().then(() => {
              brick.classList.remove("invisible", "pointer-events-none");
              brick.classList.add("absolute", "top-0", "left-0", "visible", "pointer-events-auto");
              brick.style.transform = `translate(${newRect.left}px, ${newRect.top}px)`;
            });
          }

          // 更新已经渲染数据
          computedBrickMap.set(brickItemId, newRect);
          columnHeightArrCurrent[targetColumn] = minHeight + clientHeight + gutter;

          unRect += 1;
          if (newRect.top > visibleRect.bottom) {
            outVisibleRect = true;
          }
        }
      });

      container.style.height = Math.max(...columnHeightArr.current) + "px";

      // 加载更多未定位brick
      if (unRect >= 20 && !outVisibleRect) {
        setScrollTop((scrollTop) => scrollTop + 1);
      }

      // 定位完成后回调函数
      onRendered();
    }, [renderBricks, visibleRect, columnSize, gutter, brickId, onRendered]);

    // 滚动事件
    useEffect(() => {
      // 没有提供 scrollElement 的话，绑定window的滚动事件
      const target: HTMLElement | Window | null = resolveScrollElement(scrollElement) || window;

      const getScrollTop = (): number => {
        if (!target) return 0;
        if (target instanceof Window) {
          return target.scrollY;
        }
        return target.scrollTop;
      };

      const change = debounce(
        () => {
          if (isUnmount.current) {
            return;
          }
          setScrollTop(getScrollTop());
        },
        100,
        { trailing: true, maxWait: 200, leading: false }
      );

      // 初始化设置
      change();

      // 绑定滚动事件
      target?.addEventListener("scroll", change, { passive: true });

      // 取消滚动事件
      return () => {
        target?.removeEventListener("scroll", change);
      };
    }, [scrollElement]);

    useImperativeHandle(ref, () => ({
      // 获取所有图片的位置，用来做框选操作
      getBricksPosition: () => {
        return {
          containerOffsetTop:
            containerRef.current?.getBoundingClientRect()?.top,
          containerOffsetLeft:
            containerRef.current?.getBoundingClientRect()?.left,
          computedBricks,
        };
      },
      relayout,
    }));

    return (
      <div
        className={className}
        style={{ position: "relative", overflow: "hidden", }}
        ref={containerRef}
      >
        {renderBricks.map(renderChild)}
      </div>
    );
  }
);