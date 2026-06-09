import type {ConsentPreferences} from '@/hooks/useConsent'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

// Consent Mode v2: traduce las preferencias del usuario a gtag('consent','update').
export function applyConsentToGtag(prefs: ConsentPreferences) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('consent', 'update', {
    analytics_storage: prefs.analytics ? 'granted' : 'denied',
    ad_storage: prefs.marketing ? 'granted' : 'denied',
    ad_user_data: prefs.marketing ? 'granted' : 'denied',
    ad_personalization: prefs.marketing ? 'granted' : 'denied',
  })
}
