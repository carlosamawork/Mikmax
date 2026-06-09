// components/Layout/Footer/NewsletterForm.tsx
'use client'

import {FormEvent, useState} from 'react'
import {useNewsletterSubscribe} from '@/hooks/useNewsletterSubscribe'
import s from './NewsletterForm.module.scss'
import type {NewsletterFormProps} from '@/types/footer'

export default function NewsletterForm({
  title = 'Keep in touch',
  subtitle = 'Subscribe to our newsletter to get the latest updates on new releases, pre-orders, and exclusive content.',
  placeholder = 'Enter your email',
  buttonLabel = 'Subscribe',
}: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const {status, subscribe} = useNewsletterSubscribe()

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'submitting' || status === 'success') return
    await subscribe(email)
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
