/**
 * Lifecycle settings defaults and normalization.
 *
 * All three features are off by default. Unknown values from storage or sync fall
 * back to the defaults instead of failing, so a malformed file never turns on
 * anything that closes tabs.
 */
import type {
  ReadLaterAutoSummary,
  ReadLaterExpireAfterDays,
  TabArchiveMode,
  TabArchiveRetentionDays,
  TabBudgetOverAction,
  TabBudgetScope,
  TabIdleCountBy,
  TabIdleThreshold,
  TabLifecycleLocalState,
  TabLifecycleSettings,
  TabLifecycleSettingsPatch,
} from "@/types";
import { clampBudgetLimit, DEFAULT_BUDGET_LIMIT } from "./tab-budget.utils";
import { IDLE_THRESHOLD_OPTIONS, isSameThreshold } from "./tab-idle.utils";
import { normalizeProtectedDomain } from "./tab-protection.utils";

export const DEFAULT_IDLE_THRESHOLD: TabIdleThreshold = { value: 7, unit: "day" };

export const READ_LATER_EXPIRY_OPTIONS: readonly ReadLaterExpireAfterDays[] = [
  14,
  30,
  60,
  null,
];

export const MIN_OPEN_TABS_MAX = 50;

export const DEFAULT_TAB_LIFECYCLE_SETTINGS: TabLifecycleSettings = {
  activityTracking: true,
  autoArchive: {
    enabled: false,
    mode: "auto",
    idleThreshold: DEFAULT_IDLE_THRESHOLD,
    countBy: "usage-days",
    protectAudible: true,
    protectGrouped: false,
    protectDirtyForms: true,
    protectedDomains: [],
    minOpenTabs: 0,
  },
  archive: {
    retentionDays: 90,
  },
  budget: {
    enabled: false,
    limit: DEFAULT_BUDGET_LIMIT,
    scope: "all-windows",
    overBudgetAction: "nudge",
    showBadge: false,
  },
  readLater: {
    closeTabOnAdd: true,
    expireAfterDays: 30,
    autoSummary: "manual-only",
    saveSnapshotOnAdd: false,
  },
  updatedAt: 0,
};

