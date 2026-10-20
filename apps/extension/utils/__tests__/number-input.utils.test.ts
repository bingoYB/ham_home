import { describe, expect, it } from "vitest";
import { resolveNumberDraft } from "../number-input.utils";

describe("resolveNumberDraft", () => {
  it("keeps the current value when the field was cleared or holds no number", () => {
    expect(resolveNumberDraft("", 15, 5, 200)).toBe(15);
    expect(resolveNumberDraft("   ", 10, 0, 50)).toBe(10);
    expect(resolveNumberDraft("-", 15, 5, 200)).toBe(15);
  });

  it("rounds and clamps what was typed", () => {
    expect(resolveNumberDraft("20", 15, 5, 200)).toBe(20);
    expect(resolveNumberDraft("7.6", 15, 5, 200)).toBe(8);
    expect(resolveNumberDraft("1", 15, 5, 200)).toBe(5);
    expect(resolveNumberDraft("999", 15, 5, 200)).toBe(200);
    expect(resolveNumberDraft("0", 10, 0, 50)).toBe(0);
  });
});
