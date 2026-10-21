/**
 * Pure helpers for multi-select state over a visible list (no React, no storage).
 * Used by the bookmark lists (string ids) and the tab center (numeric tab ids).
 */

/**
 * Keeps only the selected ids that are still visible.
 *
 * Returns the very same Set when nothing is dropped, so using it as a state updater
 * does not trigger a re-render when the selection is already a subset of the list.
 */
export function retainVisibleSelection<T>(
  selected: Set<T>,
  visibleIds: readonly T[],
): Set<T> {
  if (selected.size === 0) return selected;

  const visible = new Set(visibleIds);
  let dropped = false;
  const next = new Set<T>();
  for (const id of selected) {
    if (visible.has(id)) next.add(id);
    else dropped = true;
  }
  return dropped ? next : selected;
}

/**
 * "Select all" toggle over the visible ids: clears when every visible id is already
 * selected, otherwise selects exactly the visible ids.
 *
 * Comparing sizes is not enough: a selection of the same size taken from a different
 * (now hidden) list would be mistaken for "all selected".
 */
export function toggleAllVisible<T>(
  selected: Set<T>,
  visibleIds: readonly T[],
): Set<T> {
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  return allSelected ? new Set<T>() : new Set(visibleIds);
}
