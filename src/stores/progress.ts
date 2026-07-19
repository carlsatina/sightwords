import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type {
  AnswerEvent,
  Badge,
  CardProgress,
  DailySession,
  LevelId,
  PracticeMode,
} from '@/types'
import { useCardsStore } from '@/stores/cards'
import { BADGE_DEFINITIONS, type BadgeStats } from '@/data/badges'
import { STORAGE_KEYS, load, remove, save } from '@/lib/storage'
import { daysBetween, todayKey } from '@/lib/dates'
import { migrateIdList, migrateProgressIds } from '@/lib/library'
import { sample } from '@/lib/random'

/** Consecutive correct answers before a word counts as known. */
export const MASTERY_STREAK = 3

interface ProgressState {
  cards: Record<string, CardProgress>
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
    cards: {},
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
  const cards = useCardsStore()

  // Saved progress from before the app spoke more than one language keys words
  // by bare text ("jump"); v2 keys them by language ("en:jump"). Rewriting on
  // load is what keeps an existing child's streaks and mastery intact through
  // the upgrade.
  const state = ref<ProgressState>(hydrateState())

  function hydrateState(): ProgressState {
    const stored = load<Partial<ProgressState> & { words?: Record<string, object> }>(
      STORAGE_KEYS.progress,
      {},
    )
    const { words: legacy, ...rest } = stored
    const raw = stored.cards ?? legacy ?? {}

    return {
      ...createEmptyState(),
      ...rest,
      cards: migrateProgressIds(raw) as Record<string, CardProgress>,
      recentAnswers: (stored.recentAnswers ?? []).map((answer) => {
        const legacyId = (answer as AnswerEvent & { wordId?: string }).wordId
        const id = answer.cardId ?? legacyId ?? ''
        return { ...answer, cardId: id.includes(':') ? id : `en:${id.toLowerCase()}` }
      }),
    }
  }

  const daily = ref<DailySession | null>(hydrateDaily())

  function hydrateDaily(): DailySession | null {
    const stored = load<
      (DailySession & { wordIds?: string[]; completedWordIds?: string[] }) | null
    >(STORAGE_KEYS.daily, null)
    if (!stored) return null

    return {
      date: stored.date,
      cardIds: migrateIdList(stored.cardIds ?? stored.wordIds ?? []),
      completedCardIds: migrateIdList(
        stored.completedCardIds ?? stored.completedWordIds ?? [],
      ),
    }
  }

  /** Badges newly earned since the last time the UI drained this queue. */
  const pendingBadges = ref<Badge[]>([])

  // --- Derived ------------------------------------------------------------

  const cardProgress = computed(() => state.value.cards)

  /**
   * Progress entries for cards that are still in the library, across every
   * language. A parent can delete a card at any time; its old score must stop
   * counting towards mastery, review, and totals rather than haunting them as
   * a phantom.
   *
   * Deliberately global: practice in any language feeds one streak, one daily
   * goal, and one badge shelf. A bilingual child is doing more work, not two
   * separate smaller amounts of it, and splitting the rewards would punish
   * them for it.
   */
  const liveEntries = computed(() => {
    const live = new Set(cards.everyCard.map((c) => c.id))
    return Object.values(state.value.cards).filter((c) => live.has(c.cardId))
  })

  const masteredIds = computed(
    () =>
      new Set(
        liveEntries.value
          .filter((c) => c.streak >= MASTERY_STREAK)
          .map((c) => c.cardId),
      ),
  )

  const masteredCount = computed(() => masteredIds.value.size)

  /**
   * Cards answered incorrectly more recently than they were mastered, in the
   * language being practised — Review is a practice mode, so it must not hand
   * a child Japanese kanji in the middle of an English session.
   */
  const missedCardIds = computed(() =>
    liveEntries.value
      .filter(
        (c) =>
          c.incorrect > 0 && c.streak < MASTERY_STREAK && cards.allIds.has(c.cardId),
      )
      .sort((a, b) => b.incorrect - a.incorrect)
      .map((c) => c.cardId),
  )

