import type { LocalCategory } from '@/types';

// 分类和书签使用同一存储区域，由 WebDAV 同步；sync 单条仅能容纳约 8 KB。
const localCategories = storage.defineItem<LocalCategory[] | null>('local:categories', {
  fallback: null,
});
const legacyCategories = storage.defineItem<LocalCategory[]>('sync:categories', {
  fallback: [],
});

export const categoryStorage = {
  async getValue(): Promise<LocalCategory[]> {
    // null 表示尚未转存；空数组表示用户已清空，不能回退到旧数据。
    return (await localCategories.getValue()) ?? legacyCategories.getValue();
  },

  async setValue(categories: LocalCategory[]): Promise<void> {
    // 所有写入均由 BookmarkCommands 队列调用。保留旧副本供其他设备升级读取，
    // 只有用户清空分类时才同时清理，且必须先持久化本地结果。
    await localCategories.setValue(categories);
    if (categories.length > 0) return;
    await legacyCategories.removeValue();
  },

  watch(callback: (categories: LocalCategory[]) => void): () => void {
    const notify = () => {
      void categoryStorage.getValue().then(callback).catch((error) => {
        console.error('[CategoryStorage] Failed to reload categories:', error);
      });
    };
    const stopLocal = localCategories.watch(notify);
    const stopLegacy = legacyCategories.watch(notify);
    return () => {
      stopLocal();
      stopLegacy();
    };
  },
};
