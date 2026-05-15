// lib/shop/expandToCards.ts
import type {ProductCardData} from '@/types/shop'
import {slugify} from '@/lib/shop/searchParams'

type MetaobjectFieldNode = {
  key: string
  value: string | null
  reference?: {
    id: string
    handle?: string | null
    fields?: {key: string; value: string | null}[]
  } | null
}

type ColorPatternMetaobjectNode = {
  id: string
  handle?: string | null
  type?: string | null
  fields: MetaobjectFieldNode[]
}

type ProductColorPatternMetafield = {
  type: string
  value: string | null
  references?: {nodes: ColorPatternMetaobjectNode[]} | null
} | null

type ShopifyVariantNode = {
  id: string
  availableForSale: boolean
  image?: {url: string; altText?: string | null} | null
  price: {amount: string}
  compareAtPrice?: {amount: string} | null
  selectedOptions: {name: string; value: string}[]
}

type ShopifyProductNode = {
  id: string
  handle: string
  title: string
  tags?: string[]
  featuredImage?: {url: string; altText?: string | null} | null
  priceRange: {
    minVariantPrice: {amount: string}
    maxVariantPrice: {amount: string}
  }
  compareAtPriceRange: {maxVariantPrice: {amount: string}}
  options?: {name: string; values: string[]}[]
  variants?: {nodes: ShopifyVariantNode[]}
  colorPattern?: ProductColorPatternMetafield
}

/**
 * Reads the base-color TaxonomyValue GIDs stored on a `shopify--color-pattern`
 * metaobject. The relevant field is `color_taxonomy_reference`, a JSON array of
 * TaxonomyValue GIDs (the base colors: Beige, Brown, Green, ...).
 */
function readMetaobjectBaseGids(metaobject: ColorPatternMetaobjectNode): string[] {
  const field = metaobject.fields.find((f) => f.key === 'color_taxonomy_reference')
  if (!field?.value) return []
  try {
    const parsed = JSON.parse(field.value)
    if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string')
    if (typeof parsed === 'string') return [parsed]
  } catch {
    if (field.value.startsWith('gid://')) return [field.value]
  }
  return []
}

/**
 * Finds the base-color TaxonomyValue GIDs for a given variant color value, by
 * matching the variant's `selectedOptions` "Color" value against the `label`
 * field of the product's color-pattern metaobjects.
 */
function findVariantBaseGids(p: ShopifyProductNode, colorValue: string): string[] {
  const refs = p.colorPattern?.references?.nodes ?? []
  const target = colorValue.trim().toLowerCase()
  const match = refs.find((m) => {
    const labelField = m.fields.find((f) => f.key === 'label')
    return labelField?.value?.trim().toLowerCase() === target
  })
  return match ? readMetaobjectBaseGids(match) : []
}

/**
 * Aggregates all base-color GIDs across every color metaobject of a product.
 * Used for products without a "Color" option (single product-level card).
 */
function findAnyProductBaseGids(p: ShopifyProductNode): string[] {
  const refs = p.colorPattern?.references?.nodes ?? []
  const out: string[] = []
  for (const m of refs) out.push(...readMetaobjectBaseGids(m))
  return out
}

/**
 * Expands a list of Shopify products into archive cards.
 * Rule: one card per (product × color value). Products without a "Color"
 * option become a single card. When `selectedColorGids` is provided, only
 * cards whose base color matches any of those TaxonomyValue GIDs are emitted.
 */
export function expandProductsToCards(
  products: ShopifyProductNode[],
  selectedColorGids?: string[],
): ProductCardData[] {
  const cards: ProductCardData[] = []
  const hasFilter = !!(selectedColorGids && selectedColorGids.length > 0)
  const selectedSet = new Set(selectedColorGids ?? [])
  for (const p of products) {
    const colorOption = p.options?.find((o) => o.name.toLowerCase() === 'color')
    const variants = p.variants?.nodes ?? []
    if (!colorOption || variants.length === 0) {
      if (hasFilter) {
        const gids = findAnyProductBaseGids(p)
        if (!gids.some((g) => selectedSet.has(g))) continue
      }
      cards.push(productOnlyCard(p))
      continue
    }
    // Group variants by Color option value. Prefer the first available variant
    // per color so the card image/price reflects something sellable.
    const byColor = new Map<string, ShopifyVariantNode>()
    for (const v of variants) {
      const colorOpt = v.selectedOptions.find((s) => s.name.toLowerCase() === 'color')
      if (!colorOpt) continue
      const existing = byColor.get(colorOpt.value)
      if (!existing || (!existing.availableForSale && v.availableForSale)) {
        byColor.set(colorOpt.value, v)
      }
    }
    if (byColor.size === 0) {
      if (hasFilter) {
        const gids = findAnyProductBaseGids(p)
        if (!gids.some((g) => selectedSet.has(g))) continue
      }
      cards.push(productOnlyCard(p))
      continue
    }
    Array.from(byColor.entries()).forEach(([colorValue, variant]) => {
      if (hasFilter) {
        const gids = findVariantBaseGids(p, colorValue)
        if (!gids.some((g) => selectedSet.has(g))) return
      }
      cards.push(variantCard(p, colorValue, variant))
    })
  }
  return cards
}

function productOnlyCard(p: ShopifyProductNode): ProductCardData {
  const min = Number(p.priceRange.minVariantPrice.amount)
  const max = Number(p.priceRange.maxVariantPrice.amount)
  const compare = Number(p.compareAtPriceRange.maxVariantPrice.amount)
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    imageUrl: p.featuredImage?.url,
    imageAlt: p.featuredImage?.altText ?? undefined,
    minPrice: Number.isFinite(min) ? min : undefined,
    maxPrice: Number.isFinite(max) && max !== min ? max : undefined,
    compareAtPrice: Number.isFinite(compare) && compare > 0 ? compare : undefined,
    tags: Array.isArray(p.tags) ? p.tags.join(',') : undefined,
  }
}

function variantCard(
  p: ShopifyProductNode,
  colorValue: string,
  variant: ShopifyVariantNode,
): ProductCardData {
  const price = Number(variant.price.amount)
  const compareAt = variant.compareAtPrice ? Number(variant.compareAtPrice.amount) : NaN
  const title = composeTitle(p.title, colorValue)
  return {
    id: `${p.id}::${variant.id}`,
    handle: p.handle,
    title,
    imageUrl: variant.image?.url ?? p.featuredImage?.url,
    imageAlt: variant.image?.altText ?? p.featuredImage?.altText ?? undefined,
    minPrice: Number.isFinite(price) ? price : undefined,
    maxPrice: undefined,
    compareAtPrice: Number.isFinite(compareAt) && compareAt > 0 ? compareAt : undefined,
    tags: Array.isArray(p.tags) ? p.tags.join(',') : undefined,
    variantId: variant.id,
    colorLabel: colorValue,
    colorSlug: slugify(colorValue),
    availableForSale: variant.availableForSale,
  }
}

function composeTitle(productTitle: string, colorValue: string): string {
  // Avoid duplicating the color when the product title already includes it.
  if (productTitle.toLowerCase().includes(colorValue.toLowerCase())) return productTitle
  return `${productTitle} ${colorValue}`
}
