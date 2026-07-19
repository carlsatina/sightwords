<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCardsStore } from '@/stores/cards'
import { useProgressStore } from '@/stores/progress'
import ReadAloudSession from '@/components/ReadAloudSession.vue'
import AppButton from '@/components/AppButton.vue'
import type { Card } from '@/types'

const library = useCardsStore()
const progress = useProgressStore()
const { t } = useI18n()

/**
 * Snapshot the missed list on entry. If it stayed reactive, marking a card
 * correct would remove it from the list mid-session and shift every index.
 */
const cards = ref<Card[]>(
  progress.missedCardIds
    .map((id) => library.getCard(id))
    .filter((card): card is Card => Boolean(card)),
)

const hasCards = computed(() => cards.value.length > 0)
</script>

<template>
  <ReadAloudSession
    v-if="hasCards"
    :cards="cards"
    mode="review"
    accent="coral"
    :title="t('review.title')"
    :finish-label="t('session.backHome')"
  />

  <!-- An empty review screen is a good outcome, so it reads as praise rather
       than as an error state. -->
  <div v-else class="deck-card mx-auto mt-10 max-w-xl p-10 text-center">
    <p class="text-7xl" aria-hidden="true">✨</p>
    <p class="mt-4 text-3xl font-extrabold">{{ t('review.emptyTitle') }}</p>
    <p class="mt-2 text-lg opacity-60">{{ t('review.emptyBlurb') }}</p>
    <AppButton class="mt-6" variant="primary" :to="{ name: 'home' }">
      {{ t('review.chooseLevel') }}
    </AppButton>
  </div>
</template>
