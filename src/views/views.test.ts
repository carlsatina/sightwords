import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import type { Component } from 'vue'

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

function makeRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/level/:levelId', name: 'level', component: { template: '<div/>' } },
      { path: '/flashcards/:levelId', name: 'flashcards', component: { template: '<div/>' } },
      { path: '/practice/:levelId', name: 'practice', component: { template: '<div/>' } },
      { path: '/quiz/:levelId', name: 'quiz', component: { template: '<div/>' } },
      { path: '/review', name: 'review', component: { template: '<div/>' } },
      { path: '/daily', name: 'daily', component: { template: '<div/>' } },
      { path: '/achievements', name: 'achievements', component: { template: '<div/>' } },
      { path: '/parent', name: 'parent', component: { template: '<div/>' } },
      { path: '/parent/words', name: 'words', component: { template: '<div/>' } },
    ],
  })
}

async function mountView(component: Component, props: Record<string, unknown> = {}) {
  const router = makeRouter()
  await router.push('/')
  await router.isReady()
  return mount(component, { props, global: { plugins: [router] } })
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

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
    expect(wrapper.text()).toContain('Available levels')
    expect(wrapper.text()).not.toContain('PIN')
  })
})
