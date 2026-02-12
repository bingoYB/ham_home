/**
 * 红黑区间树实现
 * 用于 O(log n + m) 复杂度的区间查询，其中 n 是树中元素数量，m 是查询结果数量
 * 参考 Masonic 库的实现
 */

// 节点颜色
type Color = 0 | 1 | 2;
const RED = 0;
const BLACK = 1;
const NIL = 2;

// 删除/保留标记
const DELETE = 0;
const KEEP = 1;

// 链表节点 - 用于存储相同 low 值的多个区间
interface ListNode {
  index: number;
  high: number;
  next: ListNode | null;
}

// 树节点
interface TreeNode {
  max: number;    // 子树中最大的 high 值
  low: number;    // 区间下界
  high: number;   // 区间上界
  C: Color;       // 颜色
  P: TreeNode;    // 父节点
  R: TreeNode;    // 右子节点
  L: TreeNode;    // 左子节点
  list: ListNode; // 区间链表
}

// 树结构
interface Tree {
  root: TreeNode;
  size: number;
}

// 添加区间到节点的链表
function addInterval(treeNode: TreeNode, high: number, index: number): boolean {
  let node: ListNode | null = treeNode.list;
  let prevNode: ListNode | undefined;

  while (node) {
    if (node.index === index) return false;
    if (high > node.high) break;
    prevNode = node;
    node = node.next;
  }

  if (!prevNode) treeNode.list = { index, high, next: node };
  if (prevNode) prevNode.next = { index, high, next: prevNode.next };

  return true;
}

// 从节点链表中移除区间
function removeInterval(treeNode: TreeNode, index: number): number | undefined {
  let node: ListNode | null = treeNode.list;
  if (node.index === index) {
    if (node.next === null) return DELETE;
    treeNode.list = node.next;
    return KEEP;
  }

  let prevNode: ListNode | undefined = node;
  node = node.next;

  while (node !== null) {
    if (node.index === index) {
      prevNode.next = node.next;
      return KEEP;
    }
    prevNode = node;
    node = node.next;
  }
  return undefined;
}

// 空节点（哨兵）
const NULL_NODE: TreeNode = {
  low: 0,
  max: 0,
  high: 0,
  C: NIL,
  P: undefined as unknown as TreeNode,
  R: undefined as unknown as TreeNode,
  L: undefined as unknown as TreeNode,
  list: undefined as unknown as ListNode,
};

NULL_NODE.P = NULL_NODE;
NULL_NODE.L = NULL_NODE;
NULL_NODE.R = NULL_NODE;

// 更新节点的 max 值
function updateMax(node: TreeNode): void {
  const max = node.high;
  if (node.L === NULL_NODE && node.R === NULL_NODE) node.max = max;
  else if (node.L === NULL_NODE) node.max = Math.max(node.R.max, max);
  else if (node.R === NULL_NODE) node.max = Math.max(node.L.max, max);
  else node.max = Math.max(Math.max(node.L.max, node.R.max), max);
}

// 向上更新 max 值
function updateMaxUp(node: TreeNode): void {
  let x = node;
  while (x.P !== NULL_NODE) {
    updateMax(x.P);
    x = x.P;
  }
}

// 左旋
function rotateLeft(tree: Tree, x: TreeNode): void {
  if (x.R === NULL_NODE) return;
  const y = x.R;
  x.R = y.L;
  if (y.L !== NULL_NODE) y.L.P = x;
  y.P = x.P;

  if (x.P === NULL_NODE) tree.root = y;
  else if (x === x.P.L) x.P.L = y;
  else x.P.R = y;

  y.L = x;
  x.P = y;

  updateMax(x);
  updateMax(y);
}

// 右旋
function rotateRight(tree: Tree, x: TreeNode): void {
  if (x.L === NULL_NODE) return;
  const y = x.L;
  x.L = y.R;
  if (y.R !== NULL_NODE) y.R.P = x;
  y.P = x.P;

  if (x.P === NULL_NODE) tree.root = y;
  else if (x === x.P.R) x.P.R = y;
  else x.P.L = y;

  y.R = x;
  x.P = y;

  updateMax(x);
  updateMax(y);
}

// 替换节点
function replaceNode(tree: Tree, x: TreeNode, y: TreeNode): void {
  if (x.P === NULL_NODE) tree.root = y;
  else if (x === x.P.L) x.P.L = y;
  else x.P.R = y;
  y.P = x.P;
}

// 删除后修复
function fixRemove(tree: Tree, x: TreeNode): void {
  let w;

  while (x !== NULL_NODE && x.C === BLACK) {
    if (x === x.P.L) {
      w = x.P.R;

      if (w.C === RED) {
        w.C = BLACK;
        x.P.C = RED;
        rotateLeft(tree, x.P);
        w = x.P.R;
      }

      if (w.L.C === BLACK && w.R.C === BLACK) {
        w.C = RED;
        x = x.P;
      } else {
        if (w.R.C === BLACK) {
          w.L.C = BLACK;
          w.C = RED;
          rotateRight(tree, w);
          w = x.P.R;
        }

        w.C = x.P.C;
        x.P.C = BLACK;
        w.R.C = BLACK;
        rotateLeft(tree, x.P);
        x = tree.root;
      }
    } else {
      w = x.P.L;

      if (w.C === RED) {
        w.C = BLACK;
        x.P.C = RED;
        rotateRight(tree, x.P);
        w = x.P.L;
      }

      if (w.R.C === BLACK && w.L.C === BLACK) {
        w.C = RED;
        x = x.P;
      } else {
        if (w.L.C === BLACK) {
          w.R.C = BLACK;
          w.C = RED;
          rotateLeft(tree, w);
          w = x.P.L;
        }

        w.C = x.P.C;
        x.P.C = BLACK;
        w.L.C = BLACK;
        rotateRight(tree, x.P);
        x = tree.root;
      }
    }
  }

  x.C = BLACK;
}

