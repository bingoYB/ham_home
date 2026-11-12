import { mergeByIdLww } from './lww-merge';

interface SyncCategory {
  id: string;
  name: string;
  parentId: string | null;
  icon?: string;
  order: number;
  createdAt: number;
  updatedAt?: number;
}

const stamp = (category: SyncCategory) => category.updatedAt ?? category.createdAt;
const sameCategory = (a: SyncCategory, b: SyncCategory) =>
  a.name === b.name && a.parentId === b.parentId &&
  (a.icon ?? '') === (b.icon ?? '') && a.order === b.order;

/** Merge aliases from parents to children, then use the same normalized result on both sides. */
export function mergeCategoryHierarchy<T extends SyncCategory>(
  local: readonly T[],
  remote: readonly T[],
  now: number,
): { merged: T[]; applyToLocal: T[]; mapping: Record<string, string>; changed: boolean } {
  const { merged: shared, localOnly } = mergeByIdLww(local, remote, stamp, sameCategory);
  const aliases = new Map<string, string>();
  const pending = new Set(localOnly.map((category) => category.id));
  const canonicalParent = (parentId: string | null) =>
    parentId === null ? null : aliases.get(parentId) ?? parentId;

  // The input need not be ordered: never compare a child until its local parent is resolved.
  while (pending.size > 0) {
    let progressed = false;
    for (const category of localOnly) {
      if (!pending.has(category.id) || (category.parentId && pending.has(category.parentId))) continue;
      const parentId = canonicalParent(category.parentId);
      const match = shared.find((candidate) =>
        candidate.name === category.name && canonicalParent(candidate.parentId) === parentId,
      );
      if (match) aliases.set(category.id, match.id);
      pending.delete(category.id);
      progressed = true;
    }
    // Existing cycles are preserved for explicit repair, rather than hanging or deleting data.
    if (!progressed) break;
  }

  const merged = [...shared, ...localOnly.filter((category) => !aliases.has(category.id))]
    .map((category) => {
      const parentId = canonicalParent(category.parentId);
      return parentId === category.parentId ? category : { ...category, parentId, updatedAt: now };
    });
  const localById = new Map(local.map((category) => [category.id, category]));
  const remoteById = new Map(remote.map((category) => [category.id, category]));
  const differs = (category: T, other?: T) =>
    !other || !sameCategory(category, other) || stamp(category) !== stamp(other);

  return {
    merged,
    applyToLocal: merged.filter((category) => differs(category, localById.get(category.id))),
    mapping: Object.fromEntries(aliases),
    changed: merged.length !== remote.length || merged.some((category) => differs(category, remoteById.get(category.id))),
  };
}
