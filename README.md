# Sight Words

A sight words learning app for children aged roughly 3–8, built for a parent and
child to use side by side on a tablet. Everything runs in the browser: no backend,
no accounts, no network calls. Progress lives in `localStorage` on the device.

## Getting started

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `vue-tsc` only |
| `npm test` | Run the test suite |

## Modes

- **Flash Cards** — one word per screen, previous/next, optional sentence and
  audio. Arrow keys navigate; space repeats the word.
- **Practice** — the child reads a word aloud and a grown-up marks *Correct* or
  *Try again*. The child never marks their own work.
- **Quiz** — hears a word and picks it from four choices. Distractors are drawn
  from the same level so the choice is a real discrimination test. Where speech
  is unavailable, the word is blanked out of its sentence instead, which tests
  the same recognition without giving the answer away.
- **Review** — only the words that have been missed and not yet re-mastered.
- **Daily Practice** — ten words, fixed for the calendar day so an interrupted
  session resumes where it left off rather than redrawing.

## How progress works

A word is **mastered** after three consecutive correct answers
(`MASTERY_STREAK` in `src/stores/progress.ts`). A single miss resets that streak
and moves the word into Review — the child has to prove it again. Historical
correct/incorrect tallies are kept either way.

Streaks use the device's **local** calendar date. Using UTC would break a streak
for anyone practising in the evening west of Greenwich.

## Levels and the word list

Five levels follow the Dolch groupings, which are ordered by how early a child
typically meets each word rather than by spelling difficulty. Each word carries
a sentence: reading a word in isolation is the test, reading it in context is
the lesson. A test asserts every sentence actually contains its own word.

The shipped list lives in `src/data/words.ts` and acts as the seed. At runtime
the app reads from the **words store** (`src/stores/words.ts`), which starts
from that seed and switches to a saved copy in `localStorage` the moment a
parent edits anything.

**Parent settings → Manage words** is the editor: add, edit, and remove words
per level, export the whole list as JSON, import one back, or restore the
built-ins. There is no backend and no file to hand-edit — export/import is how
a list moves between devices.

Two rules the editor enforces, both for real reasons:

- **Every sentence must contain its word.** The quiz blanks the word out of its
  sentence when speech is unavailable; without the word present, that question
  is unanswerable.
- **A level cannot be emptied.** An empty level still renders a tappable card
  that leads nowhere.

Imports are validated before they are accepted — wrong version, duplicate
words, bad level ids, and missing sentences are all rejected with a message
naming the problem, so a bad file can't leave a child with a broken app. A
saved library that fails to parse falls back to the built-in list.

Deleting a word also deletes its score, so mastery counts and the review queue
never reference words that no longer exist.

## Parent settings

Reachable from the header, and open — there is no PIN gate. Covers per-level
availability, daily goal, speech voice and rate, theme, confetti, reduced
motion, and a full progress reset.

Note that this puts **Reset all progress** within a child's reach. It is behind
a confirm step, but if that turns out to matter in practice, a gate belongs
here.

## Design notes

Words the child reads are set in **Andika**, SIL's typeface for beginning
readers — unambiguous letterforms, single-story `a`, open `g`, distinct `I`/`l`.
The surrounding interface uses **Baloo 2**. That split is the whole idea: the
learning surface is pedagogical, the frame around it is playful.

Flash cards render as a physical deck, with real offset cards behind the top one,
so the stack reads as an object rather than a container. Buttons carry a hard
bottom edge instead of a blur, so they read as pressable keys at any size.

Accessibility: keyboard focus is visible throughout, status colours are always
paired with text, `prefers-reduced-motion` is honoured (and there is an in-app
toggle for it), and confetti is suppressed under either.

## Speech

Web Speech API, used strictly as an enhancement — every mode works unchanged
when it is unavailable, which is why the quiz has a no-audio fallback. Voice and
rate are configurable; the default rate is deliberately slower than natural
speech because it functions as a pronunciation model.

## Structure

```
src/
  components/   Reusable UI (WordCard, AppButton, ReadAloudSession, …)
  composables/  useSpeech, useConfetti
  data/         Built-in word list and badge definitions (+ tests)
  lib/          storage, dates, random, library validation (+ tests)
  stores/       Pinia stores: words, progress, settings (+ tests)
  types/        Shared interfaces
  views/        One per route
```

Practice, Review, and Daily share a single `ReadAloudSession` component; they
differ only in which words they pass to it.
