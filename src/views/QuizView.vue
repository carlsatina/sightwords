<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCardsStore } from '@/stores/cards'
import { sample, shuffle } from '@/lib/random'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'
import { useSpeech } from '@/composables/useSpeech'
import AppButton from '@/components/AppButton.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import LevelNotFound from '@/components/LevelNotFound.vue'
import RoundComplete from '@/components/RoundComplete.vue'
import { ROUND_SIZE } from '@/composables/useRounds'
import { cardText, type Card, type LevelId } from '@/types'
import { spokenFace } from '@/lib/cards'

const props = defineProps<{ levelId: string }>()

const library = useCardsStore()
const progress = useProgressStore()
const settings = useSettingsStore()
const { speak, currentLang, hasVoiceFor } = useSpeech()
const { t } = useI18n()

const CHOICES = 4

const level = computed(() => library.getLevel(Number(props.levelId) as LevelId))

interface Question {
  answer: Card
  choices: Card[]
}

const questions = ref<Question[]>([])
const index = ref(0)
const selectedId = ref<string | null>(null)
const correctCount = ref(0)
const finished = ref(false)
/** Shown between rounds, before the results screen. */
const celebrating = ref(false)
const roundNumber = ref(1)

/**
 * The quiz has three shapes, because a single one cannot serve all the content
 * honestly:
 *
 *  - kanji  — show the character, pick its meaning. Kanji recognition is about
 *             meaning, and a spoken prompt would test listening instead.
 *  - word, with a voice — hear it, pick the written word. The word itself is
 *             never shown, or the question answers itself.
 *  - word, without a voice — show the sentence with the word blanked out. This
 *             is the Filipino case on most desktops, and it tests the same
 *             recognition without needing audio the device does not have.
 */
const levelKind = computed(
  () => library.getLevel(Number(props.levelId))?.cards[0]?.kind ?? 'word',
)

const canHear = computed(
  () => settings.settings.speechEnabled && hasVoiceFor(currentLang.value),
)

const mode = computed<'meaning' | 'listen' | 'cloze' | 'sound'>(() => {
  if (levelKind.value === 'kanji') return 'meaning'
  // A letter is asked by its sound, either heard or shown in writing. It has
  // no sentence, so the cloze fallback has nothing to blank out.
  if (levelKind.value === 'letter') return canHear.value ? 'listen' : 'sound'
  return canHear.value ? 'listen' : 'cloze'
})

/** The question, matched to what the card actually is. */
const promptKey = computed(() => {
  if (mode.value === 'meaning') return 'quiz.whatMeaning'
  if (levelKind.value === 'letter') return 'quiz.whichLetter'
  return 'quiz.findWord'
})

/** The label shown on a choice button, which differs by question shape. */
function choiceLabel(card: Card): string {
  if (mode.value === 'meaning' && card.kind === 'kanji') return card.meaning
  return cardText(card)
}

/**
 * Distractors come from the same level first — cards of similar length and
 * familiarity make a real discrimination test. Falling back to the full list
 * only matters for levels smaller than the choice count.
 */
function buildQuestions(): Question[] {
  const levelCards = level.value?.cards ?? []
  if (levelCards.length === 0) return []

  const asked = sample(levelCards, Math.min(ROUND_SIZE, levelCards.length))

  return asked.map((answer) => {
    const sameLevel = levelCards.filter((c) => c.id !== answer.id)
    let distractors = sample(sameLevel, CHOICES - 1)

    if (distractors.length < CHOICES - 1) {
      // Only ever from the same language — an English distractor in a Japanese
      // quiz is not a wrong answer a child could plausibly consider, so it
      // makes the question easier rather than harder.
      const elsewhere = library.allCards.filter(
        (c) => c.id !== answer.id && !distractors.some((d) => d.id === c.id),
      )
      distractors = [
        ...distractors,
        ...sample(elsewhere, CHOICES - 1 - distractors.length),
      ]
    }

    return { answer, choices: shuffle([answer, ...distractors]) }
  })
}

