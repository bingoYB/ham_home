import { describe, expect, it } from "vitest";
import { mergeUsage } from "./usage";

describe("mergeUsage", () => {
  it("sums AI SDK v6 usage including nested token details", () => {
    const step = {
      inputTokens: 10,
      inputTokenDetails: { noCacheTokens: 6, cacheReadTokens: 4, cacheWriteTokens: undefined },
      outputTokens: 5,
      outputTokenDetails: { textTokens: 3, reasoningTokens: 2 },
      totalTokens: 15,
    };

    const total = mergeUsage(mergeUsage(undefined, step), step);

    expect(total).toEqual({
      inputTokens: 20,
      inputTokenDetails: { noCacheTokens: 12, cacheReadTokens: 8 },
      outputTokens: 10,
      outputTokenDetails: { textTokens: 6, reasoningTokens: 4 },
      totalTokens: 30,
    });
  });

  it("sums legacy promptTokens/completionTokens usage", () => {
    const step = { promptTokens: 3, completionTokens: 2, totalTokens: 5 };

    expect(mergeUsage(step, step)).toEqual({ promptTokens: 6, completionTokens: 4, totalTokens: 10 });
  });

  it("keeps the latest raw provider usage instead of summing it", () => {
    const total = mergeUsage({ inputTokens: 1, raw: { prompt_tokens: 1 } }, { inputTokens: 2, raw: { prompt_tokens: 2 } });

    expect(total).toEqual({ inputTokens: 3, raw: { prompt_tokens: 2 } });
  });

  it("ignores missing step usage and never mutates the first step", () => {
    const first = { inputTokens: 1 };

    const total = mergeUsage(mergeUsage(undefined, first), { inputTokens: 1 });

    expect(mergeUsage(undefined, undefined)).toBeUndefined();
    expect(mergeUsage(first, undefined)).toBe(first);
    expect(total).toEqual({ inputTokens: 2 });
    expect(first).toEqual({ inputTokens: 1 });
  });
});
