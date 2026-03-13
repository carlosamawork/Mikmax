'use client'

import {getCookie, hasCookie, setCookie} from 'cookies-next'
import {useEffect, useState} from 'react'

export type ConsentPreferences = {
  analytics: boolean
  marketing: boolean
}

export function useConsent() {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null)
  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'site'
  const cookieName = `${clientId}_localConsent_25`

  useEffect(() => {
    if (!hasCookie(cookieName)) {
      setConsent(null)
      return
    }

    try {
      const stored = JSON.parse((getCookie(cookieName) as string) || '{}') as ConsentPreferences
      setConsent(stored)
    } catch {
      setConsent(null)
    }
  }, [cookieName])

  const updateConsent = (prefs: ConsentPreferences) => {
    setCookie(cookieName, JSON.stringify(prefs), {maxAge: 60 * 60 * 24 * 60})
    setConsent(prefs)
  }

  return {consent, updateConsent}
}
