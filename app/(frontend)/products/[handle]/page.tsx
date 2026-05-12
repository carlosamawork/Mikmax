import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getProductDetail, getProductCards} from '@/lib/shopify'
import {getSanityProduct} from '@/sanity/queries/queries/product'
import {buildProductView} from '@/lib/product/buildProductView'
import {resolveInitialState} from '@/lib/product/resolveInitialState'
import {BASE_URL, siteTitle} from '@/utils/seoHelper'
import ProductDetail from './ProductDetail'

export const revalidate = 300

function extractPlainText(blocks: unknown[] | null | undefined): string {
  if (!Array.isArray(blocks)) return ''
  const out: string[] = []
  for (const b of blocks) {
    if (b && typeof b === 'object' && 'children' in b) {
      const children = (b as {children: unknown[]}).children
      if (Array.isArray(children)) {
        for (const c of children) {
          if (c && typeof c === 'object' && 'text' in c) {
            out.push((c as {text: string}).text)
          }
        }
      }
    }
  }
  return out.join(' ').trim()
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
    extractPlainText(sanityDoc?.descripcion as unknown[] | null).slice(0, 160) ||
    shopifyProduct.seo?.description ||
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

  const relatedHandles = sanityDoc?.relatedProductHandles ?? []
  const relatedCards = relatedHandles.length ? await getProductCards(relatedHandles) : []

  const view = buildProductView(sanityDoc, shopifyProduct, relatedCards)
  const initial = resolveInitialState(view, search)

  return <ProductDetail view={view} initial={initial} />
}
