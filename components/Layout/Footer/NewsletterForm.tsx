// components/Layout/Footer/NewsletterForm.tsx
'use client'

import {FormEvent, useState} from 'react'
import s from './NewsletterForm.module.scss'
import type {NewsletterFormProps} from '@/types/footer'

type Status = 'idle' | 'submitting' | 'success' | 'error' | 'already'

export default function NewsletterForm({
  title = 'Keep in touch',
  subtitle = 'Subscribe to our newsletter to get the latest updates on new releases, pre-orders, and exclusive content.',
  placeholder = 'Enter your email',
  buttonLabel = 'Subscribe',
}: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')

    try {
      const res = await fetch('/api/subscribeUser', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email}),
      })
      const json = (await res.json()) as {status?: number | string; error?: {title?: string}; data?: unknown}
      if (res.ok) {
        setStatus('success')
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

  return (
    <form className={s.form} onSubmit={onSubmit} noValidate>
      <p className={s.title}>{title}</p>
      <p className={s.subtitle}>{subtitle}</p>

      <label htmlFor="newsletter-email" className={s.srOnly}>
        Email
      </label>
      <div className={s.inputWrap}>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          className={s.input}
          disabled={status === 'submitting' || status === 'success'}
        />
        <button
          type="submit"
          className={s.button}
          disabled={status === 'submitting' || status === 'success' || !email}
        >
          {status === 'submitting' ? '…' : buttonLabel}
        </button>
      </div>

      {status === 'success' && <p className={s.feedback}>Thanks for subscribing.</p>}
      {status === 'already' && <p className={s.feedback}>You&apos;re already subscribed.</p>}
      {status === 'error' && <p className={s.feedbackError}>Something went wrong. Try again.</p>}
    </form>
  )
}
