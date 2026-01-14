/**
 * 分类选择组件
 * 支持树形展示、搜索、AI推荐分类匹配
 */
import * as React from 'react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Check, ChevronRight, ChevronDown, FolderOpen, Sparkles, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  cn,
} from '@hamhome/ui';
import type { LocalCategory } from '@/types';

// 树形分类节点
interface CategoryTreeNode extends LocalCategory {
  children: CategoryTreeNode[];
  level: number;
  path: string; // 完整路径，如 "工具/抠图"
}

interface CategorySelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  categories: LocalCategory[];
  /** AI 推荐的分类（可能是层级格式如 "工具/抠图"） */
  aiRecommendedCategory?: string | null;
  /** 应用 AI 推荐分类回调 */
  onApplyAICategory?: () => void;
  placeholder?: string;
  className?: string;
}

/**
 * 构建分类树
 */
function buildCategoryTree(categories: LocalCategory[]): CategoryTreeNode[] {
  const nodeMap = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // 创建所有节点
  categories.forEach((cat) => {
    nodeMap.set(cat.id, {
      ...cat,
      children: [],
      level: 0,
      path: cat.name,
    });
  });

  // 构建父子关系
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

  // 按 order 排序
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
 * 展平树形结构用于搜索
 */
function flattenTree(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
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
 */
function parseSuggestPath(suggest: string): string[] {
  if (suggest.includes(' > ')) {
    return suggest.split(' > ').map((s) => s.trim()).filter(Boolean);
  }
  if (suggest.includes('/')) {
    return suggest.split('/').map((s) => s.trim()).filter(Boolean);
  }
  return [suggest.trim()].filter(Boolean);
}

/**
 * 智能匹配分类
 * 支持：
 * - 精确匹配名称
 * - 层级路径匹配 (如 "工具/抠图" 或 "设计 > 灵感素材")
 * - 末端名称匹配
 * - 模糊匹配（包含关系）
 */
function matchCategory(
  suggest: string,
  flatCategories: CategoryTreeNode[]
): CategoryTreeNode | null {
  if (!suggest) return null;

  const parts = parseSuggestPath(suggest);
  const normalizedSuggest = parts.join('/').toLowerCase();

  // 1. 精确路径匹配（将 suggest 转换为 "/" 分隔的格式匹配）
  const exactPathMatch = flatCategories.find(
    (c) => c.path.toLowerCase() === normalizedSuggest
  );
  if (exactPathMatch) return exactPathMatch;

  // 2. 精确名称匹配（单层级或最后一级）
  const lastPart = parts[parts.length - 1].toLowerCase();
  const exactNameMatch = flatCategories.find(
    (c) => c.name.toLowerCase() === lastPart
  );

  // 如果只有一层，直接返回
  if (parts.length === 1 && exactNameMatch) {
    return exactNameMatch;
  }

  // 3. 多层级匹配：尝试匹配完整层级路径
  if (parts.length > 1) {
    // 尝试匹配完整层级
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

    // 仅匹配最后一级名称
    if (exactNameMatch) return exactNameMatch;
  }

  // 4. 模糊匹配（包含关系）
  const fuzzyMatch = flatCategories.find(
    (c) =>
      c.name.toLowerCase().includes(lastPart) ||
      lastPart.includes(c.name.toLowerCase()) ||
      c.path.toLowerCase().includes(normalizedSuggest)
  );
  if (fuzzyMatch) return fuzzyMatch;

  return null;
}

export function CategorySelect({
  value,
  onChange,
  categories,
  aiRecommendedCategory,
  onApplyAICategory,
  placeholder,
  className,
}: CategorySelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 构建树形结构
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const flatCategories = useMemo(() => flattenTree(categoryTree), [categoryTree]);

  // 当前选中的分类
  const selectedCategory = useMemo(() => {
    if (!value) return null;
    return flatCategories.find((c) => c.id === value) || null;
  }, [value, flatCategories]);

  // AI 推荐分类匹配结果
  const matchedAICategory = useMemo(() => {
    if (!aiRecommendedCategory) return null;
    return matchCategory(aiRecommendedCategory, flatCategories);
  }, [aiRecommendedCategory, flatCategories]);

  // 是否显示 AI 推荐提示（匹配不到时显示）
  const showAIRecommendation = aiRecommendedCategory && !matchedAICategory && !value;

  // 如果 AI 推荐匹配到了，自动选中
  useEffect(() => {
    if (matchedAICategory && !value) {
      onChange(matchedAICategory.id);
    }
  }, [matchedAICategory, value, onChange]);

  // 搜索过滤
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categoryTree;

    const searchLower = search.toLowerCase();
    const matchedIds = new Set<string>();

    // 找到所有匹配的节点及其祖先
    flatCategories.forEach((cat) => {
      if (
        cat.name.toLowerCase().includes(searchLower) ||
        cat.path.toLowerCase().includes(searchLower)
      ) {
        matchedIds.add(cat.id);
        // 添加所有祖先
        let current = cat;
        while (current.parentId) {
          matchedIds.add(current.parentId);
          current = flatCategories.find((c) => c.id === current.parentId) || current;
          if (current.id === current.parentId) break;
        }
      }
    });

    // 过滤并保持树形结构
    const filterTree = (nodes: CategoryTreeNode[]): CategoryTreeNode[] => {
      return nodes
        .filter((node) => matchedIds.has(node.id))
        .map((node) => ({
          ...node,
          children: filterTree(node.children),
        }));
    };

    return filterTree(categoryTree);
  }, [search, categoryTree, flatCategories]);

  // 切换展开/收起
  const toggleExpand = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // 选择分类
  const handleSelect = useCallback(
    (categoryId: string | null) => {
      onChange(categoryId);
      setOpen(false);
      setSearch('');
    },
    [onChange]
  );

  // 渲染分类树节点
  const renderTreeNode = (node: CategoryTreeNode) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id) || search.trim().length > 0;
    const isSelected = value === node.id;

    return (
      <div key={node.id}>
        <CommandItem
          value={node.path}
          onSelect={() => handleSelect(node.id)}
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            node.level > 0 && 'ml-4'
          )}
          style={{ paddingLeft: `${node.level * 16 + 8}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => toggleExpand(node.id, e)}
              className="p-0.5 hover:bg-accent rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <FolderOpen className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="flex-1 truncate">{node.name}</span>
          {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
        </CommandItem>
        {hasChildren && isExpanded && (
          <div>{node.children.map((child) => renderTreeNode(child))}</div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full h-10 justify-between font-normal"
          >
            {selectedCategory ? (
              <div className="flex items-center gap-2 truncate">
                <FolderOpen className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="truncate">
                  {selectedCategory.level > 0
                    ? selectedCategory.path
                    : selectedCategory.name}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">
                {placeholder || t('bookmark:savePanel.selectCategory')}
              </span>
            )}
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('bookmark:savePanel.searchCategory')}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <CommandList className="max-h-60 overflow-y-auto">
              <CommandEmpty>{t('bookmark:savePanel.noCategoryFound')}</CommandEmpty>
              <CommandGroup>
                {/* 未分类选项 */}
                <CommandItem
                  value="uncategorized"
                  onSelect={() => handleSelect(null)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-4" />
                  <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1">{t('bookmark:bookmark.uncategorized')}</span>
                  {value === null && <Check className="h-4 w-4 text-primary shrink-0" />}
                </CommandItem>

                {/* 分类树 */}
                {filteredCategories.map((node) => renderTreeNode(node))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* AI 推荐分类（不在已有分类中时显示） */}
      {showAIRecommendation && (
        <div className="flex items-center justify-between py-1.5 px-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-amber-700 dark:text-amber-300">
              {t('bookmark:savePanel.aiRecommendedCategory')}
              <span className="font-medium">{aiRecommendedCategory}</span>
            </span>
          </div>
          {onApplyAICategory && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              onClick={onApplyAICategory}
            >
              {t('bookmark:savePanel.apply')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
