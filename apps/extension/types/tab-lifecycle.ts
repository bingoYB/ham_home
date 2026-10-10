/**
 * Tab lifecycle types: activity tracking, auto archive, tab archive and tab budget.
 *
 * Activity records, usage days, locks and the archive are device-local data and never
 * leave this device. Only TabLifecycleSettings is synced (as its own sync file).
 */

/** Why HamHome closed a tab into the archive */
export type TabArchiveReason =
  | "expired"
  | "budget"
  | "manual"
  | "duplicate"
  | "triage";

export type TabIdleUnit = "hour" | "day";

export interface TabIdleThreshold {
  value: number;
  unit: TabIdleUnit;
}

/** auto: archive right away; confirm: wait for the user; mark-only: only label as expired */
export type TabArchiveMode = "auto" | "confirm" | "mark-only";

/** usage-days: only days the browser was actually used count; calendar: wall clock time */
export type TabIdleCountBy = "usage-days" | "calendar";

export type TabBudgetScope = "all-windows" | "per-window";

export type TabBudgetOverAction = "badge-only" | "nudge" | "auto-archive";

/** null keeps archive entries forever */
export type TabArchiveRetentionDays = 30 | 90 | 180 | null;

/** null never expires read later items */
export type ReadLaterExpireAfterDays = 14 | 30 | 60 | null;

export type ReadLaterAutoSummary = "manual-only" | "all" | "off";

export interface TabAutoArchiveSettings {
  enabled: boolean;
  mode: TabArchiveMode;
  idleThreshold: TabIdleThreshold;
  countBy: TabIdleCountBy;
  protectAudible: boolean;
  protectGrouped: boolean;
  protectDirtyForms: boolean;
  /** Hostnames, subdomains included; "*.example.com" is accepted as well */
  protectedDomains: string[];
  /** Do not archive while at most this many tabs are open; 0 turns it off */
  minOpenTabs: number;
}

export interface TabBudgetSettings {
  enabled: boolean;
  limit: number;
  scope: TabBudgetScope;
  overBudgetAction: TabBudgetOverAction;
  /** Show the tab count on the toolbar icon even when the budget is off */
  showBadge: boolean;
}

export interface ReadLaterSettings {
  closeTabOnAdd: boolean;
  expireAfterDays: ReadLaterExpireAfterDays;
  autoSummary: ReadLaterAutoSummary;
  saveSnapshotOnAdd: boolean;
}

/**
 * Synced lifecycle settings. Stored apart from LocalSettings so that older clients,
 * which rewrite the whole settings document, cannot wipe these fields.
 */
export interface TabLifecycleSettings {
  activityTracking: boolean;
  autoArchive: TabAutoArchiveSettings;
  archive: {
    retentionDays: TabArchiveRetentionDays;
  };
  budget: TabBudgetSettings;
  readLater: ReadLaterSettings;
  updatedAt: number;
}

/** Deep partial patch accepted by the settings storage */
export interface TabLifecycleSettingsPatch {
  activityTracking?: boolean;
  autoArchive?: Partial<TabAutoArchiveSettings>;
  archive?: Partial<TabLifecycleSettings["archive"]>;
  budget?: Partial<TabBudgetSettings>;
  readLater?: Partial<ReadLaterSettings>;
}

/** Per-tab activity record, stored in IndexedDB (HamHomeTabLifecycle.tabActivity) */
export interface TabActivityRecord {
  tabId: number;
  windowId: number;
  /** Tab position, used together with the URL to reconcile after a browser restart */
  index: number;
  /** Normalized URL */
  url: string;
  firstSeenAt: number;
  lastActiveAt: number;
  lastAudibleAt?: number;
  locked?: boolean;
  /**
   * lastActiveAt is only a conservative placeholder: HamHome has not seen the tab
   * being used yet (first install, or a tab it could not match after a restart)
   */
  estimated?: boolean;
}

/** Device-local lifecycle state (local:tabLifecycleState) */
export interface TabLifecycleLocalState {
  /** Local dates (YYYY-MM-DD) with browser usage, last 120 days */
  usageDays: string[];
  /** Normalized URLs of locked tabs, so locks survive a browser restart */
  lockedUrls: string[];
  lastStartupAt: number;
  trackingStartedAt?: number;
  /** The user enabled auto archive on this device (synced settings alone never do) */
  autoArchiveConsent: boolean;
  /** The user enabled "auto make room" on this device */
  autoMakeRoomConsent: boolean;
  /** Auto archive counts idle time from here, so turning it on is never retroactive */
  autoArchiveBaselineAt?: number;
  /** Whether auto archive was effectively running at the last check */
  autoArchiveActive: boolean;
  onboardingCompletedAt?: number;
  budgetNudge: {
    lastShownAt?: number;
    /** Local date the user chose "not today" */
    dismissedDate?: string;
    snoozedUntil?: number;
  };
  lastSweep?: TabLifecycleSweepSummary;
}

