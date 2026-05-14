// components/Layout/MobileMenu/MobileMenu.tsx
'use client'

import {useContext, useEffect, useState} from 'react'
import {createPortal} from 'react-dom'
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import {CartContext} from '@/context/shopContext'
import {getInternalHref} from '@/sanity/queries/fragments/links'
import s from './MobileMenu.module.scss'
import type {
  MenuData,
  MenuShop,
  CollectionTreeParent,
  MenuLinkInternal,
  MenuLinkExternal,
} from '@/sanity/types'

interface Props {
  menu?: MenuData
  open: boolean
  onClose: () => void
}

type CartItem = {quantity?: number}
type CartCtx = {cart?: CartItem[]}

type FlatItem =
  | {key: string; type: 'parent'; title?: string; parent: CollectionTreeParent}
  | {
      key: string
      type: 'page'
      title?: string
      href?: string
      external?: boolean
      newWindow?: boolean
    }

function Chevron({open}: {open: boolean}) {
  return (
    <svg
      width="11"
      height="7"
      viewBox="0 0 11 7"
      aria-hidden
      style={{
        transform: `rotate(${open ? 180 : 0}deg)`,
        transition: 'transform 220ms ease',
      }}
    >
      <path
        d="M1 1 L5.5 6 L10 1"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.2"
      />
    </svg>
  )
}

export default function MobileMenu({menu, open, onClose}: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const ctx = useContext<CartCtx>(CartContext as React.Context<CartCtx>)
  const cartCount = (ctx?.cart ?? []).reduce(
    (acc: number, item: CartItem) => acc + (item.quantity ?? 0),
    0,
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [open])

  if (!mounted || !open) return null

  const links = menu?.links ?? []

  // Flatten links: replace menuShop with its parent collections so the menu
  // is a single ordered list of clickable rows.
  const flat: FlatItem[] = []
  for (const link of links) {
    if (link._type === 'menuShop') {
      const tree = (link as MenuShop).tree ?? []
      for (const p of tree) {
        flat.push({
          key: `shop-${p.handle ?? p.title}`,
          type: 'parent',
          title: p.title,
          parent: p,
        })
      }
    } else if (link._type === 'linkInternal') {
      const internal = link as MenuLinkInternal
      flat.push({
        key: internal._key,
        type: 'page',
        title: internal.title,
        href: getInternalHref(internal.ref),
      })
    } else if (link._type === 'linkExternal') {
      const external = link as MenuLinkExternal
      flat.push({
        key: external._key,
        type: 'page',
        title: external.title,
        href: external.url,
        external: true,
        newWindow: external.newWindow,
      })
    }
  }

  return createPortal(
    <div className={s.drawer} role="dialog" aria-modal="true" aria-label="Menú principal">
      {/* Top bar — same shape as header but with × close instead of burger */}
      <div className={s.topBar}>
        <Link href="/" onClick={onClose} className={s.logo} aria-label="Mikmax — inicio">
          <LazyImage
            src="/icons/mikmax.svg"
            alt="Mikmax"
            width={119}
            height={24}
            priority
            className={s.logoImg}
          />
        </Link>
        <div className={s.actions}>
          <button type="button" className={s.iconBtn} aria-label="Search">
            <LazyImage
              src="/icons/search.svg"
              alt=""
              width={35}
              height={35}
              priority
              className={s.iconImg}
            />
          </button>
          <Link
            href="/login"
            className={s.iconBtn}
            aria-label="Account"
            onClick={onClose}
          >
            <LazyImage
              src="/icons/account.svg"
              alt=""
              width={35}
              height={35}
              priority
              className={s.iconImg}
            />
          </Link>
          <button type="button" className={s.cartCounter} aria-label="Cart">
            [ {cartCount} ]
          </button>
          <button
            type="button"
            className={s.closeBtn}
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <span className={s.closeX} aria-hidden>
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {/* Search row */}
      <form className={s.searchRow} onSubmit={(e) => e.preventDefault()}>
        <div className={s.searchInputWrap}>
          <input
            className={s.searchInput}
            type="search"
            placeholder="Search"
            aria-label="Buscar"
          />
        </div>
        <button type="submit" className={s.searchBtn}>
          Search
        </button>
      </form>

      {/* Items */}
      <nav className={s.items} aria-label="Menú móvil">
        {flat.map((item, idx) => {
          const isGrey = idx % 2 === 0
          const rowClass = `${s.row} ${isGrey ? s.rowGrey : s.rowWhite}`

          if (item.type === 'parent') {
            const parent = item.parent
            const isExpanded = expandedKey === item.key
            return (
              <div key={item.key}>
                <button
                  type="button"
                  className={rowClass}
                  onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                  aria-expanded={isExpanded}
                >
                  <span>{item.title}</span>
                  <Chevron open={isExpanded} />
                </button>
                {isExpanded && (
                  <div className={s.children}>
                    {parent.handle && parent.hasOwnProducts && (
                      <Link
                        href={`/shop/${parent.handle}`}
                        className={s.childRow}
                        onClick={onClose}
                      >
                        <span>All</span>
                      </Link>
                    )}
                    {(parent.children ?? []).map((child) => (
                      <Link
                        key={child.handle ?? child.title}
                        href={child.handle ? `/shop/${child.handle}` : '#'}
                        className={s.childRow}
                        onClick={onClose}
                      >
                        <span>{child.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          if (item.external) {
            return (
              <a
                key={item.key}
                href={item.href}
                target={item.newWindow ? '_blank' : undefined}
                rel={item.newWindow ? 'noopener noreferrer' : undefined}
                className={rowClass}
                onClick={onClose}
              >
                <span>{item.title}</span>
              </a>
            )
          }

          return (
            <Link
              key={item.key}
              href={item.href ?? '#'}
              className={rowClass}
              onClick={onClose}
            >
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>
    </div>,
    document.body,
  )
}
