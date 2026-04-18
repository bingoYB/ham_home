import { parseCategoryPath } from "@/components/common/CategoryTree";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import type { LocalCategory } from "@/types";

export function matchCategoryByName(
  categoryName: string,
  categories: LocalCategory[],
): { matched: boolean; categoryId: string | null } {
  const searchName = categoryName.toLowerCase();
  const parentIds = new Set(categories.map((category) => category.parentId).filter(Boolean));
  const isLeaf = (category: LocalCategory) => !parentIds.has(category.id);

  const exactMatches = categories.filter(
    (category) => category.name.toLowerCase() === searchName,
  );
  if (exactMatches.length > 0) {
    const leafMatch = exactMatches.find(isLeaf);
    return { matched: true, categoryId: (leafMatch || exactMatches[0]).id };
  }

  const fuzzyMatches = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchName) ||
      searchName.includes(category.name.toLowerCase()),
  );
  if (fuzzyMatches.length > 0) {
    const leafMatch = fuzzyMatches.find(isLeaf);
    return { matched: true, categoryId: (leafMatch || fuzzyMatches[0]).id };
  }

  return { matched: false, categoryId: null };
}

export async function createAIRecommendedCategory(
  categoryPath: string,
  currentCategories: LocalCategory[],
): Promise<{ categoryId: string | null; newCategories: LocalCategory[] }> {
  const parts = parseCategoryPath(categoryPath);
  if (parts.length === 0) {
    return { categoryId: null, newCategories: [] };
  }

  let allCategories = [...currentCategories];
  let parentId: string | null = null;
  let finalCategory: LocalCategory | null = null;
  const newCategories: LocalCategory[] = [];

  for (const partName of parts) {
    const trimmedName = partName.trim();
    if (!trimmedName) {
      continue;
    }

    const existing = allCategories.find(
      (category) =>
        category.name.toLowerCase() === trimmedName.toLowerCase() &&
        category.parentId === parentId,
    );

    if (existing) {
      parentId = existing.id;
      finalCategory = existing;
      continue;
    }

    try {
      const newCategory = await bookmarkStorage.createCategory(
        trimmedName,
        parentId,
      );
      newCategories.push(newCategory);
      allCategories = [...allCategories, newCategory];
      parentId = newCategory.id;
      finalCategory = newCategory;
    } catch {
      const latestCategories = await bookmarkStorage.getCategories();
      const fallback = latestCategories.find(
        (category) =>
          category.name.toLowerCase() === trimmedName.toLowerCase() &&
          category.parentId === parentId,
      );

      if (!fallback) {
        throw new Error(`无法创建分类：${trimmedName}`);
      }

      allCategories = latestCategories;
      parentId = fallback.id;
      finalCategory = fallback;
    }
  }

  return {
    categoryId: finalCategory?.id || null,
    newCategories,
  };
}
