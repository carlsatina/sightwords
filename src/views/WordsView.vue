<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCardsStore } from '@/stores/cards'
import { useProgressStore } from '@/stores/progress'
import AppButton from '@/components/AppButton.vue'
import { cardText, type Card, type CardDraft, type LevelId } from '@/types'

const library = useCardsStore()
const progress = useProgressStore()
const { t } = useI18n()

/** Edits apply to the language currently being practised. */
const language = computed(() => library.language)

const activeLevelId = ref<LevelId>(library.levels[0]?.id ?? 1)
const activeLevel = computed(() => library.getLevel(activeLevelId.value))

// Switching language changes the whole level set, so an id from the old
// language would leave this page pointing at a level that no longer exists.
watch(
  () => language.value.code,
  () => {
    activeLevelId.value = library.levels[0]?.id ?? 1
    cancelEdit()
  },
)

/** Card id currently open for editing, or 'new' for the add form. */
const editing = ref<string | null>(null)
const draft = ref<CardDraft>({ kind: 'word', text: '', sentence: '' })
const formError = ref('')

const importError = ref('')
const notice = ref('')
const confirmingReset = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

/**
 * Which kind of card this level holds. A level is homogeneous in the shipped
 * data, and mixing a sight word into a kanji level would give the quiz two
 * incompatible question shapes in one round.
 */
const levelKind = computed<'word' | 'letter' | 'kanji'>(
  () => activeLevel.value?.cards[0]?.kind ?? 'word',
)

/** Readings and examples are edited as space-separated text; stored as arrays. */
const onText = ref('')
const kunText = ref('')
const examplesText = ref('')

function blankDraft(): CardDraft {
  switch (levelKind.value) {
    case 'kanji':
      return { kind: 'kanji', char: '', on: [], kun: [], meaning: '' }
    case 'letter':
      return { kind: 'letter', letter: '', sound: '', examples: [] }
    default:
      return { kind: 'word', text: '', sentence: '', meaning: '', sentenceMeaning: '' }
  }
}

function flash(message: string) {
  notice.value = message
  setTimeout(() => (notice.value = ''), 3000)
}

function startAdd() {
  editing.value = 'new'
  draft.value = blankDraft()
  onText.value = ''
  kunText.value = ''
  examplesText.value = ''
  formError.value = ''
}

function startEdit(card: Card) {
  editing.value = card.id
  formError.value = ''

  if (card.kind === 'letter') {
    draft.value = {
      kind: 'letter',
      letter: card.letter,
      sound: card.sound,
      examples: [...card.examples],
    }
    examplesText.value = card.examples.join(' ')
  } else if (card.kind === 'kanji') {
    draft.value = {
      kind: 'kanji',
      char: card.char,
      on: [...card.on],
      kun: [...card.kun],
      meaning: card.meaning,
      ...(card.example ? { example: card.example } : {}),
    }
    onText.value = card.on.join(' ')
    kunText.value = card.kun.join(' ')
  } else {
    draft.value = {
      kind: 'word',
      text: card.text,
      sentence: card.sentence,
      ...(card.meaning ? { meaning: card.meaning } : {}),
      ...(card.sentenceMeaning ? { sentenceMeaning: card.sentenceMeaning } : {}),
    }
  }
}

function cancelEdit() {
  editing.value = null
  formError.value = ''
}

/** Splits on any run of whitespace and drops empties, so trailing spaces are fine. */
function parseReadings(value: string): string[] {
  return value.split(/\s+/).filter(Boolean)
}

function submit() {
  const payload: CardDraft =
    draft.value.kind === 'kanji'
      ? {
          ...draft.value,
          on: parseReadings(onText.value),
          kun: parseReadings(kunText.value),
        }
      : draft.value.kind === 'letter'
        ? { ...draft.value, examples: parseReadings(examplesText.value) }
        : draft.value

  const problem =
    editing.value === 'new'
      ? library.addCard(language.value.code, activeLevelId.value, payload)
      : library.updateCard(
          language.value.code,
          activeLevelId.value,
          editing.value!,
          payload,
        )

  if (problem) {
    formError.value = problem
    return
  }
  flash(editing.value === 'new' ? t('words.added') : t('words.updated'))
  editing.value = null
}

