'use client'

import {usePathname, useRouter} from 'next/navigation'
import {setCookie} from 'cookies-next'
import type {Locale} from '@/lib/i18n/config'
import {localizedHref} from '@/lib/i18n/localizedHref'
import styles from './LanguageSwitcher.module.scss'

export default function LanguageSwitcher({
  current,
  className,
}: {
  current: Locale
  className?: string
}) {
  const pathname = usePathname()
  const router = useRouter()

  const target: Locale = current === 'en' ? 'es' : 'en'

  function switchTo(locale: Locale) {
    if (locale === current) return
    setCookie('NEXT_LOCALE', locale, {maxAge: 60 * 60 * 24 * 365, path: '/'})
    const base = pathname.replace(/^\/es(\/|$)/, '/')
    router.push(localizedHref(base, locale))
  }

  return (
    <div className={className ? `${styles.switcher} ${className}` : styles.switcher}>
      <button onClick={() => switchTo(target)} aria-label={`Switch to ${target.toUpperCase()}`}>
        {target.toUpperCase()}
      </button>
    </div>
  )
}
