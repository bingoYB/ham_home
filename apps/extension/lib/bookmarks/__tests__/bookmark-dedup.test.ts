import { describe, expect, it } from "vitest";
import {
  buildDuplicateGroups,
  normalizeBookmarkUrl,
  type DedupCandidate,
} from "../bookmark-dedup";

function candidate(
  id: string,
  url: string,
  overrides: Partial<DedupCandidate> = {},
): DedupCandidate {
  return { id, url, createdAt: 1, ...overrides };
}

describe("normalizeBookmarkUrl", () => {
  it("drops tracking params", () => {
    expect(
      normalizeBookmarkUrl("https://example.com/docs?utm_source=news&a=1"),
    ).toBe("https://example.com/docs?a=1");
  });

  it("drops the trailing slash", () => {
    expect(normalizeBookmarkUrl("https://example.com/docs/")).toBe(
      normalizeBookmarkUrl("https://example.com/docs"),
    );
  });

  it("keeps the hash so text clips stay separate bookmarks", () => {
    expect(normalizeBookmarkUrl("https://example.com/p#:~:text=one")).not.toBe(
      normalizeBookmarkUrl("https://example.com/p#:~:text=two"),
    );
  });

  it("returns unparsable URLs untouched", () => {
    expect(normalizeBookmarkUrl("not a url")).toBe("not a url");
  });
});

describe("buildDuplicateGroups", () => {
  it("keeps the earliest record and reports the rest as duplicates", () => {
    const groups = buildDuplicateGroups([
      candidate("b2", "https://example.com/page", { createdAt: 200 }),
      candidate("b1", "https://example.com/page?utm_source=x", { createdAt: 100 }),
      candidate("b3", "https://example.com/other", { createdAt: 300 }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].canonical.id).toBe("b1");
    expect(groups[0].duplicates.map((item) => item.id)).toEqual(["b2"]);
  });

  it("breaks createdAt ties by id so every device elects the same canonical", () => {
    const items = [
      candidate("zz", "https://example.com/page", { createdAt: 100 }),
      candidate("aa", "https://example.com/page", { createdAt: 100 }),
    ];

    expect(buildDuplicateGroups(items)[0].canonical.id).toBe("aa");
    expect(buildDuplicateGroups([...items].reverse())[0].canonical.id).toBe("aa");
  });

  it("ignores deleted records", () => {
    const groups = buildDuplicateGroups([
      candidate("b1", "https://example.com/page"),
      candidate("b2", "https://example.com/page", { isDeleted: true }),
    ]);

    expect(groups).toHaveLength(0);
  });

  it("skips records the custom normalizer rejects", () => {
    const groups = buildDuplicateGroups(
      [
        candidate("b1", "chrome://extensions"),
        candidate("b2", "chrome://extensions"),
      ],
      (url) => (url.startsWith("http") ? url : null),
    );

    expect(groups).toHaveLength(0);
  });
});