const current = computed(() => questions.value[index.value])
const answered = computed(() => selectedId.value !== null)
const isRight = computed(
  () => answered.value && selectedId.value === current.value?.answer.id,
)

/** See `spokenFace`: a letter says its sound, a kanji says a reading. */
const spokenText = spokenFace

function askCurrent() {
  if (mode.value !== 'listen' || !current.value) return
  speak(spokenText(current.value.answer))
}

function start() {
  questions.value = buildQuestions()
  index.value = 0
  selectedId.value = null
  correctCount.value = 0
  finished.value = false
  celebrating.value = false
  askCurrent()
}

/** Draws a fresh round of questions and begins it. */
function continueRounds() {
  roundNumber.value += 1
  start()
}

/** Ends the run, showing the results screen the round would have skipped. */
function stopRounds() {
  celebrating.value = false
  finished.value = true
}

onMounted(start)
watch(index, askCurrent)

function choose(card: Card) {
  if (answered.value || !current.value) return

  selectedId.value = card.id
  const correct = card.id === current.value.answer.id
  if (correct) correctCount.value++
  progress.recordAnswer(current.value.answer.id, correct, 'quiz')

  // Hold the result on screen so the child connects the choice to the outcome.
  setTimeout(advance, correct ? 900 : 1600)
}

function advance() {
  if (index.value >= questions.value.length - 1) {
    progress.recordQuizResult(correctCount.value, questions.value.length)
    // A round ends on a choice; a one-off quiz ends on its results.
    celebrating.value = true
  } else {
    index.value++
    selectedId.value = null
  }
}

function choiceClass(card: Card) {
  if (!answered.value) {
    return 'bg-white dark:bg-night-card shadow-[0_5px_0_0_rgba(30,42,71,0.15)] dark:shadow-[0_5px_0_0_rgba(0,0,0,0.5)] hover:-translate-y-1'
  }
  if (card.id === current.value?.answer.id) {
    return 'bg-mint text-white shadow-[0_5px_0_0_var(--color-mint-deep)]'
  }
  if (card.id === selectedId.value) {
    return 'bg-coral text-white shadow-[0_5px_0_0_var(--color-coral-deep)]'
  }
  return 'bg-white dark:bg-night-card opacity-40'
}

/** The sentence with the answer blanked out, for the no-audio question shape. */
const clozeSentence = computed(() => {
  const answer = current.value?.answer
  if (!answer || answer.kind !== 'word') return ''
  const escaped = answer.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return answer.sentence.replace(
    new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, 'iu'),
    '$1____$2',
  )
})

const scorePercent = computed(() =>
  questions.value.length === 0
    ? 0
    : Math.round((correctCount.value / questions.value.length) * 100),
)
</script>

