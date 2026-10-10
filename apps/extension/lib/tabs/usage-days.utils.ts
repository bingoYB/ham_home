/**
 * Usage days: local dates on which the user actually interacted with the browser
 * (activated a tab, focused a window or navigated in the foreground).
 *
 * Day-based idle thresholds count usage days instead of calendar days, so coming
 * back from a trip or a vacation never archives tabs just because time passed.
 */

/** How many recent days of usage are kept */
export const USAGE_DAY_RETENTION_DAYS = 120;

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local calendar date of a timestamp as YYYY-MM-DD (sorts chronologically) */
export function toLocalDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Oldest date key that is still kept for the given moment */
export function getUsageDayCutoffKey(
  now: number,
  retentionDays = USAGE_DAY_RETENTION_DAYS,
): string {
  return toLocalDateKey(now - (retentionDays - 1) * DAY_MS);
}

/** Sorted, de-duplicated usage days within the retention window */
export function pruneUsageDays(
  days: readonly string[],
  now: number,
  retentionDays = USAGE_DAY_RETENTION_DAYS,
): string[] {
  const cutoff = getUsageDayCutoffKey(now, retentionDays);
  return Array.from(new Set(days))
    .filter((day) => day >= cutoff)
    .sort();
}

/**
 * Record the usage day of `now`.
 * Returns the same array when the day is already recorded, so callers can skip writes.
 */
export function addUsageDay(
  days: readonly string[],
  now: number,
  retentionDays = USAGE_DAY_RETENTION_DAYS,
): string[] {
  const key = toLocalDateKey(now);
  if (days.includes(key) && days[0] >= getUsageDayCutoffKey(now, retentionDays)) {
    return days as string[];
  }
  return pruneUsageDays([...days, key], now, retentionDays);
}

/**
 * Number of usage days strictly after `afterKey` and up to `upToKey` (inclusive).
 * Used as "usage days since the tab was last used".
 */
export function countUsageDaysAfter(
  days: readonly string[],
  afterKey: string,
  upToKey: string,
): number {
  let count = 0;
  for (const day of days) {
    if (day > afterKey && day <= upToKey) count += 1;
  }
  return count;
}
