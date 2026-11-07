/**
 * Deletion records of non-bookmark entities (pure helpers, no storage access).
 *
 * Categories, workspaces, workspace categories and tab-group rules used to be hard-deleted
 * without a trace, so the remote copy was imported straight back on the next sync. Each
 * deletion now leaves `{ id, deletedAt }`; the sync engine publishes them in
 * `deletions.json` and other devices remove their local copies. Records expire after the
 * same retention window as bookmark tombstones.
 */
import { mergeTombstones, pruneExpiredTombstones } from '../bookmarks/bookmark-retention';
import type { BookmarkTombstone } from '@/types';

export const SYNC_TOMBSTONE_KINDS = ['categories', 'workspaces', 'workspaceCategories', 'tabGroupRules'] as const;
export type SyncTombstoneKind = (typeof SYNC_TOMBSTONE_KINDS)[number];
export type SyncTombstones = Record<SyncTombstoneKind, BookmarkTombstone[]>;

export function emptySyncTombstones(): SyncTombstones {
  return { categories: [], workspaces: [], workspaceCategories: [], tabGroupRules: [] };
}

/** Merges two sets kind by kind: the earliest deletion wins and expired records are dropped. */
export function mergeSyncTombstones(
  a: Partial<SyncTombstones>,
  b: Partial<SyncTombstones>,
  now = Date.now(),
): SyncTombstones {
  const result = emptySyncTombstones();
  for (const kind of SYNC_TOMBSTONE_KINDS) {
    result[kind] = pruneExpiredTombstones(mergeTombstones(a[kind] ?? [], b[kind] ?? []), now);
  }
  return result;
}
