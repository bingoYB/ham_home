import { describe, expect, it } from "vitest";
import type { LocalBookmark } from "@/types";
import { mergeBookmarkSearchResults } from "../useBookmarkSearch";

function bookmark(
  id: string,
  overrides: Partial<LocalBookmark> = {},
): LocalBookmark {
  return {
    id,
    url: `https://${id}.example.com`,
    title: id,
    description: "",
    categoryId: "dev",
    tags: [],
    hasSnapshot: false,
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  };
}

describe("mergeBookmarkSearchResults", () => {
  it("keeps all keyword matches first and appends thresholded semantic matches", () => {
    const bookmarks = [
      bookmark("keyword-new", {
        title: "React 文档",
        createdAt: 300,
      }),
      bookmark("semantic-only", {
        title: "Frontend reference",
        description: "组件设计资料",
        createdAt: 200,
      }),
      bookmark("keyword-old", {
        tags: ["react"],
        createdAt: 100,
      }),
      bookmark("filtered-out", {
        title: "React Native",
        categoryId: "mobile",
        createdAt: 400,
      }),
    ];

    const results = mergeBookmarkSearchResults({
      bookmarks,
      searchQuery: "react",
      semanticBookmarkIds: ["semantic-only", "keyword-old", "filtered-out"],
      selectedTags: [],
      selectedCategory: "dev",
      timeRange: { type: "all" },
      customFilter: null,
    });

    expect(results.map((item) => item.id)).toEqual([
      "keyword-new",
      "keyword-old",
      "semantic-only",
    ]);
  });
});
