/**
 * AI tidy-up (tab triage): everything that needs no AI.
 *
 * - Which tabs go to AI: never pinned, protected (current, locked, playing, saving...)
 *   or private pages, nor non-web pages; those get a suggestion from local rules.
 * - What is sent: title, URL without hash, credentials and sensitive parameters,
 *   domain, idle time and tab group. Never page content.
 * - Checking the answer: unknown tabs and destinations are dropped, categories must
 *   be existing ones, every tab gets at most one suggestion.
 * - Cache: answers are reused by cleaned URL for 24 hours.
 */
import type {
  LocalCategory,
  OpenTabInfo,
  TabTriageDestination,
  TabTriageLocalReason,
  TabTriageSuggestion,
} from "@/types";
import { normalizeTabUrl } from "./tab-duplicates.utils";
import type { TidySuggestions } from "./tab-tidy.utils";

export const TRIAGE_DESTINATIONS: readonly TabTriageDestination[] = [
  "keep",
  "readLater",
  "bookmark",
  "workspace",
  "close",
];
/** Most idle tabs first; the rest wait for the next run */
export const TRIAGE_MAX_TABS = 120;
export const TRIAGE_BATCH_SIZE = 40;
export const TRIAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const TRIAGE_CACHE_MAX_ENTRIES = 500;
const MAX_CATEGORY_OPTIONS = 80;
const MAX_TITLE_LENGTH = 120;
const MAX_URL_LENGTH = 200;
const MAX_REASON_LENGTH = 80;
const MAX_NAME_LENGTH = 40;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** The privacy detector's sensitive parameters, plus common variants */
const SENSITIVE_PARAM =
  /^(?:token|auth|key|password|passwd|pwd|secret|access_token|refresh_token|id_token|session|sessionid|sid|code|state|signature|sig|apikey|api_key|ticket)$/i;

function truncate(value: string, max: number): string {
  const chars = [...value];
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : value;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? truncate(value.replace(/\s+/g, " ").trim(), max) : "";
}

/** URL as sent to AI: normalized, no hash, no credentials, no sensitive parameters */
export function sanitizeTriageUrl(url: string): string {
  const normalized = normalizeTabUrl(url) ?? url;
  try {
    const parsed = new URL(normalized);
    parsed.hash = "";
    parsed.username = "";
    parsed.password = "";
    for (const name of new Set(parsed.searchParams.keys())) {
      if (SENSITIVE_PARAM.test(name)) parsed.searchParams.delete(name);
    }
    return truncate(parsed.toString().replace(/\/$/, ""), MAX_URL_LENGTH);
  } catch {
    return truncate(normalized.split("#")[0], MAX_URL_LENGTH);
  }
}

/** "3d", "5h", "20m" */
export function formatIdleForPrompt(ms: number): string {
  const value = Math.max(0, ms);
  if (value >= DAY_MS) return `${Math.floor(value / DAY_MS)}d`;
  if (value >= HOUR_MS) return `${Math.floor(value / HOUR_MS)}h`;
  return `${Math.floor(value / MINUTE_MS)}m`;
}

export interface TriagePartition {
  /** Sent to AI: most idle first, at most `maxTabs` */
  aiTabs: OpenTabInfo[];
  /** Decided by local rules */
  localTabs: OpenTabInfo[];
  /** Eligible for AI but over the limit of one run */
  skippedCount: number;
}

export function partitionTriageTabs(
  tabs: readonly OpenTabInfo[],
  privateTabIds: ReadonlySet<number>,
  maxTabs = TRIAGE_MAX_TABS,
): TriagePartition {
  const localTabs: OpenTabInfo[] = [];
  const candidates: OpenTabInfo[] = [];
  for (const tab of tabs) {
    const local =
      tab.pinned ||
      tab.protection.length > 0 ||
      privateTabIds.has(tab.tabId) ||
      !/^https?:\/\//i.test(tab.url);
    (local ? localTabs : candidates).push(tab);
  }
  candidates.sort((a, b) => a.displayLastActiveAt - b.displayLastActiveAt);
  return {
    aiTabs: candidates.slice(0, maxTabs),
    localTabs,
    skippedCount: Math.max(0, candidates.length - maxTabs),
  };
}

