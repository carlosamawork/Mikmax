// components/Layout/Header/HeaderClient.tsx
'use client'

import {useEffect, useState} from 'react'
import Link from 'next/link'
import s from './Header.module.scss'
import type {HeaderProps, HeaderVariant} from '@/types/header'
import MegaMenu from '../MegaMenu/MegaMenu'

export default function HeaderClient({menu, initialVariant = 'default'}: HeaderProps) {
  const [variant, setVariant] = useState<HeaderVariant>(initialVariant)
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (y < 16) setVariant('default')
      else if (y < 240) setVariant('variant2')
      else setVariant('variant3')
    }
    onScroll()
    window.addEventListener('scroll', onScroll, {passive: true})
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = menu?.links ?? []

  return (
    <header className={`${s.header} ${s[variant] ?? ''}`}>
      <div className={s.inner}>
        <Link href="/" className={s.logo}>
          MIKMAX
        </Link>

        <nav className={s.nav} aria-label="Main">
          {links.map((link) => {
            if (link._type === 'menuGroup') {
              const isActive = activeGroupKey === link._key
              return (
                <div
                  key={link._key}
                  className={s.navItem}
                  onMouseEnter={() => setActiveGroupKey(link._key)}
                  onMouseLeave={() => setActiveGroupKey(null)}
                >
                  <button
                    type="button"
                    className={s.navButton}
                    aria-expanded={isActive}
                    onFocus={() => setActiveGroupKey(link._key)}
                  >
                    {link.label}
                  </button>
                  {isActive && <MegaMenu group={link} />}
                </div>
              )
            }
            if (link._type === 'linkInternal') {
              return (
                <Link key={link._key} href={link.slug ? `/${link.slug}` : '#'} className={s.navLink}>
                  {link.title}
                </Link>
              )
            }
            return (
              <a
                key={link._key}
                href={link.url}
                target={link.newWindow ? '_blank' : undefined}
                rel={link.newWindow ? 'noopener noreferrer' : undefined}
                className={s.navLink}
              >
                {link.title}
              </a>
            )
          })}
        </nav>

        <div className={s.actions}>
          {/* CartButton lives in Phase 7; for now a placeholder */}
          <button type="button" className={s.cartBtn} aria-label="Cart">
            Cart
          </button>
        </div>
      </div>
    </header>
  )
}
