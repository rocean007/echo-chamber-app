import { useCallback, useEffect, useSyncExternalStore } from 'react'
import type { ConsentCategories, ConsentRecord } from './types'
import { consentManager } from './consentManager'

export function useConsent() {
  const record = useSyncExternalStore(
    (onStoreChange) => consentManager.subscribe(() => onStoreChange()),
    () => consentManager.getSnapshot(),
    () => null,
  )

  const acceptAll = useCallback(() => {
    consentManager.acceptAll()
  }, [])

  const rejectNonEssential = useCallback(() => {
    consentManager.rejectNonEssential()
  }, [])

  const save = useCallback((categories: ConsentCategories) => {
    consentManager.save(categories)
  }, [])

  const withdraw = useCallback(() => {
    consentManager.withdraw()
  }, [])

  return {
    record,
    hasAnswered: record !== null,
    categories: record?.categories ?? consentManager.getDefaultCategories(),
    isAllowed: consentManager.isAllowed.bind(consentManager),
    acceptAll,
    rejectNonEssential,
    save,
    withdraw,
  }
}

/** Subscribe without React (e.g. game engine). */
export function onConsentChange(cb: (r: ConsentRecord | null) => void): () => void {
  return consentManager.subscribe(cb)
}