export const DEFAULT_TAB_LIFECYCLE_STATE: TabLifecycleLocalState = {
  usageDays: [],
  lockedUrls: [],
  lastStartupAt: 0,
  autoArchiveConsent: false,
  autoMakeRoomConsent: false,
  autoArchiveActive: false,
  budgetNudge: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pickEnum<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function pickNullableEnum<T extends number | null>(
  value: unknown,
  options: readonly T[],
  fallback: T,
): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function normalizeThreshold(value: unknown): TabIdleThreshold {
  if (!isRecord(value)) return DEFAULT_IDLE_THRESHOLD;
  const candidate = { value: Number(value.value), unit: value.unit } as TabIdleThreshold;
  return IDLE_THRESHOLD_OPTIONS.find((option) => isSameThreshold(option, candidate)) ??
    DEFAULT_IDLE_THRESHOLD;
}

function normalizeDomains(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const domains = value
    .map((item) => (typeof item === "string" ? normalizeProtectedDomain(item) : null))
    .filter((item): item is string => !!item);
  return Array.from(new Set(domains));
}

export function normalizeTabLifecycleSettings(raw: unknown): TabLifecycleSettings {
  const defaults = DEFAULT_TAB_LIFECYCLE_SETTINGS;
  const source = isRecord(raw) ? raw : {};
  const autoArchive = isRecord(source.autoArchive) ? source.autoArchive : {};
  const archive = isRecord(source.archive) ? source.archive : {};
  const budget = isRecord(source.budget) ? source.budget : {};
  const readLater = isRecord(source.readLater) ? source.readLater : {};
  const minOpenTabs = Number(autoArchive.minOpenTabs);

  return {
    activityTracking: pickBoolean(source.activityTracking, defaults.activityTracking),
    autoArchive: {
      enabled: pickBoolean(autoArchive.enabled, defaults.autoArchive.enabled),
      mode: pickEnum<TabArchiveMode>(
        autoArchive.mode,
        ["auto", "confirm", "mark-only"],
        defaults.autoArchive.mode,
      ),
      idleThreshold: normalizeThreshold(autoArchive.idleThreshold),
      countBy: pickEnum<TabIdleCountBy>(
        autoArchive.countBy,
        ["usage-days", "calendar"],
        defaults.autoArchive.countBy,
      ),
      protectAudible: pickBoolean(autoArchive.protectAudible, defaults.autoArchive.protectAudible),
      protectGrouped: pickBoolean(autoArchive.protectGrouped, defaults.autoArchive.protectGrouped),
      protectDirtyForms: pickBoolean(
        autoArchive.protectDirtyForms,
        defaults.autoArchive.protectDirtyForms,
      ),
      protectedDomains: normalizeDomains(autoArchive.protectedDomains),
      minOpenTabs: Number.isFinite(minOpenTabs)
        ? Math.min(MIN_OPEN_TABS_MAX, Math.max(0, Math.round(minOpenTabs)))
        : defaults.autoArchive.minOpenTabs,
    },
    archive: {
      retentionDays: pickNullableEnum<TabArchiveRetentionDays>(
        archive.retentionDays,
        [30, 90, 180, null],
        defaults.archive.retentionDays,
      ),
    },
    budget: {
      enabled: pickBoolean(budget.enabled, defaults.budget.enabled),
      limit:
        budget.limit == null ? defaults.budget.limit : clampBudgetLimit(Number(budget.limit)),
      scope: pickEnum<TabBudgetScope>(
        budget.scope,
        ["all-windows", "per-window"],
        defaults.budget.scope,
      ),
      overBudgetAction: pickEnum<TabBudgetOverAction>(
        budget.overBudgetAction,
        ["badge-only", "nudge", "auto-archive"],
        defaults.budget.overBudgetAction,
      ),
      showBadge: pickBoolean(budget.showBadge, defaults.budget.showBadge),
    },
    readLater: {
      closeTabOnAdd: pickBoolean(readLater.closeTabOnAdd, defaults.readLater.closeTabOnAdd),
      expireAfterDays: pickNullableEnum<ReadLaterExpireAfterDays>(
        readLater.expireAfterDays,
        READ_LATER_EXPIRY_OPTIONS,
        defaults.readLater.expireAfterDays,
      ),
      autoSummary: pickEnum<ReadLaterAutoSummary>(
        readLater.autoSummary,
        ["manual-only", "all", "off"],
        defaults.readLater.autoSummary,
      ),
      saveSnapshotOnAdd: pickBoolean(
        readLater.saveSnapshotOnAdd,
        defaults.readLater.saveSnapshotOnAdd,
      ),
    },
    updatedAt: typeof source.updatedAt === "number" ? source.updatedAt : 0,
  };
}

export function applyTabLifecycleSettingsPatch(
  current: TabLifecycleSettings,
  patch: TabLifecycleSettingsPatch,
  now: number,
): TabLifecycleSettings {
  return normalizeTabLifecycleSettings({
    ...current,
    ...(patch.activityTracking !== undefined
      ? { activityTracking: patch.activityTracking }
      : {}),
    autoArchive: { ...current.autoArchive, ...patch.autoArchive },
    archive: { ...current.archive, ...patch.archive },
    budget: { ...current.budget, ...patch.budget },
    readLater: { ...current.readLater, ...patch.readLater },
    updatedAt: now,
  });
}

export function normalizeTabLifecycleState(raw: unknown): TabLifecycleLocalState {
  const source = isRecord(raw) ? raw : {};
  const nudge = isRecord(source.budgetNudge) ? source.budgetNudge : {};
  const stringList = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  const optionalNumber = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : undefined;

  return {
    usageDays: stringList(source.usageDays),
    lockedUrls: stringList(source.lockedUrls),
    lastStartupAt: optionalNumber(source.lastStartupAt) ?? 0,
    trackingStartedAt: optionalNumber(source.trackingStartedAt),
    autoArchiveConsent: source.autoArchiveConsent === true,
    autoMakeRoomConsent: source.autoMakeRoomConsent === true,
    autoArchiveBaselineAt: optionalNumber(source.autoArchiveBaselineAt),
    autoArchiveActive: source.autoArchiveActive === true,
    onboardingCompletedAt: optionalNumber(source.onboardingCompletedAt),
    budgetNudge: {
      lastShownAt: optionalNumber(nudge.lastShownAt),
      dismissedDate: typeof nudge.dismissedDate === "string" ? nudge.dismissedDate : undefined,
      snoozedUntil: optionalNumber(nudge.snoozedUntil),
    },
    lastSweep: isRecord(source.lastSweep)
      ? (source.lastSweep as unknown as TabLifecycleLocalState["lastSweep"])
      : undefined,
  };
}

/**
 * Auto archive runs only when it is on in the settings AND the user turned it on on
 * this device: settings synced from another device can never start closing tabs alone.
 */
export function isAutoArchiveEffective(
  settings: TabLifecycleSettings,
  state: Pick<TabLifecycleLocalState, "autoArchiveConsent">,
): boolean {
  return (
    settings.activityTracking && settings.autoArchive.enabled && state.autoArchiveConsent
  );
}

export function isAutoMakeRoomEffective(
  settings: TabLifecycleSettings,
  state: Pick<TabLifecycleLocalState, "autoMakeRoomConsent">,
): boolean {
  return (
    settings.activityTracking &&
    settings.budget.enabled &&
    settings.budget.overBudgetAction === "auto-archive" &&
    state.autoMakeRoomConsent
  );
}

/** Settings ask for an automatic close mode this device has not agreed to yet */
export function getPendingConsents(
  settings: TabLifecycleSettings,
  state: Pick<TabLifecycleLocalState, "autoArchiveConsent" | "autoMakeRoomConsent">,
): { autoArchive: boolean; autoMakeRoom: boolean } {
  return {
    autoArchive:
      settings.activityTracking && settings.autoArchive.enabled && !state.autoArchiveConsent,
    autoMakeRoom:
      settings.activityTracking &&
      settings.budget.enabled &&
      settings.budget.overBudgetAction === "auto-archive" &&
      !state.autoMakeRoomConsent,
  };
}

/** Whether the toolbar badge shows the tab count */
export function shouldShowBadgeCount(settings: TabLifecycleSettings): boolean {
  return settings.budget.enabled || settings.budget.showBadge;
}

const NESTED_SETTING_KEYS = ["autoArchive", "archive", "budget", "readLater"] as const;

/**
 * Keep fields this version does not know (added by newer clients) next to the
 * normalized known fields, so writing settings back never erases them.
 */
export function preserveUnknownSettingFields(
  raw: unknown,
  normalized: TabLifecycleSettings,
): TabLifecycleSettings {
  if (!isRecord(raw)) return normalized;
  const result: Record<string, unknown> = { ...raw, ...normalized };
  for (const key of NESTED_SETTING_KEYS) {
    const rawNested = raw[key];
    if (isRecord(rawNested)) {
      result[key] = { ...rawNested, ...(normalized[key] as unknown as Record<string, unknown>) };
    }
  }
  return result as unknown as TabLifecycleSettings;
}

