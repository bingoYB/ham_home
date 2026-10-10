/**
 * AI tidy-up (tab triage): splits the open tabs into the ones AI may see and the
 * ones local rules decide, reuses cached answers, asks AI in batches and checks
 * what comes back. Runs in extension pages; applying goes through the background.
 */
import pLimit from "p-limit";
import { isAgentConfigured, resolveAgentConfig } from "@/lib/agent/factory";
import { tabTriageAgentService } from "@/lib/agent/services/tab-triage-agent-service";
import { containsPrivateContent } from "@/lib/privacy/privacy-detector";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import { tabTriageCacheStorage } from "@/lib/storage/tab-triage-cache-storage";
import { workspaceStorage } from "@/lib/storage/workspace-storage";
import { buildTidySuggestions } from "@/lib/tabs/tab-tidy.utils";
import {
  TRIAGE_BATCH_SIZE,
  buildCategoryOptions,
  buildLocalTriageSuggestions,
  buildTriagePromptItems,
  chunk,
  normalizeTriageItems,
  partitionTriageTabs,
  pickCachedSuggestions,
  toCacheEntries,
} from "@/lib/tabs/tab-triage.utils";
import type { OpenTabInfo, OpenTabsSnapshot, TabTriageResult, TabTriageSuggestion } from "@/types";

const BATCH_CONCURRENCY = 2;
const MAX_WORKSPACE_NAMES = 30;

export class TabTriageError extends Error {
  constructor(
    readonly code: "not-configured" | "failed",
    message: string = code,
  ) {
    super(message);
    this.name = "TabTriageError";
  }
}

async function findPrivateTabIds(tabs: readonly OpenTabInfo[]): Promise<Set<number>> {
  const checks = await Promise.all(
    tabs.map(async (tab) => ({
      tabId: tab.tabId,
      // Unreadable URLs count as private
      isPrivate: /^https?:\/\//i.test(tab.url)
        ? (await containsPrivateContent(tab.url)).isPrivate
        : false,
    })),
  );
  return new Set(checks.filter((check) => check.isPrivate).map((check) => check.tabId));
}

class TabTriageService {
  async isAvailable(): Promise<boolean> {
    const config = await resolveAgentConfig();
    return isAgentConfigured(config.rawConfig);
  }

  async suggest(snapshot: OpenTabsSnapshot): Promise<TabTriageResult> {
    const now = Date.now();
    const config = await resolveAgentConfig();
    if (!isAgentConfigured(config.rawConfig)) throw new TabTriageError("not-configured");

    const [privateTabIds, categories, workspaces, cache] = await Promise.all([
      findPrivateTabIds(snapshot.tabs),
      bookmarkStorage.getCategories(),
      workspaceStorage.getWorkspaces(),
      tabTriageCacheStorage.get(now),
    ]);
    const partition = partitionTriageTabs(snapshot.tabs, privateTabIds);
    const local = buildLocalTriageSuggestions(partition.localTabs, buildTidySuggestions(snapshot, now));
    const categoryOptions = buildCategoryOptions(categories);
    const { cached, misses } = pickCachedSuggestions(
      partition.aiTabs,
      cache,
      now,
      config.language,
      categoryOptions,
    );
    const workspaceNames = workspaces
      .map((workspace) => workspace.name.trim())
      .filter(Boolean)
      .slice(0, MAX_WORKSPACE_NAMES);

    const limit = pLimit(BATCH_CONCURRENCY);
    const batches = chunk(misses, TRIAGE_BATCH_SIZE);
    const settled = await Promise.allSettled(
      batches.map((batch) =>
        limit(async () => {
          const answer = await tabTriageAgentService.suggest({
            items: buildTriagePromptItems(batch, now),
            workspaces: workspaceNames,
            categories: categoryOptions.map((option) => option.path),
          });
          return normalizeTriageItems(answer.items, batch, categoryOptions);
        }),
      ),
    );

    const fresh: TabTriageSuggestion[] = [];
    let failedCount = 0;
    let firstError: unknown;
    settled.forEach((outcome, index) => {
      if (outcome.status === "fulfilled") fresh.push(...outcome.value);
      else {
        failedCount += batches[index].length;
        firstError ??= outcome.reason;
      }
    });
    // Nothing came back: report the error instead of an empty result
    if (batches.length > 0 && failedCount === misses.length) {
      throw new TabTriageError(
        "failed",
        firstError instanceof Error ? firstError.message : String(firstError),
      );
    }
    await tabTriageCacheStorage
      .merge(toCacheEntries(fresh, partition.aiTabs, now, config.language), now)
      .catch(() => undefined);

    return {
      suggestions: [...local, ...cached, ...fresh],
      analyzedCount: partition.aiTabs.length,
      cachedCount: cached.length,
      skippedCount: partition.skippedCount,
      failedCount,
      generatedAt: now,
    };
  }
}

export const tabTriageService = new TabTriageService();
