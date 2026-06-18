// components/Layout/Header/HeaderClient.tsx
'use client'

import {useCallback, useContext, useEffect, useRef, useState} from 'react'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {LazyImage} from '@/components/Common'
import {CartContext} from '@/context/shopContext'
import s from './Header.module.scss'
import type {HeaderProps, HeaderVariant} from '@/types/header'
import type {Dictionary} from '@/lib/i18n/getDictionary'
import MegaMenu from '../MegaMenu/MegaMenu'
import MegaMenuShop from '../MegaMenu/MegaMenuShop'
import MobileMenu from '../MobileMenu/MobileMenu'
import {getInternalHref} from '@/sanity/queries/fragments/links'
import SearchOverlay from './SearchOverlay'

type CartItem = {variantQuantity?: number}
type CartCtx = {
  cart?: CartItem[]
  setCartOpen?: (open: boolean) => void
}

const DEFAULT_HEADER_COPY: Dictionary['header'] = {
  logoAriaLabel: 'Mikmax — home',
  navAriaLabel: 'Main',
  search: 'Search',
  account: 'Account',
  login: 'Login',
  myAccount: 'My account',
  logIn: 'Log in',
  openMenu: 'Open menu',
}

const DEFAULT_SEARCH_COPY: Dictionary['search'] = {
  placeholder: 'Search...',
  dialogAriaLabel: 'Search products',
  inputAriaLabel: 'Search products',
  closeLabel: 'Close',
  searching: 'Searching…',
  noResults: 'No results for «{query}».',
  viewAll: 'View all {total} results →',
}

export default function HeaderClient({
  menu,
  initialVariant = 'default',
  copy = DEFAULT_HEADER_COPY,
  searchCopy = DEFAULT_SEARCH_COPY,
}: HeaderProps) {
  const [variant, setVariant] = useState<HeaderVariant>(initialVariant)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSearchFocus, setMobileSearchFocus] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ctx = useContext<CartCtx>(CartContext as React.Context<CartCtx>)
  const cartCount = (ctx?.cart ?? []).reduce(
    (acc: number, item: CartItem) => acc + (item.variantQuantity ?? 0),
    0,
  )

  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const pathname = usePathname()

  // Al cambiar de ruta, cerrar cualquier menú/overlay abierto (mega-menú Shop,
  // menú mobile y buscador), ya que el header no se desmonta entre páginas.
  useEffect(() => {
    setActiveKey(null)
    setMobileOpen(false)
    setSearchOpen(false)
  }, [pathname])

  // Estado de sesión (cookie httpOnly) consultado en cliente para no romper el render
  // estático de las páginas. Reconsulta al cambiar de ruta (login/logout).
  useEffect(() => {
    let active = true
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => {
        if (active) setIsLoggedIn(Boolean(d?.loggedIn))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [pathname])

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
      const top = Math.max(3, bannerH - y)
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
        <Link href="/" className={s.logo} aria-label={copy.logoAriaLabel}>
          <LazyImage
            src="/icons/mikmax.svg"
            alt="Mikmax"
            width={119}
            height={24}
            className={s.logoImg}
            priority
          />
        </Link>

        <nav className={s.nav} aria-label={copy.navAriaLabel}>
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
            <button
              type="button"
              className={s.actionBtn}
              aria-label={copy.search}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(true)}
            >
              {copy.search}
            </button>
            <Link
              href={isLoggedIn ? '/account' : '/login'}
              className={s.actionBtn}
              aria-label={isLoggedIn ? copy.myAccount : copy.logIn}
            >
              {isLoggedIn ? copy.account : copy.login}
            </Link>
            <button
              type="button"
              className={s.actionBtn}
              aria-label={copy.account}
              onClick={() => ctx?.setCartOpen?.(true)}
            >
              {copy.account} [ {cartCount} ]
            </button>
          </div>

          {/* Mobile: icon buttons */}
          <div className={s.actionsMobile}>
            <button
              type="button"
              className={s.iconBtn}
              aria-label={copy.search}
              aria-expanded={mobileOpen}
              onClick={() => {
                setMobileSearchFocus(true)
                setMobileOpen(true)
              }}
            >
              <LazyImage
                src="/icons/search.svg"
                alt=""
                width={35}
                height={35}
                className={s.iconImg}
                priority
              />
            </button>
            <Link
              href={isLoggedIn ? '/account' : '/login'}
              className={s.iconBtn}
              aria-label={isLoggedIn ? copy.myAccount : copy.logIn}
            >
              <LazyImage
                src="/icons/account.svg"
                alt=""
                width={35}
                height={35}
                className={s.iconImg}
                priority
              />
            </Link>
            <button
              type="button"
              className={s.cartCounter}
              aria-label={copy.account}
              onClick={() => ctx?.setCartOpen?.(true)}
            >
              [ {cartCount} ]
            </button>
            <button
              type="button"
              className={s.burger}
              aria-label={copy.openMenu}
              aria-expanded={mobileOpen}
              onClick={() => {
                setMobileSearchFocus(false)
                setMobileOpen(true)
              }}
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

      <SearchOverlay open={searchOpen} onClose={closeSearch} copy={searchCopy} />

      {/* Mobile menu drawer (rendered via portal, fixed full-screen) */}
      <MobileMenu
        menu={menu}
        open={mobileOpen}
        autoFocusSearch={mobileSearchFocus}
        onClose={() => setMobileOpen(false)}
        isLoggedIn={isLoggedIn}
      />
    </header>
  )
}
