/**
 * Tab budget actions when the open tab count goes over the limit (background only).
 *
 * The budget never blocks opening a tab. Depending on the setting it only colors the
 * badge, shows one gentle in-page nudge per overage (15 minute cooldown, "not today"
 * and snoozing respected), or, when explicitly enabled on this device, archives the
 * least recently used idle tabs to make room, with an undo toast.
 */
import { containsPrivateContent } from "@/lib/privacy";
import { tabLifecycleConfigStorage } from "@/lib/storage/tab-lifecycle-config-storage";
import { tabLifecycleStateStorage } from "@/lib/storage/tab-lifecycle-state-storage";
import { tabSessionStorage } from "@/lib/storage/tab-session-storage";
import {
  NUDGE_DWELL_MS,
  getNudgeBlockReason,
  selectMakeRoomCandidates,
} from "@/lib/tabs/tab-budget.utils";
import { isAutoMakeRoomEffective } from "@/lib/tabs/tab-lifecycle-settings.utils";
import { sortTabsByLeastRecentlyUsed } from "@/lib/tabs/tab-snapshot.utils";
import { tabArchiveService } from "./tab-archive-service";
import { tabBadgeService } from "./tab-badge-service";
import { tabFeedbackService } from "./tab-feedback-service";
import { STARTUP_GRACE_MS, tabLifecycleService } from "./tab-lifecycle-service";
import { saveUndoRecord } from "./tab-undo-records";

const NUDGE_CANDIDATES = 3;

class TabBudgetService {
  private nudgeTimer: ReturnType<typeof setTimeout> | null = null;
  private evaluating = false;

  /**
   * Called (debounced by the caller) whenever tabs were opened, closed or moved.
   * `grew` is true when the count may have gone up.
   */
  async evaluate(grew: boolean): Promise<void> {
    if (this.evaluating) return;
    this.evaluating = true;
    try {
      await this.doEvaluate(grew);
    } finally {
      this.evaluating = false;
    }
  }

  private async doEvaluate(grew: boolean): Promise<void> {
    const settings = await tabLifecycleConfigStorage.getSettings();
    if (!settings.budget.enabled) {
      await tabSessionStorage.setBudgetEpisode(null);
      return;
    }
    const status = await tabBadgeService.getBudgetStatus();
    if (status.over <= 0) {
      await tabSessionStorage.setBudgetEpisode(null);
      return;
    }

    const now = Date.now();
    let episode = await tabSessionStorage.getBudgetEpisode();
    if (!episode) {
      episode = { startedAt: now, nudged: false, pending: true };
      await tabSessionStorage.setBudgetEpisode(episode);
    }
    if (!grew || settings.budget.overBudgetAction === "badge-only") return;

    const [state, bulk] = await Promise.all([
      tabLifecycleStateStorage.get(),
      tabSessionStorage.getBulkOpened(now),
    ]);
    // Session restore and HamHome's own bulk opening never trigger budget actions
    if (now - state.lastStartupAt < STARTUP_GRACE_MS) return;
    if (bulk.activeUntil > now) return;

    if (isAutoMakeRoomEffective(settings, state)) {
      const made = await this.makeRoom(status.over, settings.autoArchive.protectDirtyForms);
      if (made) return;
    }
    // No tab qualified for making room: fall back to the nudge
    this.scheduleNudge();
  }

