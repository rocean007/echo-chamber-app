/**
 * Consent-aware storage: blocks writes when category not allowed.
 * Necessary: always allowed. Others require active consent.
 */
import type { ConsentCategory } from './types'
import { consentManager } from './consentManager'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
}

function wrap(backend: StorageLike, category: ConsentCategory): StorageLike {
  return {
    getItem(key: string) {
      return backend.getItem(key)
    },
    setItem(key: string, value: string) {
      if (!consentManager.isAllowed(category)) {
        if (import.meta.env.DEV) {
          console.warn(
            `[consent] Blocked setItem("${key}") — category "${category}" not consented.`,
          )
        }
        return
      }
      try {
        backend.setItem(key, value)
      } catch {
        /* quota */
      }
    },
    removeItem(key: string) {
      try {
        backend.removeItem(key)
      } catch {
        /* ignore */
      }
    },
    clear() {
      if (!consentManager.isAllowed(category)) return
      try {
        backend.clear()
      } catch {
        /* ignore */
      }
    },
  }
}

/** Functional + analytics-ish UI state flags (adjust mapping to your policy). */
export const functionalStorage =
  typeof sessionStorage !== 'undefined'
    ? wrap(sessionStorage, 'functional')
    : inMemory()

/** Long-lived prefs when user allows functional cookies. */
export const preferenceStorage =
  typeof localStorage !== 'undefined'
    ? wrap(localStorage, 'functional')
    : inMemory()

/** Only for data tied to measurement; use when analytics is true. */
export const analyticsStorage =
  typeof localStorage !== 'undefined'
    ? wrap(localStorage, 'analytics')
    : inMemory()

function inMemory(): StorageLike {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => {
      m.set(k, v)
    },
    removeItem: (k) => {
      m.delete(k)
    },
    clear: () => m.clear(),
  }
}

/**
 * Optional: run when user narrows consent — clear buckets that are no longer allowed.
 * Call after save/withdraw from your preference center.
 */
export function purgeStorageForRevokedCategories(): void {
  if (!consentManager.isAllowed('functional')) {
    try {
      /* Only remove keys your app owns — here we document pattern; app should list prefixes. */
      const prefixes = ['echo-ui-', 'echo-pref-']
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i)
        if (!k) continue
        if (prefixes.some((p) => k.startsWith(p))) localStorage.removeItem(k)
      }
      sessionStorage.clear()
    } catch {
      /* ignore */
    }
  }
  if (!consentManager.isAllowed('analytics')) {
    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith('echo-ga-')) keys.push(k)
      }
      keys.forEach((k) => localStorage.removeItem(k))
    } catch {
      /* ignore */
    }
  }
}
