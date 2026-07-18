import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Level, LevelId, SightWord, WordDraft, WordLibrary } from '@/types'
import { STORAGE_KEYS, load, remove, save } from '@/lib/storage'
import {
  LIBRARY_VERSION,
  builtInLibrary,
  normaliseWordId,
  parseLibrary,
  validateWord,
} from '@/lib/library'

/**
 * Owns the word list the whole app reads. Falls back to the shipped list until
 * a parent edits something, at which point the edited library is saved whole.
 */
export const useWordsStore = defineStore('words', () => {
  const stored = load<WordLibrary | null>(STORAGE_KEYS.words, null)

  // A saved library that no longer parses (hand-edited, or from a future
  // version) must not brick the app — fall back to the built-in list.
  const initial = (() => {
    if (!stored) return builtInLibrary()
    try {
      return parseLibrary(stored)
    } catch {
      return builtInLibrary()
    }
  })()

  const library = ref<WordLibrary>(initial)
  const isCustomised = ref(stored !== null)

  const levels = computed<Level[]>(() =>
    library.value.levels.map((level) => ({
      id: level.id,
      name: level.name,
      blurb: level.blurb,
      ageRange: level.ageRange,
      accent: level.accent,
      words: level.words.map<SightWord>((word) => ({
        id: normaliseWordId(word.text),
        text: word.text,
        levelId: level.id,
        sentence: word.sentence,
      })),
    })),
  )

  const allWords = computed<SightWord[]>(() => levels.value.flatMap((l) => l.words))

  const wordsById = computed(() => new Map(allWords.value.map((w) => [w.id, w])))

  const allIds = computed(() => new Set(wordsById.value.keys()))

  function getWord(id: string): SightWord | undefined {
    return wordsById.value.get(id)
  }

  function getLevel(id: LevelId): Level | undefined {
    return levels.value.find((level) => level.id === id)
  }

  function levelSlot(id: LevelId) {
    return library.value.levels.find((level) => level.id === id)
  }

  /** Ids already in use, optionally ignoring one word being edited in place. */
  function takenIds(exceptId?: string): Set<string> {
    const ids = new Set(allIds.value)
    if (exceptId) ids.delete(exceptId)
    return ids
  }

  /**
   * Marks the library as edited and writes it immediately. Word edits are
   * deliberate, infrequent, and the parent's own data — writing synchronously
   * means a change survives the tab being closed a moment later, which a
   * next-tick watcher would not guarantee.
   */
  function markCustomised() {
    isCustomised.value = true
    save(STORAGE_KEYS.words, library.value)
  }

  // --- Mutations ----------------------------------------------------------

  /** Returns null on success, or a message naming what to fix. */
  function addWord(levelId: LevelId, draft: WordDraft): string | null {
    const level = levelSlot(levelId)
    if (!level) return 'That level does not exist.'

    const problem = validateWord({ ...draft, takenIds: takenIds() })
    if (problem) return problem

    level.words.push({ text: draft.text.trim(), sentence: draft.sentence.trim() })
    markCustomised()
    return null
  }

  function updateWord(
    levelId: LevelId,
    wordId: string,
    draft: WordDraft,
  ): string | null {
    const level = levelSlot(levelId)
    if (!level) return 'That level does not exist.'

    const index = level.words.findIndex((w) => normaliseWordId(w.text) === wordId)
    if (index === -1) return 'That word is no longer in the list.'

    const problem = validateWord({ ...draft, takenIds: takenIds(wordId) })
    if (problem) return problem

    level.words[index] = { text: draft.text.trim(), sentence: draft.sentence.trim() }
    markCustomised()
    return null
  }

  function deleteWord(levelId: LevelId, wordId: string): string | null {
    const level = levelSlot(levelId)
    if (!level) return 'That level does not exist.'

    const index = level.words.findIndex((w) => normaliseWordId(w.text) === wordId)
    if (index === -1) return null

    // Refuse to empty a level: modes that draw from it would have nothing to
    // show, and the level card would sit there as a dead end.
    if (level.words.length === 1) {
      return 'A level needs at least one word. Add another before removing this one.'
    }

    level.words.splice(index, 1)
    markCustomised()
    return null
  }

  function renameLevel(levelId: LevelId, name: string): string | null {
    const level = levelSlot(levelId)
    if (!level) return 'That level does not exist.'
    if (!name.trim()) return 'Enter a name for the level.'

    level.name = name.trim()
    markCustomised()
    return null
  }

  // --- Import / export ----------------------------------------------------

  function exportJson(): string {
    return JSON.stringify(library.value, null, 2)
  }

  /** Throws LibraryImportError when the text is not a usable word list. */
  function importJson(text: string): void {
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      throw new Error('That file is not valid JSON.')
    }
    library.value = parseLibrary(raw)
    markCustomised()
  }

  function resetToBuiltIn(): void {
    library.value = builtInLibrary()
    isCustomised.value = false
    remove(STORAGE_KEYS.words)
  }

  return {
    library,
    levels,
    allWords,
    allIds,
    isCustomised,
    version: LIBRARY_VERSION,
    getWord,
    getLevel,
    addWord,
    updateWord,
    deleteWord,
    renameLevel,
    exportJson,
    importJson,
    resetToBuiltIn,
  }
})
