/**
 * Item-by-item parsing of remote list files (pure).
 *
 * The old code validated whole arrays: one item it could not read (for example an enum
 * value added by a newer version) made the entire file count as empty, and the engine then
 * overwrote it with local data. Items are now parsed one by one: readable items take part
 * in the merge, unreadable ones are written back untouched and never dropped.
 */
import type { z } from 'zod';
import { SyncError } from './webdav-client';

export interface ParsedRemoteItems<T> {
  valid: T[];
  /** Raw items that failed validation; written back to the remote file as they were. */
  invalid: unknown[];
}

export function parseRemoteItems<S extends z.ZodTypeAny>(
  items: unknown,
  schema: S,
  file: string,
): ParsedRemoteItems<z.infer<S>> {
  if (!Array.isArray(items)) {
    throw new SyncError('invalidRemoteData', `Unexpected structure in remote file ${file}`);
  }
  const valid: z.infer<S>[] = [];
  const invalid: unknown[] = [];
  for (const item of items) {
    const parsed = schema.safeParse(item);
    if (parsed.success) valid.push(parsed.data);
    else invalid.push(item);
  }
  if (invalid.length > 0) {
    console.warn(`[Sync] ${invalid.length} unreadable item(s) in ${file} are kept as-is`);
  }
  return { valid, invalid };
}

/** Reads a list field of a remote file; a file with an unexpected shape aborts the sync instead of being overwritten. */
export function requireListField(raw: unknown, field: string, file: string): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SyncError('invalidRemoteData', `Unexpected structure in remote file ${file}`);
  }
  const value = (raw as Record<string, unknown>)[field];
  return value === undefined ? [] : value;
}

/**
 * Appends unreadable raw items to a list that is about to be written back, skipping the
 * ones whose id is already present in the merged result.
 */
export function withPreservedItems<T extends { id: string }>(merged: T[], invalid: unknown[]): unknown[] {
  if (invalid.length === 0) return merged;
  const ids = new Set(merged.map((item) => item.id));
  const preserved = invalid.filter((item) => {
    const id = (item as { id?: unknown } | null)?.id;
    return typeof id !== 'string' || !ids.has(id);
  });
  return [...merged, ...preserved];
}
