/**
 * Talks to content scripts on behalf of the background: makes sure one is running,
 * extracts reading content from a tab and asks about unsubmitted input.
 *
 * Tabs opened before the extension was installed or updated have no content script
 * yet, so it is injected on demand (the content script itself takes over from any
 * orphaned instance). Pages that cannot be scripted fall back to the tab title.
 */
import { browser } from "wxt/browser";
import { getFavicon } from "@hamhome/utils";
import { containsPrivateContent, isNonBookmarkableUrl } from "@/lib/privacy";
import { estimateReadingMinutes } from "@/lib/read-later/read-later.utils";
import { TAB_MESSAGES } from "@/lib/tabs/tab-messages";
import type { ReadingPageContent } from "@/types";

const PING_TIMEOUT_MS = 800;
const EXTRACT_TIMEOUT_MS = 6000;
const DIRTY_QUERY_TIMEOUT_MS = 600;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ExtractedTabContent extends ReadingPageContent {
  /** Privacy page: nothing beyond title and URL was read, nothing may go to AI */
  isPrivate: boolean;
  /** The content script could not be reached; only tab metadata is available */
  partial: boolean;
}

class TabContentService {
  async ping(tabId: number): Promise<boolean> {
    const response = await withTimeout(
      browser.tabs.sendMessage(tabId, { type: TAB_MESSAGES.ping }) as Promise<
        { ok?: boolean } | undefined
      >,
      PING_TIMEOUT_MS,
    );
    return response?.ok === true;
  }

  /** Make sure a live content script runs in the tab; false for pages that cannot host one */
  async ensureContentScript(tabId: number): Promise<boolean> {
    const tab = await browser.tabs.get(tabId).catch(() => null);
    if (!tab?.url || isNonBookmarkableUrl(tab.url)) return false;
    if (await this.ping(tabId)) return true;

    // The manifest script runs at document_idle; give a loading page a moment first
    if (tab.status === "loading") {
      for (let attempt = 0; attempt < 15; attempt += 1) {
        await sleep(200);
        const current = await browser.tabs.get(tabId).catch(() => null);
        if (!current) return false;
        if (current.status === "complete") break;
      }
      if (await this.ping(tabId)) return true;
    }

    const files =
      browser.runtime
        .getManifest()
        .content_scripts?.flatMap((script) => script.js ?? []) ?? [];
    if (files.length === 0 || !browser.scripting?.executeScript) return false;

    try {
      await browser.scripting.executeScript({ target: { tabId }, files });
    } catch {
      return false;
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (await this.ping(tabId)) return true;
      await sleep(150);
    }
    return false;
  }

  /**
   * Title, description, Markdown body and reading time of a tab.
   * Never throws: unreachable pages return what the tab itself knows.
   */
  async extract(tabId: number): Promise<ExtractedTabContent | null> {
    const tab = await browser.tabs.get(tabId).catch(() => null);
    if (!tab?.url) return null;

    const url = tab.url;
    const basic: ExtractedTabContent = {
      url,
      title: tab.title || url,
      description: "",
      markdown: "",
      favicon: getFavicon(url),
      isReaderable: false,
      isPrivate: false,
      partial: true,
    };
    if (isNonBookmarkableUrl(url)) return basic;

    const privacy = await containsPrivateContent(url);
    if (privacy.isPrivate) return { ...basic, isPrivate: true };

    if (!tab.discarded && (await this.ensureContentScript(tabId))) {
      const content = await withTimeout(
        browser.tabs.sendMessage(tabId, { type: TAB_MESSAGES.extractReading }) as Promise<
          ReadingPageContent | null | undefined
        >,
        EXTRACT_TIMEOUT_MS,
      );
      if (content) {
        return {
          ...content,
          // The page may have changed its URL after the tab object was read
          url: content.url || url,
          title: content.title || basic.title,
          favicon: content.favicon || basic.favicon,
          isPrivate: false,
          partial: false,
        };
      }
    }

    return (await this.extractWithScript(tabId, basic)) ?? basic;
  }

  /** Fallback when no content script answers: read the metadata with a one-off script */
  private async extractWithScript(
    tabId: number,
    basic: ExtractedTabContent,
  ): Promise<ExtractedTabContent | null> {
    if (!browser.scripting?.executeScript) return null;
    try {
      const [result] = await browser.scripting.executeScript({
        target: { tabId },
        func: () => {
          const meta = (selector: string) =>
            document.querySelector(selector)?.getAttribute("content")?.trim() || "";
          return {
            title: document.title?.trim() || "",
            description:
              meta('meta[name="description"]') || meta('meta[property="og:description"]'),
            text: (document.body?.innerText || "").slice(0, 200_000),
          };
        },
      });
      const value = result?.result as
        | { title: string; description: string; text: string }
        | undefined;
      if (!value) return null;
      return {
        ...basic,
        title: value.title || basic.title,
        description: value.description,
        estimatedMinutes: estimateReadingMinutes(value.text),
      };
    } catch {
      return null;
    }
  }

  /** Whether the page holds edited, unsubmitted input; unreachable pages count as clean */
  async hasDirtyForm(tabId: number): Promise<boolean> {
    const response = await withTimeout(
      browser.tabs.sendMessage(tabId, { type: TAB_MESSAGES.queryDirtyForm }) as Promise<
        { dirty?: boolean } | undefined
      >,
      DIRTY_QUERY_TIMEOUT_MS,
    );
    return response?.dirty === true;
  }

  /** Text of the link the user right-clicked (Chrome does not report it) */
  async getContextLinkText(tabId: number, linkUrl: string): Promise<string> {
    const response = await withTimeout(
      browser.tabs.sendMessage(tabId, { type: TAB_MESSAGES.contextLink, linkUrl }) as Promise<
        { text?: string } | undefined
      >,
      PING_TIMEOUT_MS,
    );
    return response?.text?.trim() ?? "";
  }
}

export const tabContentService = new TabContentService();
