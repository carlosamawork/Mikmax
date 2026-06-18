// components/Layout/Footer/NewsletterForm.tsx
'use client'

import {FormEvent, useState} from 'react'
import {useNewsletterSubscribe} from '@/hooks/useNewsletterSubscribe'
import s from './NewsletterForm.module.scss'
import type {NewsletterFormProps} from '@/types/footer'
import type {Dictionary} from '@/lib/i18n/getDictionary'

const DEFAULT_COPY: Dictionary['newsletter'] = {
  success: 'Thanks for subscribing.',
  alreadySubscribed: "You're already subscribed.",
  emailLabel: 'Email',
  error: 'Something went wrong. Try again.',
}

export default function NewsletterForm({
  title,
  subtitle,
  placeholder,
  buttonLabel,
  copy = DEFAULT_COPY,
}: NewsletterFormProps & {copy?: Dictionary['newsletter']}) {
  const [email, setEmail] = useState('')
  const {status, subscribe} = useNewsletterSubscribe()

  // Fall back when the CMS value is null/empty (a JS default param only covers undefined,
  // but the localized GROQ projection returns null when the field is unset in Sanity).
  const titleText = title || 'Keep in touch'
  const subtitleText =
    subtitle ||
    'Subscribe to our newsletter to get the latest updates on new releases, pre-orders, and exclusive content.'
  const placeholderText = placeholder || 'Enter your email'
  const buttonText = buttonLabel || 'Subscribe'

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'submitting' || status === 'success') return
    await subscribe(email)
  }

  return (
    <form className={s.form} onSubmit={onSubmit} noValidate>
      <p className={s.title}>{titleText}</p>
      <p className={s.subtitle}>{subtitleText}</p>

      <label htmlFor="newsletter-email" className={s.srOnly}>
        {copy.emailLabel}
      </label>
      <div className={s.inputWrap}>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholderText}
          className={s.input}
          disabled={status === 'submitting' || status === 'success'}
        />
        <button
          type="submit"
          className={s.button}
          disabled={status === 'submitting' || status === 'success' || !email}
        >
          {status === 'submitting' ? '…' : buttonText}
        </button>
      </div>

      {status === 'success' && <p className={s.feedback}>{copy.success}</p>}
      {status === 'already' && <p className={s.feedback}>{copy.alreadySubscribed}</p>}
      {status === 'error' && <p className={s.feedbackError}>{copy.error}</p>}
    </form>
  )
}
