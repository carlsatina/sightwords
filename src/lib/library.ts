import type {
  AccentName,
  CardDraft,
  CardLibrary,
  LanguageCode,
  StoredLanguage,
  StoredLevel,
} from '@/types'
import { BUILT_IN_LANGUAGES, isLanguageCode } from '@/data/languages'

/**
 * Version 1 held a bare `levels` array of English sight words with bare word
 * ids. Version 2 groups levels under languages and namespaces every id — see
 * `migrateV1`, which upgrades old saves and old exports in place.
 */
export const LIBRARY_VERSION = 2

const VALID_ACCENTS: AccentName[] = ['mint', 'marigold', 'coral', 'grape', 'ink']

/** The shipped word lists, as an editable library. */
export function builtInLibrary(): CardLibrary {
  // Deep-cloned so the store's mutations can never reach the module-level
  // constants — a parent editing a word must not change what "reset to the
  // built-in list" restores.
  return structuredClone({
    version: LIBRARY_VERSION,
    languages: BUILT_IN_LANGUAGES,
  })
}

/**
 * Cards are keyed by language and text together. Without the namespace,
 * Filipino "at" (and) and English "at" would share one mastery record, so a
 * child practising both would see their progress in one silently altered by
 * the other.
 */
export function cardId(language: LanguageCode, text: string): string {
  return `${language}:${text.trim().toLowerCase()}`
}

/** The display text a draft is keyed on. */
export function draftText(draft: CardDraft): string {
  switch (draft.kind) {
    case 'kanji':
      return draft.char
    case 'letter':
      return draft.letter
    default:
      return draft.text
  }
}

// --- Validation -----------------------------------------------------------

export interface CardValidationInput {
  draft: CardDraft
  language: LanguageCode
  /** Every card id already in this language, excluding the one being edited. */
  takenIds: Set<string>
}

/**
 * Validates a single card. Returns a message naming what to fix, or null when
 * the card is good. Messages address the parent and say what to do.
 */
export function validateCard({
  draft,
  language,
  takenIds,
}: CardValidationInput): string | null {
  switch (draft.kind) {
    case 'kanji':
      return validateKanji(draft, language, takenIds)
    case 'letter':
      return validateLetter(draft, language, takenIds)
    default:
      return validateWord(draft, language, takenIds)
  }
}

function validateLetter(
  draft: Extract<CardDraft, { kind: 'letter' }>,
  language: LanguageCode,
  takenIds: Set<string>,
): string | null {
  const letter = draft.letter.trim()

  if (!letter) return 'Enter a letter.'
  // Counted by code point so a digraph like "ck" or "qu" is allowed through as
  // the two-letter grapheme it is, while a whole word is not.
  if ([...letter].length > 2) return 'Enter a letter or a two-letter pair.'
  if (!/^\p{L}+$/u.test(letter)) return 'Use letters only.'
  if (takenIds.has(cardId(language, letter))) {
    return `“${letter}” is already in this language’s card list.`
  }
  // Without the sound there is nothing to teach and nothing to speak — the
  // card would show a shape and read out the letter's name instead.
  if (!draft.sound.trim()) return `Enter the sound “${letter}” makes.`
  if (draft.examples.length === 0) {
    return `Enter at least one word that uses “${letter}”.`
  }

  return null
}

