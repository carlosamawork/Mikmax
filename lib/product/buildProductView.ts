// lib/product/buildProductView.ts
import type {
  ProductView,
  ProductColor,
  ColorSize,
  GalleryImage,
  ProductMiniCard,
} from '@/types/product'
import type {SanityProductDoc} from '@/sanity/queries/queries/product'

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseGidArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string')
    if (typeof parsed === 'string') return [parsed]
  } catch {
    if (typeof raw === 'string' && raw.startsWith('gid://')) return [raw]
  }
  return []
}

type MetaobjectField = {key: string; value: string | null}
type MetaobjectNode = {
  id: string
  handle?: string | null
  fields: MetaobjectField[]
}

function metaobjectField(m: MetaobjectNode, key: string): string | null {
  return m.fields.find((f) => f.key === key)?.value ?? null
}

function readBaseGids(m: MetaobjectNode): string[] {
  return parseGidArray(metaobjectField(m, 'color_taxonomy_reference'))
}

function findColorMetaobject(
  metaobjects: MetaobjectNode[],
  colorValue: string,
): MetaobjectNode | undefined {
  const target = colorValue.trim().toLowerCase()
  return metaobjects.find((m) => metaobjectField(m, 'label')?.trim().toLowerCase() === target)
}

type ShopifyVariant = {
  id: string
  availableForSale: boolean
  image?: {url: string; altText?: string | null; width?: number; height?: number} | null
  price: {amount: string; currencyCode: string}
  compareAtPrice?: {amount: string} | null
  selectedOptions: {name: string; value: string}[]
  gallery?: {
    type: string
    value: string | null
    references?: {
      nodes: Array<{
        image?: {url: string; altText?: string | null; width?: number; height?: number}
      }>
    } | null
  } | null
}

function readVariantGallery(v: ShopifyVariant): GalleryImage[] {
  const out: GalleryImage[] = []
  if (v.image?.url) {
    out.push({
      url: v.image.url,
      altText: v.image.altText ?? undefined,
      width: v.image.width,
      height: v.image.height,
    })
  }
  for (const node of v.gallery?.references?.nodes ?? []) {
    const img = node.image
    if (img?.url) {
      out.push({
        url: img.url,
        altText: img.altText ?? undefined,
        width: img.width,
        height: img.height,
      })
    }
  }
  return out
}

type ShopifyProductDetail = {
  id: string
  handle: string
  title: string
  descriptionHtml?: string | null
  productType?: string
  vendor?: string
  tags?: string[]
  featuredImage?: {url: string; altText?: string | null} | null
  priceRange: {
    minVariantPrice: {amount: string; currencyCode: string}
    maxVariantPrice: {amount: string; currencyCode: string}
  }
  compareAtPriceRange?: {maxVariantPrice: {amount: string}}
  options?: {name: string; values: string[]}[]
  colorPattern?: {
    references?: {nodes: MetaobjectNode[]} | null
  } | null
  variants: {nodes: ShopifyVariant[]}
}

type RelatedShopifyCard = {
  id: string
  handle: string
  title: string
  featuredImage?: {url: string; altText?: string | null} | null
  priceRange: {
    minVariantPrice: {amount: string}
    maxVariantPrice: {amount: string}
  }
}

type SanityRelatedItem = {
  handle: string
  variantColor: string | null
  variantImageUrl: string | null
}

type SanityRelatedByColorGroup = {
  color: string | null
  products: SanityRelatedItem[]
}

