/**
 * Streaks are a promise to a child, so day boundaries use the device's *local*
 * calendar date. Using UTC would silently break a streak for anyone practising
 * in the evening west of Greenwich.
 */

export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayKey(): string {
  return toLocalDateKey()
}

export function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toLocalDateKey(d)
}

/** Whole days between two YYYY-MM-DD keys, ignoring time and DST shifts. */
export function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number)
  const [ty, tm, td] = toKey.split('-').map(Number)
  const from = Date.UTC(fy, fm - 1, fd)
  const to = Date.UTC(ty, tm - 1, td)
  return Math.round((to - from) / 86_400_000)
}
