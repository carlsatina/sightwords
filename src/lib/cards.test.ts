import { describe, expect, it } from 'vitest'
import { detailKind, detailLabelKeys, detailSpeakKey, spokenDetail } from './cards'
import type { Card } from '@/types'

/**
 * One button reveals three different things. Calling them all "the sentence"
 * mislabelled two of them, and requiring a `word` card left kanji with no way
 * to reveal anything at all in big word mode.
 */

const word = (over: Partial<Card> = {}): Card =>
  ({
    kind: 'word',
    id: 'en:cat',
    language: 'en',
    levelId: 1,
    text: 'cat',
    sentence: 'The cat sat.',
    ...over,
  }) as Card

const kanji = (over: Partial<Card> = {}): Card =>
  ({
    kind: 'kanji',
    id: 'ja:一',
    language: 'ja',
    levelId: 3,
    char: '一',
    on: ['イチ'],
    kun: ['ひと'],
    meaning: 'one',
    example: { text: '一つ', reading: 'ひとつ', meaning: 'one thing' },
    ...over,
  }) as Card

describe('detailKind', () => {
  it('calls an English or Filipino reveal a sentence', () => {
    expect(detailKind(word())).toBe('sentence')
    expect(detailKind(word({ language: 'fil' } as Partial<Card>))).toBe('sentence')
  })

  it('calls a Japanese kana reveal an example, not a sentence', () => {
    // あ pairs with あり — a word, not a sentence. Japanese is not written with
    // spaces and the kana levels never carried sentences.
    expect(detailKind(word({ language: 'ja', text: 'あ', sentence: 'あり' } as Partial<Card>)))
      .toBe('example')
  })

  it('calls a kanji reveal a meaning', () => {
    expect(detailKind(kanji())).toBe('meaning')
  })

  it('reports nothing to reveal when a word has no sentence', () => {
    expect(detailKind(word({ sentence: '' } as Partial<Card>))).toBeNull()
  })

  it('always gives a kanji something to reveal', () => {
    // Regression: requiring a `word` card left kanji with no toggle at all in
    // big word mode, so readings and meaning were unreachable there.
    expect(detailKind(kanji({ example: undefined } as Partial<Card>))).toBe('meaning')
  })
})

describe('labels follow what is actually revealed', () => {
  it('names each kind distinctly', () => {
    const keys = (['sentence', 'example', 'meaning'] as const).map(
      (k) => detailLabelKeys(k).show,
    )
    expect(new Set(keys).size).toBe(3)
  })

  it('pairs a show label with a matching hide label', () => {
    for (const kind of ['sentence', 'example', 'meaning'] as const) {
      const { show, hide } = detailLabelKeys(kind)
      expect(show).not.toBe(hide)
    }
  })

  it('calls the speaker a sentence only for real sentences', () => {
    expect(detailSpeakKey('sentence')).toBe('speak.hearSentence')
    expect(detailSpeakKey('example')).toBe('speak.hearExample')
    expect(detailSpeakKey('meaning')).toBe('speak.hearExample')
  })
})

describe('spokenDetail', () => {
  it('reads a word card’s sentence', () => {
    expect(spokenDetail(word())).toBe('The cat sat.')
  })

  it('reads a kanji’s example word rather than its list of readings', () => {
    // "イチ・イツ ひと one" is not one utterance; 一つ is.
    expect(spokenDetail(kanji())).toBe('一つ')
  })

  it('returns null when there is nothing speakable', () => {
    expect(spokenDetail(word({ sentence: '' } as Partial<Card>))).toBeNull()
    expect(spokenDetail(kanji({ example: undefined } as Partial<Card>))).toBeNull()
  })
})