function validateWord(
  draft: Extract<CardDraft, { kind: 'word' }>,
  language: LanguageCode,
  takenIds: Set<string>,
): string | null {
  const text = draft.text.trim()
  const sentence = draft.sentence.trim()

  if (!text) return 'Enter a word.'
  if (/\s/.test(text)) return 'Enter a single word, with no spaces.'
  if (text.length > 20) return 'That word is too long for a flash card.'
  // \p{M} admits combining marks, which some scripts need to write a single
  // letter; \p{L} alone would reject them.
  if (!/^[\p{L}\p{M}’'-]+$/u.test(text)) {
    return 'Use letters only (apostrophes and hyphens are fine).'
  }
  if (takenIds.has(cardId(language, text))) {
    return `“${text}” is already in this language’s word list.`
  }
  if (!sentence) return 'Enter a sentence that uses the word.'
  if (sentence.length > 120) return 'Keep the sentence short enough to read aloud.'
  // The gloss is optional, but an over-long one stops being a gloss.
  if (draft.meaning !== undefined && draft.meaning.trim().length > 60) {
    return 'Keep the English meaning short — a few words at most.'
  }

  // The quiz blanks the word out of its sentence when speech is unavailable,
  // and the sentence is the word's context everywhere else. A sentence without
  // the word in it breaks both.
  //
  // Japanese is exempt: it is not written with spaces, so there are no word
  // boundaries to anchor the check to, and the kana levels deliberately pair a
  // character with an example word rather than a sentence.
  if (language !== 'ja' && !sentenceContainsWord(sentence, text)) {
    return `The sentence needs to use the word “${text}”.`
  }

  return null
}

function validateKanji(
  draft: Extract<CardDraft, { kind: 'kanji' }>,
  language: LanguageCode,
  takenIds: Set<string>,
): string | null {
  const char = draft.char.trim()

  if (!char) return 'Enter a character.'
  // Counted by code point, not by UTF-16 unit: some kanji live outside the
  // basic plane and would otherwise read as two characters.
  if ([...char].length !== 1) return 'Enter exactly one character.'
  if (takenIds.has(cardId(language, char))) {
    return `“${char}” is already in this language’s card list.`
  }
  // A character with neither reading cannot be spoken or tested, which leaves
  // the card showing a shape with nothing to learn about it.
  if (draft.on.length === 0 && draft.kun.length === 0) {
    return `Enter at least one reading for “${char}”.`
  }
  if (!draft.meaning.trim()) return `Enter what “${char}” means.`

  return null
}

export function sentenceContainsWord(sentence: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, 'iu').test(sentence)
}

// --- Parsing and migration ------------------------------------------------

export class LibraryImportError extends Error {}

/** A version-1 library: English levels, no language grouping. */
interface LibraryV1 {
  version: 1
  levels: Array<{
    id: number
    name: string
    blurb?: string
    ageRange?: string
    accent: AccentName
    words: Array<{ text: string; sentence: string }>
  }>
}

/**
 * Rewrites a version-1 library as English inside a version-2 one. Every v1
 * word becomes an `en:`-namespaced card; `migrateProgressIds` does the
 * matching rewrite for saved mastery records so a child's streaks survive the
 * upgrade.
 */
export function migrateV1(old: LibraryV1): CardLibrary {
  const english = BUILT_IN_LANGUAGES.find((l) => l.code === 'en')!

  const levels: StoredLevel[] = (old.levels ?? []).map((level) => ({
    id: level.id,
    name: level.name,
    blurb: level.blurb ?? '',
    ageRange: level.ageRange ?? '',
    accent: level.accent,
    cards: (level.words ?? []).map<CardDraft>((word) => ({
      kind: 'word',
      text: word.text,
      sentence: word.sentence,
    })),
  }))

  return {
    version: LIBRARY_VERSION,
    languages: [
      { ...structuredClone(english), levels },
      // The other languages were not in the old save at all, so they come
      // across as shipped rather than as anything the parent had edited.
      ...BUILT_IN_LANGUAGES.filter((l) => l.code !== 'en').map((l) => structuredClone(l)),
    ],
  }
}

/**
 * Rewrites saved progress keys from bare v1 word ids ("jump") to namespaced v2
 * ids ("en:jump"). Keys that already carry a namespace are left alone, so this
 * is safe to run more than once.
 */
export function migrateProgressIds<T extends object>(
  words: Record<string, T>,
): Record<string, T & { cardId: string }> {
  const migrated: Record<string, T & { cardId: string }> = {}

  for (const [key, record] of Object.entries(words)) {
    const id = key.includes(':') ? key : cardId('en', key)
    // `wordId` was the v1 field name; drop it so a migrated record is
    // indistinguishable from one written fresh.
    const { wordId: _dropped, ...rest } = record as T & { wordId?: string }
    migrated[id] = { ...(rest as T), cardId: id }
  }

  return migrated
}

