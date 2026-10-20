import { describe, expect, it } from "vitest";
import {
  addUsageDay,
  countUsageDaysAfter,
  pruneUsageDays,
  toLocalDateKey,
} from "../usage-days.utils";
import {
  DAY_MS,
  HOUR_MS,
  estimateExpiryAt,
  evaluateIdle,
  getIdleState,
} from "../tab-idle.utils";

/** Local noon of a given day offset from 2026-03-02 (a Monday) */
function day(offset: number, hour = 12): number {
  return new Date(2026, 2, 2 + offset, hour, 0, 0).getTime();
}

function usageDaysFor(offsets: number[]): string[] {
  return offsets.map((offset) => toLocalDateKey(day(offset)));
}

const SEVEN_DAYS = { value: 7, unit: "day" } as const;

describe("usage days", () => {
  it("formats local dates and sorts chronologically", () => {
    expect(toLocalDateKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe("2026-01-05");
    expect(toLocalDateKey(new Date(2026, 0, 6, 0, 1).getTime())).toBe("2026-01-06");
    expect(["2026-02-01", "2026-01-31"].sort()).toEqual(["2026-01-31", "2026-02-01"]);
  });

  it("records a day once and keeps the same array when nothing changes", () => {
    const first = addUsageDay([], day(0));
    expect(first).toEqual([toLocalDateKey(day(0))]);
    expect(addUsageDay(first, day(0, 18))).toBe(first);
    expect(addUsageDay(first, day(1))).toEqual(usageDaysFor([0, 1]));
  });

  it("only keeps the last 120 days", () => {
    const days = usageDaysFor([0, 10, 130, 200]);
    expect(pruneUsageDays(days, day(200))).toEqual(usageDaysFor([130, 200]));
  });

  it("counts usage days strictly after the last active day", () => {
    const days = usageDaysFor([0, 1, 2, 5, 9]);
    expect(
      countUsageDaysAfter(days, toLocalDateKey(day(1)), toLocalDateKey(day(9))),
    ).toBe(3);
    expect(
      countUsageDaysAfter(days, toLocalDateKey(day(1)), toLocalDateKey(day(4))),
    ).toBe(1);
  });
});

describe("evaluateIdle", () => {
  it("expires after 7 calendar days of daily use", () => {
    const lastActiveAt = day(0);
    const result = evaluateIdle({
      lastActiveAt,
      now: day(7),
      threshold: SEVEN_DAYS,
      countBy: "usage-days",
      usageDays: usageDaysFor([0, 1, 2, 3, 4, 5, 6, 7]),
    });
    expect(result.usageDaysSince).toBe(7);
    expect(result.expired).toBe(true);
  });

  it("does not expire after a 10 day break without using the browser", () => {
    const result = evaluateIdle({
      lastActiveAt: day(0),
      // Back from vacation: only today counts as a usage day
      now: day(11),
      threshold: SEVEN_DAYS,
      countBy: "usage-days",
      usageDays: usageDaysFor([0, 11]),
    });
    expect(result.idleMs).toBeGreaterThan(10 * DAY_MS);
    expect(result.usageDaysSince).toBe(1);
    expect(result.expired).toBe(false);
    expect(result.expiring).toBe(false);
    expect(result.remainingUsageDays).toBe(6);
  });

  it("calendar mode only looks at wall clock time", () => {
    const result = evaluateIdle({
      lastActiveAt: day(0),
      now: day(11),
      threshold: SEVEN_DAYS,
      countBy: "calendar",
      usageDays: usageDaysFor([0, 11]),
    });
    expect(result.expired).toBe(true);
  });

  it("needs the natural duration as well as enough usage days", () => {
    // Used every day but only 6.5 days passed
    const result = evaluateIdle({
      lastActiveAt: day(0, 20),
      now: day(7, 8),
      threshold: SEVEN_DAYS,
      countBy: "usage-days",
      usageDays: usageDaysFor([0, 1, 2, 3, 4, 5, 6, 7]),
    });
    expect(result.usageDaysSince).toBe(7);
    expect(result.expired).toBe(false);
    expect(result.expiring).toBe(true);
  });

  it("marks a tab one usage day away as expiring", () => {
    const result = evaluateIdle({
      lastActiveAt: day(0),
      now: day(6, 13),
      threshold: SEVEN_DAYS,
      countBy: "usage-days",
      usageDays: usageDaysFor([0, 1, 2, 3, 4, 5, 6]),
    });
    expect(result.expired).toBe(false);
    expect(result.expiring).toBe(true);
    expect(getIdleState(result)).toBe("expiring");
  });

  it("with a 1-day threshold, only tabs idle for most of the day are archiving soon", () => {
    const threshold = { value: 1, unit: "day" } as const;
    for (const countBy of ["calendar", "usage-days"] as const) {
      const usedMinutesAgo = evaluateIdle({
        lastActiveAt: day(0, 12),
        now: day(0, 12) + 60_000,
        threshold,
        countBy,
        usageDays: usageDaysFor([0]),
      });
      expect(usedMinutesAgo.expiring).toBe(false);
      expect(getIdleState(usedMinutesAgo)).toBe("fresh");

      const almostADay = evaluateIdle({
        lastActiveAt: day(0, 12),
        now: day(1, 8),
        threshold,
        countBy,
        usageDays: usageDaysFor([0, 1]),
      });
      expect(almostADay.expiring).toBe(true);
    }
  });

  it("hour thresholds ignore usage days", () => {
    const threshold = { value: 12, unit: "hour" } as const;
    const lastActiveAt = day(0, 0);
    const soon = evaluateIdle({
      lastActiveAt,
      now: lastActiveAt + 10 * HOUR_MS,
      threshold,
      countBy: "usage-days",
      usageDays: [],
    });
    expect(soon.expired).toBe(false);
    expect(soon.expiring).toBe(true);

    const expired = evaluateIdle({
      lastActiveAt,
      now: lastActiveAt + 12 * HOUR_MS,
      threshold,
      countBy: "usage-days",
      usageDays: [],
    });
    expect(expired.expired).toBe(true);
  });

  it("treats a clock moved back as just used", () => {
    const result = evaluateIdle({
      lastActiveAt: day(5),
      now: day(1),
      threshold: SEVEN_DAYS,
      countBy: "calendar",
      usageDays: [],
    });
    expect(result.idleMs).toBe(0);
    expect(result.expired).toBe(false);
    expect(getIdleState(result)).toBe("fresh");
  });

  it("handles a daylight saving change without losing a day", () => {
    // 2026-03-29 is a DST switch in many European zones; keys stay one per local date
    const before = new Date(2026, 2, 28, 12).getTime();
    const after = new Date(2026, 2, 30, 12).getTime();
    const keys = [toLocalDateKey(before), "2026-03-29", toLocalDateKey(after)];
    expect(new Set(keys).size).toBe(3);
    expect(countUsageDaysAfter(keys, keys[0], keys[2])).toBe(2);
  });

  it("estimates the expiry moment from the remaining usage days", () => {
    const now = day(3);
    const evaluation = evaluateIdle({
      lastActiveAt: day(0),
      now,
      threshold: SEVEN_DAYS,
      countBy: "usage-days",
      usageDays: usageDaysFor([0, 1, 2, 3]),
    });
    expect(evaluation.remainingUsageDays).toBe(4);
    expect(estimateExpiryAt(evaluation, now)).toBe(now + 4 * DAY_MS);
  });
});
