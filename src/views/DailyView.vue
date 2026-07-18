<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWordsStore } from '@/stores/words'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'
import ReadAloudSession from '@/components/ReadAloudSession.vue'
import AppButton from '@/components/AppButton.vue'
import type { SightWord } from '@/types'

const library = useWordsStore()
const progress = useProgressStore()
const settings = useSettingsStore()

// Generated once per calendar day and stored, so closing the app mid-practice
// resumes the same ten words rather than rerolling them.
const session = progress.ensureDailySession(
  settings.settings.dailyGoal,
  settings.settings.unlockedLevels,
)

const words = ref<SightWord[]>(
  session.wordIds
    .map((id) => library.getWord(id))
    .filter((word): word is SightWord => Boolean(word)),
)

const hasWords = computed(() => words.value.length > 0)
</script>

<template>
  <ReadAloudSession
    v-if="hasWords"
    :words="words"
    mode="daily"
    accent="marigold"
    title="Daily practice"
    finish-label="Back home"
  />

  <div v-else class="deck-card mx-auto mt-10 max-w-xl p-10 text-center">
    <p class="text-7xl" aria-hidden="true">🔒</p>
    <p class="mt-4 text-3xl font-extrabold">No words available</p>
    <p class="mt-2 text-lg opacity-60">
      Every level is locked. A grown-up can unlock levels in parent settings.
    </p>
    <AppButton class="mt-6" variant="quiet" :to="{ name: 'parent' }">
      Open parent settings
    </AppButton>
  </div>
</template>
