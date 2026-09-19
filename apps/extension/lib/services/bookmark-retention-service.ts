/**
 * 书签保留期清理
 *
 * 定期把过了回收站期的书签彻底删除（只留墓碑），并清掉过期墓碑。
 * 详见 lib/bookmarks/bookmark-retention.ts 的三段式说明。
 */
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import { bookmarkTombstoneStorage } from "@/lib/storage/bookmark-tombstone-storage";
import { isTrashExpired } from "@/lib/bookmarks/bookmark-retention";

export interface RetentionSweepResult {
  /** 过期后被彻底删除的书签数 */
  purged: number;
  /** 被清理的过期墓碑数 */
  prunedTombstones: number;
}

export class BookmarkRetentionService {
  async sweep(now = Date.now()): Promise<RetentionSweepResult> {
    const trashed = await bookmarkStorage.getDeletedBookmarks();

    // 老数据没有 deletedAt，退回 updatedAt——软删除当时正是用它记的时间
    const expiredIds = trashed
      .filter((bookmark) => isTrashExpired(bookmark.deletedAt ?? bookmark.updatedAt, now))
      .map((bookmark) => bookmark.id);

    if (expiredIds.length > 0) {
      await bookmarkStorage.purgeBookmarks(expiredIds);
    }

    const prunedTombstones = await bookmarkTombstoneStorage.pruneExpired(now);

    return { purged: expiredIds.length, prunedTombstones };
  }
}

export const bookmarkRetentionService = new BookmarkRetentionService();
