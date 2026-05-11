// components/Layout/Header/HeaderClient.tsx
'use client'

import {useContext, useEffect, useRef, useState} from 'react'
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import {CartContext} from '@/context/shopContext'
import s from './Header.module.scss'
import type {HeaderProps, HeaderVariant} from '@/types/header'
import MegaMenu from '../MegaMenu/MegaMenu'
import MegaMenuShop from '../MegaMenu/MegaMenuShop'
import MobileMenu from '../MobileMenu/MobileMenu'
import {getInternalHref} from '@/sanity/queries/fragments/links'

type CartItem = {quantity?: number}
type CartCtx = {cart?: CartItem[]}

export default function HeaderClient({menu, initialVariant = 'default'}: HeaderProps) {
  const [variant, setVariant] = useState<HeaderVariant>(initialVariant)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ctx = useContext<CartCtx>(CartContext as React.Context<CartCtx>)
  const cartCount = (ctx?.cart ?? []).reduce(
    (acc: number, item: CartItem) => acc + (item.quantity ?? 0),
    0,
  )

  const open = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveKey(key)
  }
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setActiveKey(null), 120)
  }
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  useEffect(() => {
    const root = document.documentElement
    const readBannerHeight = () => {
      const raw = getComputedStyle(root).getPropertyValue('--announcement-height')
      const n = parseFloat(raw)
      return Number.isFinite(n) ? n : 0
    }
    const onScroll = () => {
      const y = window.scrollY
      const bannerH = readBannerHeight()
      const top = Math.max(0, bannerH - y)
      root.style.setProperty('--header-top', `${top}px`)
      if (y < 16) setVariant('default')
      else if (y < 240) setVariant('variant2')
      else setVariant('variant3')
    }
    onScroll()
    window.addEventListener('scroll', onScroll, {passive: true})
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  const links = menu?.links ?? []
  const activeShop = links.find(
    (l) => l._type === 'menuShop' && l._key === activeKey,
  ) as Extract<(typeof links)[number], {_type: 'menuShop'}> | undefined

  return (
    <header className={`${s.header} ${s[variant] ?? ''}`}>
      <div className={s.inner}>
        <Link href="/" className={s.logo} aria-label="Mikmax — inicio">
          <LazyImage
            src="/icons/mikmax.svg"
            alt="Mikmax"
            width={119}
            height={24}
            className={s.logoImg}
            priority
          />
        </Link>

        <nav className={s.nav} aria-label="Main">
          {links.map((link) => {
            if (link._type === 'menuShop') {
              const isActive = activeKey === link._key
              return (
                <div
                  key={link._key}
                  className={s.navItem}
                  onMouseEnter={() => open(link._key)}
                  onMouseLeave={scheduleClose}
                >
                  <button
                    type="button"
                    className={s.navButton}
                    aria-expanded={isActive}
                    onFocus={() => open(link._key)}
                  >
                    {link.label}
                  </button>
                </div>
              )
            }
            if (link._type === 'menuGroup') {
              const isActive = activeKey === link._key
              return (
                <div
                  key={link._key}
                  className={s.navItem}
                  onMouseEnter={() => open(link._key)}
                  onMouseLeave={scheduleClose}
                >
                  <button
                    type="button"
                    className={s.navButton}
                    aria-expanded={isActive}
                    onFocus={() => open(link._key)}
                  >
                    {link.label}
                  </button>
                  {isActive && <MegaMenu group={link} />}
                </div>
              )
            }
            if (link._type === 'linkInternal') {
              return (
                <Link
                  key={link._key}
                  href={getInternalHref(link.ref)}
                  className={s.navLink}
                >
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
          {/* Desktop: text labels */}
          <div className={s.actionsDesktop}>
            <button type="button" className={s.actionBtn} aria-label="Search">
              Search
            </button>
            <Link href="/login" className={s.actionBtn}>
              Login
            </Link>
            <button type="button" className={s.actionBtn} aria-label="Cart">
              Cart [ {cartCount} ]
            </button>
          </div>

          {/* Mobile: icon buttons */}
          <div className={s.actionsMobile}>
            <button type="button" className={s.iconBtn} aria-label="Search">
              <LazyImage
                src="/icons/search.svg"
                alt=""
                width={35}
                height={35}
                className={s.iconImg}
                priority
              />
            </button>
            <Link href="/login" className={s.iconBtn} aria-label="Account">
              <LazyImage
                src="/icons/account.svg"
                alt=""
                width={35}
                height={35}
                className={s.iconImg}
                priority
              />
            </Link>
            <button type="button" className={s.cartCounter} aria-label="Cart">
              [ {cartCount} ]
            </button>
            <button
              type="button"
              className={s.burger}
              aria-label="Abrir menú"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </div>

      {/* Shop mega-menu (lifted out of nav so it can span full header width) */}
      {activeShop && (
        <MegaMenuShop
          shop={activeShop}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}

      {/* Mobile menu drawer (rendered via portal, fixed full-screen) */}
      <MobileMenu menu={menu} open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  )
}
