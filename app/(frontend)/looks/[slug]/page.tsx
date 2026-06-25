import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getLook, getLookSlugs, getLookSEO} from '@/sanity/queries/queries/look'
import {getProductDetail, getProductCards} from '@/lib/shopify'
import {buildLookView} from '@/lib/look/buildLookView'
import {
  siteTitle,
  localeAlternates,
  buildUrl,
  BASE_IMAGE_URL,
  BASE_IMAGE_WIDTH,
  BASE_IMAGE_HEIGHT,
} from '@/utils/seoHelper'
import {getLocale} from '@/lib/i18n/getLocale'
import LookDetail from '@/components/Look/LookDetail'

export const revalidate = 300

export async function generateStaticParams() {
  const slugs = await getLookSlugs()
  return slugs.map((slug) => ({slug}))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{slug: string}>
}): Promise<Metadata> {
  const {slug} = await params
  const locale = await getLocale()
  const data = await getLookSEO(slug, locale)
  if (!data) return {title: `Look not found | ${siteTitle}`}
  const seo = (data.seo ?? {}) as {
    title?: string
    description?: string
    image?: {
      imageUrl?: string | null
      alt?: string | null
      metadata?: {dimensions?: {width?: number; height?: number} | null} | null
    } | null
  }
  const title = seo.title || data.title
  const lookPath = '/looks/' + slug

  const seoImageUrl = seo.image?.imageUrl
  const dims = seo.image?.metadata?.dimensions
  const ogImage = seoImageUrl
    ? {
        url: seoImageUrl,
        width: dims?.width ?? BASE_IMAGE_WIDTH,
        height: dims?.height ?? BASE_IMAGE_HEIGHT,
        alt: seo.image?.alt || title,
      }
    : {url: BASE_IMAGE_URL, width: BASE_IMAGE_WIDTH, height: BASE_IMAGE_HEIGHT, alt: title}

  return {
    title: `${title} | ${siteTitle}`,
    description: seo.description,
    alternates: localeAlternates(lookPath),
    openGraph: {
      title,
      description: seo.description,
      url: buildUrl(lookPath),
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description: seo.description,
      images: [ogImage.url],
    },
  }
}

export default async function LookPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params
  const locale = await getLocale()
  const look = await getLook(slug, locale)
  if (!look) notFound()

  // Unique product handles across components, fetched live from Shopify in parallel.
  const handles = Array.from(
    new Set((look.components ?? []).map((c) => c.productHandle).filter((h): h is string => !!h)),
  )
  const detailsList = await Promise.all(handles.map((h) => getProductDetail(h)))
  const details: Record<string, Awaited<ReturnType<typeof getProductDetail>>> = {}
  handles.forEach((h, i) => {
    details[h] = detailsList[i]
  })

  const relatedHandles = (look.relatedProducts ?? [])
    .map((r) => r.handle)
    .filter((h): h is string => !!h)
  const relatedCards = relatedHandles.length ? await getProductCards(relatedHandles) : []

  const view = buildLookView(look, details, relatedCards)

  if (view.components.length === 0) notFound()

  return <LookDetail view={view} entryId={`look:${slug}`} />
}
