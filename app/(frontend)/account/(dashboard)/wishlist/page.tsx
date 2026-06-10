import type {Metadata} from 'next'
import {getCurrentCustomer} from '@/lib/auth/customer'
import {getCustomerWishlist, getProductCardsByHandles} from '@/lib/shopify'
import {expandProductsToCards} from '@/lib/shop/expandToCards'
import ProductCard from '@/components/PageBuilder/ProductCard/ProductCard'
import s from './Wishlist.module.scss'

export const metadata: Metadata = {
  title: 'My wishlist',
  robots: {index: false, follow: false},
}

type WishItem = {handle: string; color: string | null}

// Cada entrada del metafield es "handle::color" (o "handle" sin color).
function parseItems(value?: string | null): WishItem[] {
  if (!value) return []
  try {
    const arr = JSON.parse(value)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((v): v is string => typeof v === 'string')
      .map((entry) => {
        const idx = entry.indexOf('::')
        return idx === -1
          ? {handle: entry, color: null}
          : {handle: entry.slice(0, idx), color: entry.slice(idx + 2)}
      })
  } catch {
    return []
  }
}

export default async function WishlistPage() {
  const session = await getCurrentCustomer()
  if (!session) return null

  const res = await getCustomerWishlist(session.token)
  const items = parseItems(res?.customer?.metafield?.value)

  if (!items.length) {
    return <p className={s.empty}>Your wishlist is empty.</p>
  }

  const handles = Array.from(new Set(items.map((i) => i.handle)))
  const nodes = await getProductCardsByHandles(handles)
  const cards = expandProductsToCards(nodes)

  // Por cada guardado (handle + color) buscamos la tarjeta de ese color; si no, cualquiera del producto.
  const resolved = items
    .map((item) => {
      const byColor = item.color
        ? cards.find((c) => c.handle === item.handle && c.colorSlug === item.color)
        : undefined
      return byColor ?? cards.find((c) => c.handle === item.handle) ?? null
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  if (!resolved.length) {
    return <p className={s.empty}>Your wishlist is empty.</p>
  }

  return (
    <div className={s.grid}>
      {resolved.map((p, i) => (
        <ProductCard
          key={`${p.id}-${i}`}
          product={{
            _id: p.id,
            title: p.title,
            handle: p.handle,
            imageUrl: p.imageUrl,
            minPrice: p.minPrice,
            maxPrice: p.maxPrice,
            compareAtPrice: p.compareAtPrice,
            tags: p.tags,
            availableForSale: p.availableForSale,
            colorSlug: p.colorSlug,
          }}
        />
      ))}
    </div>
  )
}
