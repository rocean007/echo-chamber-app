/**
 * Cookie / consent categories (ePrivacy, GDPR-style granularity).
 * Operators must map these to their real Privacy Policy & vendor list.
 */
export type ConsentCategory = 'necessary' | 'functional' | 'analytics' | 'targeting'

export const CONSENT_CATEGORIES: ConsentCategory[] = [
  'necessary',
  'functional',
  'analytics',
  'targeting',
]

export interface ConsentCategories {
  necessary: boolean
  functional: boolean
  analytics: boolean
  targeting: boolean
}

/** Persisted record */
export interface ConsentRecord {
  /** Bump when category definitions or defaults change (forces re-prompt if you implement that). */
  version: number
  /** ISO timestamp when user saved preferences */
  savedAt: string
  categories: ConsentCategories
}

export type ConsentListener = (record: ConsentRecord | null) => void

export const CONSENT_STORAGE_KEY = 'echo-consent-v1'
export const CONSENT_COOKIE_NAME = 'ec_consent_v1'
export const CONSENT_VERSION = 1

export const DEFAULT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60
