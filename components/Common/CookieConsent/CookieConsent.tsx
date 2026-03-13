'use client'

import {hasCookie, setCookie} from 'cookies-next'
import Link from 'next/link'
import {useEffect, useState} from 'react'
import s from './CookieConsent.module.scss'

const POPUP_DELAY = 5000

type Preferences = {
  analytics: boolean
  marketing: boolean
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [prefs, setPrefs] = useState<Preferences>({analytics: true, marketing: true})

  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'site'
  const cookieName = `${clientId}_localConsent_25`

  useEffect(() => {
    if (hasCookie(cookieName)) return

    const timer = setTimeout(() => {
      setVisible(true)
    }, POPUP_DELAY)

    return () => clearTimeout(timer)
  }, [cookieName])

  const saveConsent = (preferences: Preferences) => {
    setCookie(cookieName, JSON.stringify(preferences), {maxAge: 60 * 60 * 24 * 60})
    setVisible(false)
    setShowManage(false)
  }

  const acceptAll = () => saveConsent({analytics: true, marketing: true})
  const denyAll = () => saveConsent({analytics: false, marketing: false})

  if (!visible) return null

  return (
    <div className={`fixed inset-0 z-[120] flex items-end justify-center bg-black/30 ${s.cookieConsent}`}>
      {!showManage ? (
        <div className="w-full bg-white p-6 shadow-xl">
          <p className="mb-6">
            We use cookies and similar technologies to enhance your experience, provide personalized
            content, improve site functionality, and analyze traffic. You can accept all cookies or
            customize your preferences. Learn more in our{' '}
            <Link href="/privacy-policy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>

          <div className="flex flex-col gap-[10px] sm:flex-row sm:justify-between">
            <button
              className="flex-1 border bg-white px-4 py-3 uppercase hover:bg-black hover:text-white"
              onClick={() => setShowManage(true)}
            >
              Manage Preferences
            </button>
            <button
              className="flex-1 border bg-white px-4 py-3 uppercase hover:bg-black hover:text-white"
              onClick={acceptAll}
            >
              Accept All
            </button>
            <button
              className="flex-1 border bg-white px-4 py-3 uppercase hover:bg-black hover:text-white"
              onClick={denyAll}
            >
              Decline All
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full bg-white p-6 shadow-xl">
          <p className="mb-6">Learn more about the cookies we use, and choose which cookies to allow.</p>

          <div className="mb-6 flex flex-col gap-[10px] sm:flex-row sm:justify-between">
            <button
              className="flex-1 border bg-white px-4 py-3 uppercase hover:bg-black hover:text-white"
              onClick={acceptAll}
            >
              Accept All
            </button>
            <button
              className="flex-1 border bg-white px-4 py-3 uppercase hover:bg-black hover:text-white"
              onClick={denyAll}
            >
              Decline All
            </button>
            <button
              className="flex-1 border bg-white px-4 py-3 uppercase hover:bg-black hover:text-white"
              onClick={() => saveConsent(prefs)}
            >
              Save Preferences
            </button>
          </div>

          <label className={`${s.checkboxWrapper} mb-4`}>
            <input type="checkbox" checked disabled />
            <div className={`${s.checkboxSquare} ${s.disabled}`} />
            <div className={s.checkboxContent}>
              <p>REQUIRED</p>
              <p>
                These cookies are necessary for the website to function properly, including features like
                adding items to the cart. These cannot be disabled.
              </p>
            </div>
          </label>

          <label className={`${s.checkboxWrapper} mb-4`}>
            <input
              type="checkbox"
              checked={prefs.marketing}
              onChange={() => setPrefs((prev) => ({...prev, marketing: !prev.marketing}))}
            />
            <div className={`${s.checkboxSquare} ${prefs.marketing ? s.checked : ''}`} />
            <div className={s.checkboxContent}>
              <p>MARKETING</p>
              <p>
                These cookies help us optimize marketing communications and show you relevant ads on other
                websites.
              </p>
            </div>
          </label>

          <label className={s.checkboxWrapper}>
            <input
              type="checkbox"
              checked={prefs.analytics}
              onChange={() => setPrefs((prev) => ({...prev, analytics: !prev.analytics}))}
            />
            <div className={`${s.checkboxSquare} ${prefs.analytics ? s.checked : ''}`} />
            <div className={s.checkboxContent}>
              <p>ANALYTICS</p>
              <p>
                These cookies help us understand how users interact with our site, allowing us to improve
                functionality and user experience. Data may be anonymized.
              </p>
            </div>
          </label>
        </div>
      )}
    </div>
  )
}
