/**
 * 书签删除墓碑存储
 *
 * 书签被彻底删除后，本体和正文/快照/截图都会被清掉，只在这里留下
 * { id, deletedAt }。同步靠它把删除结果传播到其他设备；过了保留期
 * 由 bookmark-retention-service 清理。
 */
import {
  mergeTombstones,
  pruneExpiredTombstones,
} from '../bookmarks/bookmark-retention';
import type { BookmarkTombstone } from '@/types';

const tombstonesItem = storage.defineItem<BookmarkTombstone[]>(
  'local:bookmarkTombstones',
  { fallback: [] },
);

class BookmarkTombstoneStorage {
  async getAll(): Promise<BookmarkTombstone[]> {
    return tombstonesItem.getValue();
  }

  /** 记录一批删除；已存在的保留更早的 deletedAt */
  async add(tombstones: BookmarkTombstone[]): Promise<void> {
    if (tombstones.length === 0) return;
    const current = await tombstonesItem.getValue();
    await tombstonesItem.setValue(mergeTombstones(current, tombstones));
  }

  /** 用合并后的结果整体覆盖（同步完成后回写） */
  async replaceAll(tombstones: BookmarkTombstone[]): Promise<void> {
    await tombstonesItem.setValue(tombstones);
  }

  /** 书签被恢复时撤销对应墓碑，避免下次同步又把它删掉 */
  async remove(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const current = await tombstonesItem.getValue();
    const idSet = new Set(ids);
    const next = current.filter((tombstone) => !idSet.has(tombstone.id));
    if (next.length !== current.length) {
      await tombstonesItem.setValue(next);
    }
  }

  /** 清理过期墓碑，返回被清理的数量 */
  async pruneExpired(now = Date.now()): Promise<number> {
    const current = await tombstonesItem.getValue();
    const next = pruneExpiredTombstones(current, now);
    if (next.length === current.length) return 0;
    await tombstonesItem.setValue(next);
    return current.length - next.length;
  }

  async clear(): Promise<void> {
    await tombstonesItem.setValue([]);
  }
}

export const bookmarkTombstoneStorage = new BookmarkTombstoneStorage();
