'use client'

import Link from 'next/link'
import {useContext} from 'react'
import {usePathname} from 'next/navigation'
import {logout} from '@/app/(frontend)/account/actions'
import {CartContext} from '@/context/shopContext'
import s from './AccountNav.module.scss'

const ITEMS = [
  {label: 'Account information', href: '/account'},
  {label: 'My Wishlist', href: '/account/wishlist'},
  {label: 'My orders', href: '/account/orders'},
]

export default function AccountNav() {
  const pathname = usePathname()
  // trailingSlash: true → el pathname llega como '/account/' o '/account/orders/'.
  const current = pathname.replace(/\/+$/, '') || '/'
  const ctx = useContext(CartContext)

  async function handleLogout() {
    ctx?.refreshCartBuyer?.()
    await logout()
  }

  return (
    <nav className={s.nav}>
      {ITEMS.map((it) => {
        const active = current === it.href
        return (
          <Link key={it.href} href={it.href} className={active ? `${s.item} ${s.active}` : s.item}>
            {it.label}
          </Link>
        )
      })}
      <form action={handleLogout}>
        <button type="submit" className={s.item}>
          Logout
        </button>
      </form>
    </nav>
  )
}
