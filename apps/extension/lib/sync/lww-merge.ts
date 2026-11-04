/**
 * Last-Write-Wins merge by id (pure).
 *
 * Categories and workspace categories used to keep the remote version whenever both sides
 * had an item, without writing it locally: local renames and reordering never left the
 * device and the two sides drifted apart. Timestamps now decide:
 * - local newer: local wins and is uploaded;
 * - remote newer: remote wins and is written locally;
 * - same timestamp but different content (older data without updatedAt): remote wins and
 *   is written locally, so every device converges on the same result.
 */
export interface LwwMergeResult<T> {
  merged: T[];
  /** Remote versions to write locally (remote won, or exists only remotely). */
  applyToLocal: T[];
  /** Items that exist only locally (callers may fold same-name duplicates before uploading). */
  localOnly: T[];
  /** The merged result differs from the remote file and must be written back. */
  remoteChanged: boolean;
}

export function mergeByIdLww<T extends { id: string }>(
  local: readonly T[],
  remote: readonly T[],
  stamp: (item: T) => number,
  isEqual: (a: T, b: T) => boolean,
): LwwMergeResult<T> {
  const remoteMap = new Map(remote.map((item) => [item.id, item]));
  const localIds = new Set(local.map((item) => item.id));
  const merged: T[] = [];
  const applyToLocal: T[] = [];
  const localOnly: T[] = [];
  let remoteChanged = false;

  for (const item of local) {
    const other = remoteMap.get(item.id);
    if (!other) {
      localOnly.push(item);
      continue;
    }
    if (stamp(item) > stamp(other)) {
      merged.push(item);
      remoteChanged = true;
      continue;
    }
    merged.push(other);
    if (stamp(item) < stamp(other) || !isEqual(item, other)) {
      applyToLocal.push(other);
    }
  }

  for (const other of remote) {
    if (localIds.has(other.id)) continue;
    merged.push(other);
    applyToLocal.push(other);
  }

  return { merged, applyToLocal, localOnly, remoteChanged };
}

export interface TombstoneLike {
  id: string;
  deletedAt: number;
}

/**
 * Filters one side's items with deletion records.
 *
 * An item edited after the deletion (timestamp later than deletedAt) is revived: it is kept
 * and the deletion record is cancelled.
 */
export function applyDeletions<T extends { id: string }>(
  items: readonly T[],
  deletions: ReadonlyMap<string, number>,
  stamp: (item: T) => number,
): { kept: T[]; deleted: T[]; revivedIds: string[] } {
  const kept: T[] = [];
  const deleted: T[] = [];
  const revivedIds: string[] = [];
  for (const item of items) {
    const deletedAt = deletions.get(item.id);
    if (deletedAt === undefined) {
      kept.push(item);
    } else if (stamp(item) > deletedAt) {
      kept.push(item);
      revivedIds.push(item.id);
    } else {
      deleted.push(item);
    }
  }
  return { kept, deleted, revivedIds };
}