/** Rewrites a list of saved ids (a daily session's card list) the same way. */
export function migrateIdList(ids: string[]): string[] {
  return ids.map((id) => (id.includes(':') ? id : cardId('en', id)))
}

/**
 * Parses and checks an imported library, migrating older formats. Throws
 * LibraryImportError with a message the parent can act on — a bad file must
 * never load and leave the child with a broken or empty app.
 */
export function parseLibrary(raw: unknown): CardLibrary {
  if (typeof raw !== 'object' || raw === null) {
    throw new LibraryImportError('That file is not a word list.')
  }

  const candidate = raw as { version?: unknown }

  if (candidate.version === 1) {
    return parseV2(migrateV1(raw as LibraryV1))
  }
  if (candidate.version !== LIBRARY_VERSION) {
    throw new LibraryImportError(
      `That file uses word list format ${String(candidate.version ?? 'unknown')}, but this app reads format ${LIBRARY_VERSION}.`,
    )
  }

  return parseV2(raw as Partial<CardLibrary>)
}

function parseV2(candidate: Partial<CardLibrary>): CardLibrary {
  if (!Array.isArray(candidate.languages) || candidate.languages.length === 0) {
    throw new LibraryImportError('That file has no languages in it.')
  }

  const seenLanguages = new Set<LanguageCode>()
  const languages: StoredLanguage[] = []

  for (const [i, language] of candidate.languages.entries()) {
    const where = `Language ${i + 1}`

    if (typeof language !== 'object' || language === null) {
      throw new LibraryImportError(`${where} is not readable.`)
    }
    if (!isLanguageCode(language.code)) {
      throw new LibraryImportError(
        `${where} has code “${String(language.code)}”; this app knows en, fil and ja.`,
      )
    }
    if (seenLanguages.has(language.code)) {
      throw new LibraryImportError(`Language “${language.code}” appears more than once.`)
    }
    seenLanguages.add(language.code)

    if (!Array.isArray(language.levels) || language.levels.length === 0) {
      throw new LibraryImportError(`Language “${language.code}” has no levels in it.`)
    }

    // Ids only have to be unique within a language — that is the whole point
    // of the namespace — so the seen-set is scoped per language.
    const seenIds = new Set<string>()
    const seenLevels = new Set<number>()
    const levels = language.levels.map((level) =>
      parseLevel(level, language.code, seenIds, seenLevels),
    )

    if (seenIds.size === 0) {
      throw new LibraryImportError(`Language “${language.code}” has no cards in it.`)
    }

    levels.sort((a, b) => a.id - b.id)
    languages.push({
      code: language.code,
      name: typeof language.name === 'string' ? language.name : language.code,
      endonym: typeof language.endonym === 'string' ? language.endonym : language.code,
      speechLang:
        typeof language.speechLang === 'string' ? language.speechLang : language.code,
      // Substitute voice tags are part of the language definition, not user
      // content, so a file that omits them inherits the shipped list rather
      // than silently losing the stand-in.
      fallbackSpeechLangs: Array.isArray(language.fallbackSpeechLangs)
        ? language.fallbackSpeechLangs.filter((t) => typeof t === 'string')
        : BUILT_IN_LANGUAGES.find((l) => l.code === language.code)
            ?.fallbackSpeechLangs,
      levels,
    })
  }

  return { version: LIBRARY_VERSION, languages }
}

