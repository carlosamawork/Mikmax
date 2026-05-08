// components/Layout/AnnouncementBanner/AnnouncementBanner.tsx
'use client'

import {useEffect, useState} from 'react'
import Link from 'next/link'
import s from './AnnouncementBanner.module.scss'
import type {AnnouncementBanner} from '@/sanity/types'

interface Props {
  data?: AnnouncementBanner
}

const STORAGE_KEY = 'mikmax_banner_dismissed_text'

export default function AnnouncementBanner({data}: Props) {
  const text = data?.text ?? ''
  const enabled = !!data?.enabled && !!text
  const url = data?.url

  const [dismissed, setDismissed] = useState(true) // start hidden until SSR hydrates

  useEffect(() => {
    if (!enabled) return
    const stored = localStorage.getItem(STORAGE_KEY)
    setDismissed(stored === text)
  }, [enabled, text])

  if (!enabled || dismissed) return null

  function handleClose(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    localStorage.setItem(STORAGE_KEY, text)
    setDismissed(true)
  }

  const content = <span className={s.text}>{text}</span>

  const inner = (() => {
    if (!url) return content
    if (url.startsWith('/')) {
      return (
        <Link href={url} className={s.linkWrap}>
          {content}
        </Link>
      )
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={s.linkWrap}>
        {content}
      </a>
    )
  })()

  return (
    <div className={s.banner} role="region" aria-label="Site announcement">
      <div className={s.body}>{inner}</div>
      <button
        type="button"
        className={s.close}
        onClick={handleClose}
        aria-label="Cerrar banner"
      >
        ×
      </button>
    </div>
  )
}
