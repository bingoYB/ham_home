import type { WebDAVSyncStrategy } from '@/types/sync';

// Keep the existing local-change delay and periodic interval when upgrading.
export const DEFAULT_SYNC_STRATEGY: Readonly<WebDAVSyncStrategy> = {
  realtimeSyncEnabled: true,
  realtimeSyncDelaySeconds: 300,
  startupSyncEnabled: true,
  startupSyncDelaySeconds: 5,
  periodicSyncEnabled: true,
  periodicSyncIntervalMinutes: 30,
};

export const SYNC_DELAY_LIMITS = { min: 1, max: 3600 } as const;
export const SYNC_INTERVAL_LIMITS = { min: 1, max: 1440 } as const;

function normalizeTime(value: unknown, fallback: number, limits: { min: number; max: number }): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(limits.max, Math.max(limits.min, Math.round(value)));
}

/** Shared by storage, scheduling and UI; malformed / legacy values never reach timers. */
export function normalizeSyncStrategy(config: Partial<WebDAVSyncStrategy> = {}): WebDAVSyncStrategy {
  const defaults = DEFAULT_SYNC_STRATEGY;
  return {
    realtimeSyncEnabled: typeof config.realtimeSyncEnabled === 'boolean'
      ? config.realtimeSyncEnabled : defaults.realtimeSyncEnabled,
    realtimeSyncDelaySeconds: normalizeTime(config.realtimeSyncDelaySeconds, defaults.realtimeSyncDelaySeconds, SYNC_DELAY_LIMITS),
    startupSyncEnabled: typeof config.startupSyncEnabled === 'boolean'
      ? config.startupSyncEnabled : defaults.startupSyncEnabled,
    startupSyncDelaySeconds: normalizeTime(config.startupSyncDelaySeconds, defaults.startupSyncDelaySeconds, SYNC_DELAY_LIMITS),
    periodicSyncEnabled: typeof config.periodicSyncEnabled === 'boolean'
      ? config.periodicSyncEnabled : defaults.periodicSyncEnabled,
    periodicSyncIntervalMinutes: normalizeTime(config.periodicSyncIntervalMinutes, defaults.periodicSyncIntervalMinutes, SYNC_INTERVAL_LIMITS),
  };
}
