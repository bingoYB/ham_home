/**
 * 书签删除保留策略
 *
 * 删除分三段，兼顾「可反悔」和「不无限占空间」：
 *
 * 1. 回收站期：软删除，完整保留元数据与正文/快照/截图，用户可恢复；
 * 2. 墓碑期：到期后彻底删除全部数据，只留 { id, deletedAt }，仅用于同步收敛；
 * 3. 到期：墓碑本身也清理掉。
 *
 * 墓碑期从「彻底删除」那一刻起算而不是从进回收站起算：回收站阶段由软删除
 * 记录自己携带删除状态同步，墓碑接棒后才需要完整的传播窗口。否则历史遗留的
 * 老软删除记录一被清理就会得到一个「出生即过期」的墓碑，删除传播不出去，
 * 反而被其他设备把书签推回来。
 *
 * 墓碑期必须远长于设备可能的离线时长：一旦墓碑先于某台离线设备过期，
 * 那台设备再上线时远端已查无此记录，它会把本地副本当成「新书签」重新上传，
 * 书签就复活了。
 */
import type { BookmarkTombstone } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 回收站可恢复天数 */
export const TRASH_RETENTION_DAYS = 30;
/** 墓碑保留天数，自「彻底删除」那一刻起算 */
export const TOMBSTONE_RETENTION_DAYS = 90;

export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * DAY_MS;
export const TOMBSTONE_RETENTION_MS = TOMBSTONE_RETENTION_DAYS * DAY_MS;

/** 回收站里这条记录是否已过可恢复期，应转为墓碑 */
export function isTrashExpired(deletedAt: number, now = Date.now()): boolean {
  return now - deletedAt >= TRASH_RETENTION_MS;
}

/** 墓碑是否已过保留期，可以彻底清理 */
export function isTombstoneExpired(deletedAt: number, now = Date.now()): boolean {
  return now - deletedAt >= TOMBSTONE_RETENTION_MS;
}

/** 回收站记录剩余可恢复天数（向上取整，最小 0） */
export function getTrashRemainingDays(deletedAt: number, now = Date.now()): number {
  const remaining = deletedAt + TRASH_RETENTION_MS - now;
  return remaining <= 0 ? 0 : Math.ceil(remaining / DAY_MS);
}

/**
 * 合并两侧墓碑
 *
 * 同一条记录取更早的 deletedAt：保留期从真正删除的那一刻算起，
 * 否则每次同步都可能把到期时间往后推，墓碑永远清不掉。
 * 已过期的墓碑直接丢弃，不再参与同步。
 */
export function mergeTombstones(
  ...lists: readonly BookmarkTombstone[][]
): BookmarkTombstone[] {
  const merged = new Map<string, number>();
  for (const list of lists) {
    for (const tombstone of list) {
      const current = merged.get(tombstone.id);
      if (current === undefined || tombstone.deletedAt < current) {
        merged.set(tombstone.id, tombstone.deletedAt);
      }
    }
  }
  return Array.from(merged, ([id, deletedAt]) => ({ id, deletedAt }));
}

/** 过滤掉已过保留期的墓碑 */
export function pruneExpiredTombstones(
  tombstones: readonly BookmarkTombstone[],
  now = Date.now(),
): BookmarkTombstone[] {
  return tombstones.filter((tombstone) => !isTombstoneExpired(tombstone.deletedAt, now));
}