  /** Archive the least recently used idle tabs; false when no tab qualifies */
  private async makeRoom(over: number, protectDirtyForms: boolean): Promise<boolean> {
    const snapshot = await tabLifecycleService.getSnapshot();
    // A per-window budget only makes room in the window that went over
    const windowId = snapshot.budget.windowId;
    const inScope = snapshot.tabs.filter((tab) => windowId == null || tab.windowId === windowId);
    const byId = new Map(inScope.map((tab) => [tab.tabId, tab]));
    const count = Math.min(over, snapshot.budget.over);
    const now = Date.now();
    const pick = (dirty: ReadonlySet<number>) =>
      selectMakeRoomCandidates(
        inScope.filter((tab) => !dirty.has(tab.tabId)),
        count,
        now,
      ).flatMap((tabId) => byId.get(tabId) ?? []);
    const picked = protectDirtyForms
      ? await tabLifecycleService.pickWithoutDirtyForms(pick)
      : pick(new Set());
    if (picked.length === 0) return false;

    const tabIds = picked.map((tab) => tab.tabId);
    const titles = picked.map((tab) => tab.title).filter(Boolean);
    const result = await tabArchiveService.archiveTabs(tabIds, "budget", {
      automatic: true,
      skipProtected: true,
    });
    if (!result.ok || result.archived === 0 || !result.batchId) return false;

    const undoToken = await saveUndoRecord({
      kind: "archive",
      batchId: result.batchId,
      createdAt: Date.now(),
    });
    await tabFeedbackService.showInActiveTab(undefined, {
      kind: "archived",
      undoToken,
      titles,
      count: result.archived,
      reason: "budget",
    });
    return true;
  }

  /** The nudge waits until the current page finished loading and stayed for 3 seconds */
  scheduleNudge(): void {
    if (this.nudgeTimer) clearTimeout(this.nudgeTimer);
    this.nudgeTimer = setTimeout(() => {
      this.nudgeTimer = null;
      void this.tryNudge().catch((error) => {
        console.warn("[TabBudget] nudge failed:", error);
      });
    }, NUDGE_DWELL_MS);
  }

  /** Retry a pending nudge when the user lands on another page */
  async onPageReady(): Promise<void> {
    const episode = await tabSessionStorage.getBudgetEpisode();
    if (episode?.pending && !episode.nudged) this.scheduleNudge();
  }

  private async tryNudge(): Promise<void> {
    const [settings, state, episode] = await Promise.all([
      tabLifecycleConfigStorage.getSettings(),
      tabLifecycleStateStorage.get(),
      tabSessionStorage.getBudgetEpisode(),
    ]);
    if (!settings.budget.enabled || settings.budget.overBudgetAction === "badge-only") return;
    if (!episode || episode.nudged) return;

    const now = Date.now();
    if (getNudgeBlockReason(state.budgetNudge, episode.nudged, now)) {
      // Throttled overages are not nudged later; the badge still shows them
      await tabSessionStorage.setBudgetEpisode({ ...episode, pending: false, nudged: true });
      return;
    }

    const snapshot = await tabLifecycleService.getSnapshot();
    if (snapshot.budget.over <= 0) {
      await tabSessionStorage.setBudgetEpisode(null);
      return;
    }

    const target = await tabFeedbackService.findActiveTab();
    if (!target?.id || target.status !== "complete" || !target.url) return;

    const privacy = await containsPrivateContent(target.url);
    const candidates = sortTabsByLeastRecentlyUsed(
      snapshot.tabs.filter(
        (tab) =>
          tab.protection.length === 0 &&
          tab.tabId !== target.id &&
          (snapshot.budget.windowId == null || tab.windowId === snapshot.budget.windowId),
      ),
    )
      .slice(0, NUDGE_CANDIDATES)
      .map((tab) => ({
        tabId: tab.tabId,
        // Never show other tabs' titles on a private page
        title: privacy.isPrivate ? "" : tab.title,
        lastActiveAt: tab.displayLastActiveAt,
      }));

    const shown = await tabFeedbackService.show(target.id, {
      kind: "budgetNudge",
      openCount: snapshot.budget.count,
      limit: snapshot.budget.limit,
      over: snapshot.budget.over,
      candidates,
      hideTitles: privacy.isPrivate,
    });
    if (!shown) return;

    await tabSessionStorage.setBudgetEpisode({ ...episode, nudged: true, pending: false });
    await tabLifecycleStateStorage.update((value) => ({
      ...value,
      budgetNudge: { ...value.budgetNudge, lastShownAt: now },
    }));
  }
}

export const tabBudgetService = new TabBudgetService();