function parseLevel(
  level: unknown,
  language: LanguageCode,
  seenIds: Set<string>,
  seenLevels: Set<number>,
): StoredLevel {
  if (typeof level !== 'object' || level === null) {
    throw new LibraryImportError(`A level in “${language}” is not readable.`)
  }

  const candidate = level as Partial<StoredLevel>
  const where = `“${language}” level ${String(candidate.id)}`

  if (
    typeof candidate.id !== 'number' ||
    !Number.isInteger(candidate.id) ||
    candidate.id < 1
  ) {
    throw new LibraryImportError(
      `A level in “${language}” has id “${String(candidate.id)}”; ids must be whole numbers from 1 up.`,
    )
  }
  if (seenLevels.has(candidate.id)) {
    throw new LibraryImportError(`${where} appears more than once.`)
  }
  seenLevels.add(candidate.id)

  if (typeof candidate.name !== 'string' || !candidate.name.trim()) {
    throw new LibraryImportError(`${where} needs a name.`)
  }
  if (!VALID_ACCENTS.includes(candidate.accent as AccentName)) {
    throw new LibraryImportError(
      `${where} has colour “${String(candidate.accent)}”; use one of ${VALID_ACCENTS.join(', ')}.`,
    )
  }
  if (!Array.isArray(candidate.cards)) {
    throw new LibraryImportError(`${where} has no cards list.`)
  }

  const cards = candidate.cards.map((card, index) =>
    parseCard(card, index, language, where, seenIds),
  )

  return {
    id: candidate.id,
    name: candidate.name.trim(),
    blurb: typeof candidate.blurb === 'string' ? candidate.blurb.trim() : '',
    ageRange: typeof candidate.ageRange === 'string' ? candidate.ageRange.trim() : '',
    accent: candidate.accent as AccentName,
    cards,
  }
}

function parseCard(
  card: unknown,
  index: number,
  language: LanguageCode,
  where: string,
  seenIds: Set<string>,
): CardDraft {
  if (typeof card !== 'object' || card === null) {
    throw new LibraryImportError(`${where}, card ${index + 1} is not readable.`)
  }

  const candidate = card as Partial<CardDraft> & { kind?: string }
  // Version 2 files written by this app always carry a kind; a hand-written
  // file that omits it is far more likely to be a word than a kanji.
  const kind = candidate.kind ?? 'word'
  let draft: CardDraft

  if (kind === 'kanji') {
    const k = candidate as Extract<CardDraft, { kind: 'kanji' }>
    if (typeof k.char !== 'string' || typeof k.meaning !== 'string') {
      throw new LibraryImportError(
        `${where}, card ${index + 1} needs both a character and a meaning.`,
      )
    }
    draft = {
      kind: 'kanji',
      char: k.char.trim(),
      on: Array.isArray(k.on) ? k.on.filter((r) => typeof r === 'string') : [],
      kun: Array.isArray(k.kun) ? k.kun.filter((r) => typeof r === 'string') : [],
      meaning: k.meaning.trim(),
      ...(k.example ? { example: k.example } : {}),
    }
  } else if (kind === 'letter') {
    const l = candidate as Extract<CardDraft, { kind: 'letter' }>
    if (typeof l.letter !== 'string' || typeof l.sound !== 'string') {
      throw new LibraryImportError(
        `${where}, card ${index + 1} needs both a letter and a sound.`,
      )
    }
    draft = {
      kind: 'letter',
      letter: l.letter.trim(),
      sound: l.sound.trim(),
      examples: Array.isArray(l.examples)
        ? l.examples.filter((e) => typeof e === 'string' && e.trim())
        : [],
    }
  } else if (kind === 'word') {
    const w = candidate as Extract<CardDraft, { kind: 'word' }>
    if (typeof w.text !== 'string' || typeof w.sentence !== 'string') {
      throw new LibraryImportError(
        `${where}, card ${index + 1} needs both a text and a sentence.`,
      )
    }
    draft = {
      kind: 'word',
      text: w.text.trim(),
      sentence: w.sentence.trim(),
      ...(typeof w.meaning === 'string' && w.meaning.trim()
        ? { meaning: w.meaning.trim() }
        : {}),
      ...(typeof w.sentenceMeaning === 'string' && w.sentenceMeaning.trim()
        ? { sentenceMeaning: w.sentenceMeaning.trim() }
        : {}),
    }
  } else {
    throw new LibraryImportError(
      `${where}, card ${index + 1} has kind “${kind}”; use “word”, “letter” or “kanji”.`,
    )
  }

  const problem = validateCard({ draft, language, takenIds: seenIds })
  if (problem) {
    throw new LibraryImportError(`${where}, card ${index + 1}: ${problem}`)
  }

  seenIds.add(cardId(language, draftText(draft)))
  return draft
}
