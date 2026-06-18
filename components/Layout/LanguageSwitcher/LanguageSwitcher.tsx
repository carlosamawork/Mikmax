'use client'

import {usePathname, useRouter} from 'next/navigation'
import {setCookie} from 'cookies-next'
import type {Locale} from '@/lib/i18n/config'
import {localizedHref} from '@/lib/i18n/localizedHref'
import styles from './LanguageSwitcher.module.scss'

export default function LanguageSwitcher({current}: {current: Locale}) {
  const pathname = usePathname()
  const router = useRouter()

  function switchTo(locale: Locale) {
    if (locale === current) return
    setCookie('NEXT_LOCALE', locale, {maxAge: 60 * 60 * 24 * 365, path: '/'})
    const base = pathname.replace(/^\/es(\/|$)/, '/')
    router.push(localizedHref(base, locale))
  }

  return (
    <div className={styles.switcher}>
      <button aria-pressed={current === 'en'} onClick={() => switchTo('en')}>
        EN
      </button>
      <button aria-pressed={current === 'es'} onClick={() => switchTo('es')}>
        ES
      </button>
    </div>
  )
}
