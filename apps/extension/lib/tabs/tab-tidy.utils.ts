/**
 * Rule-based tidy-up suggestions for open tabs (no AI). Every tab gets at most one
 * suggestion, in this order:
 * 1. close duplicates (keep the most recently used one);
 * 2. archive low-value pages: search results, sign-in / verification pages, blank tabs;
 * 3. read later: article-like pages idle for more than a day;
 * 4. archive: tabs past the idle threshold, or about to be archived;
 * 5. fold into a workspace: 5+ idle tabs of one tab group or one domain.
 * Protected tabs are never suggested. Applying closes tabs through the archive.
 */
import type { OpenTabInfo, OpenTabsSnapshot } from "@/types";
import { IDLE_DISPLAY_MS } from "./tab-idle.utils";

export type TidySuggestionKind =
  | "duplicates"
  | "lowValue"
  | "readLater"
  | "archive"
  | "workspace";

export interface TidyWorkspaceGroup {
  key: string;
  name: string;
  tabIds: number[];
}

export interface TidySuggestions {
  duplicates: number[];
  lowValue: number[];
  readLater: number[];
  archive: number[];
  workspaces: TidyWorkspaceGroup[];
}

export const WORKSPACE_SUGGESTION_MIN_TABS = 5;

const SEARCH_RESULT_PATTERN =
  /^https?:\/\/(?:[^/]+\.)?(?:google\.[a-z.]+\/search|bing\.com\/search|baidu\.com\/s\b|duckduckgo\.com\/\?|search\.yahoo\.com\/search|sogou\.com\/web|so\.com\/s\b|yandex\.[a-z]+\/search)/i;
const SIGN_IN_PATH_PATTERN =
  /\/(?:login|signin|sign-in|signup|register|auth|oauth|sso|verify|verification|confirmation|reset-password|password\/reset)(?:[/?#]|$)/i;
const BLANK_TAB_PATTERN = /^(?:about:blank|about:newtab|about:home|chrome:\/\/newtab|edge:\/\/newtab)/i;
/** Same signals the workspace analysis uses for "to read" pages */
const ARTICLE_PATTERN = /blog|article|news|post|medium\.com|substack|阅读|文章|专栏/i;

export function isLowValueTab(tab: Pick<OpenTabInfo, "url">): boolean {
  if (!tab.url || BLANK_TAB_PATTERN.test(tab.url)) return true;
  if (SEARCH_RESULT_PATTERN.test(tab.url)) return true;
  try {
    return SIGN_IN_PATH_PATTERN.test(new URL(tab.url).pathname);
  } catch {
    return false;
  }
}

export function isArticleLikeTab(tab: Pick<OpenTabInfo, "url" | "title">): boolean {
  return ARTICLE_PATTERN.test(`${tab.title} ${tab.url}`);
}

export function buildTidySuggestions(
  snapshot: Pick<OpenTabsSnapshot, "tabs">,
  now: number,
): TidySuggestions {
  const assigned = new Set<number>();
  const candidates = snapshot.tabs.filter((tab) => tab.protection.length === 0);
  const take = (predicate: (tab: OpenTabInfo) => boolean): number[] => {
    const ids: number[] = [];
    for (const tab of candidates) {
      if (assigned.has(tab.tabId) || !predicate(tab)) continue;
      assigned.add(tab.tabId);
      ids.push(tab.tabId);
    }
    return ids;
  };
  const idleForADay = (tab: OpenTabInfo) => now - tab.displayLastActiveAt >= IDLE_DISPLAY_MS;

  const duplicates = take((tab) => tab.redundantDuplicate);
  const lowValue = take(isLowValueTab);
  const readLater = take((tab) => idleForADay(tab) && isArticleLikeTab(tab));
  const archive = take(
    (tab) => tab.stale || tab.idleState === "expired" || tab.idleState === "expiring",
  );

  const buckets = new Map<string, TidyWorkspaceGroup>();
  for (const tab of candidates) {
    if (assigned.has(tab.tabId) || !idleForADay(tab)) continue;
    const key = tab.groupId != null ? `group:${tab.windowId}:${tab.groupId}` : `domain:${tab.domain}`;
    const name = tab.groupId != null ? tab.groupTitle || tab.domain : tab.domain;
    const bucket = buckets.get(key) ?? { key, name, tabIds: [] };
    bucket.tabIds.push(tab.tabId);
    buckets.set(key, bucket);
  }
  const workspaces = Array.from(buckets.values())
    .filter((bucket) => bucket.name && bucket.tabIds.length >= WORKSPACE_SUGGESTION_MIN_TABS)
    .sort((a, b) => b.tabIds.length - a.tabIds.length);

  return { duplicates, lowValue, readLater, archive, workspaces };
}

export function countTidySuggestions(suggestions: TidySuggestions): number {
  return (
    suggestions.duplicates.length +
    suggestions.lowValue.length +
    suggestions.readLater.length +
    suggestions.archive.length +
    suggestions.workspaces.reduce((sum, group) => sum + group.tabIds.length, 0)
  );
}
