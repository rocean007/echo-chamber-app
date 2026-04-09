/**
 * Consent-gated async work (e.g. IndexedDB open).
 * OpenDB itself is not wrapped — gate the open call with the right category per your policy.
 */
import { consentManager } from './consentManager'
import type { ConsentCategory } from './types'

export async function withStorageConsent<T>(
  category: ConsentCategory,
  fn: () => Promise<T>,
): Promise<T | null> {
  if (!consentManager.isAllowed(category)) {
    if (import.meta.env.DEV) {
      console.warn(`[consent] IndexedDB/async op blocked — "${category}" not allowed.`)
    }
    return null
  }
  return fn()
}
