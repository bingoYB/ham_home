/**
 * 元素缓存
 * 使用 WeakMap 存储元素到索引的映射，用于 ResizeObserver 回调时查找元素索引
 */
export const elementsCache: WeakMap<Element, number> = new WeakMap();
