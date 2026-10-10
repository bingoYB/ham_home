/**
 * Browser-session scoped lifecycle state, backed by storage.session.
 *
 * storage.session is cleared when the browser (or the extension) restarts, which is
 * exactly the lifetime of tab IDs. It survives MV3 service worker restarts, so state
 * like "the previously active tab of a window" is not lost when the worker sleeps.
 * Where storage.session is missing (older Firefox) an in-memory map is used instead.
 */
import { browser } from "wxt/browser";
import type { PendingArchiveConfirmation } from "@/types";

interface SessionArea {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

const memory = new Map<string, unknown>();

function getSessionArea(): SessionArea | null {
  const area = (browser.storage as unknown as { session?: SessionArea }).session;
  return area && typeof area.get === "function" ? area : null;
}

const KEYS = {
  sessionId: "tl.sessionId",
  focusedWindow: "tl.focusedWindow",
  lastFocusedWindow: "tl.lastFocusedWindow",
  budgetEpisode: "tl.budgetEpisode",
  bulkOpened: "tl.bulkOpened",
  busyTabs: "tl.busyTabs",
  pendingConfirm: "tl.pendingConfirm",
  enrichment: "tl.enrichment",
  readingTabs: "tl.readingTabs",
  activeTab: (windowId: number) => `tl.active.${windowId}`,
  undo: (token: string) => `tl.undo.${token}`,
} as const;

export interface BudgetEpisode {
  startedAt: number;
  nudged: boolean;
  /** Waiting for a page that can show the nudge */
  pending: boolean;
}

/** tabId -> expiresAt */
type ExpiringIds = Record<string, number>;

function pruneExpiring(map: ExpiringIds, now: number): ExpiringIds {
  return Object.fromEntries(Object.entries(map).filter(([, expiresAt]) => expiresAt > now));
}

class TabSessionStorage {
  private queue: Promise<unknown> = Promise.resolve();

