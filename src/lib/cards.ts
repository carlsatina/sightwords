import type { Card } from '@/types'

/**
 * What a card's reveal actually contains. Three different things hide behind
 * one "show more" button, and calling them all "the sentence" mislabels two of
 * them:
 *
 *  - `sentence` — an English or Filipino word in a full sentence.
 *  - `example`  — a Japanese kana paired with a word that starts with it
 *                 (あ → あり). A word, not a sentence.
 *  - `meaning`  — a kanji's readings and English gloss.
 *
 * Returns null when there is nothing to reveal, which is how callers decide
 * whether to render the toggle at all.
 */
export type DetailKind = 'sentence' | 'example' | 'meaning'

export function detailKind(card: Card): DetailKind | null {
  if (card.kind === 'kanji') return 'meaning'
  if (!card.sentence) return null
  // Japanese is not written with spaces and the kana levels deliberately pair a
  // character with an example word rather than a sentence.
  return card.language === 'ja' ? 'example' : 'sentence'
}

/** Message keys for the reveal toggle, matched to what it actually reveals. */
export function detailLabelKeys(kind: DetailKind): { show: string; hide: string } {
  switch (kind) {
    case 'meaning':
      return { show: 'session.showMeaning', hide: 'session.hideMeaning' }
    case 'example':
      return { show: 'session.showExample', hide: 'session.hideExample' }
    default:
      return { show: 'session.showSentence', hide: 'session.hideSentence' }
  }
}

/** Message key for the button that reads the revealed text aloud. */
export function detailSpeakKey(kind: DetailKind): string {
  return kind === 'sentence' ? 'speak.hearSentence' : 'speak.hearExample'
}

/**
 * The revealed text worth speaking, or null when there is none.
 *
 * A kanji's reveal is a list of readings and a gloss, which is not one
 * utterance — its example word is, so that is what gets read.
 */
export function spokenDetail(card: Card): string | null {
  if (card.kind === 'word') return card.sentence || null
  return card.example?.text ?? null
}
