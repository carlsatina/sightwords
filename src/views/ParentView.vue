<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWordsStore } from '@/stores/words'
import { useSettingsStore } from '@/stores/settings'
import { useProgressStore } from '@/stores/progress'
import { useSpeech } from '@/composables/useSpeech'
import AppButton from '@/components/AppButton.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import type { LevelId } from '@/types'

const library = useWordsStore()
const settings = useSettingsStore()
const progress = useProgressStore()
const { voices, supported: speechSupported, speak } = useSpeech()

const confirmingReset = ref(false)

function toggleLevel(id: LevelId) {
  const current = settings.settings.unlockedLevels
  const next = current.includes(id)
    ? current.filter((l) => l !== id)
    : [...current, id]
  settings.setUnlockedLevels(next)
}

function confirmReset() {
  progress.resetAll()
  confirmingReset.value = false
}

const recentActivity = computed(() =>
  progress.state.recentAnswers.slice(0, 12).map((answer) => ({
    ...answer,
    text: library.getWord(answer.wordId)?.text ?? answer.wordId,
    when: new Date(answer.at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
  })),
)

/**
 * English voices first, since the words are English and a non-English voice
 * reads them with the wrong phoneme set — but the rest stay selectable rather
 * than hidden, because a bilingual household may well want one.
 */
const groupedVoices = computed(() => {
  const byName = (a: SpeechSynthesisVoice, b: SpeechSynthesisVoice) =>
    a.name.localeCompare(b.name)
  return {
    english: voices.value.filter((v) => v.lang.startsWith('en')).sort(byName),
    other: voices.value.filter((v) => !v.lang.startsWith('en')).sort(byName),
  }
})

/** Picking a voice plays it straight away — you judge a voice by hearing it. */
function chooseVoice(voiceURI: string) {
  settings.update('speechVoiceURI', voiceURI || null)
  speak('The cat is here.')
}
</script>

<template>
  <div class="pt-6">
    <h1 class="mb-6 text-4xl font-extrabold">Parent settings</h1>

    <!-- Overview -->
    <section class="deck-card mb-5 p-5">
      <h2 class="mb-4 text-xl font-extrabold">Progress</h2>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p class="text-3xl font-extrabold tabular-nums">{{ progress.masteredCount }}</p>
          <p class="text-xs font-semibold opacity-55">Words mastered</p>
        </div>
        <div>
          <p class="text-3xl font-extrabold tabular-nums">{{ progress.accuracy }}%</p>
          <p class="text-xs font-semibold opacity-55">Accuracy</p>
        </div>
        <div>
          <p class="text-3xl font-extrabold tabular-nums">{{ progress.state.currentStreak }}</p>
          <p class="text-xs font-semibold opacity-55">Day streak</p>
        </div>
        <div>
          <p class="text-3xl font-extrabold tabular-nums">{{ progress.state.dailyCompletions }}</p>
          <p class="text-xs font-semibold opacity-55">Dailies finished</p>
        </div>
      </div>

      <div class="mt-6 space-y-3">
        <ProgressBar
          v-for="level in library.levels"
          :key="level.id"
          :value="progress.masteredByLevel[level.id]"
          :max="level.words.length"
          :accent="level.accent"
          :label="level.name"
        />
      </div>
    </section>

    <!-- Words -->
    <section class="deck-card mb-5 p-5">
      <h2 class="text-xl font-extrabold">Words</h2>
      <p class="mb-4 text-sm opacity-60">
        {{ library.allWords.length }} words across {{ library.levels.length }} levels{{
          library.isCustomised ? ', including your changes' : ''
        }}. Add your own, edit the built-in ones, or save the list to a file.
      </p>
      <AppButton variant="quiet" size="sm" :to="{ name: 'words' }">
        Manage words
      </AppButton>
    </section>

    <!-- Levels -->
    <section class="deck-card mb-5 p-5">
      <h2 class="text-xl font-extrabold">Available levels</h2>
      <p class="mb-4 text-sm opacity-60">
        Turn off levels that are too hard for now. Hidden levels don't appear on the
        home screen or in daily practice.
      </p>
      <div class="space-y-2">
        <label
          v-for="level in library.levels"
          :key="level.id"
          class="flex cursor-pointer items-center gap-3 rounded-2xl bg-ink/5 p-3 dark:bg-white/5"
        >
          <input
            type="checkbox"
            class="h-6 w-6 accent-[var(--color-grape)]"
            :checked="settings.isLevelUnlocked(level.id)"
            @change="toggleLevel(level.id)"
          />
          <span>
            <span class="block font-bold">{{ level.name }}</span>
            <span class="block text-xs opacity-55">
              {{ level.ageRange }} · {{ level.words.length }} words
            </span>
          </span>
        </label>
      </div>
    </section>

    <!-- Daily goal -->
    <section class="deck-card mb-5 p-5">
      <h2 class="text-xl font-extrabold">Daily practice</h2>
      <p class="mb-4 text-sm opacity-60">
        How many words appear in a daily session. Changes apply tomorrow.
      </p>
      <label class="flex items-center gap-4">
        <input
          type="range"
          min="5"
          max="20"
          step="1"
          class="w-full accent-[var(--color-grape)]"
          :value="settings.settings.dailyGoal"
          @input="
            settings.update('dailyGoal', Number(($event.target as HTMLInputElement).value))
          "
        />
        <span class="w-16 text-right text-2xl font-extrabold tabular-nums">
          {{ settings.settings.dailyGoal }}
        </span>
      </label>
    </section>

    <!-- Speech -->
    <section class="deck-card mb-5 p-5">
      <h2 class="text-xl font-extrabold">Pronunciation</h2>
      <p v-if="!speechSupported" class="mt-2 text-sm opacity-60">
        This browser has no speech support, so words can't be read aloud. Everything
        else works normally.
      </p>

      <template v-else>
        <label class="mt-3 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            class="h-6 w-6 accent-[var(--color-grape)]"
            :checked="settings.settings.speechEnabled"
            @change="
              settings.update(
                'speechEnabled',
                ($event.target as HTMLInputElement).checked,
              )
            "
          />
          <span class="font-bold">Read words aloud</span>
        </label>

        <template v-if="settings.settings.speechEnabled">
          <label class="mt-3 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              class="h-6 w-6 accent-[var(--color-grape)]"
              :checked="settings.settings.autoSpeak"
              @change="
                settings.update('autoSpeak', ($event.target as HTMLInputElement).checked)
              "
            />
            <span>
              <span class="block font-bold">Say each word automatically</span>
              <span class="block text-xs opacity-55">
                Off by default, so the child reads the word before hearing it. The
                “Hear it” button always works.
              </span>
            </span>
          </label>

          <label class="mt-5 block">
            <span class="mb-1 block text-sm font-semibold opacity-70">
              Speed · {{ settings.settings.speechRate.toFixed(2) }}×
            </span>
            <input
              type="range"
              min="0.5"
              max="1.2"
              step="0.05"
              class="w-full accent-[var(--color-grape)]"
              :value="settings.settings.speechRate"
              @input="
                settings.update(
                  'speechRate',
                  Number(($event.target as HTMLInputElement).value),
                )
              "
            />
          </label>

          <div class="mt-4">
            <label class="block">
              <span class="mb-1 block text-sm font-semibold opacity-70">Voice</span>
              <select
                class="w-full rounded-2xl bg-ink/5 p-3 font-semibold dark:bg-white/10"
                :value="settings.settings.speechVoiceURI ?? ''"
                :disabled="voices.length === 0"
                @change="chooseVoice(($event.target as HTMLSelectElement).value)"
              >
                <option value="">Browser default</option>
                <optgroup v-if="groupedVoices.english.length" label="English">
                  <option
                    v-for="voice in groupedVoices.english"
                    :key="voice.voiceURI"
                    :value="voice.voiceURI"
                  >
                    {{ voice.name }} ({{ voice.lang }})
                  </option>
                </optgroup>
                <optgroup v-if="groupedVoices.other.length" label="Other languages">
                  <option
                    v-for="voice in groupedVoices.other"
                    :key="voice.voiceURI"
                    :value="voice.voiceURI"
                  >
                    {{ voice.name }} ({{ voice.lang }})
                  </option>
                </optgroup>
              </select>
            </label>

            <!-- Say why the list is empty rather than hiding the control, which
                 reads as the feature not existing. -->
            <p v-if="voices.length === 0" class="mt-2 text-xs opacity-55">
              Still looking for voices on this device. If none appear, this browser
              only offers its default voice.
            </p>
            <p v-else class="mt-2 text-xs opacity-55">
              {{ voices.length }} voices available. Choosing one plays a sample.
            </p>
          </div>

          <AppButton
            class="mt-4"
            variant="ghost"
            size="sm"
            @click="speak('The cat is here.')"
          >
            Test voice
          </AppButton>
        </template>
      </template>
    </section>

    <!-- Display -->
    <section class="deck-card mb-5 p-5">
      <h2 class="mb-3 text-xl font-extrabold">Display</h2>

      <span class="mb-1 block text-sm font-semibold opacity-70">Theme</span>
      <div class="mb-5 flex gap-2">
        <button
          v-for="mode in (['light', 'dark', 'system'] as const)"
          :key="mode"
          type="button"
          class="chunky-btn flex-1 px-3 py-2.5 text-sm capitalize"
          :class="
            settings.settings.darkMode === mode
              ? 'bg-grape text-white shadow-[0_4px_0_0_var(--color-grape-deep)]'
              : 'bg-ink/5 dark:bg-white/10'
          "
          @click="settings.setDarkMode(mode)"
        >
          {{ mode }}
        </button>
      </div>

      <label class="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          class="h-6 w-6 accent-[var(--color-grape)]"
          :checked="settings.settings.confettiEnabled"
          @change="
            settings.update('confettiEnabled', ($event.target as HTMLInputElement).checked)
          "
        />
        <span class="font-bold">Confetti on milestones</span>
      </label>

      <label class="mt-3 flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          class="h-6 w-6 accent-[var(--color-grape)]"
          :checked="settings.settings.showFocusControls"
          @change="
            settings.update(
              'showFocusControls',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        <span>
          <span class="block font-bold">Show buttons in big word mode</span>
          <span class="block text-xs opacity-55">
            Off by default — tap the word to hear it, swipe to move between words.
            The close button always stays.
          </span>
        </span>
      </label>

      <label class="mt-3 flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          class="h-6 w-6 accent-[var(--color-grape)]"
          :checked="settings.settings.reduceMotion"
          @change="
            settings.update('reduceMotion', ($event.target as HTMLInputElement).checked)
          "
        />
        <span>
          <span class="block font-bold">Reduce motion</span>
          <span class="block text-xs opacity-55">
            Turns off animations and confetti.
          </span>
        </span>
      </label>
    </section>

    <!-- Recent activity -->
    <section v-if="recentActivity.length" class="deck-card mb-5 p-5">
      <h2 class="mb-3 text-xl font-extrabold">Recent activity</h2>
      <ul class="divide-y divide-ink/10 dark:divide-white/10">
        <li
          v-for="(answer, i) in recentActivity"
          :key="`${answer.wordId}-${i}`"
          class="flex items-center gap-3 py-2.5"
        >
          <span aria-hidden="true">{{ answer.correct ? '✅' : '🔁' }}</span>
          <span class="font-[family-name:var(--font-word)] text-lg font-bold">
            {{ answer.text }}
          </span>
          <span class="ml-auto text-xs capitalize opacity-50">
            {{ answer.mode }} · {{ answer.when }}
          </span>
        </li>
      </ul>
    </section>

    <!-- Reset -->
    <section class="deck-card border-l-8 border-coral p-5">
      <h2 class="text-xl font-extrabold">Reset progress</h2>
      <p class="mb-4 text-sm opacity-60">
        Clears every word score, badge, and streak on this device. This cannot be
        undone.
      </p>

      <div v-if="!confirmingReset">
        <AppButton variant="ghost" size="sm" @click="confirmingReset = true">
          Reset all progress
        </AppButton>
      </div>
      <div v-else class="flex flex-wrap items-center gap-3">
        <span class="font-bold">Erase everything?</span>
        <AppButton variant="danger" size="sm" @click="confirmReset">
          Yes, erase it
        </AppButton>
        <AppButton variant="ghost" size="sm" @click="confirmingReset = false">
          Cancel
        </AppButton>
      </div>
    </section>
  </div>
</template>