export function buildProductView(
  sanity: SanityProductDoc | null,
  shopify: ShopifyProductDetail,
  related: RelatedShopifyCard[],
  relatedItems: SanityRelatedItem[] = [],
  relatedByColor: SanityRelatedByColorGroup[] = [],
): ProductView {
  const metaobjects = shopify.colorPattern?.references?.nodes ?? []
  const variants = shopify.variants?.nodes ?? []
  const colorOption = shopify.options?.find((o) => o.name.toLowerCase() === 'color')
  // The "size" option may be named differently per locale (Size / Talla / Medida …).
  // Pick the first option whose name is not "Color".
  const sizeOption = shopify.options?.find((o) => o.name.toLowerCase() !== 'color')
  const sizeOptionName = sizeOption?.name

  const colorsMap = new Map<string, ProductColor>()

  if (!colorOption) {
    const fallbackImages: GalleryImage[] = variants.length
      ? readVariantGallery(variants[0])
      : []
    if (fallbackImages.length === 0 && shopify.featuredImage?.url) {
      fallbackImages.push({
        url: shopify.featuredImage.url,
        altText: shopify.featuredImage.altText ?? undefined,
      })
    }
    const sizes: ColorSize[] = variants.map((v) => ({
      variantId: v.id,
      label:
        (sizeOptionName && v.selectedOptions.find((o) => o.name === sizeOptionName)?.value) ||
        'Default',
      price: Number(v.price.amount),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice.amount) : undefined,
      availableForSale: v.availableForSale,
    }))
    colorsMap.set('default', {
      slug: 'default',
      label: 'Default',
      hex: '#a4a4a4',
      taxonomyValueGids: [],
      images: fallbackImages,
      sizes,
    })
  } else {
    for (const v of variants) {
      const colorValue = v.selectedOptions.find((o) => o.name.toLowerCase() === 'color')?.value
      if (!colorValue) continue
      const slug = slugify(colorValue)
      if (!colorsMap.has(slug)) {
        const meta = findColorMetaobject(metaobjects, colorValue)
        colorsMap.set(slug, {
          slug,
          label: colorValue,
          hex: meta ? metaobjectField(meta, 'color') ?? '#a4a4a4' : '#a4a4a4',
          taxonomyValueGids: meta ? readBaseGids(meta) : [],
          images: [],
          sizes: [],
        })
      }
      const color = colorsMap.get(slug)!
      const sizeValue =
        (sizeOptionName && v.selectedOptions.find((o) => o.name === sizeOptionName)?.value) ||
        'Default'
      color.sizes.push({
        variantId: v.id,
        label: sizeValue,
        price: Number(v.price.amount),
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice.amount) : undefined,
        availableForSale: v.availableForSale,
      })
      // Use the first available variant of this color for the gallery
      if (color.images.length === 0) {
        const imgs = readVariantGallery(v)
        if (imgs.length > 0) color.images = imgs
      }
    }
    // Fallback: any color with no images uses the product featured image
    Array.from(colorsMap.values()).forEach((c) => {
      if (c.images.length === 0 && shopify.featuredImage?.url) {
        c.images.push({
          url: shopify.featuredImage.url,
          altText: shopify.featuredImage.altText ?? undefined,
        })
      }
    })
  }

  const colors = Array.from(colorsMap.values())
  const defaultColor =
    colors.find((c) => c.sizes.some((s) => s.availableForSale))?.slug ?? colors[0]?.slug ?? ''

  const editorial: ProductView['editorial'] = {
    descripcion: shopify.descriptionHtml?.trim() ? shopify.descriptionHtml : null,
    propiedadesMaterial: (sanity?.propiedadesMaterial ?? null) as ProductView['editorial']['propiedadesMaterial'],
    recomendacionesLavado: (sanity?.recomendacionesLavado ?? null) as ProductView['editorial']['recomendacionesLavado'],
    usoRecomendado: (sanity?.usoRecomendado ?? null) as ProductView['editorial']['usoRecomendado'],
  }
  const hasEditorial = !!(
    editorial.descripcion ||
    editorial.propiedadesMaterial?.length ||
    editorial.recomendacionesLavado?.length ||
    editorial.usoRecomendado?.length
  )

  // Index the Shopify cards by handle so per-color groups can quickly turn
  // editor picks (handle + variantColor) into rendered mini-cards.
  const shopifyByHandle = new Map<string, RelatedShopifyCard>()
  for (const p of related) {
    if (p.handle !== shopify.handle) shopifyByHandle.set(p.handle, p)
  }

  function toMiniCards(items: SanityRelatedItem[]): ProductMiniCard[] {
    const out: ProductMiniCard[] = []
    for (const it of items) {
      const card = shopifyByHandle.get(it.handle)
      if (!card) continue
      out.push({
        handle: card.handle,
        title: card.title,
        imageUrl: it.variantImageUrl ?? card.featuredImage?.url,
        imageAlt: card.featuredImage?.altText ?? undefined,
        minPrice: Number(card.priceRange.minVariantPrice.amount),
        maxPrice: Number(card.priceRange.maxVariantPrice.amount),
        colorSlug: it.variantColor ? slugify(it.variantColor) : undefined,
      })
    }
    return out
  }

  const relatedCards: ProductMiniCard[] = toMiniCards(relatedItems)

  // Build per-color override map keyed by color slug, matching the keys used
  // in `colorsMap` so the per-color list can be attached below.
  const relatedByColorSlug = new Map<string, ProductMiniCard[]>()
  for (const group of relatedByColor) {
    if (!group.color) continue
    const slug = slugify(group.color)
    if (!slug) continue
    const cards = toMiniCards(group.products)
    if (cards.length > 0) relatedByColorSlug.set(slug, cards)
  }

  const colorsWithRelated = colors.map((c) => {
    const override = relatedByColorSlug.get(c.slug)
    return override ? {...c, related: override} : c
  })

  return {
    id: shopify.id,
    handle: shopify.handle,
    title: shopify.title,
    currency: shopify.priceRange.minVariantPrice.currencyCode,
    minPrice: Number(shopify.priceRange.minVariantPrice.amount),
    maxPrice: Number(shopify.priceRange.maxVariantPrice.amount),
    featuredImageUrl: shopify.featuredImage?.url,
    editorial,
    hasEditorial,
    colors: colorsWithRelated,
    defaultColorSlug: defaultColor,
    related: relatedCards,
  }
}
