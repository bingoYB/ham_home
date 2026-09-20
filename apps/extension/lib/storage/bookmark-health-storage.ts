import type { BookmarkHealthRecord } from "@/types";

type BookmarkHealthMap = Record<string, BookmarkHealthRecord>;

const healthItem = storage.defineItem<BookmarkHealthMap>(
  "local:bookmarkHealth",
  { fallback: {} },
);

class BookmarkHealthStorage {
  async getAll(): Promise<BookmarkHealthRecord[]> {
    return Object.values(await healthItem.getValue());
  }

  async get(bookmarkId: string): Promise<BookmarkHealthRecord | null> {
    const records = await healthItem.getValue();
    return records[bookmarkId] ?? null;
  }

  async set(record: BookmarkHealthRecord): Promise<void> {
    const records = await healthItem.getValue();
    await healthItem.setValue({ ...records, [record.bookmarkId]: record });
  }

  async setMany(records: BookmarkHealthRecord[]): Promise<void> {
    if (records.length === 0) return;
    const current = await healthItem.getValue();
    const next = { ...current };
    for (const record of records) next[record.bookmarkId] = record;
    await healthItem.setValue(next);
  }

  async delete(bookmarkId: string): Promise<void> {
    const records = await healthItem.getValue();
    const next = { ...records };
    delete next[bookmarkId];
    await healthItem.setValue(next);
  }

  async deleteMany(bookmarkIds: string[]): Promise<void> {
    if (bookmarkIds.length === 0) return;
    const records = await healthItem.getValue();
    const next = { ...records };
    for (const id of bookmarkIds) delete next[id];
    await healthItem.setValue(next);
  }

  async ignoreIssue(bookmarkId: string, issueCode: string): Promise<void> {
    const records = await healthItem.getValue();
    const record = records[bookmarkId];
    if (!record) return;
    const ignoredIssueCodes = Array.from(
      new Set([...(record.ignoredIssueCodes ?? []), issueCode]),
    );
    await healthItem.setValue({
      ...records,
      [bookmarkId]: { ...record, ignoredIssueCodes },
    });
  }

  async clear(): Promise<void> {
    await healthItem.setValue({});
  }

  watch(callback: (records: BookmarkHealthRecord[]) => void): () => void {
    return healthItem.watch((value) => callback(Object.values(value ?? {})));
  }
}

export const bookmarkHealthStorage = new BookmarkHealthStorage();
