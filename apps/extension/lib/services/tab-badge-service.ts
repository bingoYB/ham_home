/**
 * Toolbar badge: tab count (budget on, or "show count" on), a dot while archive
 * confirmations wait in confirm mode, and a short flash as feedback on pages where
 * no in-page toast can be shown. Updates are debounced by 300ms.
 */
import { browser } from "wxt/browser";
import { configStorage } from "@/lib/storage/config-storage";
import { tabLifecycleConfigStorage } from "@/lib/storage/tab-lifecycle-config-storage";
import { tabSessionStorage } from "@/lib/storage/tab-session-storage";
import {
  BADGE_COLORS,
  computeBudgetStatus,
  formatBadgeCount,
} from "@/lib/tabs/tab-budget.utils";
import { shouldShowBadgeCount } from "@/lib/tabs/tab-lifecycle-settings.utils";
import type { TabBudgetStatus } from "@/types";

const BADGE_DEBOUNCE_MS = 300;
const FLASH_MS = 2500;
const PENDING_COLOR = "#D97706";

interface ActionApi {
  setBadgeText(details: { text: string }): Promise<void> | void;
  setBadgeBackgroundColor(details: { color: string }): Promise<void> | void;
  setBadgeTextColor?(details: { color: string }): Promise<void> | void;
  setTitle(details: { title: string }): Promise<void> | void;
}

function getActionApi(): ActionApi | null {
  const api = (browser as unknown as { action?: ActionApi; browserAction?: ActionApi });
  return api.action ?? api.browserAction ?? null;
}

const TITLES = {
  zh: {
    base: "HamHome",
    count: (count: number) => `HamHome · 打开了 ${count} 个标签页`,
    budget: (count: number, limit: number) =>
      count > limit
        ? `HamHome · 标签页 ${count}/${limit}，超出预算 ${count - limit} 个`
        : `HamHome · 标签页 ${count}/${limit}`,
    pending: (count: number) => `HamHome · ${count} 个标签页等待确认归档`,
  },
  en: {
    base: "HamHome",
    count: (count: number) => `HamHome · ${count} tabs open`,
    budget: (count: number, limit: number) =>
      count > limit
        ? `HamHome · ${count}/${limit} tabs, ${count - limit} over budget`
        : `HamHome · ${count}/${limit} tabs`,
    pending: (count: number) => `HamHome · ${count} tabs waiting to be archived`,
  },
} as const;

/** Count non-pinned tabs per normal window; one tabs.query call */
export async function countBudgetTabs(): Promise<{
  windows: Array<{ windowId: number; counted: number; focused: boolean }>;
}> {
  const [tabs, focusedWindowId, lastFocusedWindowId] = await Promise.all([
    browser.tabs.query({ windowType: "normal" }),
    tabSessionStorage.getFocusedWindow(),
    tabSessionStorage.getLastFocusedWindow(),
  ]);
  const counts = new Map<number, number>();
  for (const tab of tabs) {
    if (tab.incognito || tab.windowId == null) continue;
    if (!counts.has(tab.windowId)) counts.set(tab.windowId, 0);
    if (!tab.pinned) counts.set(tab.windowId, (counts.get(tab.windowId) ?? 0) + 1);
  }
  const focused = focusedWindowId ?? lastFocusedWindowId;
  return {
    windows: Array.from(counts, ([windowId, counted]) => ({
      windowId,
      counted,
      focused: windowId === focused,
    })),
  };
}

class TabBadgeService {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flashUntil = 0;

  /** Debounced refresh, so opening or closing many tabs at once does not flicker */
  scheduleRefresh(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.refresh().catch((error) => {
        console.warn("[TabBadge] refresh failed:", error);
      });
    }, BADGE_DEBOUNCE_MS);
  }

  async getBudgetStatus(): Promise<TabBudgetStatus> {
    const [settings, counts] = await Promise.all([
      tabLifecycleConfigStorage.getSettings(),
      countBudgetTabs(),
    ]);
    return computeBudgetStatus({
      enabled: settings.budget.enabled,
      limit: settings.budget.limit,
      scope: settings.budget.scope,
      windows: counts.windows,
      lastFocusedWindowId: (await tabSessionStorage.getLastFocusedWindow()) ?? undefined,
    });
  }

  async refresh(): Promise<void> {
    const api = getActionApi();
    if (!api || Date.now() < this.flashUntil) return;

    const [settings, appSettings, pending] = await Promise.all([
      tabLifecycleConfigStorage.getSettings(),
      configStorage.getSettings(),
      tabSessionStorage.getPendingConfirm(),
    ]);
    const titles = TITLES[appSettings.language === "en" ? "en" : "zh"];

    let text = "";
    let color: string = BADGE_COLORS.normal;
    let title: string = titles.base;

    if (shouldShowBadgeCount(settings)) {
      const status = await this.getBudgetStatus();
      text = formatBadgeCount(status.count);
      color = settings.budget.enabled
        ? BADGE_COLORS[status.level === "off" ? "normal" : status.level]
        : BADGE_COLORS.normal;
      title = settings.budget.enabled
        ? titles.budget(status.count, status.limit)
        : titles.count(status.count);
      if (pending.length > 0) title = `${title} · ${titles.pending(pending.length)}`;
    } else if (pending.length > 0) {
      text = "•";
      color = PENDING_COLOR;
      title = titles.pending(pending.length);
    }

    await Promise.all([
      api.setBadgeText({ text }),
      api.setBadgeBackgroundColor({ color }),
      api.setBadgeTextColor?.({ color: "#FFFFFF" }),
      api.setTitle({ title }),
    ]);
  }

  /** Brief confirmation on the icon when the page cannot show a toast */
  async flash(text = "✓", color = "#16A34A"): Promise<void> {
    const api = getActionApi();
    if (!api) return;
    this.flashUntil = Date.now() + FLASH_MS;
    await Promise.all([
      api.setBadgeText({ text }),
      api.setBadgeBackgroundColor({ color }),
    ]);
    setTimeout(() => {
      this.flashUntil = 0;
      void this.refresh().catch(() => undefined);
    }, FLASH_MS);
  }
}

export const tabBadgeService = new TabBadgeService();
