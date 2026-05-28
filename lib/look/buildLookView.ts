// lib/look/buildLookView.ts
import type {SanityLookDoc, SanityLookComponent} from '@/sanity/queries/queries/look'
import type {
  LookView,
  LookComponentView,
  LookSizeOption,
  LookGalleryImage,
  LookRelatedCard,
} from '@/types/look'

type ShopifyVariant = {
  id: string
  availableForSale: boolean
  price: {amount: string; currencyCode: string}
  compareAtPrice?: {amount: string} | null
  selectedOptions: {name: string; value: string}[]
}

type ShopifyProductDetail = {
  handle: string
  options?: {name: string; values: string[]}[]
  priceRange: {minVariantPrice: {currencyCode: string}}
  variants: {nodes: ShopifyVariant[]}
} | null

type RelatedShopifyCard = {
  handle: string
  title: string
  featuredImage?: {url: string; altText?: string | null} | null
  priceRange: {minVariantPrice: {amount: string}; maxVariantPrice: {amount: string}}
}

function colorOf(v: ShopifyVariant): string | undefined {
  return v.selectedOptions.find((o) => o.name.toLowerCase() === 'color')?.value
}

function sizeOf(v: ShopifyVariant, sizeOptionName: string | undefined): string | undefined {
  if (!sizeOptionName) return undefined
  return v.selectedOptions.find((o) => o.name === sizeOptionName)?.value
}

// Resolve one component's selectable sizes from its Shopify product detail.
function resolveComponentSizes(
  comp: SanityLookComponent,
  detail: ShopifyProductDetail,
): LookSizeOption[] {
  if (!detail) return []
  const variants = detail.variants?.nodes ?? []
  const sizeOptionName = detail.options?.find((o) => o.name.toLowerCase() !== 'color')?.name
  // Locked color = the referenced variant's color.
  const ref = variants.find((v) => v.id === comp.variantGid)
  const lockedColor = ref ? colorOf(ref) : undefined
  const allowed = new Set((comp.availableSizes ?? []).map((s) => s.trim().toLowerCase()))

  const out: LookSizeOption[] = []
  for (const v of variants) {
    if (lockedColor && colorOf(v) !== lockedColor) continue
    const size = sizeOf(v, sizeOptionName) ?? 'Default'
    // If availableSizes is set, only include those sizes; otherwise include all.
    if (allowed.size > 0 && !allowed.has(size.trim().toLowerCase())) continue
    out.push({
      size,
      variantGid: v.id,
      price: Number(v.price.amount),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice.amount) : undefined,
      availableForSale: v.availableForSale,
    })
  }
  // Preserve the editor's availableSizes order when present.
  if (allowed.size > 0 && comp.availableSizes) {
    const order = comp.availableSizes.map((s) => s.trim().toLowerCase())
    out.sort(
      (a, b) =>
        order.indexOf(a.size.trim().toLowerCase()) - order.indexOf(b.size.trim().toLowerCase()),
    )
  }
  return out
}

export function buildLookView(
  look: SanityLookDoc,
  details: Record<string, ShopifyProductDetail>, // keyed by productHandle
  relatedCards: RelatedShopifyCard[],
): LookView {
  const components: LookComponentView[] = (look.components ?? [])
    .map((comp) => {
      const detail = comp.productHandle ? details[comp.productHandle] ?? null : null
      const sizes = resolveComponentSizes(comp, detail)
      return {
        label: comp.label ?? comp.variantTitle ?? 'Pieza',
        imageUrl: comp.previewImageUrl ?? undefined,
        sizes,
      }
    })
    .filter((c) => c.sizes.length > 0)

  // Price range: sum of cheapest / most expensive size per component.
  let minTotal = 0
  let maxTotal = 0
  for (const c of components) {
    const prices = c.sizes.map((s) => s.price)
    minTotal += Math.min(...prices)
    maxTotal += Math.max(...prices)
  }

  const currency =
    Object.values(details).find((d) => d)?.priceRange.minVariantPrice.currencyCode ?? 'EUR'

  const images: LookGalleryImage[] = (look.editorialImages ?? [])
    .map((item): LookGalleryImage | null => {
      const url = item.image?.imageUrl
      if (!url) return null
      return {url, altText: item.image?.alt ?? look.title ?? undefined}
    })
    .filter((x): x is LookGalleryImage => x !== null)

  const related: LookRelatedCard[] = relatedCards.map((c) => ({
    handle: c.handle,
    title: c.title,
    imageUrl: c.featuredImage?.url,
    imageAlt: c.featuredImage?.altText ?? undefined,
    minPrice: Number(c.priceRange.minVariantPrice.amount),
    maxPrice: Number(c.priceRange.maxVariantPrice.amount),
  }))

  return {
    id: look._id,
    title: look.title,
    slug: look.slug,
    description: look.description,
    currency,
    images,
    components,
    discountStrategy: look.discountStrategy ?? 'none',
    discountValue: look.discountValue ?? 0,
    discountCode: look.discountCode ?? null,
    related,
    minTotal,
    maxTotal,
  }
}

// Display helper: apply the discount to a summed total.
export function applyLookDiscount(
  sum: number,
  strategy: LookView['discountStrategy'],
  value: number,
): number {
  if (strategy === 'sumMinusFixed') return Math.max(0, sum - value)
  if (strategy === 'sumMinusPercent') return Math.max(0, sum * (1 - value / 100))
  return sum
}
