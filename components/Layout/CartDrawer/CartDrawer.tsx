'use client'
import {useContext, useEffect} from 'react'
import {LazyImage} from '@/components/Common'
import {CartContext} from '@/context/shopContext'
import s from './CartDrawer.module.scss'

type CartItem = {
  store: {gid: string}
  title?: string
  productId?: string
  variantQuantity?: number
  image?: string
  size?: string
  color?: string
  price?: number
  lineId?: string
}

type CartCtx = {
  cart?: CartItem[]
  cartOpen?: boolean
  setCartOpen?: (open: boolean) => void
  removeCartItem?: (gid: string) => void
  updateCartItem?: (item: CartItem, qty: number) => void
  checkoutUrl?: string
}

const FMT = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export default function CartDrawer() {
  const ctx = useContext<CartCtx>(CartContext as unknown as React.Context<CartCtx>)
  const cart = ctx?.cart ?? []
  const open = !!ctx?.cartOpen
  const close = () => ctx?.setCartOpen?.(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const itemCount = cart.reduce((acc, it) => acc + (it.variantQuantity ?? 0), 0)

  function changeQty(item: CartItem, delta: number) {
    const next = (item.variantQuantity ?? 0) + delta
    if (next <= 0) {
      ctx?.removeCartItem?.(item.store.gid)
    } else {
      ctx?.updateCartItem?.(item, next)
    }
  }

  function goCheckout() {
    if (ctx?.checkoutUrl) {
      window.location.href = ctx.checkoutUrl
    }
  }

  return (
    <div className={s.drawer} role="dialog" aria-modal="true" aria-label="Cart">
      <header className={s.header}>
        <span className={s.title}>
          <span className={s.titleDesktop}>Cart</span>
          <span className={s.titleMobile}>Cart [ {itemCount} ]</span>
        </span>
        <button type="button" className={s.close} onClick={close} aria-label="Close cart">
          Close
        </button>
      </header>

      <ul className={s.items} aria-label={`${itemCount} item${itemCount === 1 ? '' : 's'} in cart`}>
        {cart.length === 0 && <li className={s.empty}>Your cart is empty.</li>}
        {cart.map((item, idx) => (
          <li
            key={item.store.gid}
            className={[s.row, idx % 2 === 0 ? s.rowAlt : ''].filter(Boolean).join(' ')}
          >
            <div className={s.image}>
              {item.image ? (
                <LazyImage
                  src={item.image}
                  alt={item.title ?? ''}
                  width={135}
                  height={135}
                  sizes="135px"
                  wrapperClassName={s.imageWrapper}
                  className={s.imageInner}
                  priority
                />
              ) : null}
            </div>

            <div className={s.info}>
              <div className={s.infoText}>
                <div className={s.itemTitle}>{item.title ?? '—'}</div>
                {item.color && item.color !== 'Default' && (
                  <div className={s.itemSubtitle}>{item.color}</div>
                )}
              </div>
            </div>

            <div className={s.size}>
              {item.size && item.size !== 'Default' ? item.size : ''}
            </div>

            <div className={s.qty}>
              <button
                type="button"
                onClick={() => changeQty(item, -1)}
                aria-label="Decrease quantity"
                className={s.qtyBtn}
              >
                −
              </button>
              <span className={s.qtyValue}>{item.variantQuantity ?? 0}</span>
              <button
                type="button"
                onClick={() => changeQty(item, 1)}
                aria-label="Increase quantity"
                className={s.qtyBtn}
              >
                +
              </button>
            </div>

            <div className={s.price}>
              {typeof item.price === 'number'
                ? FMT.format(item.price * (item.variantQuantity ?? 1))
                : '—'}
            </div>

            <button
              type="button"
              className={s.remove}
              onClick={() => ctx?.removeCartItem?.(item.store.gid)}
              aria-label="Remove item"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <footer className={s.footer}>
        <button type="button" className={s.viewItems} onClick={close}>
          View Items
        </button>
        <button
          type="button"
          className={s.checkout}
          onClick={goCheckout}
          disabled={!ctx?.checkoutUrl || cart.length === 0}
        >
          Go to Checkout
        </button>
      </footer>
    </div>
  )
}
