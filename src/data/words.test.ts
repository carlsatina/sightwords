import { describe, expect, it } from 'vitest'
import { ALL_WORDS, LEVELS, getLevel, getWord } from './words'
import { BADGE_DEFINITIONS, type BadgeStats } from './badges'

describe('word lists', () => {
  it('has five levels', () => {
    expect(LEVELS).toHaveLength(5)
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5])
  })

  it('gives every word a unique id', () => {
    const ids = ALL_WORDS.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('derives the id from the word text', () => {
    expect(ALL_WORDS.every((w) => w.id === w.text.toLowerCase())).toBe(true)
  })

  it('puts each word inside its own example sentence', () => {
    // A sentence that omits its word teaches nothing about that word.
    const orphans = ALL_WORDS.filter(
      (w) => !new RegExp(`\\b${w.text}\\b`, 'i').test(w.sentence),
    )
    expect(orphans.map((w) => `${w.text}: ${w.sentence}`)).toEqual([])
  })

  it('tags every word with the level that contains it', () => {
    for (const level of LEVELS) {
      expect(level.words.every((w) => w.levelId === level.id)).toBe(true)
    }
  })

  it('looks words up by id', () => {
    expect(getWord('the')?.text).toBe('the')
    expect(getWord('not-a-word')).toBeUndefined()
    expect(getLevel(1)?.name).toBe('First Words')
  })
})

describe('badges', () => {
  const levelSizes = Object.fromEntries(
    LEVELS.map((l) => [l.id, l.words.length]),
  ) as BadgeStats['levelSizes']

  const zero: BadgeStats = {
    masteredCount: 0,
    totalCorrect: 0,
    currentStreak: 0,
    longestStreak: 0,
    dailyCompletions: 0,
    perfectQuizzes: 0,
    masteredByLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    levelSizes,
  }

  it('awards nothing to a child who has not started', () => {
    expect(BADGE_DEFINITIONS.filter((b) => b.test(zero))).toEqual([])
  })

  it('uses unique badge ids', () => {
    const ids = BADGE_DEFINITIONS.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('awards the first-word badge on the first correct answer', () => {
    const badge = BADGE_DEFINITIONS.find((b) => b.id === 'first-word')!
    expect(badge.test({ ...zero, totalCorrect: 1 })).toBe(true)
  })

  it('completes a level only when every word in it is mastered', () => {
    const badge = BADGE_DEFINITIONS.find((b) => b.id === 'level-1')!
    expect(
      badge.test({
        ...zero,
        masteredByLevel: { ...zero.masteredByLevel, 1: levelSizes[1] - 1 },
      }),
    ).toBe(false)
    expect(
      badge.test({
        ...zero,
        masteredByLevel: { ...zero.masteredByLevel, 1: levelSizes[1] },
      }),
    ).toBe(true)
  })

  it('does not treat an empty level as complete', () => {
    // Guards against a level-complete badge being handed out for free if a
    // level's word list is ever emptied.
    const badge = BADGE_DEFINITIONS.find((b) => b.id === 'level-1')!
    expect(
      badge.test({
        ...zero,
        levelSizes: { ...levelSizes, 1: 0 },
      }),
    ).toBe(false)
  })
})