<template>
  <div v-if="level" class="pt-6">
    <template v-if="!finished && !celebrating && current">
      <div class="mb-6">
        <ProgressBar
          :value="index + 1"
          :max="questions.length"
          :accent="level.accent"
          :label="t('quiz.questionOf', { current: index + 1, total: questions.length })"
          :show-percent="false"
        />
      </div>

      <div class="deck-card mb-6 p-6 text-center sm:p-8">
        <p class="text-sm font-bold tracking-[0.2em] uppercase opacity-50">
          {{ t(promptKey) }}
        </p>

        <!-- Kanji: the character is the question. -->
        <p
          v-if="mode === 'meaning' && current.answer.kind === 'kanji'"
          lang="ja"
          class="mt-4 font-[family-name:var(--font-word)] text-[clamp(4rem,18vw,8rem)] leading-none font-bold"
        >
          {{ current.answer.char }}
        </p>

        <!-- Word with a voice: the word is spoken, never shown. -->
        <button
          v-else-if="mode === 'listen'"
          type="button"
          class="chunky-btn mx-auto mt-4 flex items-center gap-3 bg-grape px-7 py-4 text-xl text-white shadow-[0_5px_0_0_var(--color-grape-deep)]"
          @click="speak(spokenText(current.answer))"
        >
          <span aria-hidden="true">🔊</span> {{ t('quiz.hearAgain') }}
        </button>

        <!-- Letter without a voice: show the sound in writing instead. There
             is no sentence to blank out, and the written sound is exactly what
             the card teaches. -->
        <p
          v-else-if="mode === 'sound' && current.answer.kind === 'letter'"
          lang="en"
          class="mt-4 font-[family-name:var(--font-word)] text-[clamp(3rem,12vw,6rem)] leading-none font-bold"
        >
          “{{ current.answer.sound }}”
        </p>

        <!-- Word without a voice: the sentence, with the word blanked out. -->
        <p
          v-else
          :lang="current.answer.language"
          class="mt-4 font-[family-name:var(--font-word)] text-3xl leading-snug sm:text-4xl"
        >
          {{ clozeSentence }}
        </p>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          v-for="choice in current.choices"
          :key="choice.id"
          type="button"
          class="chunky-btn px-4 py-6 font-[family-name:var(--font-word)] font-bold"
          :class="[
            choiceClass(choice),
            // Meaning choices are English prose and need to wrap as words;
            // word and character choices are single tokens set much larger.
            mode === 'meaning'
              ? 'text-xl sm:text-2xl'
              : 'text-3xl break-all sm:text-4xl',
          ]"
          :lang="mode === 'meaning' ? 'en' : choice.language"
          :disabled="answered"
          @click="choose(choice)"
        >
          {{ choiceLabel(choice) }}
        </button>
      </div>

      <p
        v-if="answered"
        class="mt-6 text-center text-2xl font-extrabold"
        role="status"
        aria-live="polite"
      >
        <template v-if="isRight">{{ t('quiz.right') }}</template>
        <template v-else-if="mode === 'meaning'">
          {{ t('quiz.wasMeaning', { text: choiceLabel(current.answer) }) }}
        </template>
        <template v-else>
          {{ t('quiz.wasWord', { text: choiceLabel(current.answer) }) }}
        </template>
      </p>
    </template>

    <RoundComplete
      v-if="celebrating"
      :count="questions.length"
      :round="roundNumber"
      :correct="correctCount"
      :total="questions.length"
      @continue="continueRounds"
      @finish="stopRounds"
    />

    <div v-else-if="finished" class="deck-card mx-auto max-w-2xl p-8 text-center">
      <p class="text-7xl" aria-hidden="true">
        {{ scorePercent === 100 ? '🎉' : scorePercent >= 70 ? '🌟' : '💪' }}
      </p>
      <p class="mt-3 text-sm font-bold tracking-[0.2em] uppercase opacity-50">
        {{ t('quiz.complete') }}
      </p>
      <p class="my-2 font-[family-name:var(--font-word)] text-6xl font-bold">
        {{ correctCount }} / {{ questions.length }}
      </p>
      <p class="text-lg opacity-70">
        {{
          scorePercent === 100
            ? t('quiz.summaryPerfect')
            : scorePercent >= 70
              ? t('quiz.summaryStrong')
              : t('quiz.summaryLow')
        }}
      </p>

      <div class="mx-auto mt-6 max-w-sm">
        <ProgressBar
          :value="scorePercent"
          :accent="level.accent"
          :show-percent="false"
        />
      </div>

      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <AppButton variant="ghost" @click="start">{{ t('quiz.again') }}</AppButton>
        <AppButton
          variant="primary"
          :to="{ name: 'level', params: { levelId: level.id } }"
        >
          {{ t('quiz.backToLevel') }}
        </AppButton>
      </div>
    </div>
  </div>

  <LevelNotFound v-else />
</template>
