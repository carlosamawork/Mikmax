import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getProductDetail, getProductCards} from '@/lib/shopify'
import {getSanityProduct} from '@/sanity/queries/queries/product'
import {buildProductView} from '@/lib/product/buildProductView'
import {resolveInitialState} from '@/lib/product/resolveInitialState'
import {BASE_URL, siteTitle} from '@/utils/seoHelper'
import ProductDetail from '@/components/Product/ProductDetail'

export const revalidate = 300

function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
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

  const [sanityDoc, shopifyProduct] = await Promise.all([
    getSanityProduct(handle),
    getProductDetail(handle),
  ])
  if (!shopifyProduct) notFound()

  const relatedItems = (sanityDoc?.relatedItems ?? []).filter(
    (it): it is {handle: string; variantColor: string | null; variantImageUrl: string | null} =>
      typeof it.handle === 'string' && it.handle.length > 0,
  )
  const relatedHandles = relatedItems.map((it) => it.handle)
  const relatedCards = relatedHandles.length ? await getProductCards(relatedHandles) : []

  const view = buildProductView(sanityDoc, shopifyProduct, relatedCards, relatedItems)
  const initial = resolveInitialState(view, search)

  return <ProductDetail view={view} initial={initial} />
}
