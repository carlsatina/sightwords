<script setup lang="ts">
import { computed } from 'vue'
import type { AccentName } from '@/types'

const props = withDefaults(
  defineProps<{
    value: number
    max?: number
    accent?: AccentName
    label?: string
    showPercent?: boolean
  }>(),
  { max: 100, accent: 'mint', showPercent: true },
)

const percent = computed(() => {
  if (props.max <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((props.value / props.max) * 100)))
})

const FILLS: Record<AccentName, string> = {
  mint: 'bg-mint',
  marigold: 'bg-marigold',
  coral: 'bg-coral',
  grape: 'bg-grape',
  ink: 'bg-ink dark:bg-paper',
}
</script>

<template>
  <div>
    <div v-if="label || showPercent" class="mb-1.5 flex items-baseline justify-between">
      <span v-if="label" class="text-sm font-semibold opacity-70">{{ label }}</span>
      <span v-if="showPercent" class="text-sm font-bold tabular-nums opacity-70">
        {{ percent }}%
      </span>
    </div>
    <div
      class="h-4 w-full overflow-hidden rounded-full bg-ink/10 dark:bg-white/10"
      role="progressbar"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="label ?? 'Progress'"
    >
      <div
        class="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-settle)]"
        :class="FILLS[accent]"
        :style="{ width: `${percent}%` }"
      />
    </div>
  </div>
</template>
