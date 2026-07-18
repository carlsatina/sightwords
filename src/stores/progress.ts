import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type {
  AnswerEvent,
  Badge,
  DailySession,
  LevelId,
  PracticeMode,
  WordProgress,
} from '@/types'
import { useWordsStore } from '@/stores/words'
import { BADGE_DEFINITIONS, type BadgeStats } from '@/data/badges'
import { STORAGE_KEYS, load, remove, save } from '@/lib/storage'
import { daysBetween, todayKey } from '@/lib/dates'
import { sample } from '@/lib/random'

/** Consecutive correct answers before a word counts as known. */
export const MASTERY_STREAK = 3

interface ProgressState {
  words: Record<string, WordProgress>
  /** Badge id → ISO timestamp it was earned. */
  earnedBadges: Record<string, string>
  currentStreak: number
  longestStreak: number
  lastPracticeDate: string | null
  dailyCompletions: number
  perfectQuizzes: number
  recentAnswers: AnswerEvent[]
}

/**
 * Built fresh on every call. A shared constant would be unsafe here: spreading
 * it only copies the top level, so `words` and `earnedBadges` would stay the
 * same objects the store then mutates — silently poisoning the defaults and
 * making a reset restore the very data it was meant to erase.
 */
function createEmptyState(): ProgressState {
  return {
    words: {},
    earnedBadges: {},
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null,
    dailyCompletions: 0,
    perfectQuizzes: 0,
    recentAnswers: [],
  }
}

/** Answer history is for the parent's recent-activity view, not an audit log. */
const MAX_RECENT_ANSWERS = 100

