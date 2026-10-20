import { describe, expect, it } from "vitest";
import {
  EMPTY_TAB_STATS,
  STATS_MAX_STEP_MS,
  buildWeeklyOverview,
  getAverageChangePercent,
  incrementStatsCounter,
  isSampleWorthWriting,
  normalizeTabStats,
  pruneStats,
  recordOpenSample,
  shiftLocalDateKey,
} from "../tab-stats.utils";
import { toLocalDateKey } from "../usage-days.utils";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** Local noon, so a few hours either way stay on the same day */
const NOON = new Date(2026, 8, 16, 12, 0, 0).getTime();
const TODAY = toLocalDateKey(NOON);

describe("recordOpenSample", () => {
  it("credits the previous count for the time it held", () => {
    let stats = recordOpenSample(EMPTY_TAB_STATS, { at: NOON, open: 10, overBudget: false });
    stats = recordOpenSample(stats, { at: NOON + 20 * MINUTE, open: 30, overBudget: true });
    stats = recordOpenSample(stats, { at: NOON + 30 * MINUTE, open: 20, overBudget: false });

    const day = stats.days[TODAY];
    expect(day.peakOpen).toBe(30);
    expect(day.sampledMinutes).toBe(30);
    // 10 tabs × 20 min + 30 tabs × 10 min
    expect(day.openTabMinutes).toBe(500);
    expect(day.overBudgetMinutes).toBe(10);
    expect(stats.lastSample).toEqual({ at: NOON + 30 * MINUTE, open: 20, overBudget: false });
  });

  it("counts at most one sweep period across a gap (browser closed)", () => {
    let stats = recordOpenSample(EMPTY_TAB_STATS, { at: NOON - 5 * HOUR, open: 8, overBudget: false });
    stats = recordOpenSample(stats, { at: NOON, open: 8, overBudget: false });
    expect(stats.days[TODAY].sampledMinutes).toBe(STATS_MAX_STEP_MS / MINUTE);
  });

  it("splits time at midnight", () => {
    const midnight = new Date(2026, 8, 17, 0, 0, 0).getTime();
    let stats = recordOpenSample(EMPTY_TAB_STATS, { at: midnight - 10 * MINUTE, open: 6, overBudget: false });
    stats = recordOpenSample(stats, { at: midnight + 20 * MINUTE, open: 6, overBudget: false });
    expect(stats.days[toLocalDateKey(midnight - MINUTE)].sampledMinutes).toBe(10);
    expect(stats.days[toLocalDateKey(midnight)].sampledMinutes).toBe(20);
  });

  it("never lets a sample from the past replace a newer one", () => {
    let stats = recordOpenSample(EMPTY_TAB_STATS, { at: NOON, open: 5, overBudget: false });
    stats = recordOpenSample(stats, { at: NOON - HOUR, open: 9, overBudget: false });
    expect(stats.lastSample?.at).toBe(NOON);
    expect(stats.days[TODAY].sampledMinutes).toBe(0);
  });
});

describe("isSampleWorthWriting", () => {
  const stats = recordOpenSample(EMPTY_TAB_STATS, { at: NOON, open: 5, overBudget: false });

  it("skips unchanged counts until the interval passed", () => {
    expect(isSampleWorthWriting(stats, { at: NOON + MINUTE, open: 5, overBudget: false }, 10 * MINUTE)).toBe(false);
    expect(isSampleWorthWriting(stats, { at: NOON + 10 * MINUTE, open: 5, overBudget: false }, 10 * MINUTE)).toBe(true);
  });

  it("writes every change", () => {
    expect(isSampleWorthWriting(stats, { at: NOON + MINUTE, open: 6, overBudget: false }, 10 * MINUTE)).toBe(true);
    expect(isSampleWorthWriting(stats, { at: NOON + MINUTE, open: 5, overBudget: true }, 10 * MINUTE)).toBe(true);
    expect(isSampleWorthWriting(EMPTY_TAB_STATS, { at: NOON, open: 0, overBudget: false }, 10 * MINUTE)).toBe(true);
  });
});

