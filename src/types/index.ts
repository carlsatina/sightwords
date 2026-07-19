/**
 * The app teaches early reading in several languages at once. Two rules shape
 * every type here:
 *
 *  1. A language owns its own levels. Filipino's progression is not English's
 *     with the words swapped out, and Japanese barely resembles either — it
 *     teaches syllabaries and characters, not sight words. Forcing one ladder
 *     on all three would misteach at least two of them.
 *  2. Card ids are namespaced by language. Filipino "at" (and) and English
 *     "at" are different words that a child learns separately; sharing an id
 *     would silently merge their mastery records.
 */

export type LanguageCode = 'en' | 'fil' | 'ja'

export interface Language {
  code: LanguageCode
  /** The language's name in English, for the parent-facing UI. */
  name: string
  /** The language's name in itself — what the child sees on the picker. */
  endonym: string
  /**
   * BCP-47 tag handed to the speech synthesiser. Not every device ships a
   * voice for every tag; see `useSpeech`.
   */
  speechLang: string
  /**
   * Tags to try, in order, when no voice matches `speechLang`. A substitute is
   * a deliberate compromise, not a silent one: the app labels it wherever a
   * parent can see it, because a wrong-language voice mispronounces some words
   * confidently enough that a child would learn the error.
   */
  fallbackSpeechLangs?: string[]
  levels: Level[]
}

/**
 * Levels are per-language and open-ended: English runs a six-level Dolch
 * ladder, Japanese only needs three. Ids are unique within a language, not
 * across the app.
 */
export type LevelId = number

export interface Level {
  id: LevelId
  name: string
  /** Who this level is for, in a parent's words. */
  blurb: string
  ageRange: string
  /** Token name used for the level's accent colour. */
  accent: AccentName
  cards: Card[]
}

export type AccentName = 'mint' | 'marigold' | 'coral' | 'grape' | 'ink'

// --- Cards ----------------------------------------------------------------

/**
 * A single thing to learn. Sight words and kanji are taught and tested so
 * differently — one is recognised as a whole shape and read aloud, the other
 * carries several readings plus a meaning — that a shared shape with optional
 * fields would leave every consumer guessing which half was populated. The
 * discriminant makes each renderer state which kind it handles.
 */
export type Card = WordCardData | KanjiCardData | LetterCardData

interface CardBase {
  /** Namespaced as `${language}:${text}`. Stable id and progress key. */
  id: string
  language: LanguageCode
  levelId: LevelId
}

export interface WordCardData extends CardBase {
  kind: 'word'
  text: string
  /**
   * Short sentence that puts the word in context, read aloud on request.
   * Reading a word in isolation is the test; reading it in a sentence is the
   * lesson.
   */
  sentence: string
  /**
   * English gloss, for a child whose stronger language is English. Optional:
   * an English card glossing itself would be noise, and a kana card's "meaning"
   * is a sound, not a word.
   *
   * Shown only in the reveal, never on the card face — a visible translation
   * would be read instead of the word the card is teaching.
   */
  meaning?: string
  /**
   * English translation of `sentence`. Glossing the word alone leaves the
   * example sentence opaque, which is where the word's actual usage lives —
   * knowing `ang` "marks the subject" means little until you see what the whole
   * sentence says.
   */
  sentenceMeaning?: string
}

/**
 * A single letter and the sound it makes — the first level of a phonics
 * progression, where a child learns that `s` says /sss/ before meeting any
 * whole word.
 *
 * Distinct from a word card because the thing being taught is a sound, not a
 * spelling: "Hear it" has to say /sss/, never "ess". Reading the letter *name*
 * aloud would teach the one thing a phonics programme is trying to avoid.
 */
export interface LetterCardData extends CardBase {
  kind: 'letter'
  letter: string
  /**
   * How the sound is written for a parent to say, e.g. "sss" for `s`. Not IPA:
   * the audience is a grown-up reading it off a card, not a linguist.
   */
  sound: string
  /** Two or three words beginning with the letter, to hear the sound in place. */
  examples: string[]
}

export interface KanjiCardData extends CardBase {
  kind: 'kanji'
  /** The character itself. Doubles as the card's display text. */
  char: string
  /** On'yomi (Chinese-derived) readings, in katakana. */
  on: string[]
  /** Kun'yomi (native Japanese) readings, in hiragana. */
  kun: string[]
  /** English gloss, e.g. "sun, day". */
  meaning: string
  /** Example word using the character, with its reading. */
  example?: { text: string; reading: string; meaning: string }
}

