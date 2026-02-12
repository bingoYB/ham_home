/**
 * Positioner - 瀑布流位置计算器
 *
 * 核心职责:
 * 1. 维护每一列的当前高度，确保新元素总是被添加到最短的一列（贪心算法）。
 * 2. 缓存所有元素的位置信息 (top, left, height, column)。
 * 3. 处理元素高度变化带来的布局更新 (Reflow)：
 *    - 仅重新计算受影响元素及其后续元素的位置，避免全量重排，提高性能。
 * 4. 集成区间树 (Interval Tree) 以支持高效的可视区域查询。
 */

import { createIntervalTree, type IIntervalTree } from './interval-tree';

/**
 * 单个元素的位置信息
 */
export interface PositionerItem {
  /** 距离容器顶部的绝对距离 (px) */
  top: number;
  /** 距离容器左侧的绝对距离 (px) */
  left: number;
  /** 元素的高度 (px) */
  height: number;
  /** 元素所在的列索引 (0 ~ columnCount-1) */
  column: number;
}

/**
 * Positioner 实例接口
 * 提供了操作和查询布局的所有方法
 */
export interface IPositioner {
  /** 总列数 */
  columnCount: number;
  /** 单列宽度 (px) */
  columnWidth: number;
  
  /**
   * 设置指定索引元素的高度，并计算其初始位置
   * 通常用于新元素首次渲染前的位置计算
   * @param index - 元素在列表中的索引
   * @param height - 元素的高度
   */
  set: (index: number, height: number) => void;
  
  /**
   * 获取指定索引元素的位置信息
   * @param index - 元素索引
   */
  get: (index: number) => PositionerItem | undefined;
  
  /**
   * 批量更新元素高度
   * 当 ResizeObserver 监听到元素尺寸变化时调用
   * 会自动触发相关列的重排（Relayout）
   * @param updates - 数组格式: [index1, height1, index2, height2, ...]
   */
  update: (updates: number[]) => void;
  
  /**
   * 范围查询：查找与其垂直区间 [lo, hi] 有交集的所有元素
   * 用于虚拟滚动，仅渲染可视区域内的元素
   * @param lo - 区域顶部 (scrollTop)
   * @param hi - 区域底部 (scrollTop + viewportHeight)
   * @param renderCallback - 对找到的每个元素执行的回调，传入索引和坐标
   */
  range: (
    lo: number,
    hi: number,
    renderCallback: (index: number, left: number, top: number) => void
  ) => void;
  
  /** 当前已测量的元素总数 */
  size: () => number;
  
  /**
   * 估算容器的总高度
   * 如果所有元素都已测量，返回实际最大列高
   * 否则，使用平均值估算剩余元素的高度
   * @param itemCount - 列表总元素数量
   * @param defaultItemHeight - 默认估算高度
   */
  estimateHeight: (itemCount: number, defaultItemHeight: number) => number;
  
  /** 获取当前最短列的高度 */
  shortestColumn: () => number;
  
  /** 获取当前最高列的高度 */
  tallestColumn: () => number;
  
  /** 获取所有已缓存的位置项 */
  all: () => PositionerItem[];
  
  /** 清除所有布局数据，重置状态 */
  clear: () => void;
  
  /** 获取所有列的当前高度数组 */
  getColumnHeights: () => number[];
}

/**
 * 二分查找辅助函数
 * 在有序数组 a 中查找值 y 的索引，或者最接近的位置
 */
function binarySearch(a: number[], y: number): number {
  let l = 0;
  let h = a.length - 1;

  while (l <= h) {
    const m = (l + h) >>> 1;
    const x = a[m];
    if (x === y) return m;
    else if (x <= y) l = m + 1;
    else h = m - 1;
  }

  return -1;
}

/**
 * 创建 Positioner 实例 (工厂函数)
 *
 * @param columnCount - 列数
 * @param columnWidth - 列宽
 * @param columnGutter - 列间距 (水平间距)
 * @param rowGutter - 行间距 (垂直间距)，默认等于列间距
 */
