import { bookmarkStorage } from '@/lib/storage/bookmark-storage';
import { workspaceStorage } from '@/lib/storage/workspace-storage';
import { tabGroupRulesStorage } from '@/lib/storage/tab-group-rules-storage';
import { bookmarkClipStorage } from '@/lib/storage/bookmark-clip-storage';

/** Read persisted data, never a filtered or content-free React view. */
export const exportService = {
  async createExport() {
    const [snapshot, workspaces, workspaceCategories, tabGroupRules, tabGroupAutoGroupSettings, clips] = await Promise.all([
      bookmarkStorage.getExportSnapshot(),
      workspaceStorage.getWorkspaces(),
      workspaceStorage.getCategories(),
      tabGroupRulesStorage.getRules(),
      tabGroupRulesStorage.getAutoGroupSettings(),
      bookmarkClipStorage.getAllClips(),
    ]);
    return {
      version: '1.0.0', exportedAt: Date.now(), ...snapshot,
      workspaces, workspaceCategories, tabGroupRules, tabGroupAutoGroupSettings, clips,
    };
  },
};
