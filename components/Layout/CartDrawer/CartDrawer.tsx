'use client'
import {useContext, useEffect} from 'react'
import {LazyImage} from '@/components/Common'
import {CartContext} from '@/context/shopContext'
import {trackBeginCheckout} from '@/lib/analytics/track'
import {getStoreCurrency} from '@/lib/analytics/item'
import {prepareCheckout} from '@/app/(frontend)/checkout/actions'
import type {CartCost} from '@/types/cart'
import {nextTierNudge} from '@/lib/b2b/cartCost'
import type {Dictionary} from '@/lib/i18n/getDictionary'
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
  cartId?: string
  checkoutUrl?: string
  cartCost?: CartCost | null
  b2bCartContext?: {isDesigner: boolean; designerTiers: {minSubtotal: number; percent: number}[]}
}

const FMT = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

interface Props {
  copy: Dictionary['cart']
}

export default function CartDrawer({copy}: Props) {
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

  async function goCheckout() {
    if (!ctx?.checkoutUrl) return
    trackBeginCheckout(
      cart.map((it) => ({
        id: it.productId || it.store.gid,
        name: it.title || '',
        price: typeof it.price === 'number' ? it.price : 0,
        quantity: it.variantQuantity ?? 1,
        variant: [it.color, it.size].filter((x) => x && x !== 'Default').join(' / ') || undefined,
        currency: getStoreCurrency(),
      })),
    )
    // Si hay sesión, asocia el carrito al cliente para que el checkout salga logueado
    // y con la dirección precargada. Si no, redirige tal cual.
    const {checkoutUrl} = await prepareCheckout(ctx.cartId ?? '', ctx.checkoutUrl)
    window.location.href = checkoutUrl
  }

  return (
    <div className={s.drawer} role="dialog" aria-modal="true" aria-label={copy.title}>
      <header className={s.header}>
        <span className={s.title}>
          <span className={s.titleDesktop}>{copy.title}</span>
          <span className={s.titleMobile}>{copy.title} [ {itemCount} ]</span>
        </span>
        <button type="button" className={s.close} onClick={close} aria-label={copy.closeLabel}>
          {copy.close}
        </button>
      </header>

      <ul
        className={s.items}
        aria-label={`${itemCount} item${itemCount === 1 ? '' : 's'} in cart`}
      >
        {cart.length === 0 && <li className={s.empty}>{copy.empty}</li>}
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

            <div className={s.size}>{item.size && item.size !== 'Default' ? item.size : ''}</div>

            <div className={s.qty}>
              <button
                type="button"
                onClick={() => changeQty(item, -1)}
                aria-label={copy.decreaseQuantity}
                className={s.qtyBtn}
              >
                −
              </button>
              <span className={s.qtyValue}>{item.variantQuantity ?? 0}</span>
              <button
                type="button"
                onClick={() => changeQty(item, 1)}
                aria-label={copy.increaseQuantity}
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
              aria-label={copy.removeItem}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <footer className={s.footer}>
        {ctx?.cartCost && (
          <div className={s.summary}>
            <div className={s.summaryRow}>
              <span>{copy.subtotal}</span>
              <span>{FMT.format(ctx.cartCost.subtotal)}</span>
            </div>
            {ctx.cartCost.discount > 0 && (
              <div className={`${s.summaryRow} ${s.summaryDiscount}`}>
                <span>{ctx.cartCost.discountTitle ?? 'Descuento'}</span>
                <span>−{FMT.format(ctx.cartCost.discount)}</span>
              </div>
            )}
            {ctx?.b2bCartContext?.isDesigner &&
              ctx?.cartCost &&
              (() => {
                const nudge = nextTierNudge(
                  ctx.cartCost.subtotal,
                  ctx.b2bCartContext!.designerTiers,
                )
                const maxPercent = ctx.b2bCartContext!.designerTiers.reduce(
                  (m, t) => Math.max(m, t.percent),
                  0,
                )
                return (
                  <div className={`${s.summaryRow} ${s.nudge}`}>
                    {nudge
                      ? `Añade ${FMT.format(nudge.gap)} más para alcanzar el ${nudge.percent}%`
                      : `Tienes el descuento profesional máximo (${maxPercent}%)`}
                  </div>
                )
              })()}
            <div className={`${s.summaryRow} ${s.summaryTotal}`}>
              <span>{copy.total}</span>
              <span>{FMT.format(ctx.cartCost.total)}</span>
            </div>
          </div>
        )}
        <button type="button" className={s.viewItems} onClick={close}>
          {copy.viewItems}
        </button>
        <button
          type="button"
          className={s.checkout}
          onClick={goCheckout}
          disabled={!ctx?.checkoutUrl || cart.length === 0}
        >
          {copy.goToCheckout}
        </button>
      </footer>
    </div>
  )
}
