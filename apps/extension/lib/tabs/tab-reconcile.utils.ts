/**
 * Activity record reconciliation.
 *
 * Tab IDs change when the browser restarts, so records of the previous session are
 * matched to the current tabs by normalized URL and window position:
 * 1. same tab ID and same URL (extension update, service worker restart);
 * 2. same URL in the same window position (window rank + tab index);
 * 3. same URL in the same window rank, closest index;
 * 4. same URL anywhere, in window / index order.
 * Unmatched tabs start counting from now (conservative), unclaimed records are dropped.
 */
import type { TabActivityRecord } from "@/types";

export interface ReconcileTab {
  tabId: number;
  windowId: number;
  index: number;
  /** Normalized URL */
  url: string;
}

interface RankedRecord {
  record: TabActivityRecord;
  rank: number;
}

function buildWindowRanks(windowIds: Iterable<number>): Map<number, number> {
  const sorted = Array.from(new Set(windowIds)).sort((a, b) => a - b);
  return new Map(sorted.map((windowId, rank) => [windowId, rank]));
}

function inherit(
  record: TabActivityRecord,
  tab: ReconcileTab,
  now: number,
  lockedUrls: ReadonlySet<string>,
): TabActivityRecord {
  return {
    ...record,
    tabId: tab.tabId,
    windowId: tab.windowId,
    index: tab.index,
    url: tab.url,
    // A timestamp in the future means the clock moved back: count from now
    firstSeenAt: Math.min(record.firstSeenAt, now),
    lastActiveAt: Math.min(record.lastActiveAt, now),
    lastAudibleAt:
      record.lastAudibleAt != null ? Math.min(record.lastAudibleAt, now) : undefined,
    locked: record.locked || lockedUrls.has(tab.url) || undefined,
  };
}

export function createActivityRecord(
  tab: ReconcileTab,
  now: number,
  options: { estimated?: boolean; locked?: boolean } = {},
): TabActivityRecord {
  return {
    tabId: tab.tabId,
    windowId: tab.windowId,
    index: tab.index,
    url: tab.url,
    firstSeenAt: now,
    lastActiveAt: now,
    estimated: options.estimated || undefined,
    locked: options.locked || undefined,
  };
}

export function reconcileActivityRecords(
  previous: readonly TabActivityRecord[],
  current: readonly ReconcileTab[],
  now: number,
  lockedUrls: ReadonlySet<string> = new Set(),
): TabActivityRecord[] {
  return reconcileActivityRecordsDetailed(previous, current, now, lockedUrls).records;
}

/** Same as reconcileActivityRecords, also returning the records nobody claimed */
export function reconcileActivityRecordsDetailed(
  previous: readonly TabActivityRecord[],
  current: readonly ReconcileTab[],
  now: number,
  lockedUrls: ReadonlySet<string> = new Set(),
): { records: TabActivityRecord[]; unclaimed: TabActivityRecord[] } {
  const previousRanks = buildWindowRanks(previous.map((record) => record.windowId));
  const currentRanks = buildWindowRanks(current.map((tab) => tab.windowId));

  const candidatesByUrl = new Map<string, RankedRecord[]>();
  for (const record of previous) {
    const ranked = { record, rank: previousRanks.get(record.windowId) ?? 0 };
    const list = candidatesByUrl.get(record.url);
    if (list) list.push(ranked);
    else candidatesByUrl.set(record.url, [ranked]);
  }
  for (const list of candidatesByUrl.values()) {
    list.sort((a, b) => a.rank - b.rank || a.record.index - b.record.index);
  }

  const claimed = new Set<TabActivityRecord>();
  const result = new Map<number, TabActivityRecord>();

  const claim = (tab: ReconcileTab, ranked: RankedRecord) => {
    claimed.add(ranked.record);
    result.set(tab.tabId, inherit(ranked.record, tab, now, lockedUrls));
  };

  // Pass 1: the tab ID is still valid (same browser session)
  for (const tab of current) {
    const match = candidatesByUrl
      .get(tab.url)
      ?.find(({ record }) => record.tabId === tab.tabId && !claimed.has(record));
    if (match) claim(tab, match);
  }

  const ordered = current
    .filter((tab) => !result.has(tab.tabId))
    .map((tab) => ({ tab, rank: currentRanks.get(tab.windowId) ?? 0 }))
    .sort((a, b) => a.rank - b.rank || a.tab.index - b.tab.index);

  // Pass 2: same URL at the same window position
  for (const { tab, rank } of ordered) {
    const match = candidatesByUrl
      .get(tab.url)
      ?.find(
        (candidate) =>
          !claimed.has(candidate.record) &&
          candidate.rank === rank &&
          candidate.record.index === tab.index,
      );
    if (match) claim(tab, match);
  }

  // Pass 3 / 4: same URL, closest position first
  for (const { tab, rank } of ordered) {
    if (result.has(tab.tabId)) continue;
    const available = candidatesByUrl
      .get(tab.url)
      ?.filter((candidate) => !claimed.has(candidate.record));
    if (!available?.length) continue;

    const sameWindow = available
      .filter((candidate) => candidate.rank === rank)
      .sort(
        (a, b) =>
          Math.abs(a.record.index - tab.index) - Math.abs(b.record.index - tab.index),
      );
    claim(tab, sameWindow[0] ?? available[0]);
  }

  return {
    records: current.map(
      (tab) =>
        result.get(tab.tabId) ??
        createActivityRecord(tab, now, {
          estimated: true,
          locked: lockedUrls.has(tab.url),
        }),
    ),
    unclaimed: previous.filter((record) => !claimed.has(record)),
  };
}

/** URLs that should stay in the persisted lock list */
export function collectLockedUrls(records: readonly TabActivityRecord[]): string[] {
  return Array.from(
    new Set(records.filter((record) => record.locked).map((record) => record.url)),
  ).sort();
}
