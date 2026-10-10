import { describe, expect, it } from "vitest";
import {
  NUDGE_COOLDOWN_MS,
  MAKE_ROOM_MIN_AGE_MS,
  MAKE_ROOM_MIN_IDLE_MS,
  clampBudgetLimit,
  computeBudgetStatus,
  formatBadgeCount,
  getBudgetLevel,
  getNudgeBlockReason,
  selectMakeRoomCandidates,
  type MakeRoomCandidate,
} from "../tab-budget.utils";
import { toLocalDateKey } from "../usage-days.utils";

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;

describe("budget counting", () => {
  it("sums all windows by default", () => {
    const status = computeBudgetStatus({
      enabled: true,
      limit: 15,
      scope: "all-windows",
      windows: [
        { windowId: 1, counted: 10, focused: false },
        { windowId: 2, counted: 8, focused: true },
      ],
    });
    expect(status).toMatchObject({ count: 18, over: 3, level: "over" });
  });

  it("uses the focused window in per-window mode", () => {
    const status = computeBudgetStatus({
      enabled: true,
      limit: 15,
      scope: "per-window",
      windows: [
        { windowId: 1, counted: 30, focused: false },
        { windowId: 2, counted: 12, focused: true },
      ],
    });
    expect(status).toMatchObject({ count: 12, over: 0, level: "warning", windowId: 2 });
  });

  it("falls back to the last focused window when the browser lost focus", () => {
    const status = computeBudgetStatus({
      enabled: true,
      limit: 15,
      scope: "per-window",
      windows: [
        { windowId: 1, counted: 30, focused: false },
        { windowId: 2, counted: 3, focused: false },
      ],
      lastFocusedWindowId: 2,
    });
    expect(status.count).toBe(3);
  });

  it("maps usage to badge levels", () => {
    expect(getBudgetLevel(11, 15)).toBe("normal");
    expect(getBudgetLevel(12, 15)).toBe("warning");
    expect(getBudgetLevel(15, 15)).toBe("warning");
    expect(getBudgetLevel(16, 15)).toBe("over");
    expect(computeBudgetStatus({ enabled: false, limit: 15, scope: "all-windows", windows: [] }).level).toBe("off");
  });

  it("formats badge text and clamps the limit", () => {
    expect(formatBadgeCount(7)).toBe("7");
    expect(formatBadgeCount(120)).toBe("99+");
    expect(clampBudgetLimit(2)).toBe(5);
    expect(clampBudgetLimit(500)).toBe(100);
    expect(clampBudgetLimit(Number.NaN)).toBe(15);
  });
});

describe("nudge throttling", () => {
  it("shows a nudge once per overage", () => {
    expect(getNudgeBlockReason({}, false, NOW)).toBeNull();
    expect(getNudgeBlockReason({}, true, NOW)).toBe("alreadyShown");
  });

  it("waits for the cooldown between overages", () => {
    expect(getNudgeBlockReason({ lastShownAt: NOW - NUDGE_COOLDOWN_MS + 1000 }, false, NOW)).toBe("cooldown");
    expect(getNudgeBlockReason({ lastShownAt: NOW - NUDGE_COOLDOWN_MS - 1000 }, false, NOW)).toBeNull();
  });

  it("respects 'not today' and snoozing", () => {
    expect(getNudgeBlockReason({ dismissedDate: toLocalDateKey(NOW) }, false, NOW)).toBe("dismissedToday");
    expect(getNudgeBlockReason({ dismissedDate: "2000-01-01" }, false, NOW)).toBeNull();
    expect(getNudgeBlockReason({ snoozedUntil: NOW + 1000 }, false, NOW)).toBe("snoozed");
  });
});

describe("selectMakeRoomCandidates", () => {
  const tab = (patch: Partial<MakeRoomCandidate> & Pick<MakeRoomCandidate, "tabId">): MakeRoomCandidate => ({
    url: `https://site${patch.tabId}.example.com/page`,
    lastActiveAt: NOW - 5 * HOUR,
    firstSeenAt: NOW - 24 * HOUR,
    protection: [],
    ...patch,
  });

  it("archives exactly the overage, least recently used first", () => {
    const tabs = [
      tab({ tabId: 1, lastActiveAt: NOW - 2 * HOUR }),
      tab({ tabId: 2, lastActiveAt: NOW - 9 * HOUR }),
      tab({ tabId: 3, lastActiveAt: NOW - 4 * HOUR }),
    ];
    expect(selectMakeRoomCandidates(tabs, 2, NOW)).toEqual([2, 3]);
    expect(selectMakeRoomCandidates(tabs, 0, NOW)).toEqual([]);
  });

  it("skips protected, recently used, freshly opened and bulk opened tabs", () => {
    const tabs = [
      tab({ tabId: 1, protection: ["pinned"] }),
      tab({ tabId: 2, lastActiveAt: NOW - MAKE_ROOM_MIN_IDLE_MS + 1000 }),
      tab({ tabId: 3, firstSeenAt: NOW - MAKE_ROOM_MIN_AGE_MS + 1000 }),
      tab({ tabId: 4, bulkOpened: true }),
      tab({ tabId: 5 }),
    ];
    expect(selectMakeRoomCandidates(tabs, 3, NOW)).toEqual([5]);
  });

  it("returns nothing when no tab qualifies", () => {
    expect(selectMakeRoomCandidates([tab({ tabId: 1, protection: ["active"] })], 1, NOW)).toEqual([]);
  });

  it("never closes pages the archive could not open again", () => {
    const tabs = [
      tab({ tabId: 1, url: "file:///Users/me/paper.pdf", lastActiveAt: NOW - 30 * HOUR }),
      tab({ tabId: 2, url: "about:preferences", lastActiveAt: NOW - 20 * HOUR }),
      tab({ tabId: 3 }),
    ];
    expect(selectMakeRoomCandidates(tabs, 3, NOW)).toEqual([3]);
  });
});