  const totalCorrect = computed(() =>
    liveEntries.value.reduce((sum, c) => sum + c.correct, 0),
  )

  const totalAttempts = computed(() =>
    liveEntries.value.reduce((sum, c) => sum + c.correct + c.incorrect, 0),
  )

  const accuracy = computed(() =>
    totalAttempts.value === 0
      ? 0
      : Math.round((totalCorrect.value / totalAttempts.value) * 100),
  )

  // Level stats are scoped to the language on screen: level 1 means something
  // different in each language, so summing them would be meaningless.
  const masteredByLevel = computed(() => {
    const result = {} as Record<LevelId, number>
    for (const level of cards.levels) {
      result[level.id] = level.cards.filter((c) => masteredIds.value.has(c.id)).length
    }
    return result
  })

  const levelSizes = computed(() => {
    const result = {} as Record<LevelId, number>
    for (const level of cards.levels) result[level.id] = level.cards.length
    return result
  })

  function levelPercent(levelId: LevelId): number {
    const size = levelSizes.value[levelId]
    return size === undefined || size === 0
      ? 0
      : Math.round((masteredByLevel.value[levelId] / size) * 100)
  }

  /** Progress through the language currently being practised. */
  const overallPercent = computed(() => {
    const total = cards.allCards.length
    if (total === 0) return 0
    const mastered = cards.allCards.filter((c) => masteredIds.value.has(c.id)).length
    return Math.round((mastered / total) * 100)
  })

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

  function recordAnswer(cardId: string, correct: boolean, mode: PracticeMode) {
    const now = new Date().toISOString()
    const existing = state.value.cards[cardId]
    const entry: CardProgress = existing
      ? { ...existing }
      : { cardId, correct: 0, incorrect: 0, lastSeen: now, streak: 0 }

    if (correct) {
      entry.correct += 1
      entry.streak += 1
    } else {
      entry.incorrect += 1
      // A miss resets mastery: the child has to prove it again.
      entry.streak = 0
    }
    entry.lastSeen = now
    state.value.cards[cardId] = entry

    state.value.recentAnswers = [
      { cardId, correct, mode, at: now },
      ...state.value.recentAnswers,
    ].slice(0, MAX_RECENT_ANSWERS)

    touchStreak()

    if (mode === 'daily') markDailyCardDone(cardId)

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

    // Drawn from the current language only — a daily set mixing scripts would
    // ask a child to switch languages card to card.
    const pool = cards.allCards.filter((c) => allowedLevels.includes(c.levelId))
    // Prefer cards that aren't mastered yet; top up with mastered ones so the
    // set is always full even for a child who has learned nearly everything.
    const unmastered = pool.filter((c) => !masteredIds.value.has(c.id))
    const chosen = sample(unmastered, size)
    if (chosen.length < size) {
      const rest = pool.filter((c) => !chosen.some((picked) => picked.id === c.id))
      chosen.push(...sample(rest, size - chosen.length))
    }

    daily.value = {
      date: today,
      cardIds: chosen.map((c) => c.id),
      completedCardIds: [],
    }
    return daily.value
  }

  function markDailyCardDone(cardId: string) {
    const session = daily.value
    if (!session || session.date !== todayKey()) return
    if (!session.cardIds.includes(cardId)) return
    if (session.completedCardIds.includes(cardId)) return

    session.completedCardIds.push(cardId)
    if (session.completedCardIds.length === session.cardIds.length) {
      state.value.dailyCompletions += 1
    }
  }

  const dailyComplete = computed(() => {
    const session = daily.value
    if (!session || session.date !== todayKey()) return false
    return session.completedCardIds.length === session.cardIds.length
  })

  // --- Reset --------------------------------------------------------------

  function resetCard(cardId: string) {
    delete state.value.cards[cardId]
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
    cardProgress,
    masteredIds,
    masteredCount,
    missedCardIds,
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
    resetCard,
    resetAll,
  }
})
