import type { LevelId } from '@/types'

/**
 * A badge's name and description live in the locale files, keyed by id — a
 * child practising in Filipino should be congratulated in Filipino. What stays
 * here is the part that is not language: the id, the emoji, and the rule.
 */
export interface BadgeDefinition {
  id: string
  emoji: string
  test: (stats: BadgeStats) => boolean
}

export interface BadgeStats {
  masteredCount: number
  totalCorrect: number
  currentStreak: number
  longestStreak: number
  dailyCompletions: number
  perfectQuizzes: number
  masteredByLevel: Record<LevelId, number>
  levelSizes: Record<LevelId, number>
}

/**
 * Level badges are earned per level number in whichever language is being
 * practised — finishing Japanese level 1 earns the same badge as finishing
 * English level 1. Levels a language does not have (Japanese has no level 4)
 * simply never fire, since their size reads as undefined.
 */
function levelComplete(level: LevelId) {
  return (s: BadgeStats) => {
    const size = s.levelSizes[level]
    return size !== undefined && size > 0 && (s.masteredByLevel[level] ?? 0) >= size
  }
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-word',
    emoji: '🌱',
    test: (s) => s.totalCorrect >= 1,
  },
  {
    id: 'ten-words',
    emoji: '🎒',
    test: (s) => s.masteredCount >= 10,
  },
  {
    id: 'fifty-words',
    emoji: '📚',
    test: (s) => s.masteredCount >= 50,
  },
  {
    id: 'hundred-words',
    emoji: '🏆',
    test: (s) => s.masteredCount >= 100,
  },
  {
    id: 'streak-3',
    emoji: '🔥',
    test: (s) => s.longestStreak >= 3,
  },
  {
    id: 'streak-7',
    emoji: '⚡',
    test: (s) => s.longestStreak >= 7,
  },
  {
    id: 'streak-30',
    emoji: '🌟',
    test: (s) => s.longestStreak >= 30,
  },
  {
    id: 'perfect-quiz',
    emoji: '🎯',
    test: (s) => s.perfectQuizzes >= 1,
  },
  {
    id: 'quiz-master',
    emoji: '🧠',
    test: (s) => s.perfectQuizzes >= 10,
  },
  {
    id: 'daily-5',
    emoji: '📅',
    test: (s) => s.dailyCompletions >= 5,
  },
  {
    id: 'level-1',
    emoji: '🐣',
    test: levelComplete(1),
  },
  {
    id: 'level-2',
    emoji: '🌻',
    test: levelComplete(2),
  },
  {
    id: 'level-3',
    emoji: '🦊',
    test: levelComplete(3),
  },
  {
    id: 'level-4',
    emoji: '🚀',
    test: levelComplete(4),
  },
  {
    id: 'level-5',
    emoji: '👑',
    test: levelComplete(5),
  },
]