  async get<T>(key: string, fallback: T): Promise<T> {
    const area = getSessionArea();
    if (!area) return (memory.has(key) ? memory.get(key) : fallback) as T;
    try {
      const result = await area.get(key);
      return (key in result ? result[key] : fallback) as T;
    } catch {
      return (memory.has(key) ? memory.get(key) : fallback) as T;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    memory.set(key, value);
    const area = getSessionArea();
    if (!area) return;
    try {
      await area.set({ [key]: value });
    } catch {
      // keep the in-memory copy
    }
  }

  async remove(key: string): Promise<void> {
    memory.delete(key);
    const area = getSessionArea();
    if (!area) return;
    try {
      await area.remove(key);
    } catch {
      // ignore
    }
  }

  /** Serialized read-modify-write for shared maps */
  private mutate<T>(key: string, fallback: T, mutator: (value: T) => T): Promise<T> {
    const run = async () => {
      const next = mutator(await this.get<T>(key, fallback));
      await this.set(key, next);
      return next;
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  /**
   * True the first time this is called in a browser session, i.e. after a browser
   * restart or an extension update / reload. Without storage.session this can not
   * be told apart, so it only reports true once per background lifetime.
   */
  async claimNewSession(): Promise<boolean> {
    const existing = await this.get<string | null>(KEYS.sessionId, null);
    if (existing) return false;
    await this.set(KEYS.sessionId, crypto.randomUUID());
    return true;
  }

  getActiveTab(windowId: number): Promise<number | null> {
    return this.get<number | null>(KEYS.activeTab(windowId), null);
  }

  setActiveTab(windowId: number, tabId: number): Promise<void> {
    return this.set(KEYS.activeTab(windowId), tabId);
  }

  clearActiveTab(windowId: number): Promise<void> {
    return this.remove(KEYS.activeTab(windowId));
  }

  getFocusedWindow(): Promise<number | null> {
    return this.get<number | null>(KEYS.focusedWindow, null);
  }

  async setFocusedWindow(windowId: number | null): Promise<void> {
    await this.set(KEYS.focusedWindow, windowId);
    if (windowId != null) await this.set(KEYS.lastFocusedWindow, windowId);
  }

  getLastFocusedWindow(): Promise<number | null> {
    return this.get<number | null>(KEYS.lastFocusedWindow, null);
  }

  getBudgetEpisode(): Promise<BudgetEpisode | null> {
    return this.get<BudgetEpisode | null>(KEYS.budgetEpisode, null);
  }

  setBudgetEpisode(episode: BudgetEpisode | null): Promise<void> {
    return episode ? this.set(KEYS.budgetEpisode, episode) : this.remove(KEYS.budgetEpisode);
  }

  /** Tabs opened by HamHome in bulk; budget actions ignore them for a while */
  async markBulkOpened(tabIds: readonly number[], until: number): Promise<void> {
    await this.mutate<ExpiringIds>(KEYS.bulkOpened, {}, (map) => {
      const next = pruneExpiring(map, Date.now());
      for (const tabId of tabIds) next[String(tabId)] = until;
      // An entry without a tab ID suppresses budget actions as a whole
      next["*"] = Math.max(next["*"] ?? 0, until);
      return next;
    });
  }

  async getBulkOpened(now = Date.now()): Promise<{ tabIds: Set<number>; activeUntil: number }> {
    const map = pruneExpiring(await this.get<ExpiringIds>(KEYS.bulkOpened, {}), now);
    const tabIds = new Set(
      Object.keys(map)
        .filter((key) => key !== "*")
        .map(Number),
    );
    return { tabIds, activeUntil: map["*"] ?? 0 };
  }

  /** A HamHome save flow is running in the tab */
  async setBusy(tabId: number, busy: boolean, ttlMs: number): Promise<void> {
    await this.mutate<ExpiringIds>(KEYS.busyTabs, {}, (map) => {
      const next = pruneExpiring(map, Date.now());
      if (busy) next[String(tabId)] = Date.now() + ttlMs;
      else delete next[String(tabId)];
      return next;
    });
  }

  async getBusyTabIds(now = Date.now()): Promise<Set<number>> {
    const map = pruneExpiring(await this.get<ExpiringIds>(KEYS.busyTabs, {}), now);
    return new Set(Object.keys(map).map(Number));
  }

  getPendingConfirm(): Promise<PendingArchiveConfirmation[]> {
    return this.get<PendingArchiveConfirmation[]>(KEYS.pendingConfirm, []);
  }

  setPendingConfirm(items: PendingArchiveConfirmation[]): Promise<void> {
    return this.set(KEYS.pendingConfirm, items);
  }

  getUndo<T>(token: string): Promise<T | null> {
    return this.get<T | null>(KEYS.undo(token), null);
  }

  setUndo(token: string, value: unknown): Promise<void> {
    return this.set(KEYS.undo(token), value);
  }

  removeUndo(token: string): Promise<void> {
    return this.remove(KEYS.undo(token));
  }

  /** Bookmarks to fill in once their tab finished loading (read link later) */
  async setEnrichment(tabId: number, bookmarkId: string | null): Promise<void> {
    await this.mutate<Record<string, string>>(KEYS.enrichment, {}, (map) => {
      const next = { ...map };
      if (bookmarkId) next[String(tabId)] = bookmarkId;
      else delete next[String(tabId)];
      return next;
    });
  }

  async getEnrichment(tabId: number): Promise<string | null> {
    const map = await this.get<Record<string, string>>(KEYS.enrichment, {});
    return map[String(tabId)] ?? null;
  }

  /** Tabs opened from Read later, for the "finished reading?" bar */
  async setReadingTab(tabId: number, bookmarkId: string | null): Promise<void> {
    await this.mutate<Record<string, string>>(KEYS.readingTabs, {}, (map) => {
      const next = { ...map };
      if (bookmarkId) next[String(tabId)] = bookmarkId;
      else delete next[String(tabId)];
      return next;
    });
  }

  async getReadingTab(tabId: number): Promise<string | null> {
    const map = await this.get<Record<string, string>>(KEYS.readingTabs, {});
    return map[String(tabId)] ?? null;
  }
}

export const tabSessionStorage = new TabSessionStorage();
