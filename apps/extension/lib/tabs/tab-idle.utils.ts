/**
 * Idle evaluation for tabs.
 *
 * Day thresholds in usage-day mode only expire when BOTH hold:
 * - the wall clock time since lastActiveAt reaches the threshold, and
 * - the number of usage days after the date of lastActiveAt reaches the threshold.
 * Hour thresholds only look at wall clock time.
 *
 * Anything uncertain is treated as "just used": a timestamp in the future
 * (system clock moved back) counts as idle for zero time.
 */
import type {
  TabIdleCountBy,
  TabIdleState,
  TabIdleThreshold,
} from "@/types";
import { countUsageDaysAfter, toLocalDateKey } from "./usage-days.utils";

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/** "Idle" in the UI starts after this long without use */
export const IDLE_DISPLAY_MS = 24 * HOUR_MS;

export const IDLE_THRESHOLD_OPTIONS: readonly TabIdleThreshold[] = [
  { value: 12, unit: "hour" },
  { value: 1, unit: "day" },
  { value: 3, unit: "day" },
  { value: 7, unit: "day" },
  { value: 14, unit: "day" },
  { value: 30, unit: "day" },
];

export function thresholdToMs(threshold: TabIdleThreshold): number {
  const value = Math.max(1, threshold.value);
  return threshold.unit === "hour" ? value * HOUR_MS : value * DAY_MS;
}

export function isSameThreshold(a: TabIdleThreshold, b: TabIdleThreshold): boolean {
  return a.value === b.value && a.unit === b.unit;
}

/** Window before expiry in which an hour threshold is shown as "archiving soon" */
function getHourExpiringWindowMs(thresholdMs: number): number {
  return Math.min(thresholdMs / 4, 3 * HOUR_MS);
}

/**
 * The same for day thresholds: the last day, but never more than a quarter of the
 * threshold, so with a 1-day threshold a tab used minutes ago is not "archiving soon"
 */
function getDayExpiringWindowMs(thresholdMs: number): number {
  return Math.min(thresholdMs / 4, DAY_MS);
}

export interface IdleEvaluationInput {
  lastActiveAt: number;
  now: number;
  threshold: TabIdleThreshold;
  countBy: TabIdleCountBy;
  /** Sorted usage day keys */
  usageDays: readonly string[];
}

export interface IdleEvaluation {
  /** Wall clock idle time, never negative */
  idleMs: number;
  /** Usage days after the day of lastActiveAt, up to today */
  usageDaysSince: number;
  expired: boolean;
  /** Not expired yet but within the last usage day / window */
  expiring: boolean;
  /** Remaining wall clock time to the natural part of the threshold */
  remainingMs: number;
  /** Remaining usage days (usage-day mode with day thresholds only) */
  remainingUsageDays?: number;
}

export function evaluateIdle(input: IdleEvaluationInput): IdleEvaluation {
  const { now, threshold, countBy, usageDays } = input;
  // A record from the future means the clock moved back: treat it as just used
  const lastActiveAt = Math.min(input.lastActiveAt, now);
  const idleMs = Math.max(0, now - lastActiveAt);
  const thresholdMs = thresholdToMs(threshold);
  const remainingMs = Math.max(0, thresholdMs - idleMs);

  const usageDaysSince = countUsageDaysAfter(
    usageDays,
    toLocalDateKey(lastActiveAt),
    toLocalDateKey(now),
  );

  if (threshold.unit === "hour") {
    const expired = idleMs >= thresholdMs;
    return {
      idleMs,
      usageDaysSince,
      expired,
      expiring: !expired && remainingMs <= getHourExpiringWindowMs(thresholdMs),
      remainingMs,
    };
  }

  const naturalExpired = idleMs >= thresholdMs;
  const naturalExpiring = remainingMs <= getDayExpiringWindowMs(thresholdMs);

  if (countBy === "calendar") {
    return {
      idleMs,
      usageDaysSince,
      expired: naturalExpired,
      expiring: !naturalExpired && naturalExpiring,
      remainingMs,
    };
  }

  const requiredDays = Math.max(1, threshold.value);
  const remainingUsageDays = Math.max(0, requiredDays - usageDaysSince);
  const expired = naturalExpired && remainingUsageDays === 0;
  return {
    idleMs,
    usageDaysSince,
    expired,
    expiring: !expired && naturalExpiring && remainingUsageDays <= 1,
    remainingMs,
    remainingUsageDays,
  };
}

export function getIdleState(evaluation: IdleEvaluation): TabIdleState {
  if (evaluation.expired) return "expired";
  if (evaluation.expiring) return "expiring";
  return evaluation.idleMs >= IDLE_DISPLAY_MS ? "idle" : "fresh";
}

/**
 * Estimated moment the tab expires, assuming the browser keeps being used every day.
 * Only meaningful for tabs that are not expired yet.
 */
export function estimateExpiryAt(evaluation: IdleEvaluation, now: number): number {
  if (evaluation.expired) return now;
  const naturalAt = now + evaluation.remainingMs;
  if (evaluation.remainingUsageDays == null) return naturalAt;
  return Math.max(naturalAt, now + evaluation.remainingUsageDays * DAY_MS);
}
