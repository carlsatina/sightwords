<script setup lang="ts">
import { useSpeech } from '@/composables/useSpeech'
import { useSettingsStore } from '@/stores/settings'

const props = withDefaults(
  defineProps<{ text: string; label?: string; size?: 'sm' | 'md' }>(),
  { size: 'md' },
)

const { supported, speak } = useSpeech()
const settings = useSettingsStore()
</script>

<template>
  <button
    v-if="supported && settings.settings.speechEnabled"
    type="button"
    class="chunky-btn inline-flex items-center gap-2 bg-white px-5 py-2.5 text-ink shadow-[0_4px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_4px_0_0_rgba(0,0,0,0.5)]"
    :class="size === 'sm' ? 'text-sm' : 'text-base'"
    :aria-label="label ?? `Hear the word ${props.text}`"
    @click="speak(props.text)"
  >
    <svg
      class="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M16 9a4 4 0 0 1 0 6" />
      <path d="M19 6.5a8 8 0 0 1 0 11" />
    </svg>
    <span>{{ label ?? 'Hear it' }}</span>
  </button>
</template>
