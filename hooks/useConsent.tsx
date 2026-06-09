'use client'

import {getCookie, hasCookie, setCookie} from 'cookies-next'
import {useEffect, useState} from 'react'

import {applyConsentToGtag} from '@/lib/analytics/consent'

export type ConsentPreferences = {
  analytics: boolean
  marketing: boolean
}

// Evento de sincronización entre instancias de useConsent: al guardar el
// consentimiento, todas las instancias (p. ej. cada ConsentGate) se actualizan
// en la misma sesión, sin recargar.
const CONSENT_EVENT = 'mikmax:consentchange'

export function useConsent() {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null)
  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'site'
  const cookieName = `${clientId}_localConsent_25`

  useEffect(() => {
    if (hasCookie(cookieName)) {
      try {
        const stored = JSON.parse((getCookie(cookieName) as string) || '{}') as ConsentPreferences
        setConsent(stored)
        applyConsentToGtag(stored)
      } catch {
        setConsent(null)
      }
    } else {
      setConsent(null)
    }

    const onChange = (e: Event) => {
      const prefs = (e as CustomEvent<ConsentPreferences>).detail
      setConsent(prefs)
      applyConsentToGtag(prefs)
    }
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [cookieName])

  const updateConsent = (prefs: ConsentPreferences) => {
    setCookie(cookieName, JSON.stringify(prefs), {maxAge: 60 * 60 * 24 * 60})
    setConsent(prefs)
    applyConsentToGtag(prefs)
    window.dispatchEvent(new CustomEvent<ConsentPreferences>(CONSENT_EVENT, {detail: prefs}))
  }

  return {consent, updateConsent}
}
