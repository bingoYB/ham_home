import { browser } from 'wxt/browser';
import type { WebDAVConfig } from '@/types/sync';
import { syncConfigStorage } from './sync-config-storage';
import { syncEngine } from './sync-engine';
import { normalizeSyncStrategy } from './sync-strategy';

export const SYNC_ALARMS = {
  realtime: 'webdav-local-change-sync',
  startup: 'webdav-startup-sync',
  periodic: 'webdav-periodic-sync',
} as const;
const PENDING_KEY = 'webdavSyncPending';
type OneShot = typeof SYNC_ALARMS.realtime | typeof SYNC_ALARMS.startup;
type EffectiveConfig = WebDAVConfig & ReturnType<typeof normalizeSyncStrategy>;

// Only data included in the WebDAV protocol may trigger a sync. Status / credentials /
// caches must not, otherwise a completed sync would schedule itself indefinitely.
const SYNCED_KEYS: Record<string, ReadonlySet<string>> = {
  local: new Set(['bookmarks', 'bookmarkContents', 'bookmarkClips', 'bookmarkTombstones',
    'syncTombstones', 'workspaces', 'workspaceCategories', 'readLaterEntries']),
  sync: new Set(['categories', 'settings', 'tabGroupRules', 'tabGroupAutoGroupSettings', 'tabLifecycleSettings']),
};

function isReady(config: WebDAVConfig): boolean {
  return config.enabled && !!config.url.trim() && !!config.username.trim() && !!config.password;
}

/** Background-only scheduler. Register listeners synchronously before any storage reads. */
export class SyncScheduler {
  private queue: Promise<void> = Promise.resolve();
  private config?: EffectiveConfig;
  private pending: Partial<Record<OneShot, number>> = {};
  private timers = new Map<OneShot, ReturnType<typeof setTimeout>>();
  private running = false;

