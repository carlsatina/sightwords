<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { shuffle } from '@/lib/random'
import { useCardsStore } from '@/stores/cards'
import { useSpeech } from '@/composables/useSpeech'
import { useSettingsStore } from '@/stores/settings'
import { useFullscreen } from '@/composables/useFullscreen'
import WordCard from '@/components/WordCard.vue'
import FocusCard from '@/components/FocusCard.vue'
import AppButton from '@/components/AppButton.vue'
import SpeakButton from '@/components/SpeakButton.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import LevelNotFound from '@/components/LevelNotFound.vue'
import type { Card, LevelId } from '@/types'
import { detailKind, detailLabelKeys, spokenDetail } from '@/lib/cards'

const props = defineProps<{ levelId: string }>()

const library = useCardsStore()
const settings = useSettingsStore()
const { speak, currentLang, hasVoiceFor } = useSpeech()
const focus = useFullscreen()
const { t } = useI18n()

/**
 * What gets spoken for a card. A kanji is read by one of its readings — handed
 * the bare character, a synthesiser picks a reading arbitrarily, often not the
 * one the level teaches.
 */
function spokenText(card: Card): string {
  if (card.kind !== 'kanji') return card.text
  return card.kun[0] ?? card.on[0] ?? card.char
}

function speakCurrent() {
  if (current.value) speak(spokenText(current.value))
}

/** Reads whatever the reveal holds that works as one utterance. */
function speakSentence() {
  const text = current.value ? spokenDetail(current.value) : null
  if (text) speak(text)
}

const level = computed(() => library.getLevel(Number(props.levelId) as LevelId))
const index = ref(0)
const showDetail = ref(false)
/** Drives the slide direction so the card appears to come off the deck. */
const direction = ref<1 | -1>(1)

/**
 * Shuffled once per visit, so a child learns the card rather than its position
 * in the deck — the third card being "blue" every single time is a cue they
 * can lean on instead of reading.
 *
 * Snapshotted into a ref rather than computed on the fly: a computed would
 * reshuffle whenever the library changed, teleporting the child to a different
 * card mid-session.
 */
const cards = ref<Card[]>([])

watch(
  [() => props.levelId, () => library.language.code],
  () => {
    cards.value = level.value ? shuffle(level.value.cards) : []
    index.value = 0
    showDetail.value = false
  },
  { immediate: true },
)

/** Reshuffles the current level and starts again from the top. */
function reshuffle() {
  cards.value = shuffle(cards.value)
  index.value = 0
  showDetail.value = false
  direction.value = 1
}
const current = computed(() => cards.value[index.value])
const atStart = computed(() => index.value === 0)
const atEnd = computed(() => index.value >= cards.value.length - 1)

/**
 * Whether this device can actually speak the language in play. The keyboard
 * tip must not promise a spacebar shortcut that does nothing — the same
 * honesty the "Hear it" button applies by hiding itself.
 */
const canHear = computed(
  () => settings.settings.speechEnabled && hasVoiceFor(currentLang.value),
)

/** Kanji cards reveal readings and a meaning; word cards reveal a sentence. */
/**
 * One button reveals three different things — a sentence, a kana's example
 * word, or a kanji's readings — so its label is derived from the card rather
 * than assumed. See `detailKind`.
 */
const detailLabel = computed(() => {
  const card = current.value
  const kind = card ? detailKind(card) : null
  if (!kind) return t('session.showSentence')
  const keys = detailLabelKeys(kind)
  return showDetail.value ? t(keys.hide) : t(keys.show)
})

function next() {
  if (atEnd.value) return
  direction.value = 1
  index.value++
}

function previous() {
  if (atStart.value) return
  direction.value = -1
  index.value--
}

// Reset the detail reveal on every new card — it's a hint, and the hint
// shouldn't carry over to a card the child hasn't tried yet.
watch(index, () => {
  showDetail.value = false
  maybeSpeak()
})

