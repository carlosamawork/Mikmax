'use client'

import Link from 'next/link'
import s from './MobileBottomNav.module.scss'

export default function MobileBottomNav() {
  return (
    <nav className={s.nav} aria-label="Mobile primary">
      <Link href="/" className={s.item} aria-label="Home">
        Home
      </Link>
      <Link href="/shop" className={s.item} aria-label="Shop">
        Shop
      </Link>
      <button type="button" className={s.item} aria-label="Cart">
        Cart
      </button>
      <button type="button" className={s.item} aria-label="Cuenta (próximamente)" disabled>
        Cuenta
      </button>
    </nav>
  )
}
