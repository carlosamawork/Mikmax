'use client'

import {hasCookie} from 'cookies-next'
import Link from 'next/link'
import {useEffect, useState} from 'react'
import {useConsent} from '@/hooks/useConsent'
import s from './CookieConsent.module.scss'

type Preferences = {
  analytics: boolean
  marketing: boolean
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showManage, setShowManage] = useState(false)
  // RGPD/LSSI: las categorías opcionales nunca pueden aparecer pre-marcadas.
  const [prefs, setPrefs] = useState<Preferences>({analytics: false, marketing: false})
  const {updateConsent} = useConsent()

  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'site'
  const cookieName = `${clientId}_localConsent_25`

  // Bloqueante: aparece de inmediato y no se puede navegar hasta responder.
  useEffect(() => {
    if (hasCookie(cookieName)) return
    setVisible(true)
  }, [cookieName])

  // Mientras el banner está abierto, bloquea el scroll de la página.
  useEffect(() => {
    if (!visible) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [visible])

  // Pasa por useConsent: escribe la cookie, aplica Consent Mode v2 a gtag y
  // notifica a los ConsentGate (montan/ocultan pixels en la misma sesión).
  const saveConsent = (preferences: Preferences) => {
    updateConsent(preferences)
    setVisible(false)
    setShowManage(false)
  }

  const acceptAll = () => saveConsent({analytics: true, marketing: true})
  const onlyNecessary = () => saveConsent({analytics: false, marketing: false})

  if (!visible) return null

  return (
    <div className={s.wrap} role="dialog" aria-modal="true" aria-label="Cookie consent">
      <div className={s.card}>
        <p className={s.title}>At Mikmax, we respect your privacy</p>

        {!showManage ? (
          <>
            <p className={s.text}>
              We use cookies to personalise content and ads, provide social media features, and
              analyse our traffic. We also share information about your use of our site with our
              social media, advertising, and analytics partners. To learn more about how we use
              cookies and how you can manage them, view our{' '}
              <Link href="/legal/cookie-policy" className={s.link}>
                Cookie Policy
              </Link>
            </p>

            <div className={s.actions}>
              <div className={s.row}>
                <button type="button" className={`${s.btn} ${s.btnDark}`} onClick={onlyNecessary}>
                  Only necessary
                </button>
                <button type="button" className={`${s.btn} ${s.btnDark}`} onClick={acceptAll}>
                  Accept All
                </button>
              </div>
              <button
                type="button"
                className={`${s.btn} ${s.btnGrey}`}
                onClick={() => setShowManage(true)}
              >
                Manage settings
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={s.toggles}>
              <label className={s.checkboxWrapper}>
                <input type="checkbox" checked disabled readOnly />
                <span className={`${s.checkboxSquare} ${s.disabled}`} />
                <span className={s.checkboxContent}>
                  <p>Required</p>
                  <p>
                    Necessary for the website to function, including features like adding items to
                    the cart. These cannot be disabled.
                  </p>
                </span>
              </label>

              <label className={s.checkboxWrapper}>
                <input
                  type="checkbox"
                  checked={prefs.marketing}
                  onChange={() => setPrefs((p) => ({...p, marketing: !p.marketing}))}
                />
                <span className={`${s.checkboxSquare} ${prefs.marketing ? s.checked : ''}`} />
                <span className={s.checkboxContent}>
                  <p>Marketing</p>
                  <p>Helps us optimise marketing and show you relevant ads on other websites.</p>
                </span>
              </label>

              <label className={s.checkboxWrapper}>
                <input
                  type="checkbox"
                  checked={prefs.analytics}
                  onChange={() => setPrefs((p) => ({...p, analytics: !p.analytics}))}
                />
                <span className={`${s.checkboxSquare} ${prefs.analytics ? s.checked : ''}`} />
                <span className={s.checkboxContent}>
                  <p>Analytics</p>
                  <p>
                    Helps us understand how users interact with our site to improve it. Data may be
                    anonymized.
                  </p>
                </span>
              </label>
            </div>

            <div className={s.actions}>
              <div className={s.row}>
                <button type="button" className={`${s.btn} ${s.btnDark}`} onClick={onlyNecessary}>
                  Decline all
                </button>
                <button type="button" className={`${s.btn} ${s.btnDark}`} onClick={acceptAll}>
                  Accept all
                </button>
              </div>
              <button
                type="button"
                className={`${s.btn} ${s.btnGrey}`}
                onClick={() => saveConsent(prefs)}
              >
                Save preferences
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
