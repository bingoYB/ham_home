/**
 * In-page feedback: undo toasts after "read later & close" or archiving, and budget
 * nudges. Rendered by the content UI; pages that cannot host it get a badge flash.
 */
import { browser, type Browser } from "wxt/browser";
import { TAB_MESSAGES } from "@/lib/tabs/tab-messages";
import type { TabFeedbackMessage } from "@/types";
import { tabBadgeService } from "./tab-badge-service";
import { tabContentService } from "./tab-content-service";

class TabFeedbackService {
  /** Show feedback in a tab; resolves false when it could not be shown */
  async show(tabId: number, feedback: TabFeedbackMessage): Promise<boolean> {
    if (!(await tabContentService.ensureContentScript(tabId))) return false;
    try {
      const response = (await browser.tabs.sendMessage(tabId, {
        type: TAB_MESSAGES.feedback,
        feedback,
      })) as { ok?: boolean } | undefined;
      return response?.ok === true;
    } catch {
      return false;
    }
  }

  /** Current tab of a window (or of the focused window) */
  async findActiveTab(windowId?: number): Promise<Browser.tabs.Tab | null> {
    const query =
      windowId != null
        ? { active: true, windowId }
        : { active: true, lastFocusedWindow: true, windowType: "normal" as const };
    try {
      const [tab] = await browser.tabs.query(query);
      return tab ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Show feedback on whatever tab the user is looking at in the window, e.g. the tab
   * the browser activated after closing one. Falls back to a badge flash.
   */
  async showInActiveTab(
    windowId: number | undefined,
    feedback: TabFeedbackMessage,
    fallbackBadge = "✓",
  ): Promise<boolean> {
    const tab = await this.findActiveTab(windowId);
    const shown = tab?.id != null && (await this.show(tab.id, feedback));
    if (!shown) await tabBadgeService.flash(fallbackBadge);
    return shown;
  }
}

export const tabFeedbackService = new TabFeedbackService();