export function createPositioner(
  columnCount: number,
  columnWidth: number,
  columnGutter = 0,
  rowGutter = columnGutter
): IPositioner {
  /**
   * 核心数据结构：区间树
   * 用于存储每个元素的垂直区间 [top, top + height]，支持 O(log n) 查询
   */
  let intervalTree: IIntervalTree = createIntervalTree();
  
  /**
   * 追踪每一列的当前总高度
   * 用于决定下一个元素放在哪一列（最短列优先）
   */
  let columnHeights: number[] = new Array(columnCount).fill(0);
  
  /**
   * O(1) 访问所有元素的位置信息
   * 索引即为数据源中的 index
   */
  let items: PositionerItem[] = [];
  
  /**
   * 记录每一列包含了哪些元素的索引 (有序数组)
   * 用于在某列中间元素发生高度变化时，快速找到受影响的后续元素
   */
  let columnItems: number[][] = new Array(columnCount);
  
  for (let i = 0; i < columnCount; i++) {
    columnItems[i] = [];
  }

  return {
    columnCount,
    columnWidth,

    set(index: number, height = 0): void {
      // 1. 寻找最短的一列
      let column = 0;
      for (let i = 1; i < columnHeights.length; i++) {
        if (columnHeights[i] < columnHeights[column]) column = i;
      }

      // 2. 计算当前元素位置
      const top = columnHeights[column] || 0;
      
      // 3. 更新该列高度
      columnHeights[column] = top + height + rowGutter;
      
      // 4. 记录该元素属于该列
      columnItems[column].push(index);
      
      // 5. 缓存位置信息
      items[index] = {
        left: column * (columnWidth + columnGutter),
        top,
        height,
        column,
      };
      
      // 6. 插入区间树，用于可视区域查询
      intervalTree.insert(top, top + height, index);
    },

    get(index: number): PositionerItem | undefined {
      return items[index];
    },

    update(updates: number[]): void {
      // 记录每列中发生变化的最小索引 (只需重排该索引之后的元素)
      const columns: number[] = new Array(columnCount);
      let i = 0;
      let j = 0;

      // 1. 第一遍遍历：更新所有发生变化的元素的高度，并确定受影响的列
      // updates 格式: [index1, height1, index2, height2, ...]
      for (; i < updates.length - 1; i++) {
        const index = updates[i];
        const item = items[index];
        if (!item) continue;
        
        // 更新高度
        item.height = updates[++i];
        
        // 更新区间树中的记录 (先移除旧区间，再插入新区间)
        intervalTree.remove(index);
        intervalTree.insert(item.top, item.top + item.height, index);
        
        // 记录该列受影响的最小索引
        columns[item.column] =
          columns[item.column] === undefined
            ? index
            : Math.min(index, columns[item.column]);
      }

      // 2. 第二遍遍历：重新计算受影响列中，变化点之后所有元素的布局
      for (i = 0; i < columns.length; i++) {
        // 如果该列没有受影响，跳过
        if (columns[i] === undefined) continue;
        
        const itemsInColumn = columnItems[i];
        // 使用二分查找快速定位到受影响的起始位置
        const startIndex = binarySearch(itemsInColumn, columns[i]);
        if (startIndex === -1) continue;
        
        // 重置该列的高度为起始元素的底部位置 (因为该元素高度变了，它的底部也变了)
        const index = columnItems[i][startIndex];
        const startItem = items[index];
        if (!startItem) continue;
        
        columnHeights[i] = startItem.top + startItem.height + rowGutter;

        // 3. 级联更新该列后续所有元素的位置
        for (j = startIndex + 1; j < itemsInColumn.length; j++) {
          const itemIndex = itemsInColumn[j];
          const item = items[itemIndex];
          if (!item) continue;
          
          // 重新计算 top
          item.top = columnHeights[i];
          // 累加高度
          columnHeights[i] = item.top + item.height + rowGutter;
          
          // 更新区间树位置
          intervalTree.remove(itemIndex);
          intervalTree.insert(item.top, item.top + item.height, itemIndex);
        }
      }
    },

    range(
      lo: number,
      hi: number,
      renderCallback: (index: number, left: number, top: number) => void
    ): void {
      // 委托给区间树进行高效查询
      intervalTree.search(lo, hi, (index, top) =>
        renderCallback(index, items[index].left, top)
      );
    },

    estimateHeight(itemCount: number, defaultItemHeight: number): number {
      const tallest = Math.max(0, Math.max.apply(null, columnHeights));
      
      // 如果所有元素都计算过了，返回真实高度
      return itemCount === intervalTree.size
        ? tallest
        : tallest +
            // 否则估算剩余元素的高度
            Math.ceil((itemCount - intervalTree.size) / columnCount) *
              defaultItemHeight;
    },

    shortestColumn(): number {
      if (columnHeights.length > 1) return Math.min.apply(null, columnHeights);
      return columnHeights[0] || 0;
    },

    tallestColumn(): number {
      if (columnHeights.length > 1) return Math.max.apply(null, columnHeights);
      return columnHeights[0] || 0;
    },

    size(): number {
      return intervalTree.size;
    },

    all(): PositionerItem[] {
      return items;
    },

    clear(): void {
      intervalTree = createIntervalTree();
      columnHeights = new Array(columnCount).fill(0);
      items = [];
      columnItems = new Array(columnCount);
      for (let i = 0; i < columnCount; i++) {
        columnItems[i] = [];
      }
    },

    getColumnHeights(): number[] {
      return columnHeights;
    },
  };
}