describe("counters and retention", () => {
  it("adds whole positive counts to today", () => {
    let stats = incrementStatsCounter(EMPTY_TAB_STATS, "autoArchived", 3, NOON);
    stats = incrementStatsCounter(stats, "autoArchived", 2, NOON);
    expect(stats.days[TODAY].autoArchived).toBe(5);
    expect(incrementStatsCounter(stats, "restored", 0, NOON)).toBe(stats);
    expect(incrementStatsCounter(stats, "restored", Number.NaN, NOON)).toBe(stats);
  });

  it("keeps 90 days", () => {
    let stats = incrementStatsCounter(EMPTY_TAB_STATS, "restored", 1, NOON - 89 * DAY);
    stats = incrementStatsCounter(stats, "restored", 1, NOON - 90 * DAY);
    const pruned = pruneStats(stats, NOON);
    expect(Object.keys(pruned.days)).toEqual([shiftLocalDateKey(NOON, -89)]);
    expect(pruneStats(pruned, NOON)).toBe(pruned);
  });

  it("reads damaged or partial stored data safely", () => {
    expect(normalizeTabStats(null)).toEqual(EMPTY_TAB_STATS);
    expect(normalizeTabStats({ days: [], lastSample: { at: "x" } })).toEqual({ days: {}, lastSample: undefined });
    // Days written by a client with fewer fields still add up
    const stats = incrementStatsCounter(
      normalizeTabStats({ days: { [TODAY]: { date: TODAY, restored: 2 } } }),
      "restored",
      1,
      NOON,
    );
    expect(stats.days[TODAY]).toMatchObject({ restored: 3, autoArchived: 0 });
  });
});

describe("buildWeeklyOverview", () => {
  it("summarizes the last 7 days against the week before", () => {
    let stats = EMPTY_TAB_STATS;
    // Last week: 40 tabs for an hour
    stats = recordOpenSample(stats, { at: NOON - 8 * DAY, open: 40, overBudget: true });
    stats = recordOpenSample(stats, { at: NOON - 8 * DAY + 30 * MINUTE, open: 40, overBudget: true });
    stats = recordOpenSample(stats, { at: NOON - 8 * DAY + HOUR, open: 40, overBudget: true });
    // This week: 20 tabs for an hour, two days ago
    stats = recordOpenSample(stats, { at: NOON - 2 * DAY, open: 20, overBudget: false });
    stats = recordOpenSample(stats, { at: NOON - 2 * DAY + 30 * MINUTE, open: 20, overBudget: false });
    stats = recordOpenSample(stats, { at: NOON - 2 * DAY + HOUR, open: 20, overBudget: false });
    stats = incrementStatsCounter(stats, "autoArchived", 4, NOON);
    stats = incrementStatsCounter(stats, "readLaterAdded", 3, NOON - DAY);
    stats = incrementStatsCounter(stats, "readLaterRead", 1, NOON);

    const overview = buildWeeklyOverview(stats, NOON, true);
    expect(overview.days).toHaveLength(7);
    expect(overview.days[6].date).toBe(TODAY);
    expect(overview.days[4]).toMatchObject({ peakOpen: 20, averageOpen: 20 });
    expect(overview.days[0].averageOpen).toBeNull();
    expect(overview).toMatchObject({
      averageOpen: 20,
      previousAverageOpen: 40,
      peakOpen: 20,
      overBudgetMinutes: 0,
      autoArchived: 4,
      readLaterAdded: 3,
      readLaterRead: 1,
      trackedDays: 3,
      samplingEnabled: true,
    });
    expect(getAverageChangePercent(overview)).toBe(-50);
  });

  it("has no change figure without two weeks of samples", () => {
    const overview = buildWeeklyOverview(EMPTY_TAB_STATS, NOON, false);
    expect(overview.averageOpen).toBeNull();
    expect(overview.trackedDays).toBe(0);
    expect(getAverageChangePercent(overview)).toBeNull();
  });
});
