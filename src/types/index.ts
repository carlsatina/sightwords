/** A single sight word, identified by its own text (words are unique app-wide). */
export interface SightWord {
  /** The word itself, lowercase. Doubles as its stable id. */
  id: string
  text: string
  levelId: LevelId
  /** Short sentence that puts the word in context, read aloud on request. */
  sentence: string
}

export type LevelId = 1 | 2 | 3 | 4 | 5

export interface Level {
  id: LevelId
  name: string
  /** Who this level is for, in a parent's words. */
  blurb: string
  ageRange: string
  /** Token name used for the level's accent colour. */
  accent: AccentName
  words: SightWord[]
}

export type AccentName = 'mint' | 'marigold' | 'coral' | 'grape' | 'ink'

/** Per-word mastery record. Absent from the map until the word is first seen. */
export interface WordProgress {
  wordId: string
  correct: number
  incorrect: number
  /** ISO date-time of the most recent answer. */
  lastSeen: string
  /** Consecutive correct answers; 3+ counts as mastered. */
  streak: number
}

/** The editable part of a word. Its id is derived from `text`. */
export interface WordDraft {
  text: string
  sentence: string
}

export interface StoredLevel {
  id: LevelId
  name: string
  blurb: string
  ageRange: string
  accent: AccentName
  words: WordDraft[]
}

/**
 * The full word list as saved and as exported. `version` lets a future format
 * change reject or migrate an old export rather than misread it.
 */
export interface WordLibrary {
  version: number
  levels: StoredLevel[]
}

export type PracticeMode = 'flashcards' | 'practice' | 'quiz' | 'review' | 'daily'

/** One completed answer, recorded by any mode that judges correctness. */
export interface AnswerEvent {
  wordId: string
  correct: boolean
  mode: PracticeMode
  at: string
}

export interface Badge {
  id: string
  name: string
  /** What the child did to earn it, addressed to the child. */
  description: string
  emoji: string
  /** Evaluated against progress state; true once earned. */
  earned: boolean
  earnedAt?: string
}

export interface DailySession {
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  wordIds: string[]
  completedWordIds: string[]
}

export interface Settings {
  darkMode: 'light' | 'dark' | 'system'
  speechEnabled: boolean
  /**
   * Speak each word as soon as it appears. Off by default: the child should
   * attempt the word first, and in Practice mode hearing it first gives away
   * the answer outright. The "Hear it" button always works regardless.
   */
  autoSpeak: boolean
  speechRate: number
  speechVoiceURI: string | null
  confettiEnabled: boolean
  reduceMotion: boolean
  /** Levels the child is allowed to open from the home screen. */
  unlockedLevels: LevelId[]
  dailyGoal: number
}
