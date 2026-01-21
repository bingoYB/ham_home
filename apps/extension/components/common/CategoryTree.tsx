/**
 * 分类树公共组件
 * 提供树形结构构建、展示和交互功能
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, FolderOpen } from 'lucide-react';
import { Button, cn } from '@hamhome/ui';
import type { LocalCategory } from '@/types';
import { TreeSelect } from './TreeSelect';

// 树形分类节点
export interface CategoryTreeNode extends LocalCategory {
  children: CategoryTreeNode[];
  level: number;
  path: string;
}

/**
 * 构建分类树
 */
export function buildCategoryTree(categories: LocalCategory[]): CategoryTreeNode[] {
  const nodeMap = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  categories.forEach((cat) => {
    nodeMap.set(cat.id, {
      ...cat,
      children: [],
      level: 0,
      path: cat.name,
    });
  });

  categories.forEach((cat) => {
    const node = nodeMap.get(cat.id)!;
    if (cat.parentId && nodeMap.has(cat.parentId)) {
      const parent = nodeMap.get(cat.parentId)!;
      parent.children.push(node);
      node.level = parent.level + 1;
      node.path = `${parent.path}/${cat.name}`;
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: CategoryTreeNode[]): CategoryTreeNode[] => {
    return nodes
      .sort((a, b) => a.order - b.order)
      .map((node) => ({
        ...node,
        children: sortNodes(node.children),
      }));
  };

  return sortNodes(roots);
}

/**
 * 展平树形结构
 */
export function flattenTree(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  const result: CategoryTreeNode[] = [];
  const traverse = (nodes: CategoryTreeNode[]) => {
    nodes.forEach((node) => {
      result.push(node);
      traverse(node.children);
    });
  };
  traverse(nodes);
  return result;
}

/**
 * 解析分类路径为数组
 * 支持 " > " 和 "/" 分隔符
 * 如 "设计 > 灵感素材 > 图片资源"
 */
export function parseCategoryPath(path: string): string[] {
  if (path.includes(' > ')) {
    return path.split(' > ').map((s) => s.trim()).filter(Boolean);
  }
  return [path.trim()].filter(Boolean);
}

/**
 * 智能匹配分类
 * 支持：精确路径匹配、精确名称匹配、层级路径匹配、模糊匹配
 */
export function matchCategoryByPath(
  suggest: string,
  flatCategories: CategoryTreeNode[]
): CategoryTreeNode | null {
  if (!suggest) return null;

  const parts = parseCategoryPath(suggest);
  const normalizedSuggest = parts.join('/').toLowerCase();

  // 1. 精确路径匹配
  const exactPathMatch = flatCategories.find(
    (c) => c.path.toLowerCase() === normalizedSuggest
  );

  if (exactPathMatch) return exactPathMatch;

  // 2. 精确名称匹配（单层级或最后一级）
  const lastPart = parts[parts.length - 1].toLowerCase();
  const exactNameMatch = flatCategories.find(
    (c) => c.name.toLowerCase() === lastPart
  );

  if (parts.length === 1 && exactNameMatch) {
    return exactNameMatch;
  }

  // 3. 多层级匹配
  if (parts.length > 1) {
    const hierarchyMatch = flatCategories.find((c) => {
      const cPath = c.path.toLowerCase();
      return cPath === normalizedSuggest || cPath.endsWith(`/${normalizedSuggest}`);
    });
    if (hierarchyMatch) return hierarchyMatch;

    // 尝试匹配最后一级名称（且父级包含相关词）
    const parentParts = parts.slice(0, -1);
    const partialMatch = flatCategories.find((c) => {
      const cPath = c.path.toLowerCase();
      return c.name.toLowerCase() === lastPart && 
             parentParts.some(p => cPath.includes(p.toLowerCase()));
    });

    if (partialMatch) return partialMatch;

    if (exactNameMatch) return exactNameMatch;
  }

  // 4. 模糊匹配
  const fuzzyMatch = flatCategories.find(
    (c) =>
      c.name.toLowerCase().includes(lastPart) ||
      lastPart.includes(c.name.toLowerCase()) ||
      c.path.toLowerCase().includes(normalizedSuggest)
  );
  if (fuzzyMatch) return fuzzyMatch;

  return null;
}

/**
 * 搜索过滤分类树
 */
export function filterCategoryTree(
  categoryTree: CategoryTreeNode[],
  flatCategories: CategoryTreeNode[],
  search: string
): CategoryTreeNode[] {
  if (!search.trim()) return categoryTree;
  const searchLower = search.toLowerCase();
  const matchedIds = new Set<string>();

  flatCategories.forEach((cat) => {
    if (cat.name.toLowerCase().includes(searchLower) || cat.path.toLowerCase().includes(searchLower)) {
      matchedIds.add(cat.id);
      let current = cat;
      while (current.parentId) {
        matchedIds.add(current.parentId);
        current = flatCategories.find((c) => c.id === current.parentId) || current;
        if (current.id === current.parentId) break;
      }
    }
  });

  const filterTree = (nodes: CategoryTreeNode[]): CategoryTreeNode[] => {
    return nodes
      .filter((node) => matchedIds.has(node.id))
      .map((node) => ({ ...node, children: filterTree(node.children) }));
  };
  return filterTree(categoryTree);
}

// 分类筛选下拉组件 Props
interface CategoryFilterDropdownProps {
  categories: LocalCategory[];
  value: string;
  onChange: (value: string) => void;
  /** 是否包含"全部"选项 */
  showAllOption?: boolean;
  /** 自定义触发按钮样式 */
  triggerClassName?: string;
}

/**
 * 分类筛选下拉组件
 * 用于筛选场景，支持"全部"和"未分类"选项
 * 基于通用 TreeSelect 组件封装
 */
export function CategoryFilterDropdown({
  categories,
  value,
  onChange,
  showAllOption = true,
  triggerClassName,
}: CategoryFilterDropdownProps) {
  const { t } = useTranslation(['bookmark']);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const flatCategories = useMemo(() => flattenTree(categoryTree), [categoryTree]);

  // 构建前置选项
  const prependOptions = useMemo(() => {
    const options = [];
    if (showAllOption) {
      options.push({
        id: 'all',
        label: t('bookmark:bookmark.filter.allCategories'),
        icon: <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />,
      });
    }
    options.push({
      id: 'uncategorized',
      label: t('bookmark:bookmark.uncategorized'),
      icon: <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />,
    });
    return options;
  }, [showAllOption, t]);

  // 计算显示值
  const displayValue = useMemo(() => {
    if (value === 'all') return t('bookmark:bookmark.filter.allCategories');
    if (value === 'uncategorized') return t('bookmark:bookmark.uncategorized');
    const cat = flatCategories.find((c) => c.id === value);
    return cat ? (cat.level > 0 ? cat.path : cat.name) : t('bookmark:bookmark.filter.allCategories');
  }, [value, flatCategories, t]);

  return (
    <TreeSelect<CategoryTreeNode>
      nodes={categoryTree}
      flatNodes={flatCategories}
      value={value}
      onChange={(id) => onChange(id ?? 'uncategorized')}
      searchPlaceholder={t('bookmark:savePanel.searchCategory')}
      filterFn={filterCategoryTree}
      prependOptions={prependOptions}
      renderTrigger={() => (
        <Button
          variant="outline"
          size="sm"
          className={cn('w-[180px] h-9 justify-between', triggerClassName)}
        >
          <div className="flex items-center gap-2 truncate">
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">{displayValue}</span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
        </Button>
      )}
      renderNodeIcon={() => (
        <FolderOpen className="h-4 w-4 text-emerald-500 shrink-0" />
      )}
      popoverWidth={220}
      popoverAlign="end"
      maxHeight={256}
    />
  );
}