/** Local tabs: keep what is pinned or protected, otherwise follow the rule-based tidy-up */
export function buildLocalTriageSuggestions(
  localTabs: readonly OpenTabInfo[],
  tidy: TidySuggestions,
): TabTriageSuggestion[] {
  const ruleFor = new Map<number, [TabTriageDestination, TabTriageLocalReason]>();
  for (const id of tidy.archive) ruleFor.set(id, ["close", "idle"]);
  for (const id of tidy.readLater) ruleFor.set(id, ["readLater", "article"]);
  for (const id of tidy.lowValue) ruleFor.set(id, ["close", "lowValue"]);
  for (const id of tidy.duplicates) ruleFor.set(id, ["close", "duplicate"]);

  return localTabs.map((tab) => {
    const fallback: TabTriageLocalReason = tab.pinned
      ? "pinned"
      : tab.protection.length > 0
        ? "protected"
        : /^https?:\/\//i.test(tab.url)
          ? "private"
          : "notWeb";
    const rule = fallback === "pinned" || fallback === "protected" ? undefined : ruleFor.get(tab.tabId);
    const [destination, local] = rule ?? (["keep", fallback] as const);
    return { tabId: tab.tabId, destination, reason: "", local };
  });
}

export interface TriagePromptItem {
  id: number;
  title: string;
  url: string;
  domain: string;
  idle: string;
  group?: string;
}

/** Prompt rows of one batch; `id` is the 1-based position in the batch */
export function buildTriagePromptItems(
  batch: readonly OpenTabInfo[],
  now: number,
): TriagePromptItem[] {
  return batch.map((tab, index) => ({
    id: index + 1,
    title: cleanText(tab.title, MAX_TITLE_LENGTH) || tab.domain,
    url: sanitizeTriageUrl(tab.url),
    domain: tab.domain,
    idle: formatIdleForPrompt(now - tab.displayLastActiveAt),
    group: cleanText(tab.groupTitle, MAX_NAME_LENGTH) || undefined,
  }));
}

export interface TriageCategoryOption {
  id: string;
  /** "Parent / Child" */
  path: string;
}

export function buildCategoryOptions(
  categories: readonly LocalCategory[],
  limit = MAX_CATEGORY_OPTIONS,
): TriageCategoryOption[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const pathOf = (category: LocalCategory): string => {
    const names: string[] = [];
    const seen = new Set<string>();
    let current: LocalCategory | undefined = category;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      names.unshift(current.name.trim());
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return names.filter(Boolean).join(" / ");
  };
  return [...categories]
    .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
    .map((category) => ({ id: category.id, path: pathOf(category) }))
    .filter((option) => option.path)
    .slice(0, limit);
}

/** Existing category by full path or, when unambiguous, by its last name */
export function matchCategoryOption(
  name: string | null | undefined,
  options: readonly TriageCategoryOption[],
): TriageCategoryOption | undefined {
  const wanted = (name ?? "").trim().toLowerCase().replace(/\s*[/>]\s*/g, " / ");
  if (!wanted) return undefined;
  const exact = options.find((option) => option.path.toLowerCase() === wanted);
  if (exact) return exact;
  const leaf = wanted.split(" / ").pop();
  const byLeaf = options.filter(
    (option) => option.path.toLowerCase().split(" / ").pop() === leaf,
  );
  return byLeaf.length === 1 ? byLeaf[0] : undefined;
}

export interface RawTriageItem {
  id: number;
  destination: string;
  reason?: string | null;
  category?: string | null;
  workspace?: string | null;
}

function isDestination(value: unknown): value is TabTriageDestination {
  return TRIAGE_DESTINATIONS.includes(value as TabTriageDestination);
}

/** Check the AI answer for one batch */
export function normalizeTriageItems(
  raw: readonly RawTriageItem[],
  batch: readonly OpenTabInfo[],
  categories: readonly TriageCategoryOption[],
): TabTriageSuggestion[] {
  const seen = new Set<number>();
  const suggestions: TabTriageSuggestion[] = [];
  for (const item of raw) {
    const tab = batch[Number(item.id) - 1];
    if (!tab || seen.has(tab.tabId) || !isDestination(item.destination)) continue;
    seen.add(tab.tabId);
    suggestions.push(
      completeSuggestion(
        {
          tabId: tab.tabId,
          destination: item.destination,
          reason: cleanText(item.reason, MAX_REASON_LENGTH),
          categoryName: cleanText(item.category, MAX_NAME_LENGTH) || undefined,
          workspaceName: cleanText(item.workspace, MAX_NAME_LENGTH) || undefined,
        },
        tab,
        categories,
      ),
    );
  }
  return suggestions;
}

