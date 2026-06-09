// lib/set/buildSetsArchive.ts
import {getAllSets, type SanitySetListDoc} from '@/sanity/queries/queries/set'
import {getProductCardsByHandles} from '@/lib/shopify'
import {applyLookDiscount} from '@/lib/look/buildLookView'
import type {SetArchiveItem, SetArchiveComponent} from '@/types/set'

// Forma mínima del nodo de producto que leemos de getProductCardsByHandles
// (PRODUCT_CARD_FRAGMENT en lib/shopify.js).
type Variant = {
  selectedOptions: {name: string; value: string}[]
  price: {amount: string}
  image?: {url: string; altText?: string | null} | null
}
type CardNode = {
  handle: string
  featuredImage?: {url: string; altText?: string | null} | null
  variants?: {nodes: Variant[]}
}

// Imagen (primera variante del color fijo) y min/max precio de ese color.
function componentImageAndPrice(
  node: CardNode,
  color: string,
): {imageUrl?: string; imageAlt?: string; min: number; max: number; hasPrice: boolean} {
  const variants = node.variants?.nodes ?? []
  const target = color.trim().toLowerCase()
  const prices: number[] = []
  let imageUrl: string | undefined
  let imageAlt: string | undefined
  for (const v of variants) {
    const c = v.selectedOptions.find((o) => o.name.toLowerCase() === 'color')?.value
    if (!c || c.trim().toLowerCase() !== target) continue
    if (!imageUrl && v.image?.url) {
      imageUrl = v.image.url
      imageAlt = v.image.altText ?? undefined
    }
    const p = Number(v.price.amount)
    if (Number.isFinite(p)) prices.push(p)
  }
  if (!imageUrl && node.featuredImage?.url) {
    imageUrl = node.featuredImage.url
    imageAlt = node.featuredImage.altText ?? undefined
  }
  return {
    imageUrl,
    imageAlt,
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
    hasPrice: prices.length > 0,
  }
}

function aggregateSet(
  set: SanitySetListDoc,
  productMap: Record<string, CardNode>,
): SetArchiveItem | null {
  const components: SetArchiveComponent[] = []
  let priceMin = 0
  let priceMax = 0
  let valid = 0
  for (const comp of set.components ?? []) {
    if (!comp.productHandle || !comp.color) continue
    const node = productMap[comp.productHandle]
    if (!node) continue
    const {imageUrl, imageAlt, min, max, hasPrice} = componentImageAndPrice(node, comp.color)
    if (!hasPrice || !imageUrl) continue
    valid++
    priceMin += min
    priceMax += max
    components.push({imageUrl, imageAlt})
  }
  if (valid === 0) return null

  const strategy = set.discountStrategy ?? 'none'
  const value = set.discountValue ?? 0
  return {
    id: set._id,
    title: set.title,
    slug: set.slug,
    components,
    priceMin: applyLookDiscount(priceMin, strategy, value),
    priceMax: applyLookDiscount(priceMax, strategy, value),
  }
}

/**
 * Carga todos los sets, batch-fetch de sus productos componentes en Shopify,
 * y agrega imagen + rango de precio por set. Sin filtros ni sort: orden de
 * getAllSets (orderRank asc).
 */
export async function getSetArchiveItems(): Promise<SetArchiveItem[]> {
  const sets = await getAllSets()
  const handles = Array.from(
    new Set(
      sets.flatMap((s) =>
        (s.components ?? []).map((c) => c.productHandle).filter((h): h is string => !!h),
      ),
    ),
  )
  const nodes = (await getProductCardsByHandles(handles)) as CardNode[]
  const productMap: Record<string, CardNode> = {}
  for (const n of nodes) productMap[n.handle] = n

  return sets
    .map((s) => aggregateSet(s, productMap))
    .filter((x): x is SetArchiveItem => x !== null)
}
