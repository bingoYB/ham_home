import type { AgentRunResult } from "../core/types";

type Usage = NonNullable<AgentRunResult["usage"]>;

/**
 * Adds one model step's usage onto the running total of a run.
 *
 * Numeric fields are summed recursively, so both the AI SDK v6 shape
 * (`inputTokens`, `inputTokenDetails.cacheReadTokens`, ...) and legacy shapes
 * (`promptTokens`, ...) accumulate. `raw` holds provider-specific data that is
 * not safe to sum, so the latest value wins.
 *
 * Example:
 * ```ts
 * mergeUsage({ inputTokens: 1 }, { inputTokens: 2 }); // { inputTokens: 3 }
 * ```
 */
export function mergeUsage(total: Usage | undefined, next: Usage | undefined): Usage | undefined {
  if (!next) {
    return total;
  }
  // Summing onto an empty record also copies the first step, so later steps
  // never mutate the usage object returned by the model client.
  return sumRecords((total ?? {}) as Record<string, unknown>, next as Record<string, unknown>) as Usage;
}

function sumRecords(total: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...total };
  for (const [key, value] of Object.entries(next)) {
    const current = merged[key];
    if (key === "raw") {
      merged[key] = value ?? current;
    } else if (typeof value === "number") {
      merged[key] = (typeof current === "number" ? current : 0) + value;
    } else if (isRecord(value)) {
      merged[key] = sumRecords(isRecord(current) ? current : {}, value);
    } else if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
