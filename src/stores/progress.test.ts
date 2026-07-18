import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { MASTERY_STREAK, useProgressStore } from './progress'
import { getLevel } from '@/data/words'
import { todayKey } from '@/lib/dates'

function dateKeyOffsetBy(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function store() {
  return useProgressStore()
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('mastery', () => {
  it('starts empty', () => {
    expect(store().masteredCount).toBe(0)
  })

  it(`masters a word after ${MASTERY_STREAK} correct answers in a row`, () => {
    const p = store()
    for (let i = 0; i < MASTERY_STREAK - 1; i++) {
      p.recordAnswer('the', true, 'practice')
      expect(p.masteredIds.has('the')).toBe(false)
    }
    p.recordAnswer('the', true, 'practice')
    expect(p.masteredIds.has('the')).toBe(true)
  })

  it('revokes mastery on a miss and queues the word for review', () => {
    const p = store()
    for (let i = 0; i < MASTERY_STREAK; i++) p.recordAnswer('the', true, 'practice')

    p.recordAnswer('the', false, 'practice')

    expect(p.masteredIds.has('the')).toBe(false)
    expect(p.missedWordIds).toContain('the')
    // The historical tally survives — only the streak resets.
    expect(p.wordProgress['the'].correct).toBe(MASTERY_STREAK)
    expect(p.wordProgress['the'].incorrect).toBe(1)
  })

  it('clears a word from review once it is mastered again', () => {
    const p = store()
    p.recordAnswer('the', false, 'practice')
    expect(p.missedWordIds).toContain('the')

    for (let i = 0; i < MASTERY_STREAK; i++) p.recordAnswer('the', true, 'practice')
    expect(p.missedWordIds).not.toContain('the')
  })

  it('reports accuracy across every attempt', () => {
    const p = store()
    p.recordAnswer('a', true, 'quiz')
    p.recordAnswer('a', false, 'quiz')
    expect(p.totalAttempts).toBe(2)
    expect(p.accuracy).toBe(50)
  })
})

describe('streaks', () => {
  it('starts at one and does not grow twice in a day', () => {
    const p = store()
    p.recordAnswer('a', true, 'practice')
    expect(p.state.currentStreak).toBe(1)
    expect(p.state.lastPracticeDate).toBe(todayKey())

    p.recordAnswer('and', true, 'practice')
    expect(p.state.currentStreak).toBe(1)
  })

  it('continues when the last practice was yesterday', () => {
    const p = store()
    p.state.currentStreak = 4
    p.state.longestStreak = 4
    p.state.lastPracticeDate = dateKeyOffsetBy(-1)

    p.recordAnswer('big', true, 'practice')

    expect(p.state.currentStreak).toBe(5)
    expect(p.state.longestStreak).toBe(5)
  })

  it('resets after a gap but keeps the personal best', () => {
    const p = store()
    p.state.currentStreak = 5
    p.state.longestStreak = 5
    p.state.lastPracticeDate = dateKeyOffsetBy(-3)

    p.recordAnswer('blue', true, 'practice')

    expect(p.state.currentStreak).toBe(1)
    expect(p.state.longestStreak).toBe(5)
  })
})

describe('badges', () => {
  it('queues a newly earned badge exactly once', () => {
    const p = store()
    p.recordAnswer('a', true, 'practice')

    expect(p.badges.find((b) => b.id === 'first-word')?.earned).toBe(true)
    expect(p.pendingBadges.some((b) => b.id === 'first-word')).toBe(true)

    expect(p.drainPendingBadges().length).toBeGreaterThan(0)
    expect(p.pendingBadges).toHaveLength(0)

    p.recordAnswer('and', true, 'practice')
    expect(p.pendingBadges.some((b) => b.id === 'first-word')).toBe(false)
  })

  it('counts only flawless quizzes', () => {
    const p = store()
    p.recordQuizResult(10, 10)
    p.recordQuizResult(9, 10)
    p.recordQuizResult(0, 0) // An empty quiz is not a perfect one.
    expect(p.state.perfectQuizzes).toBe(1)
  })
})

describe('daily practice', () => {
  it('builds a set of the requested size with no repeats', () => {
    const session = store().ensureDailySession(10, [1, 2, 3, 4, 5])
    expect(session.wordIds).toHaveLength(10)
    expect(new Set(session.wordIds).size).toBe(10)
  })

  it('returns the same set for the rest of the day', () => {
    // A child who stops halfway must resume the same words, not a new draw.
    const p = store()
    const first = p.ensureDailySession(10, [1, 2, 3, 4, 5])
    const second = p.ensureDailySession(10, [1, 2, 3, 4, 5])
    expect(second.wordIds).toEqual(first.wordIds)
  })

  it('draws only from levels the parent left unlocked', () => {
    const session = store().ensureDailySession(10, [1])
    const levelOne = new Set(getLevel(1)!.words.map((w) => w.id))
    expect(session.wordIds.every((id) => levelOne.has(id))).toBe(true)
  })

  it('marks the day complete once, however many extra answers arrive', () => {
    const p = store()
    const session = p.ensureDailySession(5, [1, 2, 3, 4, 5])
    for (const id of session.wordIds) p.recordAnswer(id, true, 'daily')

    expect(p.dailyComplete).toBe(true)
    expect(p.state.dailyCompletions).toBe(1)

    p.recordAnswer(session.wordIds[0], true, 'daily')
    expect(p.state.dailyCompletions).toBe(1)
  })
})

describe('reset', () => {
  it('clears every trace of progress', () => {
    const p = store()
    for (let i = 0; i < MASTERY_STREAK; i++) p.recordAnswer('the', true, 'practice')
    p.ensureDailySession(5, [1])

    p.resetAll()

    expect(p.masteredCount).toBe(0)
    expect(p.earnedBadgeCount).toBe(0)
    expect(p.state.currentStreak).toBe(0)
    expect(p.daily).toBeNull()
  })

  it('does not leak state into a freshly created store', () => {
    // Regression: the initial state was built by spreading a shared constant,
    // so recorded answers mutated that constant and every later store — and
    // every reset — inherited the previous child's progress.
    const first = useProgressStore()
    for (let i = 0; i < MASTERY_STREAK; i++) {
      first.recordAnswer('the', true, 'practice')
    }
    expect(first.masteredCount).toBe(1)

    localStorage.clear()
    setActivePinia(createPinia())

    expect(useProgressStore().masteredCount).toBe(0)
  })
})
