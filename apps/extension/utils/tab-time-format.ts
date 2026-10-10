/**
 * Locale-aware time labels for the tab center.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** A duration as the largest whole unit: "8 days", "3 hours", "12 minutes" */
export function formatIdleDuration(ms: number, locale: string): string {
  const value = Math.max(0, ms);
  const [amount, unit]: [number, Intl.RelativeTimeFormatUnit] =
    value >= DAY
      ? [Math.floor(value / DAY), "day"]
      : value >= HOUR
        ? [Math.floor(value / HOUR), "hour"]
        : [Math.max(1, Math.floor(value / MINUTE)), "minute"];
  try {
    return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "long" }).format(amount);
  } catch {
    return `${amount} ${unit}`;
  }
}

/** Close time: only the time for today, the date as well otherwise */
export function formatArchiveTime(timestamp: number, locale: string, now = Date.now()): string {
  const date = new Date(timestamp);
  const sameDay = new Date(now).toDateString() === date.toDateString();
  return new Intl.DateTimeFormat(locale, sameDay
    ? { hour: "2-digit", minute: "2-digit" }
    : { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
  ).format(date);
}

function formatUnit(amount: number, unit: "hour" | "minute", locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "long" }).format(amount);
  } catch {
    return `${amount} ${unit}`;
  }
}

/** Minutes as "3 hours 20 minutes", or "20 minutes" under an hour */
export function formatDurationMinutes(minutes: number, locale: string): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return formatUnit(rest, "minute", locale);
  return rest === 0
    ? formatUnit(hours, "hour", locale)
    : `${formatUnit(hours, "hour", locale)} ${formatUnit(rest, "minute", locale)}`;
}

/** Short weekday of a local date key (YYYY-MM-DD) */
export function formatWeekdayShort(dateKey: string, locale: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1, 12);
  try {
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
  } catch {
    return dateKey.slice(5);
  }
}
