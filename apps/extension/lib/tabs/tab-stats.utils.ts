/**
 * Local tab stats: daily peak and average open tabs, time over budget, and how many
 * tabs were archived, restored or moved through Read later. Counts only; nothing
 * here knows a title or URL. Kept on this device for 90 days.
 *
 * The average is time-weighted: every sample holds its open tab count until the
 * next one. A gap longer than one sweep period means the browser was not running,
 * so at most STATS_MAX_STEP_MS of it is counted.
 */
import type {
  TabDailyStats,
  TabLifecycleStats,
  TabOpenSample,
  TabStatsCounter,
  TabStatsDayPoint,
  TabWeeklyOverview,
} from "@/types";
import { toLocalDateKey } from "./usage-days.utils";

/** The sweep alarm samples every 30 minutes, plus some slack */
export const STATS_MAX_STEP_MS = 35 * 60 * 1000;
export const STATS_RETENTION_DAYS = 90;
const OVERVIEW_DAYS = 7;
const MINUTE_MS = 60 * 1000;

export const EMPTY_TAB_STATS: TabLifecycleStats = { days: {} };

export function createEmptyDay(date: string): TabDailyStats {
  return {
    date,
    peakOpen: 0,
    openTabMinutes: 0,
    sampledMinutes: 0,
    overBudgetMinutes: 0,
    autoArchived: 0,
    manualArchived: 0,
    restored: 0,
    readLaterAdded: 0,
    readLaterRead: 0,
    readLaterExpired: 0,
  };
}

function nextLocalMidnight(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(24, 0, 0, 0);
  return date.getTime();
}

/** Local date key `offset` days away from the day of `timestamp` (DST safe) */
export function shiftLocalDateKey(timestamp: number, offset: number): string {
  const date = new Date(timestamp);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return toLocalDateKey(date.getTime());
}

/** Fill in missing fields of a stored day (older or newer clients) */
function readDay(days: TabLifecycleStats["days"], key: string): TabDailyStats {
  return { ...createEmptyDay(key), ...days[key], date: key };
}

/** Add a new open tab count; the previous count is credited up to now */
export function recordOpenSample(
  stats: TabLifecycleStats,
  sample: TabOpenSample,
): TabLifecycleStats {
  const days = { ...stats.days };
  const previous = stats.lastSample;

  if (previous && sample.at > previous.at) {
    const end = Math.min(sample.at, previous.at + STATS_MAX_STEP_MS);
    let cursor = previous.at;
    // Split at midnight so every day gets its own share
    while (cursor < end) {
      const segmentEnd = Math.min(end, nextLocalMidnight(cursor));
      const minutes = (segmentEnd - cursor) / MINUTE_MS;
      const key = toLocalDateKey(cursor);
      const day = readDay(days, key);
      day.openTabMinutes += previous.open * minutes;
      day.sampledMinutes += minutes;
      if (previous.overBudget) day.overBudgetMinutes += minutes;
      days[key] = day;
      cursor = segmentEnd;
    }
  }

  const key = toLocalDateKey(sample.at);
  const today = readDay(days, key);
  today.peakOpen = Math.max(today.peakOpen, sample.open);
  days[key] = today;
  // An older sample (clock moved back) never replaces a newer one
  const lastSample = previous && previous.at > sample.at ? previous : sample;
  return { ...stats, days, lastSample };
}

/** Whether a new sample changes anything worth writing yet */
export function isSampleWorthWriting(
  stats: TabLifecycleStats,
  sample: TabOpenSample,
  minIntervalMs: number,
): boolean {
  const previous = stats.lastSample;
  if (!previous) return true;
  if (previous.open !== sample.open || previous.overBudget !== sample.overBudget) return true;
  if (toLocalDateKey(previous.at) !== toLocalDateKey(sample.at)) return true;
  return sample.at - previous.at >= minIntervalMs;
}

