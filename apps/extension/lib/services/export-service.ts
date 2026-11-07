import { bookmarkStorage } from '@/lib/storage/bookmark-storage';
import { workspaceStorage } from '@/lib/storage/workspace-storage';
import { tabGroupRulesStorage } from '@/lib/storage/tab-group-rules-storage';
import { bookmarkClipStorage } from '@/lib/storage/bookmark-clip-storage';
import { readLaterStorage } from '@/lib/storage/read-later-storage';
import { tabLifecycleConfigStorage } from '@/lib/storage/tab-lifecycle-config-storage';

/** Read persisted data, never a filtered or content-free React view. */
export const exportService = {
  async createExport(options: { includeTabArchive?: boolean } = {}) {
    const [snapshot, workspaces, workspaceCategories, tabGroupRules, tabGroupAutoGroupSettings, clips, readLaterEntries, tabLifecycleSettings] = await Promise.all([
      bookmarkStorage.getExportSnapshot(),
      workspaceStorage.getWorkspaces(),
      workspaceStorage.getCategories(),
      tabGroupRulesStorage.getRules(),
      tabGroupRulesStorage.getAutoGroupSettings(),
      bookmarkClipStorage.getAllClips(),
      readLaterStorage.getAll(),
      tabLifecycleConfigStorage.getSettings(),
    ]);
    // Archives can contain sign-in links or one-time tokens; export only on request.
    const tabArchive = options.includeTabArchive
      ? await import('@/lib/storage/tab-archive-storage').then(async ({ tabArchiveStorage }) => ({
          entries: await tabArchiveStorage.getAllEntries(),
          batches: await tabArchiveStorage.getAllBatches(),
        }))
      : undefined;
    return {
      version: '1.0.0', exportedAt: Date.now(), ...snapshot,
      workspaces, workspaceCategories, tabGroupRules, tabGroupAutoGroupSettings, clips,
      readLaterEntries: Object.values(readLaterEntries), tabLifecycleSettings,
      ...(tabArchive ? { tabArchive } : {}),
    };
  },
};
