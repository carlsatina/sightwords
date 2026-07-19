<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardText, type AccentName, type Card } from '@/types'

/**
 * The flash card face. Renders either a sight word with its sentence or a
 * kanji with its readings and meaning — a kanji carries several readings plus
 * a gloss, so squeezing it into the word layout would either hide most of the
 * card's content or shrink the character past the point of being legible,
 * which is the one thing the child is here to look at.
 */
const props = withDefaults(
  defineProps<{
    card: Card
    accent?: AccentName
    /** Cards drawn behind the top one, to show the deck has depth. */
    stackDepth?: number
    /** Reveal the sentence (words) or the readings and meaning (kanji). */
    showDetail?: boolean
    size?: 'md' | 'lg'
  }>(),
  { accent: 'mint', stackDepth: 2, showDetail: false, size: 'lg' },
)

const { t } = useI18n()

const RULES: Record<AccentName, string> = {
  mint: 'bg-mint',
  marigold: 'bg-marigold',
  coral: 'bg-coral',
  grape: 'bg-grape',
  ink: 'bg-ink dark:bg-paper',
}

const face = computed(() => cardText(props.card))

/**
 * CJK glyphs and long Latin words want different break behaviour: `break-all`
 * keeps a long English word inside the card, but applied to a single kanji it
 * does nothing useful and interferes with the character's own spacing.
 */
const isCjk = computed(() => props.card.language === 'ja')

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
      v-for="deckCard in stack"
      :key="deckCard.key"
      aria-hidden="true"
      class="deck-card absolute inset-0"
      :style="{
        transform: `rotate(${deckCard.rotate}deg) translateY(${deckCard.offset}px)`,
        opacity: deckCard.opacity,
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
        class="relative font-[family-name:var(--font-word)] leading-none font-bold"
        :class="[
          isCjk ? 'break-normal' : 'break-all',
          size === 'lg'
            ? 'text-[clamp(3.5rem,15vw,8rem)]'
            : 'text-[clamp(2.5rem,10vw,4rem)]',
        ]"
        :lang="card.language"
      >
        {{ face }}
      </p>

      <!-- Word detail: the sentence that gives the word its context, plus an
           English gloss where the card carries one. The gloss sits under the
           sentence, not above it — the sentence is the lesson, the translation
           is the safety net for a child who is stronger in English. -->
      <div
        v-if="showDetail && card.kind === 'word'"
        class="relative mt-6 flex max-w-md flex-col items-center gap-2"
      >
        <p
          v-if="card.sentence"
          class="font-[family-name:var(--font-word)] text-lg opacity-60 sm:text-xl"
          :lang="card.language"
        >
          {{ card.sentence }}
        </p>
        <p v-if="card.sentenceMeaning" lang="en" class="text-base opacity-45">
          {{ card.sentenceMeaning }}
        </p>
        <p v-if="card.meaning" lang="en" class="text-sm font-semibold opacity-40">
          {{ card.meaning }}
        </p>
      </div>

      <!-- Letter detail: the sound, then words that use it. -->
      <div
        v-else-if="showDetail && card.kind === 'letter'"
        class="relative mt-6 flex max-w-md flex-col items-center gap-2"
      >
        <p class="text-xl">
          <span class="opacity-45">{{ t('session.says') }}</span>
          <span class="ml-2 font-semibold opacity-80">“{{ card.sound }}”</span>
        </p>
        <p class="font-[family-name:var(--font-word)] text-lg opacity-55">
          {{ card.examples.join(' · ') }}
        </p>
      </div>

      <!-- Kanji detail: readings, then meaning, then an example word. -->
      <div
        v-else-if="showDetail && card.kind === 'kanji'"
        class="relative mt-6 flex max-w-md flex-col items-center gap-2"
      >
        <dl class="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1">
          <div v-if="card.on.length" class="flex items-baseline gap-1.5">
            <dt class="text-xs font-semibold tracking-wide uppercase opacity-45">
              on
            </dt>
            <dd lang="ja" class="text-lg opacity-75">{{ card.on.join('・') }}</dd>
          </div>
          <div v-if="card.kun.length" class="flex items-baseline gap-1.5">
            <dt class="text-xs font-semibold tracking-wide uppercase opacity-45">
              kun
            </dt>
            <dd lang="ja" class="text-lg opacity-75">{{ card.kun.join('・') }}</dd>
          </div>
        </dl>

        <p class="text-xl font-semibold opacity-80">{{ card.meaning }}</p>

        <p v-if="card.example" class="text-base opacity-55">
          <span lang="ja">{{ card.example.text }}</span>
          <span lang="ja" class="opacity-70"> （{{ card.example.reading }}） </span>
          <span>— {{ card.example.meaning }}</span>
        </p>
      </div>

      <slot />
    </div>
  </div>
</template>
