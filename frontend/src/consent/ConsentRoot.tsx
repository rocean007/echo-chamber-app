import { useEffect, type ReactNode } from 'react'
import { consentManager } from './consentManager'
import { loadAnalyticsIfConsented, applyGtagConsentMode } from './analytics'
import { ConsentProvider } from './ConsentContext'
import { ConsentBanner } from './ConsentBanner'
import { PreferenceCenter } from './PreferenceCenter'

/** Mount consent UI + sync analytics with stored choices. */
export function ConsentRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    consentManager.invalidateCache()
    if (consentManager.readFromStorage()) {
      document.documentElement.classList.add('echo-consent-known')
    }
    loadAnalyticsIfConsented()
  }, [])

  useEffect(() => {
    return consentManager.subscribe(() => {
      applyGtagConsentMode()
      loadAnalyticsIfConsented()
    })
  }, [])

  return (
    <ConsentProvider>
      {children}
      <ConsentBanner />
      <PreferenceCenter />
    </ConsentProvider>
  )
}
