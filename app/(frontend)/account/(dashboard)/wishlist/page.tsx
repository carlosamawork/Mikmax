import type {Metadata} from 'next'
import {getCurrentCustomer} from '@/lib/auth/customer'
import {getCustomerWishlist, getProductCardsByHandles, getAllShopFilters} from '@/lib/shopify'
import {expandProductsToCards} from '@/lib/shop/expandToCards'
import {getLookArchiveItems} from '@/lib/look/buildLooksArchive'
import type {LookArchiveItem} from '@/types/look'
import type {ShopSearchParams} from '@/types/shop'
import WishlistGrid from './WishlistGrid'
import s from './Wishlist.module.scss'

export const metadata: Metadata = {
  title: 'My wishlist',
  robots: {index: false, follow: false},
}

type ProductWishItem = {handle: string; color: string | null}

type ParsedEntries = {
  products: ProductWishItem[]
  lookSlugs: string[]
}

// Cada entrada del metafield es un string. Por prefijo:
//   "look:<slug>" → look
//   "handle" o "handle::color" → producto
//   "set:<slug>" → ignorado (los sets no van a favoritos)
function parseEntries(value?: string | null): ParsedEntries {
  const out: ParsedEntries = {products: [], lookSlugs: []}
  if (!value) return out
  let arr: unknown
  try {
    arr = JSON.parse(value)
  } catch {
    return out
  }
  if (!Array.isArray(arr)) return out

  for (const entry of arr) {
    if (typeof entry !== 'string') continue
    if (entry.startsWith('set:')) {
      continue
    } else if (entry.startsWith('look:')) {
      const slug = entry.slice(5)
      if (slug) out.lookSlugs.push(slug)
    } else {
      const idx = entry.indexOf('::')
      out.products.push(
        idx === -1
          ? {handle: entry, color: null}
          : {handle: entry.slice(0, idx), color: entry.slice(idx + 2)},
      )
    }
  }
  return out
}

async function resolveProducts(items: ProductWishItem[]) {
  if (!items.length) return []
  const handles = Array.from(new Set(items.map((i) => i.handle)))
  const nodes = await getProductCardsByHandles(handles)
  const cards = expandProductsToCards(nodes)

  // Por cada guardado (handle + color) buscamos la tarjeta de ese color; si no, cualquiera del producto.
  return items
    .map((item) => {
      const byColor = item.color
        ? cards.find((c) => c.handle === item.handle && c.colorSlug === item.color)
        : undefined
      const card = byColor ?? cards.find((c) => c.handle === item.handle) ?? null
      if (!card) return null
      // La identidad del favorito debe reflejar el color GUARDADO, no el de la tarjeta
      // resuelta — así el marcador coincide con la entrada del metafield y se puede quitar.
      const id = item.color ? `${item.handle}::${item.color}` : item.handle
      return {
        id,
        card: {
          _id: card.id,
          title: card.title,
          handle: card.handle,
          imageUrl: card.imageUrl,
          minPrice: card.minPrice,
          maxPrice: card.maxPrice,
          compareAtPrice: card.compareAtPrice,
          tags: card.tags,
          availableForSale: card.availableForSale,
          colorSlug: item.color ?? undefined,
        },
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
}

type LookResult = {id: string; item: LookArchiveItem}

async function resolveLooks(slugs: string[]): Promise<LookResult[]> {
  if (!slugs.length) return []
  // Reutiliza el mapping exacto de LooksArchive (getLookArchiveItems). Sin
  // filtros: params vacíos; facets se necesitan solo para resolver colores.
  const facets = await getAllShopFilters({filters: []})
  const params: ShopSearchParams = {}
  const all = await getLookArchiveItems(params, facets)
  const bySlug = new Map(all.map((it) => [it.slug, it]))
  const results: LookResult[] = []
  for (const slug of slugs) {
    const item = bySlug.get(slug)
    if (item) results.push({id: `look:${slug}`, item})
  }
  return results
}

export default async function WishlistPage() {
  const session = await getCurrentCustomer()
  if (!session) return null

  const res = await getCustomerWishlist(session.token)
  const {products, lookSlugs} = parseEntries(res?.customer?.metafield?.value)

  if (!products.length && !lookSlugs.length) {
    return <p className={s.empty}>Your wishlist is empty.</p>
  }

  const [resolvedProducts, resolvedLooks] = await Promise.all([
    resolveProducts(products),
    resolveLooks(lookSlugs),
  ])

  if (!resolvedProducts.length && !resolvedLooks.length) {
    return <p className={s.empty}>Your wishlist is empty.</p>
  }

  return <WishlistGrid products={resolvedProducts} looks={resolvedLooks} />
}
