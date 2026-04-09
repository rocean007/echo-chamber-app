export type { ConsentCategory, ConsentCategories, ConsentRecord } from './types'
export {
  CONSENT_STORAGE_KEY,
  CONSENT_COOKIE_NAME,
  CONSENT_VERSION,
  CONSENT_CATEGORIES,
  DEFAULT_MAX_AGE_SECONDS,
} from './types'
export { consentManager, CONSENT_CHANGE_EVENT } from './consentManager'
export { setCookie, getCookie, deleteCookie } from './cookieUtils'
export {
  functionalStorage,
  preferenceStorage,
  analyticsStorage,
  purgeStorageForRevokedCategories,
} from './consentStorage'
export { useConsent, onConsentChange } from './useConsent'
export { ConsentRoot } from './ConsentRoot'
export { ConsentBanner } from './ConsentBanner'
export { PreferenceCenter } from './PreferenceCenter'
export { ConsentProvider, useConsentShell } from './ConsentContext'
export { loadAnalyticsIfConsented, applyGtagConsentMode } from './analytics'
export { withStorageConsent } from './idb'
