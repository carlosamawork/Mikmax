// lib/shop/expandToCards.ts
import {slugify} from './searchParams'
import type {ProductCardData} from '@/types/shop'

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
}

/**
 * Expands a list of Shopify products into archive cards.
 * Rule: one card per (product × color value). Products without a "Color" option
 * become a single card. When `selectedColors` is provided (kebab-case slugs),
 * cards are filtered to those matching.
 */
export function expandProductsToCards(
  products: ShopifyProductNode[],
  selectedColors?: string[],
): ProductCardData[] {
  const cards: ProductCardData[] = []
  for (const p of products) {
    const colorOption = p.options?.find((o) => o.name.toLowerCase() === 'color')
    const variants = p.variants?.nodes ?? []
    if (!colorOption || variants.length === 0) {
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
      cards.push(productOnlyCard(p))
      continue
    }
    Array.from(byColor.entries()).forEach(([colorValue, variant]) => {
      if (selectedColors && selectedColors.length > 0) {
        if (!selectedColors.includes(slugify(colorValue))) return
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
    availableForSale: variant.availableForSale,
  }
}

function composeTitle(productTitle: string, colorValue: string): string {
  // Avoid duplicating the color when the product title already includes it.
  if (productTitle.toLowerCase().includes(colorValue.toLowerCase())) return productTitle
  return `${productTitle} ${colorValue}`
}
