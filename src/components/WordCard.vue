<script setup lang="ts">
import { computed } from 'vue'
import type { AccentName } from '@/types'

const props = withDefaults(
  defineProps<{
    word: string
    sentence?: string
    accent?: AccentName
    /** Cards drawn behind the top one, to show the deck has depth. */
    stackDepth?: number
    showSentence?: boolean
    size?: 'md' | 'lg'
  }>(),
  { accent: 'mint', stackDepth: 2, showSentence: false, size: 'lg' },
)

const RULES: Record<AccentName, string> = {
  mint: 'bg-mint',
  marigold: 'bg-marigold',
  coral: 'bg-coral',
  grape: 'bg-grape',
  ink: 'bg-ink dark:bg-paper',
}

// Behind-cards alternate direction so the deck looks hand-stacked, not generated.
const stack = computed(() =>
  Array.from({ length: props.stackDepth }, (_, i) => {
    const depth = i + 1
    return {
      key: depth,
      rotate: depth % 2 === 0 ? depth * 1.6 : depth * -1.6,
      offset: depth * 6,
      opacity: 1 - depth * 0.22,
    }
  }).reverse(),
)
</script>

<template>
  <div class="relative mx-auto w-full max-w-2xl">
    <!-- Static cards behind the live one. Decorative only. -->
    <div
      v-for="card in stack"
      :key="card.key"
      aria-hidden="true"
      class="deck-card absolute inset-0"
      :style="{
        transform: `rotate(${card.rotate}deg) translateY(${card.offset}px)`,
        opacity: card.opacity,
      }"
    />

    <div
      class="deck-card relative flex flex-col items-center justify-center px-6 text-center"
      :class="size === 'lg' ? 'min-h-[19rem] sm:min-h-[24rem]' : 'min-h-[14rem]'"
    >
      <!-- A ruled baseline, like handwriting practice paper. -->
      <span
        class="absolute inset-x-10 bottom-[38%] h-[3px] rounded-full opacity-15"
        :class="RULES[accent]"
        aria-hidden="true"
      />

      <p
        class="relative font-[family-name:var(--font-word)] leading-none font-bold break-all"
        :class="
          size === 'lg'
            ? 'text-[clamp(3.5rem,15vw,8rem)]'
            : 'text-[clamp(2.5rem,10vw,4rem)]'
        "
      >
        {{ word }}
      </p>

      <p
        v-if="showSentence && sentence"
        class="relative mt-6 max-w-md font-[family-name:var(--font-word)] text-lg opacity-60 sm:text-xl"
      >
        {{ sentence }}
      </p>

      <slot />
    </div>
  </div>
</template>
