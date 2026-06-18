import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getProductDetail, getProductCards} from '@/lib/shopify'
import {getSanityProduct} from '@/sanity/queries/queries/product'
import {buildProductView} from '@/lib/product/buildProductView'
import {resolveInitialState} from '@/lib/product/resolveInitialState'
import {BASE_URL, siteTitle} from '@/utils/seoHelper'
import {getResellerPercent, resellerPrice, applyResellerToCard} from '@/lib/b2b/pricing'
import {getLocale} from '@/lib/i18n/getLocale'
import {getDictionary} from '@/lib/i18n/getDictionary'
import ProductDetail from '@/components/Product/ProductDetail'

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
    getSanityProduct(handle),
    getProductDetail(handle),
  ])
  if (!shopifyProduct) return {title: `Product not found | ${siteTitle}`}

  const desc =
    shopifyProduct.seo?.description ||
    stripHtml(shopifyProduct.descriptionHtml).slice(0, 160) ||
    shopifyProduct.title

  const canonical = `${BASE_URL.origin}/products/${handle}`

  return {
    title: `${shopifyProduct.title} | ${siteTitle}`,
    description: desc,
    alternates: {canonical},
    openGraph: {
      title: shopifyProduct.title,
      description: desc,
      url: canonical,
      images: shopifyProduct.featuredImage?.url
        ? [
            {
              url: shopifyProduct.featuredImage.url,
              alt: shopifyProduct.featuredImage.altText ?? shopifyProduct.title,
            },
          ]
        : undefined,
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

  const [sanityDoc, shopifyProduct, locale] = await Promise.all([
    getSanityProduct(handle),
    getProductDetail(handle),
    getLocale(),
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

  const resellerPercent = await getResellerPercent()
  const viewForDisplay =
    resellerPercent && typeof view.minPrice === 'number'
      ? {
          ...view,
          compareMinPrice: view.minPrice,
          compareMaxPrice: view.maxPrice,
          minPrice: resellerPrice(view.minPrice, resellerPercent),
          maxPrice: resellerPrice(view.maxPrice, resellerPercent),
          related: view.related.map((card) => applyResellerToCard(card, resellerPercent)),
          colors: view.colors.map((color) => ({
            ...color,
            related: color.related?.map((card) => applyResellerToCard(card, resellerPercent)),
            sizes: color.sizes?.map((size) => ({
              ...size,
              displayPrice: resellerPrice(size.price, resellerPercent),
            })),
          })),
        }
      : view

  return <ProductDetail view={viewForDisplay} initial={initial} pdpCopy={dict.pdp} />
}
