/**
 * The value a number field commits for its draft: rounded and clamped to [min, max],
 * or the current value when the draft is empty or not a number, so clearing the field
 * to retype it never commits the minimum.
 */
export function resolveNumberDraft(
  draft: string,
  current: number,
  min: number,
  max: number,
): number {
  const trimmed = draft.trim();
  const parsed = trimmed === "" ? Number.NaN : Math.round(Number(trimmed));
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : current;
}
