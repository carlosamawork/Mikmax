'use client'

import {hasCookie, setCookie} from 'cookies-next'
import Link from 'next/link'
import {FormEvent, useEffect, useState} from 'react'
import {LazyImage} from '@/components/Common'
import {useNewsletterSubscribe} from '@/hooks/useNewsletterSubscribe'
import type {NewsletterPopup as NewsletterPopupData} from '@/sanity/types'
import s from './NewsletterPopup.module.scss'

export default function NewsletterPopup({data}: {data?: NewsletterPopupData}) {
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState('')
  const {status, subscribe} = useNewsletterSubscribe()

  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'site'
  const seenCookie = `${clientId}_newsletter_25`
  const consentCookie = `${clientId}_localConsent_25`
  const enabled = Boolean(data?.enabled)
  const delayMs = (data?.delaySeconds ?? 10) * 1000

  useEffect(() => {
    if (!enabled || hasCookie(seenCookie)) return

    let shown = false
    let delayDone = false

    const maybeShow = () => {
      if (shown) return
      // Solo cuando ha pasado el retardo Y el banner de cookies está resuelto.
      if (delayDone && hasCookie(consentCookie)) {
        shown = true
        setVisible(true)
      }
    }

    const timer = setTimeout(() => {
      delayDone = true
      maybeShow()
    }, delayMs)

    const onConsent = () => maybeShow()
    window.addEventListener('mikmax:consentchange', onConsent)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('mikmax:consentchange', onConsent)
    }
  }, [enabled, delayMs, seenCookie, consentCookie])

  function dismiss() {
    setVisible(false)
    setCookie(seenCookie, '1', {maxAge: 60 * 60 * 24 * 30})
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'submitting' || status === 'success') return
    // El hook marca la cookie del pop-up al tener éxito.
    void subscribe(email)
  }

  if (!enabled || !visible || !data) return null

  return (
    <div className={s.overlay} onClick={dismiss}>
      <div className={s.card} onClick={(e) => e.stopPropagation()}>
        {data.image?.imageUrl && (
          <div className={s.media}>
            <LazyImage
              src={data.image.imageUrl}
              alt={data.image.alt ?? ''}
              fill
              sizes="(min-width: 768px) 369px, 100vw"
              className={s.img}
            />
          </div>
        )}
        <div className={s.body}>
          <button type="button" className={s.close} onClick={dismiss}>
            Close
          </button>

          {data.heading && <p className={s.heading}>{data.heading}</p>}

          <form className={s.form} onSubmit={onSubmit} noValidate>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={s.input}
              disabled={status === 'submitting' || status === 'success'}
            />
            <button
              type="submit"
              className={s.send}
              disabled={status === 'submitting' || status === 'success' || !email}
            >
              {status === 'submitting' ? '…' : 'Send'}
            </button>
          </form>

          {status === 'success' && <p className={s.feedback}>Thanks for subscribing.</p>}
          {status === 'already' && <p className={s.feedback}>You&apos;re already subscribed.</p>}
          {status === 'error' && <p className={s.feedbackError}>Something went wrong. Try again.</p>}

          {data.legalText && (
            <p className={s.legal}>
              {data.legalText}{' '}
              <Link href="/legal/privacy-policy" className={s.legalLink}>
                privacy policy
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
