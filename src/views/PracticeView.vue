<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCardsStore } from '@/stores/cards'
import { useRounds } from '@/composables/useRounds'
import ReadAloudSession from '@/components/ReadAloudSession.vue'
import AppButton from '@/components/AppButton.vue'
import LevelNotFound from '@/components/LevelNotFound.vue'
import type { LevelId } from '@/types'

const props = defineProps<{ levelId: string }>()

const library = useCardsStore()
const { t } = useI18n()
const level = computed(() => library.getLevel(Number(props.levelId) as LevelId))

/**
 * Dealt in rounds of twenty drawn from the whole level and shuffled, so a child
 * learns the card rather than its position — and so a hundred-card level ends
 * somewhere reachable.
 */
const pool = computed(() => level.value?.cards ?? [])
const { cards, roundNumber, nextRound, reset } = useRounds(pool)

watch([() => props.levelId, () => library.language.code], reset)
</script>

<template>
  <ReadAloudSession
    v-if="level && cards.length"
    :cards="cards"
    mode="practice"
    :accent="level.accent"
    :title="t('practice.title', { level: level.name })"
    :finish-label="t('session.backToLevel')"
    :round="roundNumber"
    @next-round="nextRound"
  >
    <template #finish-action>
      <AppButton variant="primary" :to="{ name: 'level', params: { levelId: level.id } }">
        {{ t('session.backToLevel') }}
      </AppButton>
    </template>
  </ReadAloudSession>

  <LevelNotFound v-else />
</template>
