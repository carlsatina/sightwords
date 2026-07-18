import { describe, expect, it } from 'vitest'
import { daysBetween, toLocalDateKey } from './dates'
import { sample, shuffle } from './random'

describe('date keys', () => {
  it('zero-pads month and day', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('uses the local calendar date, not UTC', () => {
    // 11pm local on the 18th is the 18th, even where that is already the 19th
    // in UTC — otherwise an evening practice session lands on the wrong day.
    const lateEvening = new Date(2026, 6, 18, 23, 30)
    expect(toLocalDateKey(lateEvening)).toBe('2026-07-18')
  })

  it('counts whole days between keys', () => {
    expect(daysBetween('2026-07-18', '2026-07-18')).toBe(0)
    expect(daysBetween('2026-07-17', '2026-07-18')).toBe(1)
    expect(daysBetween('2026-07-10', '2026-07-18')).toBe(8)
  })

  it('counts across month and year boundaries', () => {
    expect(daysBetween('2026-06-30', '2026-07-01')).toBe(1)
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1)
    expect(daysBetween('2024-02-28', '2024-02-29')).toBe(1)
  })

  it('is unaffected by daylight saving transitions', () => {
    // A 23-hour day must still count as one day or streaks break twice a year.
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
  })
})

describe('shuffle and sample', () => {
  it('keeps every member and does not mutate the input', () => {
    const source = [1, 2, 3, 4, 5]
    const result = shuffle(source)
    expect(source).toEqual([1, 2, 3, 4, 5])
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('never returns more items than it was given', () => {
    expect(sample([1, 2, 3], 99)).toHaveLength(3)
    expect(sample([1, 2, 3], 2)).toHaveLength(2)
    expect(sample([], 5)).toHaveLength(0)
  })
})
