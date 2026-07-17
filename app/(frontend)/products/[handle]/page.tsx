import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getProductDetail, getProductCards} from '@/lib/shopify'
import {getSanityProduct} from '@/sanity/queries/queries/product'
import {buildProductView} from '@/lib/product/buildProductView'
import {resolveInitialState} from '@/lib/product/resolveInitialState'
import {siteTitle, localeAlternates, buildUrl} from '@/utils/seoHelper'
import {getDisplayPercent, discountedPrice, applyDiscountToCard} from '@/lib/b2b/pricing'
import {getLocale} from '@/lib/i18n/getLocale'
import {getDictionary} from '@/lib/i18n/getDictionary'
import {shopifyLanguage, DEFAULT_COUNTRY} from '@/lib/i18n/shopifyLocale'
import {DEFAULT_LOCALE} from '@/lib/i18n/config'
import ProductDetail from '@/components/Product/ProductDetail'
import JsonLd from '@/components/Common/JsonLd/JsonLd'

export const revalidate = 300

function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{handle: string}>
}): Promise<Metadata> {
  const {handle} = await params
  const [sanityDoc, shopifyProduct] = await Promise.all([
    getSanityProduct(handle, DEFAULT_LOCALE),
    getProductDetail(handle, {language: 'EN', country: DEFAULT_COUNTRY}),
  ])
  if (!shopifyProduct) return {title: `Product not found | ${siteTitle}`}

  // Prefer the (localized) Sanity SEO values when present; fall back to Shopify.
  const sanitySeo = sanityDoc?.seo
  const title = sanitySeo?.title || shopifyProduct.title
  const desc =
    sanitySeo?.description ||
    shopifyProduct.seo?.description ||
    stripHtml(shopifyProduct.descriptionHtml).slice(0, 160) ||
    shopifyProduct.title

  const sanityImageUrl = sanitySeo?.image?.imageUrl
  const ogImageUrl = sanityImageUrl
    ? `${sanityImageUrl}?w=1200&fit=max&auto=format`
    : shopifyProduct.featuredImage?.url
  const ogImageAlt =
    sanitySeo?.image?.alt || shopifyProduct.featuredImage?.altText || shopifyProduct.title

  return {
    title: `${title} | ${siteTitle}`,
    description: desc,
    alternates: localeAlternates('/products/' + handle),
    openGraph: {
      title,
      description: desc,
      url: buildUrl('/products/' + handle),
      images: ogImageUrl ? [{url: ogImageUrl, alt: ogImageAlt}] : undefined,
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description: desc,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  }
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{handle: string}>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const {handle} = await params
  const search = await searchParams

  const locale = await getLocale()
  const [sanityDoc, shopifyProduct] = await Promise.all([
    getSanityProduct(handle, locale),
    getProductDetail(handle, {language: shopifyLanguage(locale), country: DEFAULT_COUNTRY}),
  ])
  if (!shopifyProduct) notFound()
  const dict = getDictionary(locale)

  const relatedItems = (sanityDoc?.relatedItems ?? []).filter(
    (
      it,
    ): it is {
      handle: string
      optionNames: (string | null)[] | null
      variantOptions: (string | null)[] | null
      variantImageUrl: string | null
    } => typeof it.handle === 'string' && it.handle.length > 0,
  )
  const relatedByColor = (sanityDoc?.relatedByColor ?? [])
    .map((g) => ({
      color: g.color,
      products: (g.products ?? []).filter(
        (
          it,
        ): it is {
          handle: string
          optionNames: (string | null)[] | null
          variantOptions: (string | null)[] | null
          variantImageUrl: string | null
        } => typeof it.handle === 'string' && it.handle.length > 0,
      ),
    }))
    .filter((g) => typeof g.color === 'string' && g.color.length > 0)

  const allHandles = Array.from(
    new Set<string>([
      ...relatedItems.map((it) => it.handle),
      ...relatedByColor.flatMap((g) => g.products.map((it) => it.handle)),
    ]),
  )
  const relatedCards = allHandles.length ? await getProductCards(allHandles) : []

  const view = buildProductView(
    sanityDoc,
    shopifyProduct,
    relatedCards,
    relatedItems,
    relatedByColor,
  )
  const initial = resolveInitialState(view, search)

  const displayPct = await getDisplayPercent()
  const viewForDisplay =
    displayPct && typeof view.minPrice === 'number'
      ? {
          ...view,
          compareMinPrice: view.minPrice,
          compareMaxPrice: view.maxPrice,
          minPrice: discountedPrice(view.minPrice, displayPct),
          maxPrice: discountedPrice(view.maxPrice, displayPct),
          related: view.related.map((card) => applyDiscountToCard(card, displayPct)),
          colors: view.colors.map((color) => ({
            ...color,
            related: color.related?.map((card) => applyDiscountToCard(card, displayPct)),
            sizes: color.sizes?.map((size) => ({
              ...size,
              displayPrice: discountedPrice(size.price, displayPct),
            })),
          })),
        }
      : view

  // --- Structured data (Product + BreadcrumbList) ---
  const productUrl = buildUrl('/products/' + handle)

  // Use the PUBLIC base price (view.minPrice/maxPrice are pre-discount).
  const minPrice = view.minPrice
  const maxPrice = view.maxPrice
  const priceCurrency = view.currency

  // Collect absolute image URLs: featured + per-variant + variant gallery.
  const variants = (shopifyProduct.variants?.nodes ?? []) as Array<{
    availableForSale?: boolean
    image?: {url?: string | null} | null
    price?: {amount?: string | null} | null
    selectedOptions?: {name: string; value: string}[]
    gallery?: {references?: {nodes?: Array<{image?: {url?: string | null} | null}>} | null} | null
  }>

  const imageSet = new Set<string>()
  if (shopifyProduct.featuredImage?.url) imageSet.add(shopifyProduct.featuredImage.url)
  for (const v of variants) {
    if (v.image?.url) imageSet.add(v.image.url)
    for (const node of v.gallery?.references?.nodes ?? []) {
      if (node.image?.url) imageSet.add(node.image.url)
    }
  }
  const images = Array.from(imageSet)

  // Description: prefer Sanity SEO description, else stripped Shopify HTML / SEO.
  const schemaDescription = (
    sanityDoc?.seo?.description ||
    stripHtml(shopifyProduct.descriptionHtml) ||
    shopifyProduct.seo?.description ||
    view.title
  ).slice(0, 300)

  // SKU only when there is exactly one variant with a non-empty sku.
  const skus = variants
    .map((v) => (v as {sku?: string | null}).sku)
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
  const sku = skus.length === 1 ? skus[0] : undefined

  const anyAvailable = variants.some((v) => v.availableForSale)
  const availability = anyAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'

  const offers =
    minPrice !== maxPrice
      ? {
          '@type': 'AggregateOffer',
          priceCurrency,
          lowPrice: minPrice,
          highPrice: maxPrice,
          availability,
          url: productUrl,
        }
      : {
          '@type': 'Offer',
          priceCurrency,
          price: minPrice,
          availability,
          url: productUrl,
        }

  const productSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: view.title,
    description: schemaDescription,
    brand: {'@type': 'Brand', name: siteTitle},
    offers,
  }
  if (images.length) productSchema.image = images
  if (sku) productSchema.sku = sku

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {'@type': 'ListItem', position: 1, name: 'Home', item: buildUrl('/')},
      {'@type': 'ListItem', position: 2, name: 'Shop', item: buildUrl('/shop')},
      {'@type': 'ListItem', position: 3, name: view.title, item: productUrl},
    ],
  }

  return (
    <>
      <h1 className="sr-only">{view.title}</h1>
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbSchema} />
      <ProductDetail view={viewForDisplay} initial={initial} pdpCopy={dict.pdp} />
    </>
  )
}
