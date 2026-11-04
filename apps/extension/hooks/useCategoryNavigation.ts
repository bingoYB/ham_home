/**
 * useCategoryNavigation - state behind the category tree sidebar and the
 * breadcrumb / sub-category strip of the bookmarks page.
 * Owns derived tree data, per-category counts and which nodes are expanded.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildCategoryTree,
  flattenTree,
  type CategoryTreeNode,
} from '@/components/common/CategoryTree';
import {
  countBookmarksByCategory,
  getCategoryAncestorIds,
  type CategoryBookmarkCounts,
} from '@/utils/category-tree.utils';
import type { LocalBookmark, LocalCategory } from '@/types';

export interface CategoryTrailItem {
  id: string;
  name: string;
}

interface UseCategoryNavigationOptions {
  bookmarks: LocalBookmark[];
  categories: LocalCategory[];
  /** 'all' | 'uncategorized' | categoryId */
  selectedCategory: string;
}

interface UseCategoryNavigationResult {
  tree: CategoryTreeNode[];
  counts: CategoryBookmarkCounts;
  expandedIds: ReadonlySet<string>;
  /** Root-to-selected path; empty for 'all' / 'uncategorized' / unknown ids */
  trail: CategoryTrailItem[];
  /** Direct children of the selected category */
  subCategories: CategoryTreeNode[];
  toggleExpanded: (categoryId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
}

export function useCategoryNavigation({
  bookmarks,
  categories,
  selectedCategory,
}: UseCategoryNavigationOptions): UseCategoryNavigationResult {
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const flatNodes = useMemo(() => flattenTree(tree), [tree]);
  const counts = useMemo(
    () => countBookmarksByCategory(bookmarks, categories),
    [bookmarks, categories],
  );

  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  // Reveal the selected node whichever control changed the selection
  // (tree click, breadcrumb, sub-category chip, clear-filter button).
  useEffect(() => {
    if (selectedCategory === 'all' || selectedCategory === 'uncategorized') return;
    const reveal = [
      ...getCategoryAncestorIds(categories, selectedCategory),
      selectedCategory,
    ];
    setExpandedIds((prev) => {
      if (reveal.every((id) => prev.has(id))) return prev;
      return new Set([...prev, ...reveal]);
    });
  }, [categories, selectedCategory]);

  const toggleExpanded = useCallback((categoryId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(
      new Set(flatNodes.filter((node) => node.children.length > 0).map((node) => node.id)),
    );
  }, [flatNodes]);

  const collapseAll = useCallback(() => setExpandedIds(new Set()), []);

  const selectedNode = useMemo(
    () => flatNodes.find((node) => node.id === selectedCategory) ?? null,
    [flatNodes, selectedCategory],
  );

  const trail = useMemo<CategoryTrailItem[]>(() => {
    if (!selectedNode) return [];
    const nameById = new Map(categories.map((category) => [category.id, category.name]));
    return [
      ...getCategoryAncestorIds(categories, selectedNode.id),
      selectedNode.id,
    ].map((id) => ({ id, name: nameById.get(id) ?? id }));
  }, [categories, selectedNode]);

  return {
    tree,
    counts,
    expandedIds,
    trail,
    subCategories: selectedNode?.children ?? [],
    toggleExpanded,
    expandAll,
    collapseAll,
  };
}
