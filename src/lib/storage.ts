/**
 * localStorage helpers. Every read is defensive: this app is the only writer,
 * but stored data outlives deploys, and a parse failure must never blank the
 * screen for a child mid-session — we fall back to the default instead.
 */

const PREFIX = 'sightwords:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Quota exceeded or private-browsing denial. Progress is a nicety, not a
    // reason to interrupt practice, so drop the write silently.
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* see save() */
  }
}

export const STORAGE_KEYS = {
  progress: 'progress',
  settings: 'settings',
  daily: 'daily',
  words: 'words',
} as const
