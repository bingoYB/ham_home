import { describe, expect, it } from "vitest";
import {
  appendLocalIssueCodes,
  buildDuplicateIssueMap,
  classifyHttpStatus,
  filterBookmarkHealthTargets,
  normalizeHealthUrl,
} from "../bookmark-health-utils";
import type { BookmarkHealthRecord, LocalBookmark } from "@/types";

function bookmark(
  id: string,
  url: string,
  overrides: Partial<LocalBookmark> = {},
): LocalBookmark {
  return {
    id,
    url,
    title: `Bookmark ${id}`,
    description: "description",
    categoryId: null,
    tags: [],
    hasSnapshot: false,
    createdAt: Number(id.replace(/\D/g, "")) || 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("bookmark health URL normalization", () => {
  it("removes tracking parameters, fragments, and trailing slashes", () => {
    expect(
      normalizeHealthUrl(
        "https://Example.com/docs/?utm_source=newsletter&b=2&a=1#intro",
      ),
    ).toBe("https://example.com/docs?a=1&b=2");
  });

  it("rejects non-http protocols", () => {
    expect(normalizeHealthUrl("chrome://extensions")).toBeNull();
    expect(normalizeHealthUrl("file:///tmp/demo.html")).toBeNull();
  });
});

describe("bookmark health scan scope", () => {
  it("keeps ordinary bookmarks and excludes image and text clip subjects", () => {
    const bookmarks = [
      bookmark("bookmark", "https://example.com/page"),
      bookmark("image", "https://example.com/image.png"),
      bookmark("text", "https://example.com/page#:~:text=selection"),
    ];

    const targets = filterBookmarkHealthTargets(bookmarks, {
      image: { type: "image" },
      text: { type: "text" },
    });

    expect(targets.map((item) => item.id)).toEqual(["bookmark"]);
  });
});

describe("bookmark health status classification", () => {
  it.each([
    [200, false, "healthy"],
    [200, true, "redirected"],
    [401, false, "auth_required"],
    [403, false, "auth_required"],
    [404, false, "broken"],
    [410, false, "broken"],
    [429, false, "rate_limited"],
    [503, false, "server_error"],
    [400, false, "unsupported"],
  ] as const)("classifies %i without over-reporting broken links", (status, redirected, expected) => {
    expect(classifyHttpStatus(status, redirected)).toBe(expected);
  });
});

describe("duplicate and metadata issues", () => {
  it("marks normalized duplicate URLs and keeps the oldest bookmark canonical", () => {
    const bookmarks = [
      bookmark("b1", "https://example.com/page?utm_source=x", { createdAt: 1 }),
      bookmark("b2", "https://example.com/page#section", { createdAt: 2 }),
      bookmark("b3", "https://example.com/other", { createdAt: 3 }),
    ];

    const issues = buildDuplicateIssueMap(bookmarks);
    expect(issues.get("b1")).toEqual(["duplicate_url:b1"]);
    expect(issues.get("b2")).toEqual(["duplicate_url:b1"]);
    expect(issues.has("b3")).toBe(false);
  });

  it("adds local metadata issues without changing URL status", () => {
    const record: BookmarkHealthRecord = {
      bookmarkId: "b1",
      sourceUrl: "https://example.com",
      checkedAt: 1,
      status: "healthy",
      issueCodes: [],
    };
    const result = appendLocalIssueCodes(
      record,
      bookmark("b1", "https://example.com", { title: "", description: "" }),
      new Map([["b1", ["duplicate_url:b1"]]]),
    );

    expect(result.status).toBe("healthy");
    expect(result.issueCodes).toEqual([
      "missing_title",
      "missing_description",
      "duplicate_url:b1",
    ]);
  });
});
