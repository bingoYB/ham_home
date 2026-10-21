/**
 * Background wiring for the tab lifecycle features: tab / window listeners, alarms
 * and content script signals. Must be called synchronously when the background
 * starts, so MV3 delivers the events that woke the service worker.
 */
import { browser } from "wxt/browser";
import { tabLifecycleConfigStorage } from "@/lib/storage/tab-lifecycle-config-storage";
import { tabSessionStorage } from "@/lib/storage/tab-session-storage";
import { TAB_BUSY_TTL_MS, TAB_MESSAGES } from "@/lib/tabs/tab-messages";
import { ensurePeriodicAlarm } from "@/utils/browser-api";
import { readLaterService } from "./read-later-service";
import { tabActivityService } from "./tab-activity-service";
import { tabArchiveService } from "./tab-archive-service";
import { tabBadgeService } from "./tab-badge-service";
import { tabBudgetService } from "./tab-budget-service";
import { tabLifecycleService } from "./tab-lifecycle-service";
import { tabStatsService } from "./tab-stats-service";

export const TAB_LIFECYCLE_SWEEP_ALARM = "tab-lifecycle-sweep";
export const TAB_ARCHIVE_RETENTION_ALARM = "tab-archive-retention";
export const READ_LATER_EXPIRY_ALARM = "read-later-expiry";

const SWEEP_PERIOD_MINUTES = 30;
const DAILY_MINUTES = 24 * 60;
const BUDGET_DEBOUNCE_MS = 400;
const DAILY_TASKS_SESSION_KEY = "tl.dailyTasksRan";

const STATS_DEBOUNCE_MS = 2000;

let budgetTimer: ReturnType<typeof setTimeout> | null = null;
let budgetGrew = false;
let statsTimer: ReturnType<typeof setTimeout> | null = null;

/** Open tab counts for the local stats, after bursts settle */
function scheduleStatsSample(): void {
  if (statsTimer) clearTimeout(statsTimer);
  statsTimer = setTimeout(() => {
    statsTimer = null;
    run(() => tabStatsService.sample(), "stats sample");
  }, STATS_DEBOUNCE_MS);
}

/** Coalesce bursts (session restore, closing a window) into one budget check */
function scheduleBudgetCheck(grew: boolean): void {
  budgetGrew = budgetGrew || grew;
  tabBadgeService.scheduleRefresh();
  scheduleStatsSample();
  if (budgetTimer) clearTimeout(budgetTimer);
  budgetTimer = setTimeout(() => {
    const grewNow = budgetGrew;
    budgetTimer = null;
    budgetGrew = false;
    void tabBudgetService.evaluate(grewNow).catch((error) => {
      console.warn("[TabLifecycle] budget check failed:", error);
    });
  }, BUDGET_DEBOUNCE_MS);
}

function run(task: () => Promise<unknown>, label: string): void {
  void task().catch((error) => {
    console.warn(`[TabLifecycle] ${label} failed:`, error);
  });
}

async function runDailyTasks(): Promise<void> {
  const [retired, expired] = await Promise.all([
    tabArchiveService.runRetention(),
    readLaterService.runExpiry(),
  ]);
  if (retired > 0 || expired > 0) {
    console.log(
      `[TabLifecycle] archive retention removed ${retired}, read later expired ${expired}`,
    );
  }
}

/** Once per browser session: alarms do not catch up while the device was off */
async function runDailyTasksOncePerSession(): Promise<void> {
  if (await tabSessionStorage.get<boolean>(DAILY_TASKS_SESSION_KEY, false)) return;
  await tabSessionStorage.set(DAILY_TASKS_SESSION_KEY, true);
  await runDailyTasks();
}

