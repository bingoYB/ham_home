import { describe, expect, it } from "vitest";
import {
  retainVisibleSelection,
  toggleAllVisible,
} from "../bookmark-selection.utils";

describe("retainVisibleSelection", () => {
  it("drops selected ids that a filter has hidden", () => {
    const selected = new Set(["a", "b", "c"]);
    // user ticked 3 cards in "Design", then switched to "Dev" which shows d, e
    expect(retainVisibleSelection(selected, ["d", "e"])).toEqual(new Set());
    expect(retainVisibleSelection(selected, ["b", "d"])).toEqual(new Set(["b"]));
  });

  it("returns the same Set when nothing is dropped, so state does not change", () => {
    const selected = new Set(["a", "b"]);
    expect(retainVisibleSelection(selected, ["a", "b", "c"])).toBe(selected);
    const empty = new Set<string>();
    expect(retainVisibleSelection(empty, ["a"])).toBe(empty);
  });

  it("does not mutate the previous selection", () => {
    const selected = new Set(["a", "b"]);
    retainVisibleSelection(selected, ["a"]);
    expect(selected).toEqual(new Set(["a", "b"]));
  });
});

describe("toggleAllVisible", () => {
  it("selects every visible id when not all are selected", () => {
    expect(toggleAllVisible(new Set(), ["a", "b"])).toEqual(new Set(["a", "b"]));
    expect(toggleAllVisible(new Set(["a"]), ["a", "b"])).toEqual(
      new Set(["a", "b"]),
    );
  });

  it("clears when every visible id is already selected", () => {
    expect(toggleAllVisible(new Set(["a", "b"]), ["a", "b"])).toEqual(new Set());
  });

  it("is not fooled by a same-sized selection from a different list", () => {
    // 3 hidden ids selected, 3 different ids visible: must select the visible ones
    expect(toggleAllVisible(new Set(["a", "b", "c"]), ["d", "e", "f"])).toEqual(
      new Set(["d", "e", "f"]),
    );
  });

  it("yields an empty selection for an empty list", () => {
    expect(toggleAllVisible(new Set(["a"]), [])).toEqual(new Set());
  });
});
