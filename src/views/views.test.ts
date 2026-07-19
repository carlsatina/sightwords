import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Component } from 'vue'
import { mountView, resetAppState } from '@/test/harness'

import HomeView from './HomeView.vue'
import LevelView from './LevelView.vue'
import FlashcardsView from './FlashcardsView.vue'
import PracticeView from './PracticeView.vue'
import QuizView from './QuizView.vue'
import ReviewView from './ReviewView.vue'
import DailyView from './DailyView.vue'
import AchievementsView from './AchievementsView.vue'
import ParentView from './ParentView.vue'
import WordsView from './WordsView.vue'

/**
 * Smoke tests: every view must mount and render something. A view that throws
 * during setup renders as a blank page in the browser with only a console
 * error, which is easy to miss and impossible to use.
 */

beforeEach(resetAppState)

const CASES: Array<[name: string, component: Component, props: Record<string, unknown>]> = [
  ['HomeView', HomeView, {}],
  ['LevelView', LevelView, { levelId: '1' }],
  ['FlashcardsView', FlashcardsView, { levelId: '1' }],
  ['PracticeView', PracticeView, { levelId: '1' }],
  ['QuizView', QuizView, { levelId: '1' }],
  ['ReviewView', ReviewView, {}],
  ['DailyView', DailyView, {}],
  ['AchievementsView', AchievementsView, {}],
  ['ParentView', ParentView, {}],
  ['WordsView', WordsView, {}],
]

describe('every view renders', () => {
  it.each(CASES)('%s mounts without error and is not blank', async (_name, component, props) => {
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args)
    })

    const wrapper = await mountView(component, props)

    expect(errors).toEqual([])
    expect(wrapper.text().trim().length).toBeGreaterThan(0)

    spy.mockRestore()
  })
})

describe('ParentView', () => {
  it('opens straight to the settings with no gate in the way', async () => {
    const wrapper = await mountView(ParentView)
    expect(wrapper.text()).toContain('Parent settings')
    expect(wrapper.text()).toContain('Available levels in English')
    expect(wrapper.text()).not.toContain('PIN')
  })
})

describe('every view renders in every language', () => {
  // A view that only works in English is the failure mode this whole change
  // exists to prevent, and Japanese exercises the kanji card path that no
  // other language reaches.
  const LANGUAGES = ['en', 'fil', 'ja'] as const

  it.each(LANGUAGES)('renders the home and level views in %s', async (code) => {
    const { useSettingsStore } = await import('@/stores/settings')
    const settings = useSettingsStore()
    settings.setLanguage(code)
    settings.setUiLocale(code)

    for (const [name, component, props] of CASES) {
      const errors: unknown[] = []
      const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
        errors.push(args)
      })

      const wrapper = await mountView(component, props, { locale: code })

      expect(errors, `${name} in ${code}`).toEqual([])
      expect(wrapper.text().trim().length, `${name} in ${code}`).toBeGreaterThan(0)

      spy.mockRestore()
    }
  })
})
