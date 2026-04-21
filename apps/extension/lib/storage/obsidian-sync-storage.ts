import type {
  ObsidianBookmarkSyncState,
  ObsidianSyncConfig,
} from "@/types";

const DEFAULT_OBSIDIAN_SYNC_CONFIG: ObsidianSyncConfig = {
  enabled: false,
  folderPath: "Obsidian/HamHome",
  autoSyncOnSave: false,
};

const obsidianSyncConfigItem = storage.defineItem<ObsidianSyncConfig>(
  "local:obsidianSyncConfig",
  {
    fallback: DEFAULT_OBSIDIAN_SYNC_CONFIG,
  },
);

const obsidianSyncStateItem = storage.defineItem<
  Record<string, ObsidianBookmarkSyncState>
>("local:obsidianSyncStates", {
  fallback: {},
});

class ObsidianSyncStorage {
  async getConfig(): Promise<ObsidianSyncConfig> {
    const config = await obsidianSyncConfigItem.getValue();
    return { ...DEFAULT_OBSIDIAN_SYNC_CONFIG, ...config };
  }

  async setConfig(
    config: Partial<ObsidianSyncConfig>,
  ): Promise<ObsidianSyncConfig> {
    const current = await this.getConfig();
    const updated = { ...current, ...config };
    await obsidianSyncConfigItem.setValue(updated);
    return updated;
  }

  async getState(bookmarkId: string): Promise<ObsidianBookmarkSyncState> {
    const states = await obsidianSyncStateItem.getValue();
    return states[bookmarkId] ?? { bookmarkId, status: "not_synced" };
  }

  async getStates(): Promise<Record<string, ObsidianBookmarkSyncState>> {
    return obsidianSyncStateItem.getValue();
  }

  async updateState(
    bookmarkId: string,
    state: Partial<ObsidianBookmarkSyncState>,
  ): Promise<ObsidianBookmarkSyncState> {
    const states = await obsidianSyncStateItem.getValue();
    const updated: ObsidianBookmarkSyncState = {
      ...states[bookmarkId],
      bookmarkId,
      status: state.status ?? states[bookmarkId]?.status ?? "not_synced",
      ...state,
    };
    await obsidianSyncStateItem.setValue({
      ...states,
      [bookmarkId]: updated,
    });
    return updated;
  }

  watchConfig(callback: (config: ObsidianSyncConfig) => void): () => void {
    return obsidianSyncConfigItem.watch((newValue) => {
      callback({ ...DEFAULT_OBSIDIAN_SYNC_CONFIG, ...(newValue ?? {}) });
    });
  }
}

export const obsidianSyncStorage = new ObsidianSyncStorage();
export { DEFAULT_OBSIDIAN_SYNC_CONFIG };
