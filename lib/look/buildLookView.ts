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
  image?: {url: string; altText?: string | null} | null
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

// Resolve one component's selectable sizes (and the color's thumbnail) from its
// Shopify product detail. The color is locked by the editor's `comp.color`; all
// sizes of that color are offered, taken live from Shopify.
function resolveComponentSizes(
  comp: SanityLookComponent,
  detail: ShopifyProductDetail,
): {sizes: LookSizeOption[]; imageUrl?: string} {
  if (!detail || !comp.color) return {sizes: []}
  const variants = detail.variants?.nodes ?? []
  const sizeOptionName = detail.options?.find((o) => o.name.toLowerCase() !== 'color')?.name
  const target = comp.color.trim().toLowerCase()

  let imageUrl: string | undefined
  const sizes: LookSizeOption[] = []
  for (const v of variants) {
    const c = colorOf(v)
    if (!c || c.trim().toLowerCase() !== target) continue
    if (!imageUrl && v.image?.url) imageUrl = v.image.url
    sizes.push({
      size: sizeOf(v, sizeOptionName) ?? 'Default',
      variantGid: v.id,
      price: Number(v.price.amount),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice.amount) : undefined,
      availableForSale: v.availableForSale,
    })
  }
  return {sizes, imageUrl}
}

export function buildLookView(
  look: SanityLookDoc,
  details: Record<string, ShopifyProductDetail>, // keyed by productHandle
  relatedCards: RelatedShopifyCard[],
): LookView {
  const components: LookComponentView[] = (look.components ?? [])
    .map((comp) => {
      const detail = comp.productHandle ? details[comp.productHandle] ?? null : null
      const {sizes, imageUrl} = resolveComponentSizes(comp, detail)
      return {
        label: comp.label ?? comp.productTitle ?? 'Pieza',
        imageUrl,
        sizes,
      }
    })
    .filter((c) => c.sizes.length > 0)

  // Price range: sum of cheapest / most expensive size per component.
  // `components` is pre-filtered to sizes.length > 0, so Math.min/max never see [].
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
