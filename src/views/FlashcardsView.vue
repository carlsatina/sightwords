<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useWordsStore } from '@/stores/words'
import { useSpeech } from '@/composables/useSpeech'
import { useSettingsStore } from '@/stores/settings'
import WordCard from '@/components/WordCard.vue'
import AppButton from '@/components/AppButton.vue'
import SpeakButton from '@/components/SpeakButton.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import type { LevelId } from '@/types'

const props = defineProps<{ levelId: string }>()

const library = useWordsStore()
const settings = useSettingsStore()
const { speak } = useSpeech()

const level = computed(() => library.getLevel(Number(props.levelId) as LevelId))
const index = ref(0)
const showSentence = ref(false)
/** Drives the slide direction so the card appears to come off the deck. */
const direction = ref<1 | -1>(1)

const words = computed(() => level.value?.words ?? [])
const current = computed(() => words.value[index.value])
const atStart = computed(() => index.value === 0)
const atEnd = computed(() => index.value >= words.value.length - 1)

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

// Reset the sentence reveal on every new card — it's a hint, and the hint
// shouldn't carry over to a word the child hasn't tried yet.
watch(index, () => {
  showSentence.value = false
  maybeSpeak()
})

/** Speaks the card only if the parent has opted into automatic audio. */
function maybeSpeak() {
  if (!settings.settings.autoSpeak) return
  if (!settings.settings.speechEnabled || !current.value) return
  speak(current.value.text)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') next()
  else if (event.key === 'ArrowLeft') previous()
  else if (event.key === ' ' || event.key === 'Enter') {
    // Space is the natural "say it again" key when a card is on screen.
    event.preventDefault()
    if (current.value) speak(current.value.text)
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
        :max="words.length"
        :accent="level.accent"
        :label="`Card ${index + 1} of ${words.length}`"
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
        :word="current.text"
        :sentence="current.sentence"
        :accent="level.accent"
        :show-sentence="showSentence"
        :stack-depth="Math.min(2, words.length - index - 1)"
      />
    </Transition>

    <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
      <SpeakButton :text="current.text" />
      <button
        type="button"
        class="chunky-btn bg-white px-5 py-2.5 text-ink shadow-[0_4px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_4px_0_0_rgba(0,0,0,0.5)]"
        @click="showSentence = !showSentence"
      >
        {{ showSentence ? 'Hide sentence' : 'Show sentence' }}
      </button>
      <SpeakButton
        v-if="showSentence"
        :text="current.sentence"
        label="Read sentence"
        size="sm"
      />
    </div>

    <div class="mt-6 flex items-center justify-center gap-4">
      <AppButton variant="ghost" size="lg" :disabled="atStart" @click="previous">
        ← Back
      </AppButton>
      <AppButton v-if="!atEnd" variant="primary" size="lg" @click="next">
        Next →
      </AppButton>
      <AppButton
        v-else
        variant="success"
        size="lg"
        :to="{ name: 'level', params: { levelId: level.id } }"
      >
        Finish ✓
      </AppButton>
    </div>

    <p class="mt-6 text-center text-sm opacity-40">
      Tip: use ← and → to move, space to hear the word.
    </p>
  </div>
</template>