// 找最小节点
function minimumTree(x: TreeNode): TreeNode {
  while (x.L !== NULL_NODE) x = x.L;
  return x;
}

// 插入后修复
function fixInsert(tree: Tree, z: TreeNode): void {
  let y: TreeNode;
  while (z.P.C === RED) {
    if (z.P === z.P.P.L) {
      y = z.P.P.R;

      if (y.C === RED) {
        z.P.C = BLACK;
        y.C = BLACK;
        z.P.P.C = RED;
        z = z.P.P;
      } else {
        if (z === z.P.R) {
          z = z.P;
          rotateLeft(tree, z);
        }

        z.P.C = BLACK;
        z.P.P.C = RED;
        rotateRight(tree, z.P.P);
      }
    } else {
      y = z.P.P.L;

      if (y.C === RED) {
        z.P.C = BLACK;
        y.C = BLACK;
        z.P.P.C = RED;
        z = z.P.P;
      } else {
        if (z === z.P.L) {
          z = z.P;
          rotateRight(tree, z);
        }

        z.P.C = BLACK;
        z.P.P.C = RED;
        rotateLeft(tree, z.P.P);
      }
    }
  }
  tree.root.C = BLACK;
}

/**
 * 区间树接口
 */
export interface IIntervalTree {
  /** 插入区间 */
  insert(low: number, high: number, index: number): void;
  /** 移除区间 */
  remove(index: number): void;
  /** 区间查询，查找与 [low, high] 相交的所有区间 */
  search(
    low: number,
    high: number,
    callback: (index: number, low: number) => void
  ): void;
  /** 当前区间数量 */
  size: number;
}

/**
 * 创建区间树
 * 使用红黑树实现，支持 O(log n) 的插入/删除和 O(log n + m) 的区间查询
 */
export function createIntervalTree(): IIntervalTree {
  const tree: Tree = {
    root: NULL_NODE,
    size: 0,
  };

  // 索引到节点的映射，用于 O(1) 查找
  const indexMap: Record<number, TreeNode> = {};

  return {
    insert(low: number, high: number, index: number): void {
      let x: TreeNode = tree.root;
      let y: TreeNode = NULL_NODE;

      // 查找插入位置
      while (x !== NULL_NODE) {
        y = x;
        if (low === y.low) break;
        if (low < x.low) x = x.L;
        else x = x.R;
      }

      // 如果找到相同 low 值的节点，添加到链表
      if (low === y.low && y !== NULL_NODE) {
        if (!addInterval(y, high, index)) return;
        y.high = Math.max(y.high, high);
        updateMax(y);
        updateMaxUp(y);
        indexMap[index] = y;
        tree.size++;
        return;
      }

      // 创建新节点
      const z: TreeNode = {
        low,
        high,
        max: high,
        C: RED,
        P: y,
        L: NULL_NODE,
        R: NULL_NODE,
        list: { index, high, next: null },
      };

      if (y === NULL_NODE) {
        tree.root = z;
      } else {
        if (z.low < y.low) y.L = z;
        else y.R = z;
        updateMaxUp(z);
      }

      fixInsert(tree, z);
      indexMap[index] = z;
      tree.size++;
    },

    remove(index: number): void {
      const z = indexMap[index];
      if (z === undefined) return;
      delete indexMap[index];

      const intervalResult = removeInterval(z, index);
      if (intervalResult === undefined) return;
      if (intervalResult === KEEP) {
        z.high = z.list.high;
        updateMax(z);
        updateMaxUp(z);
        tree.size--;
        return;
      }

      let y = z;
      let originalYColor = y.C;
      let x: TreeNode;

      if (z.L === NULL_NODE) {
        x = z.R;
        replaceNode(tree, z, z.R);
      } else if (z.R === NULL_NODE) {
        x = z.L;
        replaceNode(tree, z, z.L);
      } else {
        y = minimumTree(z.R);
        originalYColor = y.C;
        x = y.R;

        if (y.P === z) {
          x.P = y;
        } else {
          replaceNode(tree, y, y.R);
          y.R = z.R;
          y.R.P = y;
        }

        replaceNode(tree, z, y);
        y.L = z.L;
        y.L.P = y;
        y.C = z.C;
      }

      updateMax(x);
      updateMaxUp(x);

      if (originalYColor === BLACK) fixRemove(tree, x);
      tree.size--;
    },

    search(
      low: number,
      high: number,
      callback: (index: number, low: number) => void
    ): void {
      const stack = [tree.root];
      while (stack.length !== 0) {
        const node = stack.pop() as TreeNode;
        if (node === NULL_NODE || low > node.max) continue;
        if (node.L !== NULL_NODE) stack.push(node.L);
        if (node.R !== NULL_NODE) stack.push(node.R);
        if (node.low <= high && node.high >= low) {
          let curr: ListNode | null = node.list;
          while (curr !== null) {
            if (curr.high >= low) callback(curr.index, node.low);
            curr = curr.next;
          }
        }
      }
    },

    get size(): number {
      return tree.size;
    },
  };
}
