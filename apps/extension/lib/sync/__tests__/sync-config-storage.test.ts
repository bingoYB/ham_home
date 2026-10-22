import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebDAVConfig } from '@/types/sync';
import { DEFAULT_SYNC_STRATEGY } from '../sync-strategy';

const state = vi.hoisted(() => ({
  items: new Map<string, unknown>(),
  watchers: new Map<string, (value: WebDAVConfig | null) => Promise<void>>(),
}));
vi.stubGlobal('storage', {
  defineItem: (key: string, { fallback }: { fallback: unknown }) => ({
    getValue: async () => structuredClone(state.items.get(key) ?? fallback),
    setValue: async (value: unknown) => { state.items.set(key, structuredClone(value)); },
    watch: (callback: (value: WebDAVConfig | null) => Promise<void>) => {
      state.watchers.set(key, callback);
      return () => state.watchers.delete(key);
    },
  }),
});
const { syncConfigStorage } = await import('../sync-config-storage');

describe('WebDAV strategy persistence', () => {
  beforeEach(() => { state.items.clear(); state.watchers.clear(); });

  it('reads old credentials with strategy defaults without rewriting storage', async () => {
    const legacy = { enabled: true, url: 'https://example.test', username: 'user', password: 'plain-password' };
    state.items.set('local:webdavConfig', legacy);
    expect(await syncConfigStorage.getConfig()).toEqual(expect.objectContaining({ ...legacy, ...DEFAULT_SYNC_STRATEGY }));
    expect(state.items.get('local:webdavConfig')).toEqual(legacy);
  });

  it('serializes rapid partial edits and keeps passwords encrypted', async () => {
    await syncConfigStorage.setConfig({ enabled: true, url: ' https://example.test ', username: ' user ', password: 'password' });
    await Promise.all([
      syncConfigStorage.setConfig({ realtimeSyncEnabled: false }),
      syncConfigStorage.setConfig({ startupSyncEnabled: false }),
      syncConfigStorage.setConfig({ periodicSyncIntervalMinutes: 15 }),
    ]);
    expect(await syncConfigStorage.getConfig()).toMatchObject({
      enabled: true, url: 'https://example.test', username: 'user', password: 'password',
      realtimeSyncEnabled: false, startupSyncEnabled: false, periodicSyncIntervalMinutes: 15,
    });
    expect((state.items.get('local:webdavConfig') as WebDAVConfig).password).not.toBe('password');
  });

  it('normalizes strategy values on writes and storage notifications', async () => {
    await syncConfigStorage.setConfig({ startupSyncDelaySeconds: 0, periodicSyncIntervalMinutes: NaN });
    expect(await syncConfigStorage.getConfig()).toMatchObject({ startupSyncDelaySeconds: 1, periodicSyncIntervalMinutes: 30 });
    const callback = vi.fn();
    syncConfigStorage.watchConfig(callback);
    await state.watchers.get('local:webdavConfig')!({ enabled: true, url: '', username: '', realtimeSyncEnabled: false });
    expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({ ...DEFAULT_SYNC_STRATEGY, realtimeSyncEnabled: false }));
    await state.watchers.get('local:webdavConfig')!(null);
    expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false, ...DEFAULT_SYNC_STRATEGY }));
  });
});