export interface TabLifecycleSweepSummary {
  at: number;
  archived: number;
  pendingConfirm: number;
  skippedReason?: "tracking-off" | "inactive" | "startup-grace" | "min-open-tabs";
  error?: string;
}

export interface TabArchiveOrigin {
  windowId: number;
  index: number;
  groupId?: number;
  groupTitle?: string;
  groupColor?: string;
}

/** A tab closed by HamHome (IndexedDB HamHomeTabLifecycle.tabArchive) */
export interface TabArchiveEntry {
  id: string;
  batchId: string;
  url: string;
  normalizedUrl: string;
  title: string;
  domain: string;
  favicon?: string;
  reason: TabArchiveReason;
  firstSeenAt?: number;
  lastActiveAt: number;
  closedAt: number;
  /** How many times this URL was archived */
  closeCount: number;
  origin?: TabArchiveOrigin;
}

export interface TabArchiveBatch {
  id: string;
  reason: TabArchiveReason;
  createdAt: number;
  entryIds: string[];
  /** Created by the sweep or auto make room, not by an explicit user action */
  automatic: boolean;
  undoneAt?: number;
}

export type TabProtectionReason =
  | "pinned"
  | "active"
  | "locked"
  | "saving"
  | "audible"
  | "protectedDomain"
  | "grouped"
  | "dirtyForm";

export type TabIdleState = "fresh" | "idle" | "expiring" | "expired";

export interface OpenTabInfo {
  tabId: number;
  windowId: number;
  index: number;
  title: string;
  url: string;
  normalizedUrl: string;
  domain: string;
  favicon?: string;
  pinned: boolean;
  active: boolean;
  audible: boolean;
  discarded: boolean;
  loading: boolean;
  groupId?: number;
  groupTitle?: string;
  groupColor?: string;
  firstSeenAt: number;
  /** HamHome's own record, the only value automatic decisions rely on */
  lastActiveAt: number;
  /** What the UI shows; may come from tab.lastAccessed while the record is estimated */
  displayLastActiveAt: number;
  activityEstimated: boolean;
  locked: boolean;
  protection: TabProtectionReason[];
  /** Relative to the auto archive rule (baseline included while it is running) */
  idleState: TabIdleState;
  /** Estimated time the tab gets archived, when auto archive runs */
  archiveAt?: number;
  /** Remaining usage days before archiving (usage-day thresholds) */
  remainingUsageDays?: number;
  /** Idle longer than the threshold by its activity alone, for stats and triage */
  stale: boolean;
  duplicateGroupId?: string;
  duplicateCount?: number;
  /** Duplicate that is not the most recently used tab of its group */
  redundantDuplicate: boolean;
  /** Recently opened by HamHome in bulk (workspace or archive restore) */
  bulkOpened: boolean;
}

export type TabBudgetLevel = "off" | "normal" | "warning" | "over";

export interface TabBudgetStatus {
  enabled: boolean;
  limit: number;
  scope: TabBudgetScope;
  /** Counted tabs (non-pinned) in the scope */
  count: number;
  over: number;
  level: TabBudgetLevel;
  /** Window the count refers to in per-window mode */
  windowId?: number;
}

export interface OpenTabsWindowInfo {
  windowId: number;
  order: number;
  focused: boolean;
  tabCount: number;
  countedTabCount: number;
}

export interface OpenTabsStats {
  total: number;
  counted: number;
  pinned: number;
  protected: number;
  expiring: number;
  expired: number;
  stale: number;
  duplicateGroups: number;
  redundantDuplicates: number;
}

export interface AutoArchiveStatus {
  /** Turned on in the (synced) settings */
  enabled: boolean;
  /** Actually running on this device */
  active: boolean;
  /** Turned on by another device and waiting for this device's confirmation */
  needsConsent: boolean;
  mode: TabArchiveMode;
  threshold: TabIdleThreshold;
  countBy: TabIdleCountBy;
  baselineAt?: number;
}

export interface PendingArchiveConfirmation {
  tabId: number;
  url: string;
  title: string;
  lastActiveAt: number;
}

export interface OpenTabsSnapshot {
  generatedAt: number;
  tabs: OpenTabInfo[];
  windows: OpenTabsWindowInfo[];
  budget: TabBudgetStatus;
  stats: OpenTabsStats;
  autoArchive: AutoArchiveStatus;
  activityTracking: boolean;
  pendingConfirm: PendingArchiveConfirmation[];
}

export interface TabArchiveRecentSummary {
  /** Automatic batches of the last 24 hours that were not undone */
  batchIds: string[];
  count: number;
}

