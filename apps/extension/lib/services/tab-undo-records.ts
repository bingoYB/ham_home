/**
 * Undo records behind the in-page "Undo" buttons. Stored in session storage (so they
 * survive a service worker restart) and only honoured for a few minutes.
 */
import { nanoid } from "nanoid";
import { tabSessionStorage } from "@/lib/storage/tab-session-storage";
import type { ReadLaterEntry } from "@/types";

export const UNDO_TTL_MS = 10 * 60 * 1000;

export interface ArchiveUndoRecord {
  kind: "archive";
  batchId: string;
  createdAt: number;
}

export interface ClosedTabSnapshot {
  url: string;
  windowId?: number;
  index?: number;
  active?: boolean;
}

export interface ReadLaterUndoRecord {
  kind: "readLater";
  createdAt: number;
  /** Tabs that were closed and are reopened on undo */
  tabs: ClosedTabSnapshot[];
  /** Bookmarks created by the action; undo deletes them for good */
  createdBookmarkIds: string[];
  /** Queue state before the action for existing bookmarks (null: was not queued) */
  previousEntries: Record<string, ReadLaterEntry | null>;
}

export type TabUndoRecord = ArchiveUndoRecord | ReadLaterUndoRecord;

export async function saveUndoRecord(record: TabUndoRecord): Promise<string> {
  const token = nanoid();
  await tabSessionStorage.setUndo(token, record);
  return token;
}

/** Take (and forget) a record; null when unknown or too old */
export async function takeUndoRecord(token: string): Promise<TabUndoRecord | null> {
  const record = await tabSessionStorage.getUndo<TabUndoRecord>(token);
  if (!record) return null;
  await tabSessionStorage.removeUndo(token);
  return Date.now() - record.createdAt > UNDO_TTL_MS ? null : record;
}