  start(): void {
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === SYNC_ALARMS.periodic) {
        this.enqueue(() => this.runPeriodic());
      } else if (alarm.name === SYNC_ALARMS.realtime || alarm.name === SYNC_ALARMS.startup) {
        const name = alarm.name;
        this.enqueue(async () => {
          const deadline = this.pending[name];
          // Browsers may clamp the alarm's scheduledTime to their minimum delay.
          if (deadline !== undefined && deadline <= Date.now()) await this.runOneShot(name, deadline);
        });
      }
    });
    const onStartup = () => this.enqueue(() => this.scheduleStartup());
    browser.runtime.onStartup.addListener(onStartup);
    browser.runtime.onInstalled.addListener(onStartup);
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && 'webdavConfig' in changes) {
        this.enqueue(() => this.reconfigure());
      }
      if (Object.entries(changes).some(([key, change]) =>
        SYNCED_KEYS[area]?.has(key) && JSON.stringify(change.oldValue) !== JSON.stringify(change.newValue))) {
        // Keep changes received during a sync too: a user may edit while a pull is running.
        // A remote update may cause one follow-up pass; identical writes never cause a loop.
        this.enqueue(() => this.scheduleLocalChange());
      }
    });
    this.enqueue(async () => {
      const stored = (await browser.storage.local.get(PENDING_KEY))[PENDING_KEY];
      const deadlines = stored && typeof stored === 'object' ? stored as Record<string, unknown> : {};
      for (const name of [SYNC_ALARMS.realtime, SYNC_ALARMS.startup]) {
        const deadline = deadlines[name];
        if (typeof deadline === 'number' && Number.isFinite(deadline)) {
          this.pending[name] = deadline;
        }
      }
      await this.reconfigure();
    });
  }

  private enqueue(action: () => Promise<void>): void {
    this.queue = this.queue.then(action).catch((error) => {
      console.error('[WebDAV Sync Scheduler]', error);
    });
  }

  private async readConfig(): Promise<EffectiveConfig> {
    const config = await syncConfigStorage.getConfig();
    return { ...config, ...normalizeSyncStrategy(config) };
  }

  private async reconfigure(): Promise<void> {
    const previous = this.config;
    const config = await this.readConfig();
    this.config = config;
    const ready = isReady(config);
    const periodic = await browser.alarms.get(SYNC_ALARMS.periodic);
    if (!ready || !config.periodicSyncEnabled) {
      await browser.alarms.clear(SYNC_ALARMS.periodic);
    } else if (periodic?.periodInMinutes !== config.periodicSyncIntervalMinutes) {
      await browser.alarms.create(SYNC_ALARMS.periodic, { periodInMinutes: config.periodicSyncIntervalMinutes });
    }

    for (const name of [SYNC_ALARMS.realtime, SYNC_ALARMS.startup]) {
      const realtime = name === SYNC_ALARMS.realtime;
      const enabled = realtime ? config.realtimeSyncEnabled : config.startupSyncEnabled;
      const delay = realtime ? config.realtimeSyncDelaySeconds : config.startupSyncDelaySeconds;
      const oldDelay = realtime ? previous?.realtimeSyncDelaySeconds : previous?.startupSyncDelaySeconds;
      if (!ready || !enabled) {
        await this.clearOneShot(name);
        continue;
      }
      // Adopt alarms created by older versions and restore persisted deadlines after a restart.
      const alarm = await browser.alarms.get(name);
      const deadline = this.pending[name] ?? alarm?.scheduledTime;
      if (deadline !== undefined) {
        await this.scheduleOneShot(name, previous && delay !== oldDelay ? Date.now() + delay * 1000 : deadline);
      }
    }

    if (previous && ready && config.startupSyncEnabled &&
      (!isReady(previous) || !previous.startupSyncEnabled)) {
      await this.scheduleOneShot(SYNC_ALARMS.startup, Date.now() + config.startupSyncDelaySeconds * 1000);
    }
  }

  private async scheduleStartup(): Promise<void> {
    const config = await this.readConfig();
    if (isReady(config) && config.startupSyncEnabled) {
      await this.scheduleOneShot(SYNC_ALARMS.startup, Date.now() + config.startupSyncDelaySeconds * 1000);
    }
  }

  private async scheduleLocalChange(): Promise<void> {
    const config = await this.readConfig();
    if (isReady(config) && config.realtimeSyncEnabled) {
      await this.scheduleOneShot(SYNC_ALARMS.realtime, Date.now() + config.realtimeSyncDelaySeconds * 1000);
    }
  }

  private async scheduleOneShot(name: OneShot, deadline: number): Promise<void> {
    clearTimeout(this.timers.get(name));
    this.timers.delete(name);
    this.pending[name] = deadline;
    await browser.storage.local.set({ [PENDING_KEY]: this.pending });
    await browser.alarms.create(name, { when: deadline });
    const remaining = Math.max(0, deadline - Date.now());
    // Chrome alarms have a minimum delay. A short timer gives responsive 1–25s sync;
    // the persisted alarm remains the fallback if the worker is suspended meanwhile.
    if (remaining <= 25_000) {
      this.timers.set(name, setTimeout(() => {
        this.enqueue(() => this.runOneShot(name, deadline));
      }, remaining));
    }
  }

  private async clearOneShot(name: OneShot): Promise<void> {
    clearTimeout(this.timers.get(name));
    this.timers.delete(name);
    delete this.pending[name];
    await browser.storage.local.set({ [PENDING_KEY]: this.pending });
    await browser.alarms.clear(name);
  }

  private async runOneShot(name: OneShot, deadline: number): Promise<void> {
    // Both the timer and the alarm can arrive, including stale alarms from before a debounce.
    if (this.pending[name] !== deadline) return;
    const config = await this.readConfig();
    const enabled = name === SYNC_ALARMS.realtime ? config.realtimeSyncEnabled : config.startupSyncEnabled;
    if (isReady(config) && enabled && (this.running || syncEngine.isBusy)) {
      await this.scheduleOneShot(name, Date.now() + 30_000);
      return;
    }
    await this.clearOneShot(name);
    if (isReady(config) && enabled) this.runSync();
  }

  private async runPeriodic(): Promise<void> {
    const config = await this.readConfig();
    if (isReady(config) && config.periodicSyncEnabled && !this.running && !syncEngine.isBusy) {
      this.runSync();
    }
  }

  private runSync(): void {
    this.running = true;
    // Do not block configuration changes / debounce updates on network requests.
    void syncEngine.doSync().catch((error) => {
      console.error('[WebDAV Auto Sync]', error);
    }).finally(() => { this.running = false; });
  }
}