/** Speaks the card only if the parent has opted into automatic audio. */
function maybeSpeak() {
  if (!settings.settings.autoSpeak) return
  if (!settings.settings.speechEnabled || !current.value) return
  speakCurrent()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') next()
  else if (event.key === 'ArrowLeft') previous()
  else if (event.key === ' ' || event.key === 'Enter') {
    // Space is the natural "say it again" key when a card is on screen.
    event.preventDefault()
    speakCurrent()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  // The first card gets the same treatment as every later one.
  maybeSpeak()
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="level && current" class="pt-6">
    <div class="mb-6">
      <ProgressBar
        :value="index + 1"
        :max="cards.length"
        :accent="level.accent"
        :label="t('session.cardCount', { current: index + 1, total: cards.length })"
        :show-percent="false"
      />
    </div>

    <Transition
      mode="out-in"
      :enter-active-class="'transition duration-300 ease-[var(--ease-settle)]'"
      :enter-from-class="
        direction === 1 ? 'opacity-0 translate-x-8 rotate-2' : 'opacity-0 -translate-x-8 -rotate-2'
      "
      :leave-active-class="'transition duration-150 ease-in'"
      :leave-to-class="
        direction === 1 ? 'opacity-0 -translate-x-6 -rotate-1' : 'opacity-0 translate-x-6 rotate-1'
      "
    >
      <WordCard
        :key="current.id"
        :card="current"
        :accent="level.accent"
        :show-detail="showDetail"
        :stack-depth="Math.min(2, cards.length - index - 1)"
      />
    </Transition>

    <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
      <SpeakButton :text="spokenText(current)" />
      <button
        type="button"
        class="chunky-btn bg-white px-5 py-2.5 text-ink shadow-[0_4px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_4px_0_0_rgba(0,0,0,0.5)]"
        @click="showDetail = !showDetail"
      >
        {{ detailLabel }}
      </button>
      <!-- A kanji's reveal is a list of readings, which is not one utterance —
           `spokenDetail` gives its example word instead, or nothing. -->
      <SpeakButton
        v-if="showDetail && spokenDetail(current)"
        :text="spokenDetail(current)!"
        :label="t('session.readSentence')"
        size="sm"
      />
    </div>

    <div class="mt-6 flex items-center justify-center gap-4">
      <AppButton variant="ghost" size="lg" :disabled="atStart" @click="previous">
        {{ t('session.back') }}
      </AppButton>
      <AppButton v-if="!atEnd" variant="primary" size="lg" @click="next">
        {{ t('session.nextArrow') }}
      </AppButton>
      <AppButton
        v-else
        variant="success"
        size="lg"
        :to="{ name: 'level', params: { levelId: level.id } }"
      >
        {{ t('session.finishCheck') }}
      </AppButton>
    </div>

    <div class="mt-4 flex justify-center">
      <!-- The deck is already shuffled on arrival; this is for a child who
           wants another pass without leaving the level. -->
      <button
        type="button"
        class="rounded-xl px-3 py-1.5 text-sm font-bold underline opacity-60 hover:opacity-100"
        @click="reshuffle"
      >
        🔀 {{ t('session.shuffleAgain') }}
      </button>
    </div>

    <div class="mt-6 flex justify-center">
      <button
        type="button"
        class="chunky-btn flex items-center gap-2 bg-white px-5 py-2.5 text-ink shadow-[0_4px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_4px_0_0_rgba(0,0,0,0.5)]"
        @click="focus.enter()"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
        {{ t('session.focusMode') }}
      </button>
    </div>

    <p class="mt-6 text-center text-sm opacity-40">
      {{ canHear ? t('session.keyboardTip') : t('session.keyboardTipNoAudio') }}
    </p>

    <FocusCard
      v-if="focus.active.value"
      :card="current"
      :accent="level.accent"
      :show-detail="showDetail"
      :can-speak="canHear"
      navigable
      :can-previous="!atStart"
      :can-next="!atEnd"
      :position="index + 1"
      :total="cards.length"
      @close="focus.exit()"
      @next="next"
      @previous="previous"
      @speak="speakCurrent"
      @speak-detail="speakSentence"
      @toggle-detail="showDetail = !showDetail"
    />
  </div>

  <LevelNotFound v-else />
</template>
