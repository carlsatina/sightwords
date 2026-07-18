<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWordsStore } from '@/stores/words'
import { useProgressStore } from '@/stores/progress'
import AppButton from '@/components/AppButton.vue'
import type { LevelId } from '@/types'

const library = useWordsStore()
const progress = useProgressStore()

const activeLevelId = ref<LevelId>(1)
const activeLevel = computed(() => library.getLevel(activeLevelId.value))

/** Word id currently open for editing, or 'new' for the add form. */
const editing = ref<string | null>(null)
const draft = ref({ text: '', sentence: '' })
const formError = ref('')

const importError = ref('')
const notice = ref('')
const confirmingReset = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function flash(message: string) {
  notice.value = message
  setTimeout(() => (notice.value = ''), 3000)
}

function startAdd() {
  editing.value = 'new'
  draft.value = { text: '', sentence: '' }
  formError.value = ''
}

function startEdit(wordId: string, text: string, sentence: string) {
  editing.value = wordId
  draft.value = { text, sentence }
  formError.value = ''
}

function cancelEdit() {
  editing.value = null
  formError.value = ''
}

function submit() {
  const problem =
    editing.value === 'new'
      ? library.addWord(activeLevelId.value, draft.value)
      : library.updateWord(activeLevelId.value, editing.value!, draft.value)

  if (problem) {
    formError.value = problem
    return
  }
  flash(editing.value === 'new' ? 'Word added.' : 'Word updated.')
  editing.value = null
}

function remove(wordId: string, text: string) {
  const problem = library.deleteWord(activeLevelId.value, wordId)
  if (problem) {
    formError.value = problem
    return
  }
  // Drop the score too, so a re-added word starts clean rather than inheriting
  // the old one's mastery.
  progress.resetWord(wordId)
  flash(`Removed “${text}”.`)
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
  flash('Word list downloaded.')
}

async function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  importError.value = ''
  try {
    library.importJson(await file.text())
    flash('Word list imported.')
  } catch (error) {
    importError.value =
      error instanceof Error ? error.message : 'That file could not be read.'
  } finally {
    // Clear the input so choosing the same file again still fires a change.
    input.value = ''
  }
}

function confirmReset() {
  library.resetToBuiltIn()
  confirmingReset.value = false
  editing.value = null
  flash('Restored the built-in word list.')
}
</script>

<template>
  <div class="pt-6">
    <h1 class="text-4xl font-extrabold">Manage words</h1>
    <p class="mt-1 opacity-60">
      Add your child's own words, or change the ones that come with the app.
      Everything is saved on this device.
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
        @click="activeLevelId = level.id; cancelEdit()"
      >
        {{ level.name }}
        <span class="ml-1 opacity-60">{{ level.words.length }}</span>
      </button>
    </div>

    <!-- Word list -->
    <section v-if="activeLevel" class="deck-card mt-5 p-5">
      <div class="mb-4 flex items-center gap-3">
        <h2 class="text-xl font-extrabold">{{ activeLevel.name }}</h2>
        <AppButton
          v-if="editing !== 'new'"
          class="ml-auto"
          variant="quiet"
          size="sm"
          @click="startAdd"
        >
          + Add word
        </AppButton>
      </div>

      <!-- Add / edit form -->
      <form
        v-if="editing"
        class="mb-5 rounded-2xl bg-ink/5 p-4 dark:bg-white/5"
        @submit.prevent="submit"
      >
        <p class="mb-3 font-bold">
          {{ editing === 'new' ? 'New word' : 'Edit word' }}
        </p>

        <label class="block">
          <span class="mb-1 block text-sm font-semibold opacity-70">Word</span>
          <input
            v-model="draft.text"
            type="text"
            autocapitalize="none"
            autocomplete="off"
            class="w-full rounded-2xl bg-white p-3 font-[family-name:var(--font-word)] text-xl font-bold dark:bg-night"
            placeholder="the"
          />
        </label>

        <label class="mt-3 block">
          <span class="mb-1 block text-sm font-semibold opacity-70">
            Sentence using the word
          </span>
          <input
            v-model="draft.sentence"
            type="text"
            class="w-full rounded-2xl bg-white p-3 font-[family-name:var(--font-word)] dark:bg-night"
            placeholder="The sun is warm."
          />
        </label>

        <p v-if="formError" class="mt-3 font-bold text-coral" role="alert">
          {{ formError }}
        </p>

        <div class="mt-4 flex gap-2">
          <AppButton type="submit" variant="success" size="sm">
            {{ editing === 'new' ? 'Add word' : 'Save changes' }}
          </AppButton>
          <AppButton variant="ghost" size="sm" @click="cancelEdit">Cancel</AppButton>
        </div>
      </form>

      <ul class="divide-y divide-ink/10 dark:divide-white/10">
        <li
          v-for="word in activeLevel.words"
          :key="word.id"
          class="flex items-center gap-3 py-3"
        >
          <span class="min-w-0">
            <span
              class="block font-[family-name:var(--font-word)] text-xl font-bold"
            >
              {{ word.text }}
            </span>
            <span class="block truncate text-sm opacity-60">{{ word.sentence }}</span>
          </span>

          <span class="ml-auto flex shrink-0 gap-2">
            <button
              type="button"
              class="rounded-xl px-3 py-1.5 text-sm font-bold underline opacity-70 hover:opacity-100"
              @click="startEdit(word.id, word.text, word.sentence)"
            >
              Edit
            </button>
            <button
              type="button"
              class="rounded-xl px-3 py-1.5 text-sm font-bold text-coral underline hover:opacity-80"
              :aria-label="`Remove ${word.text}`"
              @click="remove(word.id, word.text)"
            >
              Remove
            </button>
          </span>
        </li>
      </ul>
    </section>

    <!-- File -->
    <section class="deck-card mt-5 p-5">
      <h2 class="text-xl font-extrabold">Back up or share</h2>
      <p class="mb-4 text-sm opacity-60">
        Export saves the whole word list as a JSON file you can keep or move to
        another device. Import replaces the current list with the one in the file.
      </p>

      <div class="flex flex-wrap gap-3">
        <AppButton variant="ghost" size="sm" @click="exportFile">
          Export JSON
        </AppButton>
        <AppButton variant="ghost" size="sm" @click="fileInput?.click()">
          Import JSON
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
    <section v-if="library.isCustomised" class="deck-card mt-5 border-l-8 border-coral p-5">
      <h2 class="text-xl font-extrabold">Restore the built-in words</h2>
      <p class="mb-4 text-sm opacity-60">
        Discards your changes and puts the original word list back. Your child's
        progress is kept.
      </p>

      <div v-if="!confirmingReset">
        <AppButton variant="ghost" size="sm" @click="confirmingReset = true">
          Restore built-in words
        </AppButton>
      </div>
      <div v-else class="flex flex-wrap items-center gap-3">
        <span class="font-bold">Discard your word changes?</span>
        <AppButton variant="danger" size="sm" @click="confirmReset">
          Yes, restore
        </AppButton>
        <AppButton variant="ghost" size="sm" @click="confirmingReset = false">
          Cancel
        </AppButton>
      </div>
    </section>
  </div>
</template>