export function incrementStatsCounter(
  stats: TabLifecycleStats,
  counter: TabStatsCounter,
  delta: number,
  now: number,
): TabLifecycleStats {
  if (!Number.isFinite(delta) || delta <= 0) return stats;
  const key = toLocalDateKey(now);
  const day = readDay(stats.days, key);
  day[counter] += Math.round(delta);
  return { ...stats, days: { ...stats.days, [key]: day } };
}

export function pruneStats(
  stats: TabLifecycleStats,
  now: number,
  keepDays = STATS_RETENTION_DAYS,
): TabLifecycleStats {
  const cutoff = shiftLocalDateKey(now, -(keepDays - 1));
  const entries = Object.entries(stats.days).filter(([key]) => key >= cutoff);
  if (entries.length === Object.keys(stats.days).length) return stats;
  return { ...stats, days: Object.fromEntries(entries) };
}

export function normalizeTabStats(raw: unknown): TabLifecycleStats {
  if (!raw || typeof raw !== "object") return EMPTY_TAB_STATS;
  const value = raw as Partial<TabLifecycleStats>;
  const days =
    value.days && typeof value.days === "object" && !Array.isArray(value.days) ? value.days : {};
  const sample = value.lastSample;
  const lastSample =
    sample && Number.isFinite(sample.at) && Number.isFinite(sample.open)
      ? { at: sample.at, open: sample.open, overBudget: !!sample.overBudget }
      : undefined;
  return { days, lastSample };
}

function averageOf(days: readonly TabDailyStats[]): number | null {
  const minutes = days.reduce((sum, day) => sum + day.sampledMinutes, 0);
  if (minutes <= 0) return null;
  return days.reduce((sum, day) => sum + day.openTabMinutes, 0) / minutes;
}

function sumOf(days: readonly TabDailyStats[], field: keyof Omit<TabDailyStats, "date">): number {
  return days.reduce((sum, day) => sum + day[field], 0);
}

function hasData(day: TabDailyStats): boolean {
  return (
    day.sampledMinutes > 0 ||
    day.peakOpen > 0 ||
    day.autoArchived + day.manualArchived + day.restored > 0 ||
    day.readLaterAdded + day.readLaterRead + day.readLaterExpired > 0
  );
}

export function buildWeeklyOverview(
  stats: TabLifecycleStats,
  now: number,
  samplingEnabled: boolean,
): TabWeeklyOverview {
  const keys = (start: number) =>
    Array.from({ length: OVERVIEW_DAYS }, (_, index) =>
      shiftLocalDateKey(now, start + index),
    );
  const week = keys(-(OVERVIEW_DAYS - 1)).map((key) => readDay(stats.days, key));
  const previousWeek = keys(-(OVERVIEW_DAYS * 2 - 1)).map((key) => readDay(stats.days, key));

  const days: TabStatsDayPoint[] = week.map((day) => ({
    date: day.date,
    peakOpen: day.peakOpen,
    averageOpen: day.sampledMinutes > 0 ? day.openTabMinutes / day.sampledMinutes : null,
  }));

  return {
    days,
    averageOpen: averageOf(week),
    previousAverageOpen: averageOf(previousWeek),
    peakOpen: Math.max(0, ...week.map((day) => day.peakOpen)),
    overBudgetMinutes: sumOf(week, "overBudgetMinutes"),
    autoArchived: sumOf(week, "autoArchived"),
    manualArchived: sumOf(week, "manualArchived"),
    restored: sumOf(week, "restored"),
    readLaterAdded: sumOf(week, "readLaterAdded"),
    readLaterRead: sumOf(week, "readLaterRead"),
    readLaterExpired: sumOf(week, "readLaterExpired"),
    trackedDays: week.filter(hasData).length,
    samplingEnabled,
  };
}

/** Week over week change of the average, as a rounded percentage */
export function getAverageChangePercent(overview: TabWeeklyOverview): number | null {
  const { averageOpen, previousAverageOpen } = overview;
  if (averageOpen == null || previousAverageOpen == null || previousAverageOpen <= 0) return null;
  return Math.round(((averageOpen - previousAverageOpen) / previousAverageOpen) * 100);
}
