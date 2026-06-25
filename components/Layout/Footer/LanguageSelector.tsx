'use client'

import {useState} from 'react'
import {usePathname, useRouter} from 'next/navigation'
import {setCookie} from 'cookies-next'
import type {Locale} from '@/lib/i18n/config'
import {localizedHref} from '@/lib/i18n/localizedHref'
// Reutiliza el desplegable del selector de país para un aspecto idéntico.
import s from './RegionSelector.module.scss'

const LOCALES: Locale[] = ['en', 'es']
const NAMES: Record<Locale, string> = {en: 'English', es: 'Español'}

export default function LanguageSelector({current}: {current: Locale}) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function pick(locale: Locale) {
    setOpen(false)
    if (locale === current) return
    setCookie('NEXT_LOCALE', locale, {maxAge: 60 * 60 * 24 * 365, path: '/'})
    const base = pathname.replace(/^\/es(\/|$)/, '/')
    router.push(localizedHref(base, locale))
  }

  return (
    <div className={s.wrap}>
      <button
        type="button"
        className={s.toggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={s.country}>{NAMES[current]}</span>
        <span className={s.icon} aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>

      {open && (
        <ul className={s.list} role="listbox">
          {LOCALES.map((loc) => (
            <li key={loc}>
              <button
                type="button"
                className={`${s.item} ${loc === current ? s.active : ''}`}
                onClick={() => pick(loc)}
                role="option"
                aria-selected={loc === current}
              >
                {NAMES[loc]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
