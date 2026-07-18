<script setup lang="ts">
import { computed } from 'vue'
import { useWordsStore } from '@/stores/words'
import { shuffle } from '@/lib/random'
import ReadAloudSession from '@/components/ReadAloudSession.vue'
import AppButton from '@/components/AppButton.vue'
import type { LevelId } from '@/types'

const props = defineProps<{ levelId: string }>()

const library = useWordsStore()
const level = computed(() => library.getLevel(Number(props.levelId) as LevelId))

// Shuffled once per visit so a child learns the word, not its position.
const words = computed(() => (level.value ? shuffle(level.value.words) : []))
</script>

<template>
  <ReadAloudSession
    v-if="level && words.length"
    :words="words"
    mode="practice"
    :accent="level.accent"
    :title="`${level.name} practice`"
    finish-label="Back to level"
  >
    <template #finish-action>
      <AppButton variant="primary" :to="{ name: 'level', params: { levelId: level.id } }">
        Back to level
      </AppButton>
    </template>
  </ReadAloudSession>
</template>
