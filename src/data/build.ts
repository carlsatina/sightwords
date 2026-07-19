import type { AccentName, CardDraft, LevelId, StoredLevel } from '@/types'

/**
 * Builders for the shipped word lists. They exist so each language's data file
 * reads as content rather than as object literals — a parent or teacher adding
 * words should be able to follow the pattern without knowing the type layout.
 */

type LevelMeta = {
  name: string
  blurb: string
  ageRange: string
  accent: AccentName
}

/**
 * A sight word, the sentence that gives it context, and optionally an English
 * gloss for languages a child may be learning as their second.
 */
export type RawWord = readonly [
  text: string,
  sentence: string,
  meaning?: string,
  sentenceMeaning?: string,
]

export function wordLevel(
  id: LevelId,
  meta: LevelMeta,
  words: readonly RawWord[],
): StoredLevel {
  const cards: CardDraft[] = words.map(
    ([text, sentence, meaning, sentenceMeaning]) => ({
      kind: 'word',
      text,
      sentence,
      ...(meaning ? { meaning } : {}),
      ...(sentenceMeaning ? { sentenceMeaning } : {}),
    }),
  )
  return { id, ...meta, cards }
}

/** A letter, the sound it makes, and words that start with it. */
export type RawLetter = readonly [letter: string, sound: string, examples: string]

export function letterLevel(
  id: LevelId,
  meta: LevelMeta,
  letters: readonly RawLetter[],
): StoredLevel {
  const cards: CardDraft[] = letters.map(([letter, sound, examples]) => ({
    kind: 'letter',
    letter,
    sound,
    // Written space-separated in the data so a row stays readable at a glance.
    examples: examples.split(' ').filter(Boolean),
  }))
  return { id, ...meta, cards }
}

/**
 * A kanji entry: character, on'yomi (katakana), kun'yomi (hiragana), English
 * meaning, and optionally an example word with its reading and gloss.
 */
export type RawKanji = readonly [
  char: string,
  on: string,
  kun: string,
  meaning: string,
  example?: readonly [text: string, reading: string, meaning: string],
]

export function kanjiLevel(
  id: LevelId,
  meta: LevelMeta,
  kanji: readonly RawKanji[],
): StoredLevel {
  const cards: CardDraft[] = kanji.map(([char, on, kun, meaning, example]) => ({
    kind: 'kanji',
    char,
    // Readings are written space-separated in the data for legibility; a kanji
    // with no reading of one kind (rare but real, e.g. 円 has no kun'yomi in
    // common use) gets an empty list rather than a list holding "".
    on: on ? on.split(' ') : [],
    kun: kun ? kun.split(' ') : [],
    meaning,
    ...(example
      ? { example: { text: example[0], reading: example[1], meaning: example[2] } }
      : {}),
  }))
  return { id, ...meta, cards }
}
