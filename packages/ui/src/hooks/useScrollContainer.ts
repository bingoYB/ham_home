/**
 * 滚动容器相关 Hooks
 *
 * masonic 自带的 `useScroller` / `useContainerPosition` 只支持 `window` 滚动，
 * 而瀑布流通常渲染在一个 `overflow: auto` 的容器里，所以这里提供等价实现：
 * 解析滚动元素、测量网格容器相对滚动内容的位置、跟踪滚动位置。
 */
import * as React from "react";

/** 滚动停止后多久判定为「非滚动中」 */
const SCROLL_IDLE_MS = 150;

const SCROLLABLE_OVERFLOW = /(auto|scroll|overlay)/;

export type ScrollElementInput =
  | HTMLElement
  | string
  | (() => HTMLElement | null)
  | null
  | undefined;

function resolveScrollElement(input: ScrollElementInput): HTMLElement | null {
  if (!input) return null;
  if (typeof input === "function") return input();
  if (typeof input === "string") return document.getElementById(input);
  return input;
}

/** 向上查找最近的可滚动祖先节点，找不到时返回 null（退化为 window 滚动） */
function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  let node = element?.parentElement ?? null;

  while (node && node !== document.body && node !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(node);
    if (SCROLLABLE_OVERFLOW.test(overflowY)) return node;
    node = node.parentElement;
  }

  return null;
}

/**
 * 解析瀑布流所在的滚动容器。
 *
 * 调用方通常传入内联的 getter，且目标节点可能首帧还不在 DOM 中，
 * 所以这里每次渲染后都重新解析一次；值没变时 setState 会被 React 跳过。
 */
export function useScrollElement(
  containerRef: React.RefObject<HTMLElement | null>,
  input: ScrollElementInput
): HTMLElement | null {
  const [element, setElement] = React.useState<HTMLElement | null>(null);

  React.useLayoutEffect(() => {
    setElement((prev) => {
      const explicit = resolveScrollElement(input);
      if (explicit) return explicit === prev ? prev : explicit;
      if (prev?.isConnected) return prev;
      return findScrollParent(containerRef.current);
    });
  });

  return element;
}

export interface ScrollContainerMetrics {
  /** 网格容器顶部相对滚动内容顶部的偏移量 */
  offset: number;
  /** 网格容器可用宽度，用于推导列宽 */
  width: number;
  /** 滚动视口高度 */
  height: number;
}

/**
 * 测量网格容器在滚动容器中的位置与尺寸。
 *
 * 宽度必须来自真实测量：列宽由它推导，若用估算宽度测量卡片高度，
 * 后续宽度修正会让缓存的高度全部失真，进而导致卡片重叠。
 */
export function useScrollContainerMetrics(
  containerRef: React.RefObject<HTMLElement | null>,
  scrollElement: HTMLElement | null
): ScrollContainerMetrics {
  const [metrics, setMetrics] = React.useState<ScrollContainerMetrics>({
    offset: 0,
    width: 0,
    height: 0,
  });

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const width = container.offsetWidth;
      let offset: number;
      let height: number;

      if (scrollElement) {
        // rect 差值会随滚动缩小，加回 scrollTop 后即与滚动位置无关
        offset =
          container.getBoundingClientRect().top -
          scrollElement.getBoundingClientRect().top +
          scrollElement.scrollTop;
        height = scrollElement.clientHeight;
      } else {
        offset = container.getBoundingClientRect().top + window.scrollY;
        height = document.documentElement.clientHeight;
      }

      setMetrics((prev) =>
        prev.offset === offset && prev.width === width && prev.height === height
          ? prev
          : { offset, width, height }
      );
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    if (scrollElement) resizeObserver.observe(scrollElement);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, scrollElement]);

  return metrics;
}

export interface ScrollPosition {
  /** 已减去容器偏移量的滚动位置 */
  scrollTop: number;
  /** 是否正在滚动 */
  isScrolling: boolean;
}

/**
 * 跟踪滚动容器的滚动位置，未提供滚动元素时回退到 window。
 */
export function useScrollPosition(
  scrollElement: HTMLElement | null,
  offset = 0
): ScrollPosition {
  const [scrollTop, setScrollTop] = React.useState(0);
  const [isScrolling, setIsScrolling] = React.useState(false);

  React.useEffect(() => {
    const target: HTMLElement | Window = scrollElement ?? window;
    const read = () =>
      Math.max(
        0,
        (scrollElement ? scrollElement.scrollTop : window.scrollY) - offset
      );

    let frame: number | null = null;
    let idleTimer: number | null = null;

    const handleScroll = () => {
      if (frame !== null) return;

      frame = requestAnimationFrame(() => {
        frame = null;
        setScrollTop(read());
        setIsScrolling(true);

        if (idleTimer !== null) clearTimeout(idleTimer);
        idleTimer = window.setTimeout(
          () => setIsScrolling(false),
          SCROLL_IDLE_MS
        );
      });
    };

    setScrollTop(read());
    target.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      target.removeEventListener("scroll", handleScroll);
      if (frame !== null) cancelAnimationFrame(frame);
      if (idleTimer !== null) clearTimeout(idleTimer);
    };
  }, [scrollElement, offset]);

  return { scrollTop, isScrolling };
}
