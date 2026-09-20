/**
 * 重复书签分组 Hook
 * 从书签列表里算出重复分组，供体检中心筛选与批量清理使用
 */
import { useMemo } from "react";
import { buildHealthDuplicateGroups } from "@/lib/health/bookmark-health-utils";
import type { DuplicateGroup } from "@/lib/bookmarks/bookmark-dedup";
import type { LocalBookmark } from "@/types";

/** canonical 为保留项，duplicate 为一键清理会移入回收站的那些 */
export type DuplicateRole = "canonical" | "duplicate";

export interface UseDuplicateBookmarksResult {
  /** 每组内按收藏时间升序，第一条为保留项 */
  groups: DuplicateGroup<LocalBookmark>[];
  /** 书签 ID -> 在所属重复组里的角色，不重复的书签不在表内 */
  roles: Map<string, DuplicateRole>;
  /** 每组除保留项外的书签 ID */
  redundantIds: string[];
}

export function useDuplicateBookmarks(
  bookmarks: LocalBookmark[],
): UseDuplicateBookmarksResult {
  return useMemo(() => {
    const groups = buildHealthDuplicateGroups(bookmarks);
    const roles = new Map<string, DuplicateRole>();
    const redundantIds: string[] = [];

    for (const group of groups) {
      roles.set(group.canonical.id, "canonical");
      for (const duplicate of group.duplicates) {
        roles.set(duplicate.id, "duplicate");
        redundantIds.push(duplicate.id);
      }
    }

    return { groups, roles, redundantIds };
  }, [bookmarks]);
}
