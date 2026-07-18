import type { LevelId } from '@/types'

export interface BadgeDefinition {
  id: string
  name: string
  /** Addressed to the child, present tense, no jargon. */
  description: string
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

function levelComplete(level: LevelId) {
  return (s: BadgeStats) =>
    s.levelSizes[level] > 0 && s.masteredByLevel[level] >= s.levelSizes[level]
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-word',
    name: 'First Word',
    description: 'You read your very first word.',
    emoji: '🌱',
    test: (s) => s.totalCorrect >= 1,
  },
  {
    id: 'ten-words',
    name: 'Ten in the Bag',
    description: 'You mastered 10 words.',
    emoji: '🎒',
    test: (s) => s.masteredCount >= 10,
  },
  {
    id: 'fifty-words',
    name: 'Word Collector',
    description: 'You mastered 50 words.',
    emoji: '📚',
    test: (s) => s.masteredCount >= 50,
  },
  {
    id: 'hundred-words',
    name: 'Century Reader',
    description: 'You mastered 100 words.',
    emoji: '🏆',
    test: (s) => s.masteredCount >= 100,
  },
  {
    id: 'streak-3',
    name: 'Three Days Strong',
    description: 'You practised 3 days in a row.',
    emoji: '🔥',
    test: (s) => s.longestStreak >= 3,
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'You practised 7 days in a row.',
    emoji: '⚡',
    test: (s) => s.longestStreak >= 7,
  },
  {
    id: 'streak-30',
    name: 'Month of Reading',
    description: 'You practised 30 days in a row.',
    emoji: '🌟',
    test: (s) => s.longestStreak >= 30,
  },
  {
    id: 'perfect-quiz',
    name: 'Perfect Score',
    description: 'You got every quiz question right.',
    emoji: '🎯',
    test: (s) => s.perfectQuizzes >= 1,
  },
  {
    id: 'quiz-master',
    name: 'Quiz Master',
    description: 'You aced 10 quizzes.',
    emoji: '🧠',
    test: (s) => s.perfectQuizzes >= 10,
  },
  {
    id: 'daily-5',
    name: 'Daily Habit',
    description: 'You finished 5 daily practices.',
    emoji: '📅',
    test: (s) => s.dailyCompletions >= 5,
  },
  {
    id: 'level-1',
    name: 'First Words Champion',
    description: 'You mastered every word in First Words.',
    emoji: '🐣',
    test: levelComplete(1),
  },
  {
    id: 'level-2',
    name: 'Growing Reader Champion',
    description: 'You mastered every word in Growing Reader.',
    emoji: '🌻',
    test: levelComplete(2),
  },
  {
    id: 'level-3',
    name: 'Story Time Champion',
    description: 'You mastered every word in Story Time.',
    emoji: '🦊',
    test: levelComplete(3),
  },
  {
    id: 'level-4',
    name: 'Confident Reader Champion',
    description: 'You mastered every word in Confident Reader.',
    emoji: '🚀',
    test: levelComplete(4),
  },
  {
    id: 'level-5',
    name: 'Word Explorer Champion',
    description: 'You mastered every word in Word Explorer.',
    emoji: '👑',
    test: levelComplete(5),
  },
]
