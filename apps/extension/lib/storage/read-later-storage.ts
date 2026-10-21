/**
 * Read later queue state (local:readLaterEntries), keyed by bookmark ID.
 *
 * The bookmark itself stays in bookmark storage; this only holds the queue state and
 * syncs as bookmarks/read-later.json, so older clients that strip unknown bookmark
 * fields cannot erase it.
 */
import type { ReadLaterEntry, ReadLaterEntryMap } from "@/types";

const entriesItem = storage.defineItem<ReadLaterEntryMap>("local:readLaterEntries", {
  fallback: {},
});

type EntryUpdater = (current: ReadLaterEntry | undefined) => ReadLaterEntry | null | undefined;

class ReadLaterStorage {
  private queue: Promise<unknown> = Promise.resolve();

  async getAll(): Promise<ReadLaterEntryMap> {
    return { ...(await entriesItem.getValue()) };
  }

  async get(bookmarkId: string): Promise<ReadLaterEntry | undefined> {
    return (await entriesItem.getValue())[bookmarkId];
  }

  /** Serialized read-modify-write over the whole map */
  private mutate(
    mutator: (entries: ReadLaterEntryMap) => boolean,
  ): Promise<ReadLaterEntryMap> {
    const run = async () => {
      const next = { ...(await entriesItem.getValue()) };
      if (mutator(next)) await entriesItem.setValue(next);
      return next;
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  /** Return null from the updater to delete the entry, undefined to leave it as is */
  async update(bookmarkId: string, updater: EntryUpdater): Promise<ReadLaterEntry | undefined> {
    let updated: ReadLaterEntry | undefined;
    await this.mutate((entries) => {
      const next = updater(entries[bookmarkId]);
      if (next === undefined) {
        updated = entries[bookmarkId];
        return false;
      }
      if (next === null) {
        delete entries[bookmarkId];
        updated = undefined;
        return true;
      }
      entries[bookmarkId] = next;
      updated = next;
      return true;
    });
    return updated;
  }

  async updateMany(bookmarkIds: readonly string[], updater: EntryUpdater): Promise<ReadLaterEntry[]> {
    const updated: ReadLaterEntry[] = [];
    if (bookmarkIds.length === 0) return updated;
    await this.mutate((entries) => {
      let changed = false;
      for (const id of bookmarkIds) {
        const next = updater(entries[id]);
        if (next === undefined) continue;
        changed = true;
        if (next === null) delete entries[id];
        else {
          entries[id] = next;
          updated.push(next);
        }
      }
      return changed;
    });
    return updated;
  }

  async set(entry: ReadLaterEntry): Promise<void> {
    await this.mutate((entries) => {
      entries[entry.bookmarkId] = entry;
      return true;
    });
  }

  async setMany(list: readonly ReadLaterEntry[]): Promise<void> {
    if (list.length === 0) return;
    await this.mutate((entries) => {
      for (const entry of list) entries[entry.bookmarkId] = entry;
      return true;
    });
  }

  /** Hard delete, used when the bookmark itself is gone for good */
  async remove(bookmarkIds: readonly string[]): Promise<void> {
    if (bookmarkIds.length === 0) return;
    await this.mutate((entries) => {
      let changed = false;
      for (const id of bookmarkIds) {
        if (entries[id]) {
          delete entries[id];
          changed = true;
        }
      }
      return changed;
    });
  }

  async replaceAll(entries: ReadLaterEntryMap): Promise<void> {
    await this.mutate((current) => {
      for (const key of Object.keys(current)) delete current[key];
      Object.assign(current, entries);
      return true;
    });
  }

  /**
   * Replace the map with what `build` makes of the entries as they are right now, in
   * one serialized read-modify-write. Unlike getAll() followed by replaceAll(), writes
   * made in between (e.g. while a sync waited on the network) are not lost. `build`
   * returns null to leave the map as it is. Resolves to the resulting map.
   */
  async replaceWith(
    build: (current: ReadLaterEntryMap) => ReadLaterEntryMap | null,
  ): Promise<ReadLaterEntryMap> {
    return this.mutate((current) => {
      const next = build({ ...current });
      if (!next) return false;
      for (const key of Object.keys(current)) delete current[key];
      Object.assign(current, next);
      return true;
    });
  }

  async clear(): Promise<void> {
    await entriesItem.setValue({});
  }

  watch(callback: (entries: ReadLaterEntryMap) => void): () => void {
    return entriesItem.watch((value) => callback({ ...(value ?? {}) }));
  }
}

export const readLaterStorage = new ReadLaterStorage();
