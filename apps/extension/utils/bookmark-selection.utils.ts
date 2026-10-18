/**
 * Pure helpers for the bookmark multi-select state (no React, no storage).
 */

/**
 * Keeps only the selected ids that are still visible.
 *
 * Returns the very same Set when nothing is dropped, so using it as a state updater
 * does not trigger a re-render when the selection is already a subset of the list.
 */
export function retainVisibleSelection(
  selected: Set<string>,
  visibleIds: readonly string[],
): Set<string> {
  if (selected.size === 0) return selected;

  const visible = new Set(visibleIds);
  let dropped = false;
  const next = new Set<string>();
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
export function toggleAllVisible(
  selected: Set<string>,
  visibleIds: readonly string[],
): Set<string> {
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  return allSelected ? new Set() : new Set(visibleIds);
}
