import { describe, expect, it } from "vitest";
import type { LocalCategory } from "@/types";
import {
  collectCategoryScopeIds,
  countBookmarksByCategory,
  getCategoryAncestorIds,
} from "../category-tree.utils";

function category(id: string, parentId: string | null = null): LocalCategory {
  return { id, name: id, parentId, order: 0, createdAt: 0 };
}

// design
//   ├─ inspiration
//   │    └─ images
//   └─ fonts
// dev
const categories = [
  category("design"),
  category("inspiration", "design"),
  category("images", "inspiration"),
  category("fonts", "design"),
  category("dev"),
];

describe("getCategoryAncestorIds", () => {
  it("returns ancestors ordered from the root down to the direct parent", () => {
    expect(getCategoryAncestorIds(categories, "images")).toEqual([
      "design",
      "inspiration",
    ]);
  });

  it("returns nothing for root categories and unknown ids", () => {
    expect(getCategoryAncestorIds(categories, "design")).toEqual([]);
    expect(getCategoryAncestorIds(categories, "missing")).toEqual([]);
  });

  it("stops on cyclic parent links instead of looping forever", () => {
    const cyclic = [category("a", "b"), category("b", "a")];
    expect(getCategoryAncestorIds(cyclic, "a")).toEqual(["b"]);
  });
});

describe("collectCategoryScopeIds", () => {
  it("includes the category and every descendant", () => {
    expect([...collectCategoryScopeIds(categories, "design")].sort()).toEqual([
      "design",
      "fonts",
      "images",
      "inspiration",
    ]);
  });

  it("is just the category itself for leaves and unknown ids", () => {
    expect([...collectCategoryScopeIds(categories, "fonts")]).toEqual(["fonts"]);
    expect([...collectCategoryScopeIds(categories, "gone")]).toEqual(["gone"]);
  });

  it("terminates on cyclic data", () => {
    const cyclic = [category("a", "b"), category("b", "a")];
    expect([...collectCategoryScopeIds(cyclic, "a")].sort()).toEqual(["a", "b"]);
  });
});

describe("countBookmarksByCategory", () => {
  it("rolls descendant bookmarks up into every ancestor", () => {
    const counts = countBookmarksByCategory(
      [
        { categoryId: "images" },
        { categoryId: "images" },
        { categoryId: "fonts" },
        { categoryId: "dev" },
        { categoryId: null },
      ],
      categories,
    );

    expect(counts.all).toBe(5);
    expect(counts.uncategorized).toBe(1);
    expect(counts.byCategory.get("images")).toBe(2);
    expect(counts.byCategory.get("inspiration")).toBe(2);
    expect(counts.byCategory.get("fonts")).toBe(1);
    expect(counts.byCategory.get("design")).toBe(3);
    expect(counts.byCategory.get("dev")).toBe(1);
  });

  it("omits categories without bookmarks", () => {
    const counts = countBookmarksByCategory([{ categoryId: "dev" }], categories);
    expect(counts.byCategory.has("design")).toBe(false);
  });

  it("leaves bookmarks pointing at deleted categories out of the per-category counts", () => {
    const counts = countBookmarksByCategory([{ categoryId: "deleted" }], categories);
    expect(counts.all).toBe(1);
    expect(counts.uncategorized).toBe(0);
    expect(counts.byCategory.size).toBe(0);
  });
});
