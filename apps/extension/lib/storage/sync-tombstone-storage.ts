/**
 * Local store of non-bookmark deletion records (see lib/sync/sync-tombstones.ts).
 */
import {
  emptySyncTombstones,
  mergeSyncTombstones,
  type SyncTombstoneKind,
  type SyncTombstones,
} from '../sync/sync-tombstones';

const syncTombstonesItem = storage.defineItem<SyncTombstones>('local:syncTombstones', {
  fallback: emptySyncTombstones(),
});

class SyncTombstoneStorage {
  async getAll(): Promise<SyncTombstones> {
    return mergeSyncTombstones(emptySyncTombstones(), await syncTombstonesItem.getValue());
  }

  /** Records deletions; an existing record keeps its earlier timestamp. */
  async add(kind: SyncTombstoneKind, ids: string[], now = Date.now()): Promise<void> {
    if (ids.length === 0) return;
    const current = await this.getAll();
    const next = mergeSyncTombstones(current, { [kind]: ids.map((id) => ({ id, deletedAt: now })) }, now);
    await syncTombstonesItem.setValue(next);
  }

  /** Overwrites the store with the merged result of a sync. */
  async replaceAll(tombstones: SyncTombstones): Promise<void> {
    await syncTombstonesItem.setValue(tombstones);
  }

  async clear(): Promise<void> {
    await syncTombstonesItem.setValue(emptySyncTombstones());
  }
}

export const syncTombstoneStorage = new SyncTombstoneStorage();
