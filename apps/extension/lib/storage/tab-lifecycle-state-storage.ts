/**
 * Device-local lifecycle state (local:tabLifecycleState): usage days, persisted locks,
 * startup time, consent for automatic closing, nudge throttling. Never synced.
 *
 * The background is the only writer; updates run one after another so concurrent
 * events cannot lose each other's changes.
 */
import {
  DEFAULT_TAB_LIFECYCLE_STATE,
  normalizeTabLifecycleState,
} from "@/lib/tabs/tab-lifecycle-settings.utils";
import type { TabLifecycleLocalState } from "@/types";

const stateItem = storage.defineItem<TabLifecycleLocalState>("local:tabLifecycleState", {
  fallback: DEFAULT_TAB_LIFECYCLE_STATE,
});

class TabLifecycleStateStorage {
  private queue: Promise<unknown> = Promise.resolve();

  async get(): Promise<TabLifecycleLocalState> {
    return normalizeTabLifecycleState(await stateItem.getValue());
  }

  /**
   * Serialized read-modify-write. Return the same object to skip the write.
   */
  update(
    updater: (state: TabLifecycleLocalState) => TabLifecycleLocalState,
  ): Promise<TabLifecycleLocalState> {
    const run = async () => {
      const current = await this.get();
      const next = updater(current);
      if (next !== current) await stateItem.setValue(next);
      return next;
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  async patch(patch: Partial<TabLifecycleLocalState>): Promise<TabLifecycleLocalState> {
    return this.update((state) => ({ ...state, ...patch }));
  }

  async reset(): Promise<void> {
    await stateItem.setValue(DEFAULT_TAB_LIFECYCLE_STATE);
  }

  watch(callback: (state: TabLifecycleLocalState) => void): () => void {
    return stateItem.watch((value) => callback(normalizeTabLifecycleState(value)));
  }
}

export const tabLifecycleStateStorage = new TabLifecycleStateStorage();
