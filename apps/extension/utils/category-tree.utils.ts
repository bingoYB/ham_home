/**
 * Pure helpers for category tree navigation (sidebar tree, breadcrumb, counts).
 */
import type { LocalBookmark, LocalCategory } from '@/types';

export interface CategoryBookmarkCounts {
  /** Every bookmark, regardless of category */
  all: number;
  /** Bookmarks without a category */
  uncategorized: number;
  /** categoryId -> bookmarks in that category including all descendants */
  byCategory: ReadonlyMap<string, number>;
}

function buildParentMap(categories: LocalCategory[]): Map<string, string | null> {
  return new Map(categories.map((category) => [category.id, category.parentId]));
}

/**
 * Ancestor ids of a category, ordered from the root down to its direct parent.
 * Stops on missing parents and on cycles so malformed data cannot hang the UI.
 */
export function getCategoryAncestorIds(
  categories: LocalCategory[],
  categoryId: string,
): string[] {
  const parentOf = buildParentMap(categories);
  const ancestors: string[] = [];
  const seen = new Set<string>([categoryId]);

  let parentId = parentOf.get(categoryId) ?? null;
  while (parentId && parentOf.has(parentId) && !seen.has(parentId)) {
    ancestors.unshift(parentId);
    seen.add(parentId);
    parentId = parentOf.get(parentId) ?? null;
  }
  return ancestors;
}

/**
 * The category itself plus every descendant. Unknown ids yield only themselves,
 * so a stale selection still matches bookmarks filed directly under it.
 */
export function collectCategoryScopeIds(
  categories: LocalCategory[],
  categoryId: string,
): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const siblings = childrenOf.get(category.parentId) ?? [];
    siblings.push(category.id);
    childrenOf.set(category.parentId, siblings);
  }

  const scope = new Set<string>([categoryId]);
  const queue = [categoryId];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const childId of childrenOf.get(current) ?? []) {
      if (scope.has(childId)) continue;
      scope.add(childId);
      queue.push(childId);
    }
  }
  return scope;
}

/**
 * Bookmark counts per category. A parent's count includes its descendants,
 * matching what the list shows once that parent is selected.
 */
export function countBookmarksByCategory(
  bookmarks: Pick<LocalBookmark, 'categoryId'>[],
  categories: LocalCategory[],
): CategoryBookmarkCounts {
  const direct = new Map<string, number>();
  let uncategorized = 0;

  for (const bookmark of bookmarks) {
    if (!bookmark.categoryId) {
      uncategorized += 1;
      continue;
    }
    direct.set(bookmark.categoryId, (direct.get(bookmark.categoryId) ?? 0) + 1);
  }

  const byCategory = new Map<string, number>();
  for (const category of categories) {
    const own = direct.get(category.id) ?? 0;
    if (own === 0) continue;
    byCategory.set(category.id, (byCategory.get(category.id) ?? 0) + own);
    for (const ancestorId of getCategoryAncestorIds(categories, category.id)) {
      byCategory.set(ancestorId, (byCategory.get(ancestorId) ?? 0) + own);
    }
  }

  return { all: bookmarks.length, uncategorized, byCategory };
}