export const useProgressStore = defineStore('progress', () => {
  const words = useWordsStore()

  const state = ref<ProgressState>({
    ...createEmptyState(),
    ...load<Partial<ProgressState>>(STORAGE_KEYS.progress, {}),
  })

  const daily = ref<DailySession | null>(
    load<DailySession | null>(STORAGE_KEYS.daily, null),
  )

  /** Badges newly earned since the last time the UI drained this queue. */
  const pendingBadges = ref<Badge[]>([])

  // --- Derived ------------------------------------------------------------

  const wordProgress = computed(() => state.value.words)

  /**
   * Progress entries for words that are still in the library. A parent can
   * delete a word at any time; its old score must stop counting towards
   * mastery, review, and totals rather than haunting them as a phantom.
   */
  const liveEntries = computed(() =>
    Object.values(state.value.words).filter((w) => words.allIds.has(w.wordId)),
  )

  const masteredIds = computed(
    () =>
      new Set(
        liveEntries.value
          .filter((w) => w.streak >= MASTERY_STREAK)
          .map((w) => w.wordId),
      ),
  )

  const masteredCount = computed(() => masteredIds.value.size)

  /** Words answered incorrectly more recently than they were mastered. */
  const missedWordIds = computed(() =>
    liveEntries.value
      .filter((w) => w.incorrect > 0 && w.streak < MASTERY_STREAK)
      .sort((a, b) => b.incorrect - a.incorrect)
      .map((w) => w.wordId),
  )

  const totalCorrect = computed(() =>
    liveEntries.value.reduce((sum, w) => sum + w.correct, 0),
  )

  const totalAttempts = computed(() =>
    liveEntries.value.reduce((sum, w) => sum + w.correct + w.incorrect, 0),
  )

  const accuracy = computed(() =>
    totalAttempts.value === 0
      ? 0
      : Math.round((totalCorrect.value / totalAttempts.value) * 100),
  )

  const masteredByLevel = computed(() => {
    const result = {} as Record<LevelId, number>
    for (const level of words.levels) {
      result[level.id] = level.words.filter((w) =>
        masteredIds.value.has(w.id),
      ).length
    }
    return result
  })

  const levelSizes = computed(() => {
    const result = {} as Record<LevelId, number>
    for (const level of words.levels) result[level.id] = level.words.length
    return result
  })

  function levelPercent(levelId: LevelId): number {
    const size = levelSizes.value[levelId]
    return size === 0 ? 0 : Math.round((masteredByLevel.value[levelId] / size) * 100)
  }

  const overallPercent = computed(() =>
    words.allWords.length === 0
      ? 0
      : Math.round((masteredCount.value / words.allWords.length) * 100),
  )

  const badgeStats = computed<BadgeStats>(() => ({
    masteredCount: masteredCount.value,
    totalCorrect: totalCorrect.value,
    currentStreak: state.value.currentStreak,
    longestStreak: state.value.longestStreak,
    dailyCompletions: state.value.dailyCompletions,
    perfectQuizzes: state.value.perfectQuizzes,
    masteredByLevel: masteredByLevel.value,
    levelSizes: levelSizes.value,
  }))

  const badges = computed<Badge[]>(() =>
    BADGE_DEFINITIONS.map((def) => ({
      id: def.id,
      name: def.name,
      description: def.description,
      emoji: def.emoji,
      earned: Boolean(state.value.earnedBadges[def.id]),
      earnedAt: state.value.earnedBadges[def.id],
    })),
  )

  const earnedBadgeCount = computed(
    () => Object.keys(state.value.earnedBadges).length,
  )

  // --- Actions ------------------------------------------------------------

  /**
   * Rolls the practice streak forward for today. Called on every answer, but
   * only does work once per calendar day.
   */
  function touchStreak() {
    const today = todayKey()
    const last = state.value.lastPracticeDate
    if (last === today) return

    const gap = last ? daysBetween(last, today) : null
    // Yesterday continues the streak; any longer gap starts a new one.
    state.value.currentStreak = gap === 1 ? state.value.currentStreak + 1 : 1
    state.value.lastPracticeDate = today
    state.value.longestStreak = Math.max(
      state.value.longestStreak,
      state.value.currentStreak,
    )
  }

  function recordAnswer(wordId: string, correct: boolean, mode: PracticeMode) {
    const now = new Date().toISOString()
    const existing = state.value.words[wordId]
    const entry: WordProgress = existing
      ? { ...existing }
      : { wordId, correct: 0, incorrect: 0, lastSeen: now, streak: 0 }

    if (correct) {
      entry.correct += 1
      entry.streak += 1
    } else {
      entry.incorrect += 1
      // A miss resets mastery: the child has to prove it again.
      entry.streak = 0
    }
    entry.lastSeen = now
    state.value.words[wordId] = entry

    state.value.recentAnswers = [
      { wordId, correct, mode, at: now },
      ...state.value.recentAnswers,
    ].slice(0, MAX_RECENT_ANSWERS)

    touchStreak()

    if (mode === 'daily') markDailyWordDone(wordId)

    checkBadges()
  }

  function recordQuizResult(correctCount: number, total: number) {
    if (total > 0 && correctCount === total) {
      state.value.perfectQuizzes += 1
      checkBadges()
    }
  }

  /** Evaluates every badge and queues any that just flipped to earned. */
  function checkBadges() {
    const stats = badgeStats.value
    for (const def of BADGE_DEFINITIONS) {
      if (state.value.earnedBadges[def.id]) continue
      if (!def.test(stats)) continue
      const earnedAt = new Date().toISOString()
      state.value.earnedBadges[def.id] = earnedAt
      pendingBadges.value.push({
        id: def.id,
        name: def.name,
        description: def.description,
        emoji: def.emoji,
        earned: true,
        earnedAt,
      })
    }
  }

  function drainPendingBadges(): Badge[] {
    const drained = pendingBadges.value
    pendingBadges.value = []
    return drained
  }

  // --- Daily practice -----------------------------------------------------

  /**
   * Returns today's daily set, generating it on first call each day. The set is
   * stable for the whole day so a child who stops halfway resumes the same words.
   */
  function ensureDailySession(size: number, allowedLevels: LevelId[]): DailySession {
    const today = todayKey()
    if (daily.value?.date === today) return daily.value

    const pool = words.allWords.filter((w) => allowedLevels.includes(w.levelId))
    // Prefer words that aren't mastered yet; top up with mastered ones so the
    // set is always full even for a child who has learned nearly everything.
    const unmastered = pool.filter((w) => !masteredIds.value.has(w.id))
    const chosen = sample(unmastered, size)
    if (chosen.length < size) {
      const rest = pool.filter((w) => !chosen.some((c) => c.id === w.id))
      chosen.push(...sample(rest, size - chosen.length))
    }

    daily.value = {
      date: today,
      wordIds: chosen.map((w) => w.id),
      completedWordIds: [],
    }
    return daily.value
  }

  function markDailyWordDone(wordId: string) {
    const session = daily.value
    if (!session || session.date !== todayKey()) return
    if (!session.wordIds.includes(wordId)) return
    if (session.completedWordIds.includes(wordId)) return

    session.completedWordIds.push(wordId)
    if (session.completedWordIds.length === session.wordIds.length) {
      state.value.dailyCompletions += 1
    }
  }

  const dailyComplete = computed(() => {
    const session = daily.value
    if (!session || session.date !== todayKey()) return false
    return session.completedWordIds.length === session.wordIds.length
  })

  // --- Reset --------------------------------------------------------------

  function resetWord(wordId: string) {
    delete state.value.words[wordId]
  }

  function resetAll() {
    state.value = createEmptyState()
    daily.value = null
    pendingBadges.value = []
    remove(STORAGE_KEYS.daily)
  }

  watch(state, (value) => save(STORAGE_KEYS.progress, value), { deep: true })
  watch(daily, (value) => save(STORAGE_KEYS.daily, value), { deep: true })

  return {
    state,
    daily,
    pendingBadges,
    wordProgress,
    masteredIds,
    masteredCount,
    missedWordIds,
    totalCorrect,
    totalAttempts,
    accuracy,
    masteredByLevel,
    levelSizes,
    overallPercent,
    badges,
    earnedBadgeCount,
    dailyComplete,
    levelPercent,
    recordAnswer,
    recordQuizResult,
    checkBadges,
    drainPendingBadges,
    ensureDailySession,
    resetWord,
    resetAll,
  }
})
