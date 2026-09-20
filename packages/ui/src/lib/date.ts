/**
 * Date helpers for the `YYYY-MM-DD` form used by `Calendar`'s `data-date`
 * attribute and by anything that persists a calendar selection as a string.
 *
 * Both work in local time on purpose. `toISOString()` / `new Date('2026-09-20')`
 * go through UTC, which lands on the wrong day for anyone west of Greenwich.
 */

/** Formats a date as `YYYY-MM-DD` in local time */
export function toISODate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Parses `YYYY-MM-DD` into local midnight; returns undefined for anything else */
export function parseISODate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return undefined

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  // Rejects overflow like 2026-02-31, which the Date constructor rolls forward
  return date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)
    ? date
    : undefined
}