export interface TabArchiveResult {
  ok: boolean;
  batchId?: string;
  archived: number;
  /** Tabs that were protected or already gone */
  skipped: number;
  error?: string;
}

export interface QuickBookmarkResult {
  created: number;
  /** Already bookmarked (queue-only ones move into the library) */
  existing: number;
  failed: number;
}

export interface TabRestoreResult {
  restored: number;
  failed: number;
}

/** Result of a lifecycle action that the in-page toast can undo */
export interface TabUndoableResult {
  ok: boolean;
  undoToken?: string;
  error?: string;
}

/** In-page feedback shown by the content UI */
export type TabFeedbackMessage =
  | {
      kind: "readLater";
      undoToken?: string;
      bookmarkId: string;
      title: string;
      /** Already queued before; addedAt is the original time */
      alreadyQueued: boolean;
      addedAt: number;
      /** The tab stayed open (closeTabOnAdd off, or a link) */
      tabKept: boolean;
      noteEditable: boolean;
    }
  | {
      kind: "archived";
      undoToken?: string;
      titles: string[];
      count: number;
      reason: TabArchiveReason;
    }
  | {
      kind: "budgetNudge";
      openCount: number;
      limit: number;
      over: number;
      /** Least recently used tabs; titles are empty on private pages */
      candidates: Array<{ tabId: number; title: string; lastActiveAt: number }>;
      hideTitles: boolean;
    };

// ============ Local stats (local:tabLifecycleStats, this device only) ============

/** One local day of tab stats; counts only, no titles or URLs */
export interface TabDailyStats {
  /** Local date, YYYY-MM-DD */
  date: string;
  /** Most tabs open at once (budget counting: normal windows, pinned excluded) */
  peakOpen: number;
  /** Open tabs × minutes; divided by sampledMinutes it gives the average */
  openTabMinutes: number;
  /** Minutes the browser was seen running */
  sampledMinutes: number;
  /** Minutes over the tab budget, while the budget is on */
  overBudgetMinutes: number;
  /** Closed by auto archive or by making room */
  autoArchived: number;
  /** Archived by the user: tab center, nudge, tidy-up, duplicates */
  manualArchived: number;
  /** Archived tabs opened again */
  restored: number;
  readLaterAdded: number;
  readLaterRead: number;
  readLaterExpired: number;
}

export type TabStatsCounter =
  | "autoArchived"
  | "manualArchived"
  | "restored"
  | "readLaterAdded"
  | "readLaterRead"
  | "readLaterExpired";

export interface TabOpenSample {
  at: number;
  open: number;
  overBudget: boolean;
}

export interface TabLifecycleStats {
  days: Record<string, TabDailyStats>;
  /** Last open tab count, held until the next sample */
  lastSample?: TabOpenSample;
}

export interface TabStatsDayPoint {
  date: string;
  peakOpen: number;
  /** null when the browser was not seen running that day */
  averageOpen: number | null;
}

/** The last 7 days (today included) against the 7 days before */
export interface TabWeeklyOverview {
  /** Oldest first, ending today */
  days: TabStatsDayPoint[];
  averageOpen: number | null;
  previousAverageOpen: number | null;
  peakOpen: number;
  overBudgetMinutes: number;
  autoArchived: number;
  manualArchived: number;
  restored: number;
  readLaterAdded: number;
  readLaterRead: number;
  readLaterExpired: number;
  /** Days of the week with any recorded data */
  trackedDays: number;
  /** Open tab counts are only sampled while activity tracking is on */
  samplingEnabled: boolean;
}

// ============ AI tidy-up (tab triage) ============

export type TabTriageDestination = "keep" | "readLater" | "bookmark" | "workspace" | "close";

/** Why a tab was decided by local rules instead of AI */
export type TabTriageLocalReason =
  | "pinned"
  | "protected"
  | "private"
  | "notWeb"
  | "duplicate"
  | "lowValue"
  | "idle"
  | "article";

export interface TabTriageSuggestion {
  tabId: number;
  destination: TabTriageDestination;
  /** One short sentence: why this destination */
  reason: string;
  /** bookmark: an existing category, matched by name */
  categoryId?: string;
  categoryName?: string;
  /** workspace: suggested workspace name */
  workspaceName?: string;
  /** Decided by local rules: pinned, protected or private tabs never go to AI */
  local?: TabTriageLocalReason;
}

export interface TabTriageResult {
  suggestions: TabTriageSuggestion[];
  /** Tabs whose title and URL were sent to AI (cached answers included) */
  analyzedCount: number;
  /** Answers reused from the 24 hour cache */
  cachedCount: number;
  /** Tabs left out because a run analyzes at most TRIAGE_MAX_TABS */
  skippedCount: number;
  /** Tabs of batches whose AI call failed */
  failedCount: number;
  generatedAt: number;
}
