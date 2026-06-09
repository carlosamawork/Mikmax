'use client'

import {setCookie} from 'cookies-next'
import {useState} from 'react'

export type NewsletterStatus = 'idle' | 'submitting' | 'success' | 'error' | 'already'

export function useNewsletterSubscribe() {
  const [status, setStatus] = useState<NewsletterStatus>('idle')

  async function subscribe(email: string) {
    if (status === 'submitting') return
    setStatus('submitting')

    try {
      const res = await fetch('/api/subscribeUser', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email}),
      })
      const json = (await res.json()) as {error?: {title?: string}}

      if (res.ok) {
        setStatus('success')
        // Suscribirse (footer o pop-up) suprime el pop-up de newsletter.
        const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'site'
        setCookie(`${clientId}_newsletter_25`, '1', {maxAge: 60 * 60 * 24 * 30})
      } else if (
        typeof json.error === 'object' &&
        json.error !== null &&
        json.error.title?.toLowerCase().includes('member exists')
      ) {
        setStatus('already')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return {status, subscribe}
}
