import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalCategory } from '@/types';

const mocks = vi.hoisted(() => ({ createCategory: vi.fn(), getCategories: vi.fn() }));
vi.mock('@/lib/storage/bookmark-storage', () => ({ bookmarkStorage: mocks }));

import { createAIRecommendedCategory } from '../category-utils';

const root: LocalCategory = {
  id: 'root', name: '投资与财经', parentId: null, order: 0, createdAt: 1, updatedAt: 1,
};
const child: LocalCategory = { ...root, id: 'child', name: '研究资料', parentId: root.id };

beforeEach(() => vi.resetAllMocks());

describe('applying recommended categories', () => {
  it('reuses an existing hierarchy without creating duplicate categories', async () => {
    expect(await createAIRecommendedCategory('投资与财经 > 研究资料', [root, child])).toEqual({
      categoryId: child.id, newCategories: [],
    });
    expect(mocks.createCategory).not.toHaveBeenCalled();
  });

  it('creates the missing child and returns its ID', async () => {
    mocks.createCategory.mockResolvedValue(child);
    expect(await createAIRecommendedCategory('投资与财经 > 研究资料', [root])).toEqual({
      categoryId: child.id, newCategories: [child],
    });
    expect(mocks.createCategory).toHaveBeenCalledWith(child.name, root.id);
  });

  it('recovers when another context creates the same category first', async () => {
    mocks.createCategory.mockRejectedValue(new Error('分类名称已存在'));
    mocks.getCategories.mockResolvedValue([root, child]);
    expect(await createAIRecommendedCategory('投资与财经 > 研究资料', [root])).toEqual({
      categoryId: child.id, newCategories: [],
    });
  });

  it('preserves a write failure for the UI and allows retrying a partly created hierarchy', async () => {
    const failure = new Error('storage unavailable');
    mocks.createCategory.mockResolvedValueOnce(root).mockRejectedValueOnce(failure);
    mocks.getCategories.mockResolvedValue([root]);
    await expect(createAIRecommendedCategory('投资与财经 > 研究资料', [])).rejects.toBe(failure);
    mocks.createCategory.mockResolvedValue(child);
    expect(await createAIRecommendedCategory('投资与财经 > 研究资料', [root])).toEqual({
      categoryId: child.id, newCategories: [child],
    });
    expect(mocks.createCategory.mock.calls.filter(([name]) => name === root.name)).toHaveLength(1);
  });
});
