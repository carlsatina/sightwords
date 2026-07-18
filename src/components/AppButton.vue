<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

type Variant = 'primary' | 'success' | 'danger' | 'quiet' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    disabled?: boolean
    block?: boolean
    type?: 'button' | 'submit'
    /** When set, renders a RouterLink instead of a button. Nesting a button
     *  inside a link is invalid HTML and breaks keyboard navigation. */
    to?: RouteLocationRaw
  }>(),
  { variant: 'primary', size: 'md', disabled: false, block: false, type: 'button' },
)

// The hard bottom edge is what makes these read as physical keys; each variant
// pairs a face colour with a deeper shade of itself for that edge.
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-marigold text-ink shadow-[0_5px_0_0_var(--color-marigold-deep)]',
  success: 'bg-mint text-white shadow-[0_5px_0_0_var(--color-mint-deep)]',
  danger: 'bg-coral text-white shadow-[0_5px_0_0_var(--color-coral-deep)]',
  quiet: 'bg-grape text-white shadow-[0_5px_0_0_var(--color-grape-deep)]',
  ghost:
    'bg-white text-ink shadow-[0_4px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_4px_0_0_rgba(0,0,0,0.5)]',
}

const SIZES: Record<Size, string> = {
  sm: 'px-4 py-2 text-base',
  md: 'px-6 py-3 text-lg',
  lg: 'px-8 py-4 text-2xl',
}

const classes = computed(() => [
  'chunky-btn inline-flex items-center justify-center gap-2 select-none',
  VARIANTS[props.variant],
  SIZES[props.size],
  props.block ? 'w-full' : '',
])
</script>

<template>
  <RouterLink v-if="to" :to="to" :class="classes">
    <slot />
  </RouterLink>
  <button v-else :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>
