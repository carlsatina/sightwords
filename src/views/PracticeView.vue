<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCardsStore } from '@/stores/cards'
import { shuffle } from '@/lib/random'
import ReadAloudSession from '@/components/ReadAloudSession.vue'
import AppButton from '@/components/AppButton.vue'
import LevelNotFound from '@/components/LevelNotFound.vue'
import type { Card, LevelId } from '@/types'

const props = defineProps<{ levelId: string }>()

const library = useCardsStore()
const { t } = useI18n()
const level = computed(() => library.getLevel(Number(props.levelId) as LevelId))

/**
 * Shuffled once per visit so a child learns the card, not its position.
 *
 * Held in a ref rather than a computed: a computed would reshuffle if anything
 * it depends on changed, moving the child to a different card part-way through
 * a session they are being scored on.
 */
const cards = ref<Card[]>([])

watch(
  [() => props.levelId, () => library.language.code],
  () => {
    cards.value = level.value ? shuffle(level.value.cards) : []
  },
  { immediate: true },
)
</script>

<template>
  <ReadAloudSession
    v-if="level && cards.length"
    :cards="cards"
    mode="practice"
    :accent="level.accent"
    :title="t('practice.title', { level: level.name })"
    :finish-label="t('session.backToLevel')"
  >
    <template #finish-action>
      <AppButton variant="primary" :to="{ name: 'level', params: { levelId: level.id } }">
        {{ t('session.backToLevel') }}
      </AppButton>
    </template>
  </ReadAloudSession>

  <LevelNotFound v-else />
</template>
