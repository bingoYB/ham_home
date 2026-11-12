import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalCategory } from '@/types';

const state = vi.hoisted(() => ({
  items: new Map<string, unknown>(),
  watchers: new Map<string, Set<() => void>>(),
  failedWrite: '',
  failedRemoval: false,
}));

const category: LocalCategory = {
  id: 'existing', name: '投资与财经', parentId: null, order: 0, createdAt: 1, updatedAt: 1,
};

async function openStorage() {
  vi.resetModules();
  return (await import('../category-storage')).categoryStorage;
}

beforeEach(() => {
  state.items.clear();
  state.watchers.clear();
  state.failedWrite = '';
  state.failedRemoval = false;
  vi.stubGlobal('storage', {
    defineItem: (key: string, { fallback }: { fallback: unknown }) => ({
      getValue: async () => structuredClone(state.items.get(key) ?? fallback),
      setValue: async (value: unknown) => {
        if (state.failedWrite === key) throw new Error('write failed');
        state.items.set(key, structuredClone(value));
        state.watchers.get(key)?.forEach((notify) => notify());
      },
      removeValue: async () => {
        if (state.failedRemoval) throw new Error('removal failed');
        state.items.delete(key);
        state.watchers.get(key)?.forEach((notify) => notify());
      },
      watch: (notify: () => void) => {
        const watchers = state.watchers.get(key) ?? new Set();
        state.watchers.set(key, watchers);
        watchers.add(notify);
        return () => watchers.delete(notify);
      },
    }),
  });
});

describe('category storage migration', () => {
  it('reads legacy categories without modifying storage, then persists the full list locally', async () => {
    state.items.set('sync:categories', [category]);
    const storage = await openStorage();
    expect(await storage.getValue()).toEqual([category]);
    expect(state.items.has('local:categories')).toBe(false);
    // No sync writes are allowed: exceeding its quota must not prevent applying a category.
    state.failedWrite = 'sync:categories';
    const next = [category, { ...category, id: 'new', name: '新分类' }];
    await storage.setValue(next);
    expect(await storage.getValue()).toEqual(next);
    expect(state.items.get('sync:categories')).toEqual([category]);
  });

  it('keeps legacy data intact when the local write fails', async () => {
    state.items.set('sync:categories', [category]);
    state.failedWrite = 'local:categories';
    const storage = await openStorage();
    await expect(storage.setValue([])).rejects.toThrow('write failed');
    expect(await storage.getValue()).toEqual([category]);
  });

  it('never resurrects legacy categories after clearing, even if legacy cleanup fails', async () => {
    state.items.set('sync:categories', [category]);
    state.failedRemoval = true;
    const storage = await openStorage();
    await expect(storage.setValue([])).rejects.toThrow('removal failed');
    expect(await storage.getValue()).toEqual([]);
    expect(state.items.get('sync:categories')).toEqual([category]);
  });

  it('notifies observers of legacy changes and local migration, and unsubscribes both watches', async () => {
    const storage = await openStorage();
    const changed = vi.fn();
    const stop = storage.watch(changed);
    state.items.set('sync:categories', [category]);
    state.watchers.get('sync:categories')!.forEach((notify) => notify());
    await vi.waitFor(() => expect(changed).toHaveBeenLastCalledWith([category]));
    const next = [category, { ...category, id: 'new' }];
    await storage.setValue(next);
    await vi.waitFor(() => expect(changed).toHaveBeenLastCalledWith(next));
    // Late legacy events must read the authoritative local list.
    state.items.set('sync:categories', []);
    state.watchers.get('sync:categories')!.forEach((notify) => notify());
    await vi.waitFor(() => expect(changed).toHaveBeenLastCalledWith(next));
    stop();
    expect(state.watchers.get('local:categories')!.size).toBe(0);
    expect(state.watchers.get('sync:categories')!.size).toBe(0);
  });
});
