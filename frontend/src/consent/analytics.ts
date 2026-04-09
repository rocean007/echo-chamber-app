/**
 * Analytics loader + GA4 Consent Mode updates (optional).
 * Set VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX and extend CSP for Google endpoints when enabling.
 */
import { consentManager } from './consentManager'

let scriptInjected = false

export function applyGtagConsentMode(): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  const a = consentManager.isAllowed('analytics')
  const t = consentManager.isAllowed('targeting')
  window.gtag('consent', 'update', {
    analytics_storage: a ? 'granted' : 'denied',
    ad_storage: t ? 'granted' : 'denied',
    ad_user_data: t ? 'granted' : 'denied',
    ad_personalization: t ? 'granted' : 'denied',
  })
}

export function loadAnalyticsIfConsented(): void {
  if (typeof window === 'undefined') return
  if (navigator.doNotTrack === '1') return

  if (!consentManager.isAllowed('analytics')) {
    applyGtagConsentMode()
    return
  }

  const id = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined
  if (!id || !/^G-[A-Z0-9]+$/i.test(id)) {
    applyGtagConsentMode()
    return
  }

  if (!scriptInjected) {
    scriptInjected = true
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    script.crossOrigin = 'anonymous'
    document.head.appendChild(script)

    window.dataLayer = window.dataLayer || []
    function gtag(...args: unknown[]) {
      window.dataLayer!.push(args)
    }
    window.gtag = gtag
    gtag('js', new Date())
    gtag('config', id, { anonymize_ip: true })
  }

  applyGtagConsentMode()
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}
