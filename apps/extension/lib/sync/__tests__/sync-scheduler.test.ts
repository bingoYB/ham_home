import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebDAVConfig } from '@/types/sync';

interface Alarm { name: string; scheduledTime: number; periodInMinutes?: number }
type Changes = Record<string, { oldValue?: unknown; newValue?: unknown }>;
const mocks = vi.hoisted(() => ({
  config: {} as WebDAVConfig,
  busy: false,
  alarms: new Map<string, Alarm>(),
  local: {} as Record<string, unknown>,
  onAlarm: [] as Array<(alarm: Alarm) => void>,
  onStartup: [] as Array<() => void>,
  onInstalled: [] as Array<() => void>,
  onChanged: [] as Array<(changes: Changes, area: string) => void>,
  sync: vi.fn<() => Promise<void>>(),
  create: vi.fn(),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    alarms: {
      get: async (name: string) => mocks.alarms.get(name),
      create: mocks.create,
      clear: async (name: string) => mocks.alarms.delete(name),
      onAlarm: { addListener: (callback: (alarm: Alarm) => void) => mocks.onAlarm.push(callback) },
    },
    runtime: {
      onStartup: { addListener: (callback: () => void) => mocks.onStartup.push(callback) },
      onInstalled: { addListener: (callback: () => void) => mocks.onInstalled.push(callback) },
    },
    storage: {
      local: {
        get: async () => structuredClone(mocks.local),
        set: async (value: Record<string, unknown>) => { Object.assign(mocks.local, structuredClone(value)); },
      },
      onChanged: { addListener: (callback: (changes: Changes, area: string) => void) => mocks.onChanged.push(callback) },
    },
  },
}));
vi.mock('../sync-config-storage', () => ({ syncConfigStorage: { getConfig: async () => ({ ...mocks.config }) } }));
vi.mock('../sync-engine', () => ({ syncEngine: { get isBusy() { return mocks.busy; }, doSync: mocks.sync } }));
import { SyncScheduler, SYNC_ALARMS } from '../sync-scheduler';

// Drain queued storage / alarm promises without advancing the clock.
async function flush() { for (let index = 0; index < 80; index++) await Promise.resolve(); }
async function start() { new SyncScheduler().start(); await flush(); }
async function update(config: Partial<WebDAVConfig>) {
  mocks.config = { ...mocks.config, ...config };
  mocks.onChanged.forEach((listener) => listener({ webdavConfig: { newValue: mocks.config } }, 'local'));
  await flush();
}
async function change(key = 'bookmarks', area = 'local', oldValue: unknown = [], newValue: unknown = [{ id: 'new' }]) {
  mocks.onChanged.forEach((listener) => listener({ [key]: { oldValue, newValue } }, area));
  await flush();
}
async function fire(name: string, scheduledTime = Date.now()) {
  mocks.onAlarm.forEach((listener) => listener({ name, scheduledTime }));
  await flush();
}
function detachWorker() {
  vi.clearAllTimers();
  mocks.onAlarm.length = mocks.onStartup.length = mocks.onInstalled.length = mocks.onChanged.length = 0;
}