/** Display text for any card, for callers that just need something to show. */
export function cardText(card: Card): string {
  switch (card.kind) {
    case 'kanji':
      return card.char
    case 'letter':
      return card.letter
    default:
      return card.text
  }
}

// --- Stored (editable) shapes ---------------------------------------------

/** The editable part of a card. Its id is derived from language + text. */
export type CardDraft =
  | {
      kind: 'word'
      text: string
      sentence: string
      meaning?: string
      sentenceMeaning?: string
    }
  | { kind: 'letter'; letter: string; sound: string; examples: string[] }
  | {
      kind: 'kanji'
      char: string
      on: string[]
      kun: string[]
      meaning: string
      example?: { text: string; reading: string; meaning: string }
    }

export interface StoredLevel {
  id: LevelId
  name: string
  blurb: string
  ageRange: string
  accent: AccentName
  cards: CardDraft[]
}

export interface StoredLanguage {
  code: LanguageCode
  name: string
  endonym: string
  speechLang: string
  fallbackSpeechLangs?: string[]
  levels: StoredLevel[]
}

/**
 * The full library as saved and as exported. `version` lets a format change
 * reject or migrate an old export rather than misread it.
 *
 * Version 2 introduced languages and namespaced ids; version 1 files hold a
 * bare `levels` array of English sight words and are migrated on read.
 */
export interface CardLibrary {
  version: number
  languages: StoredLanguage[]
}

// --- Progress -------------------------------------------------------------

/** Per-card mastery record. Absent from the map until the card is first seen. */
export interface CardProgress {
  cardId: string
  correct: number
  incorrect: number
  /** ISO date-time of the most recent answer. */
  lastSeen: string
  /** Consecutive correct answers; 3+ counts as mastered. */
  streak: number
}

export type PracticeMode = 'flashcards' | 'practice' | 'quiz' | 'review' | 'daily'

/** One completed answer, recorded by any mode that judges correctness. */
export interface AnswerEvent {
  cardId: string
  correct: boolean
  mode: PracticeMode
  at: string
}

/**
 * A badge as the UI receives it. Its name and description are not here: they
 * are looked up from the locale by id at render time, so a child switching the
 * app to Filipino sees Filipino badge names rather than the English ones
 * frozen in at the moment they were earned.
 */
export interface Badge {
  id: string
  emoji: string
  /** Evaluated against progress state; true once earned. */
  earned: boolean
  earnedAt?: string
}

export interface DailySession {
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  cardIds: string[]
  completedCardIds: string[]
}

// --- Settings -------------------------------------------------------------

export interface Settings {
  /**
   * Bumped when a stored setting needs a one-time correction that a plain
   * default change cannot deliver — saved values override defaults, so an
   * existing user would otherwise keep a default they never chose. See
   * `migrate` in the settings store.
   */
  settingsVersion: number
  darkMode: 'light' | 'dark' | 'system'
  /** The language the child is currently practising. */
  language: LanguageCode
  /**
   * The language the app's own buttons and labels are written in. Kept
   * separate from `language` on purpose: a child practising Japanese may still
   * need the surrounding UI in English, and a Filipino-speaking parent may
   * want Filipino chrome around English practice.
   */
  uiLocale: LanguageCode
  speechEnabled: boolean
  /**
   * Speak each card as soon as it appears. Off by default: the child should
   * attempt it first, and in Practice mode hearing it first gives away the
   * answer outright. The "Hear it" button always works regardless.
   */
  autoSpeak: boolean
  speechRate: number
  /** Chosen voice per language; absent means "pick the best match". */
  speechVoiceURIs: Partial<Record<LanguageCode, string>>
  confettiEnabled: boolean
  /**
   * Show the Hear it, sentence and previous/next buttons in big word mode.
   *
   * On by default. It was off originally, on the theory that tapping and
   * swiping already did those jobs — but an invisible gesture is not a control,
   * and in practice nobody discovers them. A parent who wants the bare word can
   * still turn this off; the close button is always shown regardless, since
   * without it a touch device has no way out.
   */
  showFocusControls: boolean
  reduceMotion: boolean
  /** Levels the child may open, per language. */
  unlockedLevels: Partial<Record<LanguageCode, LevelId[]>>
  dailyGoal: number
}
