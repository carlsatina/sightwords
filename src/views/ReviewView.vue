<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWordsStore } from '@/stores/words'
import { useProgressStore } from '@/stores/progress'
import ReadAloudSession from '@/components/ReadAloudSession.vue'
import AppButton from '@/components/AppButton.vue'
import type { SightWord } from '@/types'

const library = useWordsStore()
const progress = useProgressStore()

/**
 * Snapshot the missed list on entry. If it stayed reactive, marking a word
 * correct would remove it from the list mid-session and shift every index.
 */
const words = ref<SightWord[]>(
  progress.missedWordIds
    .map((id) => library.getWord(id))
    .filter((word): word is SightWord => Boolean(word)),
)

const hasWords = computed(() => words.value.length > 0)
</script>

<template>
  <ReadAloudSession
    v-if="hasWords"
    :words="words"
    mode="review"
    accent="coral"
    title="Tricky words"
    finish-label="Back home"
  />

  <!-- An empty review screen is a good outcome, so it reads as praise rather
       than as an error state. -->
  <div v-else class="deck-card mx-auto mt-10 max-w-xl p-10 text-center">
    <p class="text-7xl" aria-hidden="true">✨</p>
    <p class="mt-4 text-3xl font-extrabold">No tricky words</p>
    <p class="mt-2 text-lg opacity-60">
      Every word you have missed has been practised back to mastery. Pick a level to
      keep going.
    </p>
    <AppButton class="mt-6" variant="primary" :to="{ name: 'home' }">
      Choose a level
    </AppButton>
  </div>
</template>
