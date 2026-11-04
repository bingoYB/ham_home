import { describe, expect, it } from 'vitest';
import { DEFAULT_SYNC_STRATEGY, normalizeSyncStrategy } from '../sync-strategy';

describe('normalizeSyncStrategy', () => {
  it('keeps legacy 5-minute debounce and 30-minute interval for existing configs', () => {
    expect(normalizeSyncStrategy()).toEqual(DEFAULT_SYNC_STRATEGY);
    expect(normalizeSyncStrategy().realtimeSyncDelaySeconds).toBe(300);
    expect(normalizeSyncStrategy().periodicSyncIntervalMinutes).toBe(30);
  });

  it('preserves explicit false flags for manual-only sync', () => {
    expect(normalizeSyncStrategy({
      realtimeSyncEnabled: false, startupSyncEnabled: false, periodicSyncEnabled: false,
    })).toMatchObject({ realtimeSyncEnabled: false, startupSyncEnabled: false, periodicSyncEnabled: false });
  });

  it('bounds and rounds time values before they reach timers', () => {
    expect(normalizeSyncStrategy({
      realtimeSyncDelaySeconds: -10, startupSyncDelaySeconds: 4000, periodicSyncIntervalMinutes: 3.6,
    })).toMatchObject({ realtimeSyncDelaySeconds: 1, startupSyncDelaySeconds: 3600, periodicSyncIntervalMinutes: 4 });
    expect(normalizeSyncStrategy({ periodicSyncIntervalMinutes: 99999 }).periodicSyncIntervalMinutes).toBe(1440);
  });

  it('falls back for corrupted values without coercing false strings to true', () => {
    expect(normalizeSyncStrategy({
      realtimeSyncDelaySeconds: NaN,
      startupSyncDelaySeconds: Infinity,
      periodicSyncIntervalMinutes: '10',
      realtimeSyncEnabled: 'false',
    } as never)).toEqual(DEFAULT_SYNC_STRATEGY);
  });
});
