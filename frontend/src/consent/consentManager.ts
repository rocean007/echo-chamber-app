/**
 * Core consent manager: persistence, withdrawal, DNT, events.
 * Legal: wire your Privacy Policy / CMP ID; this is technical plumbing only.
 */
import {
  type ConsentCategories,
  type ConsentRecord,
  type ConsentListener,
  type ConsentCategory,
  CONSENT_STORAGE_KEY,
  CONSENT_COOKIE_NAME,
  CONSENT_VERSION,
  DEFAULT_MAX_AGE_SECONDS,
} from './types'
import { setCookie, getCookie, deleteCookie } from './cookieUtils'

export const CONSENT_CHANGE_EVENT = 'echo:consent-change'

function isDntEnabled(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { msDoNotTrack?: string }
  const win = window as Window & { doNotTrack?: string }
  return (
    nav.doNotTrack === '1' ||
    nav.msDoNotTrack === '1' ||
    win.doNotTrack === '1'
  )
}

function defaultCategories(): ConsentCategories {
  /* Necessary always on; others off until explicit consent (GDPR opt-in model). */
  const base: ConsentCategories = {
    necessary: true,
    functional: false,
    analytics: false,
    targeting: false,
  }
  if (isDntEnabled()) {
    base.analytics = false
    base.targeting = false
  }
  return base
}

function normalize(record: ConsentRecord): ConsentRecord {
  return {
    ...record,
    categories: {
      ...record.categories,
      necessary: true,
      /* Respect DNT for optional tracking even if old record had true (user agent override). */
      analytics: isDntEnabled() ? false : !!record.categories.analytics,
      targeting: isDntEnabled() ? false : !!record.categories.targeting,
    },
  }
}

function safeParse(json: string): ConsentRecord | null {
  try {
    const o = JSON.parse(json) as ConsentRecord
    if (!o || typeof o !== 'object' || !o.categories) return null
    return normalize({
      version: typeof o.version === 'number' ? o.version : CONSENT_VERSION,
      savedAt: typeof o.savedAt === 'string' ? o.savedAt : new Date().toISOString(),
      categories: {
        necessary: true,
        functional: !!o.categories.functional,
        analytics: !!o.categories.analytics,
        targeting: !!o.categories.targeting,
      },
    })
  } catch {
    return null
  }
}

const listeners = new Set<ConsentListener>()

function emit(record: ConsentRecord | null) {
  listeners.forEach((fn) => {
    try {
      fn(record)
    } catch {
      /* ignore subscriber errors */
    }
  })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<ConsentRecord | null>(CONSENT_CHANGE_EVENT, { detail: record }),
    )
  }
}

let cache: ConsentRecord | null | undefined

export const consentManager = {
  /** Synchronous read for bootstrap / SSR-safe first paint hints. */
  readFromStorage(): ConsentRecord | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
      if (raw) {
        const rec = safeParse(raw)
        if (rec && rec.version === CONSENT_VERSION) return rec
      }
    } catch {
      /* private mode / disabled */
    }
    const c = getCookie(CONSENT_COOKIE_NAME)
    if (c) {
      try {
        const rec = safeParse(decodeURIComponent(c))
        if (rec && rec.version === CONSENT_VERSION) return rec
      } catch {
        /* ignore */
      }
    }
    return null
  },

  getSnapshot(): ConsentRecord | null {
    if (cache !== undefined) return cache
    cache = this.readFromStorage()
    return cache
  },

  invalidateCache() {
    cache = undefined
  },

  isAllowed(category: ConsentCategory): boolean {
    const r = this.getSnapshot()
    if (!r) return category === 'necessary'
    if (category === 'necessary') return true
    return !!r.categories[category]
  },

  subscribe(fn: ConsentListener): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  save(categories: ConsentCategories, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS): ConsentRecord {
    const record: ConsentRecord = normalize({
      version: CONSENT_VERSION,
      savedAt: new Date().toISOString(),
      categories: { ...categories, necessary: true },
    })

    const json = JSON.stringify(record)

    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, json)
    } catch {
      /* quota / private mode */
    }

    setCookie(CONSENT_COOKIE_NAME, encodeURIComponent(json), {
      maxAgeSeconds,
      sameSite: 'Lax',
    })

    cache = record
    document.documentElement.classList.add('echo-consent-known')
    emit(record)
    return record
  },

  acceptAll(maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS): ConsentRecord {
    if (isDntEnabled()) {
      return this.save(
        {
          necessary: true,
          functional: true,
          analytics: false,
          targeting: false,
        },
        maxAgeSeconds,
      )
    }
    return this.save(
      {
        necessary: true,
        functional: true,
        analytics: true,
        targeting: true,
      },
      maxAgeSeconds,
    )
  },

  rejectNonEssential(maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS): ConsentRecord {
    return this.save(defaultCategories(), maxAgeSeconds)
  },

  /** Withdraw → only necessary; clears optional slots best-effort via storage wrapper consumers. */
  withdraw(maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS): ConsentRecord {
    return this.rejectNonEssential(maxAgeSeconds)
  },

  clearAll(): void {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    deleteCookie(CONSENT_COOKIE_NAME)
    cache = null
    document.documentElement.classList.remove('echo-consent-known')
    emit(null)
  },

  getDefaultCategories(): ConsentCategories {
    return defaultCategories()
  },
}
