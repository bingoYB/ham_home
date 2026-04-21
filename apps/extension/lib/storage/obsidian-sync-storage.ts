import type { ObsidianBookmarkSyncState } from "@/types";

const obsidianSyncStateItem = storage.defineItem<
  Record<string, ObsidianBookmarkSyncState>
>("local:obsidianSyncStates", {
  fallback: {},
});

class ObsidianSyncStorage {
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
}

export const obsidianSyncStorage = new ObsidianSyncStorage();
