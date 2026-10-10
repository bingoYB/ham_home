/**
 * Tab budget: counting, badge appearance, nudge throttling and auto make room.
 *
 * Pinned tabs never count. The budget only nudges by default and never blocks
 * opening a tab; making room automatically is opt-in and only touches tabs that
 * are unprotected, idle for an hour and not freshly opened.
 */
import type {
  TabBudgetLevel,
  TabBudgetScope,
  TabBudgetStatus,
  TabProtectionReason,
} from "@/types";
import { canReopenUrl } from "./tab-archive.utils";
import { toLocalDateKey } from "./usage-days.utils";

export const BUDGET_LIMIT_MIN = 5;
export const BUDGET_LIMIT_MAX = 100;
export const DEFAULT_BUDGET_LIMIT = 15;

/** Same overage is nudged once; a new overage waits for this cooldown */
export const NUDGE_COOLDOWN_MS = 15 * 60 * 1000;
/** A nudge waits until the page finished loading and stayed this long */
export const NUDGE_DWELL_MS = 3000;
/** Tabs opened by HamHome in bulk do not trigger budget actions for this long */
export const BULK_OPEN_SUPPRESSION_MS = 2 * 60 * 1000;
/** Auto make room only archives tabs idle for at least this long */
export const MAKE_ROOM_MIN_IDLE_MS = 60 * 60 * 1000;
/** ...and not opened within this window */
export const MAKE_ROOM_MIN_AGE_MS = 10 * 60 * 1000;

export const BADGE_COLORS: Record<Exclude<TabBudgetLevel, "off">, string> = {
  normal: "#6B7280",
  warning: "#D97706",
  over: "#DC2626",
};

export function clampBudgetLimit(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_BUDGET_LIMIT;
  return Math.min(BUDGET_LIMIT_MAX, Math.max(BUDGET_LIMIT_MIN, Math.round(limit)));
}

/** Below 80% neutral, 80%–100% warning, above the limit over */
export function getBudgetLevel(count: number, limit: number): Exclude<TabBudgetLevel, "off"> {
  if (count > limit) return "over";
  if (count >= Math.ceil(limit * 0.8)) return "warning";
  return "normal";
}

export function formatBadgeCount(count: number): string {
  if (count <= 0) return "0";
  return count > 99 ? "99+" : String(count);
}

export interface BudgetWindowCount {
  windowId: number;
  /** Non-pinned tabs in the window */
  counted: number;
  focused: boolean;
}

export function computeBudgetStatus(input: {
  enabled: boolean;
  limit: number;
  scope: TabBudgetScope;
  windows: readonly BudgetWindowCount[];
  /** Window used in per-window mode when none is focused */
  lastFocusedWindowId?: number;
}): TabBudgetStatus {
  const limit = clampBudgetLimit(input.limit);
  let count: number;
  let windowId: number | undefined;

  if (input.scope === "per-window") {
    const target =
      input.windows.find((window) => window.focused) ??
      input.windows.find((window) => window.windowId === input.lastFocusedWindowId) ??
      input.windows[0];
    count = target?.counted ?? 0;
    windowId = target?.windowId;
  } else {
    count = input.windows.reduce((sum, window) => sum + window.counted, 0);
  }

  return {
    enabled: input.enabled,
    limit,
    scope: input.scope,
    count,
    over: Math.max(0, count - limit),
    level: input.enabled ? getBudgetLevel(count, limit) : "off",
    windowId,
  };
}

export interface BudgetNudgeState {
  lastShownAt?: number;
  dismissedDate?: string;
  snoozedUntil?: number;
}

export type NudgeBlockReason = "cooldown" | "dismissedToday" | "snoozed" | "alreadyShown";

/** Why a nudge may not be shown now, or null when it may */
export function getNudgeBlockReason(
  state: BudgetNudgeState,
  episodeNudged: boolean,
  now: number,
): NudgeBlockReason | null {
  if (episodeNudged) return "alreadyShown";
  if (state.dismissedDate === toLocalDateKey(now)) return "dismissedToday";
  if (state.snoozedUntil != null && state.snoozedUntil > now) return "snoozed";
  if (state.lastShownAt != null && now - state.lastShownAt < NUDGE_COOLDOWN_MS) {
    return "cooldown";
  }
  return null;
}

export interface MakeRoomCandidate {
  tabId: number;
  url: string;
  lastActiveAt: number;
  firstSeenAt: number;
  protection: readonly TabProtectionReason[];
  bulkOpened?: boolean;
}

/**
 * Least recently used, unprotected web pages to archive so the count drops to the
 * limit. Returns at most `over` tab IDs, oldest first; may return fewer (or none).
 */
export function selectMakeRoomCandidates(
  tabs: readonly MakeRoomCandidate[],
  over: number,
  now: number,
): number[] {
  if (over <= 0) return [];
  return tabs
    .filter(
      (tab) =>
        tab.protection.length === 0 &&
        canReopenUrl(tab.url) &&
        !tab.bulkOpened &&
        now - tab.lastActiveAt >= MAKE_ROOM_MIN_IDLE_MS &&
        now - tab.firstSeenAt >= MAKE_ROOM_MIN_AGE_MS,
    )
    .sort((a, b) => a.lastActiveAt - b.lastActiveAt || a.tabId - b.tabId)
    .slice(0, over)
    .map((tab) => tab.tabId);
}