export function registerTabLifecycleBackground(): void {
  run(() => tabActivityService.initialize(), "activity init");
  run(() => tabLifecycleService.syncAutoArchiveActivation(), "auto archive state");
  run(runDailyTasksOncePerSession, "daily tasks");
  tabBadgeService.scheduleRefresh();
  scheduleStatsSample();

  run(() => ensurePeriodicAlarm(TAB_LIFECYCLE_SWEEP_ALARM, SWEEP_PERIOD_MINUTES), "sweep alarm");
  run(() => ensurePeriodicAlarm(TAB_ARCHIVE_RETENTION_ALARM, DAILY_MINUTES), "retention alarm");
  run(() => ensurePeriodicAlarm(READ_LATER_EXPIRY_ALARM, DAILY_MINUTES), "expiry alarm");

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === TAB_LIFECYCLE_SWEEP_ALARM) {
      run(() => tabLifecycleService.runSweep(), "sweep");
      // Keeps the time-weighted average going while nothing changes
      scheduleStatsSample();
    } else if (alarm.name === TAB_ARCHIVE_RETENTION_ALARM) {
      run(() => tabArchiveService.runRetention(), "archive retention");
    } else if (alarm.name === READ_LATER_EXPIRY_ALARM) {
      run(() => readLaterService.runExpiry(), "read later expiry");
    }
  });

  browser.runtime.onStartup.addListener(() => {
    run(() => tabActivityService.initialize(), "activity init");
  });

  browser.tabs.onCreated.addListener((tab) => {
    run(() => tabActivityService.handleCreated(tab), "tab created");
    scheduleBudgetCheck(true);
  });

  browser.tabs.onActivated.addListener((info) => {
    run(() => tabActivityService.handleActivated(info), "tab activated");
    run(() => tabBudgetService.onPageReady(), "nudge retry");
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    run(() => tabActivityService.handleUpdated(tabId, changeInfo, tab), "tab updated");
    if (changeInfo.pinned !== undefined) scheduleBudgetCheck(!changeInfo.pinned);
    if (changeInfo.status === "complete") {
      run(() => readLaterService.handleTabComplete(tabId), "read later enrichment");
      if (tab.active) run(() => tabBudgetService.onPageReady(), "nudge retry");
    }
  });

  browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    run(() => tabActivityService.handleRemoved(tabId, removeInfo), "tab removed");
    run(() => tabSessionStorage.setBusy(tabId, false, 0), "busy cleanup");
    run(() => readLaterService.endReadingSession(tabId), "reading cleanup");
    scheduleBudgetCheck(false);
  });

  browser.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
    run(() => tabActivityService.handleReplaced(addedTabId, removedTabId), "tab replaced");
  });

  browser.tabs.onAttached.addListener((tabId, attachInfo) => {
    run(() => tabActivityService.handleAttached(tabId, attachInfo), "tab attached");
    scheduleBudgetCheck(true);
  });

  browser.tabs.onDetached.addListener(() => {
    tabBadgeService.scheduleRefresh();
  });

  browser.windows.onFocusChanged.addListener((windowId) => {
    run(() => tabActivityService.handleWindowFocusChanged(windowId), "window focus");
    tabBadgeService.scheduleRefresh();
    // Per-window budgets count the focused window
    scheduleStatsSample();
  });

  browser.windows.onRemoved.addListener((windowId) => {
    tabActivityService.forgetWindow(windowId);
  });

  browser.runtime.onMessage.addListener((message, sender) => {
    const tabId = sender.tab?.id;
    if (tabId == null) return false;
    // The in-page save overlay keeps its tab protected while it is open
    if (message?.type === TAB_MESSAGES.busy) {
      run(() => tabSessionStorage.setBusy(tabId, !!message.busy, TAB_BUSY_TTL_MS), "busy flag");
      return false;
    }
    // The save overlay only knows its page, the background knows the tab
    if (message?.type === TAB_MESSAGES.readLaterThisTab) {
      run(() => readLaterService.addTab(tabId, { source: "manual" }), "read later from overlay");
      return false;
    }
    return false;
  });

  tabLifecycleConfigStorage.watchSettings((settings) => {
    run(() => tabLifecycleService.syncAutoArchiveActivation(settings), "auto archive state");
    tabBadgeService.scheduleRefresh();
    scheduleStatsSample();
  });
}
