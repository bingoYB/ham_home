import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseRemoteItems, requireListField, withPreservedItems } from "../remote-parse";

const Item = z.object({ id: z.string(), kind: z.enum(["a", "b"]) }).loose();

describe("remote list parsing", () => {
  it("keeps unreadable items aside instead of discarding the whole file", () => {
    const { valid, invalid } = parseRemoteItems(
      [{ id: "1", kind: "a" }, { id: "2", kind: "future" }, { id: "3", kind: "b", extra: true }],
      Item,
      "test.json",
    );
    expect(valid.map((item) => item.id)).toEqual(["1", "3"]);
    // loose(): fields added by newer versions survive the round trip
    expect(valid[1]).toMatchObject({ extra: true });
    expect(invalid).toEqual([{ id: "2", kind: "future" }]);
  });

  it("aborts on a file with an unexpected structure", () => {
    expect(() => parseRemoteItems({ not: "a list" }, Item, "test.json")).toThrow(
      expect.objectContaining({ code: "invalidRemoteData" }),
    );
    expect(() => requireListField([1, 2], "items", "test.json")).toThrow(
      expect.objectContaining({ code: "invalidRemoteData" }),
    );
    expect(requireListField({}, "items", "test.json")).toEqual([]);
  });

  it("writes preserved items back unless the merge already holds the same id", () => {
    const merged = [{ id: "1", kind: "a" as const }];
    expect(withPreservedItems(merged, [{ id: "1", kind: "x" }, { id: "2", kind: "y" }, "junk"])).toEqual([
      { id: "1", kind: "a" },
      { id: "2", kind: "y" },
      "junk",
    ]);
  });
});