/** Resolve the category and make sure a workspace has a name */
function completeSuggestion(
  suggestion: TabTriageSuggestion,
  tab: OpenTabInfo,
  categories: readonly TriageCategoryOption[],
): TabTriageSuggestion {
  const { categoryName, workspaceName, ...rest } = suggestion;
  if (rest.destination === "bookmark") {
    const category = matchCategoryOption(categoryName, categories);
    return category ? { ...rest, categoryId: category.id, categoryName: category.path } : rest;
  }
  if (rest.destination === "workspace") {
    return { ...rest, workspaceName: workspaceName || tab.groupTitle || tab.domain || tab.title };
  }
  return rest;
}

export interface TriageCacheEntry {
  destination: TabTriageDestination;
  reason: string;
  categoryName?: string;
  workspaceName?: string;
  at: number;
  language: string;
}

/** Keyed by sanitizeTriageUrl() */
export type TriageCache = Record<string, TriageCacheEntry>;

export function pickCachedSuggestions(
  tabs: readonly OpenTabInfo[],
  cache: TriageCache,
  now: number,
  language: string,
  categories: readonly TriageCategoryOption[],
): { cached: TabTriageSuggestion[]; misses: OpenTabInfo[] } {
  const cached: TabTriageSuggestion[] = [];
  const misses: OpenTabInfo[] = [];
  for (const tab of tabs) {
    const entry = cache[sanitizeTriageUrl(tab.url)];
    const fresh =
      entry &&
      entry.language === language &&
      now - entry.at < TRIAGE_CACHE_TTL_MS &&
      entry.at <= now &&
      isDestination(entry.destination);
    if (!fresh) {
      misses.push(tab);
      continue;
    }
    cached.push(
      completeSuggestion(
        {
          tabId: tab.tabId,
          destination: entry.destination,
          reason: entry.reason,
          categoryName: entry.categoryName,
          workspaceName: entry.workspaceName,
        },
        tab,
        categories,
      ),
    );
  }
  return { cached, misses };
}

export function toCacheEntries(
  suggestions: readonly TabTriageSuggestion[],
  tabs: readonly OpenTabInfo[],
  now: number,
  language: string,
): TriageCache {
  const byId = new Map(tabs.map((tab) => [tab.tabId, tab]));
  const entries: TriageCache = {};
  for (const suggestion of suggestions) {
    const tab = byId.get(suggestion.tabId);
    if (!tab || suggestion.local) continue;
    entries[sanitizeTriageUrl(tab.url)] = {
      destination: suggestion.destination,
      reason: suggestion.reason,
      categoryName: suggestion.categoryName,
      workspaceName: suggestion.workspaceName,
      at: now,
      language,
    };
  }
  return entries;
}

/** Drop expired entries and keep the newest `maxEntries` */
export function pruneTriageCache(
  cache: TriageCache,
  now: number,
  maxEntries = TRIAGE_CACHE_MAX_ENTRIES,
): TriageCache {
  const live = Object.entries(cache)
    .filter(([, entry]) => entry && now - entry.at < TRIAGE_CACHE_TTL_MS && entry.at <= now)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, maxEntries);
  return Object.fromEntries(live);
}

export interface TriageGroup {
  destination: TabTriageDestination;
  suggestions: TabTriageSuggestion[];
}

/** One group per destination, in a fixed order; workspace items sorted by name */
export function groupTriageSuggestions(
  suggestions: readonly TabTriageSuggestion[],
): TriageGroup[] {
  return TRIAGE_DESTINATIONS.map((destination) => ({
    destination,
    suggestions: suggestions
      .filter((suggestion) => suggestion.destination === destination)
      .sort((a, b) =>
        destination === "workspace"
          ? (a.workspaceName ?? "").localeCompare(b.workspaceName ?? "")
          : Number(!!a.local) - Number(!!b.local),
      ),
  })).filter((group) => group.suggestions.length > 0);
}

/** Selected by default: everything except what local rules keep */
export function getDefaultTriageSelection(
  suggestions: readonly TabTriageSuggestion[],
): Set<number> {
  return new Set(
    suggestions
      .filter((suggestion) => !(suggestion.local && suggestion.destination === "keep"))
      .map((suggestion) => suggestion.tabId),
  );
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}
