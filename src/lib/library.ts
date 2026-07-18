import type { AccentName, LevelId, StoredLevel, WordLibrary } from '@/types'
import { LEVELS } from '@/data/words'

export const LIBRARY_VERSION = 1

const VALID_LEVEL_IDS: LevelId[] = [1, 2, 3, 4, 5]
const VALID_ACCENTS: AccentName[] = ['mint', 'marigold', 'coral', 'grape', 'ink']

/** The shipped word list, as an editable library. */
export function builtInLibrary(): WordLibrary {
  return {
    version: LIBRARY_VERSION,
    levels: LEVELS.map((level) => ({
      id: level.id,
      name: level.name,
      blurb: level.blurb,
      ageRange: level.ageRange,
      accent: level.accent,
      words: level.words.map((word) => ({
        text: word.text,
        sentence: word.sentence,
      })),
    })),
  }
}

export function normaliseWordId(text: string): string {
  return text.trim().toLowerCase()
}

export interface WordValidationInput {
  text: string
  sentence: string
  /** Every word id already in the library, excluding the one being edited. */
  takenIds: Set<string>
}

/**
 * Validates a single word. Returns a message naming what to fix, or null when
 * the word is good. Messages address the parent and say what to do.
 */
export function validateWord({
  text,
  sentence,
  takenIds,
}: WordValidationInput): string | null {
  const trimmed = text.trim()
  const trimmedSentence = sentence.trim()

  if (!trimmed) return 'Enter a word.'
  if (/\s/.test(trimmed)) return 'Enter a single word, with no spaces.'
  if (trimmed.length > 20) return 'That word is too long for a flash card.'
  if (!/^[\p{L}’'-]+$/u.test(trimmed)) {
    return 'Use letters only (apostrophes and hyphens are fine).'
  }
  if (takenIds.has(normaliseWordId(trimmed))) {
    return `“${trimmed}” is already in the word list.`
  }
  if (!trimmedSentence) return 'Enter a sentence that uses the word.'
  if (trimmedSentence.length > 120) return 'Keep the sentence short enough to read aloud.'

  // The quiz blanks the word out of its sentence when speech is unavailable,
  // and the sentence is the word's context everywhere else. A sentence without
  // the word in it breaks both.
  if (!sentenceContainsWord(trimmedSentence, trimmed)) {
    return `The sentence needs to use the word “${trimmed}”.`
  }

  return null
}

export function sentenceContainsWord(sentence: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, 'iu').test(sentence)
}

export class LibraryImportError extends Error {}

/**
 * Parses and checks an imported library. Throws LibraryImportError with a
 * message the parent can act on — a bad file must never be allowed to load and
 * leave the child with a broken or empty app.
 */
export function parseLibrary(raw: unknown): WordLibrary {
  if (typeof raw !== 'object' || raw === null) {
    throw new LibraryImportError('That file is not a word list.')
  }

  const candidate = raw as Partial<WordLibrary>

  if (candidate.version !== LIBRARY_VERSION) {
    throw new LibraryImportError(
      `That file uses word list format ${String(candidate.version ?? 'unknown')}, but this app reads format ${LIBRARY_VERSION}.`,
    )
  }
  if (!Array.isArray(candidate.levels) || candidate.levels.length === 0) {
    throw new LibraryImportError('That file has no levels in it.')
  }

  const seenIds = new Set<string>()
  const seenLevels = new Set<LevelId>()
  const levels: StoredLevel[] = []

  for (const [i, level] of candidate.levels.entries()) {
    const where = `Level ${i + 1}`

    if (typeof level !== 'object' || level === null) {
      throw new LibraryImportError(`${where} is not readable.`)
    }
    if (!VALID_LEVEL_IDS.includes(level.id)) {
      throw new LibraryImportError(`${where} has id “${String(level.id)}”; ids must be 1 to 5.`)
    }
    if (seenLevels.has(level.id)) {
      throw new LibraryImportError(`Level ${level.id} appears more than once.`)
    }
    seenLevels.add(level.id)

    if (typeof level.name !== 'string' || !level.name.trim()) {
      throw new LibraryImportError(`Level ${level.id} needs a name.`)
    }
    if (!VALID_ACCENTS.includes(level.accent)) {
      throw new LibraryImportError(
        `Level ${level.id} has colour “${String(level.accent)}”; use one of ${VALID_ACCENTS.join(', ')}.`,
      )
    }
    if (!Array.isArray(level.words)) {
      throw new LibraryImportError(`Level ${level.id} has no words list.`)
    }

    const words = level.words.map((word, wordIndex) => {
      if (
        typeof word !== 'object' ||
        word === null ||
        typeof word.text !== 'string' ||
        typeof word.sentence !== 'string'
      ) {
        throw new LibraryImportError(
          `Level ${level.id}, word ${wordIndex + 1} needs both a text and a sentence.`,
        )
      }

      const problem = validateWord({
        text: word.text,
        sentence: word.sentence,
        takenIds: seenIds,
      })
      if (problem) {
        throw new LibraryImportError(`Level ${level.id}, word ${wordIndex + 1}: ${problem}`)
      }

      seenIds.add(normaliseWordId(word.text))
      return { text: word.text.trim(), sentence: word.sentence.trim() }
    })

    levels.push({
      id: level.id,
      name: level.name.trim(),
      blurb: typeof level.blurb === 'string' ? level.blurb.trim() : '',
      ageRange: typeof level.ageRange === 'string' ? level.ageRange.trim() : '',
      accent: level.accent,
      words,
    })
  }

  if (seenIds.size === 0) {
    throw new LibraryImportError('That file has no words in it.')
  }

  levels.sort((a, b) => a.id - b.id)
  return { version: LIBRARY_VERSION, levels }
}
