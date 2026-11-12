import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCategory } from '@/types';

const items = new Map<string, unknown>();
const category = (id: string, parentId: string | null = null): WorkspaceCategory => ({
  id, name: id, parentId, order: 0, createdAt: 1,
});

beforeEach(() => {
  items.clear();
  vi.resetModules();
  vi.stubGlobal('storage', {
    defineItem: (key: string, { fallback }: { fallback: unknown }) => ({
      getValue: async () => structuredClone(items.get(key) ?? fallback),
      setValue: async (value: unknown) => { items.set(key, structuredClone(value)); },
    }),
  });
});

describe('workspace category aliases', () => {
  it('keeps descendants and all workspace content while moving references to canonical IDs', async () => {
    items.set('local:workspaceCategories', [category('local-root'), category('remote-root'),
      category('local-child', 'local-root'), category('remote-child', 'remote-root'),
      category('unique', 'local-child')]);
    const workspaces = [{ id: 'w1', name: 'Research', categoryId: 'local-child',
      pages: [{ url: 'https://example.test', title: 'Preserved page' }], updatedAt: 1 },
    { id: 'w2', name: 'Other', categoryId: null, pages: [], updatedAt: 1 }];
    items.set('local:workspaces', workspaces);
    const { workspaceStorage } = await import('../workspace-storage');
    await workspaceStorage.mergeCategories({ 'local-root': 'remote-root', 'local-child': 'remote-child' });
    const categories = await workspaceStorage.getCategories();
    expect(categories.map((c) => c.id)).toEqual(['remote-root', 'remote-child', 'unique']);
    expect(categories.find((c) => c.id === 'unique')?.parentId).toBe('remote-child');
    const after = await workspaceStorage.getWorkspaces();
    expect(after.find((w) => w.id === 'w1')).toMatchObject({
      ...workspaces[0], categoryId: 'remote-child', updatedAt: expect.any(Number),
    });
    expect(after.find((w) => w.id === 'w2')).toEqual(workspaces[1]);
  });
});
