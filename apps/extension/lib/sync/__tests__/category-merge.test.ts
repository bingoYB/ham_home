import { describe, expect, it } from 'vitest';
import type { LocalCategory } from '@/types';
import { mergeCategoryHierarchy } from '../category-merge';

const category = (id: string, name: string, parentId: string | null = null): LocalCategory =>
  ({ id, name, parentId, order: 0, createdAt: 1 });

describe('category hierarchy merge', () => {
  it('resolves three levels in arbitrary input order before matching children', () => {
    const remote = [category('remote-leaf', 'Clips', 'remote-child'),
      category('remote-root', 'Work'), category('remote-child', 'Writing', 'remote-root')];
    const local = [category('local-leaf', 'Clips', 'local-child'),
      category('unique', 'New', 'local-child'), category('local-child', 'Writing', 'local-root'),
      category('local-root', 'Work')];
    const before = structuredClone({ local, remote });
    const result = mergeCategoryHierarchy(local, remote, 100);
    expect(result.mapping).toEqual({
      'local-root': 'remote-root', 'local-child': 'remote-child', 'local-leaf': 'remote-leaf',
    });
    expect(result.merged).toHaveLength(4);
    expect(result.merged.find((c) => c.id === 'unique')).toMatchObject({ parentId: 'remote-child', updatedAt: 100 });
    expect(result.applyToLocal).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'unique', parentId: 'remote-child' }),
    ]));
    expect({ local, remote }).toEqual(before);
    expect(mergeCategoryHierarchy(result.merged, result.merged, 200)).toMatchObject({ changed: false, mapping: {}, applyToLocal: [] });
  });

  it('normalizes a shared child even when the local version won LWW', () => {
    const local = [category('local-root', 'Work'),
      { ...category('shared', 'New name', 'local-root'), updatedAt: 50 }];
    const remote = [category('remote-root', 'Work'), category('shared', 'Old name', 'remote-root')];
    const result = mergeCategoryHierarchy(local, remote, 100);
    expect(result.merged.find((c) => c.id === 'shared')).toMatchObject({ name: 'New name', parentId: 'remote-root', updatedAt: 100 });
    expect(result.changed).toBe(true);
  });

  it('keeps same-name children of different parents and avoids delimiter collisions', () => {
    const local = [category('b', 'B'), category('left', 'Notes', 'b'), category('collision', 'a_b', 'c')];
    const remote = [category('a', 'A'), category('right', 'Notes', 'a'), category('other', 'a', 'b_c')];
    const result = mergeCategoryHierarchy(local, remote, 100);
    expect(result.mapping).toEqual({});
    expect(result.merged).toHaveLength(6);
  });

  it('preserves pre-existing orphan and cyclic data without hanging or guessing a repair', () => {
    const local = [category('a', 'A', 'b'), category('b', 'B', 'a'), category('orphan', 'Notes', 'missing')];
    const result = mergeCategoryHierarchy(local, [], 100);
    expect(result.merged).toEqual(local);
    expect(result.mapping).toEqual({});
  });

  it('does not import a stale remote rename over a newer local category', () => {
    const local = [{ ...category('same', 'New'), updatedAt: 20 }];
    const result = mergeCategoryHierarchy(local, [category('same', 'Old')], 100);
    expect(result.merged).toEqual(local);
    expect(result.applyToLocal).toEqual([]);
    expect(result.changed).toBe(true);
  });
});
