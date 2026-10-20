/**
 * First-run guidance for the tab center: protected domain recommendations and the
 * tabs pre-selected by "tidy up now".
 */
import type {
  OpenTabInfo,
  OpenTabsSnapshot,
  TabAutoArchiveSettings,
  TabBudgetSettings,
  TabLifecycleSettings,
} from "@/types";
import { DEFAULT_BUDGET_LIMIT } from "./tab-budget.utils";
import { DEFAULT_IDLE_THRESHOLD } from "./tab-lifecycle-settings.utils";
import { normalizeProtectedDomain } from "./tab-protection.utils";

/** Mail, chat and other web apps people keep open on purpose */
export const WEB_APP_DOMAINS: readonly string[] = [
  "mail.google.com",
  "calendar.google.com",
  "meet.google.com",
  "outlook.office.com",
  "outlook.live.com",
  "mail.qq.com",
  "mail.163.com",
  "mail.126.com",
  "web.whatsapp.com",
  "web.telegram.org",
  "discord.com",
  "app.slack.com",
  "teams.microsoft.com",
  "feishu.cn",
  "larksuite.com",
  "dingtalk.com",
  "notion.so",
  "chatgpt.com",
  "claude.ai",
  "music.youtube.com",
  "open.spotify.com",
];

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Domains of pinned tabs plus known web apps among the open tabs, minus the ones
 * already protected.
 */
export function recommendProtectedDomains(
  tabs: ReadonlyArray<Pick<OpenTabInfo, "url" | "pinned">>,
  alreadyProtected: readonly string[] = [],
): string[] {
  const existing = new Set(alreadyProtected);
  const result = new Set<string>();
  for (const tab of tabs) {
    const hostname = hostnameOf(tab.url);
    if (!hostname) continue;
    const webApp = WEB_APP_DOMAINS.find(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
    const candidate = tab.pinned ? hostname : webApp;
    const normalized = candidate ? normalizeProtectedDomain(candidate) : null;
    if (normalized && !existing.has(normalized)) result.add(normalized);
  }
  return Array.from(result).sort();
}

/** "Tidy up now": duplicates and tabs idle past the threshold, never protected ones */
export function selectTidyNowTabIds(snapshot: Pick<OpenTabsSnapshot, "tabs">): number[] {
  return snapshot.tabs
    .filter((tab) => tab.protection.length === 0 && (tab.redundantDuplicate || tab.stale))
    .map((tab) => tab.tabId);
}

export interface OnboardingSettingsPatch {
  autoArchive: Partial<TabAutoArchiveSettings>;
  budget?: Partial<TabBudgetSettings>;
}

/**
 * Settings written when the guidance finishes. The recommended plan only fills in a
 * first set-up: auto archive or a budget another device already turned on (synced
 * here) keeps its own values.
 */
export function buildOnboardingPatch(
  recommended: boolean,
  settings: Pick<TabLifecycleSettings, "autoArchive" | "budget">,
  protectedDomains: readonly string[],
): OnboardingSettingsPatch {
  const autoArchive: Partial<TabAutoArchiveSettings> = { protectedDomains: [...protectedDomains] };
  if (recommended && !settings.autoArchive.enabled) {
    autoArchive.idleThreshold = DEFAULT_IDLE_THRESHOLD;
    autoArchive.countBy = "usage-days";
    autoArchive.mode = "auto";
  }
  const budget: Partial<TabBudgetSettings> | undefined =
    recommended && !settings.budget.enabled
      ? { enabled: true, limit: DEFAULT_BUDGET_LIMIT, overBudgetAction: "nudge" }
      : undefined;
  return { autoArchive, budget };
}

/** Share of tabs whose idle time is only an estimate (from the browser) */
export function estimatedShare(snapshot: Pick<OpenTabsSnapshot, "tabs">): number {
  if (snapshot.tabs.length === 0) return 0;
  return snapshot.tabs.filter((tab) => tab.activityEstimated).length / snapshot.tabs.length;
}
