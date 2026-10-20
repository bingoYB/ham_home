/**
 * Lifecycle settings (sync:tabLifecycleSettings).
 *
 * Kept out of LocalSettings on purpose: older clients rewrite the whole settings
 * document on sync and would erase fields they do not know. WebDAV syncs it as its
 * own file (tab-lifecycle-config.json).
 */
import {
  DEFAULT_TAB_LIFECYCLE_SETTINGS,
  applyTabLifecycleSettingsPatch,
  normalizeTabLifecycleSettings,
  preserveUnknownSettingFields,
} from "@/lib/tabs/tab-lifecycle-settings.utils";
import type { TabLifecycleSettings, TabLifecycleSettingsPatch } from "@/types";

const settingsItem = storage.defineItem<TabLifecycleSettings>("sync:tabLifecycleSettings", {
  fallback: DEFAULT_TAB_LIFECYCLE_SETTINGS,
});

class TabLifecycleConfigStorage {
  private queue: Promise<unknown> = Promise.resolve();

  async getSettings(): Promise<TabLifecycleSettings> {
    return normalizeTabLifecycleSettings(await settingsItem.getValue());
  }

  /** Stored value including fields only newer clients know (for sync) */
  async getRawSettings(): Promise<TabLifecycleSettings> {
    const raw = await settingsItem.getValue();
    return preserveUnknownSettingFields(raw, normalizeTabLifecycleSettings(raw));
  }

  updateSettings(patch: TabLifecycleSettingsPatch): Promise<TabLifecycleSettings> {
    const run = async () => {
      const raw = await settingsItem.getValue();
      const next = applyTabLifecycleSettingsPatch(
        normalizeTabLifecycleSettings(raw),
        patch,
        Date.now(),
      );
      await settingsItem.setValue(preserveUnknownSettingFields(raw, next));
      return next;
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  /** Apply settings from sync or import as they are, keeping their timestamp */
  async importRawSettings(raw: unknown): Promise<TabLifecycleSettings> {
    const next = normalizeTabLifecycleSettings(raw);
    await settingsItem.setValue(preserveUnknownSettingFields(raw, next));
    return next;
  }

  async resetSettings(): Promise<TabLifecycleSettings> {
    const next = { ...DEFAULT_TAB_LIFECYCLE_SETTINGS, updatedAt: Date.now() };
    await settingsItem.setValue(next);
    return next;
  }

  watchSettings(callback: (settings: TabLifecycleSettings) => void): () => void {
    return settingsItem.watch((value) => callback(normalizeTabLifecycleSettings(value)));
  }
}

export const tabLifecycleConfigStorage = new TabLifecycleConfigStorage();