describe('WebDAV automatic sync scheduling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    vi.clearAllMocks();
    detachWorker();
    mocks.alarms.clear();
    mocks.local = {};
    mocks.busy = false;
    mocks.config = { enabled: true, url: 'https://example.test', username: 'user', password: 'password' };
    mocks.sync.mockResolvedValue(undefined);
    mocks.create.mockImplementation(async (name: string, info: { when?: number; periodInMinutes?: number }) => {
      mocks.alarms.set(name, {
        name, scheduledTime: info.when ?? Date.now() + info.periodInMinutes! * 60_000,
        ...(info.periodInMinutes ? { periodInMinutes: info.periodInMinutes } : {}),
      });
    });
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

  it('registers listeners immediately and preserves the existing periodic deadline on worker wake', async () => {
    mocks.alarms.set(SYNC_ALARMS.periodic, { name: SYNC_ALARMS.periodic, scheduledTime: 1_005_000, periodInMinutes: 30 });
    new SyncScheduler().start();
    expect(mocks.onAlarm).toHaveLength(1);
    expect(mocks.onStartup).toHaveLength(1);
    await flush();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it('debounces real-time changes and runs only once across the timer and alarm', async () => {
    mocks.config.realtimeSyncDelaySeconds = 5;
    await start();
    await change();
    await vi.advanceTimersByTimeAsync(4000);
    await change();
    await vi.advanceTimersByTimeAsync(1000);
    await fire(SYNC_ALARMS.realtime); // stale alarm from before the debounce
    expect(mocks.sync).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(4000);
    await flush();
    expect(mocks.sync).toHaveBeenCalledTimes(1);
    await fire(SYNC_ALARMS.realtime);
    expect(mocks.sync).toHaveBeenCalledTimes(1);
    expect(mocks.alarms.has(SYNC_ALARMS.realtime)).toBe(false);
  });

  it.each([
    ['categories', 'sync'], ['settings', 'sync'], ['workspaces', 'local'], ['workspaceCategories', 'local'],
    ['tabGroupRules', 'sync'], ['tabGroupAutoGroupSettings', 'sync'], ['bookmarkContents', 'local'],
    ['bookmarkClips', 'local'], ['bookmarkTombstones', 'local'], ['syncTombstones', 'local'],
    ['readLaterEntries', 'local'], ['tabLifecycleSettings', 'sync'],
  ])('schedules real-time sync for %s changes', async (key, area) => {
    await start();
    await change(key, area);
    expect(mocks.alarms.get(SYNC_ALARMS.realtime)?.scheduledTime).toBe(Date.now() + 300_000);
  });

  it('ignores status, caches and identical data writes', async () => {
    await start();
    await change('syncStatus');
    await change('tabGroupAIGroupCache');
    await change('bookmarks', 'local', [{ id: 'same' }], [{ id: 'same' }]);
    expect(mocks.alarms.has(SYNC_ALARMS.realtime)).toBe(false);
  });

  it('starts once on actual browser startup / installation, not on every worker wake', async () => {
    await start();
    expect(mocks.alarms.has(SYNC_ALARMS.startup)).toBe(false);
    mocks.onStartup.forEach((listener) => listener());
    await flush();
    await vi.advanceTimersByTimeAsync(5000);
    expect(mocks.sync).toHaveBeenCalledTimes(1);
    detachWorker();
    await start();
    await vi.advanceTimersByTimeAsync(10000);
    expect(mocks.sync).toHaveBeenCalledTimes(1);
    mocks.onInstalled.forEach((listener) => listener());
    await flush();
    await vi.advanceTimersByTimeAsync(5000);
    expect(mocks.sync).toHaveBeenCalledTimes(2);
  });

  it('applies delay / interval edits and cancels pending work when strategies are disabled', async () => {
    await start();
    await change();
    await update({ realtimeSyncDelaySeconds: 10, periodicSyncIntervalMinutes: 15 });
    expect(mocks.alarms.get(SYNC_ALARMS.realtime)?.scheduledTime).toBe(Date.now() + 10_000);
    expect(mocks.alarms.get(SYNC_ALARMS.periodic)?.periodInMinutes).toBe(15);
    await update({ realtimeSyncEnabled: false, startupSyncEnabled: false, periodicSyncEnabled: false });
    await change();
    mocks.onStartup.forEach((listener) => listener());
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);
    await fire(SYNC_ALARMS.periodic);
    expect(mocks.alarms.size).toBe(0);
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it.each([{ enabled: false }, { password: '' }, { url: '' }])('never schedules with disabled / incomplete config: %j', async (config) => {
    await start();
    await change();
    await update(config);
    await change();
    mocks.onStartup.forEach((listener) => listener());
    await flush();
    await fire(SYNC_ALARMS.periodic);
    expect(mocks.alarms.size).toBe(0);
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it('schedules startup when configuration becomes ready or startup sync is enabled', async () => {
    mocks.config.enabled = false;
    await start();
    await update({ enabled: true });
    expect(mocks.alarms.has(SYNC_ALARMS.startup)).toBe(true);
    await update({ startupSyncEnabled: false });
    expect(mocks.alarms.has(SYNC_ALARMS.startup)).toBe(false);
    await update({ startupSyncEnabled: true, startupSyncDelaySeconds: 20 });
    expect(mocks.alarms.get(SYNC_ALARMS.startup)?.scheduledTime).toBe(Date.now() + 20_000);
  });

  it('restores pending local sync after a worker restart even if the browser lost its alarm', async () => {
    await start();
    await change();
    const deadline = mocks.alarms.get(SYNC_ALARMS.realtime)!.scheduledTime;
    detachWorker();
    mocks.alarms.clear();
    vi.setSystemTime(deadline - 5000);
    await start();
    expect(mocks.alarms.get(SYNC_ALARMS.realtime)?.scheduledTime).toBe(deadline);
    await vi.advanceTimersByTimeAsync(5000);
    expect(mocks.sync).toHaveBeenCalledTimes(1);
  });

  it('uses the alarm fallback when a short timer is lost and scheduledTime is clamped', async () => {
    mocks.config.realtimeSyncDelaySeconds = 5;
    await start();
    await change();
    vi.clearAllTimers();
    vi.setSystemTime(Date.now() + 30_000);
    await fire(SYNC_ALARMS.realtime, Date.now());
    expect(mocks.sync).toHaveBeenCalledTimes(1);
  });

  it('keeps local changes made during sync and defers their run while the engine is busy', async () => {
    mocks.config.realtimeSyncDelaySeconds = 5;
    await start();
    mocks.busy = true;
    await change();
    await vi.advanceTimersByTimeAsync(5000);
    expect(mocks.sync).not.toHaveBeenCalled();
    expect(mocks.alarms.has(SYNC_ALARMS.realtime)).toBe(true);
    mocks.busy = false;
    vi.setSystemTime(Date.now() + 30_000);
    await fire(SYNC_ALARMS.realtime);
    expect(mocks.sync).toHaveBeenCalledTimes(1);
  });

  it('does not overlap runs or block turning sync off during a slow network request', async () => {
    let finish!: () => void;
    mocks.sync.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    await start();
    await fire(SYNC_ALARMS.periodic);
    await fire(SYNC_ALARMS.periodic);
    expect(mocks.sync).toHaveBeenCalledTimes(1);
    await update({ enabled: false });
    expect(mocks.alarms.size).toBe(0);
    finish();
    await flush();
  });
});
