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

  it("filters bookmarks by content type (bookmark, image, text, all)", () => {
    const bookmarks = [
      bookmark("bm-1", { title: "普通网页书签 1" }),
      bookmark("bm-2", { title: "普通网页书签 2" }),
      bookmark("img-1", { title: "图片剪藏 1" }),
      bookmark("img-2", { title: "图片剪藏 2" }),
      bookmark("text-1", { title: "文本剪藏 1" }),
    ];

    const subjectIndex: Record<string, { type: "image" | "text" }> = {
      "img-1": { type: "image" },
      "img-2": { type: "image" },
      "text-1": { type: "text" },
    };

    // 默认/所有
    const allResults = mergeBookmarkSearchResults({
      bookmarks,
      searchQuery: "",
      semanticBookmarkIds: [],
      selectedTags: [],
      selectedCategory: "all",
      timeRange: { type: "all" },
      customFilter: null,
      contentType: "all",
      subjectIndex,
    });
    expect(allResults.map((b) => b.id)).toEqual([
      "bm-1",
      "bm-2",
      "img-1",
      "img-2",
      "text-1",
    ]);

    // 筛选书签 (bookmark)
    const bookmarkResults = mergeBookmarkSearchResults({
      bookmarks,
      searchQuery: "",
      semanticBookmarkIds: [],
      selectedTags: [],
      selectedCategory: "all",
      timeRange: { type: "all" },
      customFilter: null,
      contentType: "bookmark",
      subjectIndex,
    });
    expect(bookmarkResults.map((b) => b.id)).toEqual(["bm-1", "bm-2"]);

    // 筛选图片 (image)
    const imageResults = mergeBookmarkSearchResults({
      bookmarks,
      searchQuery: "",
      semanticBookmarkIds: [],
      selectedTags: [],
      selectedCategory: "all",
      timeRange: { type: "all" },
      customFilter: null,
      contentType: "image",
      subjectIndex,
    });
    expect(imageResults.map((b) => b.id)).toEqual(["img-1", "img-2"]);

    // 筛选文本 (text)
    const textResults = mergeBookmarkSearchResults({
      bookmarks,
      searchQuery: "",
      semanticBookmarkIds: [],
      selectedTags: [],
      selectedCategory: "all",
      timeRange: { type: "all" },
      customFilter: null,
      contentType: "text",
      subjectIndex,
    });
    expect(textResults.map((b) => b.id)).toEqual(["text-1"]);
  });

  it("combines content type filter with keyword search and category filter", () => {
    const bookmarks = [
      bookmark("bm-dev", { title: "React Guide", categoryId: "dev" }),
      bookmark("img-dev", { title: "React Architecture Diagram", categoryId: "dev" }),
      bookmark("img-design", { title: "UI Mockup", categoryId: "design" }),
      bookmark("text-dev", { title: "React Hook quote", categoryId: "dev" }),
    ];

    const subjectIndex: Record<string, { type: "image" | "text" }> = {
      "img-dev": { type: "image" },
      "img-design": { type: "image" },
      "text-dev": { type: "text" },
    };

    const results = mergeBookmarkSearchResults({
      bookmarks,
      searchQuery: "React",
      semanticBookmarkIds: [],
      selectedTags: [],
      selectedCategory: "dev",
      timeRange: { type: "all" },
      customFilter: null,
      contentType: "image",
      subjectIndex,
    });

    expect(results.map((b) => b.id)).toEqual(["img-dev"]);
  });
});
