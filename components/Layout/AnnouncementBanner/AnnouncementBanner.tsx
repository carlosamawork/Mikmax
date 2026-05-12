// components/Layout/AnnouncementBanner/AnnouncementBanner.tsx
'use client'

import {useEffect, useRef, useState} from 'react'
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
  const bannerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!enabled) return
    const stored = localStorage.getItem(STORAGE_KEY)
    setDismissed(stored === text)
  }, [enabled, text])

  const visible = enabled && !dismissed

  // Expose banner height as a CSS variable so the Header can offset itself.
  // Dispatch a scroll event after each change so the Header's scroll listener
  // re-runs and updates --header-top without waiting for the user to scroll.
  useEffect(() => {
    const root = document.documentElement
    if (!visible) {
      root.style.setProperty('--announcement-height', '0px')
      window.dispatchEvent(new Event('scroll'))
      return
    }
    const node = bannerRef.current
    const h = node?.offsetHeight ?? 21
    root.style.setProperty('--announcement-height', `${h+3}px`)
    window.dispatchEvent(new Event('scroll'))
    return () => {
      root.style.setProperty('--announcement-height', '0px')
      window.dispatchEvent(new Event('scroll'))
    }
  }, [visible])

  if (!visible) return null

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
    <div ref={bannerRef} className={s.banner} role="region" aria-label="Site announcement">
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
