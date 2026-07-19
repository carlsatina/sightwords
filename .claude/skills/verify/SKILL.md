---
name: verify
description: Build, run and drive the Sight Words app in a real browser to confirm a change works. Use when verifying UI, language, speech, or progress-migration behaviour.
---

# Verifying Sight Words

Vue 3 + Vite + Pinia SPA. No backend — all state is in `localStorage`
under the `sightwords:` prefix. That makes it easy to drive: seed
storage, reload, observe.

## Launch

```bash
npx vite --port 5199        # background it; ready in ~400ms
```

## Drive it with Playwright

The repo has no Playwright dependency. Install it in the scratchpad,
**and pin it to a browser that is already downloaded** — `npx
playwright install` is slow and often unnecessary:

```bash
ls ~/Library/Caches/ms-playwright/     # find an installed chromium-NNNN
```

Launch with an explicit `executablePath`:

```js
chromium.launch({ executablePath:
  '<cache>/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' })
```

## Gotchas that cost time

- **`window.speechSynthesis` is an accessor** — plain assignment in an
  init script is a silent no-op and the app keeps reading Chrome's real
  ~180-voice list. Use `Object.defineProperty(window, 'speechSynthesis',
  { configurable: true, get: () => fake })`.
- **`.deck-card` matches the decorative stacked cards** behind the live
  one (empty, `aria-hidden`). Use
  `.deck-card:not([aria-hidden])` or you will read empty strings.
- **The speak button's accessible name is `"Hear the word X"`**, not its
  visible text `"Hear it"`. `getByRole('button', { name: /Hear it/ })`
  matches nothing. Locate on `button[aria-label^="Hear the word"]`.
- **`body.innerText` starts with the sr-only "Skip to content" link.**
  Read `#main` instead, or a blank page and a rendered one look alike.
- **Practice language and UI locale are separate settings.** Switching
  the language on the home screen leaves the buttons in English, so mark
  buttons still read "Correct", not "Tama".

## Storage keys worth seeding

`sightwords:words` (card library), `sightwords:progress`,
`sightwords:settings`, `sightwords:daily`. Seed *before* the app boots —
the stores read them once at construction — then `page.reload()`.

A version-1 save (flat `levels` array, bare word ids like `"the"`,
`progress.words`) exercises the migration path; after boot the ids
become `en:the` and the library becomes `{ version: 2, languages: [...] }`.

## Flows worth driving

- Language switch on the home screen: en (6 levels) / fil (4) / ja (3).
- `/flashcards/3` in Japanese — the kanji card (readings + meaning).
- `/quiz/3` in Japanese — asks for meaning, choices are English glosses.
- Filipino anything — no `fil-PH` voice on most desktops, so audio
  affordances must be absent and the quiz must fall back to a cloze
  sentence.
- A level id the current language lacks (`/level/6` in Japanese) — must
  show the "That level isn't here" card, not a blank page.
