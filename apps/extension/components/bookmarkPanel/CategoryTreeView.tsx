/**
 * CategoryTreeView - 分类层级树视图组件
 * 按分类层级展示书签，支持展开/折叠
 */
import { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { Button, ScrollArea, cn } from '@hamhome/ui';
import { BookmarkListItem } from './BookmarkListItem';
import type { LocalBookmark, LocalCategory } from '@/types';

export interface CategoryTreeViewProps {
  bookmarks: LocalBookmark[];
  categories: LocalCategory[];
  onOpenBookmark?: (url: string) => void;
  className?: string;
}

/**
 * 构建分类树结构
 */
interface CategoryNode {
  category: LocalCategory | null; // null 表示未分类
  children: CategoryNode[];
  bookmarks: LocalBookmark[];
}

/**
 * 构建分类树
 */
function buildCategoryTree(
  categories: LocalCategory[],
  bookmarks: LocalBookmark[]
): CategoryNode[] {
  // 创建分类 Map
  const categoryMap = new Map<string, LocalCategory>();
  categories.forEach((cat) => categoryMap.set(cat.id, cat));

  // 按分类 ID 分组书签
  // 空字符串、null、或指向不存在分类的 ID 都视为未分类
  const bookmarksByCategory = new Map<string | null, LocalBookmark[]>();
  bookmarks.forEach((bookmark) => {
    // 如果 categoryId 为空或对应的分类不存在，视为未分类
    const rawCategoryId = bookmark.categoryId;
    const categoryId = rawCategoryId && categoryMap.has(rawCategoryId) ? rawCategoryId : null;
    if (!bookmarksByCategory.has(categoryId)) {
      bookmarksByCategory.set(categoryId, []);
    }
    bookmarksByCategory.get(categoryId)!.push(bookmark);
  });

  // 构建树节点
  const buildNode = (category: LocalCategory | null): CategoryNode => {
    const categoryId = category?.id || null;
    const children: CategoryNode[] = [];

    // 找到子分类
    if (category) {
      categories
        .filter((c) => c.parentId === category.id)
        .sort((a, b) => a.order - b.order)
        .forEach((childCat) => {
          children.push(buildNode(childCat));
        });
    }

    return {
      category,
      children,
      bookmarks: bookmarksByCategory.get(categoryId) || [],
    };
  };

  // 构建根节点列表
  const rootNodes: CategoryNode[] = [];

  // 添加顶层分类
  categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.order - b.order)
    .forEach((cat) => {
      rootNodes.push(buildNode(cat));
    });

  // 添加未分类节点（如果有未分类书签）
  const uncategorizedBookmarks = bookmarksByCategory.get(null);
  if (uncategorizedBookmarks && uncategorizedBookmarks.length > 0) {
    rootNodes.push({
      category: null,
      children: [],
      bookmarks: uncategorizedBookmarks,
    });
  }

  return rootNodes;
}

/**
 * 检查节点是否有内容（书签或子节点）
 */
function hasContent(node: CategoryNode): boolean {
  if (node.bookmarks.length > 0) return true;
  return node.children.some(hasContent);
}

/**
 * 分类树节点组件
 */
interface CategoryTreeNodeProps {
  node: CategoryNode;
  level: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onOpenBookmark?: (url: string) => void;
}

function CategoryTreeNode({
  node,
  level,
  expandedIds,
  onToggleExpand,
  onOpenBookmark,
}: CategoryTreeNodeProps) {
  const nodeId = node.category?.id || 'uncategorized';
  const isExpanded = expandedIds.has(nodeId);
  const hasChildren = node.children.length > 0 || node.bookmarks.length > 0;
  const nodeName = node.category?.name || '未分类';

  // 如果没有内容，不渲染
  if (!hasContent(node)) return null;

  return (
    <div>
      {/* 分类头部 */}
      <Button
        variant="outline"
        onClick={() => onToggleExpand(nodeId)}
        className="border-0 w-full justify-start shadow-none"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* 展开/折叠图标 */}
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )
        ) : (
          <div className="w-4" />
        )}

        {/* 文件夹图标 */}
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 shrink-0" />
        )}

        {/* 分类名称 */}
        <span className="text-sm font-medium truncate">
          {nodeName}
        </span>

        {/* 计数 */}
        <span className="text-xs ml-auto">
          {node.bookmarks.length}
        </span>
      </Button>

      {/* 展开的内容 */}
      {isExpanded && (
        <div>
          {/* 子分类 */}
          {node.children.map((childNode) => (
            <CategoryTreeNode
              key={childNode.category?.id || 'uncategorized-child'}
              node={childNode}
              level={level + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onOpenBookmark={onOpenBookmark}
            />
          ))}

          {/* 书签列表 */}
          <div style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}>
            {node.bookmarks.map((bookmark) => (
              <BookmarkListItem
                key={bookmark.id}
                bookmark={bookmark}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CategoryTreeView({
  bookmarks,
  categories,
  onOpenBookmark,
  className,
}: CategoryTreeViewProps) {
  // 展开状态管理
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // 默认展开所有顶层分类和未分类
    const ids = new Set<string>();
    categories.filter((c) => !c.parentId).forEach((c) => ids.add(c.id));
    ids.add('uncategorized');
    return ids;
  });

  // 构建分类树
  const categoryTree = useMemo(
    () => buildCategoryTree(categories, bookmarks),
    [categories, bookmarks]
  );

  // 切换展开状态
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 空状态
  if (bookmarks.length === 0) {
    return null;
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="p-2">
        {categoryTree.map((node) => (
          <CategoryTreeNode
            key={node.category?.id || 'uncategorized'}
            node={node}
            level={0}
            expandedIds={expandedIds}
            onToggleExpand={handleToggleExpand}
            onOpenBookmark={onOpenBookmark}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