function remove(card: Card) {
  const problem = library.deleteCard(language.value.code, activeLevelId.value, card.id)
  if (problem) {
    formError.value = problem
    return
  }
  // Drop the score too, so a re-added card starts clean rather than inheriting
  // the old one's mastery.
  progress.resetCard(card.id)
  flash(t('words.removed', { text: cardFace(card) }))
}

const cardFace = cardText

function cardDetail(card: Card): string {
  if (card.kind === 'letter') {
    return `“${card.sound}” — ${card.examples.join(', ')}`
  }
  if (card.kind === 'word') {
    return card.meaning ? `${card.sentence} — ${card.meaning}` : card.sentence
  }
  const readings = [...card.on, ...card.kun].join('・')
  return readings ? `${readings} — ${card.meaning}` : card.meaning
}

// --- Import / export ------------------------------------------------------

function exportFile() {
  const blob = new Blob([library.exportJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'sight-words.json'
  link.click()
  URL.revokeObjectURL(url)
  flash(t('words.exported'))
}

async function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  importError.value = ''
  try {
    library.importJson(await file.text())
    flash(t('words.imported'))
  } catch (error) {
    importError.value =
      error instanceof Error ? error.message : t('words.importFailed')
  } finally {
    // Clear the input so choosing the same file again still fires a change.
    input.value = ''
  }
}

function confirmReset() {
  library.resetToBuiltIn()
  confirmingReset.value = false
  editing.value = null
  flash(t('words.restored'))
}
</script>

<template>
  <div class="pt-6">
    <h1 class="text-4xl font-extrabold">{{ t('words.title') }}</h1>
    <p class="mt-1 opacity-60">{{ t('words.blurb') }}</p>
    <p class="mt-1 text-sm font-semibold opacity-60">
      {{ t('words.editingLanguage', { language: language.name }) }}
    </p>

    <!-- The Filipino list is the one piece of shipped content with no
         authoritative source behind it, so the page says so where a parent is
         already looking at the words. -->
    <p
      v-if="language.code === 'fil'"
      class="mt-4 rounded-2xl border-l-8 border-marigold bg-marigold/15 px-4 py-3 text-sm font-semibold"
    >
      {{ t('words.filipinoNotice') }}
    </p>

    <p
      v-if="notice"
      class="mt-4 rounded-2xl bg-mint/20 px-4 py-2 font-bold text-mint-deep dark:text-mint"
      role="status"
      aria-live="polite"
    >
      {{ notice }}
    </p>

    <!-- Level picker -->
    <div class="mt-6 flex flex-wrap gap-2">
      <button
        v-for="level in library.levels"
        :key="level.id"
        type="button"
        class="chunky-btn px-4 py-2.5 text-sm"
        :class="
          level.id === activeLevelId
            ? 'bg-grape text-white shadow-[0_4px_0_0_var(--color-grape-deep)]'
            : 'bg-white dark:bg-night-card shadow-[0_4px_0_0_rgba(30,42,71,0.15)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.5)]'
        "
        :aria-pressed="level.id === activeLevelId"
        :lang="language.code"
        @click="
          activeLevelId = level.id;
          cancelEdit()
        "
      >
        {{ level.name }}
        <span class="ml-1 opacity-60">{{ level.cards.length }}</span>
      </button>
    </div>

    <!-- Card list -->
    <section v-if="activeLevel" class="deck-card mt-5 p-5">
      <div class="mb-4 flex items-center gap-3">
        <h2 class="text-xl font-extrabold" :lang="language.code">
          {{ activeLevel.name }}
        </h2>
        <AppButton
          v-if="editing !== 'new'"
          class="ml-auto"
          variant="quiet"
          size="sm"
          @click="startAdd"
        >
          {{
            levelKind === 'kanji'
              ? t('words.addKanji')
              : levelKind === 'letter'
                ? t('words.addLetter')
                : t('words.addWord')
          }}
        </AppButton>
      </div>

      <!-- Add / edit form -->
      <form
        v-if="editing"
        class="mb-5 rounded-2xl bg-ink/5 p-4 dark:bg-white/5"
        @submit.prevent="submit"
      >
        <p class="mb-3 font-bold">
          {{
            editing === 'new'
              ? levelKind === 'kanji'
                ? t('words.newKanji')
                : levelKind === 'letter'
                  ? t('words.newLetter')
                  : t('words.newWord')
              : levelKind === 'kanji'
                ? t('words.editKanji')
                : levelKind === 'letter'
                  ? t('words.editLetter')
                  : t('words.editWord')
          }}
        </p>

        <!-- Word card fields -->
        <template v-if="draft.kind === 'word'">
          <label class="block">
            <span class="mb-1 block text-sm font-semibold opacity-70">
              {{ t('words.fieldWord') }}
            </span>
            <input
              v-model="draft.text"
              type="text"
              autocapitalize="none"
              autocomplete="off"
              class="w-full rounded-2xl bg-white p-3 font-[family-name:var(--font-word)] text-xl font-bold dark:bg-night"
            />
          </label>

          <label class="mt-3 block">
            <span class="mb-1 block text-sm font-semibold opacity-70">
              {{ t('words.fieldSentence') }}
            </span>
            <input
              v-model="draft.sentence"
              type="text"
              class="w-full rounded-2xl bg-white p-3 font-[family-name:var(--font-word)] dark:bg-night"
            />
          </label>

          <!-- Optional, and pointless on an English card — offered only where
               the practice language is not English. -->
          <template v-if="language.code !== 'en'">
            <label class="mt-3 block">
              <span class="mb-1 block text-sm font-semibold opacity-70">
                {{ t('words.fieldMeaningOptional') }}
              </span>
              <input
                v-model="draft.meaning"
                type="text"
                lang="en"
                class="w-full rounded-2xl bg-white p-3 font-[family-name:var(--font-word)] dark:bg-night"
              />
            </label>
            <label class="mt-3 block">
              <span class="mb-1 block text-sm font-semibold opacity-70">
                {{ t('words.fieldSentenceMeaningOptional') }}
              </span>
              <input
                v-model="draft.sentenceMeaning"
                type="text"
                lang="en"
                class="w-full rounded-2xl bg-white p-3 font-[family-name:var(--font-word)] dark:bg-night"
              />
            </label>
          </template>
        </template>

        <!-- Letter card fields -->
        <template v-else-if="draft.kind === 'letter'">
          <label class="block">
            <span class="mb-1 block text-sm font-semibold opacity-70">
              {{ t('words.fieldLetter') }}
            </span>
            <input
              v-model="draft.letter"
              type="text"
              autocapitalize="none"
              autocomplete="off"
              class="w-full rounded-2xl bg-white p-3 font-[family-name:var(--font-word)] text-2xl font-bold dark:bg-night"
            />
          </label>

          <label class="mt-3 block">
            <span class="mb-1 block text-sm font-semibold opacity-70">
              {{ t('words.fieldSound') }}
            </span>
            <input
              v-model="draft.sound"
              type="text"
              autocapitalize="none"
              autocomplete="off"
              class="w-full rounded-2xl bg-white p-3 font-[family-name:var(--font-word)] dark:bg-night"
            />
          </label>

          <label class="mt-3 block">
            <span class="mb-1 block text-sm font-semibold opacity-70">
              {{ t('words.fieldExamples') }}
            </span>
            <input
              v-model="examplesText"
              type="text"
              autocapitalize="none"
              autocomplete="off"
              class="w-full rounded-2xl bg-white p-3 font-[family-name:var(--font-word)] dark:bg-night"
            />
          </label>
        </template>

        <!-- Kanji card fields -->
        <template v-else>
          <label class="block">
            <span class="mb-1 block text-sm font-semibold opacity-70">
              {{ t('words.fieldChar') }}
            </span>
            <input
              v-model="draft.char"
              type="text"
              lang="ja"
              autocomplete="off"
              class="w-full rounded-2xl bg-white p-3 font-[family-name:var(--font-word)] text-3xl font-bold dark:bg-night"
            />
          </label>

          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-sm font-semibold opacity-70">
                {{ t('words.fieldOn') }}
              </span>
              <input
                v-model="onText"
                type="text"
                lang="ja"
                autocomplete="off"
                class="w-full rounded-2xl bg-white p-3 font-[family-name:var(--font-word)] dark:bg-night"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-sm font-semibold opacity-70">
                {{ t('words.fieldKun') }}
              </span>
              <input
                v-model="kunText"
                type="text"
                lang="ja"
                autocomplete="off"
                class="w-full rounded-2xl bg-white p-3 font-[family-name:var(--font-word)] dark:bg-night"
              />
            </label>
          </div>

          <label class="mt-3 block">
            <span class="mb-1 block text-sm font-semibold opacity-70">
              {{ t('words.fieldMeaning') }}
            </span>
            <input
              v-model="draft.meaning"
              type="text"
              lang="en"
              class="w-full rounded-2xl bg-white p-3 font-[family-name:var(--font-word)] dark:bg-night"
            />
          </label>
        </template>

        <p v-if="formError" class="mt-3 font-bold text-coral" role="alert">
          {{ formError }}
        </p>

        <div class="mt-4 flex gap-2">
          <AppButton type="submit" variant="success" size="sm">
            {{ editing === 'new' ? t('words.submitAdd') : t('words.submitSave') }}
          </AppButton>
          <AppButton variant="ghost" size="sm" @click="cancelEdit">
            {{ t('words.cancel') }}
          </AppButton>
        </div>
      </form>

      <ul class="divide-y divide-ink/10 dark:divide-white/10">
        <li
          v-for="card in activeLevel.cards"
          :key="card.id"
          class="flex items-center gap-3 py-3"
        >
          <span class="min-w-0">
            <span
              class="block font-[family-name:var(--font-word)] text-xl font-bold"
              :lang="card.language"
            >
              {{ cardFace(card) }}
            </span>
            <span class="block truncate text-sm opacity-60">
              {{ cardDetail(card) }}
            </span>
          </span>

          <span class="ml-auto flex shrink-0 gap-2">
            <button
              type="button"
              class="rounded-xl px-3 py-1.5 text-sm font-bold underline opacity-70 hover:opacity-100"
              @click="startEdit(card)"
            >
              {{ t('words.edit') }}
            </button>
            <button
              type="button"
              class="rounded-xl px-3 py-1.5 text-sm font-bold text-coral underline hover:opacity-80"
              :aria-label="t('words.removeLabel', { text: cardFace(card) })"
              @click="remove(card)"
            >
              {{ t('words.remove') }}
            </button>
          </span>
        </li>
      </ul>
    </section>

    <!-- File -->
    <section class="deck-card mt-5 p-5">
      <h2 class="text-xl font-extrabold">{{ t('words.backupTitle') }}</h2>
      <p class="mb-4 text-sm opacity-60">{{ t('words.backupBlurb') }}</p>

      <div class="flex flex-wrap gap-3">
        <AppButton variant="ghost" size="sm" @click="exportFile">
          {{ t('words.exportJson') }}
        </AppButton>
        <AppButton variant="ghost" size="sm" @click="fileInput?.click()">
          {{ t('words.importJson') }}
        </AppButton>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          class="hidden"
          @change="onFileChosen"
        />
      </div>

      <p v-if="importError" class="mt-3 font-bold text-coral" role="alert">
        {{ importError }}
      </p>
    </section>

    <!-- Reset -->
    <section
      v-if="library.isCustomised"
      class="deck-card mt-5 border-l-8 border-coral p-5"
    >
      <h2 class="text-xl font-extrabold">{{ t('words.restoreTitle') }}</h2>
      <p class="mb-4 text-sm opacity-60">{{ t('words.restoreBlurb') }}</p>

      <div v-if="!confirmingReset">
        <AppButton variant="ghost" size="sm" @click="confirmingReset = true">
          {{ t('words.restoreButton') }}
        </AppButton>
      </div>
      <div v-else class="flex flex-wrap items-center gap-3">
        <span class="font-bold">{{ t('words.restoreConfirm') }}</span>
        <AppButton variant="danger" size="sm" @click="confirmReset">
          {{ t('words.restoreYes') }}
        </AppButton>
        <AppButton variant="ghost" size="sm" @click="confirmingReset = false">
          {{ t('words.cancel') }}
        </AppButton>
      </div>
    </section>
  </div>
</template>
